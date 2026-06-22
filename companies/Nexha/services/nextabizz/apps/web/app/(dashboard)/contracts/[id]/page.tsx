import { logger } from '../../shared/logger';
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ServiceContract, ContractStatus, ContractTerms } from '@nextabizz/shared-types';

// ============================================
// Types
// ============================================

interface ContractTermsState extends ContractTerms {
  paymentTerms: string;
  deliveryTerms: string;
  terminationTerms: string;
}

// ============================================
// Constants
// ============================================

const statusConfig: Record<ContractStatus, { label: string; bg: string; text: string; border: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  expired: { label: 'Expired', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  terminated: { label: 'Terminated', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

const renewalTypeLabels: Record<string, string> = {
  manual: 'Manual Renewal',
  auto_renew: 'Auto-Renewal',
  evergreen: 'Evergreen',
};

// ============================================
// Mock Data
// ============================================

const mockContract: ServiceContract = {
  id: 'contract-1',
  contractNumber: 'CTR-2024-001',
  title: 'Monthly Cleaning Services',
  description: 'Regular cleaning services for office premises including daily janitorial work, weekly deep cleaning, and monthly specialized treatments.',
  merchantId: 'merchant-1',
  supplierId: 'supplier-1',
  merchantName: 'ABC Restaurant',
  supplierName: 'CleanPro Services',
  terms: {
    paymentTerms: 'Net 30 days from invoice date. Payment to be made via bank transfer.',
    deliveryTerms: 'Services provided daily (Mon-Sat) between 6 AM - 9 AM. Weekly deep cleaning on Sundays.',
    warrantyTerms: 'Service warranty covers re-cleaning within 24 hours if quality standards are not met.',
    penaltyTerms: 'Late payment penalty: 1.5% per month on outstanding amount. Late delivery penalty: 5% refund per day of delay beyond agreed schedule.',
    terminationTerms: 'Either party may terminate with 30 days written notice. Immediate termination allowed in case of material breach.',
    confidentialityTerms: 'Both parties agree to maintain strict confidentiality of business information and processes.',
  },
  totalValue: 120000,
  currency: 'INR',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  signedDate: new Date('2024-01-01'),
  renewalType: 'auto_renew',
  renewalPeriodMonths: 12,
  autoRenewalNoticeDays: 30,
  status: 'active',
  sourceType: 'manual',
  attachments: [
    {
      id: 'att-1',
      contractId: 'contract-1',
      name: 'Service Agreement.pdf',
      fileUrl: '/attachments/contract-1/service-agreement.pdf',
      fileType: 'application/pdf',
      fileSize: 245760,
      uploadedAt: new Date('2024-01-01'),
    },
    {
      id: 'att-2',
      contractId: 'contract-1',
      name: 'Scope of Work.pdf',
      fileUrl: '/attachments/contract-1/scope-of-work.pdf',
      fileType: 'application/pdf',
      fileSize: 128000,
      uploadedAt: new Date('2024-01-01'),
    },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  createdBy: 'merchant-1',
};

// ============================================
// Utility Functions
// ============================================

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDaysUntilExpiry(endDate: Date): number {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// Icons
// ============================================

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const FileTextIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PrintIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

// ============================================
// Components
// ============================================

function TermCard({ title, content, editable }: { title: string; content: string; editable?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        {editable && (
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <EditIcon />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const baseClasses = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    primary: 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [contract, setContract] = useState<ServiceContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'terms' | 'attachments'>('details');
  const [showActions, setShowActions] = useState(false);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/service-contracts?action=get&id=${contractId}`);
      const result = await response.json();

      if (result.success) {
        setContract(result.data);
      }
    } catch (error) {
      logger.error('Failed to fetch contract:', error);
      // Use mock data for demo
      setContract(mockContract);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleActivate = async () => {
    if (!contract) return;

    try {
      const response = await fetch('/api/service-contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contract.id, action: 'activate' }),
      });

      if (response.ok) {
        fetchContract();
      }
    } catch (error) {
      logger.error('Failed to activate contract:', error);
    }
  };

  const handleTerminate = async () => {
    if (!contract) return;
    if (!confirm('Are you sure you want to terminate this contract?')) return;

    try {
      const response = await fetch('/api/service-contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contract.id, action: 'terminate' }),
      });

      if (response.ok) {
        fetchContract();
      }
    } catch (error) {
      logger.error('Failed to terminate contract:', error);
    }
  };

  const handleRenew = async () => {
    if (!contract) return;

    try {
      const response = await fetch('/api/service-contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contract.id, action: 'renew' }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          router.push(`/contracts/${result.data.id}`);
        }
      }
    } catch (error) {
      logger.error('Failed to renew contract:', error);
    }
  };

  const handleGeneratePDF = async () => {
    if (!contract) return;

    try {
      const response = await fetch(`/api/service-contracts?action=generate-pdf&id=${contract.id}`);
      const result = await response.json();

      if (result.success) {
        // In production, this would trigger PDF download
        alert('PDF generation triggered. Check console for data.');
        logger.info('PDF Data:', result.data);
      }
    } catch (error) {
      logger.error('Failed to generate PDF:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Contract not found</h2>
        <Link href="/contracts" className="text-[#7C3AED] hover:underline mt-2 inline-block">
          Back to contracts
        </Link>
      </div>
    );
  }

  const config = statusConfig[contract.status];
  const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
  const isExpiringSoon = contract.status === 'active' && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <Link href="/contracts" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeftIcon />
            Back to Contracts
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
              {config.label}
            </span>
            {contract.renewalType === 'auto_renew' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                <RefreshIcon />
                {renewalTypeLabels[contract.renewalType]}
              </span>
            )}
          </div>
          <p className="text-gray-500">
            {contract.contractNumber} &bull; Created {formatDate(contract.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton onClick={handleGeneratePDF} variant="secondary">
            <PrintIcon />
            Generate PDF
          </ActionButton>

          {contract.status === 'draft' && (
            <ActionButton onClick={handleActivate} variant="primary">
              <CheckIcon />
              Activate Contract
            </ActionButton>
          )}

          {contract.status === 'active' && (
            <>
              <ActionButton onClick={handleRenew} variant="secondary">
                <RefreshIcon />
                Renew Contract
              </ActionButton>
              <ActionButton onClick={handleTerminate} variant="danger">
                <TrashIcon />
                Terminate
              </ActionButton>
            </>
          )}

          {contract.status === 'expired' && (
            <ActionButton onClick={handleRenew} variant="primary">
              <RefreshIcon />
              Create Renewal
            </ActionButton>
          )}
        </div>
      </div>

      {/* Expiry Warning */}
      {isExpiringSoon && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertIcon />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-800">Contract Expiring Soon</p>
            <p className="text-sm text-amber-600">
              This contract will expire in {daysUntilExpiry} days ({formatDate(contract.endDate)})
            </p>
          </div>
          {contract.renewalType === 'auto_renew' && (
            <span className="text-sm text-amber-700">
              Auto-renewal will trigger {contract.autoRenewalNoticeDays} days before expiry
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['details', 'terms', 'attachments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#7C3AED] text-[#7C3AED]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'attachments' && contract.attachments.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {contract.attachments.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {contract.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900">{contract.description}</p>
              </div>
            )}

            {/* Parties */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Contract Parties</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <UserIcon />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Client</p>
                      <p className="font-medium text-gray-900">{contract.merchantName}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <UserIcon />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Service Provider</p>
                      <p className="font-medium text-gray-900">{contract.supplierName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Key Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500">Contract Value</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {contract.totalValue > 0 ? formatCurrency(contract.totalValue, contract.currency) : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Source</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {contract.sourceType === 'quote' ? 'Converted from Quote' : 'Manual Entry'}
                    {contract.templateName && ` - ${contract.templateName}`}
                  </p>
                </div>
                {contract.signedDate && (
                  <div>
                    <p className="text-xs text-gray-500">Signed Date</p>
                    <p className="font-medium text-gray-900">{formatDate(contract.signedDate)}</p>
                  </div>
                )}
                {contract.renewalPeriodMonths && (
                  <div>
                    <p className="text-xs text-gray-500">Renewal Period</p>
                    <p className="font-medium text-gray-900">{contract.renewalPeriodMonths} months</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Duration Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Contract Duration</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CalendarIcon />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-900">{formatDate(contract.startDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CalendarIcon />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="font-medium text-gray-900">{formatDate(contract.endDate)}</p>
                  </div>
                </div>
                {contract.status === 'active' && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Duration Progress</span>
                      <span className="text-xs text-gray-500">{daysUntilExpiry} days remaining</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#7C3AED] h-2 rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, 100 - (daysUntilExpiry / 365) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Renewal Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Renewal Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Renewal Type</span>
                  <span className="text-sm font-medium text-gray-900">
                    {renewalTypeLabels[contract.renewalType]}
                  </span>
                </div>
                {contract.autoRenewalNoticeDays && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Notice Period</span>
                    <span className="text-sm font-medium text-gray-900">
                      {contract.autoRenewalNoticeDays} days
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <DocumentIcon />
                  <span className="text-sm">View Quote</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <FileTextIcon />
                  <span className="text-sm">Create Amendment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'terms' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
            <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[#7C3AED] hover:bg-purple-50 rounded-lg">
              <EditIcon />
              Edit Terms
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TermCard title="Payment Terms" content={contract.terms.paymentTerms} />
            <TermCard title="Delivery Terms" content={contract.terms.deliveryTerms} />
            <TermCard title="Termination Terms" content={contract.terms.terminationTerms} />
            {contract.terms.warrantyTerms && (
              <TermCard title="Warranty Terms" content={contract.terms.warrantyTerms} />
            )}
            {contract.terms.penaltyTerms && (
              <TermCard title="Penalty Terms" content={contract.terms.penaltyTerms} />
            )}
            {contract.terms.confidentialityTerms && (
              <TermCard title="Confidentiality" content={contract.terms.confidentialityTerms} />
            )}
          </div>
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-sm rounded-lg hover:bg-[#6D28D9]">
              <UploadIcon />
              Upload File
            </button>
          </div>

          {contract.attachments.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentIcon />
              </div>
              <p className="text-gray-500 mb-4">No attachments yet</p>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-[#7C3AED] hover:bg-purple-50 rounded-lg">
                <UploadIcon />
                Upload your first file
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {contract.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <DocumentIcon />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{attachment.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)} &bull; Uploaded {formatDate(attachment.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                    <DownloadIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
