import { useState, useEffect } from 'react';
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

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  userCount: number;
  createdAt: string;
  status: 'active' | 'suspended' | 'trial';
}

interface SSOSettings {
  provider: 'none' | 'saml' | 'oidc';
  enabled: boolean;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  metadataUrl?: string;
  callbackUrl?: string;
  ssoDomain?: string;
}

interface RolePermission {
  role: string;
  permissions: string[];
}

interface ServiceToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  orgId?: string;
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

// --- OrgManagementTab ---
function OrgManagementTab() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', plan: 'free' });
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ organizations: Organization[] }>('/admin/organizations');
      setOrgs(data.organizations || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createOrg() {
    try {
      await apiPost('/admin/organizations', form);
      setShowForm(false);
      setForm({ name: '', slug: '', plan: 'free' });
      load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    }
  }

  async function toggleStatus(org: Organization) {
    try {
      await apiPost(`/admin/organizations/${org.id}/status`, {
        status: org.status === 'active' ? 'suspended' : 'active'
      });
      load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn" onClick={() => { load(); setShowForm(false); }}>↻ Refresh</button>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Organization'}
        </button>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      {showForm && (
        <div style={{ padding: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Create Organization</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <input placeholder="Organization Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 13 }} />
            <input placeholder="slug (e.g. acme-corp)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} style={{ fontSize: 13 }} />
          </div>
          <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} style={{ fontSize: 13, marginBottom: 12, width: '100%' }}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button className="btn btn-primary" onClick={createOrg} disabled={!form.name || !form.slug}>Create</button>
        </div>
      )}
      {loading ? <div style={{ textAlign: 'center', padding: 24 }}>Loading…</div> : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Slug</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Plan</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Users</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{o.name}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#6b7280' }}>{o.slug}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 9999, background: 'var(--bg)', fontSize: 11 }}>{o.plan}</span></td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{o.userCount}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: o.status === 'active' ? '#22c55e' : o.status === 'trial' ? '#f59e0b' : '#ef4444', fontWeight: 500 }}>{o.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => toggleStatus(o)}>
                      {o.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No organizations</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- SSOTab ---
function SSOTab() {
  const [settings, setSettings] = useState<SSOSettings>({ provider: 'none', enabled: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const data = await apiGet<{ settings: SSOSettings }>('/admin/sso');
      setSettings(data.settings || { provider: 'none', enabled: false });
    } catch (e: any) {
      // endpoint not implemented yet — use defaults
    }
  }

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      await apiPost('/admin/sso', settings);
      setMsg('SSO settings saved successfully.');
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  const FIELDS_BY_PROVIDER: Record<string, string[]> = {
    saml: ['issuer', 'metadataUrl', 'callbackUrl', 'ssoDomain'],
    oidc: ['issuer', 'clientId', 'clientSecret', 'callbackUrl'],
  };

  return (
    <div>
      <h4 style={{ marginBottom: 16 }}>Single Sign-On Configuration</h4>
      <div style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Provider</label>
          <select value={settings.provider} onChange={e => setSettings(s => ({ ...s, provider: e.target.value as SSOSettings['provider'] }))} style={{ fontSize: 13, width: '100%' }}>
            <option value="none">Disabled</option>
            <option value="saml">SAML 2.0</option>
            <option value="oidc">OpenID Connect (OIDC)</option>
          </select>
        </div>
        {settings.provider !== 'none' && (
          <>
            {(FIELDS_BY_PROVIDER[settings.provider] || []).map(field => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>{field}</label>
                <input
                  type={field === 'clientSecret' ? 'password' : 'text'}
                  placeholder={field}
                  value={(settings as any)[field] || ''}
                  onChange={e => setSettings(s => ({ ...s, [field]: e.target.value }))}
                  style={{ fontSize: 13, width: '100%' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))}
                />
                Enable SSO
              </label>
            </div>
          </>
        )}
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
        {msg && <div style={{ marginTop: 12, padding: 8, borderRadius: 6, background: msg.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', fontSize: 13 }}>{msg}</div>}
        <div style={{ marginTop: 20, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
          <strong>Setup Instructions:</strong><br />
          <strong>SAML:</strong> Configure your IdP (Okta, Azure AD, Google Workspace) to use Genie as the SP. Provide the Metadata URL or Issuer from your IdP, and set the Callback URL to the value shown above.<br />
          <strong>OIDC:</strong> Create an OAuth 2.0 app in your IdP. Set redirect URI to the Callback URL. Copy Client ID and Client Secret.
        </div>
      </div>
    </div>
  );
}

// --- RBACTab ---
const ALL_PERMISSIONS = [
  'genie:chat', 'genie:voice', 'genie:briefing', 'genie:calendar',
  'genie:memory', 'genie:search', 'genie:learning', 'genie:wellness',
  'genie:money', 'genie:shopping', 'genie:creation', 'genie:execution',
  'admin:users', 'admin:org', 'admin:sso', 'admin:rbac',
  'admin:audit', 'admin:metrics', 'admin:services',
  'data:export', 'data:delete',
];

const ROLES = ['user', 'org_admin', 'super_admin'];

function RBACTab() {
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const data = await apiGet<{ roles: Record<string, string[]> }>('/admin/rbac');
      setMatrix(data.roles || {});
    } catch (e: any) {
      // not implemented — start with defaults
      const defaults: Record<string, string[]> = {
        user: ['genie:chat', 'genie:voice', 'genie:briefing', 'genie:calendar', 'genie:memory', 'genie:search', 'genie:learning', 'genie:wellness', 'genie:money', 'genie:shopping', 'genie:creation', 'genie:execution'],
        org_admin: [], // inherits all user + org
        super_admin: ALL_PERMISSIONS,
      };
      setMatrix(defaults);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      await apiPost('/admin/rbac', { roles: matrix });
      setMsg('RBAC matrix saved.');
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  function togglePerm(role: string, perm: string) {
    setMatrix(prev => {
      const perms = prev[role] || [];
      return { ...prev, [role]: perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm] };
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4>Role × Permission Matrix</h4>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Matrix'}</button>
      </div>
      {msg && <div style={{ marginBottom: 12, padding: 8, borderRadius: 6, background: msg.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', fontSize: 13 }}>{msg}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Permission</th>
              {ROLES.map(r => <th key={r} style={{ padding: '8px 10px', textAlign: 'center' }}>{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSIONS.map(perm => (
              <tr key={perm} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{perm}</td>
                {ROLES.map(role => (
                  <td key={role} style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={(matrix[role] || []).includes(perm)}
                      onChange={() => togglePerm(role, perm)}
                      disabled={role === 'super_admin'}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- AgentConfigTab ---
const DEFAULT_SERVICES: ServiceToggle[] = [
  { id: 'calendar', name: 'Calendar', description: 'Scheduling and meeting management', enabled: true },
  { id: 'memory-inbox', name: 'Memory Inbox', description: 'Universal memory capture', enabled: true },
  { id: 'briefing', name: 'Daily Briefing', description: 'Morning/Evening briefings', enabled: true },
  { id: 'search', name: 'Universal Search', description: 'Search memories, twins, calendar', enabled: true },
  { id: 'serendipity', name: 'Serendipity', description: 'Random memory resurfacing', enabled: true },
  { id: 'forgetting', name: 'Smart Forgetting', description: 'Auto-archive expired items', enabled: true },
  { id: 'wellness', name: 'Wellness Agent', description: 'Health and wellness coaching', enabled: true },
  { id: 'money', name: 'Money Agent', description: 'Financial management and insights', enabled: true },
  { id: 'shopping', name: 'Shopping Agent', description: 'Product research and purchasing', enabled: true },
  { id: 'learning', name: 'Learning Agent', description: 'Personalized learning paths', enabled: true },
  { id: 'creation', name: 'Creation Agent', description: 'Content creation and brainstorming', enabled: true },
  { id: 'execution', name: 'Execution Agent', description: 'Task and project execution', enabled: true },
];

function AgentConfigTab() {
  const [services, setServices] = useState<ServiceToggle[]>(DEFAULT_SERVICES);
  const [orgId, setOrgId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    if (!orgId) return;
    try {
      const data = await apiGet<{ services: ServiceToggle[] }>(`/admin/orgs/${orgId}/services`);
      if (data.services?.length) setServices(data.services);
    } catch (e: any) {
      // fall back to defaults
    }
  }

  function toggle(id: string) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      await apiPost(`/admin/orgs/${orgId}/services`, { services });
      setMsg('Service configuration saved.');
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ fontSize: 13 }}>Organization ID:</label>
        <input
          placeholder="Enter org ID to configure…"
          value={orgId}
          onChange={e => setOrgId(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button className="btn" onClick={load} disabled={!orgId}>Load</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !orgId}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      {msg && <div style={{ marginBottom: 12, padding: 8, borderRadius: 6, background: msg.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', fontSize: 13 }}>{msg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {services.map(s => (
          <div key={s.id} style={{ padding: 14, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{s.description}</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: 8 }}>
                <input type="checkbox" checked={s.enabled} onChange={() => toggle(s.id)} />
              </label>
            </div>
          </div>
        ))}
      </div>
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

type Tab = 'users' | 'usage' | 'audit' | 'metrics' | 'services' | 'orgs' | 'sso' | 'rbac' | 'agent-config';

export default function AdminScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('users');
  const user = getUser();

  const TABS: { id: Tab; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'orgs', label: 'Organizations' },
    { id: 'rbac', label: 'RBAC' },
    { id: 'sso', label: 'SSO' },
    { id: 'agent-config', label: 'Agent Config' },
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
      {tab === 'orgs' && <OrgManagementTab />}
      {tab === 'rbac' && <RBACTab />}
      {tab === 'sso' && <SSOTab />}
      {tab === 'agent-config' && <AgentConfigTab />}
      {tab === 'services' && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Navigate to <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => navigate('/admin/services')}>Service Health</button> for detailed service status.</div>}
      {tab === 'usage' && <UsageTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'metrics' && <MetricsTab />}
    </div>
  );
}
