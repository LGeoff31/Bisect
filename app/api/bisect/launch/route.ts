import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import * as net from 'net';

async function findFreePort(startPort: number, endPort: number): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    const isFree = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
    if (isFree) return port;
  }
  throw new Error('No free port found');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId, commitHash, envVars } = body;

    if (!repoId || !commitHash) {
      return NextResponse.json(
        { error: 'Must provide repoId and commitHash' },
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

    const git: SimpleGit = simpleGit(repoDir);

    try {
      await git.show([commitHash]);
    } catch {
      return NextResponse.json(
        { error: `Commit not found: ${commitHash}` },
        { status: 400 }
      );
    }

    await git.checkout([commitHash]);

    const packageJsonPath = path.join(repoDir, 'package.json');
    let packageJson;
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(packageJsonContent);
    } catch {
      return NextResponse.json(
        { error: 'No package.json found in repository root' },
        { status: 400 }
      );
    }

    const lockFiles = {
      'pnpm-lock.yaml': 'pnpm',
      'yarn.lock': 'yarn',
      'package-lock.json': 'npm',
    };

    let packageManager = 'npm';
    for (const [lockFile, pm] of Object.entries(lockFiles)) {
      try {
        await fs.access(path.join(repoDir, lockFile));
        packageManager = pm;
        break;
      } catch {
        continue;
      }
    }

    if (packageJson.packageManager) {
      const pmMatch = packageJson.packageManager.match(/^(npm|pnpm|yarn)@/);
      if (pmMatch) {
        packageManager = pmMatch[1];
      }
    }

    const installCommand = packageManager === 'pnpm' ? 'pnpm' : packageManager === 'yarn' ? 'yarn' : 'npm';
    const installArgs = packageManager === 'pnpm' ? ['install'] : packageManager === 'yarn' ? ['install'] : ['install'];

    const installProcess = spawn(installCommand, installArgs, {
      cwd: repoDir,
      stdio: 'pipe',
      shell: true,
    });

    installProcess.stdout?.on('data', (data) => {
      console.log(`[Install ${repoId}] ${data}`);
    });

    installProcess.stderr?.on('data', (data) => {
      console.error(`[Install ${repoId}] ${data}`);
    });

    await new Promise<void>((resolve, reject) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Installation failed with code ${code}`));
        }
      });
      installProcess.on('error', reject);
    });

    const port = await findFreePort(3001, 3100);
    
    const scripts = packageJson.scripts || {};
    let command: string;
    let args: string[];
    const env = { 
      ...process.env, 
      ...(envVars || {}),
      PORT: port.toString() 
    };

    if (packageJson.dependencies?.next) {
      command = 'npx';
      args = ['next', 'dev', '-p', port.toString()];
    } else if (packageJson.dependencies?.vite) {
      command = 'npx';
      args = ['vite', '--port', port.toString()];
    } else if (scripts.dev) {
      command = 'npm';
      args = ['run', 'dev'];
    } else if (scripts.start) {
      command = 'npm';
      args = ['start'];
    } else {
      return NextResponse.json(
        { error: 'Could not determine how to start the application' },
        { status: 400 }
      );
    }

    const child = spawn(command, args, {
      cwd: repoDir,
      env,
      stdio: 'pipe',
      shell: true,
    });

    child.stdout?.on('data', (data) => {
      console.log(`[Dev Server ${repoId}] ${data}`);
    });

    child.stderr?.on('data', (data) => {
      console.error(`[Dev Server ${repoId}] ${data}`);
    });

    child.on('error', (error) => {
      console.error(`[Dev Server ${repoId}] Failed to start:`, error);
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      port,
      url: `http://localhost:${port}`,
      proxyUrl: `/api/dev-server/proxy/${repoId}`,
      message: 'Dev server starting...',
    });
  } catch (error: any) {
    console.error('[Bisect Launch] Error:', error);
    return NextResponse.json(
      { error: `Failed to launch: ${error.message}` },
      { status: 500 }
    );
  }
}

