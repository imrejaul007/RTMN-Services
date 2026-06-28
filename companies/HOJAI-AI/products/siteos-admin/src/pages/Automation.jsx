import React from 'react';

const RULES = [
  { name: 'Abandoned Cart Recovery', trigger: 'cart_abandon', status: 'active', impact: 'Rs 50K/mo' },
  { name: 'Welcome Series', trigger: 'sign_up', status: 'active', impact: 'Rs 20K/mo' },
  { name: 'Win-Back Campaign', trigger: 'inactive_60d', status: 'active', impact: 'Rs 30K/mo' },
  { name: 'Post-Purchase', trigger: 'purchase_complete', status: 'active', impact: 'Rs 15K/mo' },
  { name: 'Birthday Campaign', trigger: 'birthday', status: 'active', impact: 'Rs 10K/mo' },
  { name: 'Lead Nurture', trigger: 'form_submit', status: 'active', impact: 'Rs 25K/mo' },
];

export default function Automation() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Automation Rules</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>8 rules, 10 templates, automated workflows</p>
        </div>
        <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          + New Rule
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Rule', 'Trigger', 'Status', 'Impact', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RULES.map(rule => (
              <tr key={rule.name} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px', fontWeight: 500 }}>{rule.name}</td>
                <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: 12, background: '#f8fafc' }}>{rule.trigger}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>Active</span>
                </td>
                <td style={{ padding: '16px', fontWeight: 600, color: '#059669' }}>{rule.impact}</td>
                <td style={{ padding: '16px' }}>
                  <button style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', marginRight: 8 }}>Edit</button>
                  <button style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>Pause</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
