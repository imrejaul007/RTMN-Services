import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists, getUser } from '../services/api';
import type { Memory } from '../types';

const TYPES = [
  { id: 'all', icon: '📋', label: 'All' },
  { id: 'note', icon: '📝', label: 'Notes' },
  { id: 'photo', icon: '📷', label: 'Photos' },
  { id: 'voice', icon: '🎙️', label: 'Voice' },
  { id: 'event', icon: '📅', label: 'Events' },
  { id: 'person', icon: '👤', label: 'People' },
  { id: 'place', icon: '📍', label: 'Places' },
  { id: 'idea', icon: '💡', label: 'Ideas' }
];

export default function MemoryTab() {
  const navigate = useNavigate();
  const user = getUser();
  const userId = user?.id || 'default';
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCapture, setShowCapture] = useState(false);
  const [captureType, setCaptureType] = useState<Memory['type']>('note');
  const [captureText, setCaptureText] = useState('');
  const [captureTitle, setCaptureTitle] = useState('');

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const params = filter === 'all' ? { limit: 50 } : { limit: 50, type: filter };
      const data = await apiGet<{ items: Memory[] }>(`${specialists.memoryinbox}/api/items`, params);
      setMemories(data.items || []);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveCapture() {
    if (!captureText.trim()) return;
    try {
      await apiPost(`${specialists.memoryinbox}/api/items`, {
        type: captureType,
        title: captureTitle || undefined,
        content: captureText,
        userId
      });
      setShowCapture(false);
      setCaptureText('');
      setCaptureTitle('');
      load();
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    }
  }

  // Group by day
  const grouped = memories.reduce((acc, m) => {
    const day = new Date(m.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(m);
    return acc;
  }, {} as Record<string, Memory[]>);

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>🧠 Memory</h2>
        <div className="spacer" />
        <button
          className="btn"
          onClick={() => navigate('/genie')}
        >
          💬 Ask
        </button>
      </div>

      {/* Type filters */}
      <div className="pill-row" style={{ marginBottom: 16 }}>
        {TYPES.map((t) => (
          <button
            key={t.id}
            className={`pill ${filter === t.id ? 'active' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Floating capture button */}
      <button
        className="btn-fab"
        onClick={() => setShowCapture(true)}
        aria-label="Capture memory"
        title="Capture a memory"
      >
        ＋
      </button>

      {/* Capture modal */}
      {showCapture && (
        <div className="modal show" style={{ display: 'flex' }}>
          <div className="modal-content">
            <h3 style={{ marginBottom: 16 }}>Capture a memory</h3>

            <div className="form-group">
              <label>Type</label>
              <select value={captureType} onChange={(e) => setCaptureType(e.target.value as Memory['type'])}>
                <option value="note">Note</option>
                <option value="idea">Idea</option>
                <option value="person">Person</option>
                <option value="place">Place</option>
                <option value="event">Event</option>
              </select>
            </div>

            <div className="form-group">
              <label>Title (optional)</label>
              <input
                value={captureTitle}
                onChange={(e) => setCaptureTitle(e.target.value)}
                placeholder="What's this about?"
              />
            </div>

            <div className="form-group">
              <label>Content</label>
              <textarea
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="Write down what you want to remember..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="row">
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCapture(false)}>
                Cancel
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={saveCapture} disabled={!captureText.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading && <div className="empty"><div className="spinner" /></div>}

      {!loading && memories.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: 48 }}>🧠</div>
          <div style={{ marginTop: 12 }}>No memories yet</div>
          <div className="muted small" style={{ marginTop: 8 }}>
            Tap ＋ to capture your first memory
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([day, mems]) => (
        <div key={day} className="card">
          <div className="card-title small muted">{day}</div>
          {mems.map((m) => (
            <div key={m.id} className="list-item">
              <div className="list-item-main">
                <div className="list-item-title">
                  {m.title || m.content.slice(0, 50)}
                </div>
                <div className="list-item-sub">
                  <span className="badge badge-muted" style={{ marginRight: 6 }}>{m.type}</span>
                  {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}