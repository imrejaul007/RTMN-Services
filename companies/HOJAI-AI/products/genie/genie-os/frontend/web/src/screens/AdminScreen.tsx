import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, getUser } from '../services/api';

// --- Types ---
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  onboardingComplete?: boolean;
  preferences?: any;
}

interface UsageData {
  period: { days: number; since: string; to: string };
  users: { total: number; activeInPeriod: number };
  sessions: { total: number; activeInPeriod: number };
  roleBreakdown: { role: string; count: number }[];
  dailyActive: { _id: string; count: number }[];
  topActions: { action: string; count: number }[];
}

interface AuditLog {
  action: string;
  userEmail?: string;
  targetType: string;
  targetId?: string;
  details?: any;
  ip?: string;
  createdAt: string;
}

// --- Sub-components ---

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  async function load(p = 1) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (search) params.set('search', search);
      const data = await apiGet<{ users: User[]; total: number }>(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(user: User, newRole: string) {
    try {
      await apiPost(`/admin/users/${user.id}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    }
  }

  const ROLES = ['user', 'admin', 'org_admin', 'super_admin'];
  const currentUser = getUser();
  const maxRole = currentUser?.role || 'user';

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={() => load(1)}>Search</button>
        <button className="btn btn-secondary" onClick={() => load(page)}>Refresh</button>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Joined</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Onboarded</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}>{u.name}</td>
                <td style={{ padding: '10px 12px' }}>{u.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  <select
                    value={u.role || 'user'}
                    onChange={(e) => changeRole(u, e.target.value)}
                    disabled={maxRole === 'user' || (u.role === 'super_admin' && maxRole !== 'super_admin')}
                    style={{ fontSize: 12 }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {u.onboardingComplete ? '✅' : '⏳'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {u.preferences?.deactivated ? (
                    <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={async () => {
                      await apiPost(`/admin/users/${u.id}/reactivate`, {});
                      load(page);
                    }}>Reactivate</button>
                  ) : (
                    <button className="btn btn-secondary" style={{ fontSize: 11, color: '#ef4444' }} onClick={async () => {
                      if (!confirm(`Deactivate ${u.email}?`)) return;
                      await apiPost(`/admin/users/${u.id}/deactivate`, {});
                      load(page);
                    }}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
          <span style={{ lineHeight: '36px', fontSize: 13, color: '#6b7280' }}>Page {page} of {Math.ceil(total / limit)}</span>
          <button className="btn btn-secondary" disabled={page * limit >= total} onClick={() => load(page + 1)}>Next →</button>
        </div>
      )}
      {loading && <div style={{ textAlign: 'center', padding: 16, color: '#6b7280' }}>Loading…</div>}
    </div>
  );
}

function UsageTab() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  async function load() {
    setLoading(true);
    try {
      const d = await apiGet<UsageData>(`/admin/usage?days=${days}`);
      setData(d);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <label style={{ fontSize: 13 }}>Period:</label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ fontSize: 13 }}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <button className="btn" onClick={load} disabled={loading}>{loading ? '…' : 'Load'}</button>
      </div>
      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Users" value={data.users.total} />
            <StatCard label="Active (period)" value={data.users.activeInPeriod} />
            <StatCard label="Total Sessions" value={data.sessions.total} />
            <StatCard label="Sessions (period)" value={data.sessions.activeInPeriod} />
          </div>
          {data.roleBreakdown.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 8 }}>User Roles</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.roleBreakdown.map((r) => (
                  <span key={r.role} style={{ padding: '4px 12px', borderRadius: 9999, background: 'var(--bg)', fontSize: 13, border: '1px solid var(--border)' }}>
                    {r.role}: <strong>{r.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.topActions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 8 }}>Top Actions</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Action</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topActions.map((a) => (
                      <tr key={a.action} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{a.action}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{a.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {!data && !loading && <div style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>Click "Load" to fetch usage data.</div>}
    </div>
  );
}

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;
  const [actionFilter, setActionFilter] = useState('');

  async function load(p = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (actionFilter) params.set('action', actionFilter);
      const data = await apiGet<{ logs: AuditLog[]; total: number }>(`/admin/audit?${params}`);
      setLogs(data.logs);
      setTotal(data.total);
      setPage(p);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={() => load(1)}>Filter</button>
        <button className="btn btn-secondary" onClick={() => load(page)}>Refresh</button>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Time</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Action</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>User</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Target</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#6b7280' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }}>{log.action}</td>
                <td style={{ padding: '8px 10px' }}>{log.userEmail || '—'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }}>
                  {log.targetType}:{log.targetId || '—'}
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }}>{log.ip || '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No audit logs</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
          <span style={{ lineHeight: '36px', fontSize: 13, color: '#6b7280' }}>Page {page}</span>
          <button className="btn btn-secondary" disabled={page * limit >= total} onClick={() => load(page + 1)}>Next →</button>
        </div>
      )}
      {loading && <div style={{ textAlign: 'center', padding: 16, color: '#6b7280' }}>Loading…</div>}
    </div>
  );
}

function MetricsTab() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await apiGet<any>('/admin/metrics');
      setMetrics(d);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn" onClick={load} disabled={loading} style={{ marginBottom: 16 }}>
        {loading ? '…' : '↻ Refresh Metrics'}
      </button>
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="PID" value={metrics.pid} />
          <StatCard label="Uptime" value={metrics.uptimeHuman} />
          <StatCard label="Heap Used" value={`${metrics.memory.heapUsed} MB`} />
          <StatCard label="Heap Total" value={`${metrics.memory.heapTotal} MB`} />
          <StatCard label="RSS" value={`${metrics.memory.rss} MB`} />
          <StatCard label="Node" value={metrics.versions.node} />
          <StatCard label="MongoDB" value={metrics.env.mongoConnected ? '✅ Connected' : '❌ Disconnected'} />
          <StatCard label="Env" value={metrics.env.nodeEnv} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// --- Main AdminScreen ---

type Tab = 'users' | 'usage' | 'audit' | 'metrics' | 'services';

export default function AdminScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('users');
  const user = getUser();

  const TABS: { id: Tab; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'services', label: 'Service Health' },
    { id: 'usage', label: 'Usage Analytics' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'metrics', label: 'Runtime Metrics' },
  ];

  return (
    <div className="screen-container">
      <div className="screen-header">
        <button className="btn btn-secondary" onClick={() => navigate('/home')}>← Back</button>
        <h2>Admin Panel</h2>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          Logged in as <strong>{user?.name || 'Unknown'}</strong> ({user?.role || 'user'})
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === 'services') { navigate('/admin/services'); return; }
              setTab(t.id);
            }}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === t.id ? 'var(--primary)' : '#6b7280',
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'usage' && <UsageTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'metrics' && <MetricsTab />}
    </div>
  );
}
