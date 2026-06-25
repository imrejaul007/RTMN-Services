import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';

interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  httpStatus?: number;
  error?: string;
  response?: any;
}

interface HealthResponse {
  total: number;
  up: number;
  down: number;
  degraded: number;
  healthyPercent: number;
  scannedAt: string;
  scanDurationMs: number;
  services: Record<string, ServiceHealth>;
}

const STATUS_COLORS = {
  up: '#22c55e',
  degraded: '#f59e0b',
  down: '#ef4444',
};

const STATUS_LABELS = {
  up: 'Healthy',
  degraded: 'Degraded',
  down: 'Offline',
};

function StatusBadge({ status }: { status: 'up' | 'down' | 'degraded' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        backgroundColor: STATUS_COLORS[status],
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ServiceRow({ name, svc }: { name: string; svc: ServiceHealth }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 13 }}>
        {name}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <StatusBadge status={svc.status} />
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 13 }}>
        {svc.latency != null ? `${svc.latency}ms` : '—'}
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 13 }}>
        {svc.httpStatus || '—'}
      </td>
      <td
        style={{
          padding: '10px 12px',
          fontSize: 12,
          color: svc.error ? '#ef4444' : '#6b7280',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={svc.error}
      >
        {svc.error || '—'}
      </td>
    </tr>
  );
}

export default function ServiceHealthScreen() {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'up' | 'down' | 'degraded'>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await apiGet<HealthResponse>('/admin/services/health');
      setHealth(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchHealth, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchHealth]);

  const filtered = health
    ? Object.entries(health.services).filter(([, svc]) => {
        if (filter === 'all') return true;
        return svc.status === filter;
      })
    : [];

  const summary = health
    ? [
        { label: 'Total', value: health.total, color: '#6b7280' },
        { label: 'Healthy', value: health.up, color: STATUS_COLORS.up },
        { label: 'Degraded', value: health.degraded, color: STATUS_COLORS.degraded },
        { label: 'Offline', value: health.down, color: STATUS_COLORS.down },
      ]
    : [];

  return (
    <div className="screen-container">
      <div className="screen-header">
        <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
          ← Back
        </button>
        <h2>Service Health</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button className="btn btn-secondary" onClick={fetchHealth} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {health && (
        <>
          {/* Summary cards */}
          <div className="summary-grid" style={{ marginBottom: 20 }}>
            {summary.map((s) => (
              <div
                key={s.label}
                style={{
                  padding: '16px 20px',
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Health score */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 8,
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Overall Health:{' '}
              <strong style={{ color: health.healthyPercent >= 80 ? STATUS_COLORS.up : health.healthyPercent >= 50 ? STATUS_COLORS.degraded : STATUS_COLORS.down }}>
                {health.healthyPercent}%
              </strong>
            </div>
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: '#e5e7eb',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${health.healthyPercent}%`,
                  height: '100%',
                  background: health.healthyPercent >= 80 ? STATUS_COLORS.up : health.healthyPercent >= 50 ? STATUS_COLORS.degraded : STATUS_COLORS.down,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              scanned in {health.scanDurationMs}ms
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['all', 'up', 'degraded', 'down'] as const).map((f) => (
              <button
                key={f}
                className={`btn ${filter === f ? '' : 'btn-secondary'}`}
                onClick={() => setFilter(f)}
                style={{ fontSize: 13, padding: '4px 12px' }}
              >
                {f === 'all' ? 'All' : STATUS_LABELS[f]} ({f === 'all' ? health.total : f === 'up' ? health.up : f === 'degraded' ? health.degraded : health.down})
              </button>
            ))}
          </div>

          {/* Service table */}
          <div
            style={{
              borderRadius: 8,
              border: '1px solid var(--border)',
              overflow: 'hidden',
              background: 'var(--card-bg)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Service</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Latency</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>HTTP</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Error</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(([name, svc]) => (
                  <ServiceRow key={name} name={name} svc={svc} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      No services match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && !health && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          Scanning {58} services…
        </div>
      )}
    </div>
  );
}
