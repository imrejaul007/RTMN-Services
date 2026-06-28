import React from 'react';

export default function Nexus() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Nexus Connect</h1>
      <p style={{ color: '#64748b', marginTop: 8 }}>Global agentic commerce network</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Nexus Discovery</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Products federated to 500+ agents</p>
          <div style={{ marginTop: 16, fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>234 products synced</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Agent Reputation</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Trust scores across network</p>
          <div style={{ marginTop: 16, fontSize: 32, fontWeight: 700, color: '#22c55e' }}>Trust Score: 94/100</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Product Federation</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Auto-sync to Nexus Discovery</p>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, width: 100 }}>Sync Status</span>
              <div style={{ flex: 1, background: '#f1f5f9', height: 8, borderRadius: 4 }}>
                <div style={{ width: '78%', height: '100%', background: '#3b82f6', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>78%</span>
            </div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Agent Marketplace</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Purchase AI employees from marketplace</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            {['Sales Agent', 'Support Agent', 'Marketing Agent'].map(agent => (
              <span key={agent} style={{ background: '#f1f5f9', padding: '8px 16px', borderRadius: 20, fontSize: 13 }}>
                {agent}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
