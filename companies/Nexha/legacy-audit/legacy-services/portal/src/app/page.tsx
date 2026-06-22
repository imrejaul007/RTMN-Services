'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Animated Counter Component
function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#ffffff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body, html {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0a0a0f;
          color: #ffffff;
          scroll-behavior: smooth;
        }

        a { text-decoration: none; }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #2a2a3f; border-radius: 4px; }
      `}</style>

      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>⚡</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NeXha</span>
          </Link>

          <div style={{ display: 'flex', gap: '2.5rem' }}>
            {['Distributors', 'Manufacturers', 'Franchises', 'Suppliers'].map(link => (
              <Link key={link} href={`/${link.toLowerCase()}`} style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500, transition: 'color 0.2s' }}>
                {link}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/login" style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 500 }}>Login</Link>
            <Link href="/register" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#ffffff', padding: '0.625rem 1.25rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600 }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: 'relative', padding: '12rem 2rem 8rem', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '900px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.875rem', color: '#a5b4fc',
            marginBottom: '2rem'
          }}>
            <span>🚀</span>
            <span>The OS for Commerce Networks</span>
          </div>

          <h1 style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Build Your
            <br />
            <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Commerce Empire
            </span>
          </h1>

          <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Connect with thousands of distributors, manufacturers, and franchise opportunities.
            Powered by AI, secured by trust, built for scale.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
            <Link href="/distributors" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#ffffff', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600
            }}>
              Find Partners
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link href="/franchises" style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#ffffff', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600
            }}>
              Explore Marketplace
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center' }}>
            {[
              { value: 10000, suffix: '+', label: 'Active Businesses' },
              { value: 500, prefix: '₹', suffix: 'Cr+', label: 'Monthly GMV' },
              { value: 50, suffix: '+', label: 'Cities Covered' }
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stat.prefix || ''}<AnimatedCounter target={stat.value} />{stat.suffix}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplace Categories */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>B2B Infrastructure Marketplace</h2>
          <p style={{ fontSize: '1.125rem', color: '#64748b' }}>Everything you need to build and scale your commerce network</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[
            {
              href: '/distributors', icon: '🚚', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              title: 'Distributors', desc: 'Find distributors, wholesalers, and stockists for your products',
              count: '847 listed', tags: ['FMCG', 'Pharma', 'Food & Bev']
            },
            {
              href: '/manufacturers', icon: '🏭', gradient: 'linear-gradient(135deg, #f472b6 0%, #fb7185 100%)',
              title: 'Manufacturers', desc: 'Connect with manufacturers for OEM, private label, or contract manufacturing',
              count: '234 listed', tags: ['OEM', 'Private Label', 'Contract']
            },
            {
              href: '/franchises', icon: '🏪', gradient: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
              title: 'Franchises', desc: 'Browse and invest in proven franchise brands across industries',
              count: '156 opportunities', tags: ['Restaurant', 'Salon', 'Fitness']
            },
            {
              href: '/suppliers', icon: '📦', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              title: 'Suppliers', desc: 'Source products from verified suppliers across categories',
              count: '1,243 suppliers', tags: ['Raw Materials', 'Packaging', 'Equipment']
            }
          ].map((card, i) => (
            <Link key={i} href={card.href} style={{
              background: 'rgba(20, 20, 35, 0.8)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '24px', padding: '2rem', transition: 'all 0.3s', cursor: 'pointer'
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: card.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.75rem', marginBottom: '1.5rem'
              }}>
                {card.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{card.title}</h3>
              <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1rem' }}>{card.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#8b5cf6', fontWeight: 600 }}>{card.count}</span>
                <span style={{ fontSize: '1.25rem', color: '#64748b' }}>→</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {card.tags.map(tag => (
                  <span key={tag} style={{
                    background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc',
                    padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 500
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>How NeXha Works</h2>
          <p style={{ fontSize: '1.125rem', color: '#64748b' }}>Get started in four simple steps</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {[
            { num: '01', title: 'Create Profile', desc: 'Register your business and complete verification in minutes' },
            { num: '02', title: 'Discover', desc: 'Search and filter distributors, manufacturers, or franchises' },
            { num: '03', title: 'Connect', desc: 'Send inquiries, negotiate terms, and close deals' },
            { num: '04', title: 'Grow', desc: 'Manage relationships and scale your network' }
          ].map((step, i) => (
            <div key={i} style={{ flex: '1 1 200px', maxWidth: '250px', textAlign: 'center' }}>
              <div style={{
                fontSize: '3rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem'
              }}>
                {step.num}
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{step.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>Built for Modern Commerce</h2>
            <p style={{ fontSize: '1.125rem', color: '#64748b', lineHeight: 1.7, marginBottom: '2rem' }}>
              Everything you need to build, scale, and optimize your B2B commerce operations.
            </p>
            {[
              { icon: '✓', title: 'AI-Powered Matching', desc: 'Smart recommendations based on your business profile and history' },
              { icon: '✓', title: 'Secure Transactions', desc: 'Bank-grade security with escrow protection and verified partners' },
              { icon: '✓', title: 'Real-time Analytics', desc: 'Track performance, trends, and opportunities with live dashboards' }
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', fontWeight: 700, flexShrink: 0
                }}>
                  {feature.icon}
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{feature.title}</h4>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(20, 20, 35, 0.8)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px', padding: '2rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#34d399' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', paddingBottom: '1rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
              {[60, 80, 45, 90, 70, 95].map((h, i) => (
                <div key={i} style={{
                  width: '40px', height: `${h}%`, borderRadius: '8px 8px 0 0',
                  background: i % 2 === 0 ? 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)' : 'linear-gradient(180deg, #a855f3 0%, #c084fc 100%)'
                }} />
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>Network Growth</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '6rem 2rem',
        background: 'linear-gradient(135deg, #1e1e3f 0%, #2d1b4e 100%)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>Ready to Transform Your Business?</h2>
          <p style={{ fontSize: '1.125rem', color: '#94a3b8', marginBottom: '2rem' }}>
            Join thousands of businesses already growing with NeXha
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/register" style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#ffffff', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600
            }}>
              Start Free Trial
            </Link>
            <Link href="/demo" style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600
            }}>
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '4rem 2rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '4rem', marginBottom: '3rem' }}>
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NeXha</span>
            </Link>
            <p style={{ color: '#64748b' }}>The Operating System for Commerce Networks</p>
          </div>

          {[
            { title: 'Platform', links: ['Distributors', 'Franchises', 'Manufacturers', 'Suppliers'] },
            { title: 'Company', links: ['About', 'Careers', 'Press', 'Contact'] },
            { title: 'Resources', links: ['Documentation', 'API Reference', 'Blog', 'Support'] }
          ].map((col, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{col.title}</h4>
              {col.links.map(link => (
                <Link key={link} href="#" style={{ color: '#64748b', fontSize: '0.875rem' }}>{link}</Link>
              ))}
            </div>
          ))}
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
          © 2026 NeXha - Part of RTNM Group. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
