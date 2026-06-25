import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, specialists } from '../services/api';

interface Twin {
  id: string;
  userId: string;
  name: string;
  pronouns?: string;
  age?: number;
  location?: string;
  occupation?: string;
  relationshipStatus?: string;
  headline?: string;
  bio?: string;
  mood?: { current?: string; trend?: string; score?: number };
  energy?: { current?: string; score?: number };
  focus?: string[];
}

interface Trait {
  id: string;
  category: string;
  name: string;
  strength: number;
  examples?: string[];
}

interface Moment {
  id: string;
  type: string;
  title: string;
  date: string;
  description?: string;
  impact: string;
}

interface TwinResponse {
  twin: Twin;
  traits: Trait[];
  moments: Moment[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  value: '💎',
  skill: '🛠️',
  interest: '✨',
  goal: '🎯',
  fear: '⚠️',
};

const IMPACT_COLOR: Record<string, string> = {
  low: 'rgba(180,180,180,0.4)',
  medium: 'rgba(255,220,140,0.5)',
  high: 'rgba(255,140,140,0.5)',
  transformative: 'rgba(180,140,255,0.7)',
};

const TYPE_EMOJI: Record<string, string> = {
  milestone: '🏆',
  relationship: '💞',
  learning: '📚',
  loss: '🌧️',
  win: '🥇',
  travel: '✈️',
  health: '💪',
  career: '💼',
};

type Tab = 'profile' | 'traits' | 'moments';

export default function PersonalTwinScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');
  const [data, setData] = useState<TwinResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHeadline, setEditHeadline] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAge, setEditAge] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Add trait
  const [showAddTrait, setShowAddTrait] = useState(false);
  const [traitCategory, setTraitCategory] = useState('value');
  const [traitName, setTraitName] = useState('');
  const [traitStrength, setTraitStrength] = useState(7);
  const [addingTrait, setAddingTrait] = useState(false);

  // Add moment
  const [showAddMoment, setShowAddMoment] = useState(false);
  const [momentType, setMomentType] = useState('milestone');
  const [momentTitle, setMomentTitle] = useState('');
  const [momentDate, setMomentDate] = useState(new Date().toISOString().slice(0, 10));
  const [momentImpact, setMomentImpact] = useState('medium');
  const [momentDesc, setMomentDesc] = useState('');
  const [addingMoment, setAddingMoment] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet<{ data: TwinResponse }>(`${specialists.personaltwin}/twin/get/user-001`);
      setData(res.data);
      setEditName(res.data?.twin?.name || '');
      setEditHeadline(res.data?.twin?.headline || '');
      setEditLocation(res.data?.twin?.location || '');
      setEditAge(String(res.data?.twin?.age || ''));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setError(null);
    try {
      await apiPost(`${specialists.personaltwin}/twin/update/user-001`, {
        name: editName,
        headline: editHeadline,
        location: editLocation,
        age: editAge ? parseInt(editAge, 10) : undefined,
      });
      setEditing(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function addTrait() {
    if (traitName.trim().length < 2) {
      alert('Trait name must be at least 2 characters');
      return;
    }
    setAddingTrait(true);
    setError(null);
    try {
      await apiPost(`${specialists.personaltwin}/traits/add/user-001`, {
        category: traitCategory,
        name: traitName.trim(),
        strength: traitStrength,
      });
      setTraitName('');
      setTraitStrength(7);
      setShowAddTrait(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingTrait(false);
    }
  }

  async function removeTrait(id: string) {
    if (!confirm('Remove this trait?')) return;
    try {
      await apiDelete(`${specialists.personaltwin}/traits/remove/user-001/${id}`);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function addMoment() {
    if (momentTitle.trim().length < 2) {
      alert('Moment title must be at least 2 characters');
      return;
    }
    setAddingMoment(true);
    setError(null);
    try {
      await apiPost(`${specialists.personaltwin}/moments/add/user-001`, {
        type: momentType,
        title: momentTitle.trim(),
        date: momentDate,
        impact: momentImpact,
        description: momentDesc,
      });
      setMomentTitle('');
      setMomentDesc('');
      setShowAddMoment(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingMoment(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>👤 Personal Twin</h1>
        </div>
        <div className="loading">Loading your twin…</div>
      </div>
    );
  }

  const { twin, traits, moments } = data;

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>👤 Personal Twin</h1>
      </div>

      <div className="muted small" style={{ padding: '0 16px 12px' }}>
        Your digital avatar. The source of truth that every Genie specialist consults.
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      <div className="tab-bar">
        <button className={tab === 'profile' ? 'tab active' : 'tab'} onClick={() => setTab('profile')}>Profile</button>
        <button className={tab === 'traits' ? 'tab active' : 'tab'} onClick={() => setTab('traits')}>Traits ({traits.length})</button>
        <button className={tab === 'moments' ? 'tab active' : 'tab'} onClick={() => setTab('moments')}>Moments ({moments.length})</button>
      </div>

      {/* === PROFILE === */}
      {tab === 'profile' && (
        <>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>👤</div>
            {editing ? (
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" style={{ marginBottom: 8, textAlign: 'center', fontWeight: 700 }} />
            ) : (
              <div style={{ fontSize: 22, fontWeight: 700 }}>{twin.name}</div>
            )}
            {twin.pronouns && <div className="muted small">({twin.pronouns})</div>}
            {editing ? (
              <input value={editHeadline} onChange={(e) => setEditHeadline(e.target.value)} placeholder="Headline" style={{ marginTop: 8, textAlign: 'center', fontStyle: 'italic' }} />
            ) : (
              twin.headline && <div style={{ fontStyle: 'italic', opacity: 0.85, marginTop: 4 }}>"{twin.headline}"</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">📊 Quick facts</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {editing ? (
                <>
                  <div className="muted small">Age</div>
                  <input value={editAge} onChange={(e) => setEditAge(e.target.value)} type="number" placeholder="Age" />
                  <div className="muted small" style={{ marginTop: 8 }}>Location</div>
                  <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" />
                </>
              ) : (
                <>
                  {twin.age && <FactRow label="Age" value={String(twin.age)} />}
                  {twin.location && <FactRow label="Location" value={twin.location} />}
                  {twin.occupation && <FactRow label="Occupation" value={twin.occupation} />}
                  {twin.relationshipStatus && <FactRow label="Relationship" value={twin.relationshipStatus} />}
                </>
              )}
            </div>
          </div>

          {twin.mood && (
            <div className="card">
              <div className="card-title">💫 Current state</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div className="muted small">Mood</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{twin.mood.current || '—'}</div>
                  {typeof twin.mood.score === 'number' && (
                    <div style={{ fontSize: 11, opacity: 0.7 }}>Score: {twin.mood.score}/10</div>
                  )}
                </div>
                {twin.energy && (
                  <div>
                    <div className="muted small">Energy</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{twin.energy.current || '—'}</div>
                    {typeof twin.energy.score === 'number' && (
                      <div style={{ fontSize: 11, opacity: 0.7 }}>Score: {twin.energy.score}/10</div>
                    )}
                  </div>
                )}
              </div>
              {twin.focus && twin.focus.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="muted small" style={{ marginBottom: 6 }}>Current focus</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {twin.focus.map((f) => (
                      <span key={f} style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(180,140,255,0.18)', borderRadius: 10 }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 12, padding: '0 16px' }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={saveProfile} disabled={savingProfile} style={{ flex: 1 }}>
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
                <button className="btn" onClick={() => setEditing(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="btn btn-block" onClick={() => setEditing(true)}>
                ✏️ Edit profile
              </button>
            )}
          </div>
        </>
      )}

      {/* === TRAITS === */}
      {tab === 'traits' && (
        <>
          {(['value', 'skill', 'interest', 'goal', 'fear'] as const).map((cat) => {
            const catTraits = traits.filter((t) => t.category === cat);
            if (catTraits.length === 0) return null;
            return (
              <div key={cat} className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">
                  {CATEGORY_EMOJI[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}s ({catTraits.length})
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {catTraits
                    .sort((a, b) => b.strength - a.strength)
                    .map((t) => (
                      <div key={t.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                          <button onClick={() => removeTrait(t.id)} style={{
                            background: 'transparent', border: 'none', color: 'rgba(255,140,140,0.7)',
                            cursor: 'pointer', fontSize: 16, padding: 4,
                          }}>×</button>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${t.strength * 10}%`,
                            background: t.strength >= 8 ? 'rgba(140,255,180,0.7)' : t.strength >= 5 ? 'rgba(255,220,140,0.7)' : 'rgba(180,180,180,0.7)',
                          }} />
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>Strength: {t.strength}/10</div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}

          {showAddTrait ? (
            <div className="card">
              <div className="card-title">✨ Add a trait</div>
              <select value={traitCategory} onChange={(e) => setTraitCategory(e.target.value)} style={{ marginBottom: 8, width: '100%' }}>
                <option value="value">Value</option>
                <option value="skill">Skill</option>
                <option value="interest">Interest</option>
                <option value="goal">Goal</option>
                <option value="fear">Fear</option>
              </select>
              <input value={traitName} onChange={(e) => setTraitName(e.target.value)} placeholder="e.g. Curiosity" style={{ marginBottom: 8, width: '100%' }} />
              <label className="muted small">Strength: {traitStrength}/10</label>
              <input type="range" min="1" max="10" value={traitStrength} onChange={(e) => setTraitStrength(parseInt(e.target.value, 10))} style={{ width: '100%', marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={addTrait} disabled={addingTrait} style={{ flex: 1 }}>
                  {addingTrait ? 'Adding…' : 'Add'}
                </button>
                <button className="btn" onClick={() => setShowAddTrait(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0 16px' }}>
              <button className="btn btn-block" onClick={() => setShowAddTrait(true)}>+ Add trait</button>
            </div>
          )}
        </>
      )}

      {/* === MOMENTS === */}
      {tab === 'moments' && (
        <>
          {moments.length === 0 ? (
            <div className="empty">No moments yet — add your first turning point.</div>
          ) : (
            moments.map((m) => (
              <div key={m.id} className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${IMPACT_COLOR[m.impact] || 'rgba(255,255,255,0.2)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {TYPE_EMOJI[m.type] || '📌'} {m.title}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{m.date}</div>
                </div>
                {m.description && (
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>{m.description}</div>
                )}
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    background: IMPACT_COLOR[m.impact] || 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    textTransform: 'uppercase',
                  }}>{m.impact}</span>
                </div>
              </div>
            ))
          )}

          {showAddMoment ? (
            <div className="card">
              <div className="card-title">📌 Add a moment</div>
              <select value={momentType} onChange={(e) => setMomentType(e.target.value)} style={{ marginBottom: 8, width: '100%' }}>
                <option value="milestone">Milestone</option>
                <option value="relationship">Relationship</option>
                <option value="learning">Learning</option>
                <option value="win">Win</option>
                <option value="travel">Travel</option>
                <option value="health">Health</option>
                <option value="career">Career</option>
                <option value="loss">Loss</option>
              </select>
              <input value={momentTitle} onChange={(e) => setMomentTitle(e.target.value)} placeholder="Title" style={{ marginBottom: 8, width: '100%' }} />
              <input type="date" value={momentDate} onChange={(e) => setMomentDate(e.target.value)} style={{ marginBottom: 8, width: '100%' }} />
              <select value={momentImpact} onChange={(e) => setMomentImpact(e.target.value)} style={{ marginBottom: 8, width: '100%' }}>
                <option value="low">Low impact</option>
                <option value="medium">Medium impact</option>
                <option value="high">High impact</option>
                <option value="transformative">Transformative</option>
              </select>
              <textarea value={momentDesc} onChange={(e) => setMomentDesc(e.target.value)} placeholder="Description (optional)" style={{ marginBottom: 12, width: '100%', minHeight: 60, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={addMoment} disabled={addingMoment} style={{ flex: 1 }}>
                  {addingMoment ? 'Adding…' : 'Add'}
                </button>
                <button className="btn" onClick={() => setShowAddMoment(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0 16px' }}>
              <button className="btn btn-block" onClick={() => setShowAddMoment(true)}>+ Add moment</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="muted small">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
