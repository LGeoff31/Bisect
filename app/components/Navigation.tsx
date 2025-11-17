import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            Git Bisect Tool
          </Link>
          <div className="flex gap-4">
            <Link
              href="/bisect"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Start Bisect
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

