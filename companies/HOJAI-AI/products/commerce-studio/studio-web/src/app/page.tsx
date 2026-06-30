/**
 * Commerce Studio - Landing Page
 */

'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, Brain, Wallet, Globe, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-24" style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="badge badge-accent mb-2">✨ The Future of Commerce</span>
          <h1 className="text-4xl font-bold mb-4" style={{ fontSize: '3.5rem', lineHeight: 1.1 }}>
            Build AI-Powered<br />Commerce Businesses in 7 Days
          </h1>
          <p className="text-lg text-muted mb-8" style={{ maxWidth: '650px', margin: '0 auto 2rem' }}>
            Launch marketplaces, restaurants, hotels, and 26 other commerce types.
            With pre-built AI workers, vendor pools, and commerce OS — all wired together.
          </p>
          <div className="flex" style={{ justifyContent: 'center' }}>
            <Link href="/templates" className="btn btn-primary btn-lg">
              Browse Templates <ArrowRight size={18} />
            </Link>
            <Link href="/builder" className="btn btn-outline btn-lg">
              Start Building
            </Link>
          </div>

          {/* Stats */}
          <div className="flex" style={{ justifyContent: 'center', marginTop: '3rem', gap: '3rem', flexWrap: 'wrap' }}>
            <Stat label="Templates" value="26+" />
            <Stat label="AI Workers" value="21" />
            <Stat label="Vendors" value="3,400+" />
            <Stat label="Launch Time" value="7 days" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="text-3xl font-bold mb-2">Everything You Need to Launch</h2>
            <p className="text-muted">A complete commerce platform, ready to deploy</p>
          </div>

          <div className="grid grid-3">
            <FeatureCard
              icon={<Brain size={32} color="#6366f1" />}
              title="AI Workers"
              description="21 pre-built workers for vendor acquisition, catalog normalization, recommendations, growth, and more"
            />
            <FeatureCard
              icon={<Sparkles size={32} color="#10b981" />}
              title="Universal CommerceOS"
              description="Catalog, inventory, orders, checkout, pricing, promotions, loyalty — all wired together"
            />
            <FeatureCard
              icon={<Globe size={32} color="#f59e0b" />}
              title="Global Federation"
              description="Connect to Global Nexha federation — discover and trade with thousands of vendors"
            />
            <FeatureCard
              icon={<Wallet size={32} color="#ef4444" />}
              title="RABTUL Financial"
              description="Payments, escrow, BNPL, trade finance. Built-in money infrastructure"
            />
            <FeatureCard
              icon={<Zap size={32} color="#8b5cf6" />}
              title="AI Templates"
              description="26 industry templates �� restaurant, hotel, healthcare, retail, and more"
            />
            <FeatureCard
              icon={<Users size={32} color="#06b6d4" />}
              title="Vendor Liquidity"
              description="Import 3,400+ verified vendors instantly. No cold-start problem"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: '#0a0a0a', color: 'white' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="text-3xl font-bold mb-4">Ready to Launch Your Commerce Business?</h2>
          <p className="text-lg mb-8" style={{ opacity: 0.8 }}>
            Pick a template. Deploy in 7 days. Start selling.
          </p>
          <Link href="/templates" className="btn btn-primary btn-lg">
            Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xl font-bold" style={{ color: '#6366f1' }}>{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card">
      <div style={{ marginBottom: '1rem' }}>{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  );
}