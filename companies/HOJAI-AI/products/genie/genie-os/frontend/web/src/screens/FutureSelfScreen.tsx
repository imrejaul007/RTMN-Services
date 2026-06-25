import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

interface Advice {
  id: string;
  question: string;
  year: number;
  advice: string;
  themes: string[];
  createdAt: string;
}

interface Letter {
  id: string;
  year: number;
  subject: string;
  body: string;
  createdAt: string;
}

interface Profile {
  values: string[];
  goals: string[];
  priorities: string[];
  fears: string[];
  hopes: string[];
  age?: number | null;
  year?: number;
}

type Tab = 'ask' | 'letters' | 'history' | 'profile';

export default function FutureSelfScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('ask');
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [question, setQuestion] = useState('');
  const [year, setYear] = useState(2035);
  const [generatingAdvice, setGeneratingAdvice] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [letterYear, setLetterYear] = useState(2040);
  const [letterSubject, setLetterSubject] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileValues, setProfileValues] = useState('');
  const [profileGoals, setProfileGoals] = useState('');
  const [profileFears, setProfileFears] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [histRes, lettersRes, profileRes] = await Promise.allSettled([
        apiGet<{ advice: Advice[] }>(`${specialists.futureself}/advice/history/user-001`),
        apiGet<{ letters: Letter[] }>(`${specialists.futureself}/letter/list/user-001`),
        apiGet<{ data: Profile }>(`${specialists.futureself}/profile/get/user-001`),
      ]);
      if (histRes.status === 'fulfilled') setAdvice(histRes.value.advice || []);
      if (lettersRes.status === 'fulfilled') setLetters(lettersRes.value.letters || []);
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data || null);
        setProfileValues((profileRes.value.data?.values || []).join(', '));
        setProfileGoals((profileRes.value.data?.goals || []).join(', '));
        setProfileFears((profileRes.value.data?.fears || []).join(', '));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function askFutureSelf() {
    if (question.trim().length < 3) {
      alert('Question must be at least 3 characters');
      return;
    }
    setGeneratingAdvice(true);
    setError(null);
    try {
      await apiPost(`${specialists.futureself}/advice/ask/user-001`, {
        question: question.trim(),
        year,
      });
      setQuestion('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to ask future self');
    } finally {
      setGeneratingAdvice(false);
    }
  }

  async function writeLetter() {
    setGeneratingLetter(true);
    setError(null);
    try {
      await apiPost(`${specialists.futureself}/letter/write/user-001`, {
        year: letterYear,
        subject: letterSubject || undefined,
      });
      setLetterSubject('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to write letter');
    } finally {
      setGeneratingLetter(false);
    }
  }

  async function saveProfile() {
    try {
      const values = profileValues.split(',').map(s => s.trim()).filter(Boolean);
      const goals = profileGoals.split(',').map(s => s.trim()).filter(Boolean);
      const fears = profileFears.split(',').map(s => s.trim()).filter(Boolean);
      await apiPost(`${specialists.futureself}/profile/update/user-001`, { values, goals, fears });
      setEditingProfile(false);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to update profile');
    }
  }

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </button>
      <h2 className="section-title">🔮 Future Self</h2>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Time-shifted advice from your future self — ask anything, read letters from the future, and shape the answers you receive.
      </p>

      {/* Tab switcher */}
      <div className="row" style={{ gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {(['ask', 'letters', 'history', 'profile'] as Tab[]).map(t => (
          <button
            key={t}
            className={`btn ${tab === t ? 'btn-block' : 'btn-secondary'}`}
            style={{ flex: '0 0 auto', minWidth: 70, padding: '8px 12px', fontSize: 13 }}
            onClick={() => setTab(t)}
          >
            {t === 'ask' ? '🤔 Ask' : t === 'letters' ? '✉️ Letters' : t === 'history' ? '📚 History' : '👤 Profile'}
          </button>
        ))}
      </div>

      {loading && <div className="empty"><div className="spinner" /></div>}

      {error && (
        <div style={{ marginBottom: 12, padding: 8, background: 'var(--danger-bg, rgba(255,0,0,0.1))', borderRadius: 6, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* === ASK === */}
      {tab === 'ask' && (
        <>
          <div className="card">
            <div className="card-title">🤔 Ask Your Future Self</div>
            <textarea
              placeholder="What do you want to know? (e.g., 'Should I take this job?' 'Will I regret not traveling?')"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              style={{ marginBottom: 12 }}
            />
            <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, opacity: 0.85, marginRight: 12 }}>From year:</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={{ flex: 1, padding: 8 }}
              >
                <option value={2030}>2030</option>
                <option value={2035}>2035</option>
                <option value={2040}>2040</option>
                <option value={2045}>2045</option>
                <option value={2050}>2050</option>
              </select>
            </div>
            <button
              className="btn btn-block"
              disabled={generatingAdvice}
              onClick={askFutureSelf}
            >
              {generatingAdvice ? '🔮 Asking the future...' : '🔮 Ask'}
            </button>
          </div>

          {advice.length > 0 && (
            <div className="card">
              <div className="card-title">💬 Latest Advice</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                From {advice[0].year} • Asked: "{advice[0].question}"
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>{advice[0].advice}</p>
              {advice[0].themes && advice[0].themes.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {advice[0].themes.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        background: 'rgba(180,140,255,0.2)',
                        borderRadius: 12,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* === LETTERS === */}
      {tab === 'letters' && (
        <>
          <div className="card">
            <div className="card-title">✉️ Write a Letter</div>
            <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, opacity: 0.85, marginRight: 12 }}>From year:</label>
              <select
                value={letterYear}
                onChange={(e) => setLetterYear(parseInt(e.target.value))}
                style={{ flex: 1, padding: 8 }}
              >
                <option value={2030}>2030</option>
                <option value={2035}>2035</option>
                <option value={2040}>2040</option>
                <option value={2045}>2045</option>
                <option value={2050}>2050</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Subject (optional)"
              value={letterSubject}
              onChange={(e) => setLetterSubject(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <button
              className="btn btn-block"
              disabled={generatingLetter}
              onClick={writeLetter}
            >
              {generatingLetter ? '✍️ Writing...' : '✍️ Write Letter from Future Self'}
            </button>
          </div>

          {letters.length > 0 && (
            <div className="card">
              <div className="card-title">📜 Your Letters</div>
              {letters.map((l) => (
                <details key={l.id} style={{ marginBottom: 12 }}>
                  <summary style={{ cursor: 'pointer', padding: '8px 0', fontWeight: 600 }}>
                    {l.subject} <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 13 }}>({l.year})</span>
                  </summary>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    lineHeight: 1.7,
                    padding: 12,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 8,
                    marginTop: 8,
                  }}>
                    {l.body}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </>
      )}

      {/* === HISTORY === */}
      {tab === 'history' && (
        advice.length > 0 ? (
          <div className="card">
            <div className="card-title">📚 All Advice ({advice.length})</div>
            {advice.map((a) => (
              <div key={a.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  From {a.year} • {new Date(a.createdAt).toLocaleDateString()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>"{a.question}"</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{a.advice}</p>
                {a.themes && a.themes.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {a.themes.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          background: 'rgba(180,140,255,0.15)',
                          borderRadius: 10,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No advice yet — go ask the future ✨</div>
        )
      )}

      {/* === PROFILE === */}
      {tab === 'profile' && profile && (
        <>
          <div className="card">
            <div className="card-title">👤 Your Profile</div>
            <div className="muted small" style={{ marginBottom: 12 }}>
              These shape how your future self answers you. The more specific, the better the advice.
            </div>

            {!editingProfile ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Values</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{profile.values.join(', ') || 'Not set'}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Goals</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{profile.goals.join(' • ') || 'Not set'}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Fears</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{profile.fears.join(', ') || 'Not set'}</div>
                </div>
                <button className="btn btn-block" onClick={() => setEditingProfile(true)}>
                  Edit Profile
                </button>
              </>
            ) : (
              <>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Values (comma-separated)</label>
                <input
                  type="text"
                  value={profileValues}
                  onChange={(e) => setProfileValues(e.target.value)}
                  placeholder="family, growth, health"
                  style={{ marginBottom: 12 }}
                />
                <label style={{ fontSize: 12, opacity: 0.7 }}>Goals (comma-separated)</label>
                <input
                  type="text"
                  value={profileGoals}
                  onChange={(e) => setProfileGoals(e.target.value)}
                  placeholder="Launch a product, Read 30 books"
                  style={{ marginBottom: 12 }}
                />
                <label style={{ fontSize: 12, opacity: 0.7 }}>Fears (comma-separated)</label>
                <input
                  type="text"
                  value={profileFears}
                  onChange={(e) => setProfileFears(e.target.value)}
                  placeholder="burning out, losing curiosity"
                  style={{ marginBottom: 12 }}
                />
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-block" onClick={saveProfile}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setEditingProfile(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}