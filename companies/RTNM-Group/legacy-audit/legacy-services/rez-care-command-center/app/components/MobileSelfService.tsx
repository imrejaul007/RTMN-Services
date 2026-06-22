'use client';

import React, { useState, useEffect } from 'react';

// Types
interface Issue {
  id: string;
  category: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  platform: string;
}

interface SelfServiceAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'retry_payment' | 'sync_wallet' | 'retry_cashback' | 'track_refund' | 'view_history' | 'report_issue';
}

interface HelpArticle {
  id: string;
  title: string;
  preview: string;
  category: string;
}

// API Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4058';

async function apiCall(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-customer-id': localStorage.getItem('customerId') || '',
      'x-customer-phone': localStorage.getItem('customerPhone') || '',
      ...options?.headers,
    },
  });
  return res.json();
}

// Icons
const Icons = {
  payment: '💳',
  wallet: '👛',
  cashback: '💰',
  refund: '🔄',
  history: '📋',
  issue: '🚨',
  check: '✅',
  clock: '⏰',
  chat: '💬',
  phone: '📞',
  back: '←',
  close: '✕',
};

export default function MobileSelfService() {
  const [customerId] = useState(localStorage.getItem('customerId') || '');
  const [phone] = useState(localStorage.getItem('customerPhone') || '');
  const [view, setView] = useState<'home' | 'history' | 'actions' | 'help' | 'report'>('home');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Actions
  const quickActions: SelfServiceAction[] = [
    { id: '1', title: 'Retry Payment', description: 'Try failed payment again', icon: Icons.payment, type: 'retry_payment' },
    { id: '2', title: 'Sync Wallet', description: 'Update wallet balance', icon: Icons.wallet, type: 'sync_wallet' },
    { id: '3', title: 'Retry Cashback', description: 'Credit stuck cashback', icon: Icons.cashback, type: 'retry_cashback' },
    { id: '4', title: 'Track Refund', description: 'Check refund status', icon: Icons.refund, type: 'track_refund' },
    { id: '5', title: 'My Issues', description: 'View issue history', icon: Icons.history, type: 'view_history' },
    { id: '6', title: 'Report Issue', description: 'Report a new issue', icon: Icons.issue, type: 'report_issue' },
  ];

  // Help Topics
  const helpTopics: HelpArticle[] = [
    { id: 'p1', title: 'Payment Failed', preview: 'Steps to resolve payment issues', category: 'Payment' },
    { id: 'p2', title: 'Refund Not Received', preview: 'When and how refunds are processed', category: 'Payment' },
    { id: 'o1', title: 'Track Your Order', preview: 'How to track your delivery', category: 'Order' },
    { id: 'o2', title: 'Wrong Item', preview: 'Report wrong items delivered', category: 'Order' },
    { id: 'w1', title: 'Wallet Balance', preview: 'Understanding wallet balance', category: 'Wallet' },
    { id: 'w2', title: 'Cashback Issues', preview: 'Cashback not credited?', category: 'Wallet' },
    { id: 'a1', title: 'Login Issues', preview: 'Can\'t access your account?', category: 'Account' },
    { id: 'a2', title: 'Update Phone', preview: 'Change your phone number', category: 'Account' },
  ];

  // Load issues on mount
  useEffect(() => {
    if (customerId) {
      loadIssues();
    }
  }, [customerId]);

  async function loadIssues() {
    setLoading(true);
    try {
      const res = await apiCall('/api/mobile/history');
      if (res.success) {
        setIssues(res.data?.history || []);
      }
    } catch (error) {
      console.error('Failed to load issues');
    }
    setLoading(false);
  }

  async function executeAction(action: SelfServiceAction) {
    setLoading(true);
    setMessage(null);

    try {
      switch (action.type) {
        case 'retry_payment':
          const orderId = prompt('Enter Order ID:');
          if (orderId) {
            const res = await apiCall('/api/mobile/retry-payment', {
              method: 'POST',
              body: JSON.stringify({ orderId }),
            });
            setMessage(res.success ? { type: 'success', text: 'Payment retry initiated' } : { type: 'error', text: res.error });
          }
          break;

        case 'sync_wallet':
          const syncRes = await apiCall('/api/mobile/sync-wallet', { method: 'POST' });
          setMessage(syncRes.success ? { type: 'success', text: 'Wallet synced successfully' } : { type: 'error', text: syncRes.error });
          break;

        case 'retry_cashback':
          const txId = prompt('Enter Transaction ID:');
          if (txId) {
            const res = await apiCall('/api/mobile/retry-cashback', {
              method: 'POST',
              body: JSON.stringify({ transactionId: txId }),
            });
            setMessage(res.success ? { type: 'success', text: 'Cashback retry initiated' } : { type: 'error', text: res.error });
          }
          break;

        case 'track_refund':
          const refundTxId = prompt('Enter Transaction ID:');
          if (refundTxId) {
            const res = await apiCall(`/api/mobile/refund-status/${refundTxId}`);
            if (res.success) {
              const { status, estimatedTime } = res.data;
              setMessage({ type: 'success', text: `Refund Status: ${status}. ETA: ${estimatedTime}` });
            }
          }
          break;

        case 'view_history':
          setView('history');
          break;

        case 'report_issue':
          setView('report');
          break;
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Action failed. Please try again.' });
    }

    setLoading(false);
  }

  async function submitIssue(formData: { platform: string; category: string; description: string }) {
    setLoading(true);
    try {
      const res = await apiCall('/api/mobile/report-issue', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Issue reported! We\'ll get back to you soon.' });
        setView('home');
        loadIssues();
      } else {
        setMessage({ type: 'error', text: res.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit issue' });
    }
    setLoading(false);
  }

  // Render Home
  function renderHome() {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">How can we help?</h1>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => executeAction(action)}
              className="bg-white rounded-xl p-4 shadow-sm border text-left hover:shadow-md transition"
            >
              <span className="text-2xl">{action.icon}</span>
              <h3 className="font-semibold mt-2">{action.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{action.description}</p>
            </button>
          ))}
        </div>

        {/* Help Topics */}
        <div>
          <h2 className="font-semibold mb-3">Browse Help Topics</h2>
          <div className="space-y-2">
            {helpTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setView('help')}
                className="w-full bg-white rounded-lg p-3 shadow-sm text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-blue-500">{topic.category}</span>
                    <h3 className="font-medium">{topic.title}</h3>
                    <p className="text-xs text-gray-500">{topic.preview}</p>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <h3 className="font-semibold">Need more help?</h3>
          <div className="flex gap-3 mt-3">
            <button className="flex-1 bg-blue-500 text-white rounded-lg py-2 flex items-center justify-center gap-2">
              <span>{Icons.chat}</span>
              Chat
            </button>
            <button className="flex-1 bg-green-500 text-white rounded-lg py-2 flex items-center justify-center gap-2">
              <span>{Icons.phone}</span>
              Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render History
  function renderHistory() {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <button onClick={() => setView('home')} className="mr-3 text-xl">
            {Icons.back}
          </button>
          <h1 className="text-xl font-bold">My Issues</h1>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : issues.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">📋</span>
            <p className="text-gray-500 mt-2">No issues reported yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div key={issue.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    issue.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    issue.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">{issue.platform}</span>
                </div>
                <h3 className="font-semibold">{issue.category}</h3>
                <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(issue.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render Report Issue
  function renderReportIssue() {
    const [platform, setPlatform] = useState('restaurant');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');

    const categories = {
      restaurant: ['Wrong Item', 'Late Delivery', 'Quality Issue', 'Missing Item', 'Billing Issue'],
      hotel: ['Room Issue', 'Service Issue', 'Billing', 'Cancellation', 'Check-in Problem'],
      retail: ['Wrong Item', 'Damaged Product', 'Missing Item', 'Size Issue'],
      delivery: ['Late Delivery', 'Wrong Address', 'Driver Issue', 'Missing Package'],
    };

    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <button onClick={() => setView('home')} className="mr-3 text-xl">
            {Icons.back}
          </button>
          <h1 className="text-xl font-bold">Report Issue</h1>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitIssue({ platform, category, description });
          }}
          className="space-y-4"
        >
          {/* Platform */}
          <div>
            <label className="block text-sm font-medium mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => { setPlatform(e.target.value); setCategory(''); }}
              className="w-full p-3 border rounded-lg"
            >
              <option value="restaurant">Restaurant</option>
              <option value="hotel">Hotel</option>
              <option value="retail">Retail</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1">Issue Type</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border rounded-lg"
              required
            >
              <option value="">Select issue type</option>
              {categories[platform as keyof typeof categories]?.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe your issue..."
              className="w-full p-3 border rounded-lg h-32 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Issue'}
          </button>
        </form>
      </div>
    );
  }

  // Render Help
  function renderHelp() {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <button onClick={() => setView('home')} className="mr-3 text-xl">
            {Icons.back}
          </button>
          <h1 className="text-xl font-bold">Help Center</h1>
        </div>

        <div className="space-y-3">
          {helpTopics.map((topic) => (
            <div key={topic.id} className="bg-white rounded-xl p-4 shadow-sm">
              <span className="text-xs text-blue-500 font-medium">{topic.category}</span>
              <h3 className="font-semibold mt-1">{topic.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{topic.preview}</p>
              <button className="mt-2 text-blue-500 text-sm font-medium">
                Read More →
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Message Toast
  function renderMessage() {
    if (!message) return null;
    return (
      <div className={`fixed top-4 left-4 right-4 p-4 rounded-xl shadow-lg z-50 ${
        message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}>
        {message.text}
        <button onClick={() => setMessage(null)} className="ml-4 font-bold">✕</button>
      </div>
    );
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gray-50">
      {message && renderMessage()}

      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        {view === 'home' && renderHome()}
        {view === 'history' && renderHistory()}
        {view === 'report' && renderReportIssue()}
        {view === 'help' && renderHelp()}
      </div>
    </div>
  );
}
