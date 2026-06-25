'use client';
/**
 * Federation Join — 3-step wizard
 * Nexha Portal v2.0
 */

import { useState } from 'react';
import Link from 'next/link';
import { federation } from '@/lib/federation-api';

const TIERS = [
  { id: 'observer', label: 'Observer', price: 'Free', desc: 'Explore the network, no obligations', color: 'green' },
  { id: 'standard', label: 'Standard', price: '$199/mo', desc: 'Full API access, initiate handshakes', color: 'blue' },
  { id: 'associate', label: 'Associate', price: '$499/mo', desc: 'Priority discovery, referral bonuses', color: 'gray' },
  { id: 'strategic', label: 'Strategic', price: '$1,499/mo', desc: 'Dedicated support, founding perks', color: 'violet' },
  { id: 'founding', label: 'Founding', price: 'By invite', desc: 'Board seat, veto on major policies', color: 'amber' },
];

const INDUSTRIES = [
  'manufacturing.steel', 'manufacturing.textile', 'manufacturing.electronics',
  'logistics', 'distribution', 'finance', 'healthcare', 'retail',
  'hospitality', 'education', 'agriculture', 'it', 'media', 'realestate',
  'logistics.cold_chain', 'franchise', 'service', 'data', 'agent', 'skill',
];

const REGIONS = ['IN', 'SG', 'US', 'GB', 'AE', 'AU', 'ID', 'TH', 'VN', 'MY', 'PH', 'JP', 'KR', 'DE', 'NL'];

