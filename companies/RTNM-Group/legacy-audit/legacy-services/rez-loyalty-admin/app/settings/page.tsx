'use client';

import { useState } from 'react';

interface REEDecisionRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}

interface RewardConfig {
  id: string;
  name: string;
  type: 'voucher' | 'discount' | 'product' | 'experience';
  pointsCost: number;
  value: string;
  stock: number | null;
  enabled: boolean;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
}

const initialREERules: REEDecisionRule[] = [
  {
    id: 'ree1',
    name: 'High-Value Customer Retention',
    description: 'Offer bonus points to customers with high lifetime value who show signs of churn',
    condition: 'lifetime_points > 100000 AND days_since_last_activity <= 30 AND churn_risk > 0.7',
    action: 'Award 5000 bonus points',
    priority: 1,
    enabled: true,
  },
  {
    id: 'ree2',
    name: 'New Member Welcome',
    description: 'Give bonus points to new members on their first purchase',
    condition: 'member_age <= 7 days AND transaction_amount >= 50',
    action: 'Award 250 bonus points + 2x multiplier for 7 days',
    priority: 2,
    enabled: true,
  },
  {
    id: 'ree3',
    name: 'Tier Upgrade Incentive',
    description: 'Encourage tier progression by offering bonus when close to next tier',
    condition: 'points_to_next_tier <= 5000 AND points_to_next_tier > 0',
    action: 'Award 2x points on next purchase',
    priority: 3,
    enabled: true,
  },
  {
    id: 'ree4',
    name: 'Inactive Member Reactivation',
    description: 'Re-engage members who have been inactive for 60+ days',
    condition: 'days_since_last_activity > 60',
    action: 'Send personalized offer with 1000 bonus points on next purchase',
    priority: 4,
    enabled: false,
  },
  {
    id: 'ree5',
    name: 'Referral Bonus',
    description: 'Reward members who refer new customers',
    condition: 'referral_count >= 1 AND referral_conversion > 0.5',
    action: 'Award 1000 points per successful referral',
    priority: 5,
    enabled: true,
  },
];

const initialRewardConfigs: RewardConfig[] = [
  { id: 'r1', name: '$5 Store Credit', type: 'voucher', pointsCost: 500, value: '$5', stock: null, enabled: true },
  { id: 'r2', name: '$10 Store Credit', type: 'voucher', pointsCost: 1000, value: '$10', stock: null, enabled: true },
  { id: 'r3', name: '$25 Store Credit', type: 'voucher', pointsCost: 2500, value: '$25', stock: null, enabled: true },
  { id: 'r4', name: '$50 Store Credit', type: 'voucher', pointsCost: 5000, value: '$50', stock: null, enabled: true },
  { id: 'r5', name: '10% Discount', type: 'discount', pointsCost: 2000, value: '10%', stock: null, enabled: true },
  { id: 'r6', name: '20% Discount', type: 'discount', pointsCost: 4000, value: '20%', stock: null, enabled: true },
  { id: 'r7', name: 'Free Small Coffee', type: 'product', pointsCost: 300, value: 'Small Coffee', stock: 500, enabled: true },
  { id: 'r8', name: 'Free Lunch Combo', type: 'product', pointsCost: 1500, value: 'Lunch Combo', stock: 200, enabled: false },
  { id: 'r9', name: 'VIP Event Access', type: 'experience', pointsCost: 10000, value: 'VIP Access', stock: 50, enabled: true },
  { id: 'r10', name: 'Meet & Greet Experience', type: 'experience', pointsCost: 25000, value: 'Meet & Greet', stock: 10, enabled: false },
];

