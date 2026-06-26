import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, signup, setToken, apiPost } from '../services/api';
import { markOnboardingComplete } from '../components/OnboardingGate';

type Step = 'welcome' | 'name' | 'auth' | 'voice' | 'goals' | 'org' | 'done';

const STEPS: Step[] = ['welcome', 'name', 'auth', 'voice', 'goals', 'org', 'done'];
const GOAL_OPTIONS = [
  'Remember everything',
  'Get healthier',
  'Save money',
  'Learn faster',
  'Stay in touch',
  'Be more productive',
  'Plan my life',
  'Think clearer'
];

// Web Speech API TTS — welcome greeting on first mount
function useVoiceGreeting(enabled: boolean) {
  const spoken = useRef(false);
  useEffect(() => {
    if (!enabled || spoken.current) return;
    if (!('speechSynthesis' in window)) return;
    spoken.current = true;
    const utter = new SpeechSynthesisUtterance(
      'Welcome to Genie. Your personal AI for memory, life, and growth.'
    );
    utter.rate = 0.95;
    utter.pitch = 1.05;
    // Prefer a natural voice if available
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google'));
    if (preferred) utter.voice = preferred;
    speechSynthesis.speak(utter);
    return () => { speechSynthesis.cancel(); };
  }, [enabled]);
}

