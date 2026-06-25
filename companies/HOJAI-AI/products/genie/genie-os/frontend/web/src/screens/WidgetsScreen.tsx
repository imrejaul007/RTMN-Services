import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

interface WidgetType {
  type: string;
  size: string;
  refreshMin: number;
  icon: string;
  label: string;
}

interface WidgetPayload {
  type: string;
  meta: WidgetType;
  data: any;
  generatedAt: string;
}

interface Config {
  pinned: string[];
  refreshIntervalMin: number;
  theme: string;
}

const WIDGET_RENDERERS: Record<string, (d: any) => JSX.Element> = {
  briefing: (d) => (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{d?.location} • {d?.tempC}°C {d?.weather}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{d?.headline}</div>
      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{d?.subline}</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>Mood: {d?.mood}</div>
    </div>
  ),
  focus: (d) => (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{d?.title}</div>
      {(d?.items || []).slice(0, 3).map((it: string, i: number) => (
        <div key={i} style={{ fontSize: 12, padding: '2px 0' }}>• {it}</div>
      ))}
    </div>
  ),
  gratitude: (d) => (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{d?.icon} Day {d?.streak}</div>
      <div style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>"{d?.text}"</div>
    </div>
  ),
  prayer: (d) => (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{d?.icon} {d?.answered} answered</div>
      <div style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>"{d?.text}"</div>
    </div>
  ),
  moment: (d) => (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{d?.date} • {d?.daysSince} days ago</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{d?.title}</div>
    </div>
  ),
  twin: (d) => (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{d?.icon} {d?.name}</div>
      <div style={{ fontSize: 12, fontStyle: 'italic', opacity: 0.85, marginTop: 4 }}>"{d?.headline}"</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>Top trait: {d?.topTrait}</div>
    </div>
  ),
  counter: (d) => (
    <div style={{ padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 36, fontWeight: 700 }}>{d?.value}</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{d?.label}</div>
    </div>
  ),
  countdown: (d) => (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{d?.label}</div>
      <div style={{ fontSize: 32, fontWeight: 700 }}>{d?.icon} {d?.daysLeft}</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>days left</div>
    </div>
  ),
};

export default function WidgetsScreen() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<WidgetType[]>([]);
  const [payloads, setPayloads] = useState<Record<string, WidgetPayload>>({});
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, c, b] = await Promise.allSettled([
        apiGet<{ types: WidgetType[] }>(`${specialists.widgets}/widgets/types`),
        apiGet<{ data: Config }>(`${specialists.widgets}/config/user-001`),
        apiPost<{ bundle: any[] }>(`${specialists.widgets}/widgets/render/user-001`, {}),
      ]);
      if (t.status === 'fulfilled') setTypes(t.value.types || []);
      if (c.status === 'fulfilled') setConfig(c.value.data || null);
      if (b.status === 'fulfilled') {
        const map: Record<string, WidgetPayload> = {};
        for (const w of b.value.bundle || []) {
          map[w.type] = w;
        }
        setPayloads(map);
      }
    } finally {
      setLoading(false);
    }
  }

  async function togglePin(type: string) {
    const isPinned = config?.pinned?.includes(type);
    try {
      await apiPost(
        isPinned
          ? `${specialists.widgets}/config/user-001/unpin/${type}`
          : `${specialists.widgets}/config/user-001/pin/${type}`,
        {}
      );
      await load();
    } catch {}
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>📱 Widgets</h1>
        </div>
        <div className="loading">Loading widgets…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>📱 Lock-Screen Widgets</h1>
      </div>

      <div className="muted small" style={{ padding: '0 16px 12px' }}>
        Pin widgets to your home screen. Glanceable Genie, no app open needed.
      </div>

      {config && (
        <div className="card" style={{ margin: '0 16px 12px' }}>
          <div className="muted small">
            <strong>{config.pinned?.length || 0}</strong> pinned • Refresh every <strong>{config.refreshIntervalMin}</strong> min • Theme: <strong>{config.theme}</strong>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12, padding: '0 16px 24px' }}>
        {types.map((t) => {
          const isPinned = config?.pinned?.includes(t.type);
          const payload = payloads[t.type];
          return (
            <div
              key={t.type}
              className="card"
              style={{
                border: isPinned ? '2px solid rgba(140,255,180,0.6)' : '1px solid rgba(255,255,255,0.12)',
                background: isPinned ? 'rgba(140,255,180,0.05)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div className="card-title" style={{ marginBottom: 0 }}>
                    {t.icon} {t.label}
                  </div>
                  <div className="muted small">
                    {t.size} • refresh {t.refreshMin} min
                  </div>
                </div>
                <button
                  onClick={() => togglePin(t.type)}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    background: isPinned ? 'rgba(140,255,180,0.2)' : 'rgba(255,255,255,0.08)',
                    fontSize: 12,
                  }}
                >
                  {isPinned ? '✓ Pinned' : '📌 Pin'}
                </button>
              </div>

              {/* Widget preview */}
              <div style={{
                marginTop: 8,
                border: '1px dashed rgba(255,255,255,0.2)',
                borderRadius: 10,
                background: 'rgba(0,0,0,0.2)',
                minHeight: 80,
              }}>
                {payload && WIDGET_RENDERERS[t.type] ? (
                  WIDGET_RENDERERS[t.type](payload.data)
                ) : (
                  <div style={{ padding: 12, opacity: 0.5, fontSize: 12 }}>Preview unavailable</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
