"use client";

import { useState } from "react";
import { TrustScore, TrustBadge } from "@/components/TrustScore";
import { TrustTimeline, TrustMetric } from "@/components/TrustTimeline";
import { Search, Building2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Star, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import clsx from "clsx";

interface MerchantData {
  id: string;
  name: string;
  category: string;
  trustScore: number;
  status: "active" | "pending" | "suspended" | "probation";
  totalTransactions: number;
  totalVolume: number;
  fraudRate: number;
  disputeRate: number;
  avgOrderValue: number;
  joinedDate: string;
  riskLevel: "low" | "medium" | "high";
}

const mockMerchants: MerchantData[] = [
  { id: "MCH-001", name: "TechZone Electronics", category: "Electronics", trustScore: 94, status: "active", totalTransactions: 45230, totalVolume: 2845000, fraudRate: 0.2, disputeRate: 1.2, avgOrderValue: 450, joinedDate: "2022-03-15", riskLevel: "low" },
  { id: "MCH-002", name: "Fashion Forward", category: "Fashion", trustScore: 87, status: "active", totalTransactions: 28940, totalVolume: 1250000, fraudRate: 0.5, disputeRate: 2.1, avgOrderValue: 120, joinedDate: "2023-01-22", riskLevel: "low" },
  { id: "MCH-003", name: "Home & Living Co", category: "Home", trustScore: 76, status: "probation", totalTransactions: 8720, totalVolume: 456000, fraudRate: 1.8, disputeRate: 4.5, avgOrderValue: 180, joinedDate: "2024-06-10", riskLevel: "medium" },
  { id: "MCH-004", name: "QuickMart", category: "Grocery", trustScore: 91, status: "active", totalTransactions: 156780, totalVolume: 8920000, fraudRate: 0.1, disputeRate: 0.8, avgOrderValue: 85, joinedDate: "2021-11-05", riskLevel: "low" },
  { id: "MCH-005", name: "Luxury Watches Inc", category: "Jewelry", trustScore: 45, status: "suspended", totalTransactions: 1240, totalVolume: 3200000, fraudRate: 8.5, disputeRate: 12.3, avgOrderValue: 2800, joinedDate: "2025-02-01", riskLevel: "high" },
  { id: "MCH-006", name: "Sports Gear Pro", category: "Sports", trustScore: 82, status: "active", totalTransactions: 18940, totalVolume: 1250000, fraudRate: 0.4, disputeRate: 1.8, avgOrderValue: 220, joinedDate: "2023-08-18", riskLevel: "low" },
  { id: "MCH-007", name: "Beauty Essentials", category: "Beauty", trustScore: 68, status: "pending", totalTransactions: 3200, totalVolume: 98000, fraudRate: 1.2, disputeRate: 3.5, avgOrderValue: 65, joinedDate: "2025-04-20", riskLevel: "medium" },
  { id: "MCH-008", name: "Gadget World", category: "Electronics", trustScore: 78, status: "active", totalTransactions: 23450, totalVolume: 1890000, fraudRate: 0.6, disputeRate: 2.2, avgOrderValue: 380, joinedDate: "2023-05-12", riskLevel: "low" },
];

export default function MerchantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantData | null>(null);

  const categories = [...new Set(mockMerchants.map((m) => m.category))];

  const filteredMerchants = mockMerchants.filter((merchant) => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || merchant.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const avgTrustScore = Math.round(mockMerchants.reduce((sum, m) => sum + m.trustScore, 0) / mockMerchants.length);
  const totalVolume = mockMerchants.reduce((sum, m) => sum + m.totalVolume, 0);
  const highRiskCount = mockMerchants.filter((m) => m.riskLevel === "high").length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Merchant Trust Management</h1>
          <p className="text-slate-500 mt-1">Monitor merchant reliability and fraud prevention</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            Add Merchant
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500">Total Merchants</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{mockMerchants.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500">Avg Trust Score</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{avgTrustScore}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500">Total Volume</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${(totalVolume / 1000000).toFixed(1)}M</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500">High Risk Merchants</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{highRiskCount}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Merchant List */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200">
          {/* Filters */}
          <div className="p-4 border-b border-slate-200 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search merchants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Merchant Grid */}
          <div className="p-4 grid grid-cols-2 gap-4">
            {filteredMerchants.map((merchant) => (
              <div
                key={merchant.id}
                className={clsx(
                  "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                  selectedMerchant?.id === merchant.id ? "border-green-500 bg-green-50" : "border-slate-200"
                )}
                onClick={() => setSelectedMerchant(merchant)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-slate-200 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{merchant.name}</h3>
                      <p className="text-xs text-slate-500">{merchant.category}</p>
                    </div>
                  </div>
                  <RiskBadge level={merchant.riskLevel} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrustScore score={merchant.trustScore} label="" size="sm" showGauge={false} />
                    <span className={clsx(
                      "text-sm font-bold",
                      merchant.trustScore >= 80 ? "text-green-600" : merchant.trustScore >= 60 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {merchant.trustScore}
                    </span>
                  </div>
                  <StatusBadge status={merchant.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Volume</p>
                    <p className="text-sm font-medium text-slate-900">${(merchant.totalVolume / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Fraud Rate</p>
                    <p className={clsx("text-sm font-medium", merchant.fraudRate > 1 ? "text-red-600" : "text-slate-900")}>
                      {merchant.fraudRate}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Disputes</p>
                    <p className={clsx("text-sm font-medium", merchant.disputeRate > 3 ? "text-red-600" : "text-slate-900")}>
                      {merchant.disputeRate}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Merchant Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {selectedMerchant ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 bg-slate-200 rounded-lg flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedMerchant.name}</h3>
                  <p className="text-sm text-slate-500">{selectedMerchant.id}</p>
                  <span className="text-xs text-slate-400">{selectedMerchant.category}</span>
                </div>
              </div>

              <div className="flex justify-center mb-6">
                <TrustScore
                  score={selectedMerchant.trustScore}
                  label="Merchant Trust Score"
                  size="md"
                  trend={selectedMerchant.trustScore > 75 ? "up" : "down"}
                  trendValue={selectedMerchant.trustScore > 75 ? "+3" : "-8"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <TrustMetric label="Transactions" value={selectedMerchant.totalTransactions.toLocaleString()} />
                <TrustMetric label="Volume" value={`$${(selectedMerchant.totalVolume / 1000).toFixed(0)}K`} />
                <TrustMetric label="Avg Order" value={`$${selectedMerchant.avgOrderValue}`} />
                <TrustMetric label="Fraud Rate" value={`${selectedMerchant.fraudRate}%`} trend={selectedMerchant.fraudRate > 1 ? "down" : "up"} />
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-slate-900 mb-3">Performance Trend</h4>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  {selectedMerchant.trustScore > 75 ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-700">Performing above average</span>
                    </>
                  ) : selectedMerchant.trustScore > 60 ? (
                    <>
                      <TrendingDown className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm text-yellow-700">Needs attention</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-sm text-red-700">Under review</span>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-medium text-slate-900 mb-4">Actions</h4>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Approve Merchant
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Shield className="h-4 w-4" />
                    Adjust Risk Settings
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    Suspend Merchant
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Building2 className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">Select a merchant to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "pending" | "suspended" | "probation" }) {
  const config = {
    active: { label: "Active", className: "bg-green-100 text-green-800" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    suspended: { label: "Suspended", className: "bg-red-100 text-red-800" },
    probation: { label: "Probation", className: "bg-orange-100 text-orange-800" },
  };

  const c = config[status];

  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const config = {
    low: { label: "Low Risk", className: "bg-green-100 text-green-700" },
    medium: { label: "Medium Risk", className: "bg-yellow-100 text-yellow-700" },
    high: { label: "High Risk", className: "bg-red-100 text-red-700" },
  };

  const c = config[level];

  return (
    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}
