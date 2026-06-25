import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

interface Provider {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  scopes: string[];
}

interface Connection {
  id: string;
  provider: string;
  status: string;
  scopes: string[];
  lastSync?: string;
  connectedAt: string;
  accountEmail?: string | null;
  providerMeta?: Provider;
}

const CATEGORY_LABEL: Record<string, string> = {
  productivity: '🛠️ Productivity',
  health: '❤️ Health',
  media: '📸 Media',
  finance: '💰 Finance',
  social: '👥 Social',
  work: '💼 Work',
};

export default function AccountsScreen() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<{ provider: string; data: any } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [p, c] = await Promise.allSettled([
        apiGet<{ providers: Provider[] }>(`${specialists.accounts}/accounts/providers`),
        apiGet<{ accounts: Connection[] }>(`${specialists.accounts}/accounts/list/user-001`),
      ]);
      if (p.status === 'fulfilled') setProviders(p.value.providers || []);
      if (c.status === 'fulfilled') setConnections(c.value.accounts || []);
    } finally {
      setLoading(false);
    }
  }

  function isConnected(providerId: string) {
    return connections.some((c) => c.provider === providerId && c.status === 'connected');
  }

  async function connect(providerId: string) {
    try {
      await apiPost(`${specialists.accounts}/accounts/connect/user-001/${providerId}`, {});
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('409')) alert('Already connected');
    }
  }

  async function disconnect(providerId: string) {
    if (!confirm(`Disconnect ${providerId}?`)) return;
    try {
      await apiPost(`${specialists.accounts}/accounts/disconnect/user-001/${providerId}`, {});
      setPreviewData(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Disconnect failed:', msg);
      alert('Failed to disconnect. Please try again.');
    }
  }

  async function preview(providerId: string) {
    try {
      const res = await apiGet<{ data: any }>(`${specialists.accounts}/accounts/data/user-001/${providerId}`);
      setPreviewData({ provider: providerId, data: res.data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Cannot fetch data — make sure you are connected';
      alert(msg);
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>🔗 Accounts</h1>
        </div>
        <div className="loading">Loading providers…</div>
      </div>
    );
  }

  // Group providers by category
  const byCategory: Record<string, Provider[]> = {};
  for (const p of providers) {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>🔗 Connected Accounts</h1>
      </div>

      <div className="muted small" style={{ padding: '0 16px 12px' }}>
        Connect Gmail, Calendar, Photos, Health, Banking. Genie becomes yours.
      </div>

      <div className="card" style={{ margin: '0 16px 12px' }}>
        <div className="muted small">
          <strong>{connections.length}</strong> of {providers.length} providers connected
        </div>
      </div>

      {/* Connected accounts (top) */}
      {connections.length > 0 && (
        <>
          <div style={{ padding: '0 16px 8px', fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Connected
          </div>
          <div style={{ padding: '0 16px 12px', display: 'grid', gap: 8 }}>
            {connections.map((c) => (
              <div key={c.id} className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 28 }}>{c.providerMeta?.icon || '🔗'}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.providerMeta?.name || c.provider}</div>
                      {c.accountEmail && (
                        <div style={{ fontSize: 11, opacity: 0.6 }}>{c.accountEmail}</div>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    background: 'rgba(140,255,180,0.2)',
                    color: '#aaffaa',
                    borderRadius: 8,
                  }}>✓ Connected</span>
                </div>
                {c.lastSync && (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    Last sync: {new Date(c.lastSync).toLocaleString()}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn" style={{ fontSize: 11, padding: '6px 10px' }} onClick={() => preview(c.provider)}>
                    👁️ Preview data
                  </button>
                  <button
                    onClick={() => disconnect(c.provider)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,140,140,0.4)',
                      color: 'rgba(255,140,140,0.85)',
                      fontSize: 11,
                      padding: '6px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Available providers */}
      {Object.entries(byCategory).map(([cat, provs]) => (
        <div key={cat} style={{ padding: '0 16px 12px' }}>
          <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            {CATEGORY_LABEL[cat] || cat}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {provs.map((p) => {
              const conn = isConnected(p.id);
              return (
                <div key={p.id} className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 26 }}>{p.icon}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>{p.scopes.join(', ')}</div>
                      </div>
                    </div>
                    {conn ? (
                      <span style={{ fontSize: 10, opacity: 0.7 }}>✓</span>
                    ) : (
                      <button className="btn" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => connect(p.id)}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Preview modal */}
      {previewData && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100,
        }} onClick={() => setPreviewData(null)}>
          <div className="card" style={{ maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-title">📊 {previewData.provider} — Live data</div>
            <pre style={{
              whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.5,
              padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 8,
            }}>
              {JSON.stringify(previewData.data, null, 2)}
            </pre>
            <button className="btn btn-block" onClick={() => setPreviewData(null)} style={{ marginTop: 12 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}