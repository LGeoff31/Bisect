# Bisect

<img width="1919" height="902" alt="image" src="https://github.com/user-attachments/assets/c84e0d6d-cf5b-4a88-a224-c6ab9168b89e" />

## Table of Contents

- [Introduction](#introduction)
- [How to use](#how-to-use)
- [Architecture](#architecture)
- [Building process](#building-process)




## Backend endpoints (written by me and concised for demonstration)

Clones their github repo into a ```.repos/{repoId}``` directory.
```ts
// /api/repo/route.ts
export async function POST(request: NextRequest) {
   const {repoUrl, repoPath} = await request.json();
   const repoId = uuidv4();
   const repoDir = path.join(process.cwd(), ".repos");
   await fs.mkdir(repoDir, {recursive: true});

   const git = simpleGit();
   await git.clone(repoUrl, repoDir);

   return NextResponse.json({
      repoId,
      repoDir: path.relative(process.cwd(), repoDir),
      message: "Repository read"
   })
}
```

Retrieves the good and bad commit hash, and returns the half-way commit to test.
```ts
// /api/start/route.ts
export async function POST(request: NextRequest) {
   const {repoId, goodCommit, badCommit} = await request.json();
   const repoDir = path.join(process.cwd(), ".repos", repoId);
   const git = simpleGit(repoDir);

   await git.raw(['bisect', 'start']);
   await git.raw(['bisect', 'good', goodCommit]);
   await git.raw(['bisect', 'good', badCommit]);

   const currentCommitHash = await git.revparse(['HEAD']).trim();
   const currentCommit = await git.log({maxCount: 1}).latest;

   return NextResponse.json({
      currentCommit: currentCommitHash,
      commitMessage: currentCommit.message;
      commitDate: currentCommit.date,
   })
}
```

Simulates marking the current commit as either good or bad, to continue the binary search process
```ts
// /api/mark/route.ts
export async function POST(request: NextRequest) {
   const {repoId, status} = await request.json();
   const git = simpleGit(repoDir);

   await git.raw(['bisect', status]);
   const bisectLog = git.raw(['bisect', 'log']);
   const isComplete = bisectLog.includes('first bad commit');

   if (isComplete) {
   const lines = bisectLog.split('\n');
      const firstBadLine = lines.find(line => line.includes('first bad commit');
      const match = firstBadLine.match(/\[([a-f0-9)]+)\]/);
      const firstBadCommit = match[1]; 
   }

   return NextResponse.json({
      complete: isComplete,
      firstBadCommit: firstBadCommit
    });
}
```
