# Hardest Problems & Edge Cases

This document covers the most challenging aspects of building this git bisect tool, focusing on repository structure detection, dependency management, and dev server handling.

---

## Problem 1: Repository Structure Detection

### The Challenge
Every repository has a different structure. We need to:
- Find the frontend app (if it exists)
- Find ALL packages that need dependencies installed
- Handle monorepos, nested structures, and unconventional layouts

### Edge Cases

#### Case 1.1: Multiple Frontend Apps
```
repo/
├── admin-dashboard/
│   └── package.json (Next.js)
├── public-site/
│   └── package.json (Next.js)
└── mobile-app/
    └── package.json (React Native)
```
**Problem:** Which one to run?
**Solution:** Use priority order, but ideally let user choose
**Complexity:** ⭐⭐⭐⭐

#### Case 1.2: Frontend in Non-Standard Location
```
repo/
├── src/
│   └── web/
│       └── package.json (Next.js)
└── lib/
    └── server/
        └── package.json
```
**Problem:** Frontend is nested deeper than expected
**Solution:** Recursive search up to 3 levels
**Complexity:** ⭐⭐⭐

#### Case 1.3: No Frontend, Backend Only
```
repo/
├── server/
│   └── package.json (Express)
└── api/
    └── package.json (FastAPI)
```
**Problem:** No frontend to run
**Solution:** Currently fails, need backend server support
**Complexity:** ⭐⭐⭐⭐⭐

#### Case 1.4: Root Has package.json But No App
```
repo/
├── package.json (workspace root only)
├── packages/
│   ├── app/
│   │   └── package.json (actual app)
│   └── lib/
│       └── package.json
```
**Problem:** Root package.json might not have dev script
**Solution:** Check for dev script, if not found, search subdirectories
**Complexity:** ⭐⭐⭐

#### Case 1.5: Symlinked Packages (pnpm/yarn workspaces)
```
repo/
├── package.json
├── pnpm-workspace.yaml
├── packages/
│   └── app/
│       └── package.json
└── node_modules/
    └── packages/ (symlinks)
```
**Problem:** Symlinks can confuse detection
**Solution:** Skip node_modules in search, handle workspace configs
**Complexity:** ⭐⭐⭐⭐

---

## Problem 2: Package Manager Detection

### The Challenge
Different packages in the same repo might use different package managers. We need to detect and use the correct one for each.

### Edge Cases

#### Case 2.1: Mixed Package Managers
```
repo/
├── frontend/
│   ├── package.json
│   └── pnpm-lock.yaml (pnpm)
├── backend/
│   ├── package.json
│   └── yarn.lock (yarn)
└── shared/
    ├── package.json
    └── package-lock.json (npm)
```
**Problem:** Each directory needs different manager
**Solution:** Detect per-directory, use appropriate manager
**Complexity:** ⭐⭐⭐⭐

#### Case 2.2: packageManager Field vs Lock File Mismatch
```json
// package.json
{
  "packageManager": "pnpm@8.0.0"
}
// But pnpm-lock.yaml doesn't exist, only package-lock.json
```
**Problem:** Which to trust?
**Solution:** Trust packageManager field, but warn if lock file mismatch
**Complexity:** ⭐⭐⭐

#### Case 2.3: No Lock File, No packageManager Field
```
repo/
└── package.json (no lock file, no packageManager)
```
**Problem:** Which manager to use?
**Solution:** Default to npm, but might be wrong
**Complexity:** ⭐⭐

#### Case 2.4: Package Manager Not Installed
```
Detected: pnpm
But: pnpm command not found
```
**Problem:** Can't use detected manager
**Solution:** Fallback to npm, warn user
**Complexity:** ⭐⭐⭐

#### Case 2.5: Workspace Root vs Package Managers
```
repo/
├── package.json (workspace: uses pnpm)
├── pnpm-workspace.yaml
├── packages/
│   └── app/
│       ├── package.json
│       └── package-lock.json (npm - wrong!)
```
**Problem:** Package has wrong lock file for workspace
**Solution:** Install root with workspace manager, packages inherit
**Complexity:** ⭐⭐⭐⭐⭐

---

## Problem 3: Dependency Installation

### The Challenge
Installing dependencies correctly for all packages, handling workspace dependencies, native modules, and post-install scripts.

### Edge Cases

