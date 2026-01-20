import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId, goodCommit, badCommit } = body;

    if (!repoId || !goodCommit || !badCommit) {
      return NextResponse.json(
        { error: 'Must provide repoId, goodCommit, and badCommit' },
        { status: 400 }
      );
    }

    const baseDir = process.env.REPOS_BASE_DIR || '/tmp';
    const repoDir = path.join(baseDir, '.repos', repoId);
    
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

    // Verify commits exist
    try {
      await git.show([goodCommit]);
    } catch {
      return NextResponse.json(
        { error: `Good commit not found: ${goodCommit}` },
        { status: 400 }
      );
    }

    try {
      await git.show([badCommit]);
    } catch {
      return NextResponse.json(
        { error: `Bad commit not found: ${badCommit}` },
        { status: 400 }
      );
    }

    // Reset any existing bisect session
    try {
      await git.raw(['bisect', 'reset']);
    } catch {
      // Ignore if no bisect session exists
    }

    // Start bisect
    await git.raw(['bisect', 'start']);
    await git.raw(['bisect', 'good', goodCommit]);
    await git.raw(['bisect', 'bad', badCommit]);

    // Get current commit
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
      currentCommit: currentCommitHash,
      commitMessage: currentCommit.message,
      commitDate: currentCommit.date,
    });
  } catch (error: any) {
    console.error('[Bisect Start] Error:', error);
    return NextResponse.json(
      { error: `Failed to start bisect: ${error.message}` },
      { status: 500 }
    );
  }
}

