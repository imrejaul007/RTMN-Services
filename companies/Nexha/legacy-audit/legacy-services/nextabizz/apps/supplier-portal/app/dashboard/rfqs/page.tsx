import { logger } from '../../shared/logger';
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description?: string;
  merchantId: string;
  merchantName: string;
  category?: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  deliveryDeadline?: string;
  status: 'open' | 'quoted' | 'awarded' | 'cancelled';
  awardedTo?: string;
  createdAt: string;
  expiresAt: string;
}

interface Quote {
  id: string;
  rfqId: string;
  supplierId: string;
  unitPrice: number;
  totalPrice: number;
  leadTimeDays?: number;
  notes?: string;
  submittedAt: string;
  isAwarded?: boolean;
}

const mockRFQs: RFQ[] = [
  {
    id: '1',
    rfqNumber: 'RFQ-2024-000089',
    title: 'Organic Basmati Rice - Premium Grade',
    description: 'Looking for organic certified basmati rice for our restaurant chain. Need consistent quality for biryani preparation.',
    merchantId: 'm1',
    merchantName: 'Spice Garden Restaurant',
    category: 'Grains & Rice',
    quantity: 500,
    unit: 'kg',
    targetPrice: 85,
    deliveryDeadline: '2024-02-15',
    status: 'open',
    createdAt: '2024-01-15T10:30:00Z',
    expiresAt: '2024-01-25T23:59:59Z',
  },
  {
    id: '2',
    rfqNumber: 'RFQ-2024-000088',
    title: 'Cold Pressed Mustard Oil - First Grade',
    description: 'Premium quality cold pressed mustard oil required for pickles and cooking.',
    merchantId: 'm2',
    merchantName: 'Hotel Sunrise',
    category: 'Oils & Ghee',
    quantity: 100,
    unit: 'liters',
    targetPrice: 180,
    deliveryDeadline: '2024-02-01',
    status: 'open',
    createdAt: '2024-01-14T14:20:00Z',
    expiresAt: '2024-01-28T23:59:59Z',
  },
  {
    id: '3',
    rfqNumber: 'RFQ-2024-000087',
    title: 'Fresh Green Peas - Frozen IQF',
    description: 'IQF frozen green peas, uniform size, bright green color.',
    merchantId: 'm3',
    merchantName: 'Cafe Mocha',
    category: 'Frozen Vegetables',
    quantity: 200,
    unit: 'kg',
    deliveryDeadline: '2024-02-10',
    status: 'open',
    createdAt: '2024-01-13T09:15:00Z',
    expiresAt: '2024-01-30T23:59:59Z',
  },
  {
    id: '4',
    rfqNumber: 'RFQ-2024-000086',
    title: 'Organic Turmeric Powder - Haldi',
    description: 'Organic certified turmeric powder with high curcumin content.',
    merchantId: 'm4',
    merchantName: 'Taj Banquet Hall',
    category: 'Spices',
    quantity: 50,
    unit: 'kg',
    targetPrice: 320,
    deliveryDeadline: '2024-01-25',
    status: 'quoted',
    createdAt: '2024-01-10T16:45:00Z',
    expiresAt: '2024-01-20T23:59:59Z',
  },
  {
    id: '5',
    rfqNumber: 'RFQ-2024-000085',
    title: 'Whole Wheat Atta - Stone Ground',
    description: 'Traditional stone ground wheat flour for making chapatis.',
    merchantId: 'm5',
    merchantName: 'Urban Kitchen',
    category: 'Flours',
    quantity: 1000,
    unit: 'kg',
    targetPrice: 42,
    deliveryDeadline: '2024-02-05',
    status: 'awarded',
    awardedTo: 's1',
    createdAt: '2024-01-08T11:00:00Z',
    expiresAt: '2024-01-18T23:59:59Z',
  },
];

const mockMyQuotes: Quote[] = [
  {
    id: 'q1',
    rfqId: '4',
    supplierId: 's1',
    unitPrice: 310,
    totalPrice: 15500,
    leadTimeDays: 3,
    notes: 'Organic certified, can deliver within 3 days of order confirmation.',
    submittedAt: '2024-01-12T14:30:00Z',
    isAwarded: false,
  },
  {
    id: 'q2',
    rfqId: '5',
    supplierId: 's1',
    unitPrice: 40,
    totalPrice: 40000,
    leadTimeDays: 2,
    notes: 'Freshly ground, best quality wheat.',
    submittedAt: '2024-01-10T15:00:00Z',
    isAwarded: true,
  },
];

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  quoted: 'bg-yellow-100 text-yellow-800',
  awarded: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  quoted: 'Quote Submitted',
  awarded: 'Awarded',
  cancelled: 'Cancelled',
};

