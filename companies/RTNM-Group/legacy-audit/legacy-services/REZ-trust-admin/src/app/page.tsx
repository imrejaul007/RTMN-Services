"use client";

import { TrustScore, TrustBadge } from "@/components/TrustScore";
import { FraudAlert, FraudStats } from "@/components/FraudAlert";
import { TrustTimeline, TrustMetric, TimelineEvent } from "@/components/TrustTimeline";
import { Shield, Users, Building2, AlertTriangle, TrendingUp, CreditCard, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const trustScoreData = [
  { date: "May 1", score: 78 },
  { date: "May 2", score: 79 },
  { date: "May 3", score: 77 },
  { date: "May 4", score: 80 },
  { date: "May 5", score: 82 },
  { date: "May 6", score: 81 },
  { date: "May 7", score: 83 },
];

const recentAlerts = [
  {
    id: "1",
    type: "high" as const,
    title: "Multiple failed payment attempts",
    description: "User attempted 5 failed payments within 10 minutes on different merchant sites.",
    user: { name: "John Carter", email: "john.c@email.com" },
    amount: 2450,
    timestamp: "2 mins ago",
    status: "pending" as const,
  },
  {
    id: "2",
    type: "medium" as const,
    title: "Unusual transaction pattern",
    description: "Transaction amount 300% higher than user's average. Requires manual review.",
    user: { name: "Sarah Miller", email: "s.miller@email.com" },
    amount: 8900,
    timestamp: "15 mins ago",
    status: "pending" as const,
  },
  {
    id: "3",
    type: "low" as const,
    title: "New device login detected",
    description: "Login from new device and location. Standard verification triggered.",
    user: { name: "Mike Johnson", email: "mike.j@email.com" },
    timestamp: "1 hour ago",
    status: "reviewed" as const,
  },
];

const timelineEvents: TimelineEvent[] = [
  {
    id: "1",
    type: "verification",
    title: "Identity Verified",
    description: "User completed KYC verification with government ID",
    timestamp: "10 mins ago",
    actor: "System",
    metadata: { method: "NFC", score: 95 },
  },
  {
    id: "2",
    type: "score_change",
    title: "Trust Score Updated",
    description: "Score increased due to successful payment history",
    timestamp: "1 hour ago",
    actor: "System",
    metadata: { previous: 72, current: 85 },
  },
  {
    id: "3",
    type: "fraud_alert",
    title: "Suspicious Activity Flagged",
    description: "Multiple rapid transactions detected from different IPs",
    timestamp: "3 hours ago",
    actor: "ML Model",
    metadata: { risk_score: 87 },
  },
  {
    id: "4",
    type: "limit_change",
    title: "BNPL Limit Increased",
    description: "Credit limit increased based on payment behavior",
    timestamp: "1 day ago",
    actor: "System",
    metadata: { previous_limit: 500, new_limit: 1500 },
  },
  {
    id: "5",
    type: "payment",
    title: "BNPL Payment Completed",
    description: "Successful repayment for order #ORD-78945",
    timestamp: "2 days ago",
    actor: "Auto-debit",
    metadata: { amount: 245.99, order_id: "ORD-78945" },
  },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Trust Overview</h1>
        <p className="text-slate-500 mt-1">Real-time trust metrics and risk assessment for RTNM-Group</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Shield className="h-6 w-6 text-green-600" />}
          label="Average Trust Score"
          value="82.4"
          change="+2.3"
          trend="up"
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-blue-600" />}
          label="Verified Users"
          value="24,521"
          change="+342"
          trend="up"
        />
        <StatCard
          icon={<Building2 className="h-6 w-6 text-purple-600" />}
          label="Active Merchants"
          value="1,847"
          change="+28"
          trend="up"
        />
        <StatCard
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          label="Active Fraud Alerts"
          value="23"
          change="-5"
          trend="down"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Trust Score Overview */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Trust Score Trends</h2>
            <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trustScoreData}>
                <defs>
                  <linearGradient id="trustGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis domain={[70, 90]} stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#trustGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BNPL Risk Assessment */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">BNPL Risk Assessment</h2>
          <div className="space-y-4">
            <RiskItem label="Low Risk (80+)" percentage={62} color="bg-green-500" />
            <RiskItem label="Medium Risk (60-79)" percentage={28} color="bg-yellow-500" />
            <RiskItem label="High Risk (40-59)" percentage={8} color="bg-orange-500" />
            <RiskItem label="Critical (<40)" percentage={2} color="bg-red-500" />
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-2">Portfolio at Risk</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">4.2%</span>
              <span className="text-sm text-green-600">-1.1% from last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Fraud Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Fraud Alerts</h2>
            <a href="/fraud" className="text-sm text-green-600 hover:underline">View all</a>
          </div>
          <div className="space-y-4">
            {recentAlerts.map((alert) => (
              <FraudAlert key={alert.id} {...alert} />
            ))}
          </div>
        </div>

        {/* Trust Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Trust Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            <TrustMetric label="KYC Completion" value="87%" trend="up" change="3%" />
            <TrustMetric label="Payment Success" value="94.2%" trend="up" change="1.2%" />
            <TrustMetric label="Avg Response Time" value="1.2s" trend="down" change="0.3s" />
            <TrustMetric label="Dispute Rate" value="1.8%" trend="down" change="0.5%" />
          </div>
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">Trust Health: Excellent</p>
                <p className="text-sm text-green-700">All metrics within acceptable range</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <TrustTimeline events={timelineEvents} maxItems={5} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-100 rounded-lg">{icon}</div>
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className={`text-sm font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
          {trend === "up" ? "+" : ""}{change}
        </span>
      </div>
    </div>
  );
}

function RiskItem({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{percentage}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
