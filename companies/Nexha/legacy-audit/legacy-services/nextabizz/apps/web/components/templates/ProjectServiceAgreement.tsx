'use client';

import React, { useState, useCallback } from 'react';
import {
  ServiceAgreementData,
  ServiceAgreementPreview,
  downloadAgreementHTML,
} from '../ServiceAgreementTemplate';

export interface ProjectServiceAgreementFormData {
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

  // Project Details
  projectName: string;
  projectDescription: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string[];
  acceptanceCriteria: string[];

  // Pricing
  fixedPrice: number;
  currency: string;
  paymentSchedule: { milestone: string; percentage: number; dueInDays: number }[];

  // Timeline
  startDate: string;
  estimatedEndDate: string;
  milestones: { name: string; date: string; deliverables: string[] }[];
  revisionRounds: number;

  // Warranties
  warrantyPeriodDays: number;
  bugFixSupport: string;

  // Signatures
  clientSignatoryName: string;
  clientSignatoryTitle: string;
  providerSignatoryName: string;
  providerSignatoryTitle: string;
}

const defaultFormData: ProjectServiceAgreementFormData = {
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
  projectName: '',
  projectDescription: '',
  deliverables: [''],
  exclusions: [''],
  assumptions: [''],
  acceptanceCriteria: [''],
  fixedPrice: 0,
  currency: 'USD',
  paymentSchedule: [
    { milestone: 'Project Kickoff', percentage: 25, dueInDays: 0 },
    { milestone: 'Design Approval', percentage: 25, dueInDays: 30 },
    { milestone: 'Development Complete', percentage: 25, dueInDays: 60 },
    { milestone: 'Final Delivery', percentage: 25, dueInDays: 90 },
  ],
  startDate: new Date().toISOString().split('T')[0],
  estimatedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  milestones: [
    { name: 'Kickoff', date: new Date().toISOString().split('T')[0], deliverables: ['Project plan', 'Team assignments'] },
    { name: 'Design', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], deliverables: ['Wireframes', 'UI mockups'] },
    { name: 'Development', date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], deliverables: ['Working software', 'Test reports'] },
    { name: 'Launch', date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], deliverables: ['Final product', 'Documentation'] },
  ],
  revisionRounds: 3,
  warrantyPeriodDays: 30,
  bugFixSupport: '30 days included',
  clientSignatoryName: '',
  clientSignatoryTitle: '',
  providerSignatoryName: '',
  providerSignatoryTitle: '',
};