export default function JoinPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    description: '',
    contactName: '',
    contactEmail: '',
    phone: '',
    region: '',
    industryCategory: '',
    employeeCount: '',
    currentChallenge: '',
    referralSource: 'website',
    referredBy: '',
  });
  const [selectedTier, setSelectedTier] = useState('observer');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; nexhaId?: string; error?: string } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canNext = step === 1
    ? form.name && form.description && form.region
    : step === 2
    ? form.contactName && form.contactEmail
    : true;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Submit inquiry
      const inquiry = await federation.submitInquiry({
        organizationName: form.name,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        phone: form.phone || undefined,
        industryCategory: form.industryCategory || 'general',
        region: form.region,
        employeeCount: form.employeeCount ? parseInt(form.employeeCount) : undefined,
        currentChallenge: form.currentChallenge || undefined,
        referralSource: form.referralSource,
        referredBy: form.referredBy || undefined,
      });
      setResult({ success: true, nexhaId: inquiry.id });
    } catch (err: unknown) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🌐</span>
        <Link href="/federation" className="font-bold text-lg hover:text-violet-300">Nexha Federation</Link>
        <span className="text-gray-600">/ Join</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-12">
          {[['1', 'Organization', 'Basic info'], ['2', 'Contact', 'Your details'], ['3', 'Review', 'Confirm & submit']].map(([n, title, sub], i) => (
            <div key={n} className="flex items-center">
              <div className={`flex flex-col items-center ${step > i + 1 ? 'text-violet-400' : step === i + 1 ? 'text-white' : 'text-gray-600'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2
                  ${step > i + 1 ? 'bg-violet-600 border-violet-600 text-white' :
                    step === i + 1 ? 'border-violet-500 text-violet-400' : 'border-gray-700'}`}>
                  {step > i + 1 ? '✓' : n}
                </div>
                <div className="text-xs mt-1 font-medium">{title}</div>
                <div className="text-xs text-gray-600">{sub}</div>
              </div>
              {i < 2 && <div className={`w-20 h-0.5 mx-2 ${step > i + 1 ? 'bg-violet-600' : 'bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        {/* Result */}
        {result ? (
          <div className="text-center py-12">
            {result.success ? (
              <>
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-2xl font-bold mb-4">Application Received!</h2>
                <p className="text-gray-400 mb-6">
                  Your inquiry <span className="text-violet-400 font-mono text-sm">({result.nexhaId})</span> has been submitted.
                  The federation team will review your application and reach out within 48 hours.
                </p>
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-left mb-8 max-w-md mx-auto">
                  <div className="text-sm text-gray-400 mb-3">What happens next:</div>
                  <ol className="space-y-2 text-sm text-gray-300">
                    <li>1. Federation team reviews your application</li>
                    <li>2. You'll receive an email with next steps</li>
                    <li>3. Deploy Nexha OS runtime on your infrastructure</li>
                    <li>4. Join the federation and build your first handshake</li>
                  </ol>
                </div>
                <div className="flex gap-4 justify-center">
                  <Link href="/federation/network" className="px-6 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm">
                    Browse the Network
                  </Link>
                  <Link href="/federation" className="px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm">
                    Back to Home
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-6">😕</div>
                <h2 className="text-2xl font-bold mb-4 text-red-400">Submission Failed</h2>
                <p className="text-gray-400 mb-6">{result.error}</p>
                <button onClick={() => setResult(null)} className="px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm">
                  Try Again
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Step 1: Organization */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">About Your Organization</h2>
                  <p className="text-gray-400">Tell us about your business or network.</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
                  <Field label="Organization Name *" hint="The official name of your Nexha">
                    <input value={form.name} onChange={set('name')} placeholder="Mumbai Steel Collective"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
                  </Field>
                  <Field label="Description *" hint="What does your Nexha do?">
                    <textarea value={form.description} onChange={set('description')} placeholder="We aggregate steel manufacturing capacity across Maharashtra..."
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none" />
                  </Field>
                  <Field label="Region *" hint="ISO country code">
                    <select value={form.region} onChange={set('region')}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500">
                      <option value="">Select region...</option>
                      {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Industry Category" hint="Primary category for discovery">
                    <select value={form.industryCategory} onChange={set('industryCategory')}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500">
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="flex justify-end">
                  <button disabled={!canNext} onClick={() => setStep(2)}
                    className={`px-8 py-3 rounded-lg font-semibold text-sm transition ${canNext ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                    Next: Contact Details →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Contact */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Contact Information</h2>
                  <p className="text-gray-400">Who should the federation team contact?</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Contact Name *" hint="Full name">
                      <input value={form.contactName} onChange={set('contactName')} placeholder="Priya Sharma"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
                    </Field>
                    <Field label="Phone" hint="Optional">
                      <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
                    </Field>
                  </div>
                  <Field label="Contact Email *" hint="Official email for federation communications">
                    <input type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="ops@mumbai-steel.example"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Employee Count" hint="Approximate size">
                      <input value={form.employeeCount} onChange={set('employeeCount')} placeholder="500"
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
                    </Field>
                    <Field label="Referral Source" hint="How did you hear about us?">
                      <select value={form.referralSource} onChange={set('referralSource')}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500">
                        <option value="website">Website</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="event">Event</option>
                        <option value="partner">Partner</option>
                        <option value="member">Existing Member</option>
                        <option value="referral_program">Referral Program</option>
                        <option value="unknown">Other</option>
                      </select>
                    </Field>
                  </div>
                  {form.referralSource === 'member' && (
                    <Field label="Referred By" hint="Which member referred you?">
                      <input value={form.referredBy} onChange={set('referredBy')} placeholder="nexha-maya-collective"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500" />
                    </Field>
                  )}
                  <Field label="Current Challenge" hint="What problem are you trying to solve? (optional)">
                    <textarea value={form.currentChallenge} onChange={set('currentChallenge')}
                      placeholder="We struggle to find reliable suppliers in the South India region..."
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none" />
                  </Field>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(1)}
                    className="px-8 py-3 rounded-lg font-semibold text-sm bg-gray-800 hover:bg-gray-700 text-white transition">
                    ← Back
                  </button>
                  <button disabled={!canNext} onClick={() => setStep(3)}
                    className={`px-8 py-3 rounded-lg font-semibold text-sm transition ${canNext ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                    Review Application →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Review & Submit</h2>
                  <p className="text-gray-400">Confirm your application details before submitting.</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
                  <ReviewRow label="Organization" value={form.name} />
                  <ReviewRow label="Description" value={form.description} />
                  <ReviewRow label="Region" value={form.region} />
                  <ReviewRow label="Industry" value={form.industryCategory || '—'} />
                  <div className="border-t border-gray-800 pt-4">
                    <ReviewRow label="Contact" value={form.contactName} />
                    <ReviewRow label="Email" value={form.contactEmail} />
                    {form.phone && <ReviewRow label="Phone" value={form.phone} />}
                    <ReviewRow label="Referral" value={form.referralSource} />
                  </div>
                  {form.currentChallenge && (
                    <div className="border-t border-gray-800 pt-4">
                      <ReviewRow label="Challenge" value={form.currentChallenge} />
                    </div>
                  )}
                </div>

                <div className="bg-violet-950/50 border border-violet-800 rounded-xl p-4">
                  <p className="text-sm text-violet-300">
                    By submitting, you agree to the{' '}
                    <a href="#" className="underline hover:text-violet-200">Nexha Federation Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="underline hover:text-violet-200">Privacy Policy</a>.
                    Your application will be reviewed by the federation team.
                  </p>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep(2)}
                    className="px-8 py-3 rounded-lg font-semibold text-sm bg-gray-800 hover:bg-gray-700 text-white transition">
                    ← Back
                  </button>
                  <button disabled={submitting} onClick={handleSubmit}
                    className="px-8 py-3 rounded-lg font-semibold text-sm bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-50">
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-600 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <div className="text-sm text-gray-500 w-32 shrink-0">{label}</div>
      <div className="text-sm text-white">{value || '—'}</div>
    </div>
  );
}
