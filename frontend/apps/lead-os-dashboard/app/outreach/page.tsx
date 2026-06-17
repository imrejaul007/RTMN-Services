'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Trash2, Mail, Linkedin, Twitter, MessageSquare, MoreVertical, Eye, Edit, BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import { leadOS } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  channels: string[];
  sent: number;
  opened: number;
  replied: number;
  converted: number;
  createdAt: string;
}

export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const data = await leadOS.getCampaigns();
      setCampaigns(data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeTab === 'all') return true;
    return c.status === activeTab;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return Mail;
      case 'linkedin':
        return Linkedin;
      case 'twitter':
        return Twitter;
      default:
        return MessageSquare;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return 'bg-gray-100 text-gray-700';
      case 'linkedin':
        return 'bg-[#0077b5]/10 text-[#0077b5]';
      case 'twitter':
        return 'bg-black/10 text-black';
      default:
        return 'bg-green-100 text-green-700';
    }
  };

  const calculateRate = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const config = {
      active: { label: 'Active', class: 'badge-active' },
      paused: { label: 'Paused', class: 'badge-paused' },
      draft: { label: 'Draft', class: 'badge-draft' },
      completed: { label: 'Completed', class: 'bg-blue-100 text-blue-700' },
    };
    const { label, class: className } = config[status];
    return <span className={clsx('badge', className)}>{label}</span>;
  };

  const toggleCampaignStatus = (campaign: Campaign) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaign.id
          ? { ...c, status: c.status === 'active' ? 'paused' : 'active' }
          : c
      )
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage your multi-channel outreach campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-gray-900">{campaigns.length}</div>
          <div className="text-sm text-gray-500">Total Campaigns</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-green-600">
            {campaigns.filter((c) => c.status === 'active').length}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {campaigns.reduce((sum, c) => sum + c.sent, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Emails Sent</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-purple-600">
            {calculateRate(
              campaigns.reduce((sum, c) => sum + c.replied, 0),
              campaigns.reduce((sum, c) => sum + c.sent, 0)
            )}
          </div>
          <div className="text-sm text-gray-500">Avg Reply Rate</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="border-b px-4">
          <div className="flex gap-4">
            {(['all', 'active', 'paused', 'draft'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab !== 'all' && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                    {campaigns.filter((c) => c.status === tab).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Campaign List */}
        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4 mx-auto" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-500">Create your first outreach campaign to get started.</p>
            </div>
          ) : (
            filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <div className="flex gap-2">
                      {campaign.channels.map((channel) => {
                        const Icon = getChannelIcon(channel);
                        return (
                          <span
                            key={channel}
                            className={clsx('flex items-center gap-1 px-2 py-1 rounded text-xs', getChannelColor(channel))}
                          >
                            <Icon className="w-3 h-3" />
                            {channel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleCampaignStatus(campaign)}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        campaign.status === 'active'
                          ? 'hover:bg-yellow-100 text-yellow-600'
                          : 'hover:bg-green-100 text-green-600'
                      )}
                      title={campaign.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {campaign.status === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                      <BarChart3 className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Sent</div>
                    <div className="text-lg font-semibold">{campaign.sent.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Opened ({calculateRate(campaign.opened, campaign.sent)})</div>
                    <div className="text-lg font-semibold">{campaign.opened.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Replied ({calculateRate(campaign.replied, campaign.sent)})</div>
                    <div className="text-lg font-semibold">{campaign.replied.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Converted ({calculateRate(campaign.converted, campaign.sent)})</div>
                    <div className="text-lg font-semibold">{campaign.converted.toLocaleString()}</div>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="mt-4 flex gap-2 h-2">
                  <div className="flex-1 bg-blue-500 rounded-l-full" style={{ width: `${(campaign.opened / campaign.sent) * 100}%` }} />
                  <div className="flex-1 bg-purple-500" style={{ width: `${((campaign.replied - campaign.converted) / campaign.sent) * 100}%` }} />
                  <div className="flex-1 bg-green-500 rounded-r-full" style={{ width: `${(campaign.converted / campaign.sent) * 100}%` }} />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" /> Opened</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded-full" /> Replied</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Converted</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Create Campaign</h2>
            <p className="text-gray-500">Campaign creation form would go here.</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
