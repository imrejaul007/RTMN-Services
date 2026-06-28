import React from 'react';

export default function Analytics() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Analytics</h1>
      <p style={{ color: '#64748b', marginTop: 8 }}>
        Heatmaps, session recordings, funnels, and revenue intelligence.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
        {[
          { title: 'Revenue', value: 'Rs 1,23,456', change: '+18%', icon: '💰' },
          { title: 'Conversions', value: '4.2%', change: '+0.8%', icon: '📈' },
          { title: 'Active Widgets', value: '234', change: '+12', icon: '💬' },
        ].map(m => (
          <div key={m.title} style={{ background: 'white', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{m.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{m.value}</div>
            <div style={{ color: '#22c55e', fontSize: 13 }}>{m.change}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 24, marginTop: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>Event Tracking</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {['page_view','product_view','add_to_cart','checkout_start','purchase_complete','chat_started','cta_clicked','email_opened'].map(e => (
            <div key={e} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>{e}</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>—</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
