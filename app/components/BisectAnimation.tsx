'use client';

import { useState, useEffect } from 'react';

interface Commit {
  id: number;
  hash: string;
  status: 'unknown' | 'good' | 'bad' | 'testing';
  isFirstBad: boolean;
  scale?: number;
  glow?: boolean;
}

export default function BisectAnimation() {
  const initializeCommits = () => {
    const hashes = [
      '12e23', '4f5a6', 'c7d89', '01234', '789ab',
      'ef012', '56789', 'cdef0', '34567', 'abcde'
    ];
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      hash: hashes[i],
      status: 'unknown' as const,
      isFirstBad: i === 6,
      scale: 1,
      glow: false,
    }));
  };

  // Initialize with commits so server and client render the same initially
  const [commits, setCommits] = useState<Commit[]>(initializeCommits);
  const [searchRange, setSearchRange] = useState<{ start: number; end: number } | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Start animation only after component is mounted (client-side)
  useEffect(() => {
    if (!mounted) return;
    
    let commits = initializeCommits();
    setCommits(commits);
    let stepIndex = 0;

    const steps = [
      () => {
        // Mark first as good and last as bad simultaneously (user provides both hashes)
        commits[0].status = 'good';
        commits[0].scale = 1.05;
        commits[0].glow = true;
        commits[9].status = 'bad';
        commits[9].scale = 1.05;
        commits[9].glow = true;
        setCommits([...commits]);
        setSearchRange({ start: 0, end: 9 });
        setTimeout(() => {
          commits[0].scale = 1;
          commits[0].glow = false;
          commits[9].scale = 1;
          commits[9].glow = false;
          setCommits([...commits]);
        }, 400);
      },
      () => {
        // Test middle with highlight
        setHighlightIndex(4);
        commits[4].status = 'testing';
        commits[4].scale = 1.05;
        setCommits([...commits]);
      },
      () => {
        // Mark middle as good
        setHighlightIndex(null);
        commits[4].status = 'good';
        commits[4].scale = 1.05;
        commits[4].glow = true;
        setCommits([...commits]);
        setTimeout(() => {
          commits[4].scale = 1;
          commits[4].glow = false;
          setCommits([...commits]);
        }, 400);
        setSearchRange({ start: 4, end: 9 });
      },
      () => {
        // Test between 4 and 9
        setHighlightIndex(6);
        commits[6].status = 'testing';
        commits[6].scale = 1.05;
        setCommits([...commits]);
      },
      () => {
        // Mark as bad (but not confirmed as first bad yet)
        setHighlightIndex(null);
        commits[6].status = 'bad';
        commits[6].isFirstBad = false; // Not confirmed yet
        commits[6].scale = 1.05;
        commits[6].glow = true;
        setCommits([...commits]);
        setTimeout(() => {
          commits[6].scale = 1;
          commits[6].glow = false;
          setCommits([...commits]);
        }, 400);
        setSearchRange({ start: 4, end: 6 });
      },
      () => {
        // Test between 4 and 6
        setHighlightIndex(5);
        commits[5].status = 'testing';
        commits[5].scale = 1.05;
        setCommits([...commits]);
      },
      () => {
        // Mark as good
        setHighlightIndex(null);
        commits[5].status = 'good';
        commits[5].scale = 1.05;
        commits[5].glow = true;
        setCommits([...commits]);
        setTimeout(() => {
          commits[5].scale = 1;
          commits[5].glow = false;
          setCommits([...commits]);
        }, 400);
        setSearchRange({ start: 5, end: 6 });
      },
      () => {
        // Found first bad - celebrate!
        commits[6].status = 'bad';
        commits[6].isFirstBad = true;
        commits[6].scale = 1.05;
        commits[6].glow = true;
        setCommits([...commits]);
        setSearchRange(null);
      },
      () => {
        // Reset with fade
        commits.forEach(c => {
          c.scale = 0.8;
          c.glow = false;
        });
        setCommits([...commits]);
        setTimeout(() => {
          commits = initializeCommits();
          setCommits(commits);
          setSearchRange(null);
          setHighlightIndex(null);
        }, 300);
      },
    ];

    const interval = setInterval(() => {
      steps[stepIndex]();
      stepIndex = (stepIndex + 1) % steps.length;
    }, 1800);

    return () => clearInterval(interval);
  }, [mounted]);

  const getCommitColor = (commit: Commit) => {
    if (commit.status === 'good') return 'bg-emerald-500 dark:bg-emerald-600';
    if (commit.status === 'bad') {
      return commit.isFirstBad 
        ? 'bg-rose-500 dark:bg-rose-600' 
        : 'bg-red-500 dark:bg-red-600';
    }
    if (commit.status === 'testing') return 'bg-amber-400 dark:bg-amber-500';
    return 'bg-gray-300 dark:bg-gray-700';
  };

  const getCommitShadow = (commit: Commit) => {
    if (commit.glow && commit.status === 'good') {
      return 'shadow-lg shadow-emerald-500/50 dark:shadow-emerald-600/50';
    }
    if (commit.glow && commit.status === 'bad') {
      return commit.isFirstBad
        ? 'shadow-lg shadow-rose-500/50 dark:shadow-rose-600/50'
        : 'shadow-lg shadow-red-500/50 dark:shadow-red-600/50';
    }
    if (commit.status === 'testing') {
      return 'shadow-md shadow-amber-400/30 dark:shadow-amber-500/30';
    }
    return 'shadow-sm';
  };

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        <div className="relative py-6">
          {/* Search range indicator with gradient */}
          {searchRange && (
            <div 
              className="absolute left-0 right-0 transition-all duration-700 ease-out rounded-lg border border-blue-200/50 dark:border-blue-800/30"
              style={{
                // py-6 = 24px top, h-14 = 56px circle, gap-5 = 20px between items
                // Each item: 56px circle + 20px gap = 76px spacing
                top: `${24 + searchRange.start * 76}px`,
                height: `${(searchRange.end - searchRange.start) * 76 + 56}px`,
                background: 'linear-gradient(to right, rgba(59, 130, 246, 0.08), rgba(147, 51, 234, 0.06), rgba(59, 130, 246, 0.08))',
              }}
            />
          )}

          {/* Commit timeline */}
          <div className="relative flex flex-col gap-5">
            {/* Connection line with gradient */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            
            {commits.map((commit, index) => (
              <div
                key={commit.id}
                className="relative flex items-center gap-5 z-10 group"
              >
                {/* Commit circle with enhanced styling */}
                <div className="relative z-20">
                  {/* Outer glow ring for important states */}
                  {commit.glow && (
                    <div 
                      className={`absolute inset-0 rounded-full animate-pulse ${
                        commit.status === 'good' 
                          ? 'bg-emerald-400/30 dark:bg-emerald-500/20' 
                          : 'bg-rose-400/30 dark:bg-rose-500/20'
                      }`}
                      style={{
                        transform: `scale(${(commit.scale || 1) * 1.3})`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  )}
                  
                  {/* Main commit circle */}
                  <div
                    className={`relative w-14 h-14 ${getCommitColor(commit)} ${getCommitShadow(commit)} rounded-full transition-all duration-300 ease-out flex items-center justify-center text-white font-semibold transform ring-2 ring-white/20 dark:ring-gray-800/30 ${
                      commit.status === 'testing' ? 'opacity-80 animate-pulse' : 'opacity-100'
                    }`}
                    style={{
                      transform: `scale(${commit.scale || 1})`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {commit.status === 'good' && (
                      <span className="text-lg">✓</span>
                    )}
                    {commit.status === 'bad' && commit.isFirstBad && (
                      <span className="text-xl font-bold">⚠</span>
                    )}
                    {commit.status === 'bad' && !commit.isFirstBad && (
                      <span className="text-lg">✗</span>
                    )}
                    {commit.status === 'testing' && (
                      <span className="text-lg animate-spin">⟳</span>
                    )}
                    {commit.status === 'unknown' && (
                      <div className="w-2 h-2 bg-white/60 rounded-full" />
                    )}
                  </div>
                </div>

                {/* Commit hash with better typography */}
                <div className="flex-1 z-20">
                  <div className={`text-sm font-mono tracking-wide transition-colors duration-300 ${
                    commit.status === 'good' 
                      ? 'text-emerald-700 dark:text-emerald-400 font-medium' 
                      : commit.status === 'bad'
                      ? 'text-red-700 dark:text-red-400 font-medium'
                      : commit.status === 'testing'
                      ? 'text-amber-700 dark:text-amber-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {commit.hash}
                    {commit.status === 'bad' && commit.isFirstBad && (
                      <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded">
                        FIRST BAD
                      </span>
                    )}
                  </div>
                </div>

                {/* Enhanced highlight indicator */}
                {highlightIndex === index && (
                  <div className="absolute -left-2 -right-2 -top-2 -bottom-2 bg-gradient-to-r from-amber-100/40 via-amber-50/50 to-amber-100/40 dark:from-amber-950/20 dark:via-amber-900/30 dark:to-amber-950/20 rounded-lg z-0 border border-amber-200/50 dark:border-amber-800/30 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