const initialFeatureFlags: FeatureFlag[] = [
  { id: 'f1', name: 'Tier-Based Multipliers', description: 'Enable enhanced point earning rates based on membership tier', enabled: true, rolloutPercentage: 100 },
  { id: 'f2', name: 'Referral Program', description: 'Allow members to refer friends for bonus points', enabled: true, rolloutPercentage: 100 },
  { id: 'f3', name: 'Points Expiration', description: 'Automatically expire points after 12 months of inactivity', enabled: true, rolloutPercentage: 100 },
  { id: 'f4', name: 'Gamification Features', description: 'Enable badges, challenges, and leaderboards', enabled: true, rolloutPercentage: 50 },
  { id: 'f5', name: 'AI-Powered Recommendations', description: 'Use ML to recommend personalized rewards', enabled: false, rolloutPercentage: 0 },
  { id: 'f6', name: 'Dynamic Tiering', description: 'Allow tier downgrades based on activity', enabled: true, rolloutPercentage: 100 },
  { id: 'f7', name: 'Multi-Channel Earning', description: 'Earn points across online and in-store', enabled: true, rolloutPercentage: 100 },
  { id: 'f8', name: 'Crypto Redemption', description: 'Allow redemption to cryptocurrency wallet', enabled: false, rolloutPercentage: 0 },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'ree' | 'rewards' | 'features'>('ree');
  const [reeRules, setReeRules] = useState<REEDecisionRule[]>(initialREERules);
  const [rewardConfigs, setRewardConfigs] = useState<RewardConfig[]>(initialRewardConfigs);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(initialFeatureFlags);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [editingRule, setEditingRule] = useState<REEDecisionRule | null>(null);

  const handleToggleRule = (id: string) => {
    setReeRules(rules =>
      rules.map(rule =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const handleToggleReward = (id: string) => {
    setRewardConfigs(rewards =>
      rewards.map(reward =>
        reward.id === id ? { ...reward, enabled: !reward.enabled } : reward
      )
    );
  };

  const handleToggleFeature = (id: string) => {
    setFeatureFlags(flags =>
      flags.map(flag =>
        flag.id === id ? { ...flag, enabled: !flag.enabled } : flag
      )
    );
  };

  const handleSaveRule = () => {
    setEditingRule(null);
    setShowAddRuleModal(false);
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'voucher':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        );
      case 'discount':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      case 'product':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        );
      case 'experience':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500 mt-1">Configure REE decision rules, rewards, and feature flags.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-slate-200">
        {[
          { id: 'ree', label: 'REE Decision Rules', icon: 'brain' },
          { id: 'rewards', label: 'Reward Configuration', icon: 'gift' },
          { id: 'features', label: 'Feature Flags', icon: 'flag' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === tab.id
                ? 'text-primary-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.id === 'ree' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
            {tab.id === 'rewards' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            )}
            {tab.id === 'features' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            )}
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* REE Decision Rules Tab */}
      {activeTab === 'ree' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Decision Rules</h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure Real-Time Engagement (REE) rules that trigger automated actions
              </p>
            </div>
            <button
              onClick={() => setShowAddRuleModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Rule
            </button>
          </div>

          <div className="space-y-4">
            {reeRules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${
                  rule.enabled ? 'border-emerald-500' : 'border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{rule.name}</h3>
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                        Priority {rule.priority}
                      </span>
                      {!rule.enabled && (
                        <span className="px-2 py-1 bg-amber-100 rounded text-xs font-medium text-amber-600">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mb-4">{rule.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-slate-500 mb-1">Condition</p>
                        <code className="text-sm text-slate-800 font-mono">{rule.condition}</code>
                      </div>
                      <div className="bg-primary-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-primary-600 mb-1">Action</p>
                        <p className="text-sm text-primary-800 font-medium">{rule.action}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-6">
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reward Configuration Tab */}
      {activeTab === 'rewards' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Reward Catalog</h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure available rewards and their point costs
              </p>
            </div>
            <button
              onClick={() => setShowAddRewardModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Reward
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mb-6">
            {['All', 'Voucher', 'Discount', 'Product', 'Experience'].map((type) => (
              <button
                key={type}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewardConfigs.map((reward) => (
              <div
                key={reward.id}
                className={`bg-white rounded-xl shadow-sm p-5 border ${
                  reward.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      reward.type === 'voucher' ? 'bg-emerald-100 text-emerald-600' :
                      reward.type === 'discount' ? 'bg-amber-100 text-amber-600' :
                      reward.type === 'product' ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {getRewardIcon(reward.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{reward.name}</h3>
                      <p className="text-sm text-slate-500">{reward.value}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reward.enabled}
                      onChange={() => handleToggleReward(reward.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Points Cost</p>
                    <p className="text-lg font-bold text-slate-900">{reward.pointsCost.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Stock</p>
                    <p className="text-lg font-bold text-slate-900">
                      {reward.stock === null ? 'Unlimited' : reward.stock}
                    </p>
                  </div>
                </div>
                <button className="w-full mt-4 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  Edit Reward
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Flags Tab */}
      {activeTab === 'features' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Feature Flags</h2>
              <p className="text-sm text-slate-500 mt-1">
                Control feature rollout and system capabilities
              </p>
            </div>
            <button className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
              Add Feature Flag
            </button>
          </div>

          <div className="space-y-4">
            {featureFlags.map((flag) => (
              <div key={flag.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900">{flag.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        flag.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {flag.rolloutPercentage > 0 && flag.rolloutPercentage < 100 && (
                        <span className="px-2 py-1 bg-blue-100 rounded text-xs font-medium text-blue-600">
                          {flag.rolloutPercentage}% rollout
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{flag.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {flag.enabled && (
                      <div className="w-32">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={flag.rolloutPercentage}
                          onChange={(e) => {
                            setFeatureFlags(flags =>
                              flags.map(f =>
                                f.id === flag.id ? { ...f, rolloutPercentage: parseInt(e.target.value) } : f
                              )
                            );
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-slate-500 text-center">{flag.rolloutPercentage}%</p>
                      </div>
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flag.enabled}
                        onChange={() => handleToggleFeature(flag.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add REE Decision Rule</h2>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g., VIP Customer Appreciation"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  placeholder="Describe what this rule does..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Condition (REE Expression)</label>
                <textarea
                  placeholder="e.g., lifetime_points > 50000 AND churn_risk > 0.5"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Available variables: lifetime_points, days_since_last_activity, churn_risk, tier, referral_count, transaction_amount, member_age
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Action</label>
                <input
                  type="text"
                  placeholder="e.g., Award 5000 bonus points"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Execution order (1 = highest)"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Edit Rule: {editingRule.name}</h2>
              <button
                onClick={() => setEditingRule(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rule Name</label>
                <input
                  type="text"
                  defaultValue={editingRule.name}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Condition (REE Expression)</label>
                <textarea
                  defaultValue={editingRule.condition}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Action</label>
                <input
                  type="text"
                  defaultValue={editingRule.action}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                <input
                  type="number"
                  defaultValue={editingRule.priority}
                  min="1"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingRule(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setEditingRule(null)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
              >
                Delete Rule
              </button>
              <button
                onClick={() => setEditingRule(null)}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reward Modal */}
      {showAddRewardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add Reward</h2>
              <button
                onClick={() => setShowAddRewardModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reward Name</label>
                <input
                  type="text"
                  placeholder="e.g., $100 Gift Card"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="voucher">Voucher</option>
                  <option value="discount">Discount</option>
                  <option value="product">Product</option>
                  <option value="experience">Experience</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Value</label>
                <input
                  type="text"
                  placeholder="e.g., $100"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Points Cost</label>
                <input
                  type="number"
                  placeholder="e.g., 10000"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Stock (leave empty for unlimited)</label>
                <input
                  type="number"
                  placeholder="e.g., 100"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddRewardModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddRewardModal(false)}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                Create Reward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
