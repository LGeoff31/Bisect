import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
// @ts-ignore - no types available
import findFreePort from 'find-free-port';

/**
 * Load environment variables from .env files in the repository directory
 * Supports .env, .env.local, .env.development, .env.development.local
 */
async function loadEnvFiles(repoDir: string): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  
  // Order matters: later files override earlier ones
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local',
  ];
  
  for (const envFile of envFiles) {
    const envPath = path.join(repoDir, envFile);
    try {
      const content = await fs.readFile(envPath, 'utf-8');
      // Parse .env file format: KEY=value or KEY="value" or KEY='value'
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Match KEY=value (with optional quotes)
        const match = trimmed.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          env[key] = value;
        }
      }
    } catch (error: any) {
      // File doesn't exist or can't be read - that's okay, just skip it
      if (error.code !== 'ENOENT') {
        console.warn(`[Dev Server] Could not read ${envFile}:`, error.message);
      }
    }
  }
  
  return env;
}

interface DevServerInfo {
  process: ChildProcess;
  port: number;
  repoId: string;
  repoDir: string;
  appType: 'nextjs' | 'react' | 'vite' | 'unknown';
}

interface DevServerInfoFile {
  port: number;
  repoId: string;
  repoDir: string;
  appType: 'nextjs' | 'react' | 'vite' | 'unknown';
  pid: number;
}

const runningServers = new Map<string, DevServerInfo>();
const SERVER_INFO_DIR = path.join(process.cwd(), '.server-info');

async function ensureServerInfoDir() {
  try {
    await fs.access(SERVER_INFO_DIR);
  } catch {
    await fs.mkdir(SERVER_INFO_DIR, { recursive: true });
  }
}

async function saveServerInfo(repoId: string, info: DevServerInfoFile) {
  await ensureServerInfoDir();
  const infoPath = path.join(SERVER_INFO_DIR, `${repoId}.json`);
  await fs.writeFile(infoPath, JSON.stringify(info, null, 2));
}

