import React, { useCallback, useState } from 'react';

// Service Agreement Types
export interface ServiceScope {
  description: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string[];
}

export interface PricingTerms {
  type: 'fixed' | 'hourly' | 'monthly' | 'tiered';
  amount: number;
  currency: string;
  paymentSchedule: {
    milestone: string;
    percentage: number;
    dueDate: string;
  }[];
  additionalFees?: {
    description: string;
    amount: number;
  }[];
}

export interface TimelineDelivery {
  startDate: string;
  estimatedEndDate: string;
  milestones: {
    name: string;
    date: string;
    deliverables: string[];
  }[];
  dependencies: string[];
  revisionRounds: number;
}

export interface WarrantyTerms {
  warrantyPeriod: number;
  coverage: string[];
  exclusions: string[];
  remedy: string;
}

export interface TerminationClauses {
  terminationNoticeDays: number;
  terminationForCause: {
    description: string;
    curePeriod: number;
  }[];
  terminationForConvenience: {
    allowed: boolean;
    penalty: {
      type: 'percentage' | 'fixed';
      amount: number;
    };
  }[];
  effectOnPayment: string;
}

export interface LiabilityLimits {
  limitationOfLiability: number;
  consequentialDamagesWaiver: boolean;
  capExceptions: string[];
  insuranceRequirements: {
    type: string;
    coverage: number;
  }[];
}

export interface DisputeResolution {
  governingLaw: string;
  jurisdiction: string;
  arbitrationClause: boolean;
  mediationRequired: boolean;
  escalationProcedure: string[];
}

export interface AgreementParties {
  client: {
    name: string;
    address: string;
    contactName: string;
    email: string;
    phone: string;
  };
  provider: {
    name: string;
    address: string;
    contactName: string;
    email: string;
    phone: string;
  };
}

export interface ServiceAgreementData {
  agreementId: string;
  agreementType: 'master' | 'project' | 'hourly' | 'emergency';
  title: string;
  version: string;
  effectiveDate: string;
  parties: AgreementParties;
  serviceScope: ServiceScope;
  pricing: PricingTerms;
  timeline: TimelineDelivery;
  warranties: WarrantyTerms;
  termination: TerminationClauses;
  liability: LiabilityLimits;
  disputeResolution: DisputeResolution;
  confidentiality?: {
    term: number;
    scope: string;
  };
  ipOwnership?: {
    workProduct: string;
    preExistingIp: string;
    licenseGrant: string;
  };
  signatures: {
    client: {
      name: string;
      date: string;
      title: string;
    };
    provider: {
      name: string;
      date: string;
      title: string;
    };
  };
  additionalTerms?: {
    section: string;
    content: string;
  }[];
}

// Base styles
const sectionStyles = {
  container: 'py-8 px-6 md:px-12',
  header: 'text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-purple-600',
  subsection: 'text-lg font-semibold text-gray-800 mt-6 mb-3',
  paragraph: 'text-gray-700 leading-relaxed mb-4',
  list: 'list-disc list-inside text-gray-700 space-y-2 mb-4',
  numberedList: 'list-decimal list-inside text-gray-700 space-y-2 mb-4',
  table: 'w-full border-collapse my-4',
  tableHeader: 'bg-purple-50 text-left p-3 border border-gray-200 font-semibold',
  tableCell: 'p-3 border border-gray-200',
  highlight: 'bg-purple-50 p-4 rounded-lg border-l-4 border-purple-600',
  divider: 'border-t border-gray-200 my-8',
};

