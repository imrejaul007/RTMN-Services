'use client';

import { useState, useEffect } from 'react';
import { api, formatDate } from '@/lib/api';

interface Contract {
  id: string;
  type: string;
  title: string;
  status: 'draft' | 'analyzed' | 'signed';
  score?: number;
  createdAt: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [newContract, setNewContract] = useState({ text: '', type: 'NDA' });

  useEffect(() => {
    api.getContracts()
      .then(setContracts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async () => {
    if (!newContract.text) return;
    setAnalyzing(true);
    try {
      const result = await api.analyzeContract(newContract.text, newContract.type);
      const contract: Contract = {
        id: `contract_${Date.now()}`,
        type: newContract.type,
        title: `${newContract.type} - ${formatDate(new Date().toISOString())}`,
        status: 'analyzed',
        score: result.score,
        createdAt: new Date().toISOString(),
      };
      setContracts([contract, ...contracts]);
      setNewContract({ text: '', type: 'NDA' });
    } catch (err) {
      console.error('Contract analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-slate-400 hover:text-white">← Back</a>
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold">
              L
            </div>
            <span className="text-lg font-semibold">Contracts</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Analyze New Contract */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Analyze Contract</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <textarea
                  value={newContract.text}
                  onChange={(e) => setNewContract({ ...newContract, text: e.target.value })}
                  placeholder="Paste contract text here..."
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="space-y-4">
                <select
                  value={newContract.type}
                  onChange={(e) => setNewContract({ ...newContract, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="NDA">NDA</option>
                  <option value="Employment">Employment</option>
                  <option value="Service Agreement">Service Agreement</option>
                  <option value="Lease">Lease</option>
                  <option value="Partnership">Partnership</option>
                </select>
                <button
                  onClick={handleAnalyze}
                  disabled={!newContract.text || analyzing}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 py-3 rounded-lg font-medium transition"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contracts List */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Your Contracts</h2>
            <span className="text-slate-400">{contracts.length} contracts</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No contracts yet. Analyze a contract above to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {contracts.map((contract) => (
                <div key={contract.id} className="p-6 flex justify-between items-center hover:bg-slate-700/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-xl">
                      📄
                    </div>
                    <div>
                      <div className="font-medium">{contract.title}</div>
                      <div className="text-slate-400 text-sm">
                        {contract.type} • {formatDate(contract.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {contract.score !== undefined && (
                      <div className={`text-lg font-bold ${contract.score >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
                        {contract.score}%
                      </div>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      contract.status === 'signed' ? 'bg-green-500/20 text-green-400' :
                      contract.status === 'analyzed' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {contract.status}
                    </span>
                    <button className="text-amber-400 hover:text-amber-300 text-sm">
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}