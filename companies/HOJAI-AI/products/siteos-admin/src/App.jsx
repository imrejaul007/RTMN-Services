import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Widgets from './pages/Widgets';
import Analytics from './pages/Analytics';
import Automation from './pages/Automation';
import Integrations from './pages/Integrations';
import Nexus from './pages/Nexus';
import Settings from './pages/Settings';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/widgets', label: 'Widgets', icon: '💬' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/automation', label: 'Automation', icon: '⚡' },
  { to: '/integrations', label: 'Integrations', icon: '🔌' },
  { to: '/nexus', label: 'Nexus', icon: '🌐' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [companyId, setCompanyId] = useState('demo-company');
  const [apiKey, setApiKey] = useState('pk_live_...');
  const [services, setServices] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    checkServices();
  }, []);

  async function checkServices() {
    const ports = [5450,5451,5452,5453,5454,5455,5456,5457,5458,5459,5460,5461,5462,5463,5464,5465,5466,5467,5468,5469,5470,5471,5472,5473,5474,5475];
    const results = {};
    for (const port of ports) {
      try {
        const r = await fetch(`http://localhost:${port}/health`).catch(() => null);
        results[port] = r ? 'healthy' : 'unreachable';
      } catch { results[port] = 'unreachable'; }
    }
    setServices(results);
  }

  const healthy = Object.values(services).filter(s => s === 'healthy').length;
  const total = Object.keys(services).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui' }}>
      {/* Sidebar */}
      <nav style={{ width: 240, background: '#1e293b', color: 'white', padding: '20px 0' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #334155', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>HOJAI SiteOS</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>Admin Dashboard</p>
        </div>

        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px',
            color: isActive ? '#3b82f6' : '#94a3b8',
            background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
            borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
            textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 400,
            transition: 'all 0.2s'
          })}>
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Services: {healthy}/{total}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[...Array(27)].map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: services[5450+i] === 'healthy' ? '#22c55e' : '#ef4444'
              }} />
            ))}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, padding: 24, background: '#f8fafc', overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard companyId={companyId} />} />
          <Route path="/widgets" element={<Widgets />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/nexus" element={<Nexus />} />
          <Route path="/settings" element={<Settings companyId={companyId} setCompanyId={setCompanyId} />} />
        </Routes>
      </main>
    </div>
  );
}
