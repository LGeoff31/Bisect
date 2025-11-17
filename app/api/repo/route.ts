import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, repoPath } = body;

    if (!repoUrl && !repoPath) {
      return NextResponse.json(
        { error: 'Must provide either repoUrl or repoPath' },
        { status: 400 }
      );
    }

    const repoId = uuidv4();
    const reposDir = path.join(process.cwd(), '.repos');
    await fs.mkdir(reposDir, { recursive: true });
    const repoDir = path.join(reposDir, repoId);

    if (repoUrl) {
      console.log(`Cloning ${repoUrl} to ${repoDir}`);
      const git: SimpleGit = simpleGit();
      await git.clone(repoUrl, repoDir);
      
      console.log(`[Repo] Successfully cloned to ${repoDir}`);
    } else if (repoPath) {
      console.log(`[Repo] Copying ${repoPath} to ${repoDir}...`);
      try {
        await fs.access(repoPath);
      } catch {
        return NextResponse.json(
          { error: `Path does not exist: ${repoPath}` },
          { status: 400 }
        );
      }

      const gitDir = path.join(repoPath, '.git');
      try {
        await fs.access(gitDir);
      } catch {
        return NextResponse.json(
          { error: `Path is not a Git repository: ${repoPath}` },
          { status: 400 }
        );
      }

      await copyDirectory(repoPath, repoDir);
      console.log(`[Repo] Successfully copied to ${repoDir}`);
    }

    return NextResponse.json({
      repoId,
      repoDir: path.relative(process.cwd(), repoDir),
      message: 'Repository ready',
    });
  } catch (error: any) {
    console.error('[Repo] Error:', error);
    return NextResponse.json(
      { error: `Failed to setup repository: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId } = body;

    if (!repoId) {
      return NextResponse.json(
        { error: 'Must provide repoId' },
        { status: 400 }
      );
    }

    const repoDir = path.join(process.cwd(), '.repos', repoId);
    try {
      await fs.access(repoDir);
    } catch {
      return NextResponse.json(
        { error: `Repository not found: ${repoId}` },
        { status: 404 }
      );
    }

    await fs.rm(repoDir, { recursive: true, force: true });
    console.log(`[Repo] Deleted repository ${repoId}`);

    return NextResponse.json({
      message: 'Repository deleted',
      repoId,
    });
  } catch (error: any) {
    console.error('[Repo] Error deleting:', error);
    return NextResponse.json(
      { error: `Failed to delete repository: ${error.message}` },
      { status: 500 }
    );
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
