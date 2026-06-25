import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Deck { id: string; userId: string; title: string; description: string; cardCount: number; }
interface Card { id: string; deckId: string; front: string; back: string; tags: string[]; interval: number; ease: number; reps: number; dueAt: string; }
interface DeckWithCards extends Deck { cards: Card[]; }
interface Path { id: string; title: string; description: string; weeks: number; dailyMinutes: number; modules: number; tags: string[]; }
interface PathDetail extends Path { modules_list: Array<{ week: number; title: string; lessons: string[] }>; }
interface Streak { totalReviews: number; streakDays: number; totalCards: number; cardsDue: number; lastReviewAt: string | null; }
type Rating = 'again' | 'hard' | 'good' | 'easy';

type Tab = 'decks' | 'review' | 'paths' | 'streak';

export default function LearnerScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('decks');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, p, s] = await Promise.allSettled([
        apiGet<{ decks: Deck[] }>(`${specialists.learner}/decks/by-user/${USER_ID}`),
        apiGet<{ paths: Path[] }>(`${specialists.learner}/paths`),
        apiGet<{ data: Streak }>(`${specialists.learner}/users/${USER_ID}/streak`),
      ]);
      if (d.status === 'fulfilled') setDecks(d.value.decks || []);
      if (p.status === 'fulfilled') setPaths(p.value.paths || []);
      if (s.status === 'fulfilled') setStreak(s.value.data);
    } finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>🎓 Learner</h1>
        </div>
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>🎓 Learner</h1>
      </div>

      {streak && (
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
          <Kpi label="🔥 Streak" value={`${streak.streakDays}d`} />
          <Kpi label="📚 Cards" value={`${streak.totalCards}`} />
          <Kpi label="📝 Due" value={`${streak.cardsDue}`} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px', overflowX: 'auto' }}>
        {(['decks', 'review', 'paths', 'streak'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'btn' : 'btn-secondary'}
            style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'decks' && <DecksTab decks={decks} onChanged={load} />}
      {tab === 'review' && <ReviewTab decks={decks} onChanged={load} />}
      {tab === 'paths' && <PathsTab paths={paths} />}
      {tab === 'streak' && streak && <StreakTab streak={streak} />}
    </div>
  );
}

function DecksTab({ decks, onChanged }: { decks: Deck[]; onChanged: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [openDeck, setOpenDeck] = useState<DeckWithCards | null>(null);

  async function add() {
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      await apiPost(`${specialists.learner}/decks/by-user/${USER_ID}`, { title: title.trim() });
      setTitle('');
      await onChanged();
    } finally { setBusy(false); }
  }

  async function open(id: string) {
    const r = await apiGet<DeckWithCards>(`${specialists.learner}/decks/${id}`);
    setOpenDeck(r);
  }

  async function del(id: string) {
    if (!confirm('Delete deck and all its cards?')) return;
    await apiDelete(`${specialists.learner}/decks/${id}/${USER_ID}`);
    setOpenDeck(null);
    await onChanged();
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ New deck</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spanish Vocab, React Hooks…"
            style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }} />
          <button className="btn" disabled={busy} onClick={add}>Add</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">📚 Decks ({decks.length})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {decks.map((d) => (
            <div key={d.id} style={{ padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }} onClick={() => open(d.id)}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{d.cardCount} cards · {d.description || 'no description'}</div>
                </div>
                <button onClick={() => del(d.id)} style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ffaaaa', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
          {decks.length === 0 && <div className="muted small">No decks yet. Add one above.</div>}
        </div>
      </div>

      {openDeck && (
        <DeckModal deck={openDeck} onClose={() => setOpenDeck(null)} onChanged={onChanged} />
      )}
    </div>
  );
}

