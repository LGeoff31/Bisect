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
  const [launching, setLaunching] = useState(false);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [envVars, setEnvVars] = useState('');
  const [showEnvVars, setShowEnvVars] = useState(false);
  const [goodCommit, setGoodCommit] = useState('');
  const [badCommit, setBadCommit] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [creatingFix, setCreatingFix] = useState(false);
  const [fixIssueDescription, setFixIssueDescription] = useState('');
  const [fixBranchName, setFixBranchName] = useState('');
  const [fixResults, setFixResults] = useState<any>(null);
  const [showFixForm, setShowFixForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'bisect' | 'ai'>('bisect');
  console.log('good commit geoff', goodCommit);
  console.log('bad commit geoff', badCommit);
  console.log('all commits geoff', status?.allCommits);
  
  useEffect(() => {
    fetchStatus();
    const savedEnvVars = localStorage.getItem(`envVars_${repoId}`);
    if (savedEnvVars) {
      setEnvVars(savedEnvVars);
    }
  }, [repoId]);

  const fetchStatus = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
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
      if (showLoading) {
        setLoading(false);
      }
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

      await new Promise(resolve => setTimeout(resolve, 800));
      await fetchStatus(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setMarking(false);
    }
  };

  const handleAnalyze = async () => {
    if (!goodCommit || !badCommit || !issueDescription.trim()) {
      setError('Please provide issue description, good commit, and bad commit');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysisResults(null);

    try {
      const response = await fetch('/api/bisect/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId,
          issueDescription,
          goodCommit,
          badCommit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze commits');
      }

      setAnalysisResults(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateFix = async () => {
    if (!status?.firstBadCommit || !fixIssueDescription.trim()) {
      setError('Please provide an issue description for the fix');
      return;
    }

    setCreatingFix(true);
    setError(null);
    setFixResults(null);

    try {
      const response = await fetch('/api/bisect/fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId,
          commitHash: status.firstBadCommit,
          issueDescription: fixIssueDescription,
          branchName: fixBranchName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create fix');
      }

      setFixResults(data);
      setShowFixForm(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setCreatingFix(false);
    }
  };

  const handleLaunch = async () => {
    if (!status?.currentCommit) return;

    setLaunching(true);
    setError(null);

    const envVarsObj: Record<string, string> = {};
    if (envVars.trim()) {
      envVars.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            const cleanValue = value.replace(/^["']|["']$/g, '');
            envVarsObj[key.trim()] = cleanValue;
          }
        }
      });
    }

    localStorage.setItem(`envVars_${repoId}`, envVars);

    try {
      const response = await fetch('/api/bisect/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId,
          commitHash: status.currentCommit,
          envVars: envVarsObj,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to launch');
      }

      setLaunchUrl(data.url);
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLaunching(false);
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

            {fixResults ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-200 mb-4">
                  ✓ Fix Created Successfully!
                </h3>
                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Branch: </span>
                    <code className="text-sm font-mono text-gray-900 dark:text-white">{fixResults.branchName}</code>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Commit: </span>
                    <code className="text-sm font-mono text-gray-900 dark:text-white">{fixResults.commitHash.substring(0, 7)}</code>
                  </div>
                  {fixResults.summary && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary: </span>
                      <p className="text-sm text-gray-900 dark:text-white">{fixResults.summary}</p>
                    </div>
                  )}
                  {fixResults.fixes && fixResults.fixes.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Files Fixed: </span>
                      <ul className="list-disc list-inside text-sm text-gray-900 dark:text-white mt-1">
                        {fixResults.fixes.map((fix: any, idx: number) => (
                          <li key={idx}>
                            <code className="font-mono">{fix.file}</code> - {fix.explanation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {fixResults.prUrl && (
                    <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                      <a
                        href={fixResults.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        View Pull Request #{fixResults.prNumber}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : showFixForm ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Create AI-Powered Fix
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="fixIssueDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Issue Description
                    </label>
                    <textarea
                      id="fixIssueDescription"
                      value={fixIssueDescription}
                      onChange={(e) => setFixIssueDescription(e.target.value)}
                      placeholder="Describe the bug that was introduced in this commit..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                      rows={4}
                      disabled={creatingFix}
                    />
                  </div>
                  <div>
                    <label htmlFor="fixBranchName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Branch Name (Optional)
                    </label>
                    <input
                      id="fixBranchName"
                      type="text"
                      value={fixBranchName}
                      onChange={(e) => setFixBranchName(e.target.value)}
                      placeholder="fix/bug-abc123 (auto-generated if empty)"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent font-mono text-sm"
                      disabled={creatingFix}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateFix}
                      disabled={creatingFix || !fixIssueDescription.trim()}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingFix ? 'Creating Fix...' : 'Create Fix'}
                    </button>
                    <button
                      onClick={() => {
                        setShowFixForm(false);
                        setFixIssueDescription('');
                        setFixBranchName('');
                      }}
                      disabled={creatingFix}
                      className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex gap-3 justify-center">
              {!fixResults && (
                <button
                  onClick={() => {
                    setShowFixForm(true);
                    if (issueDescription) {
                      setFixIssueDescription(issueDescription);
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Fix
                </button>
              )}
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
              <div className="mb-4">
                <button
                  onClick={() => setShowEnvVars(!showEnvVars)}
                  className="w-full mb-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center justify-between"
                >
                  <span>Environment Variables (Optional)</span>
                  <span>{showEnvVars ? '▼' : '▶'}</span>
                </button>
                
                {showEnvVars && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Enter environment variables (one per line, format: KEY=value)
                    </label>
                    <textarea
                      value={envVars}
                      onChange={(e) => setEnvVars(e.target.value)}
                      placeholder="DATABASE_URL=postgres://...&#10;API_KEY=secret123&#10;# Comments start with #"
                      className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                      rows={6}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Values are saved per repository and reused across launches.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleLaunch}
                  disabled={launching || !status.currentCommit}
                  className="w-full px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  {launching ? 'Launching...' : 'Launch App'}
                </button>
                {launchUrl && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    App running at: <a href={launchUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{launchUrl}</a>
                  </p>
                )}
              </div>
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
          <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setActiveTab('bisect')}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors text-gray-900 dark:text-white ${
                    activeTab === 'bisect'
                      ? 'border-b-2 border-gray-900 dark:border-white'
                      : ''
                  }`}
                >
                  Start Git Bisect
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors text-gray-900 dark:text-white ${
                    activeTab === 'ai'
                      ? 'border-b-2 border-gray-900 dark:border-white'
                      : ''
                  }`}
                >
                  AI-Powered Analysis
                </button>
              </div>
            </div>

            {activeTab === 'bisect' ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Start Git Bisect
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manually start bisect with a known good and bad commit.
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
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    AI-Powered Commit Analysis
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Describe the issue and let AI analyze commits to find the most likely culprit.
                  </p>
                </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="issueDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Issue Description
                  </label>
                  <textarea
                    id="issueDescription"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Describe the bug or issue you're trying to find. Be specific about what's broken, error messages, or unexpected behavior..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                    rows={4}
                    disabled={analyzing}
                  />
                </div>

                <div>
                  <label htmlFor="badCommitAnalyze" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bad Commit Hash
                  </label>
                  <input
                    id="badCommitAnalyze"
                    type="text"
                    value={badCommit}
                    onChange={(e) => setBadCommit(e.target.value)}
                    placeholder="def456ghi789..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent font-mono text-sm"
                    disabled={analyzing}
                  />
                </div>

                <div>
                  <label htmlFor="goodCommitAnalyze" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Good Commit Hash
                  </label>
                  <input
                    id="goodCommitAnalyze"
                    type="text"
                    value={goodCommit}
                    onChange={(e) => setGoodCommit(e.target.value)}
                    placeholder="abc123def456..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent font-mono text-sm"
                    disabled={analyzing}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !goodCommit || !badCommit || !issueDescription.trim()}
                  className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analyzing ? 'Analyzing commits...' : 'Analyze Commits'}
                </button>
              </div>

              {analysisResults && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Analysis Results ({analysisResults.totalCommits} commits analyzed)
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {analysisResults.analyses.map((analysis: any, index: number) => (
                      <div
                        key={analysis.commitHash}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                                {analysis.commitHash.substring(0, 7)}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                analysis.likelihood >= 70
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : analysis.likelihood >= 40
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {analysis.likelihood}% likely
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {analysis.commitMessage.split('\n')[0]}
                            </p>
                            {analysis.filesChanged.length > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Files: {analysis.filesChanged.slice(0, 3).join(', ')}
                                {analysis.filesChanged.length > 3 && ` +${analysis.filesChanged.length - 3} more`}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setGoodCommit(analysis.commitHash);
                              setBadCommit(badCommit);
                            }}
                            className="ml-4 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Use as Good
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {analysis.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