async function loadServerInfo(repoId: string): Promise<DevServerInfoFile | null> {
  try {
    await ensureServerInfoDir();
    const infoPath = path.join(SERVER_INFO_DIR, `${repoId}.json`);
    const data = await fs.readFile(infoPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function deleteServerInfo(repoId: string) {
  try {
    await ensureServerInfoDir();
    const infoPath = path.join(SERVER_INFO_DIR, `${repoId}.json`);
    await fs.unlink(infoPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

export async function detectAppType(repoDir: string): Promise<'nextjs' | 'react' | 'vite' | 'unknown'> {
  try {
    const packageJsonPath = path.join(repoDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies.next) {
      return 'nextjs';
    }
    if (dependencies.vite) {
      return 'vite';
    }
    if (dependencies.react || dependencies['react-dom']) {
      return 'react';
    }
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function getDevCommand(
  repoDir: string,
  appType: 'nextjs' | 'react' | 'vite' | 'unknown'
): Promise<{ command: string; args: string[]; env?: NodeJS.ProcessEnv } | null> {
  try {
    const packageJsonPath = path.join(repoDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    const scripts = packageJson.scripts || {};
    
    if (appType === 'nextjs') {
      // Try to find dev script, default to 'next dev'
      if (scripts.dev) {
        const parts = scripts.dev.split(' ');
      return {
        command: 'npm',
        args: ['run', 'dev'],
        env: { ...process.env } // Let Next.js choose port
      };
      }
      return {
        command: 'npx',
        args: ['next', 'dev'],
        env: { ...process.env }
      };
    }
    
    if (appType === 'vite') {
      if (scripts.dev) {
        return {
          command: 'npm',
          args: ['run', 'dev'],
          env: { ...process.env }
        };
      }
      return {
        command: 'npx',
        args: ['vite'],
        env: { ...process.env }
      };
    }
    
    if (appType === 'react') {
      if (scripts.start) {
        return {
          command: 'npm',
          args: ['start'],
          env: { ...process.env }
        };
      }
      if (scripts.dev) {
        return {
          command: 'npm',
          args: ['run', 'dev'],
          env: { ...process.env }
        };
      }
    }
    
    // Fallback: try npm run dev
    if (scripts.dev) {
      return {
        command: 'npm',
        args: ['run', 'dev'],
        env: { ...process.env }
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function startDevServer(
  repoId: string,
  repoDir: string,
  additionalEnvVars?: Record<string, string>
): Promise<{ port: number; appType: string }> {
  // Stop existing server if running
  await stopDevServer(repoId);
  
  const appType = await detectAppType(repoDir);
  
  if (appType === 'unknown') {
    throw new Error('Could not detect app type. Make sure the repository has a package.json with dependencies.');
  }
  
  const devCommand = await getDevCommand(repoDir, appType);
  
  if (!devCommand) {
    throw new Error('Could not determine dev command. Make sure package.json has a dev or start script.');
  }
  
  // Find a free port
  const [port] = await findFreePort(3001, 3100);
  
  // Load environment variables from .env files in the repository
  const repoEnv = await loadEnvFiles(repoDir);
  
  // Set port in environment
  // Order: process.env < repo .env files < additionalEnvVars (from UI) < devCommand.env < PORT override
  const env = {
    ...process.env,
    ...repoEnv,
    ...(additionalEnvVars || {}),
    ...devCommand.env,
    PORT: port.toString(),
  } as NodeJS.ProcessEnv;
  
  // For Next.js, we need to set the port differently
  if (appType === 'nextjs') {
    // Next.js uses -p flag or PORT env var
    if (devCommand.command === 'npx' && devCommand.args[0] === 'next') {
      devCommand.args.push('-p', port.toString());
    } else {
      env.PORT = port.toString();
    }
  }
  
  // For Vite, set port
  if (appType === 'vite') {
    env.PORT = port.toString();
  }
  
  // Start the dev server
  const childProcess = spawn(devCommand.command, devCommand.args, {
    cwd: repoDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  }) as ChildProcess;
  
  // Store server info
  const serverInfo: DevServerInfo = {
    process: childProcess,
    port,
    repoId,
    repoDir,
    appType,
  };
  
  runningServers.set(repoId, serverInfo);
  
  // Save server info to file for cross-process access
  await saveServerInfo(repoId, {
    port,
    repoId,
    repoDir,
    appType,
    pid: childProcess.pid || 0,
  });
  
  // Clean up on process exit
  childProcess.on('exit', async () => {
    runningServers.delete(repoId);
    await deleteServerInfo(repoId);
  });
  
  // Wait for server to be ready - check if it's listening on the port
  let serverReady = false;
  const maxWait = 30000; // 30 seconds max
  const checkInterval = 1000; // Check every 1 second
  let waited = 0;
  
  // Listen to stdout/stderr for ready signals
  if (childProcess.stdout) {
    childProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`[Dev Server ${repoId}] stdout:`, output.substring(0, 200));
      if (output.includes('ready') || 
          output.includes('Local:') || 
          output.includes('compiled') ||
          output.includes('started server') ||
          output.includes(`localhost:${port}`)) {
        serverReady = true;
      }
    });
  }
  
  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`[Dev Server ${repoId}] stderr:`, output.substring(0, 200));
      if (output.includes('ready') || 
          output.includes('Local:') || 
          output.includes('compiled')) {
        serverReady = true;
      }
    });
  }
  
  // Wait for server to be ready by checking if port is listening
  while (!serverReady && waited < maxWait) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waited += checkInterval;
    
    // Check if process is still running
    if (childProcess.killed || childProcess.exitCode !== null) {
      runningServers.delete(repoId);
      await deleteServerInfo(repoId);
      throw new Error('Dev server failed to start. Check that dependencies are installed.');
    }
    
    // Try to connect to the server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const testResponse = await fetch(`http://localhost:${port}`, {
        method: 'HEAD',
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });
      
      if (testResponse.status < 500) {
        serverReady = true;
        console.log(`[Dev Server ${repoId}] Server is ready on port ${port}`);
        break;
      }
    } catch {
      // Server not ready yet, continue waiting
    }
  }
  
  if (!serverReady) {
    // Check one more time if process is running
    if (childProcess.killed || childProcess.exitCode !== null) {
      runningServers.delete(repoId);
      await deleteServerInfo(repoId);
      throw new Error('Dev server failed to start. Check that dependencies are installed.');
    }
    // Server might be starting slowly, but process is running
    // Give it a bit more time
    console.log(`[Dev Server ${repoId}] Server might be slow to start, waiting a bit more...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  return { port, appType };
}

export async function stopDevServer(repoId: string): Promise<void> {
  const serverInfo = runningServers.get(repoId);
  
  if (serverInfo) {
    // Kill the process
    if (serverInfo.process && !serverInfo.process.killed) {
      serverInfo.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (serverInfo.process && !serverInfo.process.killed) {
          serverInfo.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    runningServers.delete(repoId);
  }
  
  // Also try to kill by PID from saved info
  const savedInfo = await loadServerInfo(repoId);
  if (savedInfo && savedInfo.pid) {
    try {
      process.kill(savedInfo.pid, 'SIGTERM');
    } catch {
      // Process might already be dead
    }
  }
  
  await deleteServerInfo(repoId);
}

export async function getDevServerInfo(repoId: string): Promise<DevServerInfo | null> {
  // First check in-memory cache
  const cached = runningServers.get(repoId);
  if (cached) {
    // Verify process is still running
    if (!cached.process.killed && cached.process.exitCode === null) {
      return cached;
    } else {
      // Process is dead, clean up
      runningServers.delete(repoId);
      await deleteServerInfo(repoId);
    }
  }
  
  // Check saved info file
  const savedInfo = await loadServerInfo(repoId);
  if (savedInfo) {
    // Verify process is still running
    try {
      process.kill(savedInfo.pid, 0); // Signal 0 just checks if process exists
      
      // Process exists, return info (without process object since we can't access it)
      return {
        process: null as any, // We can't access the process from another instance
        port: savedInfo.port,
        repoId: savedInfo.repoId,
        repoDir: savedInfo.repoDir,
        appType: savedInfo.appType,
      };
    } catch {
      // Process doesn't exist, clean up
      await deleteServerInfo(repoId);
      return null;
    }
  }
  
  return null;
}

export function getAllRunningServers(): DevServerInfo[] {
  return Array.from(runningServers.values());
}

