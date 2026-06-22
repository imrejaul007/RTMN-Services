export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">L</div>
          <span className="text-xl font-semibold">LawGens</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-6 text-center">About LawGens</h1>
        <p className="text-xl text-slate-400 text-center mb-12">Legal Intelligence for Everyone</p>

        <div className="space-y-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-slate-400">Making legal expertise accessible to every business and individual through AI-powered legal intelligence.</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">What We Offer</h2>
            <ul className="space-y-2 text-slate-400">
              <li>✓ AI-Powered Contract Analysis</li>
              <li>✓ Legal Research & Case Law Search</li>
              <li>✓ Compliance Management</li>
              <li>✓ Court Case Tracking</li>
              <li>✓ Document Generation</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-slate-400">Email: support@lawgens.app</p>
            <p className="text-slate-400">Website: https://lawgens.app</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-400">
          <p>© 2026 LawGens by RTNM Digital. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
