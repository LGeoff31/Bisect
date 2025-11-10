'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/bisect', label: 'Bisect' },
    { href: '/docs', label: 'Docs' },
  ];

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center space-x-2.5 hover:opacity-70 transition-opacity">
            <div className="w-7 h-7 bg-gray-900 dark:bg-white rounded flex items-center justify-center">
              <span className="text-white dark:text-gray-900 font-medium text-xs">GB</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-white text-base hidden sm:inline">
              Git Bisect
            </span>
          </Link>
          
          <div className="flex items-center space-x-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

