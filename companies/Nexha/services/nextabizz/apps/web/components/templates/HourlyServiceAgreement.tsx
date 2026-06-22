'use client';

import React, { useState, useCallback } from 'react';
import {
  ServiceAgreementData,
  ServiceAgreementPreview,
  downloadAgreementHTML,
} from '../ServiceAgreementTemplate';

export interface HourlyServiceAgreementFormData {
  // Parties
  clientName: string;
  clientAddress: string;
  clientContactName: string;
  clientEmail: string;
  clientPhone: string;
  providerName: string;
  providerAddress: string;
  providerContactName: string;
  providerEmail: string;
  providerPhone: string;

  // Service Details
  serviceDescription: string;
  serviceCategories: { name: string; rate: number; minHours: number }[];
  engagementScope: string;
  exclusions: string[];
  assumptions: string[];

  // Pricing
  currency: string;
  hourlyRates: { category: string; rate: number }[];
  monthlyRetainer: number;
  retainerHours: number;
  overtimeRateMultiplier: number;
  billingIncrement: string;
  paymentTermsDays: number;

  // Timeline
  startDate: string;
  termMonths: number;
  autoRenewal: boolean;

  // Warranties
  workmanshipWarrantyDays: number;

  // Signatures
  clientSignatoryName: string;
  clientSignatoryTitle: string;
  providerSignatoryName: string;
  providerSignatoryTitle: string;
}

const defaultFormData: HourlyServiceAgreementFormData = {
  clientName: '',
  clientAddress: '',
  clientContactName: '',
  clientEmail: '',
  clientPhone: '',
  providerName: 'NEXABIZZ Inc.',
  providerAddress: '123 Business Park, Suite 100, San Francisco, CA 94102',
  providerContactName: '',
  providerEmail: '',
  providerPhone: '',
  serviceDescription: 'NEXABIZZ shall provide professional consulting and development services on an hourly basis as specified in the rate schedule.',
  serviceCategories: [
    { name: 'Senior Developer', rate: 175, minHours: 0 },
    { name: 'Developer', rate: 125, minHours: 0 },
    { name: 'Project Manager', rate: 150, minHours: 0 },
    { name: 'Business Analyst', rate: 120, minHours: 0 },
    { name: 'QA Engineer', rate: 100, minHours: 0 },
  ],
  engagementScope: 'Professional software development and consulting services as needed by client.',
  exclusions: [
    'Hardware procurement',
    'Third-party software licenses',
    'Travel expenses (billed at cost)',
    'Work outside agreed scope',
  ],
  assumptions: [
    'Client will provide timely access to required systems',
    'Requests will be submitted through agreed channels',
    'Communication will be responded to within 24 hours',
  ],
  currency: 'USD',
  hourlyRates: [
    { category: 'Senior Developer', rate: 175 },
    { category: 'Developer', rate: 125 },
    { category: 'Project Manager', rate: 150 },
    { category: 'Business Analyst', rate: 120 },
    { category: 'QA Engineer', rate: 100 },
  ],
  monthlyRetainer: 0,
  retainerHours: 0,
  overtimeRateMultiplier: 1.5,
  billingIncrement: '0.25 hour',
  paymentTermsDays: 30,
  startDate: new Date().toISOString().split('T')[0],
  termMonths: 12,
  autoRenewal: true,
  workmanshipWarrantyDays: 15,
  clientSignatoryName: '',
  clientSignatoryTitle: '',
  providerSignatoryName: '',
  providerSignatoryTitle: '',
};

