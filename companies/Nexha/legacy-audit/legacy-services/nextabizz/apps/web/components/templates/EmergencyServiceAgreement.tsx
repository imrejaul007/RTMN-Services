'use client';

import React, { useState, useCallback } from 'react';
import {
  ServiceAgreementData,
  ServiceAgreementPreview,
  downloadAgreementHTML,
} from '../ServiceAgreementTemplate';

export interface EmergencyServiceAgreementFormData {
  // Parties
  clientName: string;
  clientAddress: string;
  clientContactName: string;
  clientEmail: string;
  clientPhone: string;
  clientAltPhone: string;
  providerName: string;
  providerAddress: string;
  providerContactName: string;
  providerEmail: string;
  providerPhone: string;

  // Emergency Details
  emergencyType: string;
  severity: 'critical' | 'high' | 'medium';
  issueDescription: string;
  affectedSystems: string[];
  businessImpact: string;
  workaroundInPlace: boolean;
  workaroundDescription: string;

  // Service Details
  serviceDescription: string;
  deliverables: string[];
  scopeBoundaries: string[];
  exclusions: string[];

  // Pricing
  currency: string;
  baseRate: number;
  emergencyRate: number;
  overtimeMultiplier: number;
  minimumChargeHours: number;
  estimatedHours: number;
  paymentTermsDays: number;
  rushFee: number;

  // Timeline
  responseTimeMinutes: number;
  startDate: string;
  estimatedResolutionDate: string;
  followUpSupportDays: number;

  // Warranties
  warrantyPeriodDays: number;
  resolutionGuarantee: string;

  // Signatures
  clientSignatoryName: string;
  clientSignatoryTitle: string;
  providerSignatoryName: string;
  providerSignatoryTitle: string;
}

const defaultFormData: EmergencyServiceAgreementFormData = {
  clientName: '',
  clientAddress: '',
  clientContactName: '',
  clientEmail: '',
  clientPhone: '',
  clientAltPhone: '',
  providerName: 'NEXABIZZ Inc.',
  providerAddress: '123 Business Park, Suite 100, San Francisco, CA 94102',
  providerContactName: '',
  providerEmail: '',
  providerPhone: '',
  emergencyType: '',
  severity: 'high',
  issueDescription: '',
  affectedSystems: [''],
  businessImpact: '',
  workaroundInPlace: false,
  workaroundDescription: '',
  serviceDescription: 'Emergency technical support and remediation services to resolve critical system issues.',
  deliverables: [
    'Root cause analysis',
    'Issue resolution',
    'System restoration',
    'Post-incident report',
  ],
  scopeBoundaries: [
    'Direct issue resolution',
    'Immediate system stabilization',
    'Critical functionality restoration',
  ],
  exclusions: [
    'Full system redesign',
    'New feature development',
    'Complete data migration',
    'Hardware replacement (coordination only)',
  ],
  currency: 'USD',
  baseRate: 200,
  emergencyRate: 350,
  overtimeMultiplier: 1.5,
  minimumChargeHours: 4,
  estimatedHours: 8,
  paymentTermsDays: 14,
  rushFee: 500,
  responseTimeMinutes: 60,
  startDate: new Date().toISOString().split('T')[0],
  estimatedResolutionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  followUpSupportDays: 7,
  warrantyPeriodDays: 7,
  resolutionGuarantee: 'Issue resolution or workaround within 24 hours',
  clientSignatoryName: '',
  clientSignatoryTitle: '',
  providerSignatoryName: '',
  providerSignatoryTitle: '',
};

