import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

const REPOS_DIR = path.join(process.cwd(), '.repos');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId, goodCommit, badCommit } = body;

    if (!repoId || !goodCommit || !badCommit) {
      return NextResponse.json(
        { error: 'repoId, goodCommit, and badCommit are required' },
        { status: 400 }
      );
    }

    const repoDir = path.join(REPOS_DIR, repoId);
    const git: SimpleGit = simpleGit(repoDir);

    try {
      // Verify commits exist
      try {
        await git.revparse([goodCommit]);
      } catch {
        return NextResponse.json(
          { error: `Good commit "${goodCommit}" not found in repository` },
          { status: 400 }
        );
      }

      try {
        await git.revparse([badCommit]);
      } catch {
        return NextResponse.json(
          { error: `Bad commit "${badCommit}" not found in repository` },
          { status: 400 }
        );
      }

      // Check if good commit is an ancestor of bad commit
      try {
        const mergeBase = await git.raw(['merge-base', goodCommit, badCommit]);
        const goodIsAncestor = mergeBase.trim() === goodCommit.trim();
        
        if (!goodIsAncestor) {
          // Check if they're swapped (bad is ancestor of good)
          const badIsAncestor = mergeBase.trim() === badCommit.trim();
          if (badIsAncestor) {
            return NextResponse.json(
              { 
                error: 'The commits appear to be swapped. The "good" commit is newer than the "bad" commit. Please swap them and try again.',
                suggestion: 'Try swapping the good and bad commits'
              },
              { status: 400 }
            );
          }
          
          // Commits are on different branches
          return NextResponse.json(
            { 
              error: 'The good and bad commits are not on the same branch. The good commit must be an ancestor of the bad commit for bisect to work.',
              suggestion: 'Make sure both commits are on the same branch'
            },
            { status: 400 }
          );
        }
      } catch (mergeBaseError) {
        // If merge-base fails, commits might be unrelated
        return NextResponse.json(
          { 
            error: 'The good and bad commits are not related in the git history. The good commit must be an ancestor of the bad commit.',
            suggestion: 'Make sure the good commit comes before the bad commit in history'
          },
          { status: 400 }
        );
      }

      // Reset any existing bisect
      await git.raw(['bisect', 'reset']).catch(() => {
        // Ignore if bisect wasn't started
      });

      // Start bisect
      await git.raw(['bisect', 'start']);
      await git.raw(['bisect', 'bad', badCommit]);
      await git.raw(['bisect', 'good', goodCommit]);

      // Get current commit
      const currentCommit = await git.revparse(['HEAD']);
      const commitInfo = await git.log(['-1', currentCommit]);

      return NextResponse.json({
        currentCommit: currentCommit.trim(),
        commitMessage: commitInfo.latest?.message || '',
        commitDate: commitInfo.latest?.date || '',
      });
    } catch (error: any) {
      // Check for specific git bisect error messages
      const errorMessage = error.message || '';
      if (errorMessage.includes('not ancestors of the bad rev')) {
        return NextResponse.json(
          { 
            error: 'The good commit is not an ancestor of the bad commit. The good commit must come before the bad commit in history.',
            suggestion: 'You may have swapped the commits, or they are on different branches. Try swapping them or ensure they are on the same branch.'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to start bisect: ${error.message}` },
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

