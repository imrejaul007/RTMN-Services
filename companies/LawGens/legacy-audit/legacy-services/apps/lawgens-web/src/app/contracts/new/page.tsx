'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CONTRACT_TYPES = [
  { value: 'nda', label: 'Non-Disclosure Agreement (NDA)', icon: '🔒' },
  { value: 'msa', label: 'Master Service Agreement (MSA)', icon: '📋' },
  { value: 'employment', label: 'Employment Agreement', icon: '👔' },
  { value: 'lease', label: 'Lease Agreement', icon: '🏢' },
  { value: 'service', label: 'Service Agreement', icon: '⚙️' },
  { value: 'purchase', label: 'Purchase Agreement', icon: '🛒' },
  { value: 'partnership', label: 'Partnership Agreement', icon: '🤝' },
  { value: 'consulting', label: 'Consulting Agreement', icon: '💼' },
];

export default function NewContractPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulated submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Redirect to contracts page
    router.push('/contracts');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
              ← Back
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold">
              L
            </div>
            <span className="text-lg font-semibold">New Contract</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Contract Type */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Choose Contract Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CONTRACT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    selectedType === type.value
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="text-sm font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Contract Details */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Contract Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contract Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., NDA between ABC Corp and XYZ Inc"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the contract..."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Generate Contract */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Step 3: Generate with AI</h2>
            <p className="text-slate-400 mb-4">
              Our AI will analyze your requirements and generate a customized contract based on the selected type and details.
            </p>
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                AI Contract Generation Available
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                <li>• Risk analysis included</li>
                <li>• Compliance check</li>
                <li>• Standard clauses auto-added</li>
              </ul>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedType || !title || loading}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                'Generate Contract'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
