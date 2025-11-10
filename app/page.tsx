import Link from 'next/link';
import BisectAnimation from './components/BisectAnimation';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section with Animation */}
      <section className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Git Bisect Tool
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                A web-based interface for git bisect operations. Identify the exact commit that introduced a bug by testing your application at different points in your git history.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/bisect"
                  className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-md transition-colors hover:bg-gray-800 dark:hover:bg-gray-100"
                >
                  Start Bisect
                </Link>
                <Link
                  href="/docs"
                  className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  Documentation
                </Link>
              </div>
            </div>
            
            {/* Right side - Animation */}
            <div className="lg:pl-8">
              <BisectAnimation />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
