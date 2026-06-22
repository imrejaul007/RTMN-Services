'use client';

import { useState } from 'react';
import { api, formatDate } from '@/lib/api';

interface CourtCase {
  id: string;
  title: string;
  court: string;
  status: string;
  date: string;
  citation?: string;
  parties?: string[];
}

export default function CaseSearchPage() {
  const [query, setQuery] = useState('');
  const [court, setCourt] = useState('');
  const [year, setYear] = useState('');
  const [results, setResults] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const cases = await api.searchCases(query, {
        court: court || undefined,
        year: year ? parseInt(year) : undefined,
      });
      setResults(cases);
    } catch (err) {
      console.error('Case search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-white">← Back</a>
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold">
            L
          </div>
          <span className="text-lg font-semibold">Case Search</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Form */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Search Indian Court Cases</h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by keyword, party name, case number..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 px-8 py-3 rounded-lg font-medium transition"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Court</label>
                <select
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Courts</option>
                  <option value="Supreme Court">Supreme Court</option>
                  <option value="Delhi High Court">Delhi High Court</option>
                  <option value="Bombay High Court">Bombay High Court</option>
                  <option value="Madras High Court">Madras High Court</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Results</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500">
                  <option value="10">10 results</option>
                  <option value="25">25 results</option>
                  <option value="50">50 results</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Results */}
        {searched && (
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {loading ? 'Searching...' : `${results.length} Results`}
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Searching court databases...</div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No cases found. Try different search terms.
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {results.map((c) => (
                  <div key={c.id} className="p-6 hover:bg-slate-700/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg mb-1">{c.title}</h3>
                        <div className="text-slate-400 text-sm space-x-4">
                          <span>{c.court}</span>
                          <span>•</span>
                          <span>{formatDate(c.date)}</span>
                          {c.citation && <span>•</span>}
                          {c.citation && <span className="text-amber-400">{c.citation}</span>}
                        </div>
                        {c.parties && (
                          <div className="text-slate-500 text-sm mt-2">
                            {c.parties.join(' vs ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.status === 'Pending' ? 'bg-amber-500/20 text-amber-400' :
                          c.status === 'Disposed' ? 'bg-green-500/20 text-green-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {c.status}
                        </span>
                        <button className="text-amber-400 hover:text-amber-300 text-sm">
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}