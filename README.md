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

Launch their app on an available port, checked out at the specific commit.
```ts
// /api/bisect/launch/route.ts
export function findFreePort(startPort: number, endPort: number): Promise<number> {
   for (let port = startPort; port <= endPort; port++) {
      const isFree = await new Promise<boolean>((resolve) => {
         server.listen(port, () => {
            server.once('close'), () => resolve(true);
            server.close();
         });
      };
      if (isFree) return port;
   throw new Error("No free port");
}
export async function POST(request: NextRequest) {
   const { repoId, commitHash } = body;
   const git = simpleGit(repoId);
   await git.checkout([commitHash]);
   const packageJsonPath = path.join(repoDir, 'package.json');
   const installCommand = packageManager === 'pnpm' ? 'pnpm' : packageManager === 'yarn' ? 'yarn' : 'npm';
   const installArgs = packageManager === 'pnpm' ? ['install'] : packageManager === 'yarn' ? ['install'] : ['install'];
   // INSTALL all dependencies
   const installProcess = spawn(installCommand, installArgs, {
      cwd: repoDir,
      stdio: 'pipe',
      shell: true,
    });
   cont port = await findFreePort(3001, 3100);
   command = 'npm';
   args = ['run', 'dev'];
   const child = spawn(command, args, {
      cwd: repoDir,
      env,
      stdio: 'pipe',
      shell: true,
    });
   return NextResponse.json({
      port,
      url: `http://localhost:${port}`,
      proxyUrl: `/api/dev-server/proxy/${repoId}`,
      message: 'Dev server starting...',
    });
}
```

Runs the source code of each commit through AI to detect likelyhood of it introducing the issue.
```ts
// /api/bisect/launch/route.ts
You are analyzing a git commit to determine if it might have caused a bug.
export async function POST(request: NextRequest) {
   const { repoId, issueDescription, goodCommit, badCommit } = body;
   const git = simpleGit(repoId);
   const logs = await git.log({from: goodCommit, to: badCommit});
   const commits = logs.all;
   const analyses: CommitAnalysis[] = [];

   for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      const diff = git.show([commit.hash]);
      CONST prompt = ```You are analyzing a git commit to determine if it might have caused a bug.

      ISSUE DESCRIPTION:
      ${issueDescription}

      COMMIT INFORMATION:
      - Hash: ${commit.hash.substring(0, 7)}
      - Message: ${commit.message}
      - Date: ${commit.date}
      - Files Changed: ${filesChanged.join(', ')}

      Analyze whether this commit's changes could have caused the issue described above.
      Respond in JSON format:
      {
        "likelihood": <number between 0-100, where 0 = definitely not, 100 = definitely yes>,
        "reasoning": "<brief explanation of why this commit might or might not cause the issue>"
      }`;

      const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a code analysis expert. Analyze git commits to determine if they could cause bugs. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        });
      const responseContent = completion.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(responseContent);
      analyses.push({
          commitHash: commit.hash,
          commitMessage: commit.message,
          commitDate: commit.date,
          likelihood: analysis.likelihood || 0,
          reasoning: analysis.reasoning || 'No reasoning provided',
          filesChanged,
        });
   }
   analyses.sort((a, b) => b.likelihood - a.likelihood);
   return NextResponse.json({
         analyses,
         totalCommits: commits.length,
       });
}
```

