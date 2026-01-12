export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Documentation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Learn how to use the Git Bisect Tool to find and fix bugs in your codebase.
          </p>
        </div>

        <div className="space-y-16">
          {/* Getting Started */}
          <section className="border-b border-gray-200 dark:border-gray-800 pb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Overview
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              The Git Bisect Tool helps you identify the exact commit that introduced a bug by automatically testing commits in your git history using binary search. Instead of manually checking each commit, the tool guides you through the process and can even generate fixes automatically.
            </p>
          </section>

          {/* Basic Workflow */}
          <section className="border-b border-gray-200 dark:border-gray-800 pb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Start Git Bisect
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  1. Set Up Your Repository
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Click "Start Bisect" and enter either a GitHub or GitLab repository URL, or a local file path to your repository.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  2. Identify Good and Bad Commits
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                  You need to know two commits:
                </p>
                <ul className="list-disc list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li><strong>Bad commit:</strong> A commit where the bug exists (usually the latest commit or HEAD)</li>
                  <li><strong>Good commit:</strong> A commit where the bug doesn't exist (an older commit)</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-3">
                  Commit hashes can be found in your git log or on GitHub/GitLab.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  3. Test Commits
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                  The tool will show you a commit to test:
                </p>
                <ol className="list-decimal list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li>Click "Launch App" to run your app at that commit</li>
                  <li>Test if the bug is present</li>
                  <li>Click "Mark as Good" if the bug is NOT there</li>
                  <li>Click "Mark as Bad" if the bug IS there</li>
                </ol>
                <p className="text-gray-700 dark:text-gray-300 mt-3 leading-relaxed">
                  The tool automatically picks the next commit to test. Repeat until it finds the bug.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  4. Fix the Bug
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Once the bug-introducing commit is found, you can use AI to automatically generate a fix and create a pull request.
                </p>
              </div>
            </div>
          </section>

          {/* AI-Powered Features */}
          <section className="border-b border-gray-200 dark:border-gray-800 pb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              AI Features
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Smart Commit Analysis
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  Before manually testing commits, let AI analyze all the commits and tell you which ones are most likely to have caused the bug.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                  How it works:
                </p>
                <ol className="list-decimal list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li>Describe the bug (what's broken, error messages, etc.)</li>
                  <li>Enter your good and bad commit hashes</li>
                  <li>Click "Analyze Commits with AI"</li>
                  <li>Review results sorted by likelihood</li>
                  <li>Use the results to narrow down your search faster</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Automatic Fix Generation
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  After finding the bug-introducing commit, the AI can automatically create a fix and open a pull request.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm font-medium">
                  How it works:
                </p>
                <ol className="list-decimal list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li>After bisect finds the bug, click "Create Fix"</li>
                  <li>Describe the issue (or use the same description from analysis)</li>
                  <li>The AI analyzes the buggy commit and generates a fix</li>
                  <li>A new branch is created with the fix</li>
                  <li>If configured, a pull request is created automatically</li>
                </ol>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
                  You can always review and modify the fix before merging.
                </p>
              </div>
            </div>
          </section>

          {/* Testing Commits */}
          <section className="border-b border-gray-200 dark:border-gray-800 pb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Testing Your App
            </h2>
            <div className="space-y-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                When the tool shows you a commit to test, you need to run your app at that commit and check if the bug is present.
              </p>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Launch App
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                  Click the "Launch App" button and the tool will:
                </p>
                <ul className="list-disc list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li>Install dependencies for that commit</li>
                  <li>Start your development server</li>
                  <li>Open your app in a new browser tab</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-3">
                  The tool automatically detects if you use npm, yarn, or pnpm.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Environment Variables
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                  If your app needs environment variables (like API keys or database URLs), you can configure them:
                </p>
                <ul className="list-disc list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li>Click "Environment Variables (Optional)" to expand</li>
                  <li>Enter one variable per line: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">KEY=value</code></li>
                  <li>Variables are saved per repository and reused for all launches</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Tips and Tricks */}
          <section className="border-b border-gray-200 dark:border-gray-800 pb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Best Practices
            </h2>
            <ul className="space-y-4 text-gray-700 dark:text-gray-300">
              <li className="leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Use AI Analysis First:</strong> Before manually testing commits, try the AI analysis feature to narrow down the search faster.
              </li>
              <li className="leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Be Specific with Issue Descriptions:</strong> The more details you provide about the bug, the better the AI can help you find and fix it.
              </li>
              <li className="leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Test Thoroughly:</strong> Make sure you actually test each commit before marking it as good or bad. The tool is only as accurate as your testing.
              </li>
              <li className="leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Review AI-Generated Fixes:</strong> Always review the fix the AI creates before merging. It's usually good, but you know your codebase best.
              </li>
            </ul>
          </section>

          {/* Troubleshooting */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Troubleshooting
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  App Won't Launch
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">Try these steps:</p>
                <ul className="list-disc list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li>Make sure your package.json has a "dev" script</li>
                  <li>Check the server console for error messages</li>
                  <li>Try running the dev command manually in your repo</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  AI Features Not Working
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">Make sure you:</p>
                <ul className="list-disc list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li>Added OPENAI_API_KEY to .env.local</li>
                  <li>Restarted your dev server after adding the key</li>
                  <li>Have credits in your OpenAI account</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Can't Find Repository
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">Check that:</p>
                <ul className="list-disc list-outside space-y-2 text-gray-700 dark:text-gray-300 ml-5">
                  <li>The repository URL is correct</li>
                  <li>You have access to private repositories</li>
                  <li>Local paths are absolute (start with /)</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

