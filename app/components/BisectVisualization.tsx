'use client';

interface Props {
  goodCommits: string[];
  badCommits: string[];
  currentCommit: string | null;
  allCommits: Array<{ hash: string; message: string; date: string }>;
  initialGoodCommit: string | null;
  initialBadCommit: string | null;
  firstBadCommit: string | null;
  complete: boolean;
}

export default function BisectVisualization({ 
  goodCommits, 
  badCommits, 
  currentCommit,
  allCommits,
  initialGoodCommit,
  initialBadCommit,
  firstBadCommit,
  complete,
}: Props) {
  const originalGoodIndex = initialGoodCommit 
    ? allCommits.findIndex(c => {
        return c.hash === initialGoodCommit || 
               c.hash.toLowerCase() === initialGoodCommit.toLowerCase() ||
               c.hash.startsWith(initialGoodCommit) || 
               initialGoodCommit.startsWith(c.hash);
      })
    : -1;
  const originalBadIndex = initialBadCommit
    ? allCommits.findIndex(c => {
        return c.hash === initialBadCommit || 
               c.hash.toLowerCase() === initialBadCommit.toLowerCase() ||
               c.hash.startsWith(initialBadCommit) || 
               initialBadCommit.startsWith(c.hash);
      })
    : -1;

  // Calculate current narrowing range (between most recent good and bad marks)
  // Find the latest (highest index) good commit
  const goodIndices = allCommits
    .map((c, i) => ({ hash: c.hash, index: i }))
    .filter(({ hash }) => goodCommits.some(gc => hash === gc || hash.startsWith(gc) || gc.startsWith(hash)) || hash === initialGoodCommit)
    .map(({ index }) => index);
  const latestGoodIndex = goodIndices.length > 0 ? Math.max(...goodIndices) : originalGoodIndex;

  // Find the earliest (lowest index) bad commit
  const badIndices = allCommits
    .map((c, i) => ({ hash: c.hash, index: i }))
    .filter(({ hash }) => badCommits.some(bc => hash === bc || hash.startsWith(bc) || bc.startsWith(hash)) || hash === initialBadCommit)
    .map(({ index }) => index);
  const earliestBadIndex = badIndices.length > 0 ? Math.min(...badIndices) : originalBadIndex;

  const reversedCommits = [...allCommits].reverse();
  
  const reversedLatestGoodIndex = latestGoodIndex !== -1 ? allCommits.length - 1 - latestGoodIndex : -1;
  const reversedEarliestBadIndex = earliestBadIndex !== -1 ? allCommits.length - 1 - earliestBadIndex : -1;

  const searchRange = allCommits.length > 0 && latestGoodIndex !== -1 && earliestBadIndex !== -1 && latestGoodIndex < earliestBadIndex
    ? { 
        start: reversedEarliestBadIndex,
        end: reversedLatestGoodIndex,
      }
    : null;

  const itemHeight = 76;

  const getCommitStatus = (commitHash: string, commitIndex: number): 'unknown' | 'good' | 'bad' | 'testing' => {
    const originalIndex = allCommits.length - 1 - commitIndex;
    const isInitialGood = commitHash === initialGoodCommit;
    const isInitialBad = commitHash === initialBadCommit;
    
    if (complete && commitHash === firstBadCommit) {
      return 'bad';
    }
    if (!complete && commitHash === currentCommit) {
      return 'testing';
    }
    
    const isInRange = searchRange && latestGoodIndex !== -1 && earliestBadIndex !== -1 && 
                      originalIndex >= latestGoodIndex && originalIndex <= earliestBadIndex;
    
    if (!isInRange) {
      return 'unknown';
    }
    
    if (isInitialGood || goodCommits.includes(commitHash)) {
      return 'good';
    }
    if (isInitialBad || badCommits.includes(commitHash)) {
      return 'bad';
    }
    return 'unknown';
  };

  const getCommitColor = (status: 'unknown' | 'good' | 'bad' | 'testing', isFirstBad: boolean) => {
    if (status === 'good') return 'bg-emerald-500 dark:bg-emerald-600';
    if (status === 'bad') {
      return isFirstBad 
        ? 'bg-rose-500 dark:bg-rose-600' 
        : 'bg-red-500 dark:bg-red-600';
    }
    if (status === 'testing') return 'bg-amber-400 dark:bg-amber-500';
    return 'bg-gray-300 dark:bg-gray-700';
  };

  const getCommitShadow = (status: 'unknown' | 'good' | 'bad' | 'testing', isFirstBad: boolean) => {
    if (status === 'good') {
      return 'shadow-lg shadow-emerald-500/50 dark:shadow-emerald-600/50';
    }
    if (status === 'bad') {
      return isFirstBad
        ? 'shadow-lg shadow-rose-500/50 dark:shadow-rose-600/50'
        : 'shadow-lg shadow-red-500/50 dark:shadow-red-600/50';
    }
    if (status === 'testing') {
      return 'shadow-md shadow-amber-400/30 dark:shadow-amber-500/30';
    }
    return 'shadow-sm';
  };

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        <div className="relative py-6">
          {searchRange && (
            <div 
              className="absolute left-0 right-0 transition-all duration-700 ease-out rounded-lg border border-blue-200/50 dark:border-blue-800/30 z-0"
              style={{
                top: `${24 + searchRange.start * itemHeight}px`,
                height: `${(searchRange.end - searchRange.start) * itemHeight + 56}px`,
                background: 'linear-gradient(to right, rgba(59, 130, 246, 0.08), rgba(147, 51, 234, 0.06), rgba(59, 130, 246, 0.08))',
              }}
            />
          )}

          <div className="relative flex flex-col gap-5">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            
            {reversedCommits.map((commit, index) => {
              const status = getCommitStatus(commit.hash, index);
              const isFirstBad = complete && commit.hash === firstBadCommit;
              const isCurrent = !complete && commit.hash === currentCommit;

              return (
                <div
                  key={commit.hash}
                  className="relative flex items-center gap-5 z-10 group"
                >
                  <div className="relative z-20">
                    <div
                      className={`relative w-14 h-14 ${getCommitColor(status, isFirstBad)} ${getCommitShadow(status, isFirstBad)} rounded-full transition-all duration-300 ease-out flex items-center justify-center text-white font-semibold transform ring-2 ring-white/20 dark:ring-gray-800/30 ${
                        status === 'testing' ? 'opacity-80 animate-pulse' : 'opacity-100'
                      }`}
                    >
                      {status === 'good' && (
                        <span className="text-lg">✓</span>
                      )}
                      {status === 'bad' && isFirstBad && (
                        <span className="text-xl font-bold">⚠</span>
                      )}
                      {status === 'bad' && !isFirstBad && (
                        <span className="text-lg">✗</span>
                      )}
                      {status === 'testing' && (
                        <span className="text-lg animate-spin">⟳</span>
                      )}
                      {status === 'unknown' && (
                        <div className="w-2 h-2 bg-white/60 rounded-full" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 z-20">
                    <div className={`text-sm font-mono tracking-wide transition-colors duration-300 ${
                      status === 'good' 
                        ? 'text-emerald-700 dark:text-emerald-400 font-medium' 
                        : status === 'bad'
                        ? 'text-red-700 dark:text-red-400 font-medium'
                        : status === 'testing'
                        ? 'text-amber-700 dark:text-amber-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {commit.hash.substring(0, 7)}
                      {status === 'bad' && isFirstBad && (
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded">
                          FIRST BAD COMMIT
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 line-clamp-2 ${
                      status === 'good' 
                        ? 'text-emerald-600 dark:text-emerald-500' 
                        : status === 'bad'
                        ? 'text-red-600 dark:text-red-500'
                        : status === 'testing'
                        ? 'text-amber-600 dark:text-amber-500'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {commit.message}
                    </p>
                  </div>

                  {isCurrent && (
                    <div className="absolute -left-2 -right-2 -top-2 -bottom-2 bg-gradient-to-r from-amber-100/40 via-amber-50/50 to-amber-100/40 dark:from-amber-950/20 dark:via-amber-900/30 dark:to-amber-950/20 rounded-lg z-0 border border-amber-200/50 dark:border-amber-800/30 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

