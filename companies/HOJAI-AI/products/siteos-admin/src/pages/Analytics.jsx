import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5489';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtime, setRealtime] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    // Refresh realtime every 30 seconds
    const interval = setInterval(fetchRealtime, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [revenueRes, realtimeRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/revenue`),
        fetch(`${API_BASE}/api/analytics/realtime`)
      ]);
      const revenue = await revenueRes.json();
      const rt = await realtimeRes.json();
      setData(revenue);
      setRealtime(rt);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtime = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/realtime`);
      const rt = await res.json();
      setRealtime(rt);
    } catch (err) {
      console.error('Failed to fetch realtime:', err);
    }
  };

  const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
  const formatPercent = (n) => `${(n || 0).toFixed(1)}%`;
  const formatNumber = (n) => (n || 0).toLocaleString();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ color: '#64748b' }}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Analytics</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Real-time metrics, revenue, and conversion intelligence.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Realtime Stats */}
      {realtime && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Live</span>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <span style={{ color: '#64748b', fontSize: 12 }}>Active Visitors: </span>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{realtime.activeVisitors}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 12 }}>Events/min: </span>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{realtime.eventsPerMinute}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 12 }}>Conv. Rate: </span>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>{realtime.conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue & Conversion Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data?.totalRevenue)}
          change={data?.revenueGrowth ? `+${data.revenueGrowth}%` : '—'}
          icon="💰"
        />
        <StatCard
          title="Total Orders"
          value={formatNumber(data?.totalOrders)}
          change={data?.ordersGrowth ? `${data.ordersGrowth > 0 ? '+' : ''}${data.ordersGrowth}%` : '—'}
          icon="📦"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(data?.avgOrderValue)}
          change="—"
          icon="🛒"
        />
        <StatCard
          title="Conversion Rate"
          value={formatPercent(data?.byDay?.[data.byDay?.length - 1]?.orders / data?.byDay?.[data.byDay?.length - 1]?.visitors * 100)}
          change="—"
          icon="📈"
        />
      </div>

      {/* Revenue by Channel */}
      {data?.byChannel && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Revenue by Channel</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {Object.entries(data.byChannel).map(([channel, value]) => (
              <div key={channel} style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>
                  {channel === 'organic' ? '🔍' : channel === 'paid' ? '📢' : channel === 'social' ? '📱' : '🌐'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{formatCurrency(value)}</div>
                <div style={{ color: '#64748b', fontSize: 12, textTransform: 'capitalize' }}>{channel}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Trend */}
      {data?.byDay?.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>7-Day Revenue Trend</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
            {data.byDay.map((day, i) => {
              const maxRevenue = Math.max(...data.byDay.map(d => d.revenue));
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 120 : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: '100%',
                      height: height,
                      background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)',
                      borderRadius: 4,
                      transition: 'height 0.3s'
                    }}
                    title={formatCurrency(day.revenue)}
                  />
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Tracking Grid */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>Event Tracking</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'purchase_complete', 'chat_started', 'cta_clicked', 'email_opened'].map(e => (
            <div key={e} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{e.replace('_', ' ')}</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>—</div>
            </div>
          ))}
        </div>
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          Connect event-tracker service (port 5453) to see real event counts
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ title, value, change, icon }) {
  const isPositive = change && !change.startsWith('-') && change !== '—';
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{title}</div>
      {change && change !== '—' && (
        <div style={{ color: isPositive ? '#22c55e' : '#ef4444', fontSize: 13, marginTop: 4 }}>
          {change}
        </div>
      )}
    </div>
  );
}
