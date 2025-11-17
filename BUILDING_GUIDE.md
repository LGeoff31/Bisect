# Building Git Bisect Tool - Step by Step Guide

This guide will walk you through building the entire application from scratch, understanding each component and how they work together.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Step 1: Basic Setup](#step-1-basic-setup)
3. [Step 2: Repository Management](#step-2-repository-management)
4. [Step 3: Git Bisect Operations](#step-3-git-bisect-operations)
5. [Step 4: Dev Server Management](#step-4-dev-server-management)
6. [Step 5: Frontend UI](#step-5-frontend-ui)
7. [Step 6: Putting It All Together](#step-6-putting-it-all-together)

---

## Project Overview

### What We're Building

A web application that:
1. **Clones/Copies Repositories** - Users can provide a Git URL or local path
2. **Performs Git Bisect** - Binary search through commits to find the bug
3. **Runs Dev Servers** - Test the app at each commit to see if it works
4. **Interactive UI** - Users mark commits as "Works" or "Doesn't Work"

### Core Concepts

**Git Bisect:**
- Binary search algorithm to find the first "bad" commit
- Given: one "good" commit (works) and one "bad" commit (has bug)
- Tests commits in between to narrow down the problem
- O(log n) complexity - very efficient!

**Dev Server:**
- Need to test the app at different commits
- Each commit might have different dependencies
- Need to install dependencies and start dev server
- Handle different frameworks (Next.js, Vite, React, etc.)

---

## Step 1: Basic Setup

### What We Have

✅ Next.js 16 project
✅ TypeScript
✅ Tailwind CSS
✅ Basic dependencies installed

### What We Need to Understand

**Project Structure:**
```
bisect/
├── app/              # Next.js App Router
│   ├── page.tsx      # Home page
│   ├── layout.tsx    # Root layout
│   └── api/          # API routes (we'll build these)
├── lib/              # Shared utilities (we'll build these)
└── package.json      # Dependencies
```

**Key Dependencies:**
- `simple-git` - Git operations
- `uuid` - Generate unique IDs for repos
- `find-free-port` - Find available ports
- `http-proxy-middleware` - Proxy requests to dev servers

### Current State

- ✅ Basic Next.js app running
- ✅ Home page shows "Building from scratch"
- ❌ No API routes yet
- ❌ No functionality yet

---

## Step 2: Repository Management

### Goal

Allow users to clone a repository or use a local path, and store it with a unique ID.

### What We Need

1. **API Route:** `POST /api/repo` - Clone/copy repository
2. **API Route:** `DELETE /api/repo` - Clean up repository
3. **Storage:** `.repos/{repoId}/` directory

### Step 2.1: Create Repository API Route

**File:** `app/api/repo/route.ts`

**What it does:**
- Accepts `repoUrl` (Git URL) or `repoPath` (local path)
- Generates unique ID (UUID)
- Clones or copies repository to `.repos/{repoId}/`
- Returns `repoId` to frontend

**Key Concepts:**
- **UUID:** Unique identifier for each repository session
- **simple-git:** Library to run git commands
- **File System:** Store repos in `.repos/` directory

### Step 2.2: Test Repository Setup

**Test Cases:**
1. Clone from GitHub URL
2. Copy from local path
3. Handle errors (invalid URL, path doesn't exist)
4. Clean up repository

---

## Step 3: Git Bisect Operations

### Goal

Perform git bisect to find the commit that introduced a bug.

### What We Need

1. **API Route:** `POST /api/bisect/start` - Start bisect session
2. **API Route:** `POST /api/bisect/mark` - Mark commit as good/bad
3. **API Route:** `GET /api/bisect/status` - Get current bisect status

### Step 3.1: Start Bisect

**What happens:**
1. User provides `goodCommit` (works) and `badCommit` (has bug)
2. Run `git bisect start`
3. Run `git bisect good {goodCommit}`
4. Run `git bisect bad {badCommit}`
5. Run `git bisect next` to get first commit to test
6. Return commit info (hash, message, date)

### Step 3.2: Mark Commit

**What happens:**
1. User marks current commit as "good" or "bad"
2. Run `git bisect good` or `git bisect bad`
3. Run `git bisect next` to get next commit
4. Repeat until bisect completes
5. Return first bad commit when done

### Step 3.3: Get Status

**What happens:**
1. Check if bisect is active
2. Get current commit being tested
3. Return status (active, complete, current commit, first bad commit)

**Key Concepts:**
- **Git Bisect State:** Git stores bisect state in `.git/BISECT_*` files
- **Binary Search:** Each step eliminates half the commits
- **Commit Info:** Use `git log` to get commit details

---

## Step 4: Dev Server Management

### Goal

Start a dev server for the repository at the current commit so users can test it.

### The Challenge

Every repository is different:
- Different frameworks (Next.js, Vite, React)
- Different package managers (npm, pnpm, yarn)
- Different structures (monorepo, frontend/backend, nested)
- Different dependencies needed

### Step 4.1: Detect Application Type

**What we need to detect:**
- Framework: Next.js, Vite, React, etc.
- Package manager: npm, pnpm, yarn
- App directory: root, frontend/, client/, etc.

**Detection Strategy:**
1. Search common directories for `package.json`
2. Check dependencies to identify framework
3. Check lock files to identify package manager

### Step 4.2: Install Dependencies

**What we need to do:**
1. Find all `package.json` files (monorepos!)
2. Detect package manager for each
3. Install dependencies: `npm/pnpm/yarn install`
4. Run post-install scripts (e.g., `prisma generate`)

**Key Challenges:**
- Monorepos have multiple packages
- Different package managers per package
- Native modules need rebuilding
- Prisma needs client generation

### Step 4.3: Start Dev Server

**What we need to do:**
1. Find free port (avoid 3000 - main app)
2. Determine dev command (`npm run dev`, `npx next dev`, etc.)
3. Set PORT environment variable
4. Start process
5. Wait for server to be ready
6. Return port and URL

**Key Challenges:**
- PORT in .env files might override our setting
- Dev scripts might have hardcoded ports
- Need to detect when server is ready
- Handle different frameworks differently

### Step 4.4: Proxy Requests

**What we need:**
- Proxy all requests to the dev server
- Handle WebSocket upgrades (for HMR)
- Forward headers and body
- Support all HTTP methods

---

## Step 5: Frontend UI

### Goal

Build a user-friendly interface for the bisect process.

### Step 5.1: Home Page

**What to show:**
- Welcome message
- Link to start bisect
- Brief explanation

### Step 5.2: Bisect Page

**What to show:**
1. **Repository Setup:**
   - Input for Git URL or local path
   - Button to setup repository

2. **Start Bisect:**
   - Input for good commit hash
   - Input for bad commit hash
   - Button to start

3. **Test Commit:**
   - Show current commit info
   - Button to start dev server
   - Button to mark as "Works"
   - Button to mark as "Doesn't Work"

4. **Results:**
   - Show first bad commit
   - Commit hash, message, date
   - Button to start new bisect

### Step 5.3: Real-time Updates

**What we need:**
- Poll `/api/bisect/status` every 2 seconds
- Update UI when status changes
- Show loading states
- Handle errors gracefully

---

## Step 6: Putting It All Together

### Complete Flow

```
1. User enters repository URL/path
   └─► POST /api/repo
       └─► Clone/copy repo
       └─► Return repoId

2. User enters good/bad commits
   └─► POST /api/bisect/start
       └─► git bisect start
       └─► git bisect good/bad
       └─► git bisect next
       └─► Return current commit

3. User clicks "Start Dev Server"
   └─► POST /api/dev-server/start
       └─► Detect app type
       └─► Install dependencies
       └─► Start dev server
       └─► Return port/URL

4. User tests app in browser
   └─► Open proxied URL
   └─► Test functionality

5. User marks commit
   └─► POST /api/bisect/mark
       └─► git bisect good/bad
       └─► git bisect next
       └─► Return next commit or completion

6. Repeat steps 3-5 until done
   └─► Show first bad commit
```

---

## Implementation Order

### Phase 1: Basic Repository Setup
1. Create `/api/repo` route
2. Test cloning a repository
3. Test copying from local path
4. Add error handling

### Phase 2: Basic Git Bisect
1. Create `/api/bisect/start` route
2. Create `/api/bisect/mark` route
3. Create `/api/bisect/status` route
4. Test bisect operations

### Phase 3: Basic Frontend
1. Create `/bisect` page
2. Add repository setup form
3. Add bisect start form
4. Add commit testing UI
5. Add status polling

### Phase 4: Dev Server (Simple)
1. Detect app type (basic)
2. Install dependencies (root only)
3. Start dev server (simple command)
4. Basic port management

### Phase 5: Dev Server (Advanced)
1. Handle multiple packages
2. Detect package managers
3. Run post-install scripts
4. Better port management
5. Handle edge cases

### Phase 6: Polish
1. Error handling
2. Loading states
3. Better UI/UX
4. Documentation

---

## Key Files We'll Create

### API Routes
- `app/api/repo/route.ts` - Repository management
- `app/api/bisect/start/route.ts` - Start bisect
- `app/api/bisect/mark/route.ts` - Mark commit
- `app/api/bisect/status/route.ts` - Get status
- `app/api/dev-server/start/route.ts` - Start dev server
- `app/api/dev-server/proxy/[...path]/route.ts` - Proxy requests

### Library Functions
- `lib/git-operations.ts` - Git bisect operations
- `lib/repository-manager.ts` - Repository setup/cleanup
- `lib/dev-server-manager.ts` - Dev server lifecycle
- `lib/app-detector.ts` - Detect app type and structure

### Frontend
- `app/bisect/page.tsx` - Main bisect interface
- `app/components/CommitCard.tsx` - Display commit info
- `app/components/DevServerControls.tsx` - Dev server UI

---

## Ready to Start?

Let's begin with **Step 1: Basic Setup** - creating the repository management API.

Would you like me to:
1. Start implementing Step 1 (Repository Management)?
2. Explain any concept in more detail first?
3. Show you the complete architecture before we start?

Let me know where you'd like to begin!

