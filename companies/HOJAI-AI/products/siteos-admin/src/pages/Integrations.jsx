import React from 'react';

const INTEGRATIONS = [
  { name: 'Shopify', logo: '🛒', status: 'connected', type: 'installer' },
  { name: 'WooCommerce', logo: '🛍️', status: 'connected', type: 'installer' },
  { name: 'WordPress', logo: '📝', status: 'connected', type: 'installer' },
  { name: 'MemoryOS', logo: '🧠', status: 'connected', type: 'foundation' },
  { name: 'TwinOS', logo: '👤', status: 'connected', type: 'foundation' },
  { name: 'AgentOS', logo: '🤖', status: 'connected', type: 'foundation' },
  { name: 'Sales OS', logo: '📈', status: 'connected', type: 'department' },
  { name: 'Marketing OS', logo: '📣', status: 'connected', type: 'department' },
  { name: 'Nexha Network', logo: '🌐', status: 'connected', type: 'nexus' },
  { name: 'Genie', logo: '🧞', status: 'connected', type: 'ai' },
  { name: 'Voice Gateway', logo: '🎙️', status: 'connected', type: 'ai' },
  { name: 'FlowOS', logo: '⚡', status: 'connected', type: 'foundation' },
];

export default function Integrations() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Integrations</h1>
      <p style={{ color: '#64748b', marginTop: 8 }}>Connect HOJAI SiteOS to your tools and RTMN services</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
        {INTEGRATIONS.map(int => (
          <div key={int.name}
            style={{
              background: 'white', borderRadius: 12, padding: 16,
              border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12
            }}>
            <span style={{ fontSize: 24 }}>{int.logo}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{int.name}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{int.type}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 4 }}>
              {int.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
