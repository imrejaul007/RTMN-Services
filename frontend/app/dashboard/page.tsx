'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Plus, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { auth, services, billing } from '@/lib/api';
import { getToken, clearAuth, getClient } from '@/lib/auth';
import type { Client, Service } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(getClient());
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'catalog' | 'api'>('services');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/auth'); return; }

    Promise.all([
      auth.me(token),
      services.list(),
    ]).then(([me, catalog]) => {
      setClient(me);
      setAllServices(catalog.items || []);
      setLoading(false);
    }).catch(() => {
      clearAuth();
      router.push('/auth');
    });
  }, [router]);

  async function selectService(serviceId: string) {
    const token = getToken();
    if (!token) return;
    setSelecting(serviceId);
    setError('');
    try {
      // Add service (ignore if already selected — 409 means it's in the list)
      try {
        await services.select(token, { serviceId, plan: 'pilot' });
      } catch (err: any) {
        if (!err.message.includes('already')) throw err; // only ignore "already provisioned"
      }
      // Mock pay → activate
      const checkout = await billing.checkout(token, { serviceId, plan: 'pilot' });
      if (checkout.paymentId) {
        await billing.mockConfirm(token, checkout.paymentId);
      }
      const me = await auth.me(token);
      setClient(me);
      setActiveTab('services');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSelecting('');
    }
  }

  async function testApi(serviceId: string, port: number) {
    const el = document.getElementById(`result-${serviceId}`);
    if (!el) return;
    el.textContent = 'Testing...';
    el.style.color = 'var(--muted)';
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        el.textContent = '❌ NEXT_PUBLIC_API_URL not configured';
        el.style.color = 'var(--danger)';
        return;
      }
      const res = await fetch(`${apiUrl}/v1/proxy/${serviceId}/health`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const text = await res.text();
      let fmt;
      try { fmt = JSON.stringify(JSON.parse(text), null, 2); } catch { fmt = text; }
      el.textContent = `✅ ${res.status}\n${fmt}`;
      el.style.color = 'var(--success)';
    } catch (err: any) {
      el.textContent = `❌ Not reachable on port ${port}\nIs the service running?`;
      el.style.color = 'var(--danger)';
    }
  }

  function logout() {
    clearAuth();
    router.push('/');
  }

  if (loading) return (
    <>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--muted)' }}>
        <div className="spinner" style={{ marginRight: 12 }} /> Loading dashboard...
      </div>
    </>
  );

  if (!client) return null;

  const activeSvcs = client.services.filter(s => s.status === 'active');
  const serviceName = (id: string) => allServices.find(s => s.id === id)?.name || id;

  return (
    <>
      <Navbar />
      <main style={{ padding: '32px 24px 60px' }}>
        <div className="container">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Link href="/" style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <ArrowLeft size={14} /> Back to home
              </Link>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>👋 Welcome, {client.contactName}</h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: 4 }}>{client.companyName} · {client.email}</p>
            </div>
            <button onClick={logout} className="btn btn-outline" style={{ gap: 6 }}>
              <LogOut size={15} /> Logout
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
            <div className="stat-card"><div className="stat-value">{client.services.length}</div><div className="stat-label">Selected</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)' }}>{activeSvcs.length}</div><div className="stat-label">Active</div></div>
            <div className="stat-card"><div className="stat-value">{client.status}</div><div className="stat-label">Account</div></div>
            <div className="stat-card"><div className="stat-value" style={{ fontSize: '1rem' }}>{client.id.slice(0, 8)}</div><div className="stat-label">Client ID</div></div>
          </div>

          {client.status !== 'active' && (
            <div className="alert alert-info">⚠️ Email not verified. Check your inbox or contact support.</div>
          )}
          {error && <div className="alert alert-error">{error}</div>}

          {/* Tabs */}
          <div className="tab-nav">
            <button className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
              My Services ({client.services.length})
            </button>
            <button className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>
              Service Catalog
            </button>
            <button className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>
              API Tests
            </button>
          </div>

          {/* Tab: My Services */}
          <div className={`tab-content ${activeTab === 'services' ? 'active' : ''}`}>
            {client.services.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
                <p style={{ marginBottom: 16 }}>No services selected yet.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('catalog')}>
                  <Plus size={16} /> Browse Catalog
                </button>
              </div>
            ) : (
              client.services.map(s => (
                <div key={s.serviceId} className="service-row">
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{serviceName(s.serviceId)}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      Port {s.port} · {s.plan} plan · ${s.pricing?.monthly || 0}/mo
                    </div>
                    {s.activatedAt && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                        Activated {new Date(s.activatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'pending_payment' ? 'badge-yellow' : 'badge-blue'}`}>
                      {s.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {s.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tab: Catalog */}
          <div className={`tab-content ${activeTab === 'catalog' ? 'active' : ''}`}>
            {Object.entries(
              allServices.reduce<Record<string, Service[]>>((acc, s) => {
                acc[s.category] = acc[s.category] || [];
                acc[s.category].push(s);
                return acc;
              }, {})
            ).map(([cat, catSvcs]) => {
              const catsInUse = [...new Set(client.services.map(s => s.serviceId))];
              return (
                <div key={cat} style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                    {cat}
                  </h3>
                  <div className="services-grid">
                    {catSvcs.map(s => {
                      const isSelected = catsInUse.includes(s.id);
                      return (
                        <div key={s.id} className="card" style={{ cursor: 'default' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.name}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4 }}>:{s.port}</span>
                          </div>
                          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 10, lineHeight: 1.5 }}>{s.description}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.88rem' }}>
                              {s.price.pilot === 0 ? 'Custom' : `$${s.price.pilot}/mo`}
                            </span>
                            {s.pilotReady && <span className="badge badge-green">PILOT</span>}
                          </div>
                          <button
                            className={`btn btn-full ${isSelected ? 'btn-success' : 'btn-primary'}`}
                            disabled={isSelected || selecting === s.id}
                            onClick={() => !isSelected && selectService(s.id)}
                          >
                            {selecting === s.id ? <><div className="spinner" /> Selecting...</> : isSelected ? '✓ Selected' : 'Select'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tab: API Tests */}
          <div className={`tab-content ${activeTab === 'api' ? 'active' : ''}`}>
            {activeSvcs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
                Select and activate a service above to test its API.
              </div>
            ) : activeSvcs.map(s => (
              <div key={s.serviceId} className="api-test">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: '1rem' }}>{serviceName(s.serviceId)} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(:{s.port})</span></h3>
                  <span className="badge badge-green">Active</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span className="method method-get">GET</span>
                  <code>/v1/proxy/{s.serviceId}/health</code>
                </div>
                <button className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => testApi(s.serviceId, s.port)}>
                  <RefreshCw size={13} /> Test
                </button>
                <div className="result-box" id={`result-${s.serviceId}`}>Click Test to call...</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}