// Mic permission request with graceful fallback
function useMicPermission() {
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied' | 'unavailable'>('idle');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  async function requestPermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('granted');
      initRecognition();
    } catch {
      setStatus('denied');
    }
  }

  function initRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      setTranscript(event.results[0][0].transcript);
    };
    recognitionRef.current = recognition;
  }

  function startListening() {
    recognitionRef.current?.start();
  }

  return { status, transcript, requestPermission, startListening };
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [orgName, setOrgName] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ariaLive, setAriaLive] = useState('');

  // Voice greeting on welcome screen
  useVoiceGreeting(step === 'welcome');

  // Mic hook for voice step
  const mic = useMicPermission();

  function announce(msg: string) {
    setAriaLive(msg);
    setTimeout(() => setAriaLive(''), 1000);
  }

  const stepIndex = STEPS.indexOf(step);

  function next() {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1]);
      announce(`Step ${stepIndex + 2} of ${STEPS.length}`);
    }
  }

  function back() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]);
      announce(`Step ${stepIndex} of ${STEPS.length}`);
    }
  }

  async function doAuth() {
    if (!email || !password) {
      setErr('Email and password required');
      return;
    }
    if (authMode === 'signup' && !name) {
      setErr('Name required');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const data = authMode === 'signup'
        ? await signup(name, email, password)
        : await login(email, password);
      if (authMode === 'signup' && data.user) {
        setToken(data.token, { ...data.user, name });
      }
      next();
    } catch (e: any) {
      setErr(e.message || 'Auth failed');
    } finally {
      setBusy(false);
    }
  }

  function skipAuth() {
    // Guest mode: set local token and skip to goals
    setToken('guest-token', { id: 'guest', email: 'guest@local', name: 'Guest' });
    next();
  }

  async function finish() {
    setBusy(true);
    setErr('');
    try {
      // Save goals, org, voice preferences and mark onboarding complete
      await apiPost('/onboarding/goals', {
        goals,
        orgName,
        onboardingComplete: true,
        preferences: { voiceEnabled: step !== 'auth' },
      });
      markOnboardingComplete();
      navigate('/home');
    } catch (e: any) {
      // If the user is guest or the endpoint fails, still mark locally
      markOnboardingComplete();
      navigate('/home');
    } finally {
      setBusy(false);
    }
  }

  function toggleGoal(g: string) {
    setGoals((gs) => gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]);
  }

  return (
    <div className="onboarding-overlay" role="main" aria-label="Genie onboarding" aria-live="polite">
      {/* Screen-reader announcements */}
      <div aria-live="assertive" aria-atomic="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
        {ariaLive}
      </div>
      {/* Progress indicator */}
      <div className="onboarding-progress" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        <span>Step {stepIndex + 1} of {STEPS.length}</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="onboarding-step fade-in" key={step}>
        {step === 'welcome' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🧞</div>
            <h2>Welcome to Genie</h2>
            <p>
              Your personal AI for memory, life, and growth. Capture anything,
              ask anything, and let Genie handle the rest.
            </p>
            <button className="btn btn-block" onClick={next}>
              Get started
            </button>
          </>
        )}

        {step === 'name' && (
          <>
            <h2>What's your name?</h2>
            <p>Genie will use this to greet you each day.</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              style={{ marginBottom: 16 }}
            />
            <button className="btn btn-block" onClick={next} disabled={!name.trim()}>
              Continue
            </button>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={back}>
              Back
            </button>
          </>
        )}

        {step === 'auth' && (
          <>
            <h2>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
            <p>{authMode === 'signup' ? 'Sync your data across devices.' : 'Sign in to continue.'}</p>

            {authMode === 'signup' && (
              <div className="form-group">
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {err && <div className="small" style={{ color: 'var(--danger)', marginBottom: 12 }}>{err}</div>}

            <button className="btn btn-block" onClick={doAuth} disabled={busy}>
              {busy ? '...' : authMode === 'signup' ? 'Create account' : 'Sign in'}
            </button>

            <button
              className="btn btn-secondary btn-block"
              style={{ marginTop: 8 }}
              onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
            >
              {authMode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>

            <button
              className="btn btn-secondary btn-block"
              style={{ marginTop: 8 }}
              onClick={skipAuth}
            >
              Continue as guest
            </button>
          </>
        )}

        {step === 'goals' && (
          <>
            <h2>What matters to you?</h2>
            <p>Pick a few goals. Genie will personalize your experience.</p>
            <div className="pill-row" style={{ justifyContent: 'center', margin: '16px 0' }}>
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  className={`pill ${goals.includes(g) ? 'active' : ''}`}
                  onClick={() => toggleGoal(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <button className="btn btn-block" onClick={next} disabled={goals.length === 0}>
              Continue ({goals.length} selected)
            </button>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={back}>
              Back
            </button>
          </>
        )}

        {step === 'voice' && (
          <>
            <h2>Enable voice?</h2>
            <p>Genie can listen and speak. Allow microphone access to unlock voice commands.</p>
            {mic.status === 'idle' && (
              <button className="btn btn-block" onClick={mic.requestPermission}>
                Allow Microphone
              </button>
            )}
            {mic.status === 'granted' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, margin: '16px 0' }}>🎙️</div>
                <p style={{ color: '#22c55e' }}>Microphone ready</p>
                <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => { mic.startListening(); next(); }}>
                  Test &amp; Continue
                </button>
              </div>
            )}
            {mic.status === 'denied' && (
              <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
                Microphone access denied. You can enable it later in browser settings.
              </div>
            )}
            {mic.status === 'unavailable' && (
              <p style={{ color: '#6b7280', fontSize: 13 }}>Voice not available on this browser.</p>
            )}
            <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={next}>
              Skip — use text only
            </button>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={back}>
              Back
            </button>
          </>
        )}

        {step === 'org' && (
          <>
            <h2>Set up your organization</h2>
            <p>Add your team or company name so Genie can tailor responses to your context.</p>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Company or team name (optional)"
              aria-label="Organization name"
              style={{ marginBottom: 12, width: '100%', fontSize: 14 }}
            />
            <button className="btn btn-block" onClick={next} style={{ marginBottom: 8 }}>
              {orgName ? `Continue as ${orgName}` : 'Skip for now'}
            </button>
            <button className="btn btn-secondary btn-block" onClick={back}>
              Back
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2>You're all set!</h2>
            <p>
              Genie is ready. Tap the + button on the Home or Memory tabs to
              capture your first memory, or just start chatting.
            </p>
            {err && <div className="small" style={{ color: 'var(--warning)', marginBottom: 12 }}>{err}</div>}
            <button className="btn btn-block" onClick={finish} disabled={busy}>
              {busy ? 'Saving...' : 'Open Genie'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
