'use client';

import { useState } from 'react';

const COMPLIANCES = [
  { id: 'gdpr', name: 'GDPR', description: 'Data Protection', status: 'compliant' },
  { id: 'soc2', name: 'SOC 2', description: 'Security', status: 'compliant' },
  { id: 'sebi', name: 'SEBI', description: 'Capital Markets', status: 'pending' },
  { id: 'hipaa', name: 'HIPAA', description: 'Healthcare', status: 'not-applicable' },
];

export default function CompliancePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-amber-400 bg-amber-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-white">← Back</a>
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold">L</div>
          <span className="text-lg font-semibold">Compliance Center</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4"><div className="text-3xl font-bold">{COMPLIANCES.length}</div><div className="text-sm text-slate-400">Total</div></div>
          <div className="bg-slate-800 rounded-xl p-4"><div className="text-3xl font-bold text-green-400">{COMPLIANCES.filter(c => c.status === 'compliant').length}</div><div className="text-sm text-slate-400">Compliant</div></div>
          <div className="bg-slate-800 rounded-xl p-4"><div className="text-3xl font-bold text-amber-400">{COMPLIANCES.filter(c => c.status === 'pending').length}</div><div className="text-sm text-slate-400">Pending</div></div>
          <div className="bg-slate-800 rounded-xl p-4"><div className="text-3xl font-bold text-slate-400">{COMPLIANCES.filter(c => c.status === 'not-applicable').length}</div><div className="text-sm text-slate-400">N/A</div></div>
        </div>

        <input
          type="text"
          placeholder="Search compliance..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-6"
        />

        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold">Regulatory Compliance</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {COMPLIANCES.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-slate-400">{c.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(c.status)}`}>{c.status.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
