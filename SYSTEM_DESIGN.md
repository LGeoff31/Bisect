# Git Bisect Tool - System Design Document

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Repository Structure Detection](#repository-structure-detection)
6. [Dev Server Management](#dev-server-management)
7. [Port Management](#port-management)
8. [API Design](#api-design)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)
10. [Technical Requirements](#technical-requirements)
11. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose
A web-based tool that performs git bisect operations to find the commit that introduced a bug. Users can clone repositories, test commits interactively by running dev servers, and identify the problematic commit through binary search.

### Key Features
- Repository cloning/copying (GitHub, GitLab, local paths)
- Git bisect operations (start, mark commits, get status)
- Dev server management (start/stop, port allocation, dependency installation)
- Multi-repo structure support (monorepos, frontend/backend, nested packages)
- Real-time status updates
- Interactive commit testing via web UI

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │  API Routes  │  │   Library    │      │
│  │   (React)    │◄─┤  (Next.js)   │◄─┤   Modules    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Git Commands  │  │  Dev Servers    │  │  File System    │
│  (simple-git)   │  │  (Child Procs)  │  │  (.repos/)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Component Layers

1. **Presentation Layer** (Frontend)
   - React components
   - UI state management
   - User interactions

2. **API Layer** (Next.js API Routes)
   - RESTful endpoints
   - Request/response handling
   - Error handling

3. **Business Logic Layer** (Library Modules)
   - Git operations
   - Dev server management
   - Repository detection
   - Dependency management

4. **Infrastructure Layer**
   - File system operations
   - Process management
   - Port allocation

---

## Core Components

### 1. Repository Manager (`app/api/repo/route.ts`)

**Responsibilities:**
- Clone repositories from URLs
- Copy local repositories
- Generate unique repo IDs (UUID)
- Manage repository lifecycle (create/delete)

**Key Functions:**
- `POST /api/repo` - Setup repository
- `DELETE /api/repo?repoId=...` - Cleanup repository

**Storage:**
- Repositories stored in `.repos/{repoId}/`
- Each repo isolated by UUID

### 2. Bisect Manager (`app/api/bisect/*/route.ts`)

**Responsibilities:**
- Start git bisect sessions
- Mark commits as good/bad
- Track bisect status
- Return commit information

**Key Functions:**
- `POST /api/bisect/start` - Initialize bisect
- `POST /api/bisect/mark` - Mark commit status
- `GET /api/bisect/status` - Get current state

**State Management:**
- Uses git's native bisect state
- Tracks: active, complete, current commit, first bad commit

### 3. Dev Server Manager (`lib/dev-server-manager.ts`)

**Responsibilities:**
- Detect application type (Next.js, Vite, React, etc.)
- Find all package.json directories
- Install dependencies (npm/pnpm/yarn)
- Run post-install scripts (Prisma generate, etc.)
- Start/stop dev servers
- Manage port allocation
- Proxy requests to dev servers

**Key Functions:**
- `detectAppType()` - Identify frontend framework
- `findAllPackageJsonDirs()` - Find all packages
- `detectPackageManager()` - Detect npm/pnpm/yarn
- `installAllDependencies()` - Install for all packages
- `startDevServer()` - Start dev server
- `stopDevServer()` - Stop dev server
- `getDevServerInfo()` - Get server status

**Process Management:**
- Spawns child processes for dev servers
- Tracks PIDs and ports
- Handles process cleanup

### 4. Proxy Manager (`app/api/dev-server/proxy/route.ts`)

**Responsibilities:**
- Route requests to appropriate dev server
- Handle all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Forward headers and body
- Handle WebSocket upgrades (for HMR)

**Key Functions:**
- `GET /api/dev-server/proxy/[repoId]/[...path]` - Proxy requests
- Supports all HTTP methods
- Preserves request/response headers

---

## Data Flow

### 1. Repository Setup Flow

```
User Input (URL/Path)
    │
    ▼
POST /api/repo
    │
    ├─► Generate UUID (repoId)
    │
    ├─► Clone/Copy Repository
    │   └─► .repos/{repoId}/
    │
    └─► Return repoId
```

### 2. Bisect Flow

```
User Input (goodCommit, badCommit)
    │
    ▼
POST /api/bisect/start
    │
    ├─► Validate commits exist
    │
    ├─► git bisect start
    │
    ├─► git bisect good {goodCommit}
    │
    ├─► git bisect bad {badCommit}
    │
    ├─► git bisect next (get current commit)
    │
    └─► Return commit info
         │
         ▼
    User Tests Commit
         │
         ▼
    POST /api/bisect/mark (good/bad)
         │
         ├─► git bisect good/bad
         │
         ├─► git bisect next
         │
         └─► Return next commit or completion
```

### 3. Dev Server Flow

```
User Clicks "Start Dev Server"
    │
    ▼
POST /api/dev-server/start
    │
    ├─► Detect App Type (Next.js/Vite/React)
    │
    ├─► Find All package.json Directories
    │   └─► Root, frontend/, backend/, packages/*, etc.
    │
    ├─► Detect Package Manager (npm/pnpm/yarn)
    │   └─► Check package.json.packageManager
    │   └─► Check lock files (package-lock.json, pnpm-lock.yaml, yarn.lock)
    │
    ├─► Install Dependencies (for each package)
    │   └─► npm/pnpm/yarn install
    │
    ├─► Run Post-Install Scripts
    │   ├─► Prisma generate (if detected)
    │   └─► package.json postinstall script
    │
    ├─► Find Free Port (3001-3100, skip 3000)
    │
    ├─► Start Dev Server
    │   └─► npx next dev -p {port}
    │   └─► Set PORT env var
    │   └─► Remove PORT from .env files
    │
    ├─► Wait for Server Ready
    │   └─► Poll http://localhost:{port}
    │   └─► Check stdout for "ready" messages
    │
    └─► Return port and URL
```

---

## Repository Structure Detection

### Supported Repository Structures

#### 1. Simple Single-Package Repo
```
repo/
├── package.json
├── src/
└── ...
```
**Detection:** Root has package.json

#### 2. Frontend/Backend Split
```
repo/
├── frontend/
│   ├── package.json
│   └── ...
├── backend/
│   ├── package.json
│   └── ...
└── ...
```
**Detection:** Multiple package.json files found
**Handling:** Install dependencies for both, detect frontend for dev server

#### 3. Monorepo (Workspaces)
```
repo/
├── package.json (root workspace)
├── packages/
│   ├── app/
│   │   └── package.json
│   ├── ui/
│   │   └── package.json
│   └── api/
│       └── package.json
└── ...
```
**Detection:** Multiple package.json files, may have workspace config
**Handling:** Install dependencies for all packages

#### 4. Nested Structure
```
repo/
├── apps/
│   ├── web/
│   │   └── package.json
│   └── mobile/
│       └── package.json
├── packages/
│   └── shared/
│       └── package.json
└── ...
```
**Detection:** Recursive search (up to 3 levels deep)
**Handling:** Install all, detect frontend app

#### 5. Alternative Directory Names
```
repo/
├── client/          (instead of frontend)
│   └── package.json
├── server/          (instead of backend)
│   └── package.json
├── app/             (alternative name)
│   └── package.json
├── web/             (alternative name)
│   └── package.json
└── ...
```
**Detection:** Check common names: frontend, client, app, web, ui, src

### Detection Algorithm

```typescript
function detectAppType(repoDir):
  // Priority order for frontend detection
  frontendDirs = ['', 'frontend', 'client', 'app', 'web', 'ui', 'src']
  
  for dir in frontendDirs:
    if package.json exists in dir:
      if dependencies include 'next':
        return { type: 'nextjs', dir: dir }
      if dependencies include 'vite':
        return { type: 'vite', dir: dir }
      if dependencies include 'react':
        return { type: 'react', dir: dir }
  
  return { type: 'unknown', dir: repoDir }

function findAllPackageJsonDirs(repoDir):
  // Recursive search (max depth 3)
  // Skip: node_modules, .git, .next, dist, build, .*
  // Return all directories with package.json
```

---

## Dev Server Management

### Application Type Detection

#### Next.js Detection
- Check for `next` in dependencies
- Dev command: `npx next dev -p {port}`
- Port handling: Use `-p` flag (highest priority)

#### Vite Detection
- Check for `vite` in dependencies
- Dev command: `npx vite --port {port}` or `npm run dev`
- Port handling: `--port` flag or `PORT` env var

#### React (CRA) Detection
- Check for `react` or `react-dom` in dependencies
- Dev command: `npm start` or `npm run dev`
- Port handling: `PORT` env var

#### Unknown/Generic
- Try `npm run dev` or `npm start`
- Use `PORT` env var

### Package Manager Detection

#### Detection Priority
1. `package.json.packageManager` field (e.g., `"packageManager": "pnpm@8.0.0"`)
2. Lock file existence:
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → yarn
   - `package-lock.json` → npm
3. Default: npm

### Dependency Installation

#### Installation Process
1. **Find all packages** - Recursive search for package.json
2. **Detect package manager** - Per directory
3. **Check if installed** - Check for node_modules
4. **Install dependencies** - Run install command
5. **Run post-install** - Prisma generate, postinstall scripts

#### Parallel Installation
- Install dependencies for all packages in parallel
- Use `Promise.allSettled()` to continue if one fails
- Log progress for each package

### Post-Install Scripts

#### Prisma Client Generation
- Detect: `@prisma/client` or `prisma` in dependencies
- Find schema: `prisma/schema.prisma` or `schema.prisma`
- Run: `npx prisma generate`
- Handle: Schema in different locations (monorepos)

#### Custom Post-Install
- Run `npm/pnpm/yarn run postinstall` if exists
- Handle errors gracefully (don't fail entire process)

---

## Port Management

### Port Allocation Strategy

#### Port Range
- **Main App:** Port 3000 (fixed)
- **Dev Servers:** Ports 3001-3100 (dynamic allocation)
- **Never use:** Port 3000 for dev servers

#### Port Finding Algorithm
```typescript
function findFreePort():
  ports = findFreePort(3001, 3100)  // Returns array
  port = ports[0]
  
  // Safety check
  if port === 3000:
    port = 3001
  
  return port
```

### Port Setting Priority (Highest to Lowest)

1. **Command-line flag** (`-p` for Next.js, `--port` for Vite)
2. **Environment variable** (`PORT`)
3. **.env files** (should be removed/overridden)
4. **Default** (3000 - but we never use this)

### Port Override Strategy

#### For Next.js
```typescript
// Always use npx next dev (not npm run dev)
command = 'npx'
args = ['next', 'dev', '-p', port.toString()]

// Also set PORT env var as backup
env.PORT = port.toString()
```

#### For Vite
```typescript
// Try --port flag first
args = ['vite', '--port', port.toString()]

// Or set PORT env var
env.PORT = port.toString()
env.VITE_PORT = port.toString()
```

#### Remove PORT from .env
```typescript
// Load .env files
repoEnv = loadEnvFiles(appDir)

// Remove PORT to prevent conflicts
{ PORT: _, ...repoEnvWithoutPort } = repoEnv

// Set PORT last to override everything
env.PORT = port.toString()
```

---

## API Design

### Repository API

#### `POST /api/repo`
**Request:**
```json
{
  "repoUrl": "https://github.com/user/repo.git",  // Optional
  "repoPath": "/path/to/local/repo"              // Optional (one required)
}
```

**Response:**
```json
{
  "repoId": "uuid-v4",
  "message": "Repository ready"
}
```

**Errors:**
- `400`: Missing repoUrl and repoPath
- `500`: Clone/copy failed

#### `DELETE /api/repo?repoId={id}`
**Response:**
```json
{
  "message": "Repository deleted"
}
```

### Bisect API

#### `POST /api/bisect/start`
**Request:**
```json
{
  "repoId": "uuid",
  "goodCommit": "abc123...",
  "badCommit": "def456..."
}
```

**Response:**
```json
{
  "currentCommit": "xyz789...",
  "commitMessage": "Fix bug",
  "commitDate": "2024-01-01T00:00:00Z"
}
```

#### `POST /api/bisect/mark`
**Request:**
```json
{
  "repoId": "uuid",
  "status": "good" | "bad"
}
```

**Response:**
```json
{
  "complete": false,
  "currentCommit": "xyz789...",
  "commitMessage": "...",
  "commitDate": "...",
  "firstBadCommit": "..."  // Only if complete
}
```

#### `GET /api/bisect/status?repoId={id}`
**Response:**
```json
{
  "active": true,
  "complete": false,
  "currentCommit": "xyz789...",
  "commitMessage": "...",
  "commitDate": "...",
  "firstBadCommit": null
}
```

### Dev Server API

#### `POST /api/dev-server/start`
**Request:**
```json
{
  "repoId": "uuid",
  "envVars": {                    // Optional
    "DATABASE_URL": "...",
    "API_KEY": "..."
  }
}
```

**Response:**
```json
{
  "port": 3001,
  "appType": "nextjs",
  "url": "/api/dev-server/proxy/{repoId}",
  "directUrl": "http://localhost:3001"
}
```

#### `DELETE /api/dev-server/start?repoId={id}`
**Response:**
```json
{
  "message": "Dev server stopped"
}
```

#### `GET /api/dev-server/proxy/[repoId]/[...path]`
**Proxies all requests to dev server**
- Supports: GET, POST, PUT, PATCH, DELETE
- Forwards headers and body
- Returns proxied response

---

## Edge Cases & Error Handling

### Repository Setup

#### Case 1: Invalid Git URL
- **Error:** Clone fails
- **Handling:** Return error message, suggest checking URL/permissions
- **Recovery:** User can retry with correct URL

#### Case 2: Local Path Doesn't Exist
- **Error:** Copy fails
- **Handling:** Return error with path validation
- **Recovery:** User provides correct path

#### Case 3: Insufficient Disk Space
- **Error:** Clone/copy fails
- **Handling:** Catch filesystem errors, suggest cleanup
- **Recovery:** User frees space or uses smaller repo

#### Case 4: Private Repository (No Auth)
- **Error:** Clone fails with auth error
- **Handling:** Return error suggesting SSH keys or token
- **Recovery:** User configures git credentials

### Bisect Operations

#### Case 1: Invalid Commit Hashes
- **Error:** Commit doesn't exist
- **Handling:** Validate commits before starting bisect
- **Recovery:** User provides valid commits

#### Case 2: Commits Not in Range
- **Error:** Good commit after bad commit
- **Handling:** Validate commit order
- **Recovery:** User swaps commits

#### Case 3: Bisect Already Active
- **Error:** Git bisect already started
- **Handling:** Reset bisect before starting new one
- **Recovery:** Automatic reset

#### Case 4: No Commits Between Good/Bad
- **Error:** Commits are adjacent
- **Handling:** Detect and return bad commit immediately
- **Recovery:** N/A (expected behavior)

### Dev Server Management

#### Case 1: Port Already in Use
- **Error:** Port conflict
- **Handling:** Find next available port automatically
- **Recovery:** Automatic retry with new port

#### Case 2: Package Manager Not Installed
- **Error:** pnpm/yarn not found
- **Handling:** Fallback to npm, log warning
- **Recovery:** User installs package manager or uses npm

#### Case 3: Dependency Installation Fails
- **Error:** npm install fails
- **Handling:** Log error, continue (partial install might work)
- **Recovery:** User checks package.json, retries

#### Case 4: Dev Server Fails to Start
- **Error:** Process exits immediately
- **Handling:** Check exit code, return error with logs
- **Recovery:** User checks dependencies, scripts, logs

#### Case 5: Multiple Dev Servers (Same Repo)
- **Error:** Server already running
- **Handling:** Stop existing server before starting new one
- **Recovery:** Automatic cleanup

#### Case 6: Dev Server Crashes
- **Error:** Process dies unexpectedly
- **Handling:** Detect via exit event, clean up state
- **Recovery:** User can restart server

#### Case 7: Prisma Schema Not Found
- **Error:** Prisma generate fails
- **Handling:** Skip Prisma generation, log warning
- **Recovery:** User checks schema location

#### Case 8: Post-Install Script Fails
- **Error:** postinstall script exits with error
- **Handling:** Log error, continue (don't fail entire process)
- **Recovery:** User fixes script or continues without it

### Repository Structure

#### Case 1: No package.json Found
- **Error:** Can't detect app type
- **Handling:** Return error, suggest checking repo structure
- **Recovery:** User provides correct repo

#### Case 2: Multiple Frontend Apps
- **Error:** Ambiguous which app to run
- **Handling:** Use priority order (root > frontend > client > app)
- **Recovery:** User can specify app directory (future enhancement)

#### Case 3: Backend-Only Repo
- **Error:** No frontend detected
- **Handling:** Return error, suggest frontend repo
- **Recovery:** User provides frontend repo or we add backend support

#### Case 4: Monorepo with Workspaces
- **Error:** Root install might fail
- **Handling:** Install root dependencies first, then packages
- **Recovery:** Handle workspace dependencies correctly

### Port Management

#### Case 1: All Ports in Use (3001-3100)
- **Error:** No free ports
- **Handling:** Return error, suggest stopping other servers
- **Recovery:** User stops servers or expands port range

#### Case 2: PORT in .env Overrides Our Setting
- **Error:** Dev server uses wrong port
- **Handling:** Remove PORT from .env, set via flag/env
- **Recovery:** Always use `-p` flag for Next.js

#### Case 3: Dev Script Has Hardcoded Port
- **Error:** Script has `next dev -p 3000`
- **Handling:** Use `npx next dev -p {port}` directly (bypass script)
- **Recovery:** Always use npx directly, not npm run dev

---

## Technical Requirements

### Runtime Requirements
- **Node.js:** 18+
- **Git:** Installed and accessible
- **Package Managers:** npm (required), pnpm/yarn (optional)
- **Disk Space:** Sufficient for cloned repositories
- **Ports:** 3000 (main app), 3001-3100 (dev servers)

### Dependencies
- **next:** 16.0.1+ (Framework)
- **react:** 19.2.0+ (UI)
- **simple-git:** 3.30.0+ (Git operations)
- **uuid:** 13.0.0+ (ID generation)
- **find-free-port:** 2.0.0+ (Port allocation)
- **http-proxy-middleware:** 3.0.5+ (Request proxying)

### File System Structure
```
bisect/
├── .repos/                    # Cloned repositories (gitignored)
│   └── {repoId}/
│       └── [repo files]
├── .server-info/              # Dev server metadata (gitignored)
│   └── {repoId}.json
├── app/
│   ├── api/
│   │   ├── repo/
│   │   ├── bisect/
│   │   └── dev-server/
│   └── [pages]
└── lib/
    └── dev-server-manager.ts
```

### Process Management
- **Dev Servers:** Spawned as child processes
- **Cleanup:** SIGTERM → SIGKILL after 5s
- **State:** Tracked in memory + file system
- **Ports:** Allocated dynamically, tracked per repoId

### Security Considerations
- **Repository Isolation:** Each repo in separate directory
- **Process Isolation:** Each dev server in separate process
- **Port Isolation:** Each server on different port
- **Path Validation:** Validate repo paths to prevent directory traversal
- **Resource Limits:** Consider timeout limits for operations

---

## Future Enhancements

### Short Term
1. **Backend Dev Server Support**
   - Detect backend frameworks (Express, FastAPI, etc.)
   - Start backend servers
   - Proxy API requests

2. **Better Error Messages**
   - More specific error suggestions
   - Link to documentation
   - Show logs in UI

3. **Port Range Configuration**
   - Allow user to configure port range
   - Better port conflict resolution

4. **Dependency Caching**
   - Cache node_modules between bisect steps
   - Faster iteration

### Medium Term
1. **Multi-App Selection**
   - UI to select which app to run (if multiple found)
   - Support running multiple apps simultaneously

2. **Environment Variable Management**
   - UI to manage .env files
   - Template .env files
   - Per-commit .env support

3. **Database Setup**
   - Auto-detect database needs
   - Run migrations
   - Seed data

4. **Build Step Support**
   - Run build commands before starting
   - Handle build errors

### Long Term
1. **Distributed Bisect**
   - Run bisect across multiple machines
   - Parallel commit testing

2. **Automated Testing**
   - Integrate test runners
   - Auto-mark commits based on test results

3. **CI/CD Integration**
   - Run bisect in CI
   - Generate reports
   - Slack/email notifications

4. **Repository Templates**
   - Pre-configured setups for common frameworks
   - Faster onboarding

---

## Implementation Notes

### Critical Design Decisions

1. **Always use `npx next dev -p {port}` directly**
   - Bypasses npm scripts that might override PORT
   - Most reliable way to set port

2. **Remove PORT from .env files**
   - Prevents conflicts
   - Set PORT last in env chain

3. **Install dependencies for all packages**
   - Handles monorepos correctly
   - Ensures backend dependencies available

4. **Run post-install scripts automatically**
   - Prisma generate, etc.
   - Don't fail if script fails

5. **Port range 3001-3100**
   - Never use 3000 (main app)
   - Automatic conflict resolution

6. **Process state in memory + files**
   - Survives server restarts
   - Cross-process access

### Testing Strategy

1. **Unit Tests**
   - Repository detection logic
   - Package manager detection
   - Port allocation

2. **Integration Tests**
   - Full bisect flow
   - Dev server lifecycle
   - Dependency installation

3. **E2E Tests**
   - Complete user workflows
   - Multiple repo structures
   - Error scenarios

### Performance Considerations

1. **Dependency Installation**
   - Parallel installation
   - Cache node_modules when possible
   - Skip if already installed

2. **Repository Cloning**
   - Shallow clones (future)
   - Progress reporting
   - Timeout handling

3. **Dev Server Startup**
   - Timeout after 30s
   - Poll for readiness
   - Kill if fails

---

## Summary

This system handles:
- ✅ Multiple repository structures (monorepos, frontend/backend, nested)
- ✅ Multiple package managers (npm, pnpm, yarn)
- ✅ Multiple frameworks (Next.js, Vite, React)
- ✅ Post-install scripts (Prisma, custom)
- ✅ Port management (avoid conflicts, dynamic allocation)
- ✅ Error handling (graceful degradation, helpful messages)
- ✅ Process management (lifecycle, cleanup, state)

The architecture is designed to be:
- **Extensible:** Easy to add new frameworks/package managers
- **Robust:** Handles edge cases gracefully
- **User-Friendly:** Clear errors and automatic recovery
- **Performant:** Parallel operations where possible

