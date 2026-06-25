import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, specialists } from '../services/api';

const USER_ID = 'user-001';

interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  color?: string;
  conflicts?: any[];
  hasConflicts?: boolean;
}

interface DayData {
  date: string;
  dayName: string;
  events: CalendarEvent[];
  total: number;
}

interface WeekData {
  weekStart: string;
  weekEnd: string;
  days: DayData[];
  statistics: { totalEvents: number; totalHours: number; avgEventsPerDay: number };
}

type View = 'week' | 'day' | 'create';

const TYPE_COLORS: Record<string, string> = {
  meeting: '#6366f1',
  reminder: '#f59e0b',
  task: '#22c55e',
  blocked: '#ef4444',
  out_of_office: '#8b5cf6',
  travel: '#06b6d4',
  focus: '#ec4899',
  break: '#64748b',
};

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  reminder: 'Reminder',
  task: 'Task',
  blocked: 'Blocked',
  out_of_office: 'OOTO',
  travel: 'Travel',
  focus: 'Focus',
  break: 'Break',
};

export default function CalendarScreen() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('week');
  const [week, setWeek] = useState<WeekData | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Create event form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('meeting');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdMsg, setCreatedMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [w, t] = await Promise.allSettled([
        apiGet<WeekData>(`${specialists.calendar}/api/week?userId=${USER_ID}&startDate=${new Date().toISOString()}`),
        apiGet<{ events: CalendarEvent[] }>(`${specialists.calendar}/api/events/today?userId=${USER_ID}`),
      ]);
      if (w.status === 'fulfilled') setWeek(w.value);
      if (t.status === 'fulfilled') setTodayEvents(t.value.events || []);
    } finally {
      setLoading(false);
    }
  }

  async function createEvent() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const start = `${date}T${startTime}:00Z`;
      const end = `${date}T${endTime}:00Z`;
      const result = await apiPost<{ event: CalendarEvent; hasConflicts: boolean; conflicts: any[] }>(
        `${specialists.calendar}/api/events`,
        { userId: USER_ID, title: title.trim(), description, type, startTime: start, endTime: end, location }
      );
      if (result.hasConflicts) {
        setCreatedMsg(`⚠️ Event created but conflicts with: ${result.conflicts.map((c: any) => c.title).join(', ')}`);
      } else {
        setCreatedMsg('✅ Event created!');
      }
      setTimeout(() => setCreatedMsg(''), 3000);
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setView('week');
      load();
    } catch (e: any) {
      setCreatedMsg(`❌ ${e.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return;
    await apiDelete(`${specialists.calendar}/api/events/${id}`);
    load();
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDayDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function isToday(iso: string) {
    const d = new Date(iso).toDateString();
    const t = new Date().toDateString();
    return d === t;
  }

  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().toDateString();

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>📅 Calendar</h1>
        <button onClick={() => setView('create')} className="btn" style={{ fontSize: 12, padding: '6px 12px' }}>+ Event</button>
      </div>

      {loading && <div className="loading">Loading…</div>}

      {!loading && view === 'week' && week && (
        <div style={{ padding: '0 0 16px' }}>
          {/* Week header */}
          <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>{week.weekStart} → {week.weekEnd}</div>
              <div style={{ fontSize: 11, opacity: 0.4 }}>{week.statistics.totalEvents} events · {week.statistics.totalHours}h total</div>
            </div>
            <button onClick={() => setView('day')} className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Day view</button>
          </div>

          {/* Week grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 8px' }}>
            {week.days.map((day) => {
              const dayDate = new Date(day.date);
              const isTodayDay = dayDate.toDateString() === today;
              return (
                <div
                  key={day.date}
                  style={{
                    background: isTodayDay ? 'var(--primary-soft)' : 'var(--surface-2)',
                    borderRadius: 8,
                    padding: '6px 4px',
                    textAlign: 'center',
                    border: isTodayDay ? '1px solid var(--primary)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedDate(dayDate);
                    setView('day');
                  }}
                >
                  <div style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase' }}>{dayOfWeek[dayDate.getDay()]}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isTodayDay ? 'var(--primary)' : 'var(--text)' }}>{dayDate.getDate()}</div>
                  {day.total > 0 && (
                    <div style={{ marginTop: 2 }}>
                      {day.events.slice(0, 3).map((e) => (
                        <div key={e.id} style={{
                          fontSize: 7,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          background: TYPE_COLORS[e.type] || '#6366f1',
                          borderRadius: 2,
                          padding: '1px 2px',
                          color: 'white',
                          marginBottom: 1,
                        }}>
                          {formatTime(e.startTime)} {e.title}
                        </div>
                      ))}
                      {day.total > 3 && <div style={{ fontSize: 7, opacity: 0.5 }}>+{day.total - 3} more</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today's events */}
          {todayEvents.length > 0 && (
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Today</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {todayEvents.map((e) => (
                  <div key={e.id} style={{
                    display: 'flex',
                    gap: 10,
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    borderLeft: `3px solid ${TYPE_COLORS[e.type] || '#6366f1'}`,
                  }}>
                    <div style={{ minWidth: 50 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{formatTime(e.startTime)}</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>{formatTime(e.endTime)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{e.title}</div>
                      {e.location && <div style={{ fontSize: 11, opacity: 0.6 }}>📍 {e.location}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: TYPE_COLORS[e.type] || '#6366f1', color: 'white' }}>
                          {TYPE_LABELS[e.type] || e.type}
                        </span>
                        {e.hasConflicts && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--warning)', color: 'white' }}>⚠️ Conflict</span>}
                        {e.attendees && e.attendees.length > 0 && <span style={{ fontSize: 10, opacity: 0.5 }}>👥 {e.attendees.length}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(e.id)} style={{ fontSize: 11, opacity: 0.4, alignSelf: 'flex-start' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && view === 'day' && (
        <DayView
          date={selectedDate}
          onBack={() => setView('week')}
          onDelete={deleteEvent}
          onCreate={() => setView('create')}
        />
      )}

      {!loading && view === 'create' && (
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={() => setView('week')} className="btn-secondary" style={{ marginBottom: 12, fontSize: 12 }}>← Back</button>

          <div className="card">
            <div className="card-title">New Event</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              style={{ width: '100%', marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }} />
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: 90, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }} />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: 90, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }} />
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              style={{ width: '100%', marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }}
            />
            <button className="btn btn-block" style={{ marginTop: 12 }} disabled={creating || !title.trim()} onClick={createEvent}>
              {creating ? 'Creating…' : 'Create Event'}
            </button>
            {createdMsg && (
              <div style={{ marginTop: 8, fontSize: 13, padding: 8, background: createdMsg.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', borderRadius: 6, textAlign: 'center' }}>
                {createdMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayView({ date, onBack, onDelete, onCreate }: { date: Date; onBack: () => void; onDelete: (id: string) => void; onCreate: () => void }) {
  const [dayData, setDayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const dateStr = date.toISOString().slice(0, 10);
    apiGet<any>(`${specialists.calendar}/api/day/${dateStr}?userId=${USER_ID}`)
      .then(setDayData)
      .catch(() => setDayData(null))
      .finally(() => setLoading(false));
  }, [date]);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onBack} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>← Week</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          {dayData?.statistics && (
            <div style={{ fontSize: 11, opacity: 0.5 }}>{dayData.statistics.totalHours}h scheduled · {dayData.statistics.meetingHours}h meetings</div>
          )}
        </div>
        <button onClick={onCreate} className="btn" style={{ fontSize: 12, padding: '6px 12px' }}>+ Event</button>
      </div>

      {loading && <div className="loading">Loading…</div>}
      {!loading && dayData && dayData.events.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: 48 }}>📅</div>
          <div style={{ marginTop: 12 }}>No events this day</div>
        </div>
      )}
      {!loading && dayData && dayData.events.map((e: CalendarEvent) => (
        <div key={e.id} style={{
          display: 'flex',
          gap: 10,
          background: 'var(--surface-2)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 8,
          borderLeft: `3px solid ${TYPE_COLORS[e.type] || '#6366f1'}`,
        }}>
          <div style={{ minWidth: 50 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{formatTime(e.startTime)}</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>{formatTime(e.endTime)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{e.title}</div>
            {e.location && <div style={{ fontSize: 11, opacity: 0.6 }}>📍 {e.location}</div>}
            {e.description && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{e.description}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: TYPE_COLORS[e.type] || '#6366f1', color: 'white' }}>
                {TYPE_LABELS[e.type] || e.type}
              </span>
            </div>
          </div>
          <button onClick={() => onDelete(e.id)} style={{ fontSize: 11, opacity: 0.4, alignSelf: 'flex-start' }}>✕</button>
        </div>
      ))}
    </div>
  );
}
