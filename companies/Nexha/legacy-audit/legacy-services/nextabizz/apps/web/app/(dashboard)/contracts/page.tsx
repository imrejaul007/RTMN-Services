import { logger } from '../../shared/logger';
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ServiceContract, ContractStatus, ContractTemplate, ContractTerms } from '@nextabizz/shared-types';
import { getSession } from '@/lib/supabase';

// ============================================
// Types
// ============================================

interface ContractStats {
  total: number;
  active: number;
  draft: number;
  expired: number;
  terminated: number;
  totalValue: number;
  expiringIn30Days: number;
}

type ViewTab = 'all' | 'active' | 'draft' | 'expired' | 'terminated';

// ============================================
// Constants
// ============================================

const statusConfig: Record<ContractStatus, { label: string; bg: string; text: string; icon: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', icon: '○' },
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700', icon: '●' },
  expired: { label: 'Expired', bg: 'bg-orange-100', text: 'text-orange-700', icon: '◐' },
  terminated: { label: 'Terminated', bg: 'bg-red-100', text: 'text-red-700', icon: '○' },
};

const renewalTypeLabels: Record<string, string> = {
  manual: 'Manual Renewal',
  auto_renew: 'Auto-Renewal',
  evergreen: 'Evergreen',
};

// ============================================
// Mock Data
// ============================================

const mockContracts: ServiceContract[] = [
  {
    id: 'contract-1',
    contractNumber: 'CTR-2024-001',
    title: 'Monthly Cleaning Services',
    description: 'Regular cleaning services for office premises',
    merchantId: 'merchant-1',
    supplierId: 'supplier-1',
    merchantName: 'ABC Restaurant',
    supplierName: 'CleanPro Services',
    terms: {
      paymentTerms: 'Net 30 days from invoice',
      deliveryTerms: 'Services provided monthly on agreed schedule',
      terminationTerms: '30 days written notice required',
      warrantyTerms: 'Standard service warranty',
    },
    totalValue: 120000,
    currency: 'INR',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    renewalType: 'auto_renew',
    renewalPeriodMonths: 12,
    status: 'active',
    sourceType: 'manual',
    attachments: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'merchant-1',
  },
  {
    id: 'contract-2',
    contractNumber: 'CTR-2024-002',
    title: 'IT Support Agreement',
    description: '24/7 IT support and maintenance',
    merchantId: 'merchant-1',
    supplierId: 'supplier-2',
    merchantName: 'ABC Restaurant',
    supplierName: 'TechFix Solutions',
    terms: {
      paymentTerms: 'Monthly advance payment',
      deliveryTerms: 'Remote and on-site support as needed',
      terminationTerms: '60 days written notice',
    },
    totalValue: 240000,
    currency: 'INR',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2025-02-28'),
    renewalType: 'auto_renew',
    renewalPeriodMonths: 12,
    status: 'active',
    sourceType: 'quote',
    sourceId: 'quote-1',
    attachments: [],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    createdBy: 'merchant-1',
  },
  {
    id: 'contract-3',
    contractNumber: 'CTR-2024-003',
    title: 'Pest Control Services',
    description: 'Quarterly pest control treatment',
    merchantId: 'merchant-1',
    supplierId: 'supplier-3',
    merchantName: 'ABC Restaurant',
    supplierName: 'SafeGuard Pest Control',
    terms: {
      paymentTerms: 'Per visit payment within 15 days',
      deliveryTerms: 'Quarterly visits scheduled in advance',
      terminationTerms: '15 days notice',
    },
    totalValue: 48000,
    currency: 'INR',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-05-15'),
    renewalType: 'manual',
    status: 'expired',
    sourceType: 'manual',
    attachments: [],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-05-15'),
    createdBy: 'merchant-1',
  },
  {
    id: 'contract-4',
    contractNumber: 'CTR-2024-004',
    title: 'Catering Equipment Maintenance',
    description: 'Preventive maintenance for kitchen equipment',
    merchantId: 'merchant-1',
    supplierId: 'supplier-4',
    merchantName: 'ABC Restaurant',
    supplierName: 'KitchenCare Pvt Ltd',
    terms: {
      paymentTerms: 'Net 45 days',
      deliveryTerms: 'Scheduled maintenance visits',
      terminationTerms: '30 days notice',
    },
    totalValue: 0,
    currency: 'INR',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-15'),
    renewalType: 'manual',
    status: 'draft',
    sourceType: 'manual',
    templateId: 'template-1',
    templateName: 'Standard Service Agreement',
    attachments: [],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    createdBy: 'merchant-1',
  },
  {
    id: 'contract-5',
    contractNumber: 'CTR-2024-005',
    title: 'Security Services',
    description: 'On-site security guard services',
    merchantId: 'merchant-1',
    supplierId: 'supplier-5',
    merchantName: 'ABC Restaurant',
    supplierName: 'SecureLife Guards',
    terms: {
      paymentTerms: 'Monthly advance',
      deliveryTerms: '24/7 on-site security',
      terminationTerms: '30 days notice with penalty clause',
    },
    totalValue: 360000,
    currency: 'INR',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-15'),
    renewalType: 'manual',
    status: 'terminated',
    sourceType: 'manual',
    attachments: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-03-15'),
    createdBy: 'merchant-1',
  },
];

