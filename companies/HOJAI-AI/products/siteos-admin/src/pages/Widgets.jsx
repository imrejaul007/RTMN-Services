import React from 'react';

export default function Widgets() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Widget Configuration</h1>
      <p style={{ color: '#64748b', marginTop: 8 }}>
        Configure your widget settings, appearance, and behavior.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        {/* Appearance */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Appearance</h3>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: 13 }}>Primary Color</span>
            <input type="color" defaultValue="#3B82F6" style={{ display: 'block', marginTop: 4, width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: 13 }}>Position</span>
            <select style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <option>Bottom Right</option>
              <option>Bottom Left</option>
            </select>
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 13 }}>Greeting Message</span>
            <input type="text" defaultValue="Hi! How can I help you?" style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 8 }} />
          </label>
        </div>

        {/* Install */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Install Code</h3>
          <div style={{ background: '#1e293b', color: '#e2e8f0', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, marginBottom: 16 }}>
{`<script src="https://cdn.hojai.ai/widget.js">`}<br />
{`</script>`}
          </div>
          <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Copy Code
          </button>
        </div>
      </div>
    </div>
  );
}
