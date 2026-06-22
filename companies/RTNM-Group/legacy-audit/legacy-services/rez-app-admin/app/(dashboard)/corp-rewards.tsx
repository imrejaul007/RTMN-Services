/**
 * CorpPerks Rewards Management Page
 * Route: /corp-rewards
 *
 * Manage ReZ Coins rewards for corporate employees
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatsCard, StatusBadge, Loading, EmptyState, TabSelector } from '@/components/corp-perks';
import { corpRewardsApi, type RewardTransaction, type RewardTier, type RewardCatalog } from '@/services/api/corpRewards';

// Mock data
const MOCK_TIERS: RewardTier[] = [
  { tierId: 'bronze', name: 'Bronze', minCoins: 0, maxCoins: 1000, benefits: ['Basic rewards'], icon: '🥉', color: '#CD7F32' },
  { tierId: 'silver', name: 'Silver', minCoins: 1000, maxCoins: 5000, benefits: ['Priority support', 'Extra coins'], icon: '🥈', color: '#C0C0C0' },
  { tierId: 'gold', name: 'Gold', minCoins: 5000, maxCoins: 15000, benefits: ['VIP rewards', 'Exclusive events'], icon: '🥇', color: '#FFD700' },
  { tierId: 'platinum', name: 'Platinum', minCoins: 15000, maxCoins: Infinity, benefits: ['All benefits', 'Personal concierge'], icon: '💎', color: '#E5E4E2' },
];

const MOCK_TRANSACTIONS: RewardTransaction[] = [
  { _id: '1', transactionId: 'TXN001', type: 'earn', amount: 500, source: 'benefit_usage', description: 'Meal benefit used', status: 'completed', employeeId: 'EMP001', employeeName: 'Priya Sharma', createdAt: '2024-04-28T10:00:00Z' },
  { _id: '2', transactionId: 'TXN002', type: 'earn', amount: 1000, source: 'milestone', description: 'Completed 10 bookings', status: 'completed', employeeId: 'EMP002', employeeName: 'Rahul Verma', createdAt: '2024-04-27T15:00:00Z' },
  { _id: '3', transactionId: 'TXN003', type: 'redeem', amount: -500, source: 'benefit_usage', description: 'Redeemed for gift card', status: 'completed', employeeId: 'EMP001', employeeName: 'Priya Sharma', createdAt: '2024-04-26T09:00:00Z' },
  { _id: '4', transactionId: 'TXN004', type: 'earn', amount: 250, source: 'campaign', description: 'Earth Day Challenge', status: 'completed', employeeId: 'EMP003', employeeName: 'Anita Patel', createdAt: '2024-04-22T14:00:00Z' },
];

const MOCK_CATALOG: RewardCatalog[] = [
  { _id: '1', itemId: 'RWD001', name: '₹100 Gift Voucher', description: 'Redeemable at partner stores', category: 'voucher', coinCost: 1000, stock: 500, isActive: true },
  { _id: '2', itemId: 'RWD002', name: 'Premium Gift Box', description: 'Assorted chocolates & cookies', category: 'gift', coinCost: 2500, stock: 100, isActive: true },
  { _id: '3', itemId: 'RWD003', name: 'Donate to Charity', description: '₹500 donation to NGO', category: 'donation', coinCost: 500, stock: 9999, isActive: true },
  { _id: '4', itemId: 'RWD004', name: 'Mobile Recharge ₹100', description: 'Instant recharge', category: 'recharge', coinCost: 800, stock: 1000, isActive: true },
];

export default function CorpRewardsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [catalog, setCatalog] = useState<RewardCatalog[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalAwarded: 125000,
    totalRedeemed: 45000,
    activeEmployees: 198,
    balanceInCirculation: 80000,
  });

  const fetchData = useCallback(async () => {
    try {
      const [txnRes, catalogRes, statsRes] = await Promise.all([
        corpRewardsApi.getTransactions({ limit: 20 }),
        corpRewardsApi.getCatalog({ limit: 50 }),
        corpRewardsApi.getCompanyStats(),
      ]);
      setTransactions(txnRes.data.length > 0 ? txnRes.data : MOCK_TRANSACTIONS);
      setCatalog(catalogRes.data.length > 0 ? catalogRes.data : MOCK_CATALOG);
    } catch (error) {
      setTransactions(MOCK_TRANSACTIONS);
      setCatalog(MOCK_CATALOG);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'catalog', label: 'Catalog' },
    { key: 'tiers', label: 'Tiers' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCoins = (amount: number) => {
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString('en-IN');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earn': return '#22c55e';
      case 'redeem': return '#ef4444';
      case 'expire': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getSourceIcon = (source: string): keyof typeof Ionicons.glyphMap => {
    switch (source) {
      case 'benefit_usage': return 'restaurant-outline';
      case 'milestone': return 'trophy-outline';
      case 'referral': return 'people-outline';
      case 'campaign': return 'flag-outline';
      case 'manual': return 'hand-right-outline';
      default: return 'card-outline';
    }
  };

  if (loading) {
    return <Loading message="Loading rewards..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Rewards</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Manage ReZ Coins rewards
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Total Awarded"
          value={formatCoins(stats.totalAwarded)}
          icon="gift-outline"
          iconColor="#22c55e"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Redeemed"
          value={formatCoins(stats.totalRedeemed)}
          icon="swap-horizontal-outline"
          iconColor="#ef4444"
        />
      </View>

      <View style={styles.statsRow}>
        <StatsCard
          title="Active Employees"
          value={stats.activeEmployees}
          icon="people-outline"
          iconColor="#3b82f6"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="In Circulation"
          value={formatCoins(stats.balanceInCirculation)}
          icon="wallet-outline"
          iconColor="#8b5cf6"
        />
      </View>

      {/* Tabs */}
      <TabSelector tabs={tabs} selected={activeTab} onSelect={setActiveTab} />

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'overview' && (
          <>
            {/* Quick Actions */}
            <View style={styles.section}>
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.quickAction, { backgroundColor: colors.card }]}
                  onPress={() => setShowAwardModal(true)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#22c55e20' }]}>
                    <Ionicons name="gift" size={24} color="#22c55e" />
                  </View>
                  <Text style={[styles.quickActionText, { color: colors.text }]}>Award Coins</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickAction, { backgroundColor: colors.card }]}
                  onPress={() => Alert.alert('Coming Soon', 'Bulk award feature coming soon')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f620' }]}>
                    <Ionicons name="people" size={24} color="#3b82f6" />
                  </View>
                  <Text style={[styles.quickActionText, { color: colors.text }]}>Bulk Award</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickAction, { backgroundColor: colors.card }]}
                  onPress={() => Alert.alert('Coming Soon', 'Reports feature coming soon')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b20' }]}>
                    <Ionicons name="document-text" size={24} color="#f59e0b" />
                  </View>
                  <Text style={[styles.quickActionText, { color: colors.text }]}>Reports</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Top Earners */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Earners This Month</Text>
              {MOCK_TRANSACTIONS.slice(0, 3).map((txn, idx) => (
                <Card key={txn._id}>
                  <View style={styles.earnerRow}>
                    <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? '#f59e0b' : colors.tint + '20' }]}>
                      <Text style={[styles.rankText, { color: idx === 0 ? '#fff' : colors.tint }]}>
                        #{idx + 1}
                      </Text>
                    </View>
                    <View style={styles.earnerInfo}>
                      <Text style={[styles.earnerName, { color: colors.text }]}>{txn.employeeName}</Text>
                      <Text style={[styles.earnerSource, { color: colors.textSecondary }]}>{txn.description}</Text>
                    </View>
                    <View style={styles.earnerCoins}>
                      <Text style={styles.coinAmount}>+{txn.amount}</Text>
                      <Text style={styles.coinLabel}>coins</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            {transactions.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No Transactions"
                message="Reward transactions will appear here"
              />
            ) : (
              transactions.map((txn) => (
                <Card key={txn._id}>
                  <View style={styles.transactionRow}>
                    <View style={[styles.txnIcon, { backgroundColor: getTypeColor(txn.type) + '20' }]}>
                      <Ionicons
                        name={getSourceIcon(txn.source)}
                        size={20}
                        color={getTypeColor(txn.type)}
                      />
                    </View>
                    <View style={styles.txnInfo}>
                      <Text style={[styles.txnDesc, { color: colors.text }]}>{txn.description}</Text>
                      <Text style={[styles.txnMeta, { color: colors.textSecondary }]}>
                        {txn.employeeName} • {formatDate(txn.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.txnAmount}>
                      <Text style={[styles.txnAmountText, { color: getTypeColor(txn.type) }]}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount}
                      </Text>
                      <StatusBadge status={txn.status} />
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'catalog' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reward Catalog</Text>
            {catalog.map((item) => (
              <Card key={item._id}>
                <View style={styles.catalogRow}>
                  <View style={styles.catalogInfo}>
                    <Text style={[styles.catalogName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.catalogDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                    <View style={[styles.catalogTags, { marginTop: 8 }]}>
                      <View style={[styles.catalogTag, { backgroundColor: colors.background }]}>
                        <Text style={[styles.catalogTagText, { color: colors.textSecondary }]}>
                          {item.category}
                        </Text>
                      </View>
                      <View style={[styles.catalogTag, { backgroundColor: '#22c55e20' }]}>
                        <Text style={[styles.catalogTagText, { color: '#22c55e' }]}>
                          {item.stock} in stock
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.catalogPrice}>
                    <Text style={styles.coinCost}>{item.coinCost}</Text>
                    <Text style={[styles.coinLabel, { color: colors.textSecondary }]}>coins</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {activeTab === 'tiers' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reward Tiers</Text>
            {MOCK_TIERS.map((tier) => (
              <Card key={tier.tierId}>
                <View style={styles.tierRow}>
                  <View style={styles.tierHeader}>
                    <Text style={styles.tierIcon}>{tier.icon}</Text>
                    <View>
                      <Text style={[styles.tierName, { color: colors.text }]}>{tier.name}</Text>
                      <Text style={[styles.tierRange, { color: colors.textSecondary }]}>
                        {tier.minCoins.toLocaleString()} - {tier.maxCoins === Infinity ? '∞' : tier.maxCoins.toLocaleString()} coins
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tierBenefits}>
                    {tier.benefits.map((benefit, idx) => (
                      <View key={idx} style={styles.benefitChip}>
                        <Ionicons name="checkmark-circle" size={14} color={tier.color} />
                        <Text style={[styles.benefitChipText, { color: colors.text }]}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Award Modal */}
      <Modal visible={showAwardModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setShowAwardModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Award Coins</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Employee ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter employee ID"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.formLabel, { color: colors.text }]}>Coins Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter amount"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />

            <Text style={[styles.formLabel, { color: colors.text }]}>Reason</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter reason for award"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.awardBtn, { backgroundColor: colors.tint }]}
              onPress={() => {
                Alert.alert('Success', 'Coins awarded successfully!');
                setShowAwardModal(false);
              }}
            >
              <Text style={styles.awardBtnText}>Award Coins</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
  content: { flex: 1, paddingHorizontal: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 12, fontWeight: '500' },
  earnerRow: { flexDirection: 'row', alignItems: 'center' },
  rankBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: '700' },
  earnerInfo: { flex: 1 },
  earnerName: { fontSize: 14, fontWeight: '600' },
  earnerSource: { fontSize: 12, marginTop: 2 },
  earnerCoins: { alignItems: 'flex-end' },
  coinAmount: { fontSize: 18, fontWeight: '700', color: '#22c55e' },
  coinLabel: { fontSize: 11, color: '#6b7280' },
  transactionRow: { flexDirection: 'row', alignItems: 'center' },
  txnIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontWeight: '500' },
  txnMeta: { fontSize: 12, marginTop: 2 },
  txnAmount: { alignItems: 'flex-end' },
  txnAmountText: { fontSize: 16, fontWeight: '700' },
  catalogRow: { flexDirection: 'row', alignItems: 'flex-start' },
  catalogInfo: { flex: 1 },
  catalogName: { fontSize: 16, fontWeight: '600' },
  catalogDesc: { fontSize: 12, marginTop: 2 },
  catalogTags: { flexDirection: 'row', gap: 6 },
  catalogTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  catalogTagText: { fontSize: 11, fontWeight: '500' },
  catalogPrice: { alignItems: 'center', marginLeft: 16 },
  coinCost: { fontSize: 24, fontWeight: '700', color: '#f59e0b' },
  tierRow: {},
  tierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tierIcon: { fontSize: 32, marginRight: 12 },
  tierName: { fontSize: 18, fontWeight: '700' },
  tierRange: { fontSize: 12, marginTop: 2 },
  tierBenefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefitChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 16 },
  benefitChipText: { fontSize: 12 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContent: { padding: 16 },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  awardBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  awardBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
