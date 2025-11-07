import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

const REPOS_DIR = path.join(process.cwd(), '.repos');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId, status } = body; // status: 'good' | 'bad'

    if (!repoId || !status) {
      return NextResponse.json(
        { error: 'repoId and status (good/bad) are required' },
        { status: 400 }
      );
    }

    if (status !== 'good' && status !== 'bad') {
      return NextResponse.json(
        { error: 'status must be either "good" or "bad"' },
        { status: 400 }
      );
    }

    const repoDir = path.join(REPOS_DIR, repoId);
    const git: SimpleGit = simpleGit(repoDir);

    try {
      // Mark commit as good or bad and capture output
      // Git will output the first bad commit when bisect completes
      const markOutput = await git.raw(['bisect', status]);
      
      // Check if bisect is complete by looking for "first bad commit" in output
      const isComplete = markOutput.includes('first bad commit');
      let firstBadCommit = '';

      if (isComplete) {
        // Extract commit hash from the output
        // Format: "first bad commit: [hash]" or "first bad commit is [hash]"
        const match = markOutput.match(/first bad commit[:\s]+is[:\s]+([a-f0-9]{7,40})/i) ||
                     markOutput.match(/first bad commit[:\s]+([a-f0-9]{7,40})/i);
        
        if (match) {
          firstBadCommit = match[1];
        } else {
          // Fallback: check bisect log
          try {
            const bisectLog = await git.raw(['bisect', 'log']);
            const logMatch = bisectLog.match(/first bad commit[:\s]+is[:\s]+([a-f0-9]{7,40})/i) ||
                           bisectLog.match(/first bad commit[:\s]+([a-f0-9]{7,40})/i);
            if (logMatch) {
              firstBadCommit = logMatch[1];
            }
          } catch {
            // If all else fails, use current HEAD
            firstBadCommit = (await git.revparse(['HEAD'])).trim();
          }
        }

        // If we still don't have it, use current HEAD
        if (!firstBadCommit) {
          firstBadCommit = (await git.revparse(['HEAD'])).trim();
        }

        const commitInfo = firstBadCommit 
          ? await git.log(['-1', firstBadCommit]).catch(() => ({ latest: null }))
          : { latest: null };

        return NextResponse.json({
          complete: true,
          firstBadCommit: firstBadCommit,
          commitMessage: commitInfo.latest?.message || '',
          commitDate: commitInfo.latest?.date || '',
        });
      }

      // Get next commit to test
      const currentCommit = await git.revparse(['HEAD']);
      const commitInfo = await git.log(['-1', currentCommit]);

      return NextResponse.json({
        complete: false,
        currentCommit: currentCommit.trim(),
        commitMessage: commitInfo.latest?.message || '',
        commitDate: commitInfo.latest?.date || '',
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to mark commit: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

