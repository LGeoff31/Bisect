'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BisectVisualization from '../../components/BisectVisualization';

interface BisectStatus {
  active: boolean;
  complete: boolean;
  currentCommit: string | null;
  commitMessage: string | null;
  commitDate: string | null;
  firstBadCommit: string | null;
  goodCommits: string[];
  badCommits: string[];
  initialGoodCommit: string | null;
  initialBadCommit: string | null;
  allCommits: Array<{ hash: string; message: string; date: string }>;
}

export default function BisectSessionPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;

  const [status, setStatus] = useState<BisectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [goodCommit, setGoodCommit] = useState('');
  const [badCommit, setBadCommit] = useState('');
  console.log('good commit geoff', goodCommit);
  console.log('bad commit geoff', badCommit);
  useEffect(() => {
    fetchStatus();
  }, [repoId]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/bisect/status?repoId=${repoId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bisect status');
      }

      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBisect = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    setError(null);

    if (!goodCommit || !badCommit) {
      setError('Please provide both good and bad commit hashes');
      setStarting(false);
      return;
    }

    try {
      const response = await fetch('/api/bisect/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId,
          goodCommit,
          badCommit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start bisect');
      }

      // Refresh status
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setStarting(false);
    }
  };

  const handleMarkCommit = async (commitStatus: 'good' | 'bad') => {
    setMarking(true);
    setError(null);

    try {
      const response = await fetch('/api/bisect/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId,
          status: commitStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark commit');
      }

      // Refresh status
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setMarking(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400">Loading bisect status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Git Bisect Session
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Repository ID: <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{repoId}</code>
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {status && status.complete ? (
          // Bisect Complete
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Bisect Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The first bad commit has been identified.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Bad Commit
              </h3>
              <code className="text-lg font-mono text-gray-900 dark:text-white break-all">
                {status.firstBadCommit || 'Unknown'}
              </code>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/bisect')}
                className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Start New Bisect
              </button>
            </div>
          </div>
        ) : status && status.active ? (
          // Active Bisect Session
          <>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Bisect Progress
              </h2>
              <BisectVisualization
                goodCommits={status.goodCommits || []}
                badCommits={status.badCommits || []}
                currentCommit={status.currentCommit}
                allCommits={status.allCommits || []}
                initialGoodCommit={status.initialGoodCommit}
                initialBadCommit={status.initialBadCommit}
                firstBadCommit={status.firstBadCommit}
                complete={status.complete}
              />
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Current Commit to Test
              </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Commit Hash
                </label>
                <code className="block text-sm font-mono bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-md text-gray-900 dark:text-white break-all">
                  {status.currentCommit || 'N/A'}
                </code>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Commit Message
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-md">
                  {status.commitMessage || 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Commit Date
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-md">
                  {formatDate(status.commitDate)}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Test this commit. Is the bug present?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleMarkCommit('good')}
                  disabled={marking}
                  className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {marking ? 'Marking...' : 'Mark as Good'}
                </button>
                <button
                  onClick={() => handleMarkCommit('bad')}
                  disabled={marking}
                  className="px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {marking ? 'Marking...' : 'Mark as Bad'}
                </button>
              </div>
            </div>
          </div>
          </>
        ) : (
          // No Active Session - Start Bisect Form
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Start Git Bisect
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Provide a known good commit and a known bad commit to begin the bisect process.
              </p>
            </div>

            <form onSubmit={handleStartBisect} className="space-y-6">

            <div>
                <label htmlFor="badCommit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bad Commit Hash
                </label>
                <input
                  id="badCommit"
                  type="text"
                  value={badCommit}
                  onChange={(e) => setBadCommit(e.target.value)}
                  placeholder="def456ghi789..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent font-mono text-sm"
                  disabled={starting}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter the full commit hash of a commit where the bug IS present
                </p>
              </div>
              
              <div>
                <label htmlFor="goodCommit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Good Commit Hash
                </label>
                <input
                  id="goodCommit"
                  type="text"
                  value={goodCommit}
                  onChange={(e) => setGoodCommit(e.target.value)}
                  placeholder="abc123def456..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent font-mono text-sm"
                  disabled={starting}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter the full commit hash of a commit where the bug is NOT present
                </p>
              </div>


              <button
                type="submit"
                disabled={starting || !goodCommit || !badCommit}
                className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starting ? 'Starting bisect...' : 'Start Bisect'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

