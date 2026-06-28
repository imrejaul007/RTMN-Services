/**
 * Shopify App Main Component
 */
import React, { useState, useEffect } from 'react';

function App() {
  const [shop, setShop] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get shop from URL
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop');
    const authStatus = params.get('auth');

    if (shopParam) {
      setShop(shopParam);
      checkAuth(shopParam);
    } else {
      setLoading(false);
    }
  }, []);

  async function checkAuth(shop) {
    try {
      const res = await fetch(`/auth/status?shop=${shop}`);
      const data = await res.json();
      setAuthenticated(data.authenticated);
      if (data.authenticated) {
        loadConfig(shop);
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    }
    setLoading(false);
  }

  async function loadConfig(shop) {
    try {
      const res = await fetch(`/api/widget/config/${shop}`);
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch (e) {
      console.error('Config load failed:', e);
    }
  }

  async function updateConfig(updates) {
    try {
      const res = await fetch(`/api/widget/config/${shop}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        alert('Settings saved!');
      }
    } catch (e) {
      alert('Failed to save settings');
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!shop) {
    return (
      <div className="container">
        <h1>HOJAI SiteOS</h1>
        <p>Please access this app from your Shopify admin.</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="container">
        <h1>HOJAI SiteOS</h1>
        <p>Installing on {shop}...</p>
        <a href={`/auth/shopify?shop=${shop}`} className="btn-primary">
          Connect Shopify
        </a>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>HOJAI SiteOS</h1>
        <p>Connected to {shop}</p>
      </header>

      <main className="app-main">
        <section className="dashboard">
          <h2>Dashboard</h2>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">Active</span>
              <span className="stat-label">Widget Status</span>
            </div>
          </div>
        </section>

        <section className="settings">
          <h2>Widget Settings</h2>

          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target;
            updateConfig({
              color: form.color.value,
              position: form.position.value,
              greeting: form.greeting.value
            });
          }}>
            <div className="form-group">
              <label>Primary Color</label>
              <input
                type="color"
                name="color"
                defaultValue={config?.color || '#3B82F6'}
              />
            </div>

            <div className="form-group">
              <label>Position</label>
              <select name="position" defaultValue={config?.position || 'bottom-right'}>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>

            <div className="form-group">
              <label>Greeting Message</label>
              <input
                type="text"
                name="greeting"
                defaultValue={config?.greeting || 'Hi! How can I help you?'}
                placeholder="Hi! How can I help you?"
              />
            </div>

            <button type="submit" className="btn-primary">
              Save Settings
            </button>
          </form>
        </section>

        <section className="preview">
          <h2>Widget Preview</h2>
          <div className="preview-box" style={{
            backgroundColor: config?.color || '#3B82F6',
            position: config?.position || 'bottom-right'
          }}>
            <div className="preview-bubble">
              {config?.greeting || 'Hi! How can I help you?'}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .app { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        .app-header { background: #fff; padding: 20px; border-bottom: 1px solid #ddd; }
        .app-header h1 { margin: 0; font-size: 24px; }
        .app-main { padding: 20px; max-width: 800px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
        .form-group input[type="text"],
        .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .btn-primary { background: #3B82F6; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-primary:hover { background: #2563EB; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { display: block; font-size: 24px; font-weight: 700; }
        .stat-label { display: block; color: #666; font-size: 14px; }
      `}</style>
    </div>
  );
}

export default App;
