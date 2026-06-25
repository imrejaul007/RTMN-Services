import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, signup, setToken, apiPost } from '../services/api';
import { markOnboardingComplete } from '../components/OnboardingGate';

type Step = 'welcome' | 'name' | 'auth' | 'goals' | 'done';

const STEPS: Step[] = ['welcome', 'name', 'auth', 'goals', 'done'];
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

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [goals, setGoals] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const stepIndex = STEPS.indexOf(step);

  function next() {
    const idx = stepIndex;
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function back() {
    const idx = stepIndex;
    if (idx > 0) setStep(STEPS[idx - 1]);
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
      // Save goals and mark onboarding complete in the backend
      await apiPost('/onboarding/goals', { goals, onboardingComplete: true });
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
    <div className="onboarding-overlay">
      {/* Progress indicator */}
      <div className="onboarding-progress">
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
