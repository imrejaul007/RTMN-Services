'use client';

import React, { useState, useEffect } from 'react';
import { getStoredUser } from '@/lib/rezAuth';
import { getTransactions } from '@/lib/rezWallet';
import { createClient } from '@/lib/supabase';

interface RedemptionRecord {
  id: string;
  type: 'coin' | 'sample' | 'consultation' | 'discount' | 'gift';
  title: string;
  description: string;
  value: number;
  status: 'pending' | 'completed' | 'cancelled';
  recipientEmail?: string;
  redeemedAt: string;
  expiresAt?: string;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  coinType: string;
  source: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export default function RedemptionHistoryPage() {
  const [user, setUser] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'coin' | 'sample' | 'consultation' | 'gift'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = getStoredUser();
      setUser(currentUser);

      if (currentUser) {
        // Load transactions from wallet
        const txData = await getTransactions(1, 50);
        setTransactions(txData.transactions);

        // Load redemptions from local DB
        await loadRedemptions(currentUser.id);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRedemptions = async (userId: string) => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .eq('user_id', userId)
        .order('redeemed_at', { ascending: false });

      if (!error && data) {
        setRedemptions(data as RedemptionRecord[]);
      } else {
        // Mock data for demo
        setRedemptions([
          {
            id: 'red_1',
            type: 'coin',
            title: 'Redeemed at StoreX',
            description: 'Used 500 REZ coins for purchase discount',
            value: 500,
            status: 'completed',
            redeemedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'red_2',
            type: 'gift',
            title: 'Gift to friend@email.com',
            description: 'Gift card for birthday',
            value: 200,
            status: 'completed',
            recipientEmail: 'friend@email.com',
            redeemedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'red_3',
            type: 'sample',
            title: 'Free Product Sample',
            description: 'Collected from Store Y',
            value: 1,
            status: 'completed',
            redeemedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Load redemptions error:', error);
      // Mock data
      setRedemptions([
        {
          id: 'red_1',
          type: 'coin',
          title: 'Redeemed at StoreX',
          description: 'Used 500 REZ coins for purchase discount',
          value: 500,
          status: 'completed',
          redeemedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'coin':
        return (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M9 9h6M9 15h6" />
            </svg>
          </div>
        );
      case 'sample':
        return (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        );
      case 'consultation':
        return (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
        );
      case 'gift':
        return (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#fce7f3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2">
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
        );
    }
  };

  const filteredRedemptions = activeTab === 'all'
    ? redemptions
    : redemptions.filter(r => r.type === activeTab);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'coin', label: 'Coins' },
    { id: 'sample', label: 'Samples' },
    { id: 'consultation', label: 'Consultations' },
    { id: 'gift', label: 'Gifts' },
  ] as const;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6b7280' }}>Loading history...</p>
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#1f2937' }}>
          Redemption History
        </h1>
        <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
          Track your rewards and gift history
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
        }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>
            {redemptions.filter(r => r.status === 'completed').length}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>Completed</p>
        </div>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
        }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
            {redemptions.filter(r => r.status === 'pending').length}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>Pending</p>
        </div>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
        }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            {redemptions.reduce((sum, r) => sum + (r.type === 'coin' ? r.value : 0), 0)}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>Total Coins Used</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '4px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              whiteSpace: 'nowrap',
              backgroundColor: activeTab === tab.id ? '#6366f1' : '#f3f4f6',
              color: activeTab === tab.id ? 'white' : '#6b7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History List */}
      {filteredRedemptions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
        }}>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
            No redemption history yet
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRedemptions.map(redemption => (
            <div
              key={redemption.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                {getTypeIcon(redemption.type)}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                        {redemption.title}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                        {redemption.description}
                      </p>
                    </div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: redemption.status === 'completed' ? '#dcfce7' : '#fef3c7',
                      color: redemption.status === 'completed' ? '#166534' : '#92400e',
                    }}>
                      {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                    </span>
                  </div>

                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {formatRelativeTime(redemption.redeemedAt)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#d1d5db' }}>|</span>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {formatDate(redemption.redeemedAt)}
                      </span>
                    </div>
                    {redemption.recipientEmail && (
                      <span style={{ fontSize: '12px', color: '#6366f1' }}>
                        To: {redemption.recipientEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gift to Friend CTA */}
      <div style={{
        marginTop: '24px',
        backgroundColor: '#fef3c7',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#92400e' }}>
          Share with a Friend
        </h3>
        <p style={{ margin: '8px 0 16px', fontSize: '14px', color: '#b45309' }}>
          Gift your rewards to friends and family
        </p>
        <button
          onClick={() => alert('Gift feature coming soon!')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Gift to Friend
        </button>
      </div>
    </div>
  );
}