export function createHourlyServiceAgreementData(formData: HourlyServiceAgreementFormData): ServiceAgreementData {
  const effectiveDate = new Date().toISOString();
  const termEndDate = new Date();
  termEndDate.setMonth(termEndDate.getMonth() + formData.termMonths);

  const totalRetainerValue = formData.monthlyRetainer > 0
    ? formData.monthlyRetainer * formData.termMonths
    : 0;

  return {
    agreementId: `HSA-${Date.now()}-NXB`,
    agreementType: 'hourly',
    title: 'Hourly Service Agreement',
    version: '1.0',
    effectiveDate: formData.startDate,
    parties: {
      client: {
        name: formData.clientName,
        address: formData.clientAddress,
        contactName: formData.clientContactName,
        email: formData.clientEmail,
        phone: formData.clientPhone,
      },
      provider: {
        name: formData.providerName,
        address: formData.providerAddress,
        contactName: formData.providerContactName,
        email: formData.providerEmail,
        phone: formData.providerPhone,
      },
    },
    serviceScope: {
      description: formData.serviceDescription,
      deliverables: formData.serviceCategories.map(cat => `${cat.name}: Up to ${cat.minHours > 0 ? cat.minHours : 'unlimited'} hours at ${new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(cat.rate)}/hour`),
      exclusions: formData.exclusions,
      assumptions: formData.assumptions,
    },
    pricing: {
      type: 'hourly',
      amount: totalRetainerValue || 0,
      currency: formData.currency,
      paymentSchedule: formData.monthlyRetainer > 0 ? [
        { milestone: 'Monthly Retainer - Month 1', percentage: 100 / formData.termMonths, dueDate: formData.startDate },
      ] : [],
      additionalFees: formData.hourlyRates.map(r => ({
        description: `${r.category}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(r.rate)}/hour`,
        amount: r.rate,
      })),
    },
    timeline: {
      startDate: formData.startDate,
      estimatedEndDate: termEndDate.toISOString(),
      milestones: [
        {
          name: 'Engagement Start',
          date: formData.startDate,
          deliverables: ['Team assignment', 'Access provisioning'],
        },
        {
          name: 'Monthly Review',
          date: new Date(new Date(formData.startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          deliverables: ['Monthly report', 'Hours utilization'],
        },
        {
          name: 'Quarterly Review',
          date: new Date(new Date(formData.startDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          deliverables: ['Quarterly review', 'ROI assessment'],
        },
      ],
      dependencies: ['Client request submission', 'Access provisioning'],
      revisionRounds: 1,
    },
    warranties: {
      warrantyPeriod: formData.workmanshipWarrantyDays,
      coverage: [
        'Workmanship guarantee for all delivered services',
        'Correction of errors in work product',
        'Support during warranty period',
      ],
      exclusions: [
        'Modifications made by client',
        'Third-party integration issues',
        'Changes to requirements after acceptance',
        'Usage outside intended scope',
      ],
      remedy: `Provider shall correct any defects in workmanship at no additional charge within ${formData.workmanshipWarrantyDays} days of notification. Corrections beyond this scope may be billed at standard hourly rates.`,
    },
    termination: {
      terminationNoticeDays: 30,
      terminationForCause: [
        {
          description: 'Material breach of agreement',
          curePeriod: 15,
        },
        {
          description: 'Non-payment',
          curePeriod: 7,
        },
        {
          description: 'Bankruptcy or insolvency',
          curePeriod: 0,
        },
        {
          description: 'Security breach or data misuse',
          curePeriod: 0,
        },
      ],
      terminationForConvenience: [
        {
          allowed: true,
          penalty: { type: 'fixed', amount: 0 },
        },
      ],
      effectOnPayment: 'Upon termination, client shall pay for all hours worked through the termination date at the agreed rates. Unused retainer hours are non-refundable.',
    },
    liability: {
      limitationOfLiability: Math.max(totalRetainerValue, formData.monthlyRetainer * 3),
      consequentialDamagesWaiver: true,
      capExceptions: [
        'Intellectual property infringement',
        'Gross negligence or willful misconduct',
        'Death or personal injury',
        'Violation of confidentiality',
        'Fraud',
      ],
      insuranceRequirements: [
        { type: 'Professional Liability', coverage: 2000000 },
        { type: 'General Liability', coverage: 1000000 },
      ],
    },
    disputeResolution: {
      governingLaw: 'State of California',
      jurisdiction: 'San Francisco County, California',
      arbitrationClause: true,
      mediationRequired: true,
      escalationProcedure: [
        'Level 1: Team lead escalation (within 2 business days)',
        'Level 2: Account manager escalation (within 5 business days)',
        'Level 3: Executive meeting (within 10 business days)',
        'Level 4: Mediation (within 20 days)',
        'Level 5: Binding arbitration',
      ],
    },
    confidentiality: {
      term: 3,
      scope: 'All non-public information disclosed during the engagement. This obligation survives termination for 3 years.',
    },
    ipOwnership: {
      workProduct: 'All work product created under this agreement shall be owned by client upon payment for those hours. Provider retains rights to general methodologies and reusable components.',
      preExistingIp: 'Provider retains all rights to pre-existing tools, frameworks, and methodologies. Client receives a limited license to use such IP as embedded in deliverables.',
      licenseGrant: 'Upon payment, client receives full ownership of custom deliverables. Provider may use anonymized learnings.',
    },
    signatures: {
      client: {
        name: formData.clientSignatoryName,
        date: new Date().toISOString(),
        title: formData.clientSignatoryTitle,
      },
      provider: {
        name: formData.providerSignatoryName,
        date: new Date().toISOString(),
        title: formData.providerSignatoryTitle,
      },
    },
    additionalTerms: [
      {
        section: 'Hourly Rate Schedule',
        content: `Services are billed at the following hourly rates: ${formData.hourlyRates.map(r => `${r.category}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(r.rate)}/hour`).join(', ')}. Rates may be adjusted annually with 60 days notice.`,
      },
      {
        section: 'Billing Increment',
        content: `Time is billed in ${formData.billingIncrement} increments. Portal time is billed at 50% of standard rate. Overtime (exceeding 8 hours/day or weekends) is billed at ${formData.overtimeRateMultiplier}x standard rate.`,
      },
      {
        section: 'Time Tracking',
        content: 'Provider shall maintain detailed time records and provide monthly reports. Client may request additional detail within 7 days of invoice receipt.',
      },
      {
        section: 'Monthly Retainer',
        content: formData.monthlyRetainer > 0
          ? `Client commits to a monthly retainer of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.monthlyRetainer)} covering ${formData.retainerHours} hours. Unused hours do not roll over to subsequent months.`
          : 'No retainer commitment. Services are billed as consumed at standard hourly rates.',
      },
    ],
  };
}

interface HourlyServiceAgreementProps {
  initialData?: Partial<HourlyServiceAgreementFormData>;
  onSubmit?: (data: ServiceAgreementData) => void;
  onCancel?: () => void;
}

export function HourlyServiceAgreement({
  initialData,
  onSubmit,
  onCancel,
}: HourlyServiceAgreementProps) {
  const [formData, setFormData] = useState<HourlyServiceAgreementFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  const updateField = useCallback(<K extends keyof HourlyServiceAgreementFormData>(
    field: K,
    value: HourlyServiceAgreementFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const agreementData = createHourlyServiceAgreementData(formData);
    onSubmit?.(agreementData);
  }, [formData, onSubmit]);

  const handleDownload = useCallback(() => {
    const agreementData = createHourlyServiceAgreementData(formData);
    downloadAgreementHTML(agreementData, `Hourly-Agreement-${formData.clientName.replace(/\s+/g, '-')}.html`);
  }, [formData]);

  const agreementData = createHourlyServiceAgreementData(formData);

  const steps = [
    { id: 1, title: 'Parties', description: 'Client & Provider' },
    { id: 2, title: 'Services', description: 'Scope & Rates' },
    { id: 3, title: 'Terms', description: 'Billing & Timeline' },
    { id: 4, title: 'Review', description: 'Summary & Download' },
  ];

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionClass = 'bg-white rounded-xl border border-gray-200 p-6';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-center ${
                  currentStep >= step.id ? 'text-purple-600' : 'text-gray-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= step.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.id}
                </div>
                <span className="text-sm font-medium mt-2">{step.title}</span>
                <span className="text-xs hidden sm:block">{step.description}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  currentStep > step.id ? 'bg-purple-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Parties */}
      {currentStep === 1 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Parties to Agreement</h2>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-purple-600 mb-4">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Company Name</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => updateField('clientName', e.target.value)}
                  className={inputClass}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Address</label>
                <input
                  type="text"
                  value={formData.clientAddress}
                  onChange={(e) => updateField('clientAddress', e.target.value)}
                  className={inputClass}
                  placeholder="123 Main Street, City, State ZIP"
                />
              </div>
              <div>
                <label className={labelClass}>Contact Name</label>
                <input
                  type="text"
                  value={formData.clientContactName}
                  onChange={(e) => updateField('clientContactName', e.target.value)}
                  className={inputClass}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  value={formData.clientSignatoryTitle}
                  onChange={(e) => updateField('clientSignatoryTitle', e.target.value)}
                  className={inputClass}
                  placeholder="VP of Engineering"
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => updateField('clientEmail', e.target.value)}
                  className={inputClass}
                  placeholder="john@acme.com"
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => updateField('clientPhone', e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-600 mb-4">Service Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Company Name</label>
                <input
                  type="text"
                  value={formData.providerName}
                  onChange={(e) => updateField('providerName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact Name</label>
                <input
                  type="text"
                  value={formData.providerContactName}
                  onChange={(e) => updateField('providerContactName', e.target.value)}
                  className={inputClass}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={formData.providerEmail}
                  onChange={(e) => updateField('providerEmail', e.target.value)}
                  className={inputClass}
                  placeholder="jane@nexabizz.com"
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={formData.providerPhone}
                  onChange={(e) => updateField('providerPhone', e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 987-6543"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setCurrentStep(2)}
              className="btn-primary"
              disabled={!formData.clientName}
            >
              Next: Services & Rates
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Services & Rates */}
      {currentStep === 2 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Service Scope & Rates</h2>

          <div className="space-y-6">
            <div>
              <label className={labelClass}>Service Description</label>
              <textarea
                value={formData.serviceDescription}
                onChange={(e) => updateField('serviceDescription', e.target.value)}
                className={inputClass}
                rows={3}
              />
            </div>

            <div>
              <label className={labelClass}>Engagement Scope</label>
              <textarea
                value={formData.engagementScope}
                onChange={(e) => updateField('engagementScope', e.target.value)}
                className={inputClass}
                rows={2}
                placeholder="Describe the types of work to be performed..."
              />
            </div>

            <div>
              <label className={labelClass}>Hourly Rates</label>
              <div className="space-y-3">
                {formData.hourlyRates.map((rate, index) => (
                  <div key={index} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rate.category}
                        onChange={(e) => {
                          const newRates = [...formData.hourlyRates];
                          newRates[index].category = e.target.value;
                          updateField('hourlyRates', newRates);
                        }}
                        className={inputClass}
                        placeholder="Role/Category"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={rate.rate}
                        onChange={(e) => {
                          const newRates = [...formData.hourlyRates];
                          newRates[index].rate = Number(e.target.value);
                          updateField('hourlyRates', newRates);
                        }}
                        className={inputClass}
                        min={0}
                        placeholder="Rate"
                      />
                    </div>
                    <span className="text-gray-500">/{formData.currency}/hr</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Billing Increment</label>
                <select
                  value={formData.billingIncrement}
                  onChange={(e) => updateField('billingIncrement', e.target.value)}
                  className={inputClass}
                >
                  <option value="0.25 hour">15 minutes</option>
                  <option value="0.5 hour">30 minutes</option>
                  <option value="1 hour">1 hour</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Overtime Multiplier</label>
                <input
                  type="number"
                  value={formData.overtimeRateMultiplier}
                  onChange={(e) => updateField('overtimeRateMultiplier', Number(e.target.value))}
                  className={inputClass}
                  min={1}
                  step={0.1}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Exclusions</label>
              <div className="space-y-2">
                {formData.exclusions.map((item, index) => (
                  <div key={index}>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...formData.exclusions];
                        newItems[index] = e.target.value;
                        updateField('exclusions', newItems);
                      }}
                      className={inputClass}
                      placeholder={`Exclusion ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Assumptions</label>
              <div className="space-y-2">
                {formData.assumptions.map((item, index) => (
                  <div key={index}>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...formData.assumptions];
                        newItems[index] = e.target.value;
                        updateField('assumptions', newItems);
                      }}
                      className={inputClass}
                      placeholder={`Assumption ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentStep(1)} className="btn-secondary">
              Previous
            </button>
            <button onClick={() => setCurrentStep(3)} className="btn-primary">
              Next: Terms
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Terms */}
      {currentStep === 3 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Billing & Timeline Terms</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className={labelClass}>Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => updateField('currency', e.target.value)}
                className={inputClass}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.paymentTermsDays}
                onChange={(e) => updateField('paymentTermsDays', Number(e.target.value))}
                className={inputClass}
                min={0}
                max={90}
              />
            </div>
            <div>
              <label className={labelClass}>Workmanship Warranty (Days)</label>
              <input
                type="number"
                value={formData.workmanshipWarrantyDays}
                onChange={(e) => updateField('workmanshipWarrantyDays', Number(e.target.value))}
                className={inputClass}
                min={0}
              />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-purple-900 mb-4">Monthly Retainer (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Monthly Retainer Amount</label>
                <input
                  type="number"
                  value={formData.monthlyRetainer}
                  onChange={(e) => updateField('monthlyRetainer', Number(e.target.value))}
                  className={inputClass}
                  min={0}
                  placeholder="0 for no retainer"
                />
              </div>
              <div>
                <label className={labelClass}>Retainer Hours Included</label>
                <input
                  type="number"
                  value={formData.retainerHours}
                  onChange={(e) => updateField('retainerHours', Number(e.target.value))}
                  className={inputClass}
                  min={0}
                  placeholder="0 for consumption-based"
                />
              </div>
            </div>
            <p className="text-sm text-purple-700 mt-2">
              Leave both at 0 for pure consumption-based billing without commitment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Term (Months)</label>
              <input
                type="number"
                value={formData.termMonths}
                onChange={(e) => updateField('termMonths', Number(e.target.value))}
                className={inputClass}
                min={1}
                max={36}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoRenewal"
              checked={formData.autoRenewal}
              onChange={(e) => updateField('autoRenewal', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <label htmlFor="autoRenewal" className="text-gray-700">
              Auto-renewal for successive terms
            </label>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentStep(2)} className="btn-secondary">
              Previous
            </button>
            <button onClick={() => setCurrentStep(4)} className="btn-primary">
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review & Generate</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Parties</h3>
                <p className="text-sm text-gray-600">
                  <strong>Client:</strong> {formData.clientName}<br />
                  <strong>Provider:</strong> {formData.providerName}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Term</h3>
                <p className="text-sm text-gray-600">
                  {formData.termMonths} months{formData.autoRenewal ? ' (auto-renew)' : ''}<br />
                  Start: {new Date(formData.startDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Billing</h3>
                <p className="text-sm text-gray-600">
                  {formData.monthlyRetainer > 0
                    ? `Retainer: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.monthlyRetainer)}/mo`
                    : 'Consumption-based'}
                  <br />
                  Payment: Net {formData.paymentTermsDays}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Hourly Rates</h3>
                <div className="text-sm text-gray-600">
                  {formData.hourlyRates.slice(0, 3).map(r => (
                    <div key={r.category}>{r.category}: {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(r.rate)}/hr</div>
                  ))}
                  {formData.hourlyRates.length > 3 && (
                    <div>+{formData.hourlyRates.length - 3} more roles</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="font-semibold text-green-900 mb-2">Generate Hourly Service Agreement</h3>
            <p className="text-sm text-green-700 mb-4">
              The agreement will include the complete rate schedule, billing terms, and retainer provisions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="btn-primary"
              >
                Download Agreement
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="btn-secondary"
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="card p-4">
              <ServiceAgreementPreview data={agreementData} />
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setCurrentStep(3)} className="btn-secondary">
              Previous
            </button>
            <div className="flex gap-3">
              {onCancel && (
                <button onClick={onCancel} className="btn-secondary">
                  Cancel
                </button>
              )}
              <button onClick={handleSubmit} className="btn-primary">
                Save & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HourlyServiceAgreement;
