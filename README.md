# Git Bisect Tool

A Next.js web application that performs git bisect operations to find the commit that introduced a bug. Users can upload or clone a repository, provide two commit hashes (one that works and one with the bug), and interactively guide the binary search process.

## Features

- **Repository Setup**: Clone from URL or use a local repository path
- **Interactive Bisect**: Binary search through commits to find the first bad commit
- **User-Friendly UI**: Simple interface with "Works" and "Doesn't Work" buttons
- **Real-time Status**: Automatic status updates during the bisect process
- **Commit Information**: View commit hash, message, and date for each test commit

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Git installed on the system

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Setup Repository**:
   - Choose to clone from URL or use a local path
   - Enter the repository URL (e.g., `https://github.com/user/repo.git`) or local path
   - Click "Setup Repository"

2. **Start Bisect**:
   - Enter the hash of a "good" commit (one that works)
   - Enter the hash of a "bad" commit (one with the bug)
   - Click "Start Bisect"

3. **Test Commits**:
   - The app will show you a commit to test
   - Click "✓ Works" if the commit works correctly
   - Click "✗ Doesn't Work" if the commit has the bug
   - Repeat until the first bad commit is found

4. **View Results**:
   - Once the bisect is complete, the first bad commit will be displayed
   - You can see the commit hash, message, and date

## API Routes

- `POST /api/repo` - Setup repository (clone or copy)
- `DELETE /api/repo?repoId=...` - Clean up repository
- `POST /api/bisect/start` - Start bisect process
- `POST /api/bisect/mark` - Mark commit as good or bad
- `GET /api/bisect/status?repoId=...` - Get current bisect status

## Technical Details

- Built with Next.js 16 (App Router)
- TypeScript for type safety
- Tailwind CSS for styling
- `simple-git` for git operations
- Repositories are stored in `.repos/` directory (gitignored)

## Notes

- Repositories are stored locally in the `.repos` directory
- Each repository gets a unique ID for session management
- The bisect process uses git's native bisect functionality
- Make sure you have sufficient disk space for cloned repositories
# Bisect
