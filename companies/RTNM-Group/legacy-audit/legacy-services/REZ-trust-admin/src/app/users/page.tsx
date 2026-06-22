"use client";

import { useState } from "react";
import { TrustScore, TrustBadge } from "@/components/TrustScore";
import { TrustTimeline, TrustMetric } from "@/components/TrustTimeline";
import { Search, Filter, ChevronDown, CheckCircle, XCircle, Clock, Shield, User, Mail, Phone, Calendar } from "lucide-react";
import clsx from "clsx";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  trustScore: number;
  status: "verified" | "pending" | "flagged" | "suspended";
  kycStatus: "completed" | "pending" | "failed";
  bnplLimit: number;
  totalOrders: number;
  joinedDate: string;
  lastActivity: string;
}

const mockUsers: UserData[] = [
  { id: "USR-001", name: "John Carter", email: "john.carter@email.com", phone: "+1 555-0123", trustScore: 92, status: "verified", kycStatus: "completed", bnplLimit: 5000, totalOrders: 156, joinedDate: "2024-03-15", lastActivity: "2 hours ago" },
  { id: "USR-002", name: "Sarah Miller", email: "sarah.m@email.com", phone: "+1 555-0124", trustScore: 78, status: "verified", kycStatus: "completed", bnplLimit: 2500, totalOrders: 89, joinedDate: "2024-06-22", lastActivity: "1 day ago" },
  { id: "USR-003", name: "Mike Johnson", email: "mike.j@email.com", phone: "+1 555-0125", trustScore: 45, status: "flagged", kycStatus: "pending", bnplLimit: 0, totalOrders: 12, joinedDate: "2025-01-10", lastActivity: "3 days ago" },
  { id: "USR-004", name: "Emily Davis", email: "emily.d@email.com", phone: "+1 555-0126", trustScore: 88, status: "verified", kycStatus: "completed", bnplLimit: 3500, totalOrders: 234, joinedDate: "2023-11-05", lastActivity: "30 mins ago" },
  { id: "USR-005", name: "Robert Wilson", email: "r.wilson@email.com", phone: "+1 555-0127", trustScore: 55, status: "pending", kycStatus: "pending", bnplLimit: 500, totalOrders: 8, joinedDate: "2025-04-20", lastActivity: "5 days ago" },
  { id: "USR-006", name: "Lisa Anderson", email: "lisa.a@email.com", phone: "+1 555-0128", trustScore: 95, status: "verified", kycStatus: "completed", bnplLimit: 10000, totalOrders: 412, joinedDate: "2022-08-12", lastActivity: "1 hour ago" },
  { id: "USR-007", name: "James Brown", email: "j.brown@email.com", phone: "+1 555-0129", trustScore: 32, status: "suspended", kycStatus: "failed", bnplLimit: 0, totalOrders: 3, joinedDate: "2025-05-01", lastActivity: "1 week ago" },
  { id: "USR-008", name: "Jennifer Taylor", email: "jen.t@email.com", phone: "+1 555-0130", trustScore: 72, status: "verified", kycStatus: "completed", bnplLimit: 2000, totalOrders: 67, joinedDate: "2024-09-18", lastActivity: "4 hours ago" },
];

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: mockUsers.length,
    verified: mockUsers.filter((u) => u.status === "verified").length,
    pending: mockUsers.filter((u) => u.status === "pending").length,
    flagged: mockUsers.filter((u) => u.status === "flagged").length,
    suspended: mockUsers.filter((u) => u.status === "suspended").length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Trust Management</h1>
          <p className="text-slate-500 mt-1">Manage user verification, trust scores, and BNPL limits</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
            Bulk Actions
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatusCard label="Total Users" value={statusCounts.all} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <StatusCard label="Verified" value={statusCounts.verified} active={statusFilter === "verified"} onClick={() => setStatusFilter("verified")} color="green" />
        <StatusCard label="Pending" value={statusCounts.pending} active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} color="yellow" />
        <StatusCard label="Flagged/Suspended" value={statusCounts.flagged + statusCounts.suspended} active={statusFilter === "flagged"} onClick={() => setStatusFilter("flagged")} color="red" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* User List */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200">
          {/* Filters */}
          <div className="p-4 border-b border-slate-200 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trust Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">KYC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">BNPL Limit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={clsx("hover:bg-slate-50 cursor-pointer", selectedUser?.id === user.id && "bg-green-50")}
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <TrustScore score={user.trustScore} label="" size="sm" showGauge={false} />
                        <span className={clsx(
                          "text-sm font-medium",
                          user.trustScore >= 80 ? "text-green-600" : user.trustScore >= 60 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {user.trustScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-4">
                      <KycBadge status={user.kycStatus} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-900">${user.bnplLimit.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {selectedUser ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedUser.name}</h3>
                  <p className="text-sm text-slate-500">{selectedUser.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <TrustScore score={selectedUser.trustScore} label="Trust Score" size="md" trend={selectedUser.trustScore > 70 ? "up" : "down"} trendValue={selectedUser.trustScore > 70 ? "+5" : "-12"} />
              </div>

              <div className="space-y-4 mb-6">
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={selectedUser.email} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={selectedUser.phone} />
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Joined" value={selectedUser.joinedDate} />
                <InfoRow icon={<Clock className="h-4 w-4" />} label="Last Activity" value={selectedUser.lastActivity} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <TrustMetric label="Total Orders" value={selectedUser.totalOrders} />
                <TrustMetric label="BNPL Limit" value={`$${selectedUser.bnplLimit.toLocaleString()}`} />
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-medium text-slate-900 mb-4">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Verify User
                  </button>
                  <button className="w-full flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Shield className="h-4 w-4" />
                    Update Trust Score
                  </button>
                  <button className="w-full flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                    <XCircle className="h-4 w-4" />
                    Suspend User
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <User className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">Select a user to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, value, active, onClick, color }: { label: string; value: number; active: boolean; onClick: () => void; color?: string }) {
  const colorClasses = color === "green" ? "bg-green-50 border-green-200" : color === "yellow" ? "bg-yellow-50 border-yellow-200" : color === "red" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200";

  return (
    <button
      onClick={onClick}
      className={clsx("rounded-xl border p-6 text-left transition-all hover:shadow-md", colorClasses, active && "ring-2 ring-green-500")}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </button>
  );
}

function StatusBadge({ status }: { status: "verified" | "pending" | "flagged" | "suspended" }) {
  const config = {
    verified: { label: "Verified", className: "bg-green-100 text-green-800" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    flagged: { label: "Flagged", className: "bg-orange-100 text-orange-800" },
    suspended: { label: "Suspended", className: "bg-red-100 text-red-800" },
  };

  const c = config[status];

  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}

function KycBadge({ status }: { status: "completed" | "pending" | "failed" }) {
  const config = {
    completed: { label: "Completed", className: "bg-green-100 text-green-800" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  };

  const c = config[status];

  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-900">{value}</p>
      </div>
    </div>
  );
}
