'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Rocket, Zap, Globe, Users, Shield, Code, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const TEMPLATES = [
  { key: 'marketplace', name: 'Marketplace', icon: '🛒', desc: 'B2C/B2B catalog + RFQ + checkout' },
  { key: 'b2b', name: 'B2B Platform', icon: '🏢', desc: 'Wholesale + supplier portal' },
  { key: 'company', name: 'Company OS', icon: '🏢', desc: 'Full department OS with AI workforce' },
  { key: 'hotel', name: 'Hotel', icon: '🏨', desc: 'Property management + booking' },
  { key: 'restaurant', name: 'Restaurant', icon: '🍽️', desc: 'Menu + orders + delivery' },
  { key: 'logistics', name: 'Logistics', icon: '🚚', desc: 'Fleet + dispatch + tracking' },
  { key: 'crm', name: 'CRM', icon: '👥', desc: 'Contacts + deals + pipeline' },
  { key: 'erp', name: 'ERP', icon: '⚙️', desc: 'Inventory + procurement + finance' },
  { key: 'pos', name: 'POS', icon: '💳', desc: 'Till + receipts + inventory' },
];

const FEATURES = [
  {
    icon: Users,
    title: 'AI Workforce',
    desc: 'CEO, Sales, Marketing, Support — all working 24/7 from day one',
  },
  {
    icon: Zap,
    title: 'Built-in Memory',
    desc: 'Persistent context across all agents and sessions — no starting from scratch',
  },
  {
    icon: Globe,
    title: 'Global Commerce',
    desc: 'Your company automatically registered on Global Nexha network',
  },
  {
    icon: Shield,
    title: 'Compliance Ready',
    desc: 'GDPR, PCI, HIPAA, KYC — compliance built in by default',
  },
  {
    icon: Code,
    title: 'Customizable in Cursor',
    desc: 'Open in VS Code or Cursor — AI understands your company',
  },
  {
    icon: Sparkles,
    title: 'Continuous Evolution',
    desc: 'Your company gets smarter every week — automatically',
  },
];

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    desc: 'For founders just starting out',
    features: ['1K AI agent calls', '100MB database', 'Community support'],
  },
  {
    name: 'Starter',
    price: '$200',
    period: '/month',
    desc: 'For growing businesses',
    features: ['100K AI calls', '10GB database', 'Email support', 'Custom domain'],
    popular: true,
  },
  {
    name: 'Growth',
    price: '$2K',
    period: '/month',
    desc: 'For scaling companies',
    features: ['1M AI calls', '100GB database', 'Priority support', 'Advanced analytics'],
  },
];

export default function HomePage() {
  const [email, setEmail] = useState('');

  const handleGetStarted = () => {
    window.location.href = '/wizard';
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-white font-bold text-xl">HOJAI Studio</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/app-store" className="text-slate-300 hover:text-white transition-colors">
                App Store
              </Link>
              <Link href="/voice" className="text-slate-300 hover:text-white transition-colors">
                Voice
              </Link>
              <button
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Start Building
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>Launch your AI-native company in 30 minutes</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Build your
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> AI-native company</span>
            <br />in 30 minutes
          </h1>

          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Not just a code editor. An operating system for AI-native businesses.
            Get AI workforce, memory, digital twins, commerce, and global network — all built in.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              <Rocket className="w-5 h-5" />
              Start Building Free
            </button>
            <button
              onClick={() => window.open('https://docs.hojai.ai', '_blank')}
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors border border-slate-700"
            >
              View Documentation
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <p className="text-slate-500 text-sm mt-4">
            No credit card required • Free forever tier available
          </p>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 px-4 bg-slate-950/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Everything you need to run an AI-native business
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            We don&apos;t just give you a code editor. We give you a complete operating system.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
              >
                <feature.icon className="w-10 h-10 text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Start from 9 proven templates
          </h2>
          <p className="text-slate-400 text-center mb-12">
            Each template is a complete, working business — not just scaffolding.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((template) => (
              <div
                key={template.key}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-500/50 transition-all cursor-pointer group"
              >
                <div className="text-3xl mb-3">{template.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-slate-400">{template.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-slate-950/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-400 text-center mb-12">
            Start free. Scale as you grow.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`bg-slate-900 border rounded-xl p-6 ${
                  tier.popular ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800'
                }`}
              >
                {tier.popular && (
                  <span className="inline-block bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full mb-3">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-semibold text-white mb-1">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  <span className="text-slate-400">{tier.period}</span>
                </div>
                <p className="text-slate-400 text-sm mb-6">{tier.desc}</p>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleGetStarted}
                  className={`w-full mt-6 py-3 rounded-lg font-medium transition-colors ${
                    tier.popular
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to build your AI-native company?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Join thousands of founders who are building the future of work.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-purple-500/25"
          >
            <Rocket className="w-5 h-5" />
            Launch Your Company
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-white font-bold">HOJAI Studio</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 HOJAI AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