// HTML Generation helper
export function generateAgreementHTML(data: ServiceAgreementData): string {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} - ${data.agreementId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.75in;
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #7C3AED;
    }
    .header h1 {
      font-size: 20pt;
      color: #7C3AED;
      margin-bottom: 0.5rem;
    }
    .header .meta {
      font-size: 10pt;
      color: #666;
    }
    .section {
      margin-bottom: 1.5rem;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 0.75rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid #7C3AED;
    }
    .subsection-title {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }
    p {
      margin-bottom: 0.75rem;
      text-align: justify;
    }
    ul, ol {
      margin-left: 1.5rem;
      margin-bottom: 0.75rem;
    }
    li {
      margin-bottom: 0.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 11pt;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f3e8ff;
      font-weight: bold;
    }
    .highlight-box {
      background-color: #f3e8ff;
      border-left: 4px solid #7C3AED;
      padding: 1rem;
      margin: 1rem 0;
    }
    .signature-block {
      margin-top: 3rem;
      page-break-inside: avoid;
    }
    .signature-grid {
      display: table;
      width: 100%;
    }
    .signature-column {
      display: table-cell;
      width: 48%;
      padding-right: 2%;
    }
    .signature-line {
      border-bottom: 1px solid #1a1a1a;
      height: 2.5rem;
      margin-bottom: 0.25rem;
    }
    .signature-label {
      font-size: 10pt;
      color: #666;
    }
    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <div class="meta">
      Agreement ID: ${data.agreementId} | Version: ${data.version}<br>
      Effective Date: ${formatDate(data.effectiveDate)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. PARTIES TO THIS AGREEMENT</div>
    <p><strong>CLIENT:</strong></p>
    <p>${data.parties.client.name}<br>
    ${data.parties.client.address}<br>
    Contact: ${data.parties.client.contactName}<br>
    Email: ${data.parties.client.email}<br>
    Phone: ${data.parties.client.phone}</p>

    <p><strong>SERVICE PROVIDER:</strong></p>
    <p>${data.parties.provider.name}<br>
    ${data.parties.provider.address}<br>
    Contact: ${data.parties.provider.contactName}<br>
    Email: ${data.parties.provider.email}<br>
    Phone: ${data.parties.provider.phone}</p>
  </div>

  <div class="section">
    <div class="section-title">2. SERVICE SCOPE</div>
    <p><strong>Description of Services:</strong></p>
    <p>${data.serviceScope.description}</p>

    <p><strong>Deliverables:</strong></p>
    <ul>
      ${data.serviceScope.deliverables.map(d => `<li>${d}</li>`).join('\n      ')}
    </ul>

    <p><strong>Exclusions:</strong></p>
    <ul>
      ${data.serviceScope.exclusions.map(e => `<li>${e}</li>`).join('\n      ')}
    </ul>

    <p><strong>Assumptions:</strong></p>
    <ul>
      ${data.serviceScope.assumptions.map(a => `<li>${a}</li>`).join('\n      ')}
    </ul>
  </div>

  <div class="section">
    <div class="section-title">3. PRICING AND PAYMENT TERMS</div>
    <p><strong>Pricing Model:</strong> ${data.pricing.type.charAt(0).toUpperCase() + data.pricing.type.slice(1)}</p>
    <p><strong>Total Amount:</strong> ${formatCurrency(data.pricing.amount, data.pricing.currency)}</p>

    <p><strong>Payment Schedule:</strong></p>
    <table>
      <thead>
        <tr>
          <th>Milestone</th>
          <th>Percentage</th>
          <th>Due Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.pricing.paymentSchedule.map(p => `
        <tr>
          <td>${p.milestone}</td>
          <td>${p.percentage}%</td>
          <td>${formatDate(p.dueDate)}</td>
        </tr>
        `).join('\n        ')}
      </tbody>
    </table>
    ${data.pricing.additionalFees && data.pricing.additionalFees.length > 0 ? `
    <p><strong>Additional Fees:</strong></p>
    <ul>
      ${data.pricing.additionalFees.map(f => `<li>${f.description}: ${formatCurrency(f.amount, data.pricing.currency)}</li>`).join('\n      ')}
    </ul>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">4. TIMELINE AND DELIVERY</div>
    <p><strong>Project Start Date:</strong> ${formatDate(data.timeline.startDate)}</p>
    <p><strong>Estimated Completion Date:</strong> ${formatDate(data.timeline.estimatedEndDate)}</p>

    <p><strong>Key Milestones:</strong></p>
    <table>
      <thead>
        <tr>
          <th>Milestone</th>
          <th>Date</th>
          <th>Deliverables</th>
        </tr>
      </thead>
      <tbody>
        ${data.timeline.milestones.map(m => `
        <tr>
          <td>${m.name}</td>
          <td>${formatDate(m.date)}</td>
          <td>${m.deliverables.join(', ')}</td>
        </tr>
        `).join('\n        ')}
      </tbody>
    </table>

    <p><strong>Dependencies:</strong></p>
    <ul>
      ${data.timeline.dependencies.map(d => `<li>${d}</li>`).join('\n      ')}
    </ul>

    <p><strong>Revision Rounds Included:</strong> ${data.timeline.revisionRounds}</p>
  </div>

  <div class="section">
    <div class="section-title">5. WARRANTIES</div>
    <p><strong>Warranty Period:</strong> ${data.warranties.warrantyPeriod} days from final delivery</p>

    <p><strong>Coverage:</strong></p>
    <ul>
      ${data.warranties.coverage.map(c => `<li>${c}</li>`).join('\n      ')}
    </ul>

    <p><strong>Exclusions:</strong></p>
    <ul>
      ${data.warranties.exclusions.map(e => `<li>${e}</li>`).join('\n      ')}
    </ul>

    <p><strong>Remedy:</strong> ${data.warranties.remedy}</p>
  </div>

  <div class="section">
    <div class="section-title">6. TERMINATION</div>
    <p><strong>Notice Period:</strong> ${data.termination.terminationNoticeDays} days written notice required</p>

    <p><strong>Termination for Cause:</strong></p>
    <ul>
      ${data.termination.terminationForCause.map(t => `<li>${t.description} (${t.curePeriod} day cure period)</li>`).join('\n      ')}
    </ul>

    ${data.termination.terminationForConvenience.some(t => t.allowed) ? `
    <p><strong>Termination for Convenience:</strong></p>
    <ul>
      ${data.termination.terminationForConvenience.map(t => `<li>${t.allowed ? 'Allowed' : 'Not allowed'}: ${t.penalty.type === 'percentage' ? `${t.penalty.amount}% penalty` : formatCurrency(t.penalty.amount, data.pricing.currency) + ' penalty'}</li>`).join('\n      ')}
    </ul>
    ` : ''}

    <p><strong>Effect on Payment:</strong> ${data.termination.effectOnPayment}</p>
  </div>

  <div class="section">
    <div class="section-title">7. LIMITATION OF LIABILITY</div>
    <div class="highlight-box">
      <p><strong>Liability Cap:</strong> ${formatCurrency(data.liability.limitationOfLiability, data.pricing.currency)}</p>
      <p><strong>Consequential Damages Waiver:</strong> ${data.liability.consequentialDamagesWaiver ? 'Client waives right to seek consequential damages.' : 'Consequential damages not waived.'}</p>
    </div>

    ${data.liability.capExceptions.length > 0 ? `
    <p><strong>Exceptions to Liability Cap:</strong></p>
    <ul>
      ${data.liability.capExceptions.map(e => `<li>${e}</li>`).join('\n      ')}
    </ul>
    ` : ''}

    <p><strong>Insurance Requirements:</strong></p>
    <table>
      <thead>
        <tr>
          <th>Insurance Type</th>
          <th>Minimum Coverage</th>
        </tr>
      </thead>
      <tbody>
        ${data.liability.insuranceRequirements.map(i => `
        <tr>
          <td>${i.type}</td>
          <td>${formatCurrency(i.coverage, data.pricing.currency)}</td>
        </tr>
        `).join('\n        ')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">8. DISPUTE RESOLUTION</div>
    <p><strong>Governing Law:</strong> ${data.disputeResolution.governingLaw}</p>
    <p><strong>Jurisdiction:</strong> ${data.disputeResolution.jurisdiction}</p>
    <p><strong>Arbitration:</strong> ${data.disputeResolution.arbitrationClause ? 'Disputes shall be resolved through binding arbitration.' : 'No mandatory arbitration.'}</p>
    <p><strong>Mediation:</strong> ${data.disputeResolution.mediationRequired ? 'Mediation required before litigation.' : 'Mediation not required.'}</p>

    <p><strong>Escalation Procedure:</strong></p>
    <ol>
      ${data.disputeResolution.escalationProcedure.map(e => `<li>${e}</li>`).join('\n      ')}
    </ol>
  </div>

  ${data.confidentiality ? `
  <div class="section">
    <div class="section-title">9. CONFIDENTIALITY</div>
    <p><strong>Term:</strong> ${data.confidentiality.term} years from date of disclosure</p>
    <p><strong>Scope:</strong> ${data.confidentiality.scope}</p>
  </div>
  ` : ''}

  ${data.ipOwnership ? `
  <div class="section">
    <div class="section-title">10. INTELLECTUAL PROPERTY</div>
    <p><strong>Work Product Ownership:</strong> ${data.ipOwnership.workProduct}</p>
    <p><strong>Pre-existing IP:</strong> ${data.ipOwnership.preExistingIp}</p>
    <p><strong>License Grant:</strong> ${data.ipOwnership.licenseGrant}</p>
  </div>
  ` : ''}

  ${data.additionalTerms && data.additionalTerms.length > 0 ? `
  <div class="section">
    <div class="section-title">11. ADDITIONAL TERMS</div>
    ${data.additionalTerms.map(t => `
    <p><strong>${t.section}:</strong></p>
    <p>${t.content}</p>
    `).join('\n    ')}
  </div>
  ` : ''}

  <div class="signature-block">
    <div class="section-title">SIGNATURES</div>
    <p>By signing below, both parties agree to the terms and conditions outlined in this agreement.</p>

    <div class="signature-grid">
      <div class="signature-column">
        <p><strong>CLIENT</strong></p>
        <p>${data.parties.client.name}</p>
        <div class="signature-line"></div>
        <p class="signature-label">Signature</p>
        <div class="signature-line"></div>
        <p class="signature-label">Name: ${data.signatures.client.name}</p>
        <div class="signature-line"></div>
        <p class="signature-label">Title: ${data.signatures.client.title}</p>
        <div class="signature-line"></div>
        <p class="signature-label">Date: ${data.signatures.client.date}</p>
      </div>

      <div class="signature-column">
        <p><strong>SERVICE PROVIDER</strong></p>
        <p>${data.parties.provider.name}</p>
        <div class="signature-line"></div>
        <p class="signature-label">Signature</p>
        <div class="signature-line"></div>
        <p class="signature-label">Name: ${data.signatures.provider.name}</p>
        <div class="signature-line"></div>
        <p class="signature-label">Title: ${data.signatures.provider.title}</p>
        <div class="signature-line"></div>
        <p class="signature-label">Date: ${data.signatures.provider.date}</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>${data.title} | Agreement ID: ${data.agreementId} | Version ${data.version}</p>
    <p>Generated by NEXABIZZ Service Agreement System</p>
  </div>
</body>
</html>`;

  return html;
}

