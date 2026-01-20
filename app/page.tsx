import Link from 'next/link';
import BisectAnimation from './components/BisectAnimation';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-900" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
                  Find Bugs
                  <span className="block bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Faster
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                  Identify the commit that introduced the bug. <br />Then get the instant fix.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/bisect"
                    className="group px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-lg transition-all hover:bg-gray-800 dark:hover:bg-gray-100 hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                  >
                    Start Bisect
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/docs"
                    className="px-8 py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-600"
                  >
                    Documentation
                  </Link>
                </div>

                {/* Homepage demo video below primary CTA.
                   Ensure your file exists at `public/demo.mov`
                   or update the src to match your filename. */}
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 mb-2">
                    How it works
                  </h2>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black/80 shadow-xl max-w-2xl">
                  <video
                    className="w-full h-full max-h-[560px] object-cover"
                    src="/demo.mov"
                    controls
                    playsInline
                    muted
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
            
            <div className="lg:pl-8">
              <div className="relative">
                <div className="relative rounded-xl p-6">
                  <BisectAnimation />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
