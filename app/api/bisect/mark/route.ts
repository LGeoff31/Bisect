import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId, status } = body;

    if (!repoId || !status) {
      return NextResponse.json(
        { error: 'Must provide repoId and status (good or bad)' },
        { status: 400 }
      );
    }

    if (status !== 'good' && status !== 'bad') {
      return NextResponse.json(
        { error: 'Status must be "good" or "bad"' },
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
    try {
      const bisectLog = await git.raw(['bisect', 'log']);
      if (!bisectLog || bisectLog.trim() === '') {
        return NextResponse.json(
          { error: 'No active bisect session' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'No active bisect session' },
        { status: 400 }
      );
    }

    // Mark commit
    await git.raw(['bisect', status]);

    // Check if bisect is complete
    const bisectLog = await git.raw(['bisect', 'log']);
    const isComplete = bisectLog.includes('first bad commit');

    let firstBadCommit: string | null = null;
    if (isComplete) {
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

    // Get current commit (or first bad commit if complete)
    const currentCommitHash = (await git.revparse(['HEAD'])).trim();
    const log = await git.log({ maxCount: 1 });
    const currentCommit = log.latest;

    if (!currentCommit) {
      return NextResponse.json(
        { error: 'Failed to get current commit' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      complete: isComplete,
      currentCommit: currentCommitHash,
      commitMessage: currentCommit.message,
      commitDate: currentCommit.date,
      firstBadCommit: firstBadCommit || null,
    });
  } catch (error: any) {
    console.error('[Bisect Mark] Error:', error);
    return NextResponse.json(
      { error: `Failed to mark commit: ${error.message}` },
      { status: 500 }
    );
  }
}

