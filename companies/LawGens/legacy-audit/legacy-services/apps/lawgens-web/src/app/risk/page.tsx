'use client';

export default function RiskPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-white">← Back</a>
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold">L</div>
          <span className="text-lg font-semibold">Risk Assessment</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4"><div className="text-3xl font-bold text-red-400">3</div><div className="text-sm text-slate-400">High Risk</div></div>
          <div className="bg-slate-800 rounded-xl p-4"><div className="text-3xl font-bold text-amber-400">7</div><div className="text-sm text-slate-400">Medium Risk</div></div>
          <div className="bg-slate-800 rounded-xl p-4"><div className="text-3xl font-bold text-green-400">12</div><div className="text-sm text-slate-400">Low Risk</div></div>
          <div className="bg-slate-800 rounded-xl p-4"><div className="text-3xl font-bold">22</div><div className="text-sm text-slate-400">Total Contracts</div></div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700"><h2 className="text-lg font-semibold">High Risk Contracts</h2></div>
          <div className="divide-y divide-slate-700">
            {[
              { name: 'NDA - TechCorp Inc', risk: 'High', issue: 'Unlimited liability clause', date: '2026-06-10' },
              { name: 'Service Agreement - ABC Ltd', risk: 'High', issue: 'Non-compete too broad', date: '2026-06-08' },
              { name: 'Lease Agreement - Office 401', risk: 'Medium', issue: 'Automatic renewal without notice', date: '2026-06-05' },
            ].map((item, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-700/50">
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-slate-400">{item.issue}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.risk === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{item.risk} Risk</span>
                  <p className="text-sm text-slate-400 mt-1">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