// Download handler
export function downloadAgreementHTML(data: ServiceAgreementData, filename?: string): void {
  const html = generateAgreementHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Service-Agreement-${data.agreementId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Preview component
interface ServiceAgreementPreviewProps {
  data: ServiceAgreementData;
  onDownload?: () => void;
}

export function ServiceAgreementPreview({ data, onDownload }: ServiceAgreementPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handleDownload = useCallback(() => {
    downloadAgreementHTML(data);
    onDownload?.();
  }, [data, onDownload]);

  const handlePrint = useCallback(() => {
    const html = generateAgreementHTML(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  }, [data]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Agreement Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-xl">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{data.title}</h2>
            <p className="text-purple-200">Agreement ID: {data.agreementId}</p>
            <p className="text-purple-200">Version: {data.version}</p>
            <p className="text-purple-200">
              Effective: {new Date(data.effectiveDate).toLocaleDateString()}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            data.agreementType === 'master' ? 'bg-purple-300 text-purple-900' :
            data.agreementType === 'project' ? 'bg-blue-300 text-blue-900' :
            data.agreementType === 'hourly' ? 'bg-green-300 text-green-900' :
            'bg-red-300 text-red-900'
          }`}>
            {data.agreementType.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="btn-secondary flex items-center gap-2"
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
        <button
          onClick={handleDownload}
          className="btn-primary flex items-center gap-2"
        >
          Download HTML
        </button>
        <button
          onClick={handlePrint}
          className="btn-secondary flex items-center gap-2"
        >
          Print Agreement
        </button>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Close Preview
            </button>
          </div>
          <iframe
            srcDoc={generateAgreementHTML(data)}
            className="w-full h-[600px] border border-gray-200 rounded-lg"
            title="Agreement Preview"
          />
        </div>
      )}

      {/* Agreement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Parties Card */}
        <div className="card p-4">
          <h4 className="font-semibold text-purple-600 mb-3">Parties</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Client:</span>
              <p className="text-gray-600">{data.parties.client.name}</p>
            </div>
            <div>
              <span className="font-medium">Provider:</span>
              <p className="text-gray-600">{data.parties.provider.name}</p>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="card p-4">
          <h4 className="font-semibold text-purple-600 mb-3">Pricing</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium capitalize">{data.pricing.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">
                {formatCurrency(data.pricing.amount, data.pricing.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Card */}
        <div className="card p-4">
          <h4 className="font-semibold text-purple-600 mb-3">Timeline</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Start:</span>{' '}
              {new Date(data.timeline.startDate).toLocaleDateString()}
            </div>
            <div>
              <span className="text-gray-600">End:</span>{' '}
              {new Date(data.timeline.estimatedEndDate).toLocaleDateString()}
            </div>
            <div>
              <span className="text-gray-600">Milestones:</span>{' '}
              {data.timeline.milestones.length}
            </div>
          </div>
        </div>

        {/* Warranty Card */}
        <div className="card p-4">
          <h4 className="font-semibold text-purple-600 mb-3">Warranty</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Period:</span>
              <span className="font-medium">{data.warranties.warrantyPeriod} days</span>
            </div>
            <div className="text-gray-600">
              {data.warranties.coverage.length} coverage items
            </div>
          </div>
        </div>

        {/* Termination Card */}
        <div className="card p-4">
          <h4 className="font-semibold text-purple-600 mb-3">Termination</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Notice:</span>
              <span className="font-medium">{data.termination.terminationNoticeDays} days</span>
            </div>
            <div className="text-gray-600">
              {data.termination.terminationForCause.length} cause clauses
            </div>
          </div>
        </div>

        {/* Liability Card */}
        <div className="card p-4">
          <h4 className="font-semibold text-purple-600 mb-3">Liability</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cap:</span>
              <span className="font-medium">
                {formatCurrency(data.liability.limitationOfLiability, data.pricing.currency)}
              </span>
            </div>
            <div className="text-gray-600">
              {data.liability.consequentialDamagesWaiver ? 'No consequential damages' : 'Consequential damages apply'}
            </div>
          </div>
        </div>
      </div>

      {/* Service Scope Summary */}
      <div className="card p-6">
        <h3 className="font-semibold text-lg mb-4">Service Scope</h3>
        <p className="text-gray-700 mb-4">{data.serviceScope.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Deliverables ({data.serviceScope.deliverables.length})</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.serviceScope.deliverables.slice(0, 3).map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  {d}
                </li>
              ))}
              {data.serviceScope.deliverables.length > 3 && (
                <li className="text-purple-600">+{data.serviceScope.deliverables.length - 3} more</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Exclusions ({data.serviceScope.exclusions.length})</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.serviceScope.exclusions.slice(0, 3).map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  {e}
                </li>
              ))}
              {data.serviceScope.exclusions.length > 3 && (
                <li className="text-red-500">+{data.serviceScope.exclusions.length - 3} more</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Assumptions ({data.serviceScope.assumptions.length})</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.serviceScope.assumptions.slice(0, 3).map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {a}
                </li>
              ))}
              {data.serviceScope.assumptions.length > 3 && (
                <li className="text-blue-500">+{data.serviceScope.assumptions.length - 3} more</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServiceAgreementPreview;
