/**
 * RAZO KEYBOARD - STATE 5: APP LAUNCHER
 * Shows all RTNM apps for quick access
 */

import React, { useState } from 'react';
import { useKeyboard } from './Keyboard';

interface AppItem {
  id: string;
  name: string;
  icon: string;
  deeplink: string;
  color: string;
}

const APPS: AppItem[] = [
  { id: 'airzy', name: 'Airzy', icon: '✈️', deeplink: 'airzy://', color: '#007AFF' },
  { id: 'stayown', name: 'StayOwn', icon: '🏨', deeplink: 'stayown://', color: '#FF9500' },
  { id: 'khaimove', name: 'KHAIRMOVE', icon: '🚗', deeplink: 'khaimove://', color: '#34C759' },
  { id: 'wallet', name: 'Wallet', icon: '💰', deeplink: 'rezwallet://', color: '#FF2D55' },
  { id: 'risacare', name: 'RisaCare', icon: '🏥', deeplink: 'risacare://', color: '#5856D6' },
  { id: 'nexha', name: 'Nexha', icon: '🛒', deeplink: 'nexha://', color: '#AF52DE' },
  { id: 'corpperks', name: 'CorpPerks', icon: '💼', deeplink: 'corpperks://', color: '#007AFF' },
  { id: 'genie', name: 'Genie', icon: '🤖', deeplink: 'genie://', color: '#FF9500' },
  { id: 'copilot', name: 'CoPilot', icon: '📊', deeplink: 'copilot://', color: '#34C759' },
  { id: 'assetmind', name: 'AssetMind', icon: '📈', deeplink: 'assetmind://', color: '#5856D6' },
];

export function AppLauncher() {
  const { state, toDefault } = useKeyboard();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = APPS.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAppClick = (app: AppItem) => {
    // Open app via deep link
    window.open(app.deeplink, '_blank');
  };

  if (state !== 'launcher') return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>🚀 Apps</span>
        <button style={styles.closeButton} onClick={toDefault}>✕</button>
      </div>

      {/* Search */}
      <div style={styles.searchBar}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          style={styles.searchInput}
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Apps Grid */}
      <div style={styles.appsGrid}>
        {filteredApps.map(app => (
          <button
            key={app.id}
            style={styles.appButton}
            onClick={() => handleAppClick(app)}
          >
            <div style={{ ...styles.appIcon, background: app.color + '30' }}>
              <span style={styles.appEmoji}>{app.icon}</span>
            </div>
            <span style={styles.appName}>{app.name}</span>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <p style={styles.sectionTitle}>Quick Actions</p>
        <div style={styles.actionsList}>
          <button style={styles.actionItem}>
            <span>✈️</span>
            <span>Search Flights</span>
          </button>
          <button style={styles.actionItem}>
            <span>🏨</span>
            <span>Book Hotel</span>
          </button>
          <button style={styles.actionItem}>
            <span>🚗</span>
            <span>Book Cab</span>
          </button>
          <button style={styles.actionItem}>
            <span>💰</span>
            <span>Pay</span>
          </button>
        </div>
      </div>

      {/* Command Bar Tip */}
      <div style={styles.tip}>
        <span style={styles.tipIcon}>💡</span>
        <span>Type <code style={styles.code}>/</code> in keyboard for commands</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#1C1C1E',
    borderRadius: '20px',
    padding: '16px',
    width: '100%',
    maxWidth: '400px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
  },
  closeButton: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    background: '#2C2C2E',
    borderRadius: '12px',
    padding: '10px 12px',
    marginBottom: '16px',
  },
  searchIcon: {
    fontSize: '16px',
    marginRight: '8px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  },
  appsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  appButton: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 4px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  appIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appEmoji: {
    fontSize: '20px',
  },
  appName: {
    color: '#fff',
    fontSize: '10px',
    fontWeight: '500',
  },
  quickActions: {
    background: '#2C2C2E',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '12px',
  },
  sectionTitle: {
    color: '#888',
    fontSize: '11px',
    marginBottom: '8px',
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  actionItem: {
    background: '#3A3A3C',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textAlign: 'left',
  },
  tip: {
    background: '#2C2C2E',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#888',
    fontSize: '12px',
  },
  tipIcon: {
    fontSize: '14px',
  },
  code: {
    background: '#3A3A3C',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#fff',
  },
};

export default AppLauncher;