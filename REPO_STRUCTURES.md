# Repository Structure Handling Guide

Quick reference for how different repository structures are detected and handled.

## Detection Priority

### Frontend App Detection (Priority Order)
1. Root directory (`/`)
2. `frontend/`
3. `client/`
4. `app/`
5. `web/`
6. `ui/`
7. `src/`

### Framework Detection (Within Each Directory)
1. **Next.js:** `dependencies.next` or `devDependencies.next`
2. **Vite:** `dependencies.vite` or `devDependencies.vite`
3. **React:** `dependencies.react` or `dependencies['react-dom']`

---

## Repository Structure Examples

### 1. Simple Single-Package Repo ✅

```
my-app/
├── package.json          ← Detected here
├── src/
├── public/
└── next.config.js
```

**Handling:**
- App type: Next.js (detected from root)
- Install: `npm install` in root
- Dev server: `npx next dev -p 3001` in root

---

### 2. Frontend/Backend Split ✅

```
my-app/
├── frontend/
│   ├── package.json      ← Frontend detected here (priority 2)
│   ├── src/
│   └── next.config.js
├── backend/
│   ├── package.json      ← Backend dependencies installed
│   ├── src/
│   └── package-lock.json
└── README.md
```

**Handling:**
- App type: Next.js (detected in `frontend/`)
- Install: 
  - `npm install` in `frontend/`
  - `npm install` in `backend/`
- Dev server: `npx next dev -p 3001` in `frontend/`
- Backend: Dependencies installed but not started (future: start backend server)

---

### 3. Monorepo (Workspaces) ✅

```
my-monorepo/
├── package.json          ← Root workspace config
├── pnpm-workspace.yaml
├── packages/
│   ├── app/
│   │   ├── package.json  ← Frontend app (detected)
│   │   └── src/
│   ├── ui/
│   │   ├── package.json  ← UI package
│   │   └── src/
│   └── api/
│       ├── package.json  ← Backend API
│       └── src/
└── pnpm-lock.yaml
```

**Handling:**
- App type: Next.js (detected in `packages/app/`)
- Install:
  - `pnpm install` in root (workspace dependencies)
  - `pnpm install` in `packages/app/`
  - `pnpm install` in `packages/ui/`
  - `pnpm install` in `packages/api/`
- Dev server: `npx next dev -p 3001` in `packages/app/`
- Note: Workspace dependencies handled by root install

---

### 4. Nested Structure ✅

```
my-project/
├── apps/
│   ├── web/
│   │   ├── package.json  ← Frontend detected here
│   │   └── src/
│   └── mobile/
│       ├── package.json
│       └── src/
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   └── src/
│   └── utils/
│       ├── package.json
│       └── src/
└── package.json          ← Root (if exists)
```

**Handling:**
- App type: Detected in `apps/web/` (if Next.js/Vite/React)
- Install: All package.json directories found (up to 3 levels deep)
- Dev server: Started in `apps/web/`

---

### 5. Alternative Directory Names ✅

```
my-app/
├── client/               ← Alternative to "frontend"
│   ├── package.json      ← Detected here (priority 3)
│   └── src/
├── server/
│   ├── package.json
│   └── src/
└── README.md
```

**Handling:**
- App type: Detected in `client/` (priority 3)
- Install: Both `client/` and `server/`
- Dev server: Started in `client/`

---

### 6. Multiple Frontend Apps ⚠️

```
my-app/
├── admin/
│   ├── package.json      ← Next.js app
│   └── src/
├── public/
│   ├── package.json      ← Next.js app
│   └── src/
└── README.md
```

**Handling:**
- App type: First one found (alphabetical order: `admin/`)
- Install: Both apps
- Dev server: Started in `admin/`
- **Future:** UI to select which app to run

---

### 7. Root-Level App ✅

```
my-app/
├── package.json          ← Detected here (priority 1)
├── src/
├── app/
│   └── page.tsx
└── next.config.js
```

**Handling:**
- App type: Next.js (root)
- Install: Root only
- Dev server: `npx next dev -p 3001` in root

---

### 8. Backend-Only Repo ❌

```
my-api/
├── package.json          ← No frontend framework
├── src/
│   └── server.ts
└── tsconfig.json
```

**Handling:**
- App type: `unknown`
- Error: "Could not detect app type"
- **Future:** Add backend server support (Express, FastAPI, etc.)

---

### 9. Prisma in Different Location ✅

```
my-app/
├── frontend/
│   ├── package.json      ← @prisma/client here
│   └── src/
├── backend/
│   ├── package.json      ← prisma package here
│   └── prisma/
│       └── schema.prisma ← Schema here
└── README.md
```

