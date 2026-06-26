'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { id: 'agent', name: 'AI Agents', icon: '🤖' },
  { id: 'ai-employee', name: 'AI Employees', icon: '👔' },
  { id: 'ai-team', name: 'AI Teams', icon: '👥' },
  { id: 'skill', name: 'Skills', icon: '⚡' },
  { id: 'twin', name: 'Twin Packs', icon: '🔄' },
  { id: 'department-os', name: 'Department OS', icon: '🏢' },
  { id: 'industry-os', name: 'Industry OS', icon: '🏭' },
  { id: 'business-capability-pack', name: 'Business Capability Packs', icon: '📦' },
  { id: 'company-blueprint', name: 'Company Blueprints', icon: '🏗️' },
  { id: 'workflow', name: 'Workflows', icon: '🔧' },
  { id: 'widget', name: 'Widgets', icon: '🧩' },
  { id: 'integration', name: 'Integrations', icon: '🔌' },
  { id: 'analytics', name: 'Analytics', icon: '📊' },
  { id: 'starter-kit', name: 'Starter Kits', icon: '🚀' },
];

const PRICING_MODELS = [
  { id: 'free', name: 'Free', description: 'No charge for users' },
  { id: 'one-time', name: 'One-time Purchase', description: 'Pay once, use forever' },
  { id: 'subscription', name: 'Subscription', description: 'Monthly or annual billing' },
  { id: 'usage-based', name: 'Usage-based', description: 'Pay per usage' },
  { id: 'quote-only', name: 'Quote Only', description: 'Contact for pricing' },
];

export default function PublishPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    category: '',
    tags: '',
    pricingModel: 'subscription',
    price: '',
    visibility: 'PUBLIC',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // In production, call API to create listing
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4255'}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'bam-platform' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          price: formData.price ? parseInt(formData.price) * 100 : 0,
          currency: 'INR',
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        alert('Failed to create listing');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Publish New Listing</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['Basic Info', 'Details', 'Pricing', 'Review'].map((label, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className="ml-2 text-sm font-medium text-slate-600 hidden sm:inline">{label}</span>
            {i < 3 && <div className="w-8 sm:w-16 h-0.5 bg-slate-200 mx-2" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., AI Sales Manager"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Short Description *</label>
              <textarea
                required
                rows={2}
                value={formData.shortDescription}
                onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Brief overview (shown in search results)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button type="button" onClick={() => setStep(2)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Continue to Details →
            </button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Listing Details</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Description *</label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of your listing. Include features, use cases, and requirements."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                placeholder="sales, ai, automation (comma-separated)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
              <select
                value={formData.visibility}
                onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="PUBLIC">Public - Visible to everyone</option>
                <option value="UNLISTED">Unlisted - Only with link</option>
                <option value="PRIVATE">Private - Only to you</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
                ← Back
              </button>
              <button type="button" onClick={() => setStep(3)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Continue to Pricing →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Pricing</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRICING_MODELS.map(model => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, pricingModel: model.id })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.pricingModel === model.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{model.name}</div>
                  <div className="text-sm text-slate-500">{model.description}</div>
                </button>
              ))}
            </div>

            {formData.pricingModel !== 'free' && formData.pricingModel !== 'quote-only' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price (INR) {formData.pricingModel === 'subscription' ? '/month' : ''} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="499"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
                ← Back
              </button>
              <button type="button" onClick={() => setStep(4)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Review Listing →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Review Your Listing</h2>

            <div className="bg-slate-50 rounded-xl p-6 space-y-4">
              <div>
                <div className="text-sm text-slate-500">Title</div>
                <div className="font-semibold text-slate-900">{formData.title || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Category</div>
                <div className="font-semibold text-slate-900">
                  {CATEGORIES.find(c => c.id === formData.category)?.name || '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Description</div>
                <div className="text-slate-700">{formData.shortDescription || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Pricing</div>
                <div className="font-semibold text-slate-900">
                  {formData.pricingModel === 'free' ? 'Free' : `₹${formData.price || 0}${formData.pricingModel === 'subscription' ? '/month' : ''}`}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(3)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
                ← Back
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-green-400">
                {submitting ? 'Publishing...' : 'Publish Listing'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
