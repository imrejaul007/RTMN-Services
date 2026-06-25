import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPatch, apiDelete, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Template { id: string; name: string; category: string; description: string; structure: string[]; avgLength: number; }
interface Draft { id: string; userId: string; title: string; templateId: string | null; body: string; wordCount: number; tags: string[]; status: string; createdAt: string; updatedAt: string; publishedAt?: string; }
interface CalendarEntry { id: string; userId: string; title: string; type: string; channel: string; date: string; draftId: string | null; status: string; }
interface Stats { totalDrafts: number; byStatus: Record<string, number>; totalWords: number; totalScheduled: number; totalPublished: number; byChannel: Record<string, number>; }

type Tab = 'drafts' | 'templates' | 'calendar' | 'stats';

const STATUS_COLORS: Record<string, string> = {
  draft: '#4a90e2', 'in-review': '#ffa500', published: '#7ed321', archived: '#888',
};

export default function CreatorScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('drafts');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, t, c, s] = await Promise.allSettled([
        apiGet<{ drafts: Draft[] }>(`${specialists.creator}/drafts/by-user/${USER_ID}`),
        apiGet<{ templates: Template[] }>(`${specialists.creator}/templates`),
        apiGet<{ entries: CalendarEntry[] }>(`${specialists.creator}/calendar/by-user/${USER_ID}`),
        apiGet<{ data: Stats }>(`${specialists.creator}/stats/${USER_ID}`),
      ]);
      if (d.status === 'fulfilled') setDrafts(d.value.drafts || []);
      if (t.status === 'fulfilled') setTemplates(t.value.templates || []);
      if (c.status === 'fulfilled') setCalendar(c.value.entries || []);
      if (s.status === 'fulfilled') setStats(s.value.data);
    } finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>✍️ Creator</h1>
        </div>
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>✍️ Creator</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px', overflowX: 'auto' }}>
        {(['drafts', 'templates', 'calendar', 'stats'] as Tab[]).map((t) => (
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

      {tab === 'drafts' && <DraftsTab drafts={drafts} templates={templates} onChanged={load} />}
      {tab === 'templates' && <TemplatesTab templates={templates} />}
      {tab === 'calendar' && <CalendarTab entries={calendar} drafts={drafts} onChanged={load} />}
      {tab === 'stats' && stats && <StatsTab stats={stats} />}
    </div>
  );
}

function DraftsTab({ drafts, templates, onChanged }: { drafts: Draft[]; templates: Template[]; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<Draft | null>(null);

  async function publish(id: string) {
    await apiPost(`${specialists.creator}/drafts/${id}/publish`);
    await onChanged();
  }

  async function del(id: string) {
    if (!confirm('Delete this draft?')) return;
    await apiDelete(`${specialists.creator}/drafts/${id}`);
    await onChanged();
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <button className="btn btn-block" onClick={() => setEditing({
        id: '', userId: USER_ID, title: '', templateId: null, body: '', wordCount: 0, tags: [], status: 'draft',
        createdAt: '', updatedAt: '',
      })}>➕ New draft</button>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">📝 Drafts ({drafts.length})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {drafts.map((d) => (
            <div key={d.id} style={{ padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }} onClick={() => setEditing(d)}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                    {d.wordCount} words · updated {new Date(d.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 12, color: 'white',
                  background: STATUS_COLORS[d.status] || '#888',
                }}>{d.status}</span>
              </div>
              {d.body && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, fontStyle: 'italic' }}>"{d.body.slice(0, 100)}{d.body.length > 100 ? '…' : ''}"</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {d.status !== 'published' && (
                  <button onClick={() => publish(d.id)} style={{ flex: 1, fontSize: 11, padding: '4px 8px', background: 'rgba(126,211,33,0.15)', border: '1px solid rgba(126,211,33,0.3)', color: '#aaffaa', borderRadius: 6, cursor: 'pointer' }}>Publish</button>
                )}
                <button onClick={() => del(d.id)} style={{ flex: 1, fontSize: 11, padding: '4px 8px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ffaaaa', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && <DraftEditor draft={editing} templates={templates} onClose={() => setEditing(null)} onSaved={onChanged} />}
    </div>
  );
}

function DraftEditor({ draft, templates, onClose, onSaved }: { draft: Draft; templates: Template[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [templateId, setTemplateId] = useState(draft.templateId || '');
  const [status, setStatus] = useState(draft.status);
  const [busy, setBusy] = useState(false);
  const isNew = !draft.id;

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  async function save() {
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      if (isNew) {
        await apiPost(`${specialists.creator}/drafts/by-user/${USER_ID}`, {
          title: title.trim(),
          body,
          templateId: templateId || undefined,
        });
      } else {
        await apiPatch(`${specialists.creator}/drafts/${draft.id}`, {
          title: title.trim(), body, status,
          templateId: templateId || null,
        });
      }
      await onSaved();
      onClose();
    } finally { setBusy(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1a1a', borderRadius: '12px 12px 0 0', padding: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? 'New draft' : 'Edit draft'}</div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 12px' }}>Close</button>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          style={{ width: '100%', padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />

        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, marginTop: 8, boxSizing: 'border-box' }}>
          <option value="">No template</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Start writing…"
          rows={10}
          style={{ width: '100%', padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, marginTop: 8, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />

        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{wordCount} words</div>

        {!isNew && (
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, marginTop: 8, boxSizing: 'border-box' }}>
            {['draft', 'in-review', 'published', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <button className="btn btn-block" style={{ marginTop: 12 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

function TemplatesTab({ templates }: { templates: Template[] }) {
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">📋 Templates ({templates.length})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {templates.map((t) => (
            <div key={t.id} style={{ padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(74,144,226,0.2)', color: '#7eb0ff' }}>{t.category}</span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{t.description}</div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6 }}>~{t.avgLength} words avg</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>
                {t.structure.map((s, i) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: i < t.structure.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ opacity: 0.5 }}>{i + 1}.</span> {s}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarTab({ entries, drafts, onChanged }: { entries: CalendarEntry[]; drafts: Draft[]; onChanged: () => Promise<void> }) {
  const [showAdd, setShowAdd] = useState(false);

  async function add(e: CalendarEntry) {
    const { title, type, channel, date, draftId } = e;
    await apiPost(`${specialists.creator}/calendar/by-user/${USER_ID}`, { title, type, channel, date, draftId });
    await onChanged();
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <button className="btn btn-block" onClick={() => setShowAdd(true)}>📅 Schedule content</button>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">📅 Calendar ({entries.length})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {entries.map((c) => {
            const dt = new Date(c.date);
            const draft = drafts.find((d) => d.id === c.draftId);
            return (
              <div key={c.id} style={{ padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                      {dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {draft && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>📝 Linked: {draft.title}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(74,144,226,0.2)', color: '#7eb0ff', display: 'inline-block' }}>{c.channel}</div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>{c.status}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAdd && <CalendarAdder drafts={drafts} onClose={() => setShowAdd(false)} onAdded={async (e) => { await add(e); setShowAdd(false); }} />}
    </div>
  );
}

function CalendarAdder({ drafts, onClose, onAdded }: { drafts: Draft[]; onClose: () => void; onAdded: (e: CalendarEntry) => void }) {
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('blog');
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [draftId, setDraftId] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      await onAdded({
        id: '', userId: USER_ID, title, type: 'publish', channel, date: new Date(date).toISOString(),
        draftId: draftId || null, status: 'scheduled',
      });
    } finally { setBusy(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1a1a', borderRadius: '12px 12px 0 0', padding: 16, width: '100%', maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Schedule content</div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 12px' }}>Close</button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          style={{ width: '100%', padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }}>
            {['blog', 'twitter', 'instagram', 'youtube', 'podcast', 'email', 'linkedin', 'tiktok', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date"
            style={{ flex: 1, padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12 }} />
        </div>
        <select value={draftId} onChange={(e) => setDraftId(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, marginTop: 8, boxSizing: 'border-box' }}>
          <option value="">No linked draft</option>
          {drafts.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        <button className="btn btn-block" style={{ marginTop: 12 }} disabled={busy} onClick={save}>Schedule</button>
      </div>
    </div>
  );
}

function StatsTab({ stats }: { stats: Stats }) {
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">📊 Content stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <Kpi label="📝 Drafts" value={`${stats.totalDrafts}`} />
          <Kpi label="✍️ Words" value={`${stats.totalWords.toLocaleString()}`} />
          <Kpi label="📅 Scheduled" value={`${stats.totalScheduled}`} />
          <Kpi label="✅ Published" value={`${stats.totalPublished}`} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">By status</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {Object.entries(stats.byStatus).map(([s, count]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <span style={{ fontSize: 13 }}>{s}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[s] || 'white' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">By channel</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {Object.entries(stats.byChannel).map(([ch, count]) => (
            <div key={ch} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <span style={{ fontSize: 13 }}>{ch}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{count}</span>
            </div>
          ))}
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
