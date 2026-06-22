'use client';

export default function EDiscoveryPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-white">← Back</a>
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold">L</div>
          <span className="text-lg font-semibold">E-Discovery</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="font-semibold mb-2">Upload Documents</h3>
            <p className="text-sm text-slate-400 mb-4">Upload emails, contracts, chats for analysis</p>
            <button className="w-full bg-amber-500 hover:bg-amber-600 py-2 rounded-lg font-medium">Upload Files</button>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-semibold mb-2">Search & Filter</h3>
            <p className="text-sm text-slate-400 mb-4">Search across all uploaded documents</p>
            <button className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-medium">Start Search</button>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-semibold mb-2">Generate Report</h3>
            <p className="text-sm text-slate-400 mb-4">Create litigation-ready reports</p>
            <button className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-medium">Generate</button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700"><h2 className="text-lg font-semibold">Recent Cases</h2></div>
          <div className="divide-y divide-slate-700">
            {[
              { name: 'Smith vs. Corporation', files: 156, status: 'In Progress', updated: '2026-06-10' },
              { name: 'Contract Dispute - ABC', files: 89, status: 'Completed', updated: '2026-06-05' },
              { name: 'Employment Matter', files: 45, status: 'In Progress', updated: '2026-06-01' },
            ].map((c, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-700/50">
                <div>
                  <h3 className="font-medium">{c.name}</h3>
                  <p className="text-sm text-slate-400">{c.files} files • Last updated {c.updated}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${c.status === 'Completed' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
