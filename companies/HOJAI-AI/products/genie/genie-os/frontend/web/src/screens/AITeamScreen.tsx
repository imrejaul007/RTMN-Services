import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, specialists } from '../services/api';

interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  persona: string;
  expertise?: string[];
  rating?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  aiUsed?: boolean;
}

export default function AITeamScreen() {
  const navigate = useNavigate();
  const [team, setTeam] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHire, setShowHire] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hire form
  const [hName, setHName] = useState('');
  const [hRole, setHRole] = useState('coach');
  const [hSpecialty, setHSpecialty] = useState('');
  const [hPersona, setHPersona] = useState('');
  const [hiring, setHiring] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet<{ team: Member[] }>(`${specialists.aiteam}/team/list/user-001`);
      setTeam(res.team || []);
    } finally {
      setLoading(false);
    }
  }

  async function pickMember(m: Member) {
    setSelectedMember(m);
    const res = await apiGet<{ messages: ChatMessage[] }>(`${specialists.aiteam}/team/history/user-001/${m.id}`);
    setMessages(res.messages || []);
  }

  async function send() {
    if (!selectedMember || input.trim().length === 0) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const res = await apiPost<{ data: { userMessage: ChatMessage; reply: ChatMessage } }>(
        `${specialists.aiteam}/team/chat/user-001/${selectedMember.id}`,
        { message: text, useAI: true }
      );
      setMessages((prev) => [...prev, res.data.userMessage, res.data.reply]);
    } finally {
      setSending(false);
    }
  }

  async function hire() {
    if (hName.trim().length < 2 || hSpecialty.trim().length < 5 || hPersona.trim().length < 5) {
      alert('Please fill all fields');
      return;
    }
    setHiring(true);
    try {
      const res = await apiPost<{ data: Member }>(`${specialists.aiteam}/team/hire/user-001`, {
        name: hName.trim(),
        role: hRole,
        specialty: hSpecialty.trim(),
        persona: hPersona.trim(),
        avatar: '🤖',
      });
      setTeam((prev) => [...prev, res.data]);
      setShowHire(false);
      setHName(''); setHSpecialty(''); setHPersona('');
    } finally {
      setHiring(false);
    }
  }

  async function fire(id: string) {
    if (!confirm('Fire this specialist?')) return;
    await apiDelete(`${specialists.aiteam}/team/fire/user-001/${id}`);
    setTeam((prev) => prev.filter((m) => m.id !== id));
    if (selectedMember?.id === id) setSelectedMember(null);
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>👥 AI Team</h1>
        </div>
        <div className="loading">Loading your team…</div>
      </div>
    );
  }

  // --- Chat view ---
  if (selectedMember) {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div className="header">
          <button onClick={() => setSelectedMember(null)} className="back-btn">←</button>
          <h1>{selectedMember.avatar} {selectedMember.name}</h1>
        </div>
        <div className="muted small" style={{ padding: '0 16px 8px' }}>
          {selectedMember.specialty} · {selectedMember.persona}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {messages.length === 0 ? (
            <div className="empty" style={{ marginTop: 40 }}>
              Start a conversation with {selectedMember.name}.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: m.role === 'user' ? 'rgba(140,180,255,0.15)' : 'rgba(255,255,255,0.05)',
                  marginLeft: m.role === 'user' ? 24 : 0,
                  marginRight: m.role === 'user' ? 0 : 24,
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
                  {m.role === 'user' ? 'You' : selectedMember.name}
                  {m.aiUsed && ' · 🤖'}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !sending) send(); }}
            placeholder={`Message ${selectedMember.name}…`}
            style={{ flex: 1 }}
            disabled={sending}
          />
          <button onClick={send} disabled={sending || !input.trim()} className="btn">
            {sending ? '…' : '➤'}
          </button>
        </div>
      </div>
    );
  }

  // --- Team list view ---
  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>👥 AI Team</h1>
      </div>
      <div className="muted small" style={{ padding: '0 16px 12px' }}>
        Your personal roster of AI specialists. Tap one to start chatting.
      </div>

      {showHire ? (
        <div className="card" style={{ margin: '0 16px 12px' }}>
          <div className="card-title">✨ Hire a new specialist</div>
          <input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Name (e.g. 'Chef Marco')" style={{ marginBottom: 8, width: '100%' }} />
          <select value={hRole} onChange={(e) => setHRole(e.target.value)} style={{ marginBottom: 8, width: '100%' }}>
            <option value="coach">Coach</option>
            <option value="doctor">Doctor</option>
            <option value="lawyer">Lawyer</option>
            <option value="therapist">Therapist</option>
            <option value="tutor">Tutor</option>
            <option value="chef">Chef</option>
            <option value="trainer">Trainer</option>
            <option value="advisor">Advisor</option>
            <option value="creative">Creative</option>
            <option value="mentor">Mentor</option>
          </select>
          <input value={hSpecialty} onChange={(e) => setHSpecialty(e.target.value)} placeholder="Specialty (e.g. 'Italian home cooking')" style={{ marginBottom: 8, width: '100%' }} />
          <textarea value={hPersona} onChange={(e) => setHPersona(e.target.value)} placeholder="Persona (e.g. 'Warm, encouraging, recipe-first')" style={{ marginBottom: 8, width: '100%', minHeight: 60, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={hire} disabled={hiring} style={{ flex: 1 }}>
              {hiring ? 'Hiring…' : 'Hire'}
            </button>
            <button className="btn" onClick={() => setShowHire(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 16px 12px' }}>
          <button className="btn btn-block" onClick={() => setShowHire(true)}>+ Hire a specialist</button>
        </div>
      )}

      <div style={{ padding: '0 16px 24px', display: 'grid', gap: 12 }}>
        {team.map((m) => (
          <div key={m.id} className="card" style={{ cursor: 'pointer' }} onClick={() => pickMember(m)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 32 }}>{m.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.role}</div>
                </div>
              </div>
              {m.rating ? (
                <div style={{ fontSize: 12, opacity: 0.8 }}>⭐ {m.rating}</div>
              ) : null}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}>{m.specialty}</div>
            <div style={{ fontSize: 12, opacity: 0.6, fontStyle: 'italic', marginBottom: 8 }}>{m.persona}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn" style={{ fontSize: 12 }} onClick={(e) => { e.stopPropagation(); pickMember(m); }}>
                💬 Chat
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); fire(m.id); }}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,140,140,0.6)', cursor: 'pointer', fontSize: 12, padding: 4 }}
              >
                Fire
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
