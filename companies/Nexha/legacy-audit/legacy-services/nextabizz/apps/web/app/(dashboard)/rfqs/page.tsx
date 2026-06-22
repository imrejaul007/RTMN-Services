'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RFQ, RFQResponse, RFQStatus, CreateRFQInput } from '@nextabizz/shared-types';
import { track } from '@/lib/intentCaptureService';
import { getSession } from '@/lib/supabase';

const APP_TYPE = 'nextabizz-web';

type ViewTab = 'my-rfqs' | 'browse-open';

interface RFQStats {
  activeRFQs: number;
  quotesReceived: number;
  awarded: number;
}

// Status config matches DB enum: 'open', 'closed', 'awarded', 'cancelled', 'expired'
const statusConfig: Record<RFQStatus, { label: string; bg: string; text: string }> = {
  open: { label: 'Open', bg: 'bg-blue-100', text: 'text-blue-700' },
  closed: { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-700' },
  awarded: { label: 'Awarded', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' },
  expired: { label: 'Expired', bg: 'bg-orange-100', text: 'text-orange-700' },
};

// Mock data
const mockMyRFQs: RFQ[] = [
  {
    id: 'rfq-1',
    rfqNumber: 'RFQ-2024-001',
    merchantId: 'merchant-1',
    title: 'Bulk Turmeric Powder Supply',
    description: 'Need 50kg of premium quality turmeric powder for monthly supply',
    category: 'Spices',
    quantity: 50,
    unit: 'kg',
    targetPrice: 250,
    deliveryDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'closed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-2',
    rfqNumber: 'RFQ-2024-002',
    merchantId: 'merchant-1',
    title: 'Organic Coconut Oil',
    description: 'Looking for organic certified coconut oil for cooking',
    category: 'Oils',
    quantity: 100,
    unit: 'liters',
    targetPrice: 300,
    status: 'open',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-3',
    rfqNumber: 'RFQ-2024-003',
    merchantId: 'merchant-1',
    title: 'Premium Basmati Rice',
    description: 'Require aged basmati rice for restaurant use',
    category: 'Grains',
    quantity: 200,
    unit: 'kg',
    targetPrice: 100,
    status: 'awarded',
    awardedTo: 'sup-1',
    linkedPoId: 'po-4',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
];

const mockOpenRFQs: RFQ[] = [
  {
    id: 'rfq-4',
    rfqNumber: 'RFQ-2024-004',
    merchantId: 'merchant-2',
    title: 'Fresh Paneer Supply',
    description: 'Daily requirement of fresh paneer',
    category: 'Dairy',
    quantity: 30,
    unit: 'kg',
    targetPrice: 350,
    deliveryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'open',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-5',
    rfqNumber: 'RFQ-2024-005',
    merchantId: 'merchant-3',
    title: 'Industrial Cooking Gas',
    description: 'Bulk requirement of commercial cooking gas',
    category: 'Utilities',
    quantity: 500,
    unit: 'kg',
    targetPrice: 80,
    status: 'open',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const mockResponses: Record<string, RFQResponse[]> = {
  'rfq-1': [
    {
      id: 'resp-1',
      rfqId: 'rfq-1',
      supplierId: 'sup-2',
      unitPrice: 265,
      totalPrice: 13250,
      leadTimeDays: 5,
      notes: 'Can deliver within 5 days of order confirmation',
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'resp-2',
      rfqId: 'rfq-1',
      supplierId: 'sup-3',
      unitPrice: 255,
      totalPrice: 12750,
      leadTimeDays: 7,
      notes: 'Premium quality with organic certification',
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ],
};

const mockSuppliers: Record<string, string> = {
  'sup-1': 'Fresh Foods Distributors',
  'sup-2': 'Premium Spices Co.',
  'sup-3': 'Quality Provisions Ltd.',
};

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function RFQsPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('my-rfqs');
  const [myRFQs, setMyRFQs] = useState<RFQ[]>([]);
  const [openRFQs, setOpenRFQs] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create RFQ Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRFQInput>({
    merchantId: 'merchant-1',
    title: '',
    description: '',
    category: '',
    quantity: 1,
    unit: 'units',
    targetPrice: undefined,
    deliveryDeadline: undefined,
  });

  // Quote Comparison Modal
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState<RFQStats>({
    activeRFQs: 0,
    quotesReceived: 0,
    awarded: 0,
  });

  const fetchRFQs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      setMyRFQs(mockMyRFQs);
      setOpenRFQs(mockOpenRFQs);

      // Calculate stats
      setStats({
        activeRFQs: mockMyRFQs.filter(r => r.status === 'open').length,
        quotesReceived: Object.keys(mockResponses).reduce((sum, rfqId) => sum + (mockResponses[rfqId]?.length || 0), 0),
        awarded: mockMyRFQs.filter(r => r.status === 'awarded').length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RFQs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRFQs();
  }, [fetchRFQs]);

  const handleCreateRFQ = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const newRFQ: RFQ = {
        id: `rfq-${Date.now()}`,
        rfqNumber: `RFQ-2024-${String(mockMyRFQs.length + 4).padStart(3, '0')}`,
        merchantId: 'merchant-1',
        title: createForm.title,
        description: createForm.description,
        category: createForm.category,
        quantity: createForm.quantity,
        unit: createForm.unit,
        targetPrice: createForm.targetPrice,
        deliveryDeadline: createForm.deliveryDeadline,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setMyRFQs(prev => [newRFQ, ...prev]);

      // Track inquiry_sent intent when RFQ is successfully created
      const session = getSession();
      if (session?.merchantId) {
        track({
          userId: session.merchantId,
          event: 'inquiry_sent',
          appType: APP_TYPE,
          intentKey: newRFQ.id,
          properties: {
            rfqId: newRFQ.id,
            rfqNumber: newRFQ.rfqNumber,
            title: createForm.title,
            category: createForm.category,
            quantity: createForm.quantity,
            unit: createForm.unit,
            targetPrice: createForm.targetPrice,
          },
        });
      }

      setIsCreateModalOpen(false);
      setCreateForm({
        merchantId: 'merchant-1',
        title: '',
        description: '',
        category: '',
        quantity: 1,
        unit: 'units',
        targetPrice: undefined,
        deliveryDeadline: undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create RFQ');
    }
  };

  const handleCompareQuotes = (rfq: RFQ) => {
    setSelectedRFQ(rfq);
    setIsCompareModalOpen(true);
  };

  const handleAwardRFQ = (supplierId: string) => {
    if (!selectedRFQ) return;

    setMyRFQs(prev =>
      prev.map(rfq =>
        rfq.id === selectedRFQ.id
          ? { ...rfq, status: 'awarded' as RFQStatus, awardedTo: supplierId }
          : rfq
      )
    );
    setIsCompareModalOpen(false);
    setSelectedRFQ(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request for Quotes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Request quotes from suppliers and compare offers
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create RFQ
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active RFQs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeRFQs}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Quotes Received</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.quotesReceived}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Awarded</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.awarded}</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('my-rfqs')}
            className={`
              pb-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'my-rfqs'
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-500 hover:text-gray-700'}
            `}
          >
            My RFQs
          </button>
          <button
            onClick={() => setActiveTab('browse-open')}
            className={`
              pb-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'browse-open'
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-500 hover:text-gray-700'}
            `}
          >
            Browse Open RFQs
          </button>
        </nav>
      </div>

      {/* RFQ List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={fetchRFQs}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : activeTab === 'my-rfqs' ? (
        myRFQs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs yet</h3>
            <p className="text-gray-500 mb-6">Create your first request for quote to get started.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-2.5 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Create RFQ
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {myRFQs.map(rfq => (
              <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-[#7C3AED]">{rfq.rfqNumber}</span>
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${statusConfig[rfq.status].bg} ${statusConfig[rfq.status].text}
                      `}>
                        {statusConfig[rfq.status].label}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{rfq.title}</h3>
                    {rfq.description && (
                      <p className="text-sm text-gray-500 mb-3">{rfq.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantity:</span>{' '}
                        <span className="font-medium">{rfq.quantity} {rfq.unit}</span>
                      </div>
                      {rfq.targetPrice && (
                        <div>
                          <span className="text-gray-500">Target Price:</span>{' '}
                          <span className="font-medium">₹{rfq.targetPrice}/{rfq.unit}</span>
                        </div>
                      )}
                      {rfq.deliveryDeadline && (
                        <div>
                          <span className="text-gray-500">Delivery By:</span>{' '}
                          <span className="font-medium">{formatDate(rfq.deliveryDeadline)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(rfq.status === 'closed') && (
                      <button
                        onClick={() => handleCompareQuotes(rfq)}
                        className="px-4 py-2 bg-[#7C3AED] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
                      >
                        Compare Quotes ({mockResponses[rfq.id]?.length || 0})
                      </button>
                    )}
                    {rfq.status === 'awarded' && rfq.linkedPoId && (
                      <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg">
                        PO Created
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        openRFQs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No open RFQs available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {openRFQs.map(rfq => (
              <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-700">{rfq.rfqNumber}</span>
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${statusConfig[rfq.status].bg} ${statusConfig[rfq.status].text}
                      `}>
                        {statusConfig[rfq.status].label}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{rfq.title}</h3>
                    {rfq.description && (
                      <p className="text-sm text-gray-500 mb-3">{rfq.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantity:</span>{' '}
                        <span className="font-medium">{rfq.quantity} {rfq.unit}</span>
                      </div>
                      {rfq.targetPrice && (
                        <div>
                          <span className="text-gray-500">Target Price:</span>{' '}
                          <span className="font-medium">₹{rfq.targetPrice}/{rfq.unit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="px-4 py-2 border border-[#7C3AED] text-[#7C3AED] text-sm font-medium rounded-lg hover:bg-[#7C3AED]/5 transition-colors">
                    Submit Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create RFQ Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsCreateModalOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Create RFQ</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="e.g., Bulk Spices Supply"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Describe your requirements..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={createForm.quantity}
                      onChange={e => setCreateForm({ ...createForm, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.unit}
                      onChange={e => setCreateForm({ ...createForm, unit: e.target.value })}
                      placeholder="e.g., kg, liters"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={createForm.category}
                    onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="Spices">Spices</option>
                    <option value="Grains">Grains</option>
                    <option value="Oils">Oils</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Price (per unit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.targetPrice || ''}
                      onChange={e => setCreateForm({ ...createForm, targetPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Deadline
                    </label>
                    <input
                      type="date"
                      value={createForm.deliveryDeadline ? new Date(createForm.deliveryDeadline).toISOString().split('T')[0] : ''}
                      onChange={e => setCreateForm({ ...createForm, deliveryDeadline: e.target.value ? new Date(e.target.value) : undefined })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRFQ}
                  disabled={!createForm.title || !createForm.quantity}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create RFQ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quote Comparison Modal */}
      {isCompareModalOpen && selectedRFQ && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsCompareModalOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Compare Quotes</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedRFQ.title}</p>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Supplier</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Unit Price</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Lead Time</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Notes</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(mockResponses[selectedRFQ.id] || []).map(response => (
                        <tr key={response.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4 font-medium text-gray-900">
                            {mockSuppliers[response.supplierId] || 'Unknown Supplier'}
                          </td>
                          <td className="py-4 px-4 text-right text-gray-900">
                            ₹{response.unitPrice}
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-gray-900">
                            ₹{response.totalPrice.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-4 text-right text-gray-600">
                            {response.leadTimeDays} days
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-500 max-w-xs truncate">
                            {response.notes || '-'}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleAwardRFQ(response.supplierId)}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Award
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex items-center justify-end p-6 border-t border-gray-100">
                <button
                  onClick={() => setIsCompareModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