#### Case 3.1: Workspace Dependencies
```
repo/
├── package.json (workspace root)
├── packages/
│   ├── app/
│   │   ├── package.json
│   │   └── depends on: "shared": "workspace:*"
│   └── shared/
│       └── package.json
```
**Problem:** App depends on workspace package, needs root install first
**Solution:** Install root first, then packages (or use workspace install)
**Complexity:** ⭐⭐⭐⭐⭐

#### Case 3.2: Native Modules (Need Rebuild)
```
repo/
├── package.json
└── dependencies:
    ├── lightningcss (native)
    ├── bcrypt (native)
    └── sharp (native)
```
**Problem:** Native modules need rebuild after git checkout
**Solution:** Run rebuild after install, handle platform-specific binaries
**Complexity:** ⭐⭐⭐⭐

#### Case 3.3: Prisma Client Generation
```
repo/
├── frontend/
│   ├── package.json (@prisma/client)
│   └── src/
└── backend/
    ├── package.json (prisma)
    └── prisma/
        └── schema.prisma
```
**Problem:** Prisma client needs generation, schema in different location
**Solution:** Detect Prisma, find schema, run generate with --schema flag
**Complexity:** ⭐⭐⭐⭐

#### Case 3.4: Post-Install Scripts That Fail
```json
{
  "scripts": {
    "postinstall": "node scripts/setup.js"
  }
}
// But setup.js fails or doesn't exist
```
**Problem:** Post-install fails, but we still need to continue
**Solution:** Catch errors, log warning, continue (don't fail entire process)
**Complexity:** ⭐⭐⭐

#### Case 3.5: Circular Dependencies in Workspace
```
repo/
├── package.json
├── packages/
│   ├── a/ (depends on b)
│   └── b/ (depends on a)
```
**Problem:** Installation order matters
**Solution:** Workspace managers handle this, but need to ensure root install
**Complexity:** ⭐⭐⭐⭐

#### Case 3.6: Git Dependencies
```json
{
  "dependencies": {
    "my-package": "git+https://github.com/user/repo.git"
  }
}
```
**Problem:** Git dependencies need network access, might fail
**Solution:** Handle git clone errors, timeout handling
**Complexity:** ⭐⭐⭐

#### Case 3.7: Optional Dependencies That Fail
```json
{
  "optionalDependencies": {
    "fsevents": "^2.0.0"  // macOS only
  }
}
```
**Problem:** Optional deps fail on wrong platform
**Solution:** This is fine, npm handles it, but need to not fail on warnings
**Complexity:** ⭐⭐

#### Case 3.8: Peer Dependencies Missing
```
package.json requires react@^18.0.0 as peer dependency
But react not installed
```
**Problem:** Peer dependency warnings, might cause runtime errors
**Solution:** Log warnings, but continue (user's responsibility)
**Complexity:** ⭐⭐⭐

---

## Problem 4: Port Management

### The Challenge
Ensuring dev servers never conflict with main app (port 3000) or each other, handling PORT overrides from multiple sources.

### Edge Cases

#### Case 4.1: PORT in .env File Overrides Our Setting
```
frontend/.env:
PORT=3000

We set: PORT=3001
But Next.js reads .env and uses 3000
```
**Problem:** .env file takes precedence
**Solution:** Remove PORT from loaded .env, use -p flag (highest priority)
**Complexity:** ⭐⭐⭐⭐⭐ (THIS IS THE CURRENT BUG)

#### Case 4.2: Dev Script Has Hardcoded Port
```json
{
  "scripts": {
    "dev": "next dev -p 3000"
  }
}
```
**Problem:** Script overrides everything
**Solution:** Don't use `npm run dev`, use `npx next dev -p {port}` directly
**Complexity:** ⭐⭐⭐⭐

#### Case 4.3: Multiple .env Files
```
repo/
├── .env (PORT=3000)
├── .env.local (PORT=3001)
├── .env.development (PORT=3002)
└── frontend/
    └── .env (PORT=3000)
```
**Problem:** Multiple PORT values, which wins?
**Solution:** Load all .env files, remove PORT from all, set our own last
**Complexity:** ⭐⭐⭐⭐

#### Case 4.4: PORT in package.json Scripts
```json
{
  "scripts": {
    "dev": "cross-env PORT=3000 next dev"
  }
}
```
**Problem:** PORT set in script, not env file
**Solution:** Use npx directly, bypass script entirely
**Complexity:** ⭐⭐⭐⭐

#### Case 4.5: All Ports in Range Are Used
```
Ports 3001-3100 all in use
```
**Problem:** No available ports
**Solution:** Return error, suggest stopping other servers or expanding range
**Complexity:** ⭐⭐

#### Case 4.6: Port Becomes Available Mid-Startup
```
We allocate port 3001
But another process grabs it before we start
```
**Problem:** Race condition
**Solution:** Check port availability right before starting, retry if needed
**Complexity:** ⭐⭐⭐

#### Case 4.7: Next.js Ignores PORT Env Var
```
Some Next.js versions ignore PORT env var
Only respect -p flag
```
**Problem:** Inconsistent behavior
**Solution:** Always use -p flag for Next.js (most reliable)
**Complexity:** ⭐⭐⭐

---

## Problem 5: Dev Server Startup

### The Challenge
Starting dev servers for different frameworks, detecting when they're ready, handling startup failures.

### Edge Cases

#### Case 5.1: Dev Server Takes Long to Start
```
Large Next.js app: 30+ seconds to compile
```
**Problem:** Timeout too short, or user thinks it's broken
**Solution:** Poll for readiness, show progress, increase timeout for large apps
**Complexity:** ⭐⭐⭐

#### Case 5.2: Dev Server Starts But Crashes Immediately
```
Process starts, then exits with code 1
```
**Problem:** Error not visible to user
**Solution:** Capture stdout/stderr, return error with logs
**Complexity:** ⭐⭐⭐

#### Case 5.3: Dev Server Hangs (Never Ready)
```
Process running but never responds to HTTP
```
**Problem:** How to detect?
**Solution:** Timeout after 30s, check process still running, kill if hung
**Complexity:** ⭐⭐⭐

#### Case 5.4: Wrong Dev Command Detected
```
Detected: React
But actually: Next.js (no next in dependencies yet)
```
**Problem:** Detection fails, wrong command used
**Solution:** Try command, if fails, try alternatives
**Complexity:** ⭐⭐⭐⭐

#### Case 5.5: Dev Script Requires Additional Setup
```json
{
  "scripts": {
    "dev": "npm run build:watch && next dev"
  }
}
```
**Problem:** Script has multiple commands
**Solution:** Use npx directly, or parse script (complex)
**Complexity:** ⭐⭐⭐⭐

#### Case 5.6: Environment Variables Required
```
Dev server needs DATABASE_URL, API_KEY, etc.
But not in repo (security)
```
**Problem:** Server fails without env vars
**Solution:** UI to input env vars, pass to dev server
**Complexity:** ⭐⭐⭐

#### Case 5.7: Dev Server Uses Different Port Than Expected
```
We set PORT=3001
But server starts on 3002 (port conflict)
```
**Problem:** Server auto-changes port, we don't know
**Solution:** Parse stdout for "Local: http://localhost:{port}", update our tracking
**Complexity:** ⭐⭐⭐⭐

#### Case 5.8: Multiple Dev Servers Needed
```
Monorepo: Need to start frontend AND backend
```
**Problem:** Currently only starts one
**Solution:** Detect multiple apps, start all, proxy appropriately
**Complexity:** ⭐⭐⭐⭐⭐

---

## Problem 6: Process Management

### The Challenge
Managing multiple dev server processes, cleanup on errors, handling crashes, state persistence.

### Edge Cases

#### Case 6.1: Process Crashes After Start
```
Server starts successfully
But crashes 5 minutes later
```
**Problem:** User doesn't know, proxy fails
**Solution:** Monitor process, detect exit, clean up state, notify user
**Complexity:** ⭐⭐⭐

#### Case 6.2: Server Restart (Next.js App Crashes)
```
Next.js server restarts due to error
New process, new PID
```
**Problem:** We lose track of process
**Solution:** Monitor by port, not just PID
**Complexity:** ⭐⭐⭐

#### Case 6.3: Multiple Instances of Same Repo
```
User starts dev server for repo A
Then starts another for same repo
```
**Problem:** Two servers, same repoId
**Solution:** Stop existing server before starting new one
**Complexity:** ⭐⭐

#### Case 6.4: Server Doesn't Respond to SIGTERM
```
We send SIGTERM
But process ignores it
```
**Problem:** Process won't die
**Solution:** Send SIGKILL after 5s timeout
**Complexity:** ⭐⭐

#### Case 6.5: Server Info Lost on App Restart
```
Next.js app restarts
In-memory server state lost
```
**Problem:** Can't stop servers
**Solution:** Persist state to file system, reload on startup
**Complexity:** ⭐⭐⭐

#### Case 6.6: Orphaned Processes
```
Server process survives app crash
Still running, port still in use
```
**Problem:** Can't start new server
**Solution:** Check for existing processes on startup, clean up
**Complexity:** ⭐⭐⭐

---

## Problem 7: Git Bisect State Management

### The Challenge
Managing git bisect state across multiple operations, handling concurrent requests, state persistence.

### Edge Cases

#### Case 7.1: Concurrent Bisect Operations
```
User marks commit as good
While another request checks status
```
**Problem:** Race condition, state corruption
**Solution:** Lock repository during bisect operations
**Complexity:** ⭐⭐⭐⭐

#### Case 7.2: Bisect State Lost on Git Checkout
```
We're in bisect
User manually checks out different commit
```
**Problem:** Bisect state corrupted
**Solution:** Validate bisect state before operations, reset if corrupted
**Complexity:** ⭐⭐⭐

#### Case 7.3: Bisect Already Active
```
Start bisect
But git bisect already started (from previous session)
```
**Problem:** Can't start new bisect
**Solution:** Reset bisect before starting new one
**Complexity:** ⭐⭐

#### Case 7.4: Invalid Commit Range
```
Good commit: abc123 (Jan 1)
Bad commit: def456 (Dec 1, earlier!)
```
**Problem:** Bad commit before good commit
**Solution:** Validate commit dates, swap if needed, or error
**Complexity:** ⭐⭐⭐

#### Case 7.5: Commits Not in Same Branch
```
Good commit: main branch
Bad commit: feature branch
```
**Problem:** Can't bisect across branches
**Solution:** Check if commits reachable, error if not
**Complexity:** ⭐⭐⭐

---

## Problem 8: Environment Variables

### The Challenge
Managing environment variables from multiple sources, per-commit state, conflicts.

### Edge Cases

#### Case 8.1: .env Files Change Per Commit
```
Commit A: .env has DATABASE_URL=v1
Commit B: .env has DATABASE_URL=v2
```
**Problem:** Need different env vars per commit
**Solution:** Load .env from current commit, merge with user-provided vars
**Complexity:** ⭐⭐⭐⭐

#### Case 8.2: .env Files Not in Git
```
.env files are gitignored
Not available in old commits
```
**Problem:** No env vars in old commits
**Solution:** User must provide env vars manually
**Complexity:** ⭐⭐⭐

#### Case 8.3: Multiple .env Files Priority
```
.env
.env.local
.env.development
.env.development.local
```
**Problem:** Which overrides which?
**Solution:** Follow Next.js convention: later files override earlier
**Complexity:** ⭐⭐⭐

#### Case 8.4: Environment Variables in package.json Scripts
```json
{
  "scripts": {
    "dev": "DATABASE_URL=xxx next dev"
  }
}
```
**Problem:** Env vars in script, not .env
**Solution:** Extract and set in environment (complex parsing)
**Complexity:** ⭐⭐⭐⭐

---

## Problem 9: Cross-Platform Compatibility

### The Challenge
Different behavior on Windows, Mac, Linux for paths, processes, commands.

### Edge Cases

#### Case 9.1: Path Separators
```
Windows: C:\Users\...\repo
Unix: /Users/.../repo
```
**Problem:** Path handling differs
**Solution:** Use path.join(), path.posix for URLs
**Complexity:** ⭐⭐

#### Case 9.2: Process Signals
```
Unix: SIGTERM, SIGKILL
Windows: taskkill, different signals
```
**Problem:** Process killing differs
**Solution:** Use cross-platform libraries, handle both
**Complexity:** ⭐⭐⭐

#### Case 9.3: Native Module Binaries
```
lightningcss: darwin-arm64.node (Mac M1)
lightningcss: win32-x64.node (Windows)
```
**Problem:** Wrong binary for platform
**Solution:** Rebuild native modules after install
**Complexity:** ⭐⭐⭐

#### Case 9.4: Shell Commands
```
Unix: npm run dev (works)
Windows: npm run dev (might need cmd.exe)
```
**Problem:** Shell differences
**Solution:** Use shell: true in spawn, let OS handle
**Complexity:** ⭐⭐

---

## Problem 10: Resource Management

### The Challenge
Managing disk space, memory, ports, processes across multiple repositories and bisect sessions.

### Edge Cases

#### Case 10.1: Disk Space Exhaustion
```
Cloning large repo
Disk fills up mid-clone
```
**Problem:** Clone fails, partial repo left
**Solution:** Check disk space before clone, cleanup on failure
**Complexity:** ⭐⭐⭐

#### Case 10.2: Too Many Dev Servers
```
User has 10 repos, all running dev servers
100+ processes
```
**Problem:** System resource exhaustion
**Solution:** Limit concurrent servers, cleanup old ones
**Complexity:** ⭐⭐⭐

#### Case 10.3: Memory Leaks in Dev Servers
```
Next.js dev server memory grows
Eventually crashes system
```
**Problem:** Long-running servers consume memory
**Solution:** Monitor memory, restart if needed
**Complexity:** ⭐⭐⭐⭐

#### Case 10.4: Repository Cleanup
```
User deletes repo
But dev server still running
```
**Problem:** Orphaned process
**Solution:** Stop dev server before deleting repo
**Complexity:** ⭐⭐

---

## Priority Ranking

### Critical (Must Handle)
1. ⭐⭐⭐⭐⭐ **Port Management** - PORT in .env overriding our setting
2. ⭐⭐⭐⭐⭐ **Workspace Dependencies** - Monorepo dependency resolution
3. ⭐⭐⭐⭐ **Dev Server Startup** - Detecting readiness, handling failures
4. ⭐⭐⭐⭐ **Process Management** - Cleanup, crashes, state persistence

### Important (Should Handle)
5. ⭐⭐⭐⭐ **Package Manager Detection** - Mixed managers, workspace roots
6. ⭐⭐⭐⭐ **Prisma Client Generation** - Schema in different locations
7. ⭐⭐⭐ **Repository Structure** - Multiple frontend apps, nested structures
8. ⭐⭐⭐ **Environment Variables** - Multiple sources, per-commit state

### Nice to Have
9. ⭐⭐⭐ **Cross-Platform** - Windows/Mac/Linux differences
10. ⭐⭐⭐ **Resource Management** - Disk space, memory limits
11. ⭐⭐ **Git Bisect State** - Concurrent operations, validation

---

## Solutions Summary

### Current Implementation Status

✅ **Implemented:**
- Basic repository structure detection
- Package manager detection (per directory)
- Dependency installation (all packages)
- Prisma client generation
- Port allocation (3001-3100)
- Process management (start/stop)
- Basic error handling

⚠️ **Partially Implemented:**
- Port management (still has .env override bug)
- Workspace dependencies (installs all, but order might be wrong)
- Dev server readiness detection (basic polling)

❌ **Not Implemented:**
- Backend server support
- Multiple dev servers (frontend + backend)
- Environment variable per-commit handling
- Resource limits
- Cross-platform process signals
- Concurrent bisect operation locking

---

## Testing Strategy

For each problem area, test:

1. **Happy Path** - Normal operation works
2. **Edge Cases** - Unusual but valid scenarios
3. **Error Cases** - Invalid inputs, failures
4. **Concurrent Operations** - Multiple users/requests
5. **Resource Limits** - Disk space, memory, ports
6. **Cross-Platform** - Windows, Mac, Linux

---

## Recommended Next Steps

1. **Fix Port Management** (Critical)
   - Always use `-p` flag for Next.js
   - Remove PORT from .env before loading
   - Test with various .env configurations

2. **Improve Workspace Handling** (Critical)
   - Install root dependencies first
   - Handle workspace:* dependencies correctly
   - Test with pnpm/yarn/npm workspaces

3. **Better Error Messages** (Important)
   - Specific error messages for each failure
   - Suggestions for how to fix
   - Logs visible to user

4. **Process Monitoring** (Important)
   - Detect crashes
   - Auto-cleanup
   - State persistence

5. **Backend Support** (Future)
   - Detect backend frameworks
   - Start backend servers
   - Proxy API requests

