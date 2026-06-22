'use client';

import React, { useState, useEffect } from 'react';
import { getStoredUser } from '@/lib/rezAuth';
import { getBalance, getTransactions } from '@/lib/rezWallet';
import RedemptionQR from '@/components/RedemptionQR';

interface Reward {
  id: string;
  type: 'coin' | 'sample' | 'consultation' | 'discount';
  title: string;
  description: string;
  value: number;
  status: 'available' | 'pending' | 'redeemed' | 'expired';
  expiresAt?: string;
  earnedAt: string;
}

export default function RewardsPage() {
  const [user, setUser] = useState<any>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'redeemed'>('available');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = getStoredUser();
      setUser(currentUser);

      if (currentUser) {
        // Load balance
        const balanceData = await getBalance();
        if (balanceData) {
          const rezBalance = balanceData.balances.find((b: any) => b.coinType === 'rez');
          setBalance(rezBalance?.available || 0);
        }

        // Load rewards
        await loadRewards(currentUser.id);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRewards = async (userId: string) => {
    // Mock rewards data - in production, fetch from API
    const mockRewards: Reward[] = [
      {
        id: 'rew_1',
        type: 'coin',
        title: '50 REZ Coins',
        description: 'Reward from BrandX campaign scan',
        value: 50,
        status: 'available',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'rew_2',
        type: 'discount',
        title: '20% Off at StoreY',
        description: 'Exclusive discount for scanning our QR',
        value: 20,
        status: 'available',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'rew_3',
        type: 'coin',
        title: '100 REZ Coins',
        description: 'First scan bonus reward',
        value: 100,
        status: 'redeemed',
        earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    setRewards(mockRewards);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatValue = (reward: Reward) => {
    if (reward.type === 'coin') {
      return `${reward.value} Coins`;
    }
    if (reward.type === 'discount') {
      return `${reward.value}% Off`;
    }
    return `Value: Rs.${reward.value}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return { bg: '#dcfce7', text: '#166534' };
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'redeemed':
        return { bg: '#e0e7ff', text: '#3730a3' };
      case 'expired':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const filteredRewards = rewards.filter(r =>
    activeTab === 'available' ? r.status === 'available' : r.status === 'redeemed'
  );

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
          <p style={{ color: '#6b7280' }}>Loading rewards...</p>
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
      <div style={{
        marginBottom: '24px',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#1f2937' }}>
          My Rewards
        </h1>
        <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
          View and redeem your earned rewards
        </p>
      </div>

      {/* Balance Card */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '24px',
        color: 'white',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>REZ Coins Balance</p>
            <p style={{ margin: '8px 0 0', fontSize: '36px', fontWeight: 700 }}>
              {balance.toLocaleString()}
            </p>
          </div>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M9 9h6M9 15h6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '12px',
      }}>
        <button
          onClick={() => setActiveTab('available')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            backgroundColor: activeTab === 'available' ? '#6366f1' : '#f3f4f6',
            color: activeTab === 'available' ? 'white' : '#6b7280',
          }}
        >
          Available ({rewards.filter(r => r.status === 'available').length})
        </button>
        <button
          onClick={() => setActiveTab('redeemed')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            backgroundColor: activeTab === 'redeemed' ? '#6366f1' : '#f3f4f6',
            color: activeTab === 'redeemed' ? 'white' : '#6b7280',
          }}
        >
          Redeemed ({rewards.filter(r => r.status === 'redeemed').length})
        </button>
      </div>

      {/* Rewards List */}
      {filteredRewards.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            backgroundColor: '#e5e7eb',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
            {activeTab === 'available' ? 'No available rewards yet' : 'No redeemed rewards yet'}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#9ca3af' }}>
            {activeTab === 'available' ? 'Scan QR codes to earn rewards!' : 'Your redeemed rewards will appear here'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRewards.map(reward => {
            const statusColors = getStatusColor(reward.status);
            return (
              <div
                key={reward.id}
                onClick={() => setSelectedReward(reward)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                      }}>
                        {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {reward.type.charAt(0).toUpperCase() + reward.type.slice(1)}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                      {reward.title}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                      {reward.description}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#6366f1' }}>
                      {formatValue(reward)}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                      Earned {formatDate(reward.earnedAt)}
                    </p>
                  </div>
                </div>
                {reward.expiresAt && reward.status === 'available' && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#f59e0b' }}>
                      Expires: {formatDate(reward.expiresAt)}
                    </p>
                    <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 500 }}>
                      Tap to redeem
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Redemption Modal */}
      {selectedReward && selectedReward.status === 'available' && (
        <div
          onClick={() => setSelectedReward(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
            }}
          >
            <RedemptionQR
              rewardId={selectedReward.id}
              rewardType={selectedReward.type}
              rewardName={selectedReward.title}
              expiresAt={selectedReward.expiresAt}
            />
            <button
              onClick={() => setSelectedReward(null)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
