'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Tier {
  id: string;
  name: string;
  color: string;
  threshold: number;
  benefits: string[];
  multiplier: number;
  memberCount: number;
  requirements?: string;
}

interface Benefit {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const tiers: Tier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    color: '#cd7f32',
    threshold: 0,
    benefits: ['Earn 1 point per $1 spent', 'Birthday bonus points', 'Access to member-only promotions'],
    multiplier: 1,
    memberCount: 12420,
    requirements: 'Default tier for all new members',
  },
  {
    id: 'silver',
    name: 'Silver',
    color: '#c0c0c0',
    threshold: 50000,
    benefits: ['Earn 1.25 points per $1 spent', 'Priority customer support', 'Early access to sales', 'Free shipping on orders over $50'],
    multiplier: 1.25,
    memberCount: 7840,
    requirements: '50,000 lifetime points required',
  },
  {
    id: 'gold',
    name: 'Gold',
    color: '#ffd700',
    threshold: 150000,
    benefits: ['Earn 1.5 points per $1 spent', 'Dedicated support line', 'Exclusive Gold member events', 'Free shipping on all orders', '10% discount on redemption'],
    multiplier: 1.5,
    memberCount: 3420,
    requirements: '150,000 lifetime points required',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    color: '#e5e4e2',
    threshold: 500000,
    benefits: ['Earn 2 points per $1 spent', 'Personal concierge service', 'VIP event invitations', 'Free next-day delivery', '15% discount on redemption', 'Annual fee waiver'],
    multiplier: 2,
    memberCount: 1173,
    requirements: '500,000 lifetime points required',
  },
];

const availableBenefits: Benefit[] = [
  { id: 'b1', name: 'Free Shipping', description: 'Waived shipping fees', icon: 'truck' },
  { id: 'b2', name: 'Points Multiplier', description: 'Enhanced earning rate', icon: 'star' },
  { id: 'b3', name: 'Discount', description: 'Percentage off purchases', icon: 'percent' },
  { id: 'b4', name: 'Birthday Bonus', description: 'Special points on birthday', icon: 'gift' },
  { id: 'b5', name: 'Priority Support', description: 'Faster customer service', icon: 'headphones' },
  { id: 'b6', name: 'Early Access', description: 'Access new products first', icon: 'clock' },
  { id: 'b7', name: 'Events', description: 'Exclusive member events', icon: 'calendar' },
  { id: 'b8', name: 'Concierge', description: 'Personal account manager', icon: 'user' },
];

const tierGrowthData = [
  { month: 'Jan', Bronze: 11800, Silver: 7200, Gold: 3100, Platinum: 980 },
  { month: 'Feb', Bronze: 11950, Silver: 7350, Gold: 3180, Platinum: 1020 },
  { month: 'Mar', Bronze: 12080, Silver: 7480, Gold: 3250, Platinum: 1050 },
  { month: 'Apr', Bronze: 12200, Silver: 7620, Gold: 3320, Platinum: 1100 },
  { month: 'May', Bronze: 12420, Silver: 7840, Gold: 3420, Platinum: 1173 },
];

const icons: Record<string, JSX.Element> = {
  truck: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
  star: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  percent: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>,
  gift: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>,
  headphones: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  clock: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  calendar: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  user: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
};

