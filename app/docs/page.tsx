export default function Docs() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Usage Section */}
      <section className="py-16 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-8">
              Documentation
            </h1>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
              Usage
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  1. Setup Repository
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Clone a repository from a URL or use a local path. The tool creates a working copy for bisect operations.
                </p>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4 font-mono text-sm text-gray-800 dark:text-gray-200">
                  <div className="text-gray-500 dark:text-gray-500"># Clone from URL</div>
                  <div>https://github.com/user/repo.git</div>
                  <div className="mt-2 text-gray-500 dark:text-gray-500"># Or use local path (macOS/Linux)</div>
                  <div>/Users/username/projects/my-repo</div>
                  <div className="mt-2 text-gray-500 dark:text-gray-500"># Windows example</div>
                  <div>C:\Users\username\projects\my-repo</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  2. Start Bisect
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Provide two commit hashes: one known good commit (where the bug doesn't exist) and one bad commit (where the bug is present).
                </p>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4 font-mono text-sm text-gray-800 dark:text-gray-200">
                  <div className="text-gray-500 dark:text-gray-500"># Good commit (works)</div>
                  <div>abc123def456...</div>
                  <div className="mt-2 text-gray-500 dark:text-gray-500"># Bad commit (has bug)</div>
                  <div>xyz789uvw012...</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  3. Test Commits
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  The tool will present commits to test. Start the development server, test your application, and mark each commit as working or broken.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The bisect algorithm uses binary search to minimize the number of commits you need to test. For a repository with 1000 commits, you'll typically only need to test about 10 commits.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  4. Review Results
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Once the first bad commit is identified, you'll see the commit hash, message, author, and date. This is the commit that introduced the bug.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="py-16 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
              Technical Details
            </h2>
            <div className="space-y-6 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Binary Search Algorithm
                </h3>
                <p className="text-sm leading-relaxed">
                  Git bisect uses binary search to efficiently narrow down the problematic commit. The algorithm repeatedly selects a commit halfway between the known good and bad commits, reducing the search space by half with each iteration.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Development Server
                </h3>
                <p className="text-sm leading-relaxed">
                  The tool can start a development server for your application at each commit, allowing you to test the application in a browser. Environment variables can be configured for each test session.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Repository Management
                </h3>
                <p className="text-sm leading-relaxed">
                  Repositories are stored locally in the <code className="bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded text-xs font-mono">.repos/</code> directory. Each repository session gets a unique ID for isolation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
              Requirements
            </h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-gray-400 dark:text-gray-600 mr-3">•</span>
                <span className="text-sm">Node.js 18+ and npm/yarn/pnpm</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 dark:text-gray-600 mr-3">•</span>
                <span className="text-sm">Git installed on your system</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 dark:text-gray-600 mr-3">•</span>
                <span className="text-sm">Sufficient disk space for cloned repositories</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

