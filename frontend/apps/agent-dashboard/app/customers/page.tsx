'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Search,
  Users,
  ChevronRight,
  Mail,
  Phone,
  Building,
  Star,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import clsx from 'clsx';

const tierConfig = {
  platinum: { label: 'Platinum', color: 'text-purple-600 bg-purple-50' },
  gold: { label: 'Gold', color: 'text-yellow-600 bg-yellow-50' },
  silver: { label: 'Silver', color: 'text-gray-600 bg-gray-50' },
  bronze: { label: 'Bronze', color: 'text-orange-600 bg-orange-50' },
};

const churnRiskConfig = {
  low: { label: 'Low Risk', color: 'text-green-600 bg-green-50', icon: TrendingUp },
  medium: { label: 'Medium Risk', color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle },
  high: { label: 'High Risk', color: 'text-red-600 bg-red-50', icon: AlertTriangle },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['customerSearch', search],
    queryFn: () => api.searchCustomers(search),
    enabled: search.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Demo customers for initial state
  const demoCustomers = [
    {
      id: 'CUST-001',
      name: 'Michael Roberts',
      email: 'michael.r@email.com',
      phone: '+1 (555) 123-4567',
      company: 'Roberts Consulting',
      tier: 'platinum' as const,
      churnRisk: 'low' as const,
      totalSpent: 12450.00,
      totalOrders: 47,
      satisfaction: 4.8,
    },
    {
      id: 'CUST-002',
      name: 'Emma Thompson',
      email: 'emma.t@email.com',
      tier: 'gold' as const,
      churnRisk: 'medium' as const,
      totalSpent: 8920.00,
      totalOrders: 32,
      satisfaction: 4.2,
    },
    {
      id: 'CUST-003',
      name: 'James Wilson',
      email: 'james.w@email.com',
      tier: 'silver' as const,
      churnRisk: 'low' as const,
      totalSpent: 3450.00,
      totalOrders: 15,
      satisfaction: 4.5,
    },
    {
      id: 'CUST-004',
      name: 'Lisa Anderson',
      email: 'lisa.a@corp.com',
      company: 'Tech Solutions Inc.',
      tier: 'gold' as const,
      churnRisk: 'low' as const,
      totalSpent: 15600.00,
      totalOrders: 28,
      satisfaction: 4.9,
    },
    {
      id: 'CUST-005',
      name: 'David Martinez',
      email: 'david.m@email.com',
      tier: 'bronze' as const,
      churnRisk: 'high' as const,
      totalSpent: 890.00,
      totalOrders: 5,
      satisfaction: 2.8,
    },
  ];

  const displayCustomers = searchResults?.length ? searchResults : demoCustomers;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 mt-1">Search and view customer information</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, or company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </form>

      {/* Customer List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Customer</div>
            <div className="col-span-2">Tier</div>
            <div className="col-span-2">Risk</div>
            <div className="col-span-2">Total Spent</div>
            <div className="col-span-2">CSAT</div>
          </div>

          {displayCustomers.map((customer) => {
            const tier = tierConfig[customer.tier];
            const churnRisk = churnRiskConfig[customer.churnRisk as keyof typeof churnRiskConfig];
            const ChurnIcon = churnRisk.icon;

            return (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-center"
              >
                {/* Customer Info */}
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                    {customer.avatar ? (
                      <img src={customer.avatar} alt={customer.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{customer.name}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </span>
                      {customer.company && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {customer.company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tier */}
                <div className="col-span-2">
                  <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium', tier.color)}>
                    <Star className="w-3 h-3 inline mr-1" />
                    {tier.label}
                  </span>
                </div>

                {/* Churn Risk */}
                <div className="col-span-2">
                  <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium', churnRisk.color)}>
                    <ChurnIcon className="w-3 h-3 inline mr-1" />
                    {churnRisk.label}
                  </span>
                </div>

                {/* Total Spent */}
                <div className="col-span-2">
                  <p className="font-semibold text-slate-900">{formatCurrency(customer.totalSpent)}</p>
                  <p className="text-xs text-slate-500">{customer.totalOrders} orders</p>
                </div>

                {/* CSAT */}
                <div className="col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-slate-900">{customer.satisfaction}</span>
                    <span className="text-slate-400">/5</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Customers</p>
          <p className="text-2xl font-bold text-slate-900">12,458</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Premium Tiers</p>
          <p className="text-2xl font-bold text-purple-600">3,241</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">High Risk</p>
          <p className="text-2xl font-bold text-red-600">847</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Avg CSAT</p>
          <p className="text-2xl font-bold text-green-600">4.3</p>
        </div>
      </div>
    </div>
  );
}
