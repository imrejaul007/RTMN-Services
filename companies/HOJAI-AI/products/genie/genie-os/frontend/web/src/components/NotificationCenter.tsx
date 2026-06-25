import { useEffect, useState } from 'react';
import { apiGet, specialists } from '../services/api';
import type { Notification } from '../types';

export default function NotificationCenter({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ items: Notification[] }>(`${specialists.briefing}/api/notifications`);
      setItems(data.items || []);
    } catch {
      // Fall back to mock notifications if specialist not available
      setItems([
        {
          id: '1', title: 'Morning briefing ready', body: 'You have 3 tasks and 2 events today.',
          type: 'briefing', read: false, createdAt: new Date().toISOString()
        },
        {
          id: '2', title: 'Time to hydrate', body: "You haven't logged water in 3 hours.",
          type: 'reminder', read: false, createdAt: new Date(Date.now() - 3 * 3600_000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal show" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="row" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>🔔 Notifications</h3>
          <div className="spacer" />
          <button onClick={onClose} style={{ padding: 8 }}>✕</button>
        </div>

        {loading && <div className="empty"><div className="spinner" /></div>}

        {!loading && items.length === 0 && (
          <div className="empty">
            <div style={{ fontSize: 48 }}>🎉</div>
            <div style={{ marginTop: 12 }}>All caught up!</div>
          </div>
        )}

        {items.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{ marginBottom: 8, opacity: n.read ? 0.6 : 1 }}
          >
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ fontWeight: 600, flex: 1 }}>{n.title}</div>
              <span className="badge badge-muted">{n.type}</span>
            </div>
            <div className="small muted">{n.body}</div>
            <div className="faint tiny" style={{ marginTop: 4 }}>
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}