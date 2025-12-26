import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get('repoId');

    if (!repoId) {
      return NextResponse.json(
        { error: 'Must provide repoId query parameter' },
        { status: 400 }
      );
    }

    const repoDir = path.join(process.cwd(), '.repos', repoId);
    
    // Check if repo exists
    try {
      await fs.access(repoDir);
    } catch {
      return NextResponse.json(
        { error: `Repository not found: ${repoId}` },
        { status: 404 }
      );
    }

    const git: SimpleGit = simpleGit(repoDir);

    // Check if bisect is active
    let active = false;
    let complete = false;
    let firstBadCommit: string | null = null;

    try {
      const bisectLog = await git.raw(['bisect', 'log']);
      if (bisectLog && bisectLog.trim() !== '') {
        active = true;
        complete = bisectLog.includes('first bad commit');
        
        if (complete) {
          // Extract first bad commit from bisect log
          const lines = bisectLog.split('\n');
          const firstBadLine = lines.find(line => line.includes('first bad commit'));
          if (firstBadLine) {
            const match = firstBadLine.match(/\[([a-f0-9]+)\]/);
            if (match) {
              firstBadCommit = match[1];
            }
          }
        }
      }
    } catch {
      // No bisect session
      active = false;
    }

    let currentCommit: string | null = null;
    let commitMessage: string | null = null;
    let commitDate: string | null = null;

    if (active) {
      try {
        const currentCommitHash = (await git.revparse(['HEAD'])).trim();
        const log = await git.log({ maxCount: 1 });
        const latest = log.latest;

        if (latest) {
          currentCommit = currentCommitHash;
          commitMessage = latest.message;
          commitDate = latest.date;
        }
      } catch (error) {
        console.error('[Bisect Status] Error getting commit:', error);
      }
    }

    return NextResponse.json({
      active,
      complete,
      currentCommit,
      commitMessage,
      commitDate,
      firstBadCommit,
    });
  } catch (error: any) {
    console.error('[Bisect Status] Error:', error);
    return NextResponse.json(
      { error: `Failed to get bisect status: ${error.message}` },
      { status: 500 }
    );
  }
}

