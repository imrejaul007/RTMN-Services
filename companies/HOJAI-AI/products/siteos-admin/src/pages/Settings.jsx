import React from 'react';

export default function Settings({ companyId, setCompanyId }) {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Settings</h1>

      <div style={{ maxWidth: 600, marginTop: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px' }}>API Configuration</h3>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>Company ID</span>
            <input
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 8 }}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 13 }}>API Key</span>
            <input type="password" defaultValue="pk_live_..." style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 8 }} />
          </label>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px' }}>Services</h3>
          {[
            { name: 'SiteOS Gateway', port: 5450, on: true },
            { name: 'Business Context', port: 5451, on: true },
            { name: 'Lead Scoring', port: 5458, on: true },
            { name: 'Marketing Automation', port: 5459, on: false },
            { name: 'AdOS', port: 5464, on: false },
            { name: 'AI Advisor', port: 5472, on: false },
          ].map(svc => (
            <label key={svc.port} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <input type="checkbox" defaultChecked={svc.on} />
              <span style={{ flex: 1, fontSize: 14 }}>{svc.name}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>:{svc.port}</span>
              <span style={{ fontSize: 11, background: svc.on ? '#dcfce7' : '#fef2f2', color: svc.on ? '#166534' : '#dc2626', padding: '2px 8px', borderRadius: 4 }}>{svc.on ? 'ON' : 'OFF'}</span>
            </label>
          ))}
        </div>

        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, color: '#e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px', color: 'white' }}>Startup Script</h3>
          <pre style={{ fontSize: 12, overflow: 'auto', margin: 0 }}>
{`#!/bin/bash
# Start all SiteOS services
bash scripts/start-all-siteos.sh`}
          </pre>
          <button style={{ marginTop: 16, background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer' }}>
            Copy Startup Script
          </button>
        </div>
      </div>
    </div>
  );
}
