'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Sparkles, Bot, Workflow, Package, Building2, Check, Loader2 } from 'lucide-react';

const APP_TYPES = [
  { value: 'skill', label: 'Skill', icon: Sparkles, description: 'AI capability that can be installed' },
  { value: 'agent', label: 'Agent', icon: Bot, description: 'Autonomous AI worker' },
  { value: 'workflow', label: 'Workflow', icon: Workflow, description: 'Automated workflow template' },
  { value: 'template', label: 'Template', icon: Package, description: 'Starter template' },
  { value: 'industry-os', label: 'Industry OS', icon: Building2, description: 'Vertical-specific solution' },
];

const CATEGORIES = [
  { value: 'cat-ai', label: 'AI & Agents' },
  { value: 'cat-commerce', label: 'Commerce' },
  { value: 'cat-crm', label: 'CRM & Sales' },
  { value: 'cat-communication', label: 'Communication' },
  { value: 'cat-analytics', label: 'Analytics' },
  { value: 'cat-productivity', label: 'Productivity' },
  { value: 'cat-industry', label: 'Industry Solutions' },
  { value: 'cat-integration', label: 'Integrations' },
];

export default function PublishPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: '',
    shortDescription: '',
    description: '',
    type: 'skill',
    category: '',
    version: '1.0.0',
    price: '0',
    icon: '',
    tags: '',
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:4400/api/v1/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          shortDescription: form.shortDescription,
          description: form.description,
          type: form.type,
          category: form.category,
          version: form.version,
          price: parseFloat(form.price),
          icon: form.icon || '🚀',
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          author: 'Demo User',
          status: 'draft',
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setStep(4);
      }
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/app-store" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-white font-medium">App Store</span>
          <span className="text-slate-500">/</span>
          <span className="text-white font-medium">Publish</span>
        </div>
      </header>

      <main className="pt-20 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Publish to App Store</h1>
            <p className="text-slate-400">Share your app with the HOJAI community</p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  s <= step ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white">Basic Information</h2>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">App Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="My Awesome App"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Short Description *</label>
                  <input
                    type="text"
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    placeholder="One sentence summary"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Detailed description of your app..."
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!form.name || !form.shortDescription}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Type & Category */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white">App Type</h2>
                <div className="grid grid-cols-2 gap-4">
                  {APP_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setForm({ ...form, type: type.value })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          form.type === type.value
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <Icon className={`w-8 h-8 mb-2 ${
                          form.type === type.value ? 'text-blue-400' : 'text-slate-400'
                        }`} />
                        <h3 className={`font-medium ${
                          form.type === type.value ? 'text-white' : 'text-slate-300'
                        }`}>{type.label}</h3>
                        <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white">Category</h2>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.category}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Version */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white">Pricing & Version</h2>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Price (USD)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Set to 0 for free apps</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Version</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    placeholder="1.0.0"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="ai, automation, sales"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Publish App
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">App Submitted!</h2>
              <p className="text-slate-400 mb-8">
                Your app is now under review. You'll be notified once it's approved.
              </p>
              <Link
                href="/app-store"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Back to App Store
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
