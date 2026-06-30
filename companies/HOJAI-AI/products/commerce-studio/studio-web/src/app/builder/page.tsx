/**
 * Builder Wizard Page
 * 6-step wizard for creating commerce Nexhas
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { StudioAPI } from '@/lib/api';

const STEPS = [
  { id: 1, name: 'Template', description: 'Choose your industry template' },
  { id: 2, name: 'Commerce', description: 'Configure commerce modules' },
  { id: 3, name: 'Workers', description: 'Select AI workers' },
  { id: 4, name: 'Trust', description: 'Set up trust and verification' },
  { id: 5, name: 'Finance', description: 'Configure payments' },
  { id: 6, name: 'Deploy', description: 'Review and deploy' },
];

export default function BuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [config, setConfig] = useState<any>({
    templateId: null,
    commerce: { modules: [], pricingStrategy: 'fixed', paymentMethods: [] },
    workers: [],
    trust: { documents: [], certifications: [] },
    finance: { paymentMethods: [], settlementTerms: 'T+2' },
  });
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    initSession();
    loadTemplates();
  }, []);

  async function initSession() {
    try {
      const response = await StudioAPI.createSession();
      setSessionId(response.session?.id);
    } catch {
      setSessionId(`LOCAL-${Date.now()}`);
    }
  }

  async function loadTemplates() {
    try {
      const response = await StudioAPI.listTemplates();
      if (response?.templates) setTemplates(response.templates);
    } catch {}
  }

  function nextStep() {
    if (step < 6) setStep(step + 1);
  }

  function prevStep() {
    if (step > 1) setStep(step - 1);
  }

  async function handleDeploy() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const response = await StudioAPI.deploy({
        sessionId,
        businessName: 'My Nexha Business',
        ownerEmail: 'owner@example.com',
      });
      router.push(`/deploy/${response.deployment.id}`);
    } catch (err) {
      alert('Deployment started (simulated): ' + sessionId);
      router.push('/templates');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Progress Bar */}
      <div className="container py-8">
        <Stepper currentStep={step} />
      </div>

      {/* Step Content */}
      <div className="container">
        <div className="card" style={{ padding: '2rem' }}>
          {step === 1 && (
            <Step1Template
              config={config}
              setConfig={setConfig}
              templates={templates}
            />
          )}
          {step === 2 && (
            <Step2Commerce config={config} setConfig={setConfig} />
          )}
          {step === 3 && (
            <Step3Workers config={config} setConfig={setConfig} />
          )}
          {step === 4 && (
            <Step4Trust config={config} setConfig={setConfig} />
          )}
          {step === 5 && (
            <Step5Finance config={config} setConfig={setConfig} />
          )}
          {step === 6 && (
            <Step6Review config={config} templates={templates} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex-between" style={{ marginTop: '1.5rem' }}>
          <button
            className="btn btn-outline"
            onClick={prevStep}
            disabled={step === 1}
            style={{ opacity: step === 1 ? 0.5 : 1 }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          {step < 6 ? (
            <button className="btn btn-primary" onClick={nextStep}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleDeploy}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Deploy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      {STEPS.map(s => (
        <div
          key={s.id}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.5rem',
            borderBottom: currentStep === s.id ? '3px solid #6366f1' : '3px solid #e5e7eb',
            color: currentStep >= s.id ? '#6366f1' : '#6b7280',
            fontWeight: currentStep === s.id ? 700 : 400,
          }}
        >
          <div className="text-sm">{s.name}</div>
        </div>
      ))}
    </div>
  );
}

/* ===== STEPS ===== */

