'use client';

import React, { useState, useCallback } from 'react';
import {
  ServiceAgreementData,
  ServiceAgreementPreview,
  downloadAgreementHTML,
} from '../ServiceAgreementTemplate';

// Master Service Agreement specific types
export interface MasterServiceAgreementFormData {
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

  // Service Scope
  serviceDescription: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string[];

  // Pricing
  annualMinimum: number;
  currency: string;
  paymentTermsDays: number;
  volumeDiscounts: { threshold: number; discount: number }[];

  // Timeline
  startDate: string;
  termYears: number;
  autoRenewal: boolean;
  renewalTermYears: number;

  // Warranties
  warrantyPeriodDays: number;
  uptimeGuarantee: number;
  supportResponseTime: string;

  // Signatures
  clientSignatoryName: string;
  clientSignatoryTitle: string;
  providerSignatoryName: string;
  providerSignatoryTitle: string;
}

const defaultFormData: MasterServiceAgreementFormData = {
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
  serviceDescription: 'NEXABIZZ shall provide comprehensive B2B software services including platform access, maintenance, support, and consulting services as described herein.',
  deliverables: [
    'Access to NEXABIZS platform and all standard features',
    'Technical support during business hours (9 AM - 6 PM local time)',
    'Regular software updates and security patches',
    'Monthly performance reports and analytics',
    'Dedicated account manager',
  ],
  exclusions: [
    'Custom feature development (available under separate SOW)',
    'Data migration services (available under separate SOW)',
    'Third-party software integration costs',
    'Hardware procurement and installation',
    'Training services beyond initial onboarding',
  ],
  assumptions: [
    'Client will provide timely access to necessary systems and personnel',
    'Client will maintain valid licenses for all required third-party software',
    'Both parties will communicate promptly regarding any issues or delays',
    'Client data will be provided in standard formats as specified by NEXABIZZ',
  ],
  annualMinimum: 24000,
  currency: 'USD',
  paymentTermsDays: 30,
  volumeDiscounts: [
    { threshold: 50000, discount: 5 },
    { threshold: 100000, discount: 10 },
    { threshold: 200000, discount: 15 },
  ],
  startDate: new Date().toISOString().split('T')[0],
  termYears: 2,
  autoRenewal: true,
  renewalTermYears: 1,
  warrantyPeriodDays: 30,
  uptimeGuarantee: 99.9,
  supportResponseTime: '4 hours',
  clientSignatoryName: '',
  clientSignatoryTitle: '',
  providerSignatoryName: '',
  providerSignatoryTitle: '',
};

