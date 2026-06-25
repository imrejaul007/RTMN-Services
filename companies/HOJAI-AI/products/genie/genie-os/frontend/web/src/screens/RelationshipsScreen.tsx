import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Person {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  category: string;
  relationshipType: string;
  importance: number;
  birthday?: string;
  anniversary?: string;
  notes?: string;
  tags?: string[];
  photo?: string;
  lastContact?: string;
  totalInteractions: number;
  relationshipHealth: number;
  createdAt: string;
}

interface Dashboard {
  stats: {
    totalPeople: number;
    byCategory: Record<string, number>;
    totalInteractions: number;
    recentInteractions: number;
    upcomingReminders: number;
    relationshipHealth: number;
  };
  needsAttention: Person[];
  todayReminders: any[];
}

type View = 'dashboard' | 'people' | 'add';
type Category = '' | 'family' | 'friend' | 'professional' | 'community';

export default function RelationshipsScreen() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('dashboard');
  const [people, setPeople] = useState<Person[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Add person form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('friend');
  const [relationshipType, setRelationshipType] = useState('friend');
  const [importance, setImportance] = useState(5);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, p] = await Promise.allSettled([
        apiGet<Dashboard>(`${specialists.relationship}/api/${USER_ID}/dashboard`),
        apiGet<{ people: Person[] }>(`${specialists.relationship}/api/people/${USER_ID}`),
      ]);
      if (d.status === 'fulfilled') setDashboard(d.value);
      if (p.status === 'fulfilled') setPeople(p.value.people || []);
    } finally {
      setLoading(false);
    }
  }

  async function addPerson() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await apiPost(`${specialists.relationship}/api/people`, {
        userId: USER_ID,
        name: name.trim(),
        category,
        relationshipType,
        importance,
        notes: notes.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthday: birthday || undefined,
      });
      setName('');
      setNotes('');
      setPhone('');
      setEmail('');
      setBirthday('');
      setImportance(5);
      setView('people');
      load();
    } finally {
      setAdding(false);
    }
  }

  const filtered = people.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const categoryColors: Record<string, string> = {
    family: '#ec4899',
    friend: '#6366f1',
    professional: '#22c55e',
    community: '#f59e0b',
    other: '#64748b',
  };

  const importanceLabels = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐', '⭐⭐⭐⭐⭐⭐', '⭐⭐⭐⭐⭐⭐⭐', '⭐⭐⭐⭐⭐⭐⭐⭐', '⭐⭐⭐⭐⭐⭐⭐⭐⭐', '⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐'];

  const relationshipOptions: Record<string, string[]> = {
    family: ['parent', 'spouse', 'child', 'sibling', 'grandparent', 'other family'],
    friend: ['best friend', 'close friend', 'friend', 'acquaintance', 'neighbor'],
    professional: ['colleague', 'mentor', 'client', 'partner', 'boss'],
    community: ['teacher', 'doctor', 'coach', 'religious leader'],
  };

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>👥 Relationships</h1>
        <button onClick={() => setView('add')} className="btn" style={{ fontSize: 12, padding: '6px 12px' }}>+ Person</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', overflowX: 'auto' }}>
        {(['dashboard', 'people', 'add'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={view === v ? 'btn' : 'btn-secondary'}
            style={{ fontSize: 11, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}
          >
            {v === 'add' ? '+ Add' : v}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading…</div>}

      {/* === DASHBOARD === */}
      {!loading && view === 'dashboard' && dashboard && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Health score */}
          <div style={{
            background: `linear-gradient(135deg, ${categoryColors.friend} 0%, ${categoryColors.professional} 100%)`,
            borderRadius: 16,
            padding: 20,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Relationship Health</div>
            <div style={{ fontSize: 48, fontWeight: 800, marginTop: 4 }}>{dashboard.stats.relationshipHealth}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              {dashboard.stats.totalPeople} people · {dashboard.stats.totalInteractions} total interactions
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'This Week', value: dashboard.stats.recentInteractions, icon: '📅', sub: 'interactions' },
              { label: 'Need Attention', value: dashboard.needsAttention.length, icon: '⚠️', sub: 'people' },
              { label: 'Family', value: dashboard.stats.byCategory?.family || 0, icon: '👨‍👩‍👧', sub: 'people' },
              { label: 'Friends', value: dashboard.stats.byCategory?.friend || 0, icon: '🤝', sub: 'people' },
              { label: 'Professional', value: dashboard.stats.byCategory?.professional || 0, icon: '💼', sub: 'people' },
              { label: 'Community', value: dashboard.stats.byCategory?.community || 0, icon: '🌍', sub: 'people' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Needs attention */}
          {dashboard.needsAttention.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">⚠️ Needs Attention</div>
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {dashboard.needsAttention.map((p) => {
                  const daysSince = p.lastContact
                    ? Math.floor((Date.now() - new Date(p.lastContact).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(245,158,11,0.1)', borderRadius: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: categoryColors[p.category] || '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                          {p.name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 10, opacity: 0.5 }}>{p.relationshipType}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {daysSince !== null ? (
                          <div style={{ fontSize: 11, color: 'var(--warning)' }}>{daysSince}d since contact</div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--danger)' }}>Never contacted</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === PEOPLE === */}
      {!loading && view === 'people' && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people…"
              style={{ paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'white', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 14 }}>🔍</span>
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
            {['', 'family', 'friend', 'professional', 'community'].map((cat) => (
              <button
                key={cat || 'all'}
                onClick={() => setFilterCategory(cat as Category)}
                className={filterCategory === cat ? 'btn' : 'btn-secondary'}
                style={{
                  fontSize: 11, padding: '4px 10px', flexShrink: 0,
                  borderColor: cat ? categoryColors[cat] : undefined,
                  color: filterCategory === cat && cat ? categoryColors[cat] : undefined,
                }}
              >
                {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All'}
              </button>
            ))}
          </div>

          {/* People list */}
          {filtered.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: 48 }}>👥</div>
              <div style={{ marginTop: 12 }}>No people found</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filtered.map((p) => {
                const daysSince = p.lastContact
                  ? Math.floor((Date.now() - new Date(p.lastContact).getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const healthColor = p.relationshipHealth >= 80 ? 'var(--success)' : p.relationshipHealth >= 50 ? 'var(--warning)' : 'var(--danger)';
                return (
                  <div key={p.id} style={{
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: 12,
                    borderLeft: `3px solid ${categoryColors[p.category] || '#64748b'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: categoryColors[p.category] || '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                          {p.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'capitalize' }}>{p.relationshipType}</div>
                          {p.tags && p.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                              {p.tags.slice(0, 3).map((t) => (
                                <span key={t} style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: healthColor }}>{p.relationshipHealth}</div>
                        <div style={{ fontSize: 9, opacity: 0.5 }}>health</div>
                      </div>
                    </div>
                    {p.notes && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6, marginLeft: 54 }}>{p.notes}</div>}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, marginLeft: 54, flexWrap: 'wrap' }}>
                      {daysSince !== null ? (
                        <div style={{ fontSize: 10, opacity: 0.5 }}>📅 Last: {daysSince}d ago</div>
                      ) : (
                        <div style={{ fontSize: 10, opacity: 0.5 }}>📅 Never contacted</div>
                      )}
                      {p.email && <div style={{ fontSize: 10, opacity: 0.5 }}>✉️ {p.email}</div>}
                      {p.birthday && <div style={{ fontSize: 10, opacity: 0.5 }}>🎂 {new Date(p.birthday).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === ADD PERSON === */}
      {!loading && view === 'add' && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="card">
            <div className="card-title">Add Person</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name *"
              style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
            />

            {/* Category */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>Category</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(['family', 'friend', 'professional', 'community']).map((cat) => (
                  <button key={cat} onClick={() => { setCategory(cat); setRelationshipType(cat === 'family' ? 'sibling' : cat === 'friend' ? 'friend' : 'colleague'); }}
                    style={{
                      padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: category === cat ? `${categoryColors[cat]}22` : 'rgba(255,255,255,0.05)',
                      border: category === cat ? `1px solid ${categoryColors[cat]}` : '1px solid var(--border)',
                      color: category === cat ? categoryColors[cat] : 'var(--text)',
                      textTransform: 'capitalize',
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Relationship type */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>Relationship</div>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }}
              >
                {(relationshipOptions[category] || ['friend', 'acquaintance']).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Importance */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 11, opacity: 0.6 }}>Importance</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{importanceLabels[importance] || '⭐'}</div>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={importance}
                onChange={(e) => setImportance(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: categoryColors[category] }}
              />
            </div>

            {/* Contact info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                style={{ padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, boxSizing: 'border-box' }} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone"
                style={{ padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" placeholder="Birthday"
                style={{ width: '100%', padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, boxSizing: 'border-box' }} />
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (how you met, interests, etc.)"
              rows={3}
              style={{ width: '100%', marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
            />

            <button className="btn btn-block" style={{ marginTop: 12 }} disabled={adding || !name.trim()} onClick={addPerson}>
              {adding ? 'Adding…' : 'Add Person'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