**Handling:**
- Detect Prisma in `frontend/` dependencies
- Find schema in `backend/prisma/schema.prisma`
- Run: `npx prisma generate --schema ../backend/prisma/schema.prisma` in `frontend/`
- Or: Run in `backend/` if that's where client is used

---

### 10. Different Package Managers Per Package ✅

```
my-app/
├── frontend/
│   ├── package.json
│   └── pnpm-lock.yaml    ← pnpm
├── backend/
│   ├── package.json
│   └── yarn.lock         ← yarn
└── shared/
    ├── package.json
    └── package-lock.json  ← npm
```

**Handling:**
- Detect package manager per directory
- Install:
  - `pnpm install` in `frontend/`
  - `yarn install` in `backend/`
  - `npm install` in `shared/`

---

## Package Manager Detection Logic

### Priority Order:
1. `package.json.packageManager` field
   ```json
   {
     "packageManager": "pnpm@8.0.0"
   }
   ```
2. Lock file existence:
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → yarn
   - `package-lock.json` → npm
3. Default: npm

### Detection Per Directory:
Each directory with `package.json` is checked independently.

---

## Dependency Installation Flow

```
1. Find all package.json directories
   └─► findAllPackageJsonDirs(repoDir)
       └─► Recursive search (max depth 3)
           └─► Skip: node_modules, .git, .next, dist, build, .*

2. For each directory:
   ├─► Detect package manager
   ├─► Check if node_modules exists
   ├─► Install dependencies (if needed)
   │   └─► npm/pnpm/yarn install
   └─► Run post-install scripts
       ├─► Prisma generate (if detected)
       └─► postinstall script (if exists)

3. Install in parallel (Promise.allSettled)
   └─► Continue even if one fails
```

---

## Dev Server Command Selection

### Next.js
```typescript
// Always use npx directly (not npm run dev)
command = 'npx'
args = ['next', 'dev', '-p', port.toString()]

// Preserve NODE_OPTIONS if in original script
if (devScript.includes('NODE_OPTIONS')):
  env.NODE_OPTIONS = extract(devScript)
```

### Vite
```typescript
// Try npx vite first
command = 'npx'
args = ['vite', '--port', port.toString()]

// Or use npm run dev with PORT env var
command = 'npm'
args = ['run', 'dev']
env.PORT = port.toString()
env.VITE_PORT = port.toString()
```

### React (CRA)
```typescript
// Use npm start
command = 'npm'
args = ['start']
env.PORT = port.toString()
```

---

## Port Management Examples

### Scenario 1: PORT in .env file
```env
# frontend/.env
PORT=3000
```

**Handling:**
1. Load .env files
2. Remove PORT from env vars
3. Set PORT via `-p` flag: `npx next dev -p 3001`
4. Set PORT env var: `PORT=3001` (backup)

**Result:** Server runs on 3001 ✅

### Scenario 2: Dev script has PORT
```json
{
  "scripts": {
    "dev": "next dev -p 3000"
  }
}
```

**Handling:**
1. Don't use `npm run dev`
2. Use `npx next dev -p 3001` directly
3. Bypass script entirely

**Result:** Server runs on 3001 ✅

### Scenario 3: Multiple servers
- Main app: Port 3000
- Dev server 1: Port 3001
- Dev server 2: Port 3002
- Dev server 3: Port 3003

**Handling:**
- `findFreePort(3001, 3100)` finds next available
- Each server gets unique port

---

## Error Scenarios

### No package.json Found
```
Error: "Could not detect app type"
Suggestion: "Make sure repository has a package.json"
```

### Multiple Frontend Apps
```
Current: Uses first one found (alphabetical)
Future: UI to select which app
```

### Backend-Only Repo
```
Error: "Could not detect app type"
Future: Add backend server support
```

### Port Conflict
```
Current: Auto-find next port
Future: Better conflict resolution
```

---

## Testing Checklist

For each repo structure, test:
- [ ] Repository detection
- [ ] Package manager detection
- [ ] Dependency installation (all packages)
- [ ] Post-install scripts (Prisma, etc.)
- [ ] Dev server startup
- [ ] Port allocation
- [ ] Request proxying
- [ ] Cleanup on stop

---

## Common Issues & Solutions

### Issue: Dev server uses wrong port
**Solution:** Always use `npx next dev -p {port}` directly, remove PORT from .env

### Issue: Backend dependencies not installed
**Solution:** `findAllPackageJsonDirs()` finds all packages, installs all

### Issue: Prisma client not generated
**Solution:** Auto-detect Prisma, run `prisma generate` after install

### Issue: Workspace dependencies missing
**Solution:** Install root dependencies first, then packages

### Issue: Wrong package manager used
**Solution:** Detect per directory, use correct manager

