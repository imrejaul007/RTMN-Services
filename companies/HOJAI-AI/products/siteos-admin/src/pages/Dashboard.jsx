import React, { useState, useEffect } from 'react';

const SERVICES = [
  { port: 5450, name: 'SiteOS Gateway', desc: '40+ routes to RTMN services' },
  { port: 5451, name: 'Business Context', desc: 'Genie for owners' },
  { port: 5452, name: 'Channel Stitcher', desc: 'Identity resolution' },
  { port: 5453, name: 'Event Tracker', desc: '100 event types' },
  { port: 5454, name: 'Heatmap Aggregator', desc: 'Click/scroll analysis' },
  { port: 5455, name: 'Vertical Templates', desc: 'Retail/Restaurant/Hotel/Healthcare/RealEstate' },
  { port: 5456, name: 'Review Scrapers', desc: 'Google/social/app store' },
  { port: 5457, name: 'Lookalike Generator', desc: 'Best customers → ad audiences' },
  { port: 5458, name: 'Lead Scoring', desc: '0-100 score, velocity' },
  { port: 5459, name: 'Marketing Automation', desc: '8 rules, 10 templates' },
  { port: 5460, name: 'Customer Twin Full', desc: 'Identity/behavior/predictive' },
  { port: 5461, name: 'Event Taxonomy', desc: '100+ event types' },
  { port: 5462, name: 'Workflow Visual Builder', desc: 'Drag-drop workflows' },
  { port: 5463, name: 'Voice Widget', desc: 'TTS/STT/IVR' },
  { port: 5464, name: 'AdOS', desc: 'Meta CAPI/Google/TikTok' },
  { port: 5465, name: 'CRM Connectors', desc: 'HubSpot/Salesforce/Zoho' },
  { port: 5466, name: 'Knowledge Base', desc: 'RAG FAQ/docs' },
  { port: 5467, name: 'A/B Testing', desc: 'Traffic split + significance' },
  { port: 5468, name: 'Product Federation', desc: 'Nexus Discovery sync' },
  { port: 5469, name: 'Agent Protocol', desc: 'ACP/negotiation' },
  { port: 5470, name: 'DO App Integration', desc: 'Catalog/order routing' },
  { port: 5471, name: 'Agent Reputation', desc: 'Trust scores' },
  { port: 5472, name: 'AI Business Advisor', desc: 'Natural language Q&A' },
  { port: 5473, name: 'Campaign Auto-Creation', desc: 'Auto campaigns' },
  { port: 5474, name: 'Dynamic Pricing', desc: 'Demand/competitor-aware' },
  { port: 5475, name: 'Benchmark Database', desc: 'Industry comparisons' },
];

export default function Dashboard() {
  const [services, setServices] = useState({});
  const [stats, setStats] = useState({ visitors: 0, conversations: 0, events: 0, revenue: 0 });

  useEffect(() => { checkAll(); }, []);

  async function checkAll() {
    const results = {};
    for (const svc of SERVICES) {
      try {
        const r = await fetch(`http://localhost:${svc.port}/health`).catch(() => null);
        results[svc.port] = r ? 'healthy' : 'unreachable';
      } catch { results[svc.port] = 'unreachable'; }
    }
    setServices(results);
    setStats({ visitors: 1234, conversations: 567, events: 8901, revenue: 123456 });
  }

  const healthy = Object.values(results).filter(s => s === 'healthy').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>HOJAI SiteOS Dashboard</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>27 services, {healthy} healthy</p>
        by <span style={{ color: '#3b82f6' }}>Rejaul Karim</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={checkAll} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Visitors', value: stats.visitors.toLocaleString(), change: '+12%', color: '#3b82f6' },
          { label: 'AI Conversations', value: stats.conversations.toLocaleString(), change: '+8%', color: '#22c55e' },
          { label: 'Events Tracked', value: stats.events.toLocaleString(), change: '+23%', color: '#f59e0b' },
          { label: 'Revenue Impact', value: `Rs ${(stats.revenue/1000}K`, change: '+18%', color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>{stat.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#22c55e' }}>{stat.change} vs last week</div>
          </div>
        ))}

      {/* Service Grid */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Services ({healthy}/27 healthy)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {SERVICES.map(svc => (
          <div key={svc.port}
            style={{
              background: services[svc.port] === 'healthy' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${services[svc.port] === 'healthy' ? '#86efac' : '#fca5a5'}`,
              borderRadius: 8, padding: 12
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{svc.name}</span>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: services[svc.port] === 'healthy' ? '#22c55e' : '#ef4444'
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{svc.desc}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Port {svc.port}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
