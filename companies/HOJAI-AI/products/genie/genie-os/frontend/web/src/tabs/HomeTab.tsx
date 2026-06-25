import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, specialists } from '../services/api';
import type { Briefing, MoodEntry, CalendarEvent, Contact } from '../types';

export default function HomeTab() {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [mood, setMood] = useState<MoodEntry | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [b, m, c, r] = await Promise.allSettled([
        apiGet<Briefing>(`${specialists.briefing}/api/briefing/morning`),
        apiGet<{ entries: MoodEntry[] }>(`${specialists.wellness}/api/mood?limit=1`),
        apiGet<{ items: CalendarEvent[] }>(`${specialists.calendar}/api/events/today`),
        apiGet<{ items: Contact[] }>(`${specialists.relationship}/api/contacts?limit=5`)
      ]);
      if (b.status === 'fulfilled') setBriefing(b.value);
      if (m.status === 'fulfilled') setMood(m.value.entries?.[0] || null);
      if (c.status === 'fulfilled') setEvents(c.value.items || []);
      if (r.status === 'fulfilled') setContacts(r.value.items || []);
    } finally {
      setLoading(false);
    }
  }

  const greeting = briefing?.greeting || `Hello!`;
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="muted small">{today}</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{greeting}</h2>
      </div>

      {/* Quick capture button */}
      <button
        className="btn-fab"
        onClick={() => navigate('/genie')}
        aria-label="Quick capture"
        title="Capture a memory"
      >
        ＋
      </button>

      {/* Focus widget */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
        <div className="card-title" style={{ color: 'white' }}>
          🎯 Today's Focus
        </div>
        {briefing?.tasks && briefing.tasks.length > 0 ? (
          briefing.tasks.slice(0, 3).map((t) => (
            <div key={t.id} className="list-item" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
              <div className="list-item-main">
                <div className="list-item-title" style={{ color: 'white' }}>{t.title}</div>
                {t.due && <div className="list-item-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.due}</div>}
              </div>
            </div>
          ))
        ) : (
          <div className="muted small" style={{ color: 'rgba(255,255,255,0.7)' }}>
            No tasks today. Ask Genie to plan your day.
          </div>
        )}
      </div>

      {/* Widgets grid */}
      <div className="widget-grid">
        <div className="widget" onClick={() => navigate('/calendar')}>
          <div className="widget-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>📅</div>
          <div className="widget-label">Calendar</div>
          <div className="widget-value">{events.length}</div>
          <div className="widget-sub">events today</div>
        </div>

        <div className="widget" onClick={() => navigate('/health')}>
          <div className="widget-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>💚</div>
          <div className="widget-label">Mood</div>
          <div className="widget-value">{mood?.score ?? '—'}</div>
          <div className="widget-sub">{mood ? 'latest entry' : 'no entries'}</div>
        </div>

        <div className="widget" onClick={() => navigate('/relationships')}>
          <div className="widget-icon" style={{ background: '#fce7f3', color: '#ec4899' }}>👥</div>
          <div className="widget-label">People</div>
          <div className="widget-value">{contacts.length}</div>
          <div className="widget-sub">close contacts</div>
        </div>

        <div className="widget" onClick={() => navigate('/memory')}>
          <div className="widget-icon">🧠</div>
          <div className="widget-label">Memories</div>
          <div className="widget-value">{briefing?.recentMemories?.length ?? 0}</div>
          <div className="widget-sub">recent</div>
        </div>
      </div>

      {/* Today's schedule */}
      {events.length > 0 && (
        <div className="card">
          <div className="card-title">📅 Today's Schedule</div>
          {events.slice(0, 5).map((e) => (
            <div key={e.id} className="list-item">
              <div className="list-item-main">
                <div className="list-item-title">{e.title}</div>
                <div className="list-item-sub">{e.start} {e.location && `· ${e.location}`}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {briefing?.insights && briefing.insights.length > 0 && (
        <div className="card">
          <div className="card-title">💡 Genie's Insights</div>
          {briefing.insights.map((i, idx) => (
            <div key={idx} className="list-item">
              <div className="list-item-main">
                <div className="small">{i}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="empty"><div className="spinner" /> Loading...</div>}
    </div>
  );
}