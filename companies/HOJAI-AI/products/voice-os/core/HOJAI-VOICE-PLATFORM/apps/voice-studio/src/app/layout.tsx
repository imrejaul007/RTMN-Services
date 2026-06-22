import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HOJAI Voice Studio',
  description: 'Build and manage voice AI agents for enterprise customer interactions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-900 text-white min-h-screen p-6 fixed">
            <div className="mb-8">
              <h1 className="text-xl font-bold">HOJAI Voice</h1>
              <p className="text-sm text-gray-400">Voice Studio</p>
            </div>

            <nav className="space-y-2">
              <a href="/agents" className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Agents
                </span>
              </a>
              <a href="/analytics" className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </span>
              </a>
            </nav>

            <div className="mt-8 pt-8 border-t border-gray-800">
              <h3 className="text-xs uppercase text-gray-500 mb-4">Quick Actions</h3>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Agent
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="ml-64 flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
