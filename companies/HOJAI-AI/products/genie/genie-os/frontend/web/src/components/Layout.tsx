import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NotificationCenter from './NotificationCenter';

const TABS = [
  { path: '/home', icon: '🏠', label: 'Home' },
  { path: '/genie', icon: '🧞', label: 'Genie' },
  { path: '/search', icon: '🔍', label: 'Search' },
  { path: '/memory', icon: '🧠', label: 'Memory' },
  { path: '/me', icon: '👤', label: 'Me' }
];

export default function Layout() {
  const location = useLocation();
  const [showNotif, setShowNotif] = useState(false);

  // Close notification center on route change
  useEffect(() => {
    setShowNotif(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>🧞 Genie</h1>
        <div className="row">
          <button
            onClick={() => setShowNotif(true)}
            aria-label="Notifications"
            style={{ position: 'relative', padding: 8 }}
          >
            🔔
            <span className="notification-dot" />
          </button>
        </div>
      </header>

      <main className="app-main fade-in" key={location.pathname}>
        <Outlet />
      </main>

      <nav className="app-tabbar">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      {showNotif && <NotificationCenter onClose={() => setShowNotif(false)} />}
    </div>
  );
}