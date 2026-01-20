import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

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

// Helper to generate a stable identifier for a repo
function getRepoIdentifier(repoUrl?: string, repoPath?: string): string {
  if (repoUrl) {
    // Normalize URL (remove .git, trailing slashes, etc.)
    const normalized = repoUrl.replace(/\.git$/, '').replace(/\/$/, '').toLowerCase();
    return createHash('sha256').update(normalized).digest('hex');
  } else if (repoPath) {
    // Use absolute normalized path
    const absolutePath = path.resolve(repoPath);
    return createHash('sha256').update(absolutePath).digest('hex');
  }
  throw new Error('Must provide repoUrl or repoPath');
}

// Get or create repo mapping
async function getOrCreateRepoId(repoIdentifier: string, reposDir: string): Promise<string> {
  const mappingFile = path.join(reposDir, '.repo-mapping.json');
  
  let mapping: Record<string, string> = {};
  try {
    const content = await fs.readFile(mappingFile, 'utf-8');
    mapping = JSON.parse(content);
  } catch {
    // File doesn't exist, start with empty mapping
  }

  // Check if repo already exists
  if (mapping[repoIdentifier]) {
    const existingRepoId = mapping[repoIdentifier];
    const existingRepoDir = path.join(reposDir, existingRepoId);
    
    // Verify the repo directory still exists
    try {
      await fs.access(existingRepoDir);
      console.log(`[Repo] Reusing existing repository: ${existingRepoId}`);
      return existingRepoId;
    } catch {
      // Repo directory doesn't exist, remove from mapping and create new
      delete mapping[repoIdentifier];
    }
  }

  // Create new repo
  const newRepoId = uuidv4();
  mapping[repoIdentifier] = newRepoId;
  
  // Save mapping
  await fs.writeFile(mappingFile, JSON.stringify(mapping, null, 2));
  
  return newRepoId;
}

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

    // Use a configurable base directory for repositories.
    // In production (e.g. Vercel), /var/task is read-only, so we default to /tmp.
    // Locally you can set REPOS_BASE_DIR="." to keep repos under the project root.
    const baseDir = process.env.REPOS_BASE_DIR || '/tmp';
    const reposDir = path.join(baseDir, '.repos');
    await fs.mkdir(reposDir, { recursive: true });

    // Get stable identifier for this repo
    const repoIdentifier = getRepoIdentifier(repoUrl, repoPath);
    
    // Check if repo already exists
    const repoId = await getOrCreateRepoId(repoIdentifier, reposDir);
    const repoDir = path.join(reposDir, repoId);

    // Only clone/copy if directory doesn't exist
    try {
      await fs.access(repoDir);
      console.log(`[Repo] Repository already exists: ${repoDir}`);
    } catch {
      // Repo doesn't exist, create it
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