export function createEmergencyServiceAgreementData(formData: EmergencyServiceAgreementFormData): ServiceAgreementData {
  const effectiveDate = new Date().toISOString();
  const estimatedCost = formData.estimatedHours * formData.emergencyRate + formData.rushFee;

  return {
    agreementId: `ESA-${Date.now()}-NXB`,
    agreementType: 'emergency',
    title: 'Emergency Service Agreement',
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
      assumptions: [
        `Client will provide ${formData.responseTimeMinutes}-minute response time access`,
        'Client will assign technical point of contact',
        'Client will provide necessary system credentials',
        `Workaround in place: ${formData.workaroundInPlace ? 'Yes - ' + formData.workaroundDescription : 'No'}`,
      ],
    },
    pricing: {
      type: 'hourly',
      amount: estimatedCost,
      currency: formData.currency,
      paymentSchedule: [
        {
          milestone: 'Emergency Response Activation',
          percentage: 50,
          dueDate: formData.startDate,
        },
        {
          milestone: 'Issue Resolution',
          percentage: 50,
          dueDate: formData.estimatedResolutionDate,
        },
      ],
      additionalFees: [
        {
          description: `Emergency rate (${formData.emergencyRate}/${formData.currency}/hr - 1.${Math.round((formData.emergencyRate / formData.baseRate - 1) * 10)}x base)`,
          amount: formData.emergencyRate,
        },
        {
          description: `Rush activation fee (response within ${formData.responseTimeMinutes} min)`,
          amount: formData.rushFee,
        },
        {
          description: `Minimum charge: ${formData.minimumChargeHours} hours`,
          amount: formData.minimumChargeHours * formData.emergencyRate,
        },
        {
          description: `Overtime rate multiplier (evenings/weekends): ${formData.overtimeMultiplier}x`,
          amount: formData.emergencyRate * (formData.overtimeMultiplier - 1),
        },
      ],
    },
    timeline: {
      startDate: formData.startDate,
      estimatedEndDate: formData.estimatedResolutionDate,
      milestones: [
        {
          name: 'Emergency Response',
          date: formData.startDate,
          deliverables: ['Initial assessment', 'Immediate stabilization'],
        },
        {
          name: 'Root Cause Analysis',
          date: new Date(new Date(formData.startDate).getTime() + 4 * 60 * 60 * 1000).toISOString(),
          deliverables: ['Root cause identification', 'Resolution plan'],
        },
        {
          name: 'Resolution',
          date: formData.estimatedResolutionDate,
          deliverables: ['Issue resolved', 'System restored'],
        },
        {
          name: 'Follow-up Support',
          date: new Date(new Date(formData.estimatedResolutionDate).getTime() + formData.followUpSupportDays * 24 * 60 * 60 * 1000).toISOString(),
          deliverables: ['Post-incident report', 'Monitoring period'],
        },
      ],
      dependencies: ['Client system access', 'Credentials provided', 'Technical contact available'],
      revisionRounds: 1,
    },
    warranties: {
      warrantyPeriod: formData.warrantyPeriodDays,
      coverage: [
        formData.resolutionGuarantee,
        `Follow-up support for ${formData.followUpSupportDays} days`,
        'Reoccurrence of same issue at no additional charge',
        'Post-incident review documentation',
      ],
      exclusions: [
        'Issues caused by client modifications post-resolution',
        'Recurring issues from unfixed root causes outside warranty',
        'Third-party system failures',
        'Natural disasters or force majeure',
      ],
      remedy: `Provider guarantees resolution or acceptable workaround within ${24} hours of engagement. If not achieved, client may request full or partial refund of emergency fees. Maximum remedy value equals total emergency service fees paid.`,
    },
    termination: {
      terminationNoticeDays: 0,
      terminationForCause: [
        {
          description: 'Issue resolved by other means',
          curePeriod: 0,
        },
        {
          description: 'Client fails to provide required access',
          curePeriod: 1,
        },
        {
          description: 'Client requests termination',
          curePeriod: 0,
        },
      ],
      terminationForConvenience: [
        {
          allowed: false,
          penalty: { type: 'fixed', amount: 0 },
        },
      ],
      effectOnPayment: 'Upon termination, client shall pay for all hours worked at emergency rates, plus any non-refundable expenses. Minimum charge of ' + formData.minimumChargeHours + ' hours applies regardless of resolution status.',
    },
    liability: {
      limitationOfLiability: estimatedCost * 2,
      consequentialDamagesWaiver: true,
      capExceptions: [
        'Gross negligence or willful misconduct',
        'Death or personal injury',
        'Intentional damage',
        'Violation of security protocols',
      ],
      insuranceRequirements: [
        { type: 'Professional Liability', coverage: 2000000 },
        { type: 'Cyber Liability', coverage: 1000000 },
      ],
    },
    disputeResolution: {
      governingLaw: 'State of California',
      jurisdiction: 'San Francisco County, California',
      arbitrationClause: false,
      mediationRequired: false,
      escalationProcedure: [
        'Level 1: On-site technician escalation',
        'Level 2: Engineering team lead (within 2 hours)',
        'Level 3: Director of Operations (within 4 hours)',
        'Level 4: Executive sponsor (within 8 hours)',
      ],
    },
    confidentiality: {
      term: 2,
      scope: 'All system information, data, and business processes accessed during emergency resolution. This obligation survives termination for 2 years.',
    },
    ipOwnership: {
      workProduct: 'Provider retains ownership of remediation methodologies. Client receives ownership of any custom fixes specifically created for this incident.',
      preExistingIp: 'All pre-existing IP remains with original owner.',
      licenseGrant: 'Provider grants client a perpetual, non-exclusive license to use any custom fixes created during this engagement.',
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
        section: 'Emergency Response Terms',
        content: `This is an emergency service engagement with guaranteed ${formData.responseTimeMinutes}-minute response time. Emergency rates apply for the duration of active resolution. Standard rates apply for follow-up support.`,
      },
      {
        section: 'Severity Classification',
        content: `This incident is classified as ${formData.severity.toUpperCase()} severity. Response times: Critical = 15 min, High = 1 hour, Medium = 4 hours.`,
      },
      {
        section: 'SLA Credits',
        content: `If provider fails to meet ${formData.responseTimeMinutes}-minute response commitment, client receives ${25}% credit on rush fee. If resolution not achieved within 24 hours, client receives 20% credit on total emergency fees.`,
      },
      {
        section: 'Business Impact',
        content: formData.businessImpact || 'Business impact not specified - client to provide impact assessment.',
      },
    ],
  };
}

