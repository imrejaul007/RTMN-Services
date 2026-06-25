import { useEffect, useState } from 'react';
import { apiGet, specialists } from '../services/api';
import type { SearchResult } from '../types';

const FILTERS = [
  { id: 'all', label: 'All', icon: '🔍' },
  { id: 'memory', label: 'Memories', icon: '🧠' },
  { id: 'people', label: 'People', icon: '👥' },
  { id: 'events', label: 'Events', icon: '📅' },
  { id: 'knowledge', label: 'Knowledge', icon: '📚' }
];

export default function SearchTab() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const r = localStorage.getItem('genie_recent_searches');
    if (r) setRecent(JSON.parse(r));
  }, []);

  async function search(q: string) {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<{ items: SearchResult[] }>(`${specialists.search}/api/search`, { q, limit: 20 });
      setResults(data.items || []);

      // Save to recent
      const updated = [q, ...recent.filter((r) => r !== q)].slice(0, 5);
      setRecent(updated);
      localStorage.setItem('genie_recent_searches', JSON.stringify(updated));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    search(query);
  }

  const filtered = filter === 'all' ? results : results.filter((r) => {
    if (filter === 'memory') return r.source === 'memory-inbox' || r.source === 'memory-graph';
    if (filter === 'people') return r.source === 'relationship';
    if (filter === 'events') return r.source === 'calendar';
    if (filter === 'knowledge') return r.source === 'learning' || r.source === 'lifeuni';
    return true;
  });

  return (
    <div>
      <h2 className="section-title">🔍 Search</h2>
      <p className="section-sub">Search across your memories, people, events, and knowledge.</p>

      {/* Search bar */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything..."
          autoFocus
        />
        <button type="submit" className="btn" disabled={loading || !query.trim()}>
          {loading ? <div className="spinner" /> : '🔍'}
        </button>
      </form>

      {/* Filters */}
      <div className="pill-row">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`pill ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Recent searches */}
      {!query && recent.length > 0 && (
        <div className="card">
          <div className="card-title">🕐 Recent</div>
          {recent.map((r) => (
            <button
              key={r}
              className="list-item"
              style={{ width: '100%', textAlign: 'left', background: 'none' }}
              onClick={() => {
                setQuery(r);
                search(r);
              }}
            >
              <div className="list-item-main">
                <div className="list-item-title">🔍 {r}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {query && (
        <>
          <div className="muted small" style={{ margin: '8px 0' }}>
            {loading ? 'Searching...' : `${filtered.length} results`}
          </div>

          {filtered.length === 0 && !loading && (
            <div className="empty">
              <div style={{ fontSize: 48 }}>🤷</div>
              <div style={{ marginTop: 12 }}>No results for "{query}"</div>
            </div>
          )}

          {filtered.map((r, i) => (
            <div key={i} className="card" style={{ marginBottom: 8 }}>
              <div className="row">
                <span className="badge badge-muted">{r.source}</span>
                <span className="badge badge-primary">{r.type}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>{r.title}</div>
              {r.snippet && (
                <div className="muted small" style={{ marginTop: 4 }}>
                  {r.snippet.slice(0, 140)}...
                </div>
              )}
              {r.score !== undefined && (
                <div className="faint tiny" style={{ marginTop: 6 }}>
                  Score: {(r.score * 100).toFixed(0)}%
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}