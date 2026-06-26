import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BAM - BLR AI Marketplace',
  description: 'The world\'s largest marketplace for AI-native business assets. Buy or subscribe to AI agents, digital twins, skills, workflows, and complete business solutions.',
  keywords: ['AI', 'marketplace', 'agents', 'digital twins', 'skills', 'workflows', 'business automation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">BAM</h1>
                  <p className="text-xs text-slate-500">BLR AI Marketplace</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-6">
                <a href="/categories" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Categories
                </a>
                <a href="/listings?q=featured:true" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Featured
                </a>
                <a href="/explore" className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">
                  Explore Nexha
                </a>
                <a href="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Dashboard
                </a>
                <a href="/dashboard/moderation" className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">
                  Moderation
                </a>
              </nav>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Search..."
                    className="w-48 pl-10 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  Publish
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-300 py-12 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold">B</span>
                  </div>
                  <span className="text-lg font-bold text-white">BAM</span>
                </div>
                <p className="text-sm text-slate-400">
                  The world&apos;s largest marketplace for AI-native business assets.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Categories</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="/category/ai-employee" className="hover:text-white transition-colors">AI Employees</a></li>
                  <li><a href="/category/agent" className="hover:text-white transition-colors">AI Agents</a></li>
                  <li><a href="/category/business-capability-pack" className="hover:text-white transition-colors">Capability Packs</a></li>
                  <li><a href="/categories" className="hover:text-white transition-colors">View All</a></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Resources</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Developer SDK</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Legal</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-800 mt-8 pt-8 text-sm text-slate-500 flex items-center justify-between">
              <p>&copy; 2026 HOJAI AI. All rights reserved.</p>
              <p>Built on the RTMN Ecosystem</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
