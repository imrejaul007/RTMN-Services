"use client";

import { useState } from "react";
import { FraudAlert, FraudStats } from "@/components/FraudAlert";
import { TrustTimeline, TimelineEvent } from "@/components/TrustTimeline";
import { AlertTriangle, Search, Filter, Shield, TrendingUp, Clock, DollarSign, Users, Building2, CheckCircle, XCircle, Eye } from "lucide-react";
import clsx from "clsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const fraudTrendData = [
  { date: "May 1", attempts: 12, blocked: 10 },
  { date: "May 2", attempts: 18, blocked: 15 },
  { date: "May 3", attempts: 8, blocked: 7 },
  { date: "May 4", attempts: 25, blocked: 22 },
  { date: "May 5", attempts: 15, blocked: 13 },
  { date: "May 6", attempts: 32, blocked: 28 },
  { date: "May 7", attempts: 21, blocked: 19 },
];

const fraudByType = [
  { type: "Payment Fraud", count: 156, percentage: 35 },
  { type: "Identity Theft", count: 89, percentage: 20 },
  { type: "Account Takeover", count: 67, percentage: 15 },
  { type: "Friendly Fraud", count: 78, percentage: 18 },
  { type: "Collusion", count: 45, percentage: 10 },
  { type: "Other", count: 10, percentage: 2 },
];

interface FraudCase {
  id: string;
  type: "high" | "medium" | "low";
  title: string;
  description: string;
  user?: { name: string; email: string };
  merchant?: { name: string };
  amount: number;
  timestamp: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  confidence: number;
  patterns: string[];
}

const mockFraudCases: FraudCase[] = [
  {
    id: "FRD-001",
    type: "high",
    title: "Coordinated attack on multiple merchants",
    description: "Same user attempting purchases across 5 merchants within 30 minutes with stolen payment methods.",
    user: { name: "Unknown Actor", email: "Multiple accounts" },
    merchant: { name: "Various" },
    amount: 15420,
    timestamp: "5 mins ago",
    status: "pending",
    confidence: 94,
    patterns: ["Rapid multi-merchant", "Stolen card", "Velocity violation"],
  },
  {
    id: "FRD-002",
    type: "high",
    title: "BNPL limit abuse pattern",
    description: "User repeatedly maxing out BNPL limits across different orders without repayment.",
    user: { name: "Alex Thompson", email: "alex.t@email.com" },
    amount: 8750,
    timestamp: "23 mins ago",
    status: "investigating",
    confidence: 87,
    patterns: ["BNPL abuse", "Multiple orders", "No repayment"],
  },
  {
    id: "FRD-003",
    type: "medium",
    title: "Shipping address manipulation",
    description: "User frequently changes shipping addresses at checkout to redirect high-value orders.",
    user: { name: "Jordan Lee", email: "j.lee@email.com" },
    merchant: { name: "TechZone Electronics" },
    amount: 3450,
    timestamp: "1 hour ago",
    status: "pending",
    confidence: 72,
    patterns: ["Address mismatch", "Velocity", "High value"],
  },
  {
    id: "FRD-004",
    type: "medium",
    title: "New account high-value purchases",
    description: "Account created 2 hours ago with immediate high-value electronics purchase.",
    user: { name: "Casey Morgan", email: "casey.m@email.com" },
    merchant: { name: "Gadget World" },
    amount: 2890,
    timestamp: "2 hours ago",
    status: "investigating",
    confidence: 68,
    patterns: ["New account", "High value", "Electronics"],
  },
  {
    id: "FRD-005",
    type: "low",
    title: "Device fingerprint anomaly",
    description: "Multiple accounts sharing similar device characteristics.",
    amount: 890,
    timestamp: "3 hours ago",
    status: "pending",
    confidence: 45,
    patterns: ["Shared device", "Multiple accounts"],
  },
];

const timelineEvents: TimelineEvent[] = [
  { id: "1", type: "fraud_alert", title: "Fraud Ring Identified", description: "23 accounts linked to same fraud ring blocked", timestamp: "2 hours ago", metadata: { accounts: 23, amount_saved: 45000 } },
  { id: "2", type: "fraud_alert", title: "New Attack Vector Detected", description: "ML model detected emerging BOT attack pattern", timestamp: "5 hours ago", actor: "ML System" },
  { id: "3", type: "verification", title: "Security Rule Updated", description: "New velocity rule deployed for BNPL transactions", timestamp: "8 hours ago", actor: "Admin" },
  { id: "4", type: "score_change", title: "Model Performance", description: "Fraud detection model accuracy improved", timestamp: "1 day ago", metadata: { accuracy: 94.5, recall: 91.2 } },
];

