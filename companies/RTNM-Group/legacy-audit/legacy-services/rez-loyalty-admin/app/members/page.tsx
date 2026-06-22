'use client';

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface Member {
  id: string;
  name: string;
  email: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  points: number;
  lifetimePoints: number;
  joinDate: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'suspended';
  transactions: number;
}

interface Transaction {
  id: string;
  date: string;
  type: 'earn' | 'redeem' | 'bonus' | 'expire';
  points: number;
  description: string;
  balance: number;
}

const mockMembers: Member[] = [
  { id: '1', name: 'Sarah Mitchell', email: 'sarah.m@email.com', tier: 'Platinum', points: 24500, lifetimePoints: 245000, joinDate: '2023-01-15', lastActive: '2 hours ago', status: 'active', transactions: 156 },
  { id: '2', name: 'James Wilson', email: 'jwilson@email.com', tier: 'Platinum', points: 22850, lifetimePoints: 228500, joinDate: '2022-08-22', lastActive: '5 hours ago', status: 'active', transactions: 134 },
  { id: '3', name: 'Emily Chen', email: 'emily.chen@email.com', tier: 'Gold', points: 19500, lifetimePoints: 195000, joinDate: '2023-03-10', lastActive: '1 day ago', status: 'active', transactions: 89 },
  { id: '4', name: 'Michael Brown', email: 'mbrown@email.com', tier: 'Gold', points: 18720, lifetimePoints: 187200, joinDate: '2022-11-05', lastActive: '3 days ago', status: 'active', transactions: 112 },
  { id: '5', name: 'Lisa Anderson', email: 'lisa.a@email.com', tier: 'Gold', points: 17280, lifetimePoints: 172800, joinDate: '2023-02-18', lastActive: '12 hours ago', status: 'active', transactions: 78 },
  { id: '6', name: 'David Martinez', email: 'david.m@email.com', tier: 'Silver', points: 8450, lifetimePoints: 84500, joinDate: '2023-06-01', lastActive: '2 days ago', status: 'active', transactions: 45 },
  { id: '7', name: 'Rachel Green', email: 'rgreen@email.com', tier: 'Silver', points: 7200, lifetimePoints: 72000, joinDate: '2023-04-12', lastActive: '4 days ago', status: 'inactive', transactions: 32 },
  { id: '8', name: 'Kevin Nguyen', email: 'knguyen@email.com', tier: 'Bronze', points: 3200, lifetimePoints: 32000, joinDate: '2023-09-20', lastActive: '1 week ago', status: 'active', transactions: 18 },
  { id: '9', name: 'Amanda White', email: 'awhite@email.com', tier: 'Bronze', points: 1850, lifetimePoints: 18500, joinDate: '2023-11-08', lastActive: '2 weeks ago', status: 'inactive', transactions: 8 },
  { id: '10', name: 'Robert Taylor', email: 'rtaylor@email.com', tier: 'Silver', points: 5600, lifetimePoints: 56000, joinDate: '2023-05-15', lastActive: '1 day ago', status: 'active', transactions: 28 },
];

const mockTransactions: Record<string, Transaction[]> = {
  '1': [
    { id: 't1', date: '2024-05-07', type: 'earn', points: 500, description: 'Purchase at Store #123', balance: 24500 },
    { id: 't2', date: '2024-05-05', type: 'bonus', points: 1000, description: 'Referral bonus - Jennifer Lee', balance: 24000 },
    { id: 't3', date: '2024-05-01', type: 'redeem', points: -5000, description: 'Redeemed for $50 voucher', balance: 23000 },
    { id: 't4', date: '2024-04-28', type: 'earn', points: 250, description: 'Purchase at Store #456', balance: 28000 },
    { id: 't5', date: '2024-04-25', type: 'expire', points: -500, description: 'Points expired', balance: 27750 },
  ],
};

