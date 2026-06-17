import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketplace | RTMN',
  description: 'Workflow & Knowledge Marketplace - Browse and install workflows, knowledge packs for your industry',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50/50">
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 bg-white border-b">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-8">
                  <a href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="font-bold text-xl">RTMN Marketplace</span>
                  </a>
                  <nav className="hidden md:flex items-center gap-6">
                    <a href="/workflows" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                      Workflows
                    </a>
                    <a href="/knowledge" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                      Knowledge Packs
                    </a>
                    <a href="/reviews" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                      My Reviews
                    </a>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative hidden md:block">
                    <input
                      type="search"
                      placeholder="Search marketplace..."
                      className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">U</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>

          <footer className="bg-white border-t mt-auto">
            <div className="container mx-auto px-4 py-8">
              <div className="grid grid-cols-4 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">R</span>
                    </div>
                    <span className="font-semibold">RTMN</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Real-Time Multi-Industry Network connecting 24+ industry verticals.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Marketplace</h4>
                  <ul className="space-y-2 text-sm text-gray-500">
                    <li><a href="/workflows" className="hover:text-gray-900">Workflows</a></li>
                    <li><a href="/knowledge" className="hover:text-gray-900">Knowledge Packs</a></li>
                    <li><a href="/reviews" className="hover:text-gray-900">My Reviews</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Resources</h4>
                  <ul className="space-y-2 text-sm text-gray-500">
                    <li><a href="#" className="hover:text-gray-900">Documentation</a></li>
                    <li><a href="#" className="hover:text-gray-900">API Reference</a></li>
                    <li><a href="#" className="hover:text-gray-900">Support</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Company</h4>
                  <ul className="space-y-2 text-sm text-gray-500">
                    <li><a href="#" className="hover:text-gray-900">About</a></li>
                    <li><a href="#" className="hover:text-gray-900">Careers</a></li>
                    <li><a href="#" className="hover:text-gray-900">Contact</a></li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} RTMN. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