export default function RFQsPage() {
  const [rfqs] = useState<RFQ[]>(mockRFQs);
  const [myQuotes] = useState<Quote[]>(mockMyQuotes);
  const [activeTab, setActiveTab] = useState<'open' | 'my-quotes'>('open');
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    unitPrice: '',
    quantity: '',
    leadTimeDays: '',
    notes: '',
  });

  const openRFQs = rfqs.filter(r => r.status === 'open');
  const quotedRFQs = rfqs.filter(r => r.status === 'quoted' || r.status === 'awarded');

  const handleSubmitQuote = (rfqId: string) => {
    const rfq = rfqs.find(r => r.id === rfqId);
    if (!rfq) return;

    const unitPrice = parseFloat(quoteForm.unitPrice);
    const quantity = parseFloat(quoteForm.quantity) || rfq.quantity;
    const totalPrice = unitPrice * quantity;

    logger.info('Submitting quote:', {
      rfqId,
      unitPrice,
      quantity,
      totalPrice,
      leadTimeDays: quoteForm.leadTimeDays,
      notes: quoteForm.notes,
    });

    setShowQuoteModal(false);
    setSelectedRFQ(null);
    setQuoteForm({ unitPrice: '', quantity: '', leadTimeDays: '', notes: '' });
  };

  const getRFQById = (rfqId: string) => rfqs.find(r => r.id === rfqId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">NB</span>
                </div>
                <span className="text-xl font-bold text-gray-900">NextaBizz</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">FS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/orders" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Orders
            </Link>
            <Link href="/dashboard/products" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Products
            </Link>
            <Link href="/dashboard/rfqs" className="border-b-2 border-purple-600 text-purple-600 py-4 px-1 text-sm font-medium">
              RFQs
            </Link>
            <Link href="/dashboard/performance" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Performance
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">RFQ Responses</h1>
          <p className="mt-1 text-sm text-gray-600">Respond to requests for quotes from merchants</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('open')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'open'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Open RFQs
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                  {openRFQs.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('my-quotes')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'my-quotes'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Submitted Quotes
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-600 rounded-full">
                  {myQuotes.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Open RFQs Tab */}
        {activeTab === 'open' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {openRFQs.map((rfq) => (
              <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-200 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-purple-600">{rfq.rfqNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[rfq.status]}`}>
                        {statusLabels[rfq.status]}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">{rfq.title}</h3>
                  </div>
                  {rfq.category && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {rfq.category}
                    </span>
                  )}
                </div>

                {rfq.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{rfq.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Quantity</p>
                    <p className="text-lg font-semibold text-gray-900">{rfq.quantity} {rfq.unit}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Target Price</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {rfq.targetPrice ? `₹${rfq.targetPrice}/${rfq.unit}` : 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">By {rfq.merchantName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Expires: {new Date(rfq.expiresAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRFQ(rfq);
                      setQuoteForm({
                        ...quoteForm,
                        unitPrice: rfq.targetPrice?.toString() || '',
                        quantity: rfq.quantity.toString(),
                      });
                      setShowQuoteModal(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Submit Quote
                  </button>
                </div>
              </div>
            ))}

            {openRFQs.length === 0 && (
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No open RFQs</h3>
                <p className="mt-2 text-sm text-gray-500">There are no open RFQs matching your categories at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* My Quotes Tab */}
        {activeTab === 'my-quotes' && (
          <div className="space-y-4">
            {myQuotes.map((quote) => {
              const rfq = getRFQById(quote.rfqId);
              if (!rfq) return null;

              return (
                <div key={quote.id} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-medium text-purple-600">{rfq.rfqNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[rfq.status]}`}>
                          {statusLabels[rfq.status]}
                        </span>
                        {quote.isAwarded && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Your Quote Won!
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{rfq.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">by {rfq.merchantName}</p>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Your Quote</p>
                        <p className="text-2xl font-bold text-gray-900">₹{quote.unitPrice}</p>
                        <p className="text-sm text-gray-500">per {rfq.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total Value</p>
                        <p className="text-xl font-semibold text-gray-900">₹{quote.totalPrice.toLocaleString()}</p>
                      </div>
                      {quote.leadTimeDays && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Lead Time</p>
                          <p className="text-sm font-medium text-gray-900">{quote.leadTimeDays} days</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {quote.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{quote.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Submitted: {new Date(quote.submittedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}

            {myQuotes.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No quotes submitted yet</h3>
                <p className="mt-2 text-sm text-gray-500">Submit quotes for open RFQs to see them here.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quote Submission Modal */}
      {showQuoteModal && selectedRFQ && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowQuoteModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Submit Quote</h2>
                <button onClick={() => setShowQuoteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{selectedRFQ.title}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedRFQ.rfqNumber}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-sm text-gray-600">
                    Quantity: <span className="font-medium">{selectedRFQ.quantity} {selectedRFQ.unit}</span>
                  </p>
                  {selectedRFQ.targetPrice && (
                    <p className="text-sm text-gray-600">
                      Target: <span className="font-medium">₹{selectedRFQ.targetPrice}/{selectedRFQ.unit}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={quoteForm.unitPrice}
                      onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={quoteForm.quantity}
                      onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
                      placeholder={selectedRFQ.quantity.toString()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    value={quoteForm.leadTimeDays}
                    onChange={(e) => setQuoteForm({ ...quoteForm, leadTimeDays: e.target.value })}
                    placeholder="e.g., 3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    placeholder="Add any additional information about your quote..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                </div>

                {/* Total Calculation */}
                {quoteForm.unitPrice && quoteForm.quantity && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-900">Total Price:</span>
                      <span className="text-xl font-bold text-purple-600">
                        ₹{(parseFloat(quoteForm.unitPrice) * parseFloat(quoteForm.quantity)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitQuote(selectedRFQ.id)}
                  disabled={!quoteForm.unitPrice}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
