import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

const REPOS_DIR = path.join(process.cwd(), '.repos');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get('repoId');

    if (!repoId) {
      return NextResponse.json(
        { error: 'repoId is required' },
        { status: 400 }
      );
    }

    const repoDir = path.join(REPOS_DIR, repoId);
    const git: SimpleGit = simpleGit(repoDir);

    try {
      // Check if bisect is in progress
      const bisectLog = await git.raw(['bisect', 'log']).catch(() => '');
      const isActive = bisectLog.length > 0;
      const isComplete = bisectLog.includes('first bad commit');

      if (!isActive) {
        return NextResponse.json({
          active: false,
          complete: false,
        });
      }

      const currentCommit = await git.revparse(['HEAD']);
      const commitInfo = await git.log(['-1', currentCommit]);

      return NextResponse.json({
        active: true,
        complete: isComplete,
        currentCommit: currentCommit.trim(),
        commitMessage: commitInfo.latest?.message || '',
        commitDate: commitInfo.latest?.date || '',
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to get bisect status: ${error.message}` },
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