export function createProjectServiceAgreementData(formData: ProjectServiceAgreementFormData): ServiceAgreementData {
  const effectiveDate = new Date().toISOString();

  const calculateDueDate = (startDate: string, days: number): string => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  return {
    agreementId: `PSA-${Date.now()}-NXB`,
    agreementType: 'project',
    title: 'Project Service Agreement',
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
      description: formData.projectDescription || `The project "${formData.projectName}" encompasses all activities required to deliver a fully functional solution as specified in the project requirements.`,
      deliverables: formData.deliverables.filter(d => d.trim() !== ''),
      exclusions: formData.exclusions.filter(e => e.trim() !== ''),
      assumptions: formData.assumptions.filter(a => a.trim() !== ''),
    },
    pricing: {
      type: 'fixed',
      amount: formData.fixedPrice,
      currency: formData.currency,
      paymentSchedule: formData.paymentSchedule.map(p => ({
        milestone: p.milestone,
        percentage: p.percentage,
        dueDate: calculateDueDate(formData.startDate, p.dueInDays),
      })),
    },
    timeline: {
      startDate: formData.startDate,
      estimatedEndDate: formData.estimatedEndDate,
      milestones: formData.milestones.map(m => ({
        name: m.name,
        date: m.date,
        deliverables: m.deliverables,
      })),
      dependencies: [
        'Client approval of deliverables within 5 business days',
        'Timely feedback and decisions from client',
        'Access to required systems and resources',
      ],
      revisionRounds: formData.revisionRounds,
    },
    warranties: {
      warrantyPeriod: formData.warrantyPeriodDays,
      coverage: [
        'Bug fixes for issues reported within warranty period',
        formData.bugFixSupport,
        'Security patches for vulnerabilities',
        'Critical hotfixes for production issues',
      ],
      exclusions: [
        'Feature additions or scope changes',
        'Issues caused by third-party integrations',
        'Client modifications to delivered code',
        'Server or infrastructure issues on client side',
      ],
      remedy: 'Provider shall correct any defects or bugs in the delivered work product at no additional cost during the warranty period. If provider fails to correct defects within reasonable time, client may seek remedies as specified in the limitation of liability section.',
    },
    termination: {
      terminationNoticeDays: 14,
      terminationForCause: [
        {
          description: 'Material breach of agreement terms',
          curePeriod: 14,
        },
        {
          description: 'Failure to provide required resources',
          curePeriod: 7,
        },
        {
          description: 'Non-payment',
          curePeriod: 7,
        },
        {
          description: 'Bankruptcy or insolvency',
          curePeriod: 0,
        },
      ],
      terminationForConvenience: [
        {
          allowed: true,
          penalty: { type: 'percentage', amount: 15 },
        },
      ],
      effectOnPayment: 'Upon termination, client shall pay for all work completed and accepted up to the termination date, plus any non-refundable expenses incurred. Provider retains ownership of all work product until full payment is received.',
    },
    liability: {
      limitationOfLiability: formData.fixedPrice,
      consequentialDamagesWaiver: true,
      capExceptions: [
        'Intellectual property infringement',
        'Gross negligence or willful misconduct',
        'Death or personal injury',
        'Violation of confidentiality obligations',
        'Fraud',
      ],
      insuranceRequirements: [
        { type: 'Professional Liability', coverage: 1000000 },
        { type: 'General Liability', coverage: 500000 },
      ],
    },
    disputeResolution: {
      governingLaw: 'State of California',
      jurisdiction: 'San Francisco County, California',
      arbitrationClause: true,
      mediationRequired: true,
      escalationProcedure: [
        'Level 1: Project Manager escalation (within 3 business days)',
        'Level 2: Account Director escalation (within 7 business days)',
        'Level 3: Executive meeting (within 14 business days)',
        'Level 4: Mediation (within 30 days)',
        'Level 5: Arbitration or litigation',
      ],
    },
    confidentiality: {
      term: 3,
      scope: 'All business, technical, and financial information shared between parties for project purposes. This obligation survives termination of this agreement.',
    },
    ipOwnership: {
      workProduct: 'Upon full payment, all custom deliverables created specifically for this project shall be transferred to client, including all rights, title, and interest.',
      preExistingIp: 'Provider retains all rights to pre-existing tools, frameworks, and methodologies. Client is granted a perpetual license to use any pre-existing IP embedded in deliverables.',
      licenseGrant: 'Provider grants client full ownership of project deliverables upon payment. Provider may retain rights to use anonymized learnings and general methodologies.',
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
        section: 'Project Acceptance',
        content: `Client shall have ${formData.revisionRounds} rounds of revisions included. Upon delivery of each milestone, client shall have 5 business days to review and either accept or provide feedback. Project is deemed accepted if no feedback is provided within this period.`,
      },
      {
        section: 'Change Order Process',
        content: 'Any changes to scope, timeline, or requirements must be documented in a written Change Order signed by both parties. Additional work outside the agreed scope will be quoted separately and require client approval before commencement.',
      },
      {
        section: 'Project Suspension',
        content: 'Client may suspend the project with 7 days written notice. During suspension, provider shall stop all work and preserve all project materials. Project may resume within 60 days of suspension without additional fees.',
      },
    ],
  };
}

interface ProjectServiceAgreementProps {
  initialData?: Partial<ProjectServiceAgreementFormData>;
  onSubmit?: (data: ServiceAgreementData) => void;
  onCancel?: () => void;
}

