import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get('repoId');

    if (!repoId) {
      return NextResponse.json(
        { error: 'Must provide repoId query parameter' },
        { status: 400 }
      );
    }

    const baseDir = process.env.REPOS_BASE_DIR || '/tmp';
    const repoDir = path.join(baseDir, '.repos', repoId);
    
    // Check if repo exists
    try {
      await fs.access(repoDir);
    } catch {
      return NextResponse.json(
        { error: `Repository not found: ${repoId}` },
        { status: 404 }
      );
    }

    const git: SimpleGit = simpleGit(repoDir);

    // Check if bisect is active
    let active = false;
    let complete = false;
    let firstBadCommit: string | null = null;
    let initialGoodCommit: string | null = null;
    let initialBadCommit: string | null = null;
    let goodCommits: string[] = [];
    let badCommits: string[] = [];

    try {
      const bisectLog = await git.raw(['bisect', 'log']);
      if (bisectLog && bisectLog.trim() !== '') {
        active = true;
        complete = bisectLog.includes('first bad commit');
        
        const lines = bisectLog.split('\n');
        
        // Extract initial commits (only set once, from the first occurrence)
        for (const line of lines) {
          if (line.startsWith('# good:') && !initialGoodCommit) {
            const match = line.match(/\[([a-f0-9]+)\]/);
            if (match) initialGoodCommit = match[1];
          }
          if (line.startsWith('# bad:') && !initialBadCommit) {
            const match = line.match(/\[([a-f0-9]+)\]/);
            if (match) initialBadCommit = match[1];
          }
          if (line.startsWith('git bisect good')) {
            const match = line.match(/git bisect good\s+([a-f0-9]+)/);
            if (match && match[1] !== initialGoodCommit) {
              goodCommits.push(match[1]);
            }
          }
          if (line.startsWith('git bisect bad')) {
            const match = line.match(/git bisect bad\s+([a-f0-9]+)/);
            if (match && match[1] !== initialBadCommit) {
              badCommits.push(match[1]);
            }
          }
        }
        
        if (complete) {
          // Extract first bad commit from bisect log
          const firstBadLine = lines.find(line => line.includes('first bad commit'));
          if (firstBadLine) {
            const match = firstBadLine.match(/\[([a-f0-9]+)\]/);
            if (match) {
              firstBadCommit = match[1];
            }
          }
          try {
            await git.raw(['bisect', 'reset']);
            active = false;
          } catch (error) {
            console.error('[Bisect Status] Error resetting bisect:', error);
          }
        }
      }
    } catch {
      // No bisect session
      active = false;
    }


    let currentCommit: string | null = null;
    let commitMessage: string | null = null;
    let commitDate: string | null = null;
    let allCommits: Array<{ hash: string; message: string; date: string }> = [];
    
    // If complete, fetch first bad commit details
    if (complete && firstBadCommit) {
      try {
        const show = await git.raw(['show', '-s', '--format=%H|%s|%ai', firstBadCommit]);
        const parts = show.trim().split('|');
        if (parts.length >= 3) {
          currentCommit = parts[0].trim();
          commitMessage = parts[1].trim();
          commitDate = parts[2].trim();
        }
      } catch (error) {
        console.error('[Bisect Status] Error fetching first bad commit:', error);
      }
    }
    
    if (active && initialGoodCommit && initialBadCommit) {
      try {
        const currentCommitHash = (await git.revparse(['HEAD'])).trim();
        const log = await git.log({ maxCount: 1 });
        const latest = log.latest;

        if (latest) {
          currentCommit = currentCommitHash;
          commitMessage = latest.message;
          commitDate = latest.date;
        }

        // Get all commits in range (inclusive of both endpoints)
        try {
          const revList = await git.raw([
            'rev-list',
            '--reverse',
            `${initialGoodCommit}^..${initialBadCommit}`
          ]);
          console.log('revList geoff', revList);
          
          const commitHashes: string[] = [];
          if (revList) {
            const hashes = revList.trim().split('\n').filter(h => h.trim());
            commitHashes.push(...hashes);
          }
          
          // Add initial good commit (rev-list ^ excludes it)
          if (initialGoodCommit && !commitHashes.includes(initialGoodCommit)) {
            commitHashes.unshift(initialGoodCommit);
          }
          
          // Ensure initial bad commit is included
          if (initialBadCommit && !commitHashes.includes(initialBadCommit)) {
            commitHashes.push(initialBadCommit);
          }
          
          // Now fetch details for each commit
          for (const hash of commitHashes) {
            if (!hash.trim()) continue;
            
            try {
              const show = await git.raw(['show', '-s', '--format=%H|%s|%ai', hash.trim()]);
              const parts = show.trim().split('|');
              if (parts.length >= 3) {
                const commitHash = parts[0].trim();
                const message = parts[1].trim();
                const date = parts[2].trim();
                
                // Only add if not already present
                if (!allCommits.some(c => c.hash === commitHash)) {
                  allCommits.push({ hash: commitHash, message, date });
                }
              }
            } catch (err) {
              console.error(`[Bisect Status] Error fetching commit ${hash}:`, err);
            }
          }
        } catch (error) {
          console.error('[Bisect Status] Error getting commit range:', error);
        }
      } catch (error) {
        console.error('[Bisect Status] Error getting commit:', error);
      }
    }

    // Include initial commits in the arrays for easier visualization
    const allGoodCommits = initialGoodCommit 
      ? [initialGoodCommit, ...goodCommits]
      : goodCommits;
    const allBadCommits = initialBadCommit
      ? [initialBadCommit, ...badCommits]
      : badCommits;

    return NextResponse.json({
      active,
      complete,
      currentCommit,
      commitMessage,
      commitDate,
      firstBadCommit,
      goodCommits: allGoodCommits,
      badCommits: allBadCommits,
      initialGoodCommit,
      initialBadCommit,
      allCommits,
    });
  } catch (error: any) {
    console.error('[Bisect Status] Error:', error);
    return NextResponse.json(
      { error: `Failed to get bisect status: ${error.message}` },
      { status: 500 }
    );
  }
}

