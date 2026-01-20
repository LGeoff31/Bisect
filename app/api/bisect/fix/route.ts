import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId, commitHash, issueDescription, branchName } = body;

    if (!repoId || !commitHash || !issueDescription) {
      return NextResponse.json(
        { error: 'Must provide repoId, commitHash, and issueDescription' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const baseDir = process.env.REPOS_BASE_DIR || '/tmp';
    const repoDir = path.join(baseDir, '.repos', repoId);
    
    try {
      await fs.access(repoDir);
    } catch {
      return NextResponse.json(
        { error: `Repository not found: ${repoId}` },
        { status: 404 }
      );
    }

    const git: SimpleGit = simpleGit(repoDir);

    // Verify commit exists
    try {
      await git.show([commitHash]);
    } catch {
      return NextResponse.json(
        { error: `Commit not found: ${commitHash}` },
        { status: 400 }
      );
    }

    // Get the commit details
    const commitInfo = await git.show([commitHash]);
    const commitLog = await git.log({ from: commitHash, to: commitHash, maxCount: 1 });
    const commitMessage = commitLog.latest?.message || 'Unknown commit';

    // Get the diff of the bug-introducing commit
    const parentHash = await git.raw(['rev-parse', `${commitHash}^`]).then(r => r.trim()).catch(() => null);
    const commitDiff = parentHash 
      ? await git.diff([parentHash, commitHash])
      : await git.show([commitHash]);

    // Get list of files changed
    const diffStat = await git.show([commitHash, '--stat']);
    const filesChanged = diffStat
      .split('\n')
      .filter(line => line.includes('|'))
      .map(line => {
        const match = line.match(/^(.+?)\s+\|/);
        return match ? match[1].trim() : '';
      })
      .filter(Boolean);

    // Get current branch to return to later
    const currentBranch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();

    // Use AI to generate the fix
    const prompt = `You are a code expert fixing a bug. A commit introduced a bug, and you need to generate a fix.

ISSUE DESCRIPTION:
${issueDescription}

BUG-INTRODUCING COMMIT:
- Hash: ${commitHash.substring(0, 7)}
- Message: ${commitMessage}
- Files Changed: ${filesChanged.join(', ')}

CODE CHANGES THAT INTRODUCED THE BUG (diff):
\`\`\`
${commitDiff.substring(0, 12000)}
\`\`\`

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

IMPORTANT:
- Provide the COMPLETE file content for each file that needs to be fixed
- Only include files that actually need changes
- Make sure the fix addresses the root cause of the bug
- Preserve code style and formatting
- If multiple files need changes, include all of them`;

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

    if (!fixData.fixes || !Array.isArray(fixData.fixes) || fixData.fixes.length === 0) {
      return NextResponse.json(
        { error: 'AI did not generate any fixes' },
        { status: 500 }
      );
    }

    // Checkout the commit before the bug was introduced (parent)
    if (!parentHash) {
      return NextResponse.json(
        { error: 'Cannot create fix: commit has no parent (root commit)' },
        { status: 400 }
      );
    }

    // Create a new branch for the fix
    const fixBranchName = branchName || `fix/bug-${commitHash.substring(0, 7)}`;
    
    // Checkout parent commit and create branch
    await git.checkout([parentHash]);
    
    // Check if branch already exists
    try {
      await git.checkout(['-b', fixBranchName]);
    } catch {
      // Branch might exist, try to delete and recreate
      try {
        await git.checkout([currentBranch]);
        await git.branch(['-D', fixBranchName]);
        await git.checkout([parentHash]);
        await git.checkout(['-b', fixBranchName]);
      } catch {
        // If still fails, use existing branch
        await git.checkout([fixBranchName]);
      }
    }

    // Apply fixes to files
    const appliedFixes = [];
    for (const fix of fixData.fixes) {
      const filePath = path.join(repoDir, fix.file);
      
      try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // Write the fixed content
        await fs.writeFile(filePath, fix.content, 'utf8');
        appliedFixes.push({
          file: fix.file,
          explanation: fix.explanation,
        });
      } catch (error: any) {
        console.error(`Error applying fix to ${fix.file}:`, error);
        // Continue with other files
      }
    }

    if (appliedFixes.length === 0) {
      // Restore original branch
      await git.checkout([currentBranch]);
      return NextResponse.json(
        { error: 'Failed to apply any fixes' },
        { status: 500 }
      );
    }

    // Stage all changes
    await git.add(['.']);

    // Commit the fix
    const fixCommitMessage = `Fix: ${fixData.summary || 'Fix bug introduced in commit ' + commitHash.substring(0, 7)}\n\nFixes bug introduced in commit ${commitHash}\nIssue: ${issueDescription}`;
    await git.commit(fixCommitMessage);

    // Get the new commit hash
    const fixCommitHash = (await git.revparse(['HEAD'])).trim();

    // Get remote URL and push branch
    let remoteUrl: string | null = null;
    let prUrl: string | null = null;
    let prNumber: number | null = null;

    try {
      // Get remote URL
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      remoteUrl = origin?.refs?.push || origin?.refs?.fetch || null;

      if (remoteUrl) {
        // Push the branch to remote
        try {
          await git.push(['origin', fixBranchName, '--set-upstream']);
          console.log(`[Bisect Fix] Pushed branch ${fixBranchName} to remote`);
        } catch (pushError: any) {
          console.error(`[Bisect Fix] Error pushing branch:`, pushError);
          // Continue even if push fails
        }

        // Try to create a PR if GitHub token is available
        if (process.env.GITHUB_TOKEN && remoteUrl.includes('github.com')) {
          try {
            // Parse GitHub repo from URL
            // Supports: https://github.com/owner/repo.git or git@github.com:owner/repo.git
            const githubMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
            if (githubMatch) {
              const owner = githubMatch[1];
              const repo = githubMatch[2].replace(/\.git$/, '');
              
              // Get default branch (usually main or master)
              let defaultBranch = 'main';
              try {
                const branches = await git.branchLocal();
                defaultBranch = branches.current || 'main';
                // If we're on a different branch, try to find main/master
                if (defaultBranch !== 'main' && defaultBranch !== 'master') {
                  const allBranches = branches.all;
                  if (allBranches.includes('main')) {
                    defaultBranch = 'main';
                  } else if (allBranches.includes('master')) {
                    defaultBranch = 'master';
                  }
                }
              } catch {
                // Use default
              }

              // Create PR using GitHub API
              const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
                method: 'POST',
                headers: {
                  'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title: `Fix: ${fixData.summary || 'Fix bug introduced in commit ' + commitHash.substring(0, 7)}`,
                  head: fixBranchName,
                  base: defaultBranch,
                  body: `## Fix Summary\n\n${fixData.summary || 'Fix for bug introduced in commit ' + commitHash.substring(0, 7)}\n\n## Issue\n\n${issueDescription}\n\n## Files Changed\n\n${appliedFixes.map((f: any) => `- \`${f.file}\`: ${f.explanation}`).join('\n')}\n\n## Bug-Introducing Commit\n\n\`${commitHash}\`\n\nThis PR was automatically generated by the bisect tool.`,
                }),
              });

              if (prResponse.ok) {
                const prData = await prResponse.json();
                prUrl = prData.html_url;
                prNumber = prData.number;
                console.log(`[Bisect Fix] Created PR #${prNumber}: ${prUrl}`);
              } else {
                const errorData = await prResponse.text();
                console.error(`[Bisect Fix] Failed to create PR:`, errorData);
              }
            }
          } catch (prError: any) {
            console.error(`[Bisect Fix] Error creating PR:`, prError);
            // Continue even if PR creation fails
          }
        }
      }
    } catch (remoteError: any) {
      console.error(`[Bisect Fix] Error getting remote info:`, remoteError);
      // Continue even if we can't get remote info
    }

    // Return to original branch
    await git.checkout([currentBranch]);

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
      prUrl,
      prNumber,
      remoteUrl,
    });
  } catch (error: any) {
    console.error('[Bisect Fix] Error:', error);
    return NextResponse.json(
      { error: `Failed to create fix: ${error.message}` },
      { status: 500 }
    );
  }
}

