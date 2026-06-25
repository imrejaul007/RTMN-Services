'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Rocket, Store, Mic, Workflow, DollarSign, Key,
  ChevronRight, CheckCircle, XCircle, Loader2,
  Cloud, Bot, Zap, BarChart3, Shield
} from 'lucide-react';

const SERVICES = [
  {
    name: 'HOJAI Cloud',
    port: 4380,
    icon: Cloud,
    color: 'from-blue-500 to-cyan-500',
    description: 'Deploy and scale AI applications',
    features: ['Auto-respawn', 'SSL Certificates', 'Custom Domains', 'Preview Environments', 'Rollbacks'],
    docs: '/products/hojai-cloud/CLAUDE.md'
  },
  {
    name: 'App Store',
    port: 4400,
    icon: Store,
    color: 'from-purple-500 to-pink-500',
    description: 'Skills, agents, workflows marketplace',
    features: ['Browse apps', 'One-click install', 'Publish', 'Reviews'],
    docs: '/services/app-store-api/CLAUDE.md'
  },
  {
    name: 'Cost Tracker',
    port: 4410,
    icon: DollarSign,
    color: 'from-green-500 to-emerald-500',
    description: 'AI usage metering and billing',
    features: ['Usage tracking', 'Budget alerts', 'Cost breakdown', 'Pricing API'],
    docs: '/services/cost-tracker/CLAUDE.md'
  },
  {
    name: 'Secrets Manager',
    port: 4420,
    icon: Key,
    color: 'from-amber-500 to-orange-500',
    description: 'Encrypted credential storage',
    features: ['AES-256 encryption', 'Access logs', 'Auto-rotation', 'RBAC'],
    docs: '/services/secrets-manager/CLAUDE.md'
  },
  {
    name: 'Voice Studio',
    port: 4430,
    icon: Mic,
    color: 'from-rose-500 to-red-500',
    description: 'Build voice AI agents',
    features: ['Voice agents', 'STT/TTS config', 'Conversation tracking', 'Multi-language'],
    docs: '/services/voice-studio-api/CLAUDE.md'
  },
  {
    name: 'Workflow Builder',
    port: 4440,
    icon: Workflow,
    color: 'from-indigo-500 to-violet-500',
    description: 'Visual DAG workflow editor',
    features: ['Drag-drop canvas', '10 node types', 'Execution', 'Templates'],
    docs: '/services/workflow-builder-api/CLAUDE.md'
  }
];

function ServiceCard({ service }: { service: typeof SERVICES[0] }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const Icon = service.icon;

  useEffect(() => {
    fetch(`http://localhost:${service.port}/health`)
      .then(res => {
        if (res.ok) setStatus('ok');
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [service.port]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2">
          {status === 'loading' && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
          {status === 'ok' && <CheckCircle className="w-4 h-4 text-green-500" />}
          {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
          <span className="text-sm text-slate-500">:{service.port}</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mb-1">{service.name}</h3>
      <p className="text-slate-400 text-sm mb-4">{service.description}</p>

      <div className="space-y-1 mb-4">
        {service.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-slate-400">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {feature}
          </div>
        ))}
      </div>

      <Link
        href={`http://localhost:${service.port}`}
        target="_blank"
        className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Open Service <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function StudioDashboardPage() {
  const [hubStatus, setHubStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    fetch('http://localhost:4399/health')
      .then(res => res.ok ? setHubStatus('ok') : setHubStatus('error'))
      .catch(() => setHubStatus('error'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-white font-bold">HOJAI Studio</span>
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-white font-medium">Dashboard</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
            <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/app-store" className="text-slate-300 hover:text-white transition-colors">App Store</Link>
            <Link href="/voice" className="text-slate-300 hover:text-white transition-colors">Voice</Link>
          </nav>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm mb-6">
              <Rocket className="w-4 h-4" />
              <span>HOJAI Cloud Phase 1 — All systems operational</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              HOJAI Cloud Platform
            </h1>
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              The complete platform for building, deploying, and scaling AI-native businesses.
              6 core services, all wired through the RTMN Hub.
            </p>

            {/* RTMN Hub Status */}
            <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-6 py-3">
              <span className="text-slate-400">RTMN Hub:</span>
              {hubStatus === 'loading' && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
              {hubStatus === 'ok' && <CheckCircle className="w-4 h-4 text-green-500" />}
              {hubStatus === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
              <span className={`font-medium ${hubStatus === 'ok' ? 'text-green-400' : hubStatus === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                {hubStatus === 'ok' ? 'Connected (port 4399)' : hubStatus === 'error' ? 'Disconnected' : 'Checking...'}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: 'Services', value: '6', icon: Zap, color: 'text-blue-400' },
              { label: 'Ports', value: '4380-4440', icon: Cloud, color: 'text-purple-400' },
              { label: 'API Endpoints', value: '60+', icon: Workflow, color: 'text-green-400' },
              { label: 'Features', value: '30+', icon: Shield, color: 'text-amber-400' }
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Services Grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Platform Services</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
          </div>

          {/* Architecture Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Architecture</h2>
            <div className="flex flex-col items-center gap-4">
              {/* RTMN Hub */}
              <div className="flex flex-col items-center">
                <div className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium">
                  RTMN Hub (4399)
                </div>
                <div className="text-slate-500 text-sm mt-1">Central Gateway</div>
              </div>

              <div className="w-px h-8 bg-slate-700" />

              {/* HOJAI Cloud */}
              <div className="flex flex-col items-center">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium">
                  HOJAI Cloud (4380)
                </div>
                <div className="text-slate-500 text-sm mt-1">Deploy Target</div>
              </div>

              <div className="flex gap-4 items-start">
                {/* App Store */}
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-medium text-sm">
                    App Store (4400)
                  </div>
                </div>

                {/* Cost Tracker */}
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl font-medium text-sm">
                    Cost Tracker (4410)
                  </div>
                </div>

                {/* Secrets */}
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl font-medium text-sm">
                    Secrets (4420)
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                {/* Voice */}
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="bg-gradient-to-r from-rose-500 to-red-500 text-white px-4 py-2 rounded-xl font-medium text-sm">
                    Voice (4430)
                  </div>
                </div>

                {/* Workflows */}
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-2 rounded-xl font-medium text-sm">
                    Workflows (4440)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Link
              href="/wizard"
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-all group"
            >
              <Zap className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                Create Company
              </h3>
              <p className="text-slate-400 text-sm">
                Use the AI Architect wizard to build a complete AI-native company in minutes
              </p>
            </Link>

            <Link
              href="/app-store"
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-purple-500/50 transition-all group"
            >
              <Store className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                Browse App Store
              </h3>
              <p className="text-slate-400 text-sm">
                Discover and install skills, agents, workflows, and templates
              </p>
            </Link>

            <Link
              href="/voice"
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-rose-500/50 transition-all group"
            >
              <Mic className="w-8 h-8 text-rose-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-rose-400 transition-colors">
                Build Voice Agent
              </h3>
              <p className="text-slate-400 text-sm">
                Create AI voice agents for receptionist, sales, or concierge
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
