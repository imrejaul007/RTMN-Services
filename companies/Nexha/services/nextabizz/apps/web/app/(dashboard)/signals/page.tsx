'use client';

import { useState, useEffect, useCallback } from 'react';
import type { InventorySignal, SignalSeverity } from '@nextabizz/shared-types';
import { getSession } from '@/lib/supabase';
import SignalCard, { SignalDetailModal } from '@/components/signal-card';
import CreatePOModal from '@/components/create-po-modal';
import { track } from '@/lib/intentCaptureService';

const APP_TYPE = 'nextabizz-web';

type SourceFilter = 'all' | 'restopapa' | 'rez-merchant' | 'hotel-pms';
type SeverityFilter = 'all' | 'critical' | 'low' | 'out_of_stock';

interface SignalStats {
  total: number;
  critical: number;
  outOfStock: number;
  processed: number;
}

const sourceOptions: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'restopapa', label: 'RestoPapa' },
  { value: 'rez-merchant', label: 'ReZ Merchant' },
  { value: 'hotel-pms', label: 'Hotel PMS' },
];

const severityOptions: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All Severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

// Mock data for demonstration
const mockSignals: InventorySignal[] = [
  {
    id: 'sig-1',
    merchantId: 'merchant-1',
    source: 'restopapa',
    sourceProductId: 'RP-001',
    sourceMerchantId: 'resto-1',
    productName: 'Basmati Rice - Premium',
    sku: 'RICE-001',
    currentStock: 5,
    threshold: 50,
    unit: 'kg',
    category: 'Grains',
    severity: 'critical',
    signalType: 'low_stock',
    metadata: { urgency: 'high', reorderQty: 100 },
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
  },
  {
    id: 'sig-2',
    merchantId: 'merchant-1',
    source: 'rez-merchant',
    sourceProductId: 'RM-002',
    sourceMerchantId: 'rez-1',
    productName: 'Refined Sunflower Oil',
    sku: 'OIL-002',
    currentStock: 10,
    threshold: 25,
    unit: 'liters',
    category: 'Oils',
    severity: 'low',
    signalType: 'low_stock',
    metadata: { urgency: 'medium', reorderQty: 50 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: 'sig-3',
    merchantId: 'merchant-1',
    source: 'hotel-pms',
    sourceProductId: 'HP-003',
    sourceMerchantId: 'hotel-1',
    productName: 'Chicken Breast - Frozen',
    sku: 'CHKN-001',
    currentStock: 0,
    threshold: 20,
    unit: 'kg',
    category: 'Meat',
    severity: 'critical',
    signalType: 'out_of_stock',
    metadata: { urgency: 'high', reorderQty: 40 },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
  },
  {
    id: 'sig-4',
    merchantId: 'merchant-1',
    source: 'restopapa',
    sourceProductId: 'RP-004',
    sourceMerchantId: 'resto-1',
    productName: 'Paneer - Fresh',
    sku: 'PNR-001',
    currentStock: 15,
    threshold: 30,
    unit: 'kg',
    category: 'Dairy',
    severity: 'low',
    signalType: 'low_stock',
    metadata: { urgency: 'low', reorderQty: 25 },
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
  },
  {
    id: 'sig-5',
    merchantId: 'merchant-1',
    source: 'rez-merchant',
    sourceProductId: 'RM-005',
    sourceMerchantId: 'rez-1',
    productName: 'Tomato Ketchup',
    sku: 'SAU-001',
    currentStock: 3,
    threshold: 15,
    unit: 'bottles',
    category: 'Sauces',
    severity: 'critical',
    signalType: 'low_stock',
    metadata: { urgency: 'high', reorderQty: 30 },
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
  },
  {
    id: 'sig-6',
    merchantId: 'merchant-1',
    source: 'hotel-pms',
    sourceProductId: 'HP-006',
    sourceMerchantId: 'hotel-1',
    productName: 'Onions - Raw',
    sku: 'VEG-001',
    currentStock: 0,
    threshold: 25,
    unit: 'kg',
    category: 'Vegetables',
    severity: 'critical',
    signalType: 'out_of_stock',
    metadata: { urgency: 'high', reorderQty: 50 },
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
  },
];

export default function SignalsPage() {
  const [signals, setSignals] = useState<InventorySignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 12;

  // Modal states
  const [selectedSignal, setSelectedSignal] = useState<InventorySignal | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [signalForPO, setSignalForPO] = useState<InventorySignal | null>(null);

  // Stats
  const [stats, setStats] = useState<SignalStats>({
    total: 0,
    critical: 0,
    outOfStock: 0,
    processed: 0,
  });

  const fetchSignals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In production, this would call the API
      // const session = getSession();
      // const result = await fetchSignals(session.merchantId, {
      //   source: sourceFilter,
      //   severity: severityFilter,
      //   startDate,
      //   endDate,
      //   page,
      //   pageSize,
      // });

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      let filtered = [...mockSignals];

      if (sourceFilter !== 'all') {
        filtered = filtered.filter(s => s.source === sourceFilter);
      }

      if (severityFilter !== 'all') {
        filtered = filtered.filter(s => s.severity === severityFilter);
      }

      if (startDate) {
        filtered = filtered.filter(s => new Date(s.createdAt) >= new Date(startDate));
      }

      if (endDate) {
        filtered = filtered.filter(s => new Date(s.createdAt) <= new Date(endDate));
      }

      // Calculate stats
      setStats({
        total: filtered.length,
        critical: filtered.filter(s => s.severity === 'critical').length,
        outOfStock: filtered.filter(s => s.signalType === 'out_of_stock').length,
        processed: 0,
      });

      // Paginate
      const start = 0;
      const end = page * pageSize;
      const paginatedSignals = filtered.slice(start, end);

      setSignals(paginatedSignals);
      setHasMore(filtered.length > end);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals');
    } finally {
      setIsLoading(false);
    }
  }, [sourceFilter, severityFilter, startDate, endDate, page]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    setPage(1);
  }, [sourceFilter, severityFilter, startDate, endDate]);

  const handleSignalClick = (signal: InventorySignal) => {
    // Track signal view intent
    const session = getSession();
    if (session?.merchantId) {
      track({
        userId: session.merchantId,
        event: 'product_view',
        appType: APP_TYPE,
        intentKey: signal.sourceProductId ?? signal.id,
        properties: {
          signalId: signal.id,
          source: signal.source,
          severity: signal.severity,
          productName: signal.productName,
          sku: signal.sku,
          currentStock: signal.currentStock,
          threshold: signal.threshold,
          unit: signal.unit,
        },
      });
    }

    setSelectedSignal(signal);
    setIsDetailModalOpen(true);
  };

  const handleCreatePO = (signal: InventorySignal) => {
    // Track checkout_start from signal (reorder intent)
    const session = getSession();
    if (session?.merchantId) {
      track({
        userId: session.merchantId,
        event: 'checkout_start',
        appType: APP_TYPE,
        intentKey: signal.sourceProductId ?? signal.id,
        properties: {
          signalId: signal.id,
          source: signal.source,
          severity: signal.severity,
          productName: signal.productName,
          sku: signal.sku,
          reorderQty: signal.metadata?.reorderQty ?? signal.threshold,
          unit: signal.unit,
        },
      });
    }

    setSignalForPO(signal);
    setIsCreatePOModalOpen(true);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const resetFilters = () => {
    setSourceFilter('all');
    setSeverityFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = sourceFilter !== 'all' || severityFilter !== 'all' || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Signals</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor inventory alerts from your connected platforms
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Signals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Critical</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-700 mt-1">{stats.outOfStock}</p>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Processed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.processed}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Source Filter */}
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as SourceFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            >
              {sourceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            >
              {severityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
          </div>

          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Signal List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded mb-3" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={fetchSignals}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : signals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No signals yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Connect your platform (RestoPapa, ReZ Merchant, or Hotel PMS) to start receiving inventory alerts.
          </p>
          <button className="mt-6 px-6 py-2.5 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors">
            Connect Platform
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onClick={handleSignalClick}
                onCreatePO={handleCreatePO}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <SignalDetailModal
        signal={selectedSignal}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSignal(null);
        }}
        onCreatePO={handleCreatePO}
      />

      <CreatePOModal
        open={isCreatePOModalOpen}
        onClose={() => {
          setIsCreatePOModalOpen(false);
          setSignalForPO(null);
        }}
        source="reorder"
        initialItems={signalForPO ? [{
          name: signalForPO.productName,
          sku: signalForPO.sku,
          qty: (signalForPO.metadata?.reorderQty as number) || signalForPO.threshold,
          unit: signalForPO.unit,
          unitPrice: 0,
        }] : []}
        onSuccess={() => {
          setIsCreatePOModalOpen(false);
          setSignalForPO(null);
          fetchSignals();
        }}
      />
    </div>
  );
}