export default function FraudPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<FraudCase | null>(null);

  const filteredCases = mockFraudCases.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || c.type === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const totalBlocked = 114;
  const totalAttempts = 131;
  const fraudRate = ((totalAttempts - totalBlocked) / totalAttempts * 100).toFixed(1);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fraud Detection & Prevention</h1>
          <p className="text-slate-500 mt-1">Monitor fraud patterns, investigate cases, and manage risk</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            Update Rules
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-slate-500">Active Alerts</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{mockFraudCases.length}</p>
          <p className="text-xs text-red-600 mt-1">+12% from last week</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-sm text-slate-500">Blocked</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalBlocked}</p>
          <p className="text-xs text-green-600 mt-1">Fraud attempts</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-slate-500">Amount Saved</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">$2.4M</p>
          <p className="text-xs text-green-600 mt-1">This month</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-slate-500">Detection Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">94.5%</p>
          <p className="text-xs text-green-600 mt-1">ML Model</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-sm text-slate-500">Avg Response</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">1.2s</p>
          <p className="text-xs text-slate-500 mt-1">Real-time</p>
        </div>
      </div>

      {/* Fraud Risk Distribution */}
      <FraudStats high={3} medium={2} low={0} />

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Fraud Cases */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search cases by ID or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-2">
              {["all", "high", "medium", "low"].map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSeverityFilter(severity)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    severityFilter === severity
                      ? severity === "high" ? "bg-red-100 text-red-700"
                        : severity === "medium" ? "bg-yellow-100 text-yellow-700"
                        : severity === "low" ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {severity === "all" ? "All" : severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {filteredCases.map((fraudCase) => (
              <div
                key={fraudCase.id}
                className={clsx(
                  "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                  selectedCase?.id === fraudCase.id ? "border-green-500 bg-green-50" : "border-slate-200"
                )}
                onClick={() => setSelectedCase(fraudCase)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                      {fraudCase.id}
                    </span>
                    <ConfidenceBadge confidence={fraudCase.confidence} />
                  </div>
                  <span className="text-xs text-slate-500">{fraudCase.timestamp}</span>
                </div>

                <h3 className="font-semibold text-slate-900 mb-1">{fraudCase.title}</h3>
                <p className="text-sm text-slate-600 mb-3">{fraudCase.description}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {fraudCase.patterns.map((pattern, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {pattern}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-sm">
                    {fraudCase.user && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Users className="h-4 w-4" />
                        {fraudCase.user.name}
                      </span>
                    )}
                    {fraudCase.merchant && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Building2 className="h-4 w-4" />
                        {fraudCase.merchant.name}
                      </span>
                    )}
                    <span className="font-medium text-slate-900">
                      ${fraudCase.amount.toLocaleString()}
                    </span>
                  </div>
                  <CaseStatusBadge status={fraudCase.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Fraud Trends Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Fraud Attempts vs Blocked</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fraudTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="attempts" stroke="#ef4444" fill="#fef2f2" />
                  <Area type="monotone" dataKey="blocked" stroke="#22c55e" fill="#f0fdf4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fraud by Type */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Fraud by Type</h2>
            <div className="space-y-3">
              {fraudByType.map((item) => (
                <div key={item.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.type}</span>
                    <span className="font-medium text-slate-900">{item.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Case Details */}
          {selectedCase && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Case Details</h2>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                  {selectedCase.id}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Confidence Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${selectedCase.confidence}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900">{selectedCase.confidence}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="text-sm font-medium text-slate-900">${selectedCase.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Time</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCase.timestamp}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Resolve
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Eye className="h-4 w-4" />
                    Investigate
                  </button>
                  <button className="flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
            <TrustTimeline events={timelineEvents} maxItems={4} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span className={clsx(
      "px-2 py-0.5 rounded text-xs font-medium",
      confidence >= 80 ? "bg-red-100 text-red-700" : confidence >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
    )}>
      {confidence}% confidence
    </span>
  );
}

function CaseStatusBadge({ status }: { status: "pending" | "investigating" | "resolved" | "dismissed" }) {
  const config = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    investigating: { label: "Investigating", className: "bg-blue-100 text-blue-800" },
    resolved: { label: "Resolved", className: "bg-green-100 text-green-800" },
    dismissed: { label: "Dismissed", className: "bg-slate-100 text-slate-600" },
  };

  const c = config[status];

  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}
