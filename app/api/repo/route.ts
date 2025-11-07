import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

const REPOS_DIR = path.join(process.cwd(), '.repos');

// Ensure repos directory exists
async function ensureReposDir() {
  try {
    await fs.access(REPOS_DIR);
  } catch {
    await fs.mkdir(REPOS_DIR, { recursive: true });
  }
}

// POST: Clone or initialize repository
export async function POST(request: NextRequest) {
  try {
    await ensureReposDir();
    const body = await request.json();
    const { repoUrl, repoPath } = body;

    if (!repoUrl && !repoPath) {
      return NextResponse.json(
        { error: 'Either repoUrl or repoPath is required' },
        { status: 400 }
      );
    }

    const repoId = uuidv4();
    const repoDir = path.join(REPOS_DIR, repoId);

    try {
      if (repoUrl) {
        // Clone repository
        const git: SimpleGit = simpleGit();
        await git.clone(repoUrl, repoDir);
      } else if (repoPath) {
        // Copy local repository
        await fs.cp(repoPath, repoDir, { recursive: true });
      }

      return NextResponse.json({ repoId, message: 'Repository ready' });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to setup repository: ${error.message}` },
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

// DELETE: Clean up repository
export async function DELETE(request: NextRequest) {
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
    try {
      await fs.rm(repoDir, { recursive: true, force: true });
      return NextResponse.json({ message: 'Repository deleted' });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to delete repository: ${error.message}` },
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

