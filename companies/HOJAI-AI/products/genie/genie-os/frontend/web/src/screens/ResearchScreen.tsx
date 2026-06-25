import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Source { id: string; name: string; type: string; url: string; description: string; }
interface Research {
  id: string; topic: string; question: string; summary: string;
  sources: string[]; keyPoints: string[]; saved: boolean; createdAt: string; source: string;
}
interface Topic { topic: string; count: number; }

type Tab = 'ask' | 'history' | 'topics';

export default function ResearchScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('ask');
  const [sources, setSources] = useState<Source[]>([]);
  const [history, setHistory] = useState<Research[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, h, t] = await Promise.allSettled([
        apiGet<{ sources: Source[] }>(`${specialists.research}/sources`),
        apiGet<{ research: Research[] }>(`${specialists.research}/research/list/${USER_ID}`),
        apiGet<{ topics: Topic[] }>(`${specialists.research}/topics/${USER_ID}`),
      ]);
      if (s.status === 'fulfilled') setSources(s.value.sources || []);
      if (h.status === 'fulfilled') setHistory(h.value.research || []);
      if (t.status === 'fulfilled') setTopics(t.value.topics || []);
    } finally { setLoading(false); }
  }

  async function deleteResearch(id: string) {
    if (!confirm('Delete this research?')) return;
    try {
      await apiDelete(`${specialists.research}/research/delete/${id}/${USER_ID}`);
      await load();
    } catch (e: any) { alert(e.message || 'Delete failed'); }
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>🔬 Research</h1>
        </div>
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>🔬 Research</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px', overflowX: 'auto' }}>
        {(['ask', 'history', 'topics'] as Tab[]).map((t) => (
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

      {tab === 'ask' && <AskTab sources={sources} onAsked={load} />}
      {tab === 'history' && <HistoryTab history={history} sources={sources} onDelete={deleteResearch} />}
      {tab === 'topics' && <TopicsTab topics={topics} history={history} />}
    </div>
  );
}

function AskTab({ sources, onAsked }: { sources: Source[]; onAsked: () => Promise<void> }) {
  const [question, setQuestion] = useState('');
  const [topic, setTopic] = useState('');
  const [asking, setAsking] = useState(false);
  const [latest, setLatest] = useState<Research | null>(null);

  async function ask() {
    if (question.trim().length < 10) return;
    setAsking(true);
    try {
      const res = await apiPost<Research>(`${specialists.research}/research/query/${USER_ID}`, {
        question: question.trim(),
        topic: topic.trim() || undefined,
      });
      setLatest(res);
      setQuestion('');
      setTopic('');
      await onAsked();
    } catch (e: any) {
      alert(e.message || 'Ask failed');
    } finally { setAsking(false); }
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">💭 Ask a research question</div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What does the evidence say about X for Y?"
          rows={4}
          style={{
            width: '100%', padding: 10, borderRadius: 8,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
            boxSizing: 'border-box', marginTop: 10,
          }}
        />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (optional, e.g. sleep)"
          style={{
            width: '100%', padding: 10, borderRadius: 8,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', fontSize: 13, marginTop: 8, boxSizing: 'border-box',
          }}
        />
        <button className="btn btn-block" style={{ marginTop: 8 }} disabled={asking || question.trim().length < 10} onClick={ask}>
          {asking ? 'Researching…' : '🔬 Research'}
        </button>
      </div>

      {latest && (
        <div className="card">
          <div className="card-title">📄 {latest.topic} <span style={{ fontSize: 10, opacity: 0.6 }}>({latest.source})</span></div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Q: {latest.question}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 10, whiteSpace: 'pre-wrap' }}>{latest.summary}</div>
          {latest.keyPoints && latest.keyPoints.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Key points</div>
              <ul style={{ paddingLeft: 18, marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
                {latest.keyPoints.map((kp, i) => <li key={i} style={{ marginBottom: 4 }}>{kp}</li>)}
              </ul>
            </div>
          )}
          {latest.sources && latest.sources.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Sources used</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {latest.sources.map((sid) => {
                  const s = sources.find(x => x.id === sid);
                  return s ? (
                    <span key={sid} style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(74,144,226,0.2)', color: '#aaccff', borderRadius: 12 }}>
                      {s.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-title">📚 Source catalog ({sources.length})</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {sources.map((s) => (
            <div key={s.id} style={{ fontSize: 12, padding: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <span style={{ fontWeight: 600 }}>{s.name}</span> <span style={{ opacity: 0.6 }}>• {s.type}</span>
              <div style={{ opacity: 0.7, marginTop: 2 }}>{s.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ history, sources, onDelete }: { history: Research[]; sources: Source[]; onDelete: (id: string) => void }) {
  if (history.length === 0) {
    return (
      <div className="card" style={{ margin: 16 }}>
        <div className="card-title">No research yet</div>
        <div className="muted small">Ask your first question in the Ask tab.</div>
      </div>
    );
  }
  return (
    <div style={{ padding: '0 16px 16px' }}>
      {history.map((r) => (
        <div key={r.id} className="card">
          <div className="card-title">
            🔬 {r.topic} {r.saved && <span style={{ fontSize: 10, opacity: 0.7 }}>(saved)</span>}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{new Date(r.createdAt).toLocaleString()} • {r.source}</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>Q: {r.question}</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 8, opacity: 0.9 }}>
            {r.summary.slice(0, 240)}{r.summary.length > 240 ? '…' : ''}
          </div>
          {r.sources && r.sources.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 10, opacity: 0.7 }}>
              Sources: {r.sources.map((sid) => sources.find(s => s.id === sid)?.name || sid).join(', ')}
            </div>
          )}
          <button
            onClick={() => onDelete(r.id)}
            style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: '1px solid rgba(255,140,140,0.4)', color: 'rgba(255,140,140,0.85)', borderRadius: 8, cursor: 'pointer', marginTop: 8 }}
          >
            🗑️ Delete
          </button>
        </div>
      ))}
    </div>
  );
}

function TopicsTab({ topics, history }: { topics: Topic[]; history: Research[] }) {
  if (topics.length === 0) {
    return (
      <div className="card" style={{ margin: 16 }}>
        <div className="card-title">No topics yet</div>
        <div className="muted small">Topics appear here as you research.</div>
      </div>
    );
  }
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">🏷️ Topics ({topics.length})</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {topics.map((t) => (
            <span key={t.topic} style={{ padding: '6px 12px', background: 'rgba(74,144,226,0.2)', color: '#aaccff', borderRadius: 16, fontSize: 12 }}>
              {t.topic} ({t.count})
            </span>
          ))}
        </div>
      </div>
      <div className="muted small" style={{ padding: '0 4px' }}>
        Total research items: {history.length}
      </div>
    </div>
  );
}