export function ProjectServiceAgreement({
  initialData,
  onSubmit,
  onCancel,
}: ProjectServiceAgreementProps) {
  const [formData, setFormData] = useState<ProjectServiceAgreementFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  const updateField = useCallback(<K extends keyof ProjectServiceAgreementFormData>(
    field: K,
    value: ProjectServiceAgreementFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const agreementData = createProjectServiceAgreementData(formData);
    onSubmit?.(agreementData);
  }, [formData, onSubmit]);

  const handleDownload = useCallback(() => {
    const agreementData = createProjectServiceAgreementData(formData);
    downloadAgreementHTML(agreementData, `Project-Agreement-${formData.projectName.replace(/\s+/g, '-')}.html`);
  }, [formData]);

  const agreementData = createProjectServiceAgreementData(formData);

  const steps = [
    { id: 1, title: 'Parties', description: 'Client & Provider' },
    { id: 2, title: 'Project', description: 'Scope & Deliverables' },
    { id: 3, title: 'Pricing', description: 'Fixed Price & Payments' },
    { id: 4, title: 'Timeline', description: 'Milestones & Dates' },
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
                  placeholder="Project Manager"
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
              Next: Project Details
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Project Details */}
      {currentStep === 2 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Project Scope</h2>

          <div className="space-y-6">
            <div>
              <label className={labelClass}>Project Name</label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => updateField('projectName', e.target.value)}
                className={inputClass}
                placeholder="E-commerce Platform Development"
              />
            </div>

            <div>
              <label className={labelClass}>Project Description</label>
              <textarea
                value={formData.projectDescription}
                onChange={(e) => updateField('projectDescription', e.target.value)}
                className={inputClass}
                rows={4}
                placeholder="Describe the project scope, objectives, and expected outcomes..."
              />
            </div>

            <div>
              <label className={labelClass}>Deliverables</label>
              <div className="space-y-2">
                {formData.deliverables.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...formData.deliverables];
                        newItems[index] = e.target.value;
                        updateField('deliverables', newItems);
                      }}
                      className={inputClass}
                      placeholder={`Deliverable ${index + 1}`}
                    />
                    {index > 0 && (
                      <button
                        onClick={() => {
                          const newItems = formData.deliverables.filter((_, i) => i !== index);
                          updateField('deliverables', newItems);
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => updateField('deliverables', [...formData.deliverables, ''])}
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

            <div>
              <label className={labelClass}>Acceptance Criteria</label>
              <div className="space-y-2">
                {formData.acceptanceCriteria.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...formData.acceptanceCriteria];
                        newItems[index] = e.target.value;
                        updateField('acceptanceCriteria', newItems);
                      }}
                      className={inputClass}
                      placeholder={`Criteria ${index + 1}`}
                    />
                    {index > 0 && (
                      <button
                        onClick={() => {
                          const newItems = formData.acceptanceCriteria.filter((_, i) => i !== index);
                          updateField('acceptanceCriteria', newItems);
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => updateField('acceptanceCriteria', [...formData.acceptanceCriteria, ''])}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  type="button"
                >
                  + Add Acceptance Criteria
                </button>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelClass}>Fixed Price</label>
              <input
                type="number"
                value={formData.fixedPrice}
                onChange={(e) => updateField('fixedPrice', Number(e.target.value))}
                className={inputClass}
                min={0}
                placeholder="25000"
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
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Payment Schedule</label>
            <div className="space-y-3">
              {formData.paymentSchedule.map((payment, index) => (
                <div key={index} className="flex items-end gap-4 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600">Milestone</label>
                    <input
                      type="text"
                      value={payment.milestone}
                      onChange={(e) => {
                        const newSchedule = [...formData.paymentSchedule];
                        newSchedule[index].milestone = e.target.value;
                        updateField('paymentSchedule', newSchedule);
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-gray-600">%</label>
                    <input
                      type="number"
                      value={payment.percentage}
                      onChange={(e) => {
                        const newSchedule = [...formData.paymentSchedule];
                        newSchedule[index].percentage = Number(e.target.value);
                        updateField('paymentSchedule', newSchedule);
                      }}
                      className={inputClass}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-gray-600">Due (days)</label>
                    <input
                      type="number"
                      value={payment.dueInDays}
                      onChange={(e) => {
                        const newSchedule = [...formData.paymentSchedule];
                        newSchedule[index].dueInDays = Number(e.target.value);
                        updateField('paymentSchedule', newSchedule);
                      }}
                      className={inputClass}
                      min={0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.fixedPrice)}</h4>
            <p className="text-sm text-purple-700">
              Payment percentages must total 100%. Current total: {formData.paymentSchedule.reduce((sum, p) => sum + p.percentage, 0)}%
            </p>
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
          <h2 className="text-xl font-bold text-gray-900 mb-6">Timeline & Milestones</h2>

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
              <label className={labelClass}>Estimated End Date</label>
              <input
                type="date"
                value={formData.estimatedEndDate}
                onChange={(e) => updateField('estimatedEndDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className={labelClass}>Milestones</label>
            <div className="space-y-4">
              {formData.milestones.map((milestone, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="text-xs text-gray-600">Milestone Name</label>
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) => {
                          const newMilestones = [...formData.milestones];
                          newMilestones[index].name = e.target.value;
                          updateField('milestones', newMilestones);
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Date</label>
                      <input
                        type="date"
                        value={milestone.date}
                        onChange={(e) => {
                          const newMilestones = [...formData.milestones];
                          newMilestones[index].date = e.target.value;
                          updateField('milestones', newMilestones);
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Deliverables</label>
                    <input
                      type="text"
                      value={milestone.deliverables.join(', ')}
                      onChange={(e) => {
                        const newMilestones = [...formData.milestones];
                        newMilestones[index].deliverables = e.target.value.split(',').map(s => s.trim());
                        updateField('milestones', newMilestones);
                      }}
                      className={inputClass}
                      placeholder="Deliverable 1, Deliverable 2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Revision Rounds Included</label>
              <input
                type="number"
                value={formData.revisionRounds}
                onChange={(e) => updateField('revisionRounds', Number(e.target.value))}
                className={inputClass}
                min={1}
                max={10}
              />
            </div>
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
          </div>

          <div className="mt-6">
            <label className={labelClass}>Bug Fix Support</label>
            <input
              type="text"
              value={formData.bugFixSupport}
              onChange={(e) => updateField('bugFixSupport', e.target.value)}
              className={inputClass}
              placeholder="30 days included"
            />
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
                <h3 className="font-semibold text-gray-900 mb-2">Project</h3>
                <p className="text-sm text-gray-600">
                  <strong>Name:</strong> {formData.projectName || 'Not specified'}<br />
                  <strong>Duration:</strong> {Math.ceil((new Date(formData.estimatedEndDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Pricing</h3>
                <p className="text-sm text-gray-600">
                  <strong>Fixed Price:</strong> {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.fixedPrice)}<br />
                  <strong>Milestones:</strong> {formData.paymentSchedule.length}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
                <p className="text-sm text-gray-600">
                  <strong>Start:</strong> {new Date(formData.startDate).toLocaleDateString()}<br />
                  <strong>End:</strong> {new Date(formData.estimatedEndDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Support</h3>
                <p className="text-sm text-gray-600">
                  <strong>Revisions:</strong> {formData.revisionRounds} rounds<br />
                  <strong>Warranty:</strong> {formData.warrantyPeriodDays} days
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Generate Project Service Agreement</h3>
            <p className="text-sm text-blue-700 mb-4">
              The agreement will include project-specific terms, milestones, payment schedule, and deliverables.
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

export default ProjectServiceAgreement;
