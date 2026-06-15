'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/auth';

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  return (
    <nav style={{ borderBottom: '1px solid var(--border)', padding: '14px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>RTMN</span>
          <span style={{ color: 'var(--text)', fontWeight: 400 }}> / Pilot Portal</span>
        </Link>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontSize: '0.88rem' }}>
          <Link href="/" style={{ color: 'var(--muted)' }} className="nav-link">Home</Link>
          <Link href="/auth" style={{ color: 'var(--muted)' }} className="nav-link">Services</Link>
          {loggedIn ? (
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.85rem' }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth" className="btn btn-outline" style={{ padding: '7px 16px', fontSize: '0.85rem' }}>Sign In</Link>
              <Link href="/auth" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.85rem' }}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}