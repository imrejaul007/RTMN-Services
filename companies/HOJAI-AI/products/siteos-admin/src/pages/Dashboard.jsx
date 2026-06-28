import React, { useState, useEffect } from 'react';

const SERVICES = [
  // Core Gateway (5450-5468)
  { port: 5450, name: 'SiteOS Gateway', desc: '46+ routes to all services', group: 'Core' },
  { port: 5451, name: 'Business Context', desc: 'Genie for owners', group: 'Core' },
  { port: 5452, name: 'Channel Stitcher', desc: 'Identity resolution', group: 'Core' },
  { port: 5453, name: 'Event Tracker', desc: '100 event types', group: 'Core' },
  { port: 5454, name: 'Heatmap Aggregator', desc: 'Click/scroll analysis', group: 'Core' },
  { port: 5455, name: 'Vertical Templates', desc: '26 Industry OS', group: 'Core' },
  { port: 5456, name: 'Review Scrapers', desc: 'Google/social/app store', group: 'Core' },
  { port: 5457, name: 'Lookalike Generator', desc: 'Best customers → ad audiences', group: 'Core' },
  { port: 5458, name: 'Lead Scoring', desc: '0-100 score, velocity', group: 'Intelligence' },
  { port: 5459, name: 'Marketing Automation', desc: '8 rules, 10 templates', group: 'Intelligence' },
  { port: 5460, name: 'Customer Twin', desc: 'Identity/behavior/predictive', group: 'Intelligence' },
  { port: 5461, name: 'Event Taxonomy', desc: '100+ event types', group: 'Intelligence' },
  { port: 5462, name: 'Workflow Builder', desc: 'Drag-drop workflows', group: 'Intelligence' },
  { port: 5463, name: 'Voice Widget', desc: 'TTS/STT/IVR', group: 'Intelligence' },
  { port: 5464, name: 'AdOS', desc: 'Meta CAPI/Google/TikTok', group: 'Intelligence' },
  { port: 5465, name: 'CRM Connectors', desc: 'HubSpot/Salesforce/Zoho', group: 'Intelligence' },
  { port: 5466, name: 'Knowledge Base', desc: 'RAG FAQ/docs', group: 'Intelligence' },
  { port: 5467, name: 'A/B Testing', desc: 'Traffic split + significance', group: 'Intelligence' },
  { port: 5468, name: 'Product Federation', desc: 'Nexha Discovery sync', group: 'Integration' },
  // Commerce (5476-5485)
  { port: 5476, name: 'Product Catalog', desc: 'Products, categories, search', group: 'Commerce' },
  { port: 5477, name: 'Cart Service', desc: 'Cart, coupons, discounts', group: 'Commerce' },
  { port: 5478, name: 'Checkout', desc: 'Orders, addresses, shipping', group: 'Commerce' },
  { port: 5479, name: 'Payment Gateway', desc: 'Razorpay, UPI, QR', group: 'Commerce' },
  { port: 5480, name: 'Review Collection', desc: 'Active reviews, sentiment', group: 'Commerce' },
  { port: 5481, name: 'Loyalty Connector', desc: 'Points, tiers, rewards', group: 'Commerce' },
  { port: 5482, name: 'Support Widget', desc: 'Tickets, live chat', group: 'Commerce' },
  { port: 5483, name: 'WhatsApp Broadcast', desc: 'Campaigns, sequences', group: 'Commerce' },
  { port: 5484, name: 'Native CRM', desc: 'Contacts, deals, tasks', group: 'Commerce' },
  { port: 5485, name: 'Sales Pipeline', desc: 'Kanban, quotes', group: 'Commerce' },
  // Communication (5486-5491)
  { port: 5486, name: 'Email Service', desc: 'SMTP, templates, tracking', group: 'Communication' },
  { port: 5487, name: 'SMS Service', desc: 'Twilio, MSG91, DLT', group: 'Communication' },
  { port: 5488, name: 'Push Service', desc: 'Web push, FCM', group: 'Communication' },
  { port: 5489, name: 'Analytics API', desc: 'Real-time metrics, funnels', group: 'Communication' },
  { port: 5490, name: 'Multi-Currency', desc: '10+ currencies, RTL', group: 'Communication' },
  { port: 5491, name: 'i18n Service', desc: '15+ locales, translations', group: 'Communication' },
  // Business (5492-5494)
  { port: 5492, name: 'Social Connector', desc: 'Social media posting', group: 'Business' },
  { port: 5493, name: 'Affiliate System', desc: 'Partners, commissions', group: 'Business' },
  { port: 5494, name: 'Subscription Billing', desc: 'Plans, usage, invoices', group: 'Business' },
  { port: 5469, name: 'Agent Protocol', desc: 'ACP/negotiation', group: 'Integration' },
  { port: 5470, name: 'DO App Integration', desc: 'Catalog/order routing', group: 'Integration' },
  { port: 5471, name: 'Agent Reputation', desc: 'Trust scores', group: 'Integration' },
  { port: 5472, name: 'AI Business Advisor', desc: 'Natural language Q&A', group: 'Intelligence' },
  { port: 5473, name: 'Campaign Auto-Creation', desc: 'Auto campaigns', group: 'Intelligence' },
  { port: 5474, name: 'Dynamic Pricing', desc: 'Demand/competitor pricing', group: 'Intelligence' },
  { port: 5475, name: 'Benchmark Database', desc: 'Industry benchmarks', group: 'Intelligence' },
];

