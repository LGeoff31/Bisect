import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CommitAnalysis {
  commitHash: string;
  commitMessage: string;
  commitDate: string;
  likelihood: number;
  reasoning: string;
  filesChanged: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoId, issueDescription, goodCommit, badCommit } = body;

    if (!repoId || !issueDescription || !goodCommit || !badCommit) {
      return NextResponse.json(
        { error: 'Must provide repoId, issueDescription, goodCommit, and badCommit' },
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

    try {
      await git.show([goodCommit]);
      await git.show([badCommit]);
    } catch {
      return NextResponse.json(
        { error: 'One or both commits not found' },
        { status: 400 }
      );
    }

    const log = await git.log({
      from: goodCommit,
      to: badCommit,
    });

    if (!log.all || log.all.length === 0) {
      return NextResponse.json(
        { error: 'No commits found between good and bad commit' },
        { status: 400 }
      );
    }

    const commits = log.all;
    const analyses: CommitAnalysis[] = [];

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      
      try {
        const diff = await git.show([commit.hash, '--stat']);
        const fullDiff = await git.show([commit.hash]);
        
        const filesChanged = diff
          .split('\n')
          .filter(line => line.includes('|'))
          .map(line => {
            const match = line.match(/^(.+?)\s+\|/);
            return match ? match[1].trim() : '';
          })
          .filter(Boolean);

        const parentHash = await git.raw(['rev-parse', `${commit.hash}^`]).then(r => r.trim()).catch(() => null);
        const commitDiff = parentHash 
          ? await git.diff([parentHash, commit.hash])
          : await git.show([commit.hash]);

        const prompt = `You are analyzing a git commit to determine if it might have caused a bug.

ISSUE DESCRIPTION:
${issueDescription}

COMMIT INFORMATION:
- Hash: ${commit.hash.substring(0, 7)}
- Message: ${commit.message}
- Date: ${commit.date}
- Files Changed: ${filesChanged.join(', ')}

CODE CHANGES (diff):
\`\`\`
${commitDiff.substring(0, 8000)}
\`\`\`

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
      } catch (error: any) {
        console.error(`Error analyzing commit ${commit.hash}:`, error);
        analyses.push({
          commitHash: commit.hash,
          commitMessage: commit.message,
          commitDate: commit.date,
          likelihood: 0,
          reasoning: `Error analyzing: ${error.message}`,
          filesChanged: [],
        });
      }
    }

    analyses.sort((a, b) => b.likelihood - a.likelihood);

    return NextResponse.json({
      analyses,
      totalCommits: commits.length,
    });
  } catch (error: any) {
    console.error('[Bisect Analyze] Error:', error);
    return NextResponse.json(
      { error: `Failed to analyze: ${error.message}` },
      { status: 500 }
    );
  }
}