const mockTemplates: ContractTemplate[] = [
  {
    id: 'template-1',
    name: 'Standard Service Agreement',
    description: 'Default template for recurring service contracts',
    content: '',
    terms: {
      paymentTerms: 'Net 30 days from invoice date',
      deliveryTerms: 'Delivery within 7 business days',
      terminationTerms: 'Either party may terminate with 30 days notice',
    },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-2',
    name: 'Monthly Retainer Contract',
    description: 'Template for monthly retainer services',
    content: '',
    terms: {
      paymentTerms: 'Monthly advance payment',
      deliveryTerms: 'Services as per schedule',
      terminationTerms: '30 days notice',
    },
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ============================================
// Utility Functions
// ============================================

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
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

function getDaysUntilExpiry(endDate: Date): number {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// Icons
// ============================================

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const FileTextIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// ============================================
// Components
// ============================================

function StatCard({ title, value, subtext, icon, highlight }: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl p-4 border ${highlight ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-semibold mt-1 ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>
            {value}
          </p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${highlight ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function CreateContractModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    supplierId: '',
    supplierName: '',
    totalValue: 0,
    currency: 'INR',
    startDate: '',
    endDate: '',
    renewalType: 'manual',
    renewalPeriodMonths: 12,
    templateId: '',
    paymentTerms: '',
    deliveryTerms: '',
    terminationTerms: '',
  });

  const handleSubmit = async () => {
    const terms: ContractTerms = {
      paymentTerms: formData.paymentTerms || 'Net 30 days',
      deliveryTerms: formData.deliveryTerms || 'As per schedule',
      terminationTerms: formData.terminationTerms || '30 days notice',
    };

    const payload = {
      action: 'create-manual',
      merchantId: 'merchant-1',
      ...formData,
      terms,
      createdBy: 'merchant-1',
    };

    try {
      const response = await fetch('/api/service-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      logger.error('Failed to create contract:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">Create New Contract</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s ? 'bg-[#7C3AED] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-0.5 ${step > s ? 'bg-[#7C3AED]' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Basic Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    placeholder="e.g., Monthly Cleaning Services"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    placeholder="Brief description of the contract..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Value (INR)</label>
                    <input
                      type="number"
                      value={formData.totalValue}
                      onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Template</label>
                    <select
                      value={formData.templateId}
                      onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    >
                      <option value="">Select template...</option>
                      {mockTemplates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Contract Duration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Type</label>
                    <select
                      value={formData.renewalType}
                      onChange={(e) => setFormData({ ...formData, renewalType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    >
                      <option value="manual">Manual Renewal</option>
                      <option value="auto_renew">Auto-Renewal</option>
                      <option value="evergreen">Evergreen</option>
                    </select>
                  </div>
                  {formData.renewalType === 'auto_renew' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Period (Months)</label>
                      <input
                        type="number"
                        value={formData.renewalPeriodMonths}
                        onChange={(e) => setFormData({ ...formData, renewalPeriodMonths: parseInt(e.target.value) || 12 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Terms & Conditions</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    placeholder="e.g., Net 30 days from invoice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Terms</label>
                  <input
                    type="text"
                    value={formData.deliveryTerms}
                    onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    placeholder="e.g., Monthly on agreed schedule"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Termination Terms</label>
                  <input
                    type="text"
                    value={formData.terminationTerms}
                    onChange={(e) => setFormData({ ...formData, terminationTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    placeholder="e.g., 30 days written notice"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 text-white bg-[#7C3AED] rounded-lg hover:bg-[#6D28D9]"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-white bg-[#7C3AED] rounded-lg hover:bg-[#6D28D9]"
              >
                Create Contract
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [session, setSession] = useState<{ merchantId: string } | null>(null);

  useEffect(() => {
    const currentSession = getSession();
    if (currentSession) {
      setSession({ merchantId: currentSession.merchantId });
    }
  }, []);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (session?.merchantId) params.set('merchantId', session.merchantId);
      if (activeTab !== 'all') params.set('status', activeTab);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/service-contracts?${params}`);
      const result = await response.json();

      if (result.success) {
        setContracts(result.data.items);
      }
    } catch (error) {
      logger.error('Failed to fetch contracts:', error);
      // Use mock data for demo
      setContracts(mockContracts);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, session?.merchantId]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (session?.merchantId) params.set('merchantId', session.merchantId);

      const response = await fetch(`/api/service-contracts?action=stats&${params}`);
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      logger.error('Failed to fetch stats:', error);
      // Use mock stats for demo
      setStats({
        total: mockContracts.length,
        active: mockContracts.filter((c) => c.status === 'active').length,
        draft: mockContracts.filter((c) => c.status === 'draft').length,
        expired: mockContracts.filter((c) => c.status === 'expired').length,
        terminated: mockContracts.filter((c) => c.status === 'terminated').length,
        totalValue: mockContracts.reduce((sum, c) => sum + c.totalValue, 0),
        expiringIn30Days: mockContracts.filter((c) => {
          const days = getDaysUntilExpiry(c.endDate);
          return c.status === 'active' && days > 0 && days <= 30;
        }).length,
      });
    }
  }, [session?.merchantId]);

  useEffect(() => {
    if (session?.merchantId) {
      fetchContracts();
      fetchStats();
    } else {
      // Load mock data for demo
      setContracts(mockContracts);
      setStats({
        total: mockContracts.length,
        active: mockContracts.filter((c) => c.status === 'active').length,
        draft: mockContracts.filter((c) => c.status === 'draft').length,
        expired: mockContracts.filter((c) => c.status === 'expired').length,
        terminated: mockContracts.filter((c) => c.status === 'terminated').length,
        totalValue: mockContracts.reduce((sum, c) => sum + c.totalValue, 0),
        expiringIn30Days: mockContracts.filter((c) => {
          const days = getDaysUntilExpiry(c.endDate);
          return c.status === 'active' && days > 0 && days <= 30;
        }).length,
      });
      setLoading(false);
    }
  }, [fetchContracts, fetchStats, session?.merchantId]);

  const tabs: { key: ViewTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All Contracts' },
    { key: 'active', label: 'Active' },
    { key: 'draft', label: 'Drafts' },
    { key: 'expired', label: 'Expired' },
    { key: 'terminated', label: 'Terminated' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Contracts</h1>
          <p className="text-gray-500 mt-1">Manage your service agreements and contracts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors"
        >
          <PlusIcon />
          New Contract
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Contracts"
            value={stats.total}
            subtext={`${formatCurrency(stats.totalValue)} total value`}
            icon={<DocumentIcon />}
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={<span className="w-3 h-3 rounded-full bg-green-500" />}
          />
          <StatCard
            title="Drafts"
            value={stats.draft}
            icon={<span className="w-3 h-3 rounded-full bg-gray-400" />}
          />
          <StatCard
            title="Expiring Soon"
            value={stats.expiringIn30Days}
            subtext="Within 30 days"
            icon={<AlertIcon />}
            highlight={stats.expiringIn30Days > 0}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md ml-auto">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentIcon />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Get started by creating your first service contract'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9]"
            >
              <PlusIcon />
              Create Contract
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const config = statusConfig[contract.status];
            const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
            const isExpiringSoon = contract.status === 'active' && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

            return (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-[#7C3AED] hover:shadow-md transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {contract.title}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                          <span>{config.icon}</span>
                          {config.label}
                        </span>
                        {contract.renewalType === 'auto_renew' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            <RefreshIcon />
                            Auto-Renew
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mb-3">
                        {contract.contractNumber} &bull; {contract.supplierName}
                      </p>

                      {contract.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {contract.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <CalendarIcon />
                          <span>{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</span>
                        </div>
                        {contract.totalValue > 0 && (
                          <span className="font-medium text-gray-900">
                            {formatCurrency(contract.totalValue, contract.currency)}
                          </span>
                        )}
                        {contract.templateName && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <FileTextIcon />
                            {contract.templateName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {isExpiringSoon && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                          <AlertIcon />
                          {daysUntilExpiry} days left
                        </span>
                      )}
                      {contract.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                          <DownloadIcon />
                          {contract.attachments.length} files
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Contract Modal */}
      <CreateContractModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchContracts}
      />
    </div>
  );
}