function Step1Template({ config, setConfig, templates }: any) {
  const MOCK_TEMPLATES = [
    { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
    { id: 'hotel', name: 'Hotel', icon: '🏨' },
    { id: 'retail', name: 'Retail', icon: '🛍️' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
    { id: 'fashion', name: 'Fashion', icon: '👗' },
    { id: 'beauty', name: 'Beauty', icon: '💄' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'grocery', name: 'Grocery', icon: '🛒' },
  ];
  const displayTemplates = templates.length > 0 ? templates : MOCK_TEMPLATES;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Choose Your Template</h2>
      <p className="text-muted mb-4">Select the industry that matches your business</p>

      <div className="grid grid-3">
        {displayTemplates.slice(0, 12).map((t: any) => (
          <div
            key={t.id}
            onClick={() => setConfig({ ...config, templateId: t.id })}
            className="card"
            style={{
              cursor: 'pointer',
              borderColor: config.templateId === t.id ? '#6366f1' : '#e5e7eb',
              background: config.templateId === t.id ? '#f5f3ff' : 'white',
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>{t.icon}</div>
            <h3 className="font-semibold">{t.name}</h3>
            {config.templateId === t.id && (
              <span className="badge badge-success mt-2">✓ Selected</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Step2Commerce({ config, setConfig }: any) {
  const MODULES = [
    { id: 'catalog', name: 'Catalog', icon: '📚' },
    { id: 'inventory', name: 'Inventory', icon: '📦' },
    { id: 'order', name: 'Order', icon: '🛒' },
    { id: 'checkout', name: 'Checkout', icon: '💳' },
    { id: 'pricing', name: 'Pricing', icon: '💰' },
    { id: 'promotion', name: 'Promotions', icon: '🎁' },
    { id: 'loyalty', name: 'Loyalty', icon: '⭐' },
    { id: 'subscription', name: 'Subscriptions', icon: '🔄' },
  ];

  const PRICING_STRATEGIES = [
    { id: 'fixed', name: 'Fixed' },
    { id: 'dynamic', name: 'Dynamic' },
    { id: 'competitive', name: 'Competitive' },
    { id: 'tier-based', name: 'Tier-Based' },
  ];

  const PAYMENT_METHODS = ['UPI', 'Cards', 'Wallets', 'Net Banking', 'BNPL'];

  function toggleModule(id: string) {
    const modules = config.commerce.modules.includes(id)
      ? config.commerce.modules.filter((m: string) => m !== id)
      : [...config.commerce.modules, id];
    setConfig({ ...config, commerce: { ...config.commerce, modules } });
  }

  function togglePayment(method: string) {
    const paymentMethods = config.commerce.paymentMethods.includes(method)
      ? config.commerce.paymentMethods.filter((m: string) => m !== method)
      : [...config.commerce.paymentMethods, method];
    setConfig({ ...config, commerce: { ...config.commerce, paymentMethods } });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Configure Commerce</h2>
      <p className="text-muted mb-4">Select the commerce modules and pricing strategy</p>

      <label className="label">Commerce Modules</label>
      <div className="grid grid-3 mb-4">
        {MODULES.map(m => (
          <div
            key={m.id}
            onClick={() => toggleModule(m.id)}
            className="card"
            style={{
              cursor: 'pointer',
              borderColor: config.commerce.modules.includes(m.id) ? '#6366f1' : '#e5e7eb',
              background: config.commerce.modules.includes(m.id) ? '#f5f3ff' : 'white',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>{m.icon}</div>
            <div className="font-semibold">{m.name}</div>
            {config.commerce.modules.includes(m.id) && (
              <span className="badge badge-success" style={{ marginTop: '0.5rem' }}>✓ Selected</span>
            )}
          </div>
        ))}
      </div>

      <label className="label">Pricing Strategy</label>
      <select
        className="input mb-4"
        value={config.commerce.pricingStrategy}
        onChange={e => setConfig({ ...config, commerce: { ...config.commerce, pricingStrategy: e.target.value } })}
      >
        {PRICING_STRATEGIES.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <label className="label">Payment Methods</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {PAYMENT_METHODS.map(method => (
          <button
            key={method}
            type="button"
            className={`btn ${config.commerce.paymentMethods.includes(method) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => togglePayment(method)}
            style={{ padding: '0.5rem 1rem' }}
          >
            {config.commerce.paymentMethods.includes(method) && '✓ '}{method}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3Workers({ config, setConfig }: any) {
  const MOCK_WORKERS = [
    { id: 'vendor-acquisition', name: 'Vendor Acquisition', cost: 999, skills: ['vendor-discovery', 'vendor-outreach', 'vendor-qualify', 'vendor-onboard'] },
    { id: 'catalog-normalization', name: 'Catalog Normalization', cost: 499, skills: ['image-processing', 'description-generation', 'spec-extraction', 'quality-scoring'] },
    { id: 'recommendation', name: 'Recommendation', cost: 1, skills: ['user-profiling', 'collaborative-filtering', 'content-matching', 'real-time-ranking'] },
    { id: 'growth', name: 'Growth', cost: 1999, skills: ['campaign-creation', 'audience-targeting', 'ab-testing', 'conversion-optimization'] },
    { id: 'fraud-detection', name: 'Fraud Detection', cost: 2, skills: ['pattern-analysis', 'anomaly-detection'] },
    { id: 'customer-support', name: 'Customer Support', cost: 1, skills: ['faq-handling', 'refund-processing', 'complaint-escalation'] },
  ];

  function toggleWorker(id: string, cost: number) {
    const workers = config.workers.some((w: any) => w.id === id)
      ? config.workers.filter((w: any) => w.id !== id)
      : [...config.workers, { id, cost }];
    setConfig({ ...config, workers });
  }

  const totalCost = config.workers.reduce((sum: number, w: any) => sum + w.cost, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Select AI Workers</h2>
      <p className="text-muted mb-4">Choose AI workers to power your commerce</p>

      <div className="grid grid-2">
        {MOCK_WORKERS.map(w => (
          <div
            key={w.id}
            onClick={() => toggleWorker(w.id, w.cost)}
            className="card"
            style={{
              cursor: 'pointer',
              borderColor: config.workers.some((x: any) => x.id === w.id) ? '#6366f1' : '#e5e7eb',
              background: config.workers.some((x: any) => x.id === w.id) ? '#f5f3ff' : 'white',
            }}
          >
            <div className="flex-between mb-2">
              <h3 className="font-semibold">{w.name} Worker</h3>
              <span className="badge">₹{w.cost}/mo</span>
            </div>
            <div className="text-sm text-muted mb-2">Skills: {w.skills.join(', ')}</div>
            {config.workers.some((x: any) => x.id === w.id) && (
              <span className="badge badge-success">✓ Selected</span>
            )}
          </div>
        ))}
      </div>

      <div className="card mt-4" style={{ background: '#f9fafb' }}>
        <div className="flex-between">
          <span className="font-semibold">Selected: {config.workers.length} workers</span>
          <span className="font-bold" style={{ fontSize: '1.25rem', color: '#6366f1' }}>
            ₹{totalCost}/month
          </span>
        </div>
      </div>
    </div>
  );
}

function Step4Trust({ config, setConfig }: any) {
  const DOCUMENTS = [
    { id: 'gst', name: 'GST Registration' },
    { id: 'pan', name: 'PAN Card' },
    { id: 'bank', name: 'Bank Account Statement' },
    { id: 'address', name: 'Address Proof' },
  ];

  const CERTIFICATIONS = ['ISO 9001', 'FSSAI', 'GMP', 'CE', 'FCC'];

  function toggleDocument(id: string) {
    const documents = config.trust.documents.includes(id)
      ? config.trust.documents.filter((d: string) => d !== id)
      : [...config.trust.documents, id];
    setConfig({ ...config, trust: { ...config.trust, documents } });
  }

  function toggleCert(id: string) {
    const certifications = config.trust.certifications.includes(id)
      ? config.trust.certifications.filter((c: string) => c !== id)
      : [...config.trust.certifications, id];
    setConfig({ ...config, trust: { ...config.trust, certifications } });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Set Up Trust</h2>
      <p className="text-muted mb-4">Configure verification and trust requirements</p>

      <label className="label">Required Documents</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {DOCUMENTS.map(d => (
          <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.trust.documents.includes(d.id)}
              onChange={() => toggleDocument(d.id)}
            />
            <span>{d.name}</span>
          </label>
        ))}
      </div>

      <label className="label">Certifications (Optional)</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {CERTIFICATIONS.map(cert => (
          <button
            key={cert}
            type="button"
            className={`btn ${config.trust.certifications.includes(cert) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => toggleCert(cert)}
            style={{ padding: '0.5rem 1rem' }}
          >
            {config.trust.certifications.includes(cert) && '✓ '}{cert}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step5Finance({ config, setConfig }: any) {
  const TERMS = [
    { id: 'instant', name: 'Instant', description: 'Within seconds' },
    { id: 'T+1', name: 'T+1', description: 'Next business day' },
    { id: 'T+2', name: 'T+2', description: 'Two business days' },
    { id: 'weekly', name: 'Weekly', description: 'Every Monday' },
  ];

  const PAYMENT_METHODS = ['UPI', 'Cards', 'Wallets', 'Net Banking', 'BNPL', 'EMI'];

  function toggleMethod(method: string) {
    const paymentMethods = config.finance.paymentMethods.includes(method)
      ? config.finance.paymentMethods.filter((m: string) => m !== method)
      : [...config.finance.paymentMethods, method];
    setConfig({ ...config, finance: { ...config.finance, paymentMethods } });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Configure Finance</h2>
      <p className="text-muted mb-4">Set up payments and settlement</p>

      <label className="label">Payment Methods</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {PAYMENT_METHODS.map(method => (
          <button
            key={method}
            type="button"
            className={`btn ${config.finance.paymentMethods.includes(method) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => toggleMethod(method)}
            style={{ padding: '0.5rem 1rem' }}
          >
            {config.finance.paymentMethods.includes(method) && '✓ '}{method}
          </button>
        ))}
      </div>

      <label className="label">Settlement Terms</label>
      <select
        className="input"
        value={config.finance.settlementTerms}
        onChange={e => setConfig({ ...config, finance: { ...config.finance, settlementTerms: e.target.value } })}
      >
        {TERMS.map(t => (
          <option key={t.id} value={t.id}>{t.name} - {t.description}</option>
        ))}
      </select>
    </div>
  );
}

function Step6Review({ config, templates }: any) {
  const template = templates.find((t: any) => t.id === config.templateId);
  const workerCost = config.workers.reduce((sum: number, w: any) => sum + w.cost, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Review & Deploy</h2>
      <p className="text-muted mb-4">Review your configuration before deploying</p>

      <div className="card mb-4">
        <h3 className="font-semibold mb-2">Template</h3>
        <p>{template?.name || config.templateId || 'None selected'}</p>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-2">Commerce Modules</h3>
        <p>{config.commerce.modules.length} modules selected: {config.commerce.modules.join(', ')}</p>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-2">AI Workers</h3>
        <p>{config.workers.length} workers selected</p>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-2">Trust</h3>
        <p>{config.trust.documents.length} documents, {config.trust.certifications.length} certifications</p>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-2">Finance</h3>
        <p>{config.finance.paymentMethods.length} payment methods, {config.finance.settlementTerms} settlement</p>
      </div>

      <div className="card" style={{ background: '#f5f3ff' }}>
        <div className="flex-between">
          <span className="font-bold text-xl">Estimated Monthly Cost</span>
          <span className="font-bold text-2xl" style={{ color: '#6366f1' }}>
            ₹{workerCost}
          </span>
        </div>
      </div>

      <div className="mt-4" style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.5rem' }}>
        ✓ Ready to deploy. Click "Deploy Now" to start your 7-day launch.
      </div>
    </div>
  );
}