export function createMasterServiceAgreementData(formData: MasterServiceAgreementFormData): ServiceAgreementData {
  const effectiveDate = new Date().toISOString();
  const termEndDate = new Date();
  termEndDate.setFullYear(termEndDate.getFullYear() + formData.termYears);

  return {
    agreementId: `MSA-${Date.now()}-NXB`,
    agreementType: 'master',
    title: 'Master Service Agreement',
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
      deliverables: formData.deliverables,
      exclusions: formData.exclusions,
      assumptions: formData.assumptions,
    },
    pricing: {
      type: 'monthly',
      amount: formData.annualMinimum,
      currency: formData.currency,
      paymentSchedule: [
        {
          milestone: 'Annual Subscription',
          percentage: 100,
          dueDate: formData.startDate,
        },
      ],
      additionalFees: formData.volumeDiscounts.map(vd => ({
        description: `Volume discount at ${vd.threshold.toLocaleString()} ${formData.currency} annual spend`,
        amount: -vd.discount,
      })),
    },
    timeline: {
      startDate: formData.startDate,
      estimatedEndDate: termEndDate.toISOString(),
      milestones: [
        {
          name: 'Agreement Execution',
          date: formData.startDate,
          deliverables: ['Signed agreement', 'Initial payment'],
        },
        {
          name: 'Service Activation',
          date: new Date(new Date(formData.startDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          deliverables: ['Platform access', 'Account setup', 'Initial training'],
        },
        {
          name: 'Annual Review',
          date: new Date(new Date(formData.startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          deliverables: ['Performance review', 'SLA compliance report'],
        },
      ],
      dependencies: ['Client account setup completion', 'Payment processing'],
      revisionRounds: 2,
    },
    warranties: {
      warrantyPeriod: formData.warrantyPeriodDays,
      coverage: [
        `${formData.uptimeGuarantee}% platform availability guarantee`,
        `${formData.supportResponseTime} response time for support requests`,
        'Bug fixes and security patches',
        'Data backup and recovery services',
      ],
      exclusions: [
        'Issues caused by client modifications to platform',
        'Downtime during scheduled maintenance (max 4 hours/month)',
        'Force majeure events',
        'Client-side network or infrastructure issues',
      ],
      remedy: `If NEXABIZZ fails to meet the ${formData.uptimeGuarantee}% uptime guarantee, client shall receive service credits equal to the pro-rated value of downtime hours, not to exceed 10% of monthly fees.`,
    },
    termination: {
      terminationNoticeDays: 60,
      terminationForCause: [
        {
          description: 'Material breach of agreement terms',
          curePeriod: 30,
        },
        {
          description: 'Failure to make payment within 15 days of due date',
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
          penalty: { type: 'percentage', amount: 50 },
        },
      ],
      effectOnPayment: 'Upon termination, client shall pay for all services rendered through the termination date. Any prepaid fees for future periods shall be refunded within 30 days.',
    },
    liability: {
      limitationOfLiability: formData.annualMinimum * 2,
      consequentialDamagesWaiver: true,
      capExceptions: [
        'Intellectual property infringement',
        'Gross negligence or willful misconduct',
        'Death or personal injury',
        'Fraud',
        'Violation of applicable laws',
      ],
      insuranceRequirements: [
        { type: 'Professional Liability', coverage: 2000000 },
        { type: 'Cyber Liability', coverage: 1000000 },
        { type: 'General Liability', coverage: 1000000 },
      ],
    },
    disputeResolution: {
      governingLaw: 'State of California',
      jurisdiction: 'San Francisco County, California',
      arbitrationClause: true,
      mediationRequired: true,
      escalationProcedure: [
        'Level 1: Project Manager escalation (within 5 business days)',
        'Level 2: Department Director escalation (within 10 business days)',
        'Level 3: Executive leadership meeting (within 15 business days)',
        'Level 4: Mediation with neutral third party (within 30 days)',
        'Level 5: Binding arbitration if mediation fails',
      ],
    },
    confidentiality: {
      term: 5,
      scope: 'All non-public business, technical, and financial information exchanged between parties during the term of this agreement and for 5 years thereafter.',
    },
    ipOwnership: {
      workProduct: 'NEXABIZZ retains all ownership rights to pre-existing intellectual property. Any custom developments created specifically for client under a Statement of Work shall be owned by client upon full payment.',
      preExistingIp: 'All pre-existing intellectual property remains the property of the original owner. Neither party shall gain rights to the other party\'s pre-existing IP.',
      licenseGrant: 'NEXABIZZ grants client a non-exclusive, non-transferable license to use the platform and services during the term of this agreement.',
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
        section: 'Volume Commitment',
        content: `Client commits to a minimum annual spend of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.annualMinimum)}. Volume discounts apply based on actual annual spend exceeding the thresholds specified above.`,
      },
      {
        section: 'Auto-Renewal',
        content: formData.autoRenewal
          ? `This agreement shall automatically renew for successive ${formData.renewalTermYears}-year terms unless either party provides written notice of non-renewal at least ${60} days prior to the end of the current term.`
          : 'This agreement shall not auto-renew and will terminate on the specified end date unless renewed by mutual written agreement.',
      },
      {
        section: 'Service Level Agreement',
        content: `NEXABIZZ guarantees ${formData.uptimeGuarantee}% platform availability, measured monthly. Scheduled maintenance shall not exceed 4 hours per month and shall be performed during off-peak hours with 48 hours advance notice.`,
      },
    ],
  };
}

interface MasterServiceAgreementProps {
  initialData?: Partial<MasterServiceAgreementFormData>;
  onSubmit?: (data: ServiceAgreementData) => void;
  onCancel?: () => void;
}

export function MasterServiceAgreement({
  initialData,
  onSubmit,
  onCancel,
}: MasterServiceAgreementProps) {
  const [formData, setFormData] = useState<MasterServiceAgreementFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  const updateField = useCallback(<K extends keyof MasterServiceAgreementFormData>(
    field: K,
    value: MasterServiceAgreementFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateDeliverable = useCallback((index: number, value: string) => {
    const newDeliverables = [...formData.deliverables];
    newDeliverables[index] = value;
    updateField('deliverables', newDeliverables);
  }, [formData.deliverables, updateField]);

  const addDeliverable = useCallback(() => {
    updateField('deliverables', [...formData.deliverables, '']);
  }, [formData.deliverables, updateField]);

  const removeDeliverable = useCallback((index: number) => {
    updateField('deliverables', formData.deliverables.filter((_, i) => i !== index));
  }, [formData.deliverables, updateField]);

  const handleSubmit = useCallback(() => {
    const agreementData = createMasterServiceAgreementData(formData);
    onSubmit?.(agreementData);
  }, [formData, onSubmit]);

  const handleDownload = useCallback(() => {
    const agreementData = createMasterServiceAgreementData(formData);
    downloadAgreementHTML(agreementData, `Master-Service-Agreement-${formData.clientName.replace(/\s+/g, '-')}.html`);
  }, [formData]);

  const agreementData = createMasterServiceAgreementData(formData);

  const steps = [
    { id: 1, title: 'Parties', description: 'Client & Provider Information' },
    { id: 2, title: 'Scope', description: 'Service Description' },
    { id: 3, title: 'Pricing', description: 'Terms & Volume' },
    { id: 4, title: 'Timeline', description: 'Term & Renewals' },
    { id: 5, title: 'Review', description: 'Summary & Download' },
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

          {/* Client Information */}
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
                  placeholder="Chief Technology Officer"
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

          {/* Provider Information */}
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
              disabled={!formData.clientName || !formData.clientContactName}
            >
              Next: Service Scope
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Service Scope */}
      {currentStep === 2 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Service Scope</h2>

          <div className="space-y-6">
            <div>
              <label className={labelClass}>Service Description</label>
              <textarea
                value={formData.serviceDescription}
                onChange={(e) => updateField('serviceDescription', e.target.value)}
                className={inputClass}
                rows={4}
              />
            </div>

            <div>
              <label className={labelClass}>Deliverables</label>
              <div className="space-y-2">
                {formData.deliverables.map((deliverable, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={deliverable}
                      onChange={(e) => updateDeliverable(index, e.target.value)}
                      className={inputClass}
                      placeholder={`Deliverable ${index + 1}`}
                    />
                    <button
                      onClick={() => removeDeliverable(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={addDeliverable}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  type="button"
                >
                  + Add Deliverable
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Exclusions</label>
              <div className="space-y-2">
                {formData.exclusions.map((exclusion, index) => (
                  <div key={index}>
                    <input
                      type="text"
                      value={exclusion}
                      onChange={(e) => {
                        const newExclusions = [...formData.exclusions];
                        newExclusions[index] = e.target.value;
                        updateField('exclusions', newExclusions);
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
                {formData.assumptions.map((assumption, index) => (
                  <div key={index}>
                    <input
                      type="text"
                      value={assumption}
                      onChange={(e) => {
                        const newAssumptions = [...formData.assumptions];
                        newAssumptions[index] = e.target.value;
                        updateField('assumptions', newAssumptions);
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
              Next: Pricing
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pricing */}
      {currentStep === 3 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Pricing Terms</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className={labelClass}>Annual Minimum ({formData.currency})</label>
              <input
                type="number"
                value={formData.annualMinimum}
                onChange={(e) => updateField('annualMinimum', Number(e.target.value))}
                className={inputClass}
                min={0}
              />
            </div>
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
                <option value="AUD">AUD</option>
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
          </div>

          <div>
            <label className={labelClass}>Volume Discounts</label>
            <div className="space-y-3">
              {formData.volumeDiscounts.map((discount, index) => (
                <div key={index} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Annual Spend Above</span>
                    <input
                      type="number"
                      value={discount.threshold}
                      onChange={(e) => {
                        const newDiscounts = [...formData.volumeDiscounts];
                        newDiscounts[index].threshold = Number(e.target.value);
                        updateField('volumeDiscounts', newDiscounts);
                      }}
                      className={inputClass}
                      min={0}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Discount %</span>
                    <input
                      type="number"
                      value={discount.discount}
                      onChange={(e) => {
                        const newDiscounts = [...formData.volumeDiscounts];
                        newDiscounts[index].discount = Number(e.target.value);
                        updateField('volumeDiscounts', newDiscounts);
                      }}
                      className={inputClass}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentStep(2)} className="btn-secondary">
              Previous
            </button>
            <button onClick={() => setCurrentStep(4)} className="btn-primary">
              Next: Timeline
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Timeline */}
      {currentStep === 4 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Timeline & Terms</h2>

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
              <label className={labelClass}>Initial Term (Years)</label>
              <input
                type="number"
                value={formData.termYears}
                onChange={(e) => updateField('termYears', Number(e.target.value))}
                className={inputClass}
                min={1}
                max={10}
              />
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoRenewal"
                checked={formData.autoRenewal}
                onChange={(e) => updateField('autoRenewal', e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <label htmlFor="autoRenewal" className="text-gray-700">
                Auto-renewal enabled
              </label>
            </div>

            {formData.autoRenewal && (
              <div className="ml-8">
                <label className={labelClass}>Renewal Term (Years)</label>
                <input
                  type="number"
                  value={formData.renewalTermYears}
                  onChange={(e) => updateField('renewalTermYears', Number(e.target.value))}
                  className={inputClass}
                  min={1}
                  max={5}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Warranty Period (Days)</label>
              <input
                type="number"
                value={formData.warrantyPeriodDays}
                onChange={(e) => updateField('warrantyPeriodDays', Number(e.target.value))}
                className={inputClass}
                min={0}
              />
            </div>
            <div>
              <label className={labelClass}>Uptime Guarantee (%)</label>
              <input
                type="number"
                value={formData.uptimeGuarantee}
                onChange={(e) => updateField('uptimeGuarantee', Number(e.target.value))}
                className={inputClass}
                min={0}
                max={100}
                step={0.1}
              />
            </div>
            <div>
              <label className={labelClass}>Support Response Time</label>
              <select
                value={formData.supportResponseTime}
                onChange={(e) => updateField('supportResponseTime', e.target.value)}
                className={inputClass}
              >
                <option value="1 hour">1 hour</option>
                <option value="4 hours">4 hours</option>
                <option value="8 hours">8 hours</option>
                <option value="24 hours">24 hours</option>
                <option value="48 hours">48 hours</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentStep(3)} className="btn-secondary">
              Previous
            </button>
            <button onClick={() => setCurrentStep(5)} className="btn-primary">
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
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
                  {formData.termYears} years{formData.autoRenewal ? ` (auto-renew ${formData.renewalTermYears}y)` : ''}<br />
                  Start: {new Date(formData.startDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Pricing</h3>
                <p className="text-sm text-gray-600">
                  Annual Minimum: {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.annualMinimum)}<br />
                  Payment Terms: Net {formData.paymentTermsDays}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Service Level</h3>
                <p className="text-sm text-gray-600">
                  Uptime: {formData.uptimeGuarantee}%<br />
                  Support: {formData.supportResponseTime} response
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <h3 className="font-semibold text-purple-900 mb-2">Generate Service Agreement</h3>
            <p className="text-sm text-purple-700 mb-4">
              The agreement will be generated as a professional HTML document with all terms, signatures, and legal clauses included.
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
            <button onClick={() => setCurrentStep(4)} className="btn-secondary">
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

export default MasterServiceAgreement;