export default function TiersPage() {
  const [selectedTier, setSelectedTier] = useState<Tier>(tiers[0]);
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(selectedTier.threshold.toString());
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [newTierName, setNewTierName] = useState('');

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  const handleTierSelect = (tier: Tier) => {
    setSelectedTier(tier);
    setTempThreshold(tier.threshold.toString());
  };

  const handleSaveThreshold = () => {
    setEditingThreshold(false);
    // In real app, this would call an API
  };

  const handleAddBenefit = () => {
    setShowBenefitModal(false);
    // In real app, this would call an API
  };

  const handleAddTier = () => {
    setShowAddTierModal(false);
    setNewTierName('');
    // In real app, this would call an API
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tier Configuration</h1>
          <p className="text-slate-500 mt-1">Manage loyalty tiers, thresholds, and benefits.</p>
        </div>
        <button
          onClick={() => setShowAddTierModal(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Tier
        </button>
      </div>

      {/* Visual Tier Builder */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Tier Structure</h2>

        {/* Tier Cards */}
        <div className="flex items-center justify-between mb-8">
          {tiers.map((tier, index) => (
            <div key={tier.id} className="flex-1 relative">
              {/* Connector Line */}
              {index < tiers.length - 1 && (
                <div className="absolute top-8 left-1/2 w-full h-1 bg-gradient-to-r from-slate-200 to-slate-200 z-0" />
              )}
              <div
                onClick={() => handleTierSelect(tier)}
                className={`relative z-10 cursor-pointer transition-all ${
                  selectedTier.id === tier.id ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-lg border-4 border-white"
                  style={{ backgroundColor: tier.color }}
                >
                  <span className={`text-lg font-bold ${tier.name === 'Gold' ? 'text-slate-700' : 'text-white'}`}>
                    {tier.name[0]}
                  </span>
                </div>
                <p className="text-center font-medium text-slate-900 mt-3">{tier.name}</p>
                <p className="text-center text-sm text-slate-500">
                  {formatNumber(tier.threshold)} pts
                </p>
                <p className="text-center text-xs text-slate-400 mt-1">
                  {formatNumber(tier.memberCount)} members
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tier Growth Chart */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Tier Membership Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tierGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => formatNumber(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="Bronze" stroke="#cd7f32" strokeWidth={2} />
                <Line type="monotone" dataKey="Silver" stroke="#c0c0c0" strokeWidth={2} />
                <Line type="monotone" dataKey="Gold" stroke="#ffd700" strokeWidth={2} />
                <Line type="monotone" dataKey="Platinum" stroke="#e5e4e2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Tier Settings</h2>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: selectedTier.color }}
            >
              <span className={`text-sm font-bold ${selectedTier.name === 'Gold' ? 'text-slate-700' : 'text-white'}`}>
                {selectedTier.name[0]}
              </span>
            </div>
          </div>

          {/* Tier Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Tier Name</label>
            <input
              type="text"
              defaultValue={selectedTier.name}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Threshold */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Points Threshold</label>
            {editingThreshold ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleSaveThreshold}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg">
                <span className="text-lg font-semibold text-slate-900">
                  {formatNumber(selectedTier.threshold)} points
                </span>
                <button
                  onClick={() => setEditingThreshold(true)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-sm text-slate-500 mt-2">{selectedTier.requirements}</p>
          </div>

          {/* Points Multiplier */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Points Multiplier</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="3"
                step="0.25"
                defaultValue={selectedTier.multiplier}
                className="flex-1"
              />
              <span className="w-16 text-center font-semibold text-slate-900">
                {selectedTier.multiplier}x
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Members earn {selectedTier.multiplier} point(s) per $1 spent
            </p>
          </div>

          {/* Color */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Tier Color</label>
            <div className="flex gap-3">
              {['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2', '#dc2626', '#2563eb', '#16a34a', '#9333ea'].map((color) => (
                <button
                  key={color}
                  className={`w-10 h-10 rounded-full border-2 ${
                    selectedTier.color === color ? 'border-primary-500' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <button className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
            Save Changes
          </button>
        </div>

        {/* Benefits Configuration */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Benefits</h2>
            <button
              onClick={() => setShowBenefitModal(true)}
              className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Benefit
            </button>
          </div>

          <div className="space-y-4">
            {selectedTier.benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium text-slate-700">{benefit}</span>
                </div>
                <button className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Available Benefits Library */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Available Benefits</h3>
            <div className="grid grid-cols-2 gap-3">
              {availableBenefits.map((benefit) => (
                <div
                  key={benefit.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-sm">
                    {icons[benefit.icon]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{benefit.name}</p>
                    <p className="text-xs text-slate-400">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Benefit Modal */}
      {showBenefitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add Benefit</h2>
              <button
                onClick={() => setShowBenefitModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Benefit Name</label>
                <input
                  type="text"
                  placeholder="e.g., Free Express Shipping"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  placeholder="Describe this benefit..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Icon</label>
                <div className="grid grid-cols-4 gap-2">
                  {availableBenefits.map((benefit) => (
                    <button
                      key={benefit.id}
                      className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {icons[benefit.icon]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBenefitModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBenefit}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                Add Benefit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tier Modal */}
      {showAddTierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add New Tier</h2>
              <button
                onClick={() => setShowAddTierModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tier Name</label>
                <input
                  type="text"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  placeholder="e.g., Diamond"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Points Threshold</label>
                <input
                  type="number"
                  placeholder="e.g., 1000000"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tier Color</label>
                <div className="flex gap-3">
                  {['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2', '#dc2626', '#2563eb', '#16a34a', '#9333ea'].map((color) => (
                    <button
                      key={color}
                      className="w-10 h-10 rounded-full border-2 border-transparent hover:border-primary-500 transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddTierModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTier}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                Create Tier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
