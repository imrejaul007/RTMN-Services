'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { setToken } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Signup fields
  const [sName, setSName] = useState('');
  const [sCompany, setSCompany] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sPass, setSPass] = useState('');

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await auth.login({ email: loginEmail, password: loginPass });
      setToken(data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await auth.signup({
        email: sEmail, password: sPass,
        companyName: sCompany, contactName: sName,
        phone: sPhone || undefined,
      });
      setSuccess(`Account created! ${data.devVerifyUrl ? `\nVerification link: ${data.devVerifyUrl}` : ' Check your email.'}`);
      if (data.devVerifyUrl) {
        setSuccess('');
        // Auto-verify in dev (extract token from devVerifyUrl)
        const verifyToken = data.devVerifyUrl.includes('token=')
          ? data.devVerifyUrl.split('token=')[1].split('&')[0].split('?')[0]
          : null;
        if (verifyToken) {
          try {
            await auth.verify(verifyToken);
            const loginData = await auth.login({ email: sEmail, password: sPass });
            setToken(loginData.token);
            router.push('/dashboard');
            return;
          } catch (err: any) {
            setSuccess(`Account created! Check your email or use: ${data.devVerifyUrl}`);
          }
        } else {
          setSuccess('Account created! Check your email to verify.');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Welcome to RTMN</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 6 }}>
              {mode === 'signup' ? 'Create your account to start a pilot' : 'Sign in to your account'}
            </p>
          </div>

          {/* Tab switch */}
          <div className="tab-nav" style={{ marginBottom: 24 }}>
            <button className={`tab-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>Sign Up</button>
            <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{success}</div>}

          {mode === 'signup' ? (
            <form onSubmit={handleSignup} className="card">
              <div className="form-group">
                <label className="form-label">Contact Name *</label>
                <input className="form-input" type="text" value={sName} onChange={e => setSName(e.target.value)} placeholder="Rejaul Karim" required />
              </div>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input className="form-input" type="text" value={sCompany} onChange={e => setSCompany(e.target.value)} placeholder="Sunrise Hotels Pvt Ltd" required />
              </div>
              <div className="form-group">
                <label className="form-label">Work Email *</label>
                <input className="form-input" type="email" value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <input className="form-input" type="tel" value={sPhone} onChange={e => setSPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={sPass} onChange={e => setSPass(e.target.value)} placeholder="8+ characters" minLength={8} required />
                <p className="form-hint">Minimum 8 characters</p>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <><div className="spinner" /> Creating account...</> : <>Create Account →</>}
              </button>
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', textAlign: 'center', marginTop: 12 }}>
                By creating an account you agree to our{' '}
                <a href="/docs/terms" target="_blank" style={{ color: 'var(--primary)' }}>Terms of Service</a> and{' '}
                <a href="/docs/privacy" target="_blank" style={{ color: 'var(--primary)' }}>Privacy Policy</a>.
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="card">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <><div className="spinner" /> Signing in...</> : <>Sign In →</>}
              </button>
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 6 }}>Demo credentials:</p>
                <p style={{ fontSize: '0.8rem' }}>Email: <code>pilot@example.com</code></p>
                <p style={{ fontSize: '0.8rem' }}>Pass: <code>testpass123</code></p>
              </div>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--muted)', fontSize: '0.85rem' }}>
            <Link href="/" style={{ color: 'var(--primary)' }}>← Back to home</Link>
          </p>
        </div>
      </main>
    </>
  );
}
