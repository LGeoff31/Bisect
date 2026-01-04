export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          How to Use Git Bisect Tool
        </h1>

        <div className="space-y-12">
          {/* Getting Started */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              What is This Tool?
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Have you ever had a bug in your code and wondered "when did this break?" This tool helps you find the exact commit that introduced a bug by automatically testing commits in your git history. It's like a detective that narrows down where the problem started.
              </p>
            </div>
          </section>

          {/* Basic Workflow */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Quick Start Guide
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Step 1: Set Up Your Repository
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Click "Start Bisect" and enter either a GitHub or GitLab repository URL, or a local file path to your repository.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Step 2: Find Your Good and Bad Commits
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                You need to know two commits:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li><strong>Bad commit:</strong> A commit where the bug exists (usually the latest commit or HEAD)</li>
                <li><strong>Good commit:</strong> A commit where the bug doesn't exist (an older commit)</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                You can find commit hashes in your git log or on GitHub/GitLab.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Step 3: Test Commits
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                The tool will show you a commit to test:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Click "Launch App" to run your app at that commit</li>
                <li>Test if the bug is present</li>
                <li>Click "Mark as Good" if the bug is NOT there</li>
                <li>Click "Mark as Bad" if the bug IS there</li>
              </ol>
              <p className="text-gray-700 dark:text-gray-300">
                The tool automatically picks the next commit to test. Repeat until it finds the bug!
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Step 4: Fix the Bug
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Once the bug-introducing commit is found, you can use AI to automatically generate a fix and create a pull request.
              </p>
            </div>
          </section>

          {/* AI-Powered Features */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              AI Features (Optional)
            </h2>
            
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Smart Commit Analysis
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Before manually testing commits, let AI analyze all the commits and tell you which ones are most likely to have caused the bug. This can save you time!
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                How it works:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-6">
                <li>Describe the bug (what's broken, error messages, etc.)</li>
                <li>Enter your good and bad commit hashes</li>
                <li>Click "Analyze Commits with AI"</li>
                <li>See which commits are most suspicious (sorted by likelihood)</li>
                <li>Use the results to narrow down your search faster</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Automatic Fix Generation
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                After finding the bug-introducing commit, the AI can automatically create a fix for you and even open a pull request!
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                How it works:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>After bisect finds the bug, click "Create Fix"</li>
                <li>Describe the issue (or use the same description from analysis)</li>
                <li>The AI analyzes the buggy commit and generates a fix</li>
                <li>A new branch is created with the fix</li>
                <li>If you have GitHub set up, a pull request is created automatically</li>
              </ol>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                You can always review and modify the fix before merging!
              </p>
            </div>
          </section>

          {/* Testing Commits */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Testing Your App
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                When the tool shows you a commit to test, you need to run your app at that commit and check if the bug is present. The tool makes this easy!
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Launch App Button
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Click this button and the tool will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-4">
                <li>Install dependencies for that commit</li>
                <li>Start your development server</li>
                <li>Open your app in a new browser tab</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                The tool automatically detects if you use npm, yarn, or pnpm.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                Environment Variables (Optional)
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                If your app needs environment variables (like API keys or database URLs), you can set them up:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Click "Environment Variables (Optional)" to expand</li>
                <li>Enter one variable per line: <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">KEY=value</code></li>
                <li>They'll be saved and reused for all launches</li>
              </ul>
            </div>
          </section>

          {/* Tips and Tricks */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Tips & Tricks
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Use AI Analysis First:</strong> Before manually testing commits, try the AI analysis feature. It can help you narrow down the search faster.</li>
                <li><strong>Be Specific with Issue Descriptions:</strong> The more details you give about the bug, the better the AI can help you find and fix it.</li>
                <li><strong>Test Thoroughly:</strong> Make sure you actually test each commit before marking it as good or bad. The tool is only as accurate as your testing!</li>
                <li><strong>Review AI-Generated Fixes:</strong> Always review the fix the AI creates before merging. It's usually good, but you know your codebase best.</li>
              </ul>
            </div>
          </section>

          {/* Troubleshooting */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Common Issues
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">
                App Won't Launch
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">Try these steps:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-6">
                <li>Make sure your package.json has a "dev" script</li>
                <li>Check the server console for error messages</li>
                <li>Try running the dev command manually in your repo</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">
                AI Features Not Working
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">Make sure you:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-6">
                <li>Added OPENAI_API_KEY to .env.local</li>
                <li>Restarted your dev server after adding the key</li>
                <li>Have credits in your OpenAI account</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">
                Can't Find Repository
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">Check that:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>The repository URL is correct</li>
                <li>You have access to private repositories</li>
                <li>Local paths are absolute (start with /)</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

