import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { startDevServer, stopDevServer } from '@/lib/dev-server-manager';

const REPOS_DIR = path.join(process.cwd(), '.repos');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId, envVars } = body;

    if (!repoId) {
      return NextResponse.json(
        { error: 'repoId is required' },
        { status: 400 }
      );
    }

    const repoDir = path.join(REPOS_DIR, repoId);

    try {
      // Check if repo directory exists
      const { promises: fs } = await import('fs');
      await fs.access(repoDir);
    } catch {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    try {
      // Install dependencies first - need to wait for native modules
      const { spawn } = await import('child_process');
      
      console.log(`[Dev Server] Installing dependencies for ${repoId}...`);
      const installProcess = spawn('npm', ['install', '--force'], {
        cwd: repoDir,
        stdio: 'pipe',
        shell: true,
        env: {
          ...process.env,
          // Ensure native modules are built
          npm_config_build_from_source: 'true',
        },
      });

      // Wait for install to complete - native modules need to be built
      await new Promise<void>((resolve, reject) => {
        let hasResolved = false;
        
        installProcess.on('close', (code) => {
          if (hasResolved) return;
          hasResolved = true;
          if (code === 0) {
            console.log(`[Dev Server] Dependencies installed successfully for ${repoId}`);
            resolve();
          } else {
            console.warn(`[Dev Server] npm install exited with code ${code} for ${repoId}, continuing anyway...`);
            // Continue anyway - might already be installed
            resolve();
          }
        });
        
        installProcess.on('error', (error) => {
          if (hasResolved) return;
          hasResolved = true;
          console.warn(`[Dev Server] npm install error for ${repoId}:`, error.message);
          // Continue anyway
          resolve();
        });
        
        // Timeout after 60 seconds
        setTimeout(() => {
          if (hasResolved) return;
          hasResolved = true;
          console.warn(`[Dev Server] npm install timeout for ${repoId}, continuing...`);
          installProcess.kill();
          resolve();
        }, 60000);
      });

      // Rebuild native modules if needed (for lightningcss, etc.)
      console.log(`[Dev Server] Rebuilding native modules for ${repoId}...`);
      try {
        const rebuildProcess = spawn('npm', ['rebuild'], {
          cwd: repoDir,
          stdio: 'pipe',
          shell: true,
        });

        let rebuildOutput = '';
        if (rebuildProcess.stdout) {
          rebuildProcess.stdout.on('data', (data: Buffer) => {
            rebuildOutput += data.toString();
          });
        }
        if (rebuildProcess.stderr) {
          rebuildProcess.stderr.on('data', (data: Buffer) => {
            rebuildOutput += data.toString();
          });
        }

        await new Promise<void>((resolve) => {
          rebuildProcess.on('close', (code) => {
            if (code === 0) {
              console.log(`[Dev Server] Native modules rebuild completed for ${repoId}`);
            } else {
              console.warn(`[Dev Server] Rebuild exited with code ${code} for ${repoId}`);
            }
            resolve();
          });
          rebuildProcess.on('error', (error) => {
            console.warn(`[Dev Server] Rebuild error for ${repoId}:`, error.message);
            resolve();
          });
          // Timeout after 60 seconds
          setTimeout(() => {
            console.warn(`[Dev Server] Rebuild timeout for ${repoId}`);
            rebuildProcess.kill();
            resolve();
          }, 60000);
        });
      } catch (rebuildError) {
        console.warn(`[Dev Server] Rebuild failed for ${repoId}, continuing...`, rebuildError);
      }
      
      // Verify critical dependencies are installed (like lightningcss)
      try {
        const { promises: fs } = await import('fs');
        const lightningcssPath = path.join(repoDir, 'node_modules', 'lightningcss');
        const lightningcssExists = await fs.access(lightningcssPath).then(() => true).catch(() => false);
        
        if (lightningcssExists) {
          // Check if native module exists
          const nativeModulePath = path.join(lightningcssPath, 'darwin-arm64.node');
          const nativeExists = await fs.access(nativeModulePath).then(() => true).catch(() => false);
          
          if (!nativeExists) {
            console.warn(`[Dev Server] Native module not found at ${nativeModulePath}, trying to rebuild lightningcss...`);
            // Try to rebuild just lightningcss
            const lightningcssRebuild = spawn('npm', ['rebuild', 'lightningcss'], {
              cwd: repoDir,
              stdio: 'pipe',
              shell: true,
            });
            
            await new Promise<void>((resolve) => {
              lightningcssRebuild.on('close', () => resolve());
              lightningcssRebuild.on('error', () => resolve());
              setTimeout(() => {
                lightningcssRebuild.kill();
                resolve();
              }, 30000);
            });
          }
        }
      } catch (checkError) {
        console.warn(`[Dev Server] Dependency check failed for ${repoId}:`, checkError);
        // Continue anyway
      }

      // Start the dev server
      console.log(`[Dev Server] Starting dev server for ${repoId}...`);
      const { port, appType } = await startDevServer(repoId, repoDir, envVars);

      return NextResponse.json({
        port,
        appType,
        url: `/api/dev-server/proxy/${repoId}`,
        directUrl: `http://localhost:${port}`, // Direct URL for reference
      });
    } catch (error: any) {
      console.error('Failed to start dev server:', error);
      return NextResponse.json(
        { 
          error: `Failed to start dev server: ${error.message}`,
          suggestion: 'Make sure the repository has a package.json with a dev or start script, and that dependencies can be installed.'
        },
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

    await stopDevServer(repoId);

    return NextResponse.json({ message: 'Dev server stopped' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