const GROUP_COLORS = {
  Core: '#3b82f6',
  Intelligence: '#8b5cf6',
  Commerce: '#22c55e',
  Communication: '#f59e0b',
  Business: '#ef4444',
  Integration: '#06b6d4',
};

export default function Dashboard() {
  const [health, setHealth] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    const results = {};
    for (const svc of SERVICES) {
      try {
        const res = await fetch(`http://localhost:${svc.port}/health`);
        if (res.ok) {
          const data = await res.json();
          results[svc.port] = { status: 'healthy', data };
        } else {
          results[svc.port] = { status: 'error' };
        }
      } catch {
        results[svc.port] = { status: 'offline' };
      }
    }
    setHealth(results);
    setLoading(false);
  };

  const healthyCount = Object.values(health).filter(h => h.status === 'healthy').length;
  const totalCount = SERVICES.length;

  // Group services by category
  const groups = SERVICES.reduce((acc, svc) => {
    if (!acc[svc.group]) acc[svc.group] = [];
    acc[svc.group].push(svc);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>SiteOS Dashboard</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            {healthyCount} of {totalCount} services running
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '🔄 Checking...' : '🔄 Check Health'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#22c55e', borderRadius: 12, padding: 20, color: 'white' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{healthyCount}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Healthy</div>
        </div>
        <div style={{ background: '#64748b', borderRadius: 12, padding: 20, color: 'white' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{totalCount - healthyCount}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Offline/Error</div>
        </div>
        <div style={{ background: '#3b82f6', borderRadius: 12, padding: 20, color: 'white' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{totalCount}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Total Services</div>
        </div>
        <div style={{ background: '#8b5cf6', borderRadius: 12, padding: 20, color: 'white' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{Math.round((healthyCount / totalCount) * 100)}%</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Uptime</div>
        </div>
      </div>

      {/* Services by Group */}
      {Object.entries(groups).map(([group, svcs]) => (
        <div key={group} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: GROUP_COLORS[group] || '#64748b'
            }} />
            {group}
            <span style={{ color: '#64748b', fontWeight: 400, fontSize: 14 }}>
              ({svcs.filter(s => health[s.port]?.status === 'healthy').length}/{svcs.length})
            </span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {svcs.map(svc => (
              <ServiceCard key={svc.port} svc={svc} health={health[svc.port]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ServiceCard({ svc, health }) {
  const statusColors = {
    healthy: '#22c55e',
    offline: '#64748b',
    error: '#ef4444',
  };
  const statusColor = statusColors[health?.status] || '#64748b';

  return (
    <div style={{
      background: 'white',
      borderRadius: 8,
      padding: 16,
      borderLeft: `4px solid ${statusColor}`,
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.name}</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{svc.desc}</div>
        </div>
        <span style={{
          background: statusColor,
          color: 'white',
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {svc.port}
        </span>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: statusColor }}>
        {health?.status === 'healthy' ? '✓ Online' :
         health?.status === 'error' ? '✗ Error' : '○ Offline'}
      </div>
    </div>
  );
}
