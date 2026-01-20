# Bisect
<img width="961" height="458" alt="Screenshot 2026-01-12 at 1 49 17 AM" src="https://github.com/user-attachments/assets/466cc819-920a-43df-ac05-4486fa64b149" />

## Table of Contents

- [Introduction](#introduction)
- [How to use](#how-to-use)
- [Endpoints](#Endpoints)

## Introduction

**Bisect** is a interactive tool to identify and fix the commit that introduced a bug.

*Suppose I'm working on a large codebase with 12 other developers. I suddenly notice we no longer recieve any loggings, which previously was working. 
Now, I need to identify which commit our team pushed caused the bug, then create a fix.*

Bisect simplifies this two-step process immensely.

It can either:
1) Binary search to a specific commit and launch the user's app, allowing them to test the commit in real-time.
2) An AI agent will get context of the bug, then linearly scan through each commit's added source code to calculate the likelihood of the commit causing the bug

Then proceed by creating a **pull request** with the fix.

## How to use
Check out the website which includes a live-demo video as well as documentation.

## Endpoints 
#### Backend Endpoints (written and concised by me)

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
// /api/bisect/analyze/route.ts
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

Creates a pull request for the fix through AI
```ts
// /api/bisect/fix/route.ts
You are analyzing a git commit to determine if it might have caused a bug.
export async function POST(request: NextRequest) {
   const { epoId, commitHash, issueDescription, branchName } = body;
   const git = simpleGit(repoId);
   const commitLog = await git.log({ from: commitHash, to: commitHash, maxCount: 1 });
   const commitMessage = commitLog.latest?.message;
   const parentHash = await git.raw(['rev-parse', `${commitHash}^`]).then(r => r.trim()).catch(() => null);
   const commitDiff = parentHash 
      ? await git.diff([parentHash, commitHash])
      : await git.show([commitHash]);
   const prompt = `You are a code expert fixing a bug. A commit introduced a bug, and you need to generate a fix.
   ISSUE DESCRIPTION:
   ${issueDescription}
   
   BUG-INTRODUCING COMMIT:
   - Hash: ${commitHash.substring(0, 7)}
   - Message: ${commitMessage}
   - Files Changed: ${filesChanged.join(', ')}

   Your task:
   1. Analyze the code changes that introduced the bug
   2. Understand what the bug is based on the issue description
   3. Generate a fix that corrects the bug

   Respond in JSON format with the following structure:
   {
     "fixes": [
       {
         "file": "<relative file path from repo root>",
         "content": "<complete fixed file content>",
         "explanation": "<brief explanation of what was fixed>"
       }
     ],
     "summary": "<overall summary of the fix>"
   }
   '
   const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a code expert specializing in bug fixes. Analyze bug-introducing commits and generate complete, correct fixes. Always respond with valid JSON containing complete file contents.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
   const responseContent = completion.choices[0]?.message?.content || '{}';
   const fixData = JSON.parse(responseContent);
   const fixBranchName = branchName || `fix/bug-${commitHash.substring(0, 7)}`;
   await git.checkout([parentHash]);
   await git.checkout(['-b', fixBranchName]);
   const appliedFixes = [];
   for (const fix of fixData.fixed) {
      const filePath = path.join(repoDir, fix.file);
      await fs.writeFile(filePath, fix.content, 'utf8');
      appliedFixes.push({
          file: fix.file,
          explanation: fix.explanation,
        });
   }

   await git.add(['.']);
   const fixCommitMessage = `Fix: ${fixData.summary || 'Fix bug introduced in commit ' + commitHash.substring(0, 7)}\n\nFixes bug introduced in commit ${commitHash}\nIssue: ${issueDescription}`;
   await git.commit(fixCommitMessage);
   await git.push(['origin', fixBranchName, '--set-upstream']);
   return NextResponse.json({
      success: true,
      branchName: fixBranchName,
      commitHash: fixCommitHash,
      fixes: appliedFixes,
      summary: fixData.summary,
      message: prUrl 
        ? `Fix created and PR opened: ${prUrl}`
        : remoteUrl
        ? `Fix created in branch ${fixBranchName}. Branch pushed to remote.`
        : `Fix created in branch ${fixBranchName}`,
      remoteUrl,
    });
}
```