const tierColors: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
};

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const filteredMembers = mockMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === 'all' || member.tier === selectedTier;
    const matchesStatus = selectedStatus === 'all' || member.status === selectedStatus;
    return matchesSearch && matchesTier && matchesStatus;
  });

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  const tierStats = {
    Bronze: mockMembers.filter((m) => m.tier === 'Bronze').length,
    Silver: mockMembers.filter((m) => m.tier === 'Silver').length,
    Gold: mockMembers.filter((m) => m.tier === 'Gold').length,
    Platinum: mockMembers.filter((m) => m.tier === 'Platinum').length,
  };

  const pieData = Object.entries(tierStats).map(([name, value]) => ({
    name,
    value,
  }));

  const handleAdjustPoints = () => {
    if (!adjustAmount || !adjustReason) return;
    // In real app, this would call an API
    setShowAdjustModal(false);
    setAdjustAmount('');
    setAdjustReason('');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Member Management</h1>
          <p className="text-slate-500 mt-1">Manage loyalty program members and their points.</p>
        </div>
        <button className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Member
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(tierStats).map(([tier, count]) => (
          <div key={tier} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${tierColors[tier]}20` }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: tierColors[tier] }}
              />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-sm text-slate-500">{tier} Members</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {/* Tier Filter */}
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Tiers</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                  selectedMember?.id === member.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-600">
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${tierColors[member.tier]}30`,
                            color: member.tier === 'Silver' ? '#64748b' : member.tier === 'Gold' ? '#92400e' : member.tier === 'Platinum' ? '#475569' : '#8b5a2b',
                          }}
                        >
                          {member.tier}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatNumber(member.points)} pts</p>
                    <p className="text-sm text-slate-500">{member.transactions} transactions</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-slate-500">No members found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Member Detail Panel */}
        <div className="bg-white rounded-xl shadow-sm">
          {selectedMember ? (
            <div className="p-6">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center font-bold text-2xl text-slate-600 mx-auto mb-3">
                  {selectedMember.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selectedMember.name}</h2>
                <p className="text-slate-500">{selectedMember.email}</p>
                <span
                  className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${tierColors[selectedMember.tier]}30`,
                    color: selectedMember.tier === 'Silver' ? '#64748b' : selectedMember.tier === 'Gold' ? '#92400e' : selectedMember.tier === 'Platinum' ? '#475569' : '#8b5a2b',
                  }}
                >
                  {selectedMember.tier}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(selectedMember.points)}</p>
                  <p className="text-sm text-slate-500">Current Points</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(selectedMember.lifetimePoints)}</p>
                  <p className="text-sm text-slate-500">Lifetime Points</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`font-medium ${
                      selectedMember.status === 'active'
                        ? 'text-emerald-600'
                        : selectedMember.status === 'inactive'
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {selectedMember.status.charAt(0).toUpperCase() + selectedMember.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Transactions</span>
                  <span className="font-medium">{selectedMember.transactions}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Joined</span>
                  <span className="font-medium">{selectedMember.joinDate}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Last Active</span>
                  <span className="font-medium">{selectedMember.lastActive}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowAdjustModal(true)}
                  className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                >
                  Adjust Points
                </button>
                <button className="w-full px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                  View Full Profile
                </button>
                <button className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors">
                  Suspend Member
                </button>
              </div>

              {/* Activity History */}
              <div className="mt-6">
                <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {(mockTransactions[selectedMember.id] || []).map((tx) => (
                    <div key={tx.id} className="flex items-start gap-3 text-sm">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'earn'
                            ? 'bg-emerald-100 text-emerald-600'
                            : tx.type === 'redeem'
                            ? 'bg-amber-100 text-amber-600'
                            : tx.type === 'bonus'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tx.type === 'earn' && '+'}
                        {tx.type === 'redeem' && '-'}
                        {tx.type === 'bonus' && '★'}
                        {tx.type === 'expire' && '○'}
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-700">{tx.description}</p>
                        <p className="text-slate-400 text-xs">{tx.date}</p>
                      </div>
                      <span
                        className={`font-medium ${
                          tx.points > 0 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {tx.points > 0 ? '+' : ''}{formatNumber(tx.points)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-slate-500">Select a member to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Points Modal */}
      {showAdjustModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Adjust Points</h2>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-2">Adjusting points for:</p>
              <p className="font-medium text-slate-900">{selectedMember.name}</p>
              <p className="text-sm text-slate-500">Current balance: {formatNumber(selectedMember.points)} points</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Points Adjustment</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Enter positive to add, negative to deduct"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Explain the reason for this adjustment..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {adjustAmount && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">New balance will be:</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatNumber(selectedMember.points + parseInt(adjustAmount || '0'))} points
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustPoints}
                disabled={!adjustAmount || !adjustReason}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