interface EmergencyServiceAgreementProps {
  initialData?: Partial<EmergencyServiceAgreementFormData>;
  onSubmit?: (data: ServiceAgreementData) => void;
  onCancel?: () => void;
}

export function EmergencyServiceAgreement({
  initialData,
  onSubmit,
  onCancel,
}: EmergencyServiceAgreementProps) {
  const [formData, setFormData] = useState<EmergencyServiceAgreementFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  const updateField = useCallback(<K extends keyof EmergencyServiceAgreementFormData>(
    field: K,
    value: EmergencyServiceAgreementFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const agreementData = createEmergencyServiceAgreementData(formData);
    onSubmit?.(agreementData);
  }, [formData, onSubmit]);

  const handleDownload = useCallback(() => {
    const agreementData = createEmergencyServiceAgreementData(formData);
    downloadAgreementHTML(agreementData, `Emergency-Agreement-${formData.emergencyType.replace(/\s+/g, '-') || 'Incident'}-${Date.now()}.html`);
  }, [formData]);

  const agreementData = createEmergencyServiceAgreementData(formData);
  const estimatedCost = formData.estimatedHours * formData.emergencyRate + formData.rushFee;

  const steps = [
    { id: 1, title: 'Incident', description: 'Emergency Details' },
    { id: 2, title: 'Parties', description: 'Client & Provider' },
    { id: 3, title: 'Pricing', description: 'Rates & Terms' },
    { id: 4, title: 'Review', description: 'Summary & Download' },
  ];

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionClass = 'bg-white rounded-xl border border-gray-200 p-6';

  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Emergency Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-4 rounded-xl mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg">Emergency Service Agreement</h2>
            <p className="text-red-100 text-sm">Fast-track resolution for critical issues</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-center ${
                  currentStep >= step.id ? 'text-red-600' : 'text-gray-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= step.id
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.id}
                </div>
                <span className="text-sm font-medium mt-2">{step.title}</span>
                <span className="text-xs hidden sm:block">{step.description}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  currentStep > step.id ? 'bg-red-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Emergency Details */}
      {currentStep === 1 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Emergency Incident Details</h2>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Emergency Type</label>
                <select
                  value={formData.emergencyType}
                  onChange={(e) => updateField('emergencyType', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select type...</option>
                  <option value="System Outage">System Outage</option>
                  <option value="Security Breach">Security Breach</option>
                  <option value="Data Loss">Data Loss</option>
                  <option value="Performance Degradation">Performance Degradation</option>
                  <option value="Integration Failure">Integration Failure</option>
                  <option value="Database Corruption">Database Corruption</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Severity Level</label>
                <div className="flex gap-2">
                  {(['critical', 'high', 'medium'] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => updateField('severity', sev)}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 font-medium capitalize transition-colors ${
                        formData.severity === sev
                          ? severityColors[sev]
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                      type="button"
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Issue Description</label>
              <textarea
                value={formData.issueDescription}
                onChange={(e) => updateField('issueDescription', e.target.value)}
                className={inputClass}
                rows={4}
                placeholder="Describe the issue in detail..."
              />
            </div>

            <div>
              <label className={labelClass}>Affected Systems</label>
              <div className="space-y-2">
                {formData.affectedSystems.map((system, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={system}
                      onChange={(e) => {
                        const newSystems = [...formData.affectedSystems];
                        newSystems[index] = e.target.value;
                        updateField('affectedSystems', newSystems);
                      }}
                      className={inputClass}
                      placeholder={`System ${index + 1}`}
                    />
                    {index > 0 && (
                      <button
                        onClick={() => {
                          updateField('affectedSystems', formData.affectedSystems.filter((_, i) => i !== index));
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
                  onClick={() => updateField('affectedSystems', [...formData.affectedSystems, ''])}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                  type="button"
                >
                  + Add System
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Business Impact</label>
              <textarea
                value={formData.businessImpact}
                onChange={(e) => updateField('businessImpact', e.target.value)}
                className={inputClass}
                rows={2}
                placeholder="Describe how this issue affects business operations..."
              />
            </div>

            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
              <input
                type="checkbox"
                id="workaround"
                checked={formData.workaroundInPlace}
                onChange={(e) => updateField('workaroundInPlace', e.target.checked)}
                className="w-5 h-5 text-red-600 rounded mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="workaround" className="font-medium text-gray-700">
                  Temporary workaround in place
                </label>
                {formData.workaroundInPlace && (
                  <input
                    type="text"
                    value={formData.workaroundDescription}
                    onChange={(e) => updateField('workaroundDescription', e.target.value)}
                    className={inputClass + ' mt-2'}
                    placeholder="Describe the workaround..."
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Response Time (Minutes)</label>
                <select
                  value={formData.responseTimeMinutes}
                  onChange={(e) => updateField('responseTimeMinutes', Number(e.target.value))}
                  className={inputClass}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Estimated Resolution Date</label>
                <input
                  type="datetime-local"
                  value={formData.estimatedResolutionDate.slice(0, 16)}
                  onChange={(e) => updateField('estimatedResolutionDate', new Date(e.target.value).toISOString())}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setCurrentStep(2)}
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={!formData.emergencyType || !formData.issueDescription}
            >
              Next: Parties
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Parties */}
      {currentStep === 2 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h2>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Client Emergency Contact</h3>
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
                <label className={labelClass}>Primary Contact Name</label>
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
                  placeholder="IT Director"
                />
              </div>
              <div>
                <label className={labelClass}>Primary Phone</label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => updateField('clientPhone', e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className={labelClass}>Alternate Phone</label>
                <input
                  type="tel"
                  value={formData.clientAltPhone}
                  onChange={(e) => updateField('clientAltPhone', e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 987-6543"
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
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Emergency Response Provider</h3>
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
                  placeholder="emergency@nexabizz.com"
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={formData.providerPhone}
                  onChange={(e) => updateField('providerPhone', e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 911-HELP"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentStep(1)} className="btn-secondary">
              Previous
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={!formData.clientName || !formData.clientContactName}
            >
              Next: Pricing
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pricing */}
      {currentStep === 3 && (
        <div className={sectionClass}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Emergency Service Pricing</h2>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">
              Emergency rates apply due to urgent response commitment. These rates are higher than standard hourly rates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className={labelClass}>Base Rate ({formData.currency}/hr)</label>
              <input
                type="number"
                value={formData.baseRate}
                onChange={(e) => updateField('baseRate', Number(e.target.value))}
                className={inputClass}
                min={0}
              />
            </div>
            <div>
              <label className={labelClass}>Emergency Rate ({formData.currency}/hr)</label>
              <input
                type="number"
                value={formData.emergencyRate}
                onChange={(e) => updateField('emergencyRate', Number(e.target.value))}
                className={inputClass}
                min={0}
              />
            </div>
            <div>
              <label className={labelClass}>Overtime Multiplier</label>
              <input
                type="number"
                value={formData.overtimeMultiplier}
                onChange={(e) => updateField('overtimeMultiplier', Number(e.target.value))}
                className={inputClass}
                min={1}
                step={0.1}
              />
            </div>
            <div>
              <label className={labelClass}>Rush Activation Fee</label>
              <input
                type="number"
                value={formData.rushFee}
                onChange={(e) => updateField('rushFee', Number(e.target.value))}
                className={inputClass}
                min={0}
              />
            </div>
          </div>

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
              <label className={labelClass}>Minimum Charge (Hours)</label>
              <input
                type="number"
                value={formData.minimumChargeHours}
                onChange={(e) => updateField('minimumChargeHours', Number(e.target.value))}
                className={inputClass}
                min={1}
              />
            </div>
            <div>
              <label className={labelClass}>Estimated Hours</label>
              <input
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => updateField('estimatedHours', Number(e.target.value))}
                className={inputClass}
                min={1}
              />
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-purple-900 mb-2">Estimated Total Cost</h4>
            <p className="text-3xl font-bold text-purple-700">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(estimatedCost)}
            </p>
            <p className="text-sm text-purple-600 mt-1">
              {formData.estimatedHours} hours @ {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.emergencyRate)}/hr + {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.rushFee)} rush fee
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelClass}>Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.paymentTermsDays}
                onChange={(e) => updateField('paymentTermsDays', Number(e.target.value))}
                className={inputClass}
                min={0}
                max={30}
              />
            </div>
            <div>
              <label className={labelClass}>Follow-up Support (Days)</label>
              <input
                type="number"
                value={formData.followUpSupportDays}
                onChange={(e) => updateField('followUpSupportDays', Number(e.target.value))}
                className={inputClass}
                min={0}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Resolution Guarantee</label>
            <input
              type="text"
              value={formData.resolutionGuarantee}
              onChange={(e) => updateField('resolutionGuarantee', e.target.value)}
              className={inputClass}
              placeholder="Issue resolution or workaround within 24 hours"
            />
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentStep(2)} className="btn-secondary">
              Previous
            </button>
            <button onClick={() => setCurrentStep(4)} className="btn-primary bg-red-600 hover:bg-red-700">
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Emergency Service Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900 mb-2">Incident</h3>
                <p className="text-sm text-red-700">
                  <strong>Type:</strong> {formData.emergencyType || 'Not specified'}<br />
                  <strong>Severity:</strong> <span className="capitalize">{formData.severity}</span><br />
                  <strong>Response:</strong> Within {formData.responseTimeMinutes} minutes
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Client</h3>
                <p className="text-sm text-gray-600">
                  <strong>Name:</strong> {formData.clientName}<br />
                  <strong>Contact:</strong> {formData.clientContactName}<br />
                  <strong>Phone:</strong> {formData.clientPhone}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Pricing</h3>
                <p className="text-sm text-purple-700">
                  <strong>Emergency Rate:</strong> {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.emergencyRate)}/hr<br />
                  <strong>Estimated:</strong> {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(estimatedCost)}<br />
                  <strong>Payment:</strong> Net {formData.paymentTermsDays}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
                <p className="text-sm text-gray-600">
                  <strong>Start:</strong> {new Date(formData.startDate).toLocaleString()}<br />
                  <strong>Resolution By:</strong> {new Date(formData.estimatedResolutionDate).toLocaleString()}<br />
                  <strong>Follow-up:</strong> {formData.followUpSupportDays} days
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="font-semibold text-red-900 mb-2">Generate Emergency Service Agreement</h3>
            <p className="text-sm text-red-700 mb-4">
              This agreement will be generated immediately with emergency terms, pricing, and response guarantees.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="btn-primary bg-red-600 hover:bg-red-700"
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
              <button onClick={handleSubmit} className="btn-primary bg-red-600 hover:bg-red-700">
                Activate Emergency Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmergencyServiceAgreement;
