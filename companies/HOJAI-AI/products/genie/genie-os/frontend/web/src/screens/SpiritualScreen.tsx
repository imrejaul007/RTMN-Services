import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';
import type { Prayer, GratitudeEntry, Reflection, MeditationSession } from '../types';

type Tab = 'overview' | 'gratitude' | 'prayer' | 'reflection' | 'meditation';

export default function SpiritualScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [gratitude, setGratitude] = useState<GratitudeEntry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [meditations, setMeditations] = useState<MeditationSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [gratitudeText, setGratitudeText] = useState('');
  const [gratitudeItems, setGratitudeItems] = useState<string[]>(['', '', '']);
  const [prayerText, setPrayerText] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('general');
  const [reflectionTitle, setReflectionTitle] = useState('');
  const [reflectionBody, setReflectionBody] = useState('');
  const [meditationType, setMeditationType] = useState('breath');
  const [meditationMinutes, setMeditationMinutes] = useState(10);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [p, g, r, m] = await Promise.allSettled([
        apiGet<{ prayers: Prayer[] }>(`${specialists.spiritual}/api/spiritual/prayers`),
        apiGet<{ gratitude: GratitudeEntry[] }>(`${specialists.spiritual}/api/spiritual/gratitude`),
        apiGet<{ reflections: Reflection[] }>(`${specialists.spiritual}/api/spiritual/reflections`),
        apiGet<{ meditations: MeditationSession[] }>(`${specialists.spiritual}/api/spiritual/meditations`)
      ]);
      if (p.status === 'fulfilled') setPrayers(p.value.prayers || []);
      if (g.status === 'fulfilled') setGratitude(g.value.gratitude || []);
      if (r.status === 'fulfilled') setReflections(r.value.reflections || []);
      if (m.status === 'fulfilled') setMeditations(m.value.meditations || []);
    } finally {
      setLoading(false);
    }
  }

  async function addGratitude() {
    const items = gratitudeItems.filter(i => i.trim().length > 0);
    if (items.length === 0) {
      alert('Please add at least one gratitude item');
      return;
    }
    try {
      await apiPost(`${specialists.spiritual}/gratitude/add/user-001`, {
        items,
        mood: 'grateful',
        note: gratitudeText || null
      });
      setGratitudeItems(['', '', '']);
      setGratitudeText('');
      load();
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  }

  async function addPrayer() {
    if (prayerText.trim().length < 3) {
      alert('Prayer text must be at least 3 characters');
      return;
    }
    try {
      await apiPost(`${specialists.spiritual}/prayer/add/user-001`, {
        text: prayerText.trim(),
        category: prayerCategory
      });
      setPrayerText('');
      load();
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  }

  async function markAnswered(prayerId: string) {
    try {
      await apiPost(`${specialists.spiritual}/prayer/answered/user-001/${prayerId}`, {});
      load();
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  }

  async function addReflection() {
    if (reflectionBody.trim().length < 5) {
      alert('Reflection must be at least 5 characters');
      return;
    }
    try {
      await apiPost(`${specialists.spiritual}/reflection/add/user-001`, {
        title: reflectionTitle || 'Untitled reflection',
        body: reflectionBody.trim(),
        mood: 'neutral'
      });
      setReflectionTitle('');
      setReflectionBody('');
      load();
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  }

  async function logMeditation() {
    try {
      await apiPost(`${specialists.spiritual}/meditation/log/user-001`, {
        type: meditationType,
        minutes: meditationMinutes
      });
      load();
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  }

  const activePrayers = prayers.filter(p => !p.answered);
  const answeredPrayers = prayers.filter(p => p.answered);
  const todayGratitude = gratitude.find(g => g.date === new Date().toISOString().slice(0, 10));
  const totalMeditationMin = meditations.reduce((sum, m) => sum + m.minutes, 0);

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h2 className="section-title">🕊️ Spiritual</h2>

      {/* Tab switcher */}
      <div className="row" style={{ gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {(['overview', 'gratitude', 'prayer', 'reflection', 'meditation'] as Tab[]).map(t => (
          <button
            key={t}
            className={`btn ${tab === t ? 'btn-block' : 'btn-secondary'}`}
            style={{ flex: '0 0 auto', minWidth: 80, padding: '8px 12px', fontSize: 13 }}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="empty"><div className="spinner" /></div>}

      {/* === OVERVIEW === */}
      {tab === 'overview' && (
        <>
          <div className="card">
            <div className="card-title">📊 Today</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Gratitude</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {todayGratitude ? '✓' : '○'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {todayGratitude ? `${todayGratitude.items.length} items` : 'Not yet'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Active Prayers</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{activePrayers.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Reflections</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{reflections.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Meditation</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{totalMeditationMin}m</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">🌟 Today's Focus</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Pause and breathe</div>
            <div style={{ opacity: 0.85, fontSize: 14, lineHeight: 1.5 }}>
              Take five slow breaths and notice how you feel.
            </div>
          </div>

          <div className="card">
            <div className="card-title">📖 This Week's Verse</div>
            <div style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 8 }}>
              "Be still and know."
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Psalm 46:10</div>
          </div>

          {gratitude.length > 0 && (
            <div className="card">
              <div className="card-title">🙏 Recent Gratitude</div>
              {gratitude.slice(0, 3).map((g) => (
                <div key={g.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-sub">{new Date(g.date).toLocaleDateString()}</div>
                    <div className="list-item-title">{g.items[0]}{g.items.length > 1 && ` +${g.items.length - 1} more`}</div>
                  </div>
                  <div style={{ fontSize: 20 }}>{g.mood === 'happy' || g.mood === 'energized' || g.mood === 'joyful' ? '😊' : g.mood === 'grateful' || g.mood === 'thankful' ? '🙏' : '✨'}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === GRATITUDE === */}
      {tab === 'gratitude' && (
        <>
          <div className="card">
            <div className="card-title">✨ Today's Gratitude</div>
            {gratitudeItems.map((item, i) => (
              <input
                key={i}
                type="text"
                placeholder={`I'm grateful for...`}
                value={item}
                onChange={(e) => {
                  const next = [...gratitudeItems];
                  next[i] = e.target.value;
                  setGratitudeItems(next);
                }}
                style={{ marginBottom: 8 }}
              />
            ))}
            <button
              className="btn btn-secondary"
              onClick={() => setGratitudeItems([...gratitudeItems, ''])}
              style={{ marginBottom: 8 }}
            >
              + Add another
            </button>
            <textarea
              placeholder="Optional note about your day..."
              value={gratitudeText}
              onChange={(e) => setGratitudeText(e.target.value)}
              rows={2}
              style={{ marginBottom: 8 }}
            />
            <button className="btn btn-block" onClick={addGratitude}>
              Save Gratitude
            </button>
          </div>

          {gratitude.length > 0 && (
            <div className="card">
              <div className="card-title">📚 History</div>
              {gratitude.slice(0, 10).map((g) => (
                <div key={g.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-sub">{new Date(g.date).toLocaleDateString()}</div>
                    <div className="list-item-title">{g.items.join(' • ')}</div>
                  </div>
                  <div style={{ fontSize: 20 }}>
                    {g.mood === 'happy' || g.mood === 'energized' || g.mood === 'joyful' ? '😊' : g.mood === 'grateful' || g.mood === 'thankful' ? '🙏' : '✨'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === PRAYER === */}
      {tab === 'prayer' && (
        <>
          <div className="card">
            <div className="card-title">🙏 Add Prayer</div>
            <textarea
              placeholder="What's on your heart?"
              value={prayerText}
              onChange={(e) => setPrayerText(e.target.value)}
              rows={3}
              style={{ marginBottom: 8 }}
            />
            <select
              value={prayerCategory}
              onChange={(e) => setPrayerCategory(e.target.value)}
              style={{ marginBottom: 8, width: '100%', padding: 8 }}
            >
              <option value="general">General</option>
              <option value="family">Family</option>
              <option value="health">Health</option>
              <option value="work">Work</option>
              <option value="guidance">Guidance</option>
              <option value="gratitude">Gratitude</option>
              <option value="peace">Peace</option>
              <option value="forgiveness">Forgiveness</option>
              <option value="provision">Provision</option>
              <option value="wisdom">Wisdom</option>
              <option value="protection">Protection</option>
            </select>
            <button className="btn btn-block" onClick={addPrayer}>
              Add Prayer
            </button>
          </div>

          {activePrayers.length > 0 && (
            <div className="card">
              <div className="card-title">📿 Active Prayers ({activePrayers.length})</div>
              {activePrayers.map((p) => (
                <div key={p.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{p.text}</div>
                    <div className="list-item-sub">{p.category} • {new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => markAnswered(p.id)}
                  >
                    ✓ Answered
                  </button>
                </div>
              ))}
            </div>
          )}

          {answeredPrayers.length > 0 && (
            <div className="card">
              <div className="card-title">✨ Answered ({answeredPrayers.length})</div>
              {answeredPrayers.map((p) => (
                <div key={p.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title" style={{ textDecoration: 'line-through', opacity: 0.7 }}>{p.text}</div>
                    <div className="list-item-sub">Answered {p.answeredAt ? new Date(p.answeredAt).toLocaleDateString() : ''}</div>
                  </div>
                  <div style={{ fontSize: 20 }}>✓</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === REFLECTION === */}
      {tab === 'reflection' && (
        <>
          <div className="card">
            <div className="card-title">📝 New Reflection</div>
            <input
              type="text"
              placeholder="Title (optional)"
              value={reflectionTitle}
              onChange={(e) => setReflectionTitle(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <textarea
              placeholder="What is on your mind? Reflect freely..."
              value={reflectionBody}
              onChange={(e) => setReflectionBody(e.target.value)}
              rows={5}
              style={{ marginBottom: 8 }}
            />
            <button className="btn btn-block" onClick={addReflection}>
              Save Reflection
            </button>
          </div>

          {reflections.length > 0 && (
            <div className="card">
              <div className="card-title">📚 Your Reflections</div>
              {reflections.map((r) => (
                <div key={r.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div className="list-item-title">{r.title}</div>
                  <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4, marginBottom: 4 }}>
                    {r.body.length > 120 ? r.body.slice(0, 120) + '...' : r.body}
                  </div>
                  <div className="list-item-sub">{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === MEDITATION === */}
      {tab === 'meditation' && (
        <>
          <div className="card">
            <div className="card-title">🧘 Log Meditation</div>
            <select
              value={meditationType}
              onChange={(e) => setMeditationType(e.target.value)}
              style={{ marginBottom: 8, width: '100%', padding: 8 }}
            >
              <option value="breath">Breath</option>
              <option value="body-scan">Body scan</option>
              <option value="mantra">Mantra</option>
              <option value="loving-kindness">Loving-kindness</option>
              <option value="visualization">Visualization</option>
              <option value="walking">Walking</option>
              <option value="sound">Sound</option>
              <option value="movement">Movement</option>
            </select>
            <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
              <input
                type="range"
                min="1"
                max="60"
                value={meditationMinutes}
                onChange={(e) => setMeditationMinutes(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <div style={{ width: 60, textAlign: 'center', fontWeight: 700, fontSize: 18 }}>
                {meditationMinutes}m
              </div>
            </div>
            <button className="btn btn-block" onClick={logMeditation}>
              Log Session
            </button>
          </div>

          {meditations.length > 0 && (
            <div className="card">
              <div className="card-title">📊 Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Sessions</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{meditations.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Total Min</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{totalMeditationMin}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Avg/Session</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round(totalMeditationMin / meditations.length)}m</div>
                </div>
              </div>

              <div className="card-title" style={{ marginTop: 12 }}>Recent Sessions</div>
              {meditations.slice(0, 10).map((m) => (
                <div key={m.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{m.type}</div>
                    <div className="list-item-sub">{new Date(m.completedAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{m.minutes}m</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}