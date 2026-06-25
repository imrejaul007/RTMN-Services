import { useEffect, useRef, useState } from 'react';
import { apiPost, specialists, getToken } from '../services/api';
import type { ChatMessage } from '../types';

type Mode = 'chat' | 'voice' | 'camera';

const MODES: Array<{ id: Mode; icon: string; label: string }> = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'voice', icon: '🎙️', label: 'Voice' },
  { id: 'camera', icon: '📷', label: 'Camera' }
];

const QUICK_PROMPTS = [
  'Plan my day',
  'What did I do last week?',
  'Find me a restaurant nearby',
  'How am I doing this month?',
  'Help me think through a decision'
];

export default function GenieTab() {
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Welcome message on mount
  useEffect(() => {
    const welcome: ChatMessage = {
      id: 'welcome',
      role: 'genie',
      content: getToken()
        ? "Hi! I'm Genie. Ask me anything, or tap a quick prompt below to get started."
        : "Hi! Sign in to unlock your personal AI.",
      timestamp: new Date().toISOString()
    };
    setMessages([welcome]);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);

    try {
      const data = await apiPost<{ answer: string }>(`${specialists.gateway}/api/ask`, {
        question: text.trim()
      });
      const genieMsg: ChatMessage = {
        id: `g-${Date.now()}`,
        role: 'genie',
        content: data.answer || 'I had trouble answering that.',
        timestamp: new Date().toISOString()
      };
      setMessages((m) => [...m, genieMsg]);
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'system',
        content: `Error: ${e.message || 'unable to reach Genie'}`,
        timestamp: new Date().toISOString()
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setBusy(false);
    }
  }

  // Web Speech API for voice mode
  function startListening() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      alert('Voice not supported on this browser. Try Chrome or Safari.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    setListening(true);
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setTranscript(t);
    };
    rec.onend = () => {
      setListening(false);
      if (transcript.trim()) send(transcript);
      setTranscript('');
    };
    rec.onerror = () => setListening(false);
    rec.start();
  }

  // Camera mode
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (e: any) {
      alert('Camera not available: ' + e.message);
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  useEffect(() => {
    if (mode === 'camera') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 className="section-title">🧞 Talk to Genie</h2>

      {/* Mode switcher */}
      <div className="pill-row" style={{ marginBottom: 16 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`pill ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Chat / Voice messages */}
      {(mode === 'chat' || mode === 'voice') && (
        <>
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 16
            }}
          >
            <div className="chat-list">
              {messages.map((m) => (
                <div key={m.id} className={`chat-msg ${m.role}`}>
                  {m.content}
                </div>
              ))}
              {busy && (
                <div className="chat-msg genie">
                  <div className="spinner" />
                </div>
              )}
            </div>
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="pill-row" style={{ margin: '8px 0' }}>
              {QUICK_PROMPTS.map((p) => (
                <button key={p} className="pill" onClick={() => send(p)}>
                  {p}
                </button>
              ))}
            </div>
          )}

          {mode === 'voice' && (
            <div className="card" style={{ textAlign: 'center' }}>
              <button
                className="btn"
                style={{ width: 80, height: 80, borderRadius: '50%', fontSize: 32 }}
                onClick={startListening}
                disabled={listening}
              >
                {listening ? '🔴' : '🎙️'}
              </button>
              <div className="muted small" style={{ marginTop: 8 }}>
                {listening ? `Listening: "${transcript}"` : 'Tap to speak'}
              </div>
            </div>
          )}

          {/* Input bar */}
          {mode === 'chat' && (
            <div className="chat-input-bar">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask Genie anything..."
                disabled={busy}
              />
              <button className="btn" onClick={() => send(input)} disabled={busy || !input.trim()}>
                Send
              </button>
            </div>
          )}
        </>
      )}

      {/* Camera mode */}
      {mode === 'camera' && (
        <div className="card">
          <video
            ref={videoRef}
            style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000' }}
            playsInline
            muted
          />
          <div className="muted small" style={{ marginTop: 8 }}>
            Point your camera at anything and ask Genie about it.
          </div>
          <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => send('What do you see in this image?')}>
            📸 Capture & Ask
          </button>
        </div>
      )}
    </div>
  );
}