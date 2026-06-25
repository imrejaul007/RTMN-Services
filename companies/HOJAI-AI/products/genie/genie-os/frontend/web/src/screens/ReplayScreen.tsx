import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';
import type { Replay, Highlight, ReplayStats } from '../types';

type Period = 'monthly' | 'yearly' | 'life';

export default function ReplayScreen() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Replay[]>([]);
  const [selected, setSelected] = useState<Replay | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [stats, setStats] = useState<ReplayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Period | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [histRes, hlRes, statsRes] = await Promise.allSettled([
        apiGet<{ replays: Replay[] }>(`${specialists.lifereplay}/replay/history/user-001`),
        apiGet<{ highlights: Highlight[] }>(`${specialists.lifereplay}/insights/highlights/user-001`),
        apiGet<{ data: ReplayStats }>(`${specialists.lifereplay}/stats/summary/user-001?days=30`),
      ]);
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value.replays || []);
        // Auto-select the most recent replay
        if (histRes.value.replays && histRes.value.replays.length > 0) {
          setSelected(histRes.value.replays[0]);
        }
      }
      if (hlRes.status === 'fulfilled') {
        setHighlights(hlRes.value.highlights || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data || null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function generate(period: Period) {
    setGenerating(period);
    setError(null);
    try {
      const r = await apiPost<{ data: Replay }>(`${specialists.lifereplay}/replay/period/user-001`, { period });
      // Reload to pick up the new replay
      await load();
      if (r.data) setSelected(r.data);
    } catch (e: any) {
      setError(e.message || 'Generation failed — try again');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h2 className="section-title">🎬 Life Replay</h2>
      <p className="muted small" style={{ marginBottom: 16 }}>
        AI-generated reviews of your month, year, or life — pulling together memories, moods, prayers, gratitude, and meditation.
      </p>

      {/* Generate new */}
      <div className="card">
        <div className="card-title">✨ Generate New</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <button
            className="btn btn-block"
            disabled={generating !== null}
            onClick={() => generate('monthly')}
          >
            {generating === 'monthly' ? '...' : '📅 Month'}
          </button>
          <button
            className="btn btn-block"
            disabled={generating !== null}
            onClick={() => generate('yearly')}
          >
            {generating === 'yearly' ? '...' : '📆 Year'}
          </button>
          <button
            className="btn btn-block"
            disabled={generating !== null}
            onClick={() => generate('life')}
          >
            {generating === 'life' ? '...' : '🌍 Life'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: 8, background: 'var(--danger-bg, rgba(255,0,0,0.1))', borderRadius: 6, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {loading && <div className="empty"><div className="spinner" /></div>}

      {/* Selected replay (the latest one) */}
      {selected && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📖 {selected.title}</div>
            {selected.aiUsed && (
              <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(120,180,255,0.2)', borderRadius: 4 }}>
                AI
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
            {selected.periodStart} → {selected.periodEnd} ({selected.period})
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
            {selected.summary}
          </p>

          {selected.highlights && selected.highlights.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Highlights</div>
              <ul style={{ marginLeft: 16, marginBottom: 16, fontSize: 14, lineHeight: 1.7 }}>
                {selected.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </>
          )}

          {selected.themes && selected.themes.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Themes</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selected.themes.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      background: 'var(--accent-bg, rgba(120,180,255,0.15))',
                      borderRadius: 12,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selected.stats && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                {selected.stats.memories !== undefined && (
                  <div>
                    <div style={{ opacity: 0.7 }}>Memories</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.stats.memories}</div>
                  </div>
                )}
                {selected.stats.gratitudes !== undefined && (
                  <div>
                    <div style={{ opacity: 0.7 }}>Gratitudes</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.stats.gratitudes}</div>
                  </div>
                )}
                {selected.stats.meditationMinutes !== undefined && (
                  <div>
                    <div style={{ opacity: 0.7 }}>Meditation</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.stats.meditationMinutes}m</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 30-day stats */}
      {stats && (
        <div className="card">
          <div className="card-title">📊 Last 30 Days</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div>
              <div style={{ opacity: 0.7 }}>Memories</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.memories ?? '—'}</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Mood Avg</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.moodAvg ?? '—'}/10</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Gratitudes</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.gratitudes ?? '—'}</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Prayers</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.prayers ?? '—'}</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Meditations</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.meditations ?? '—'}</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Meditation</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.meditationMinutes ?? 0}m</div>
            </div>
          </div>
        </div>
      )}

      {/* Curated highlights */}
      {highlights.length > 0 && (
        <div className="card">
          <div className="card-title">🌟 Highlights</div>
          {highlights.map((h, i) => (
            <div key={i} className="list-item">
              <div style={{ fontSize: 24, marginRight: 12 }}>{h.icon}</div>
              <div className="list-item-main">
                <div className="list-item-title">{h.title}</div>
                {h.detail && <div className="list-item-sub">{h.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="card">
          <div className="card-title">📚 History</div>
          {history.slice(1).map((r) => (
            <div
              key={r.id}
              className="list-item"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(r)}
            >
              <div className="list-item-main">
                <div className="list-item-title">{r.title}</div>
                <div className="list-item-sub">
                  {r.periodStart} → {r.periodEnd} • {r.period}
                </div>
              </div>
              <div style={{ fontSize: 16 }}>→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}