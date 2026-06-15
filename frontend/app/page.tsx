'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Shield, Globe } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ServiceCard from '@/components/ServiceCard';
import { services as apiServices } from '@/lib/api';

const FEATURES = [
  { icon: Zap, title: 'AI-Powered Twins', desc: '35+ digital twins that learn from your data and automate decisions.' },
  { icon: Shield, title: 'RABTUL Secured', desc: 'Auth, payments, wallet — all wired through RABTUL infrastructure.' },
  { icon: Globe, title: '24 Industries', desc: 'Hotel to Healthcare to Agriculture — one platform, every vertical.' },
];

export default function HomePage() {
  const [allServices, setAllServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiServices.list().then(d => {
      setAllServices(d.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const pilotServices = allServices.filter(s => s.pilotReady);
  const categories = [...new Set(pilotServices.map(s => s.category))];

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              {['24 Industry OS', '35+ Digital Twins', 'AI Agents', 'RABTUL Powered'].map(t => (
                <span key={t} className="badge badge-blue">{t}</span>
              ))}
            </div>
            <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
              Your business,<br /><span style={{ color: 'var(--primary)' }}>24 industries</span>, one platform
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--muted)', maxWidth: 560, margin: '0 auto 36px' }}>
              AI-powered digital twins for every vertical. From Hotel to Healthcare to Agriculture — connected, not siloed. Powered by RABTUL, CorpID, MemoryOS.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth" className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 28px' }}>
                Start Free Pilot <ArrowRight size={18} />
              </Link>
              <Link href="/dashboard" className="btn btn-outline" style={{ fontSize: '1rem', padding: '12px 28px' }}>
                View Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '40px 24px' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {FEATURES.map(f => (
                <div key={f.title} className="card">
                  <f.icon size={28} style={{ color: 'var(--primary)', marginBottom: 12 }} />
                  <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section style={{ padding: '20px 24px 40px' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', textAlign: 'center' }}>
              {[['24', 'Industry OS'], ['35+', 'Digital Twins'], ['6', 'AI Agents'], ['20+', 'Companies']].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{v}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Catalog */}
        <section style={{ padding: '20px 24px 60px' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Pilot-Ready Industries</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: 4 }}>
                  {loading ? 'Loading...' : `${pilotServices.length} services ready for your first pilot`}
                </p>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                Loading services...
              </div>
            ) : (
              <>
                {categories.map(cat => (
                  <div key={cat} style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      {cat}
                    </h3>
                    <div className="services-grid">
                      {pilotServices.filter(s => s.category === cat).map(s => (
                        <ServiceCard key={s.id} service={s} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--surface)' }}>
          <div className="container">
            <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: 16 }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 12 }}>Ready to start?</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
              Set up your pilot in under 5 minutes. No credit card required. Cancel anytime.
            </p>
            <Link href="/auth" className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }}>
              Get Started Free <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <footer>
        <div className="container">
          RTMN Real-Time Multi-Industry Network &nbsp;|&nbsp; Powered by HOJAI AI &nbsp;|&nbsp; <a href="https://rtmn.io" style={{ color: 'var(--primary)' }}>rtmn.io</a>
        </div>
      </footer>
    </>
  );
}
