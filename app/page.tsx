'use client';

import { useState, useEffect } from 'react';

interface BisectStatus {
  active: boolean;
  complete: boolean;
  currentCommit?: string;
  commitMessage?: string;
  commitDate?: string;
  firstBadCommit?: string;
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [goodCommit, setGoodCommit] = useState('');
  const [badCommit, setBadCommit] = useState('');
  const [repoId, setRepoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [bisectStatus, setBisectStatus] = useState<BisectStatus | null>(null);
  const [useUrl, setUseUrl] = useState(true);
  const [devServerRunning, setDevServerRunning] = useState(false);
  const [devServerUrl, setDevServerUrl] = useState<string | null>(null);
  const [devServerLoading, setDevServerLoading] = useState(false);
  const [envVars, setEnvVars] = useState('');
  const [showEnvInput, setShowEnvInput] = useState(false);

  // Check bisect status periodically
  useEffect(() => {
    if (repoId && !bisectStatus?.complete) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/bisect/status?repoId=${repoId}`);
          if (response.ok) {
            const status = await response.json();
            setBisectStatus(status);
          }
        } catch (err) {
          console.error('Failed to check bisect status:', err);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [repoId, bisectStatus]);

  const handleSetupRepo = async () => {
    setLoading(true);
    setError(null);
    setErrorSuggestion(null);

    try {
      const response = await fetch('/api/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: useUrl ? repoUrl : undefined,
          repoPath: useUrl ? undefined : repoPath,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to setup repository');
        setErrorSuggestion(data.suggestion || null);
        return;
      }

      const data = await response.json();
      setRepoId(data.repoId);
    } catch (err: any) {
      setError(err.message);
      setErrorSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBisect = async () => {
    if (!repoId || !goodCommit || !badCommit) {
      setError('Please provide both good and bad commit hashes');
      setErrorSuggestion(null);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorSuggestion(null);

    try {
      const response = await fetch('/api/bisect/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId,
          goodCommit,
          badCommit,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to start bisect');
        setErrorSuggestion(data.suggestion || null);
        return;
      }

      const data = await response.json();
      setBisectStatus({
        active: true,
        complete: false,
        currentCommit: data.currentCommit,
        commitMessage: data.commitMessage,
        commitDate: data.commitDate,
      });
    } catch (err: any) {
      setError(err.message);
      setErrorSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCommit = async (status: 'good' | 'bad') => {
    if (!repoId) return;

    setLoading(true);
    setError(null);
    setErrorSuggestion(null);

    // Stop dev server when moving to new commit
    if (devServerRunning) {
      await handleStopDevServer();
    }

    try {
      const response = await fetch('/api/bisect/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to mark commit');
        setErrorSuggestion(data.suggestion || null);
        return;
      }

      const data = await response.json();
      setBisectStatus({
        active: true,
        complete: data.complete,
        currentCommit: data.currentCommit,
        commitMessage: data.commitMessage,
        commitDate: data.commitDate,
        firstBadCommit: data.firstBadCommit,
      });
    } catch (err: any) {
      setError(err.message);
      setErrorSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRepoId(null);
    setBisectStatus(null);
    setError(null);
    setErrorSuggestion(null);
    setGoodCommit('');
    setBadCommit('');
    handleStopDevServer();
  };

  const handleStartDevServer = async () => {
    if (!repoId) return;

    setDevServerLoading(true);
    setError(null);
    setErrorSuggestion(null);

    // Parse environment variables from text input
    const parsedEnv: Record<string, string> = {};
    if (envVars.trim()) {
      const lines = envVars.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          parsedEnv[key] = value;
        }
      }
    }

    try {
      const response = await fetch('/api/dev-server/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoId,
          envVars: Object.keys(parsedEnv).length > 0 ? parsedEnv : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to start dev server');
        setErrorSuggestion(data.suggestion || null);
        return;
      }

      const data = await response.json();
      setDevServerRunning(true);
      // Use direct URL instead of proxy - simpler and more reliable
      setDevServerUrl(data.directUrl || `/api/dev-server/proxy/${repoId}`);
    } catch (err: any) {
      setError(err.message);
      setErrorSuggestion(null);
    } finally {
      setDevServerLoading(false);
    }
  };

  const handleStopDevServer = async () => {
    if (!repoId) return;

    setDevServerLoading(true);

    try {
      await fetch(`/api/dev-server/start?repoId=${repoId}`, {
        method: 'DELETE',
      });

      setDevServerRunning(false);
      setDevServerUrl(null);
    } catch (err: any) {
      console.error('Failed to stop dev server:', err);
    } finally {
      setDevServerLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Git Bisect Tool
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Find the commit that introduced a bug using binary search
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
              <div className="font-semibold mb-2">{error}</div>
              {errorSuggestion && (
                <div className="text-sm mt-2 pt-2 border-t border-red-300 dark:border-red-700">
                  💡 <span className="font-medium">Suggestion:</span> {errorSuggestion}
                </div>
              )}
            </div>
          )}

          {!repoId ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Repository Source
                </label>
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setUseUrl(true)}
                    className={`px-4 py-2 rounded-lg ${
                      useUrl
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Clone from URL
                  </button>
                  <button
                    onClick={() => setUseUrl(false)}
                    className={`px-4 py-2 rounded-lg ${
                      !useUrl
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Local Path
                  </button>
                </div>
                {useUrl ? (
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder="/path/to/local/repo"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              <button
                onClick={handleSetupRepo}
                disabled={loading || (useUrl ? !repoUrl : !repoPath)}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Setting up repository...' : 'Setup Repository'}
              </button>
            </div>
          ) : !bisectStatus?.active ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg">
                Repository ready! Enter commit hashes to start bisect.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Good Commit (works)
                </label>
                <input
                  type="text"
                  value={goodCommit}
                  onChange={(e) => setGoodCommit(e.target.value)}
                  placeholder="abc1234..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bad Commit (has bug)
                </label>
                <input
                  type="text"
                  value={badCommit}
                  onChange={(e) => setBadCommit(e.target.value)}
                  placeholder="def5678..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleStartBisect}
                  disabled={loading || !goodCommit || !badCommit}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Starting...' : 'Start Bisect'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : bisectStatus.complete ? (
            <div className="space-y-6">
              <div className="p-6 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 rounded-lg">
                <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-4">
                  🎯 First Bad Commit Found!
                </h2>
                <div className="space-y-2 text-yellow-700 dark:text-yellow-300">
                  <p>
                    <span className="font-semibold">Commit:</span>{' '}
                    <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded font-mono">
                      {bisectStatus.firstBadCommit || bisectStatus.currentCommit}
                    </code>
                  </p>
                  {bisectStatus.commitMessage && (
                    <p>
                      <span className="font-semibold">Message:</span>{' '}
                      {bisectStatus.commitMessage}
                    </p>
                  )}
                  {bisectStatus.commitDate && (
                    <p>
                      <span className="font-semibold">Date:</span>{' '}
                      {formatDate(bisectStatus.commitDate)}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Start New Bisect
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-700 rounded-lg">
                <h2 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-4">
                  Test This Commit
                </h2>
                <div className="space-y-2 text-blue-700 dark:text-blue-300">
                  <p>
                    <span className="font-semibold">Commit:</span>{' '}
                    <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded font-mono">
                      {bisectStatus.currentCommit}
                    </code>
                  </p>
                  {bisectStatus.commitMessage && (
                    <p>
                      <span className="font-semibold">Message:</span>{' '}
                      {bisectStatus.commitMessage}
                    </p>
                  )}
                  {bisectStatus.commitDate && (
                    <p>
                      <span className="font-semibold">Date:</span>{' '}
                      {formatDate(bisectStatus.commitDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* Dev Server Controls */}
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Test the App
                  </h3>
                  {!devServerRunning ? (
                    <button
                      onClick={handleStartDevServer}
                      disabled={devServerLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {devServerLoading ? 'Starting...' : 'Start Dev Server'}
                    </button>
                  ) : (
                    <button
                      onClick={handleStopDevServer}
                      disabled={devServerLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {devServerLoading ? 'Stopping...' : 'Stop Dev Server'}
                    </button>
                  )}
                </div>
                
                {!devServerRunning && (
                  <div className="mb-3">
                    <button
                      onClick={() => setShowEnvInput(!showEnvInput)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showEnvInput ? '▼' : '▶'} Environment Variables (optional)
                    </button>
                    {showEnvInput && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          Paste your .env file contents here. Usually .env files aren't in GitHub repos, so you may need to add them manually.
                        </p>
                        <textarea
                          value={envVars}
                          onChange={(e) => setEnvVars(e.target.value)}
                          placeholder={`NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key`}
                          className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                          rows={6}
                        />
                      </div>
                    )}
                  </div>
                )}
                {devServerRunning && devServerUrl && bisectStatus?.currentCommit && (
                  <div className="mt-3 space-y-2">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                        Dev server is running at commit:
                      </p>
                      <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900/40 rounded font-mono text-xs text-blue-900 dark:text-blue-100">
                        {bisectStatus.currentCommit.substring(0, 7)}
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        Click the button below to open the app in a new tab and test it.
                      </p>
                      <a
                        href={devServerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Open App in New Tab →
                      </a>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                        Note: The app will open in a new tab. Test it there, then come back here to mark it as "Works" or "Doesn't Work".
                      </p>
                    </div>
                  </div>
                )}
                {!devServerRunning && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Start the dev server to test the app at this commit in the browser.
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleMarkCommit('good')}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-lg"
                >
                  ✓ Works
                </button>
                <button
                  onClick={() => handleMarkCommit('bad')}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-lg"
                >
                  ✗ Doesn't Work
                </button>
              </div>

              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel Bisect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