function DeckModal({ deck, onClose, onChanged }: { deck: DeckWithCards; onClose: () => void; onChanged: () => Promise<void> }) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!front.trim() || !back.trim()) return;
    setBusy(true);
    try {
      await apiPost(`${specialists.learner}/decks/${deck.id}/cards`, { userId: USER_ID, front: front.trim(), back: back.trim() });
      setFront(''); setBack('');
      const r = await apiGet<DeckWithCards>(`${specialists.learner}/decks/${deck.id}`);
      Object.assign(deck, r);
      await onChanged();
      // Force re-render of modal by closing+reopening? Simpler: trigger via state copy
      onClose();
      setTimeout(() => openDeckHack(deck.id), 50);
    } finally { setBusy(false); }
  }

  // hack to re-open after add
  function openDeckHack(id: string) {
    apiGet<DeckWithCards>(`${specialists.learner}/decks/${id}`).then((d) => {
      // re-set via custom event pattern? simpler: store parent state.
    });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1a1a', borderRadius: '12px 12px 0 0', padding: 16, width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{deck.title}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{deck.cards.length} cards</div>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 12px' }}>Close</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front (question)"
            style={{ width: '100%', padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
          <input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back (answer)"
            style={{ width: '100%', padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, marginTop: 6, boxSizing: 'border-box' }} />
          <button className="btn btn-block" style={{ marginTop: 6 }} disabled={busy} onClick={add}>Add card</button>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          {deck.cards.map((c) => (
            <div key={c.id} style={{ padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.front}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>→ {c.back}</div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>📊 {c.reps} reps · ease {c.ease} · due {new Date(c.dueAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewTab({ decks, onChanged }: { decks: Deck[]; onChanged: () => Promise<void> }) {
  const [deckId, setDeckId] = useState<string | null>(null);
  const [due, setDue] = useState<Card[]>([]);
  const [current, setCurrent] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (deckId) loadDue();
  }, [deckId]);

  async function loadDue() {
    if (!deckId) return;
    const r = await apiGet<{ due: Card[] }>(`${specialists.learner}/decks/${deckId}/review?userId=${USER_ID}`);
    setDue(r.due || []);
    setCurrent(0);
    setShowBack(false);
  }

  async function rate(rating: Rating) {
    if (!due[current]) return;
    setBusy(true);
    try {
      await apiPost(`${specialists.learner}/review/${due[current].id}`, { userId: USER_ID, rating });
      // Move to next card
      const next = current + 1;
      if (next >= due.length) {
        await loadDue();
        await onChanged();
      } else {
        setCurrent(next);
        setShowBack(false);
      }
    } finally { setBusy(false); }
  }

  if (!deckId) {
    return (
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card">
          <div className="card-title">📖 Pick a deck to review</div>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {decks.map((d) => (
              <button key={d.id} onClick={() => setDeckId(d.id)}
                style={{ padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>
                📚 {d.title} <span style={{ opacity: 0.6, fontSize: 11 }}>({d.cardCount} cards)</span>
              </button>
            ))}
            {decks.length === 0 && <div className="muted small">No decks. Create one first.</div>}
          </div>
        </div>
      </div>
    );
  }

  if (due.length === 0) {
    return (
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card">
          <div className="card-title">✅ All caught up!</div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>No cards due in this deck. Check back later.</div>
          <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => setDeckId(null)}>Back to decks</button>
        </div>
      </div>
    );
  }

  const card = due[current];
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>Card {current + 1} / {due.length}</div>
      <div className="card" onClick={() => setShowBack(true)} style={{ cursor: 'pointer', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>{card.front}</div>
        {!showBack ? (
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 16 }}>Tap to reveal</div>
        ) : (
          <div style={{ fontSize: 18, marginTop: 16, padding: 12, background: 'rgba(126,211,33,0.15)', borderRadius: 8, textAlign: 'center' }}>{card.back}</div>
        )}
      </div>

      {showBack && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
          <RateBtn label="Again" color="#ff6b6b" disabled={busy} onClick={() => rate('again')} />
          <RateBtn label="Hard" color="#ffa500" disabled={busy} onClick={() => rate('hard')} />
          <RateBtn label="Good" color="#7ed321" disabled={busy} onClick={() => rate('good')} />
          <RateBtn label="Easy" color="#4a90e2" disabled={busy} onClick={() => rate('easy')} />
        </div>
      )}

      <button className="btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => setDeckId(null)}>← Back</button>
    </div>
  );
}

function RateBtn({ label, color, disabled, onClick }: { label: string; color: string; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: 10, background: color, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {label}
    </button>
  );
}

function PathsTab({ paths }: { paths: Path[] }) {
  const [open, setOpen] = useState<PathDetail | null>(null);

  async function openPath(id: string) {
    const r = await apiGet<{ data: PathDetail }>(`${specialists.learner}/paths/${id}`);
    setOpen(r.data);
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">🛤️ Curated paths ({paths.length})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {paths.map((p) => (
            <div key={p.id} onClick={() => openPath(p.id)}
              style={{ padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, cursor: 'pointer' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{p.description}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, opacity: 0.6 }}>
                <span>📅 {p.weeks} weeks</span>
                <span>⏱ {p.dailyMinutes}min/day</span>
                <span>📚 {p.modules} lessons</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', borderRadius: '12px 12px 0 0', padding: 16, width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{open.title}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{open.weeks} weeks · {open.modules} lessons</div>
              </div>
              <button onClick={() => setOpen(null)} className="btn-secondary" style={{ padding: '4px 12px' }}>Close</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {open.modules_list.map((m) => (
                <div key={m.week} style={{ padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>Week {m.week}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{m.title}</div>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, fontSize: 12, opacity: 0.85 }}>
                    {m.lessons.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StreakTab({ streak }: { streak: Streak }) {
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">🔥 Streak</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <Kpi label="🔥 Days" value={`${streak.streakDays}`} />
          <Kpi label="📝 Reviews" value={`${streak.totalReviews}`} />
          <Kpi label="📚 Cards" value={`${streak.totalCards}`} />
          <Kpi label="⏰ Due" value={`${streak.cardsDue}`} />
        </div>
        {streak.lastReviewAt && (
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12 }}>Last review: {new Date(streak.lastReviewAt).toLocaleString()}</div>
        )}
      </div>

      <div className="card">
        <div className="card-title">💡 How it works</div>
        <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.85, marginTop: 8 }}>
          <div><strong>SM-2-lite</strong> spaced repetition:</div>
          <div style={{ marginTop: 6 }}>
            <strong style={{ color: '#ff6b6b' }}>Again</strong> — forgot: reset interval, lower ease<br />
            <strong style={{ color: '#ffa500' }}>Hard</strong> — slow: small bump, lower ease<br />
            <strong style={{ color: '#7ed321' }}>Good</strong> — recalled: standard interval bump<br />
            <strong style={{ color: '#4a90e2' }}>Easy</strong> — easy: bigger bump, raise ease
          </div>
          <div style={{ marginTop: 8, opacity: 0.7 }}>
            Review every day to keep your streak going. The app reschedules each card based on how well you remembered it.
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 10, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>{value}</div>
    </div>
  );
}
