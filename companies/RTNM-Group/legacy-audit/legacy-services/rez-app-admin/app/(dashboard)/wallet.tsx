import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { s } from './styles/wallet.styles';
import {
  adminWalletService,
  AdminWalletSummary,
  AdminWalletTransaction,
  DailyBreakdownItem,
} from '../../services/api/adminWallet';
import { withErrorBoundary } from '../../components/ErrorBoundary';

type TabType = 'overview' | 'transactions' | 'breakdown';

function WalletScreenInner() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [summary, setSummary] = useState<AdminWalletSummary | null>(null);
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>([]);
  const [breakdown, setBreakdown] = useState<DailyBreakdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txHasMore, setTxHasMore] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  // BUG-001: Wrap fetch functions in useCallback to avoid stale closures in useEffect.
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await adminWalletService.getWalletSummary();
      setSummary(data);
    } catch (err: any) {
      logger.error('Failed to load wallet summary:', err);
      setError(err?.message || 'Failed to load wallet summary');
    }
  }, []);

  const loadTransactions = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setTxLoading(true);
      const data = await adminWalletService.getTransactionHistory(page, 20);
      const txList = data?.transactions ?? [];
      if (append) {
        setTransactions((prev) => [...prev, ...txList]);
      } else {
        setTransactions(txList);
      }
      setTxHasMore(data?.pagination?.hasNext ?? false);
      setTxPage(page);
    } catch (err: any) {
      logger.error('Failed to load transactions:', err);
      setError(err?.message || 'Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  }, []);

  const loadBreakdown = useCallback(async () => {
    try {
      const data = await adminWalletService.getDailyBreakdown(30);
      setBreakdown(data.breakdown);
    } catch (err: any) {
      logger.error('Failed to load breakdown:', err);
      setError(err?.message || 'Failed to load daily breakdown');
    }
  }, []);

  const loadData = useCallback(async () => {
    setError(null);
    await Promise.all([loadSummary(), loadTransactions(1), loadBreakdown()]);
    setIsLoading(false);
  }, [loadSummary, loadTransactions, loadBreakdown]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // BUG-035 FIX: wrap in useCallback — if passed to a FlatList onEndReached
  // without memoisation, a new reference is created every render, defeating
  // the VirtualizedList bail-out optimisation.
  const loadMoreTransactions = useCallback(() => {
    if (txHasMore && !txLoading) {
      loadTransactions(txPage + 1, true);
    }
  }, [txHasMore, txLoading, txPage, loadTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // BUG-011: Show error UI with retry button when API fails.
  if (error && !summary) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ color: colors.error, marginTop: 12, fontSize: 16, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={loadData}
          style={{
            marginTop: 16,
            paddingHorizontal: 24,
            paddingVertical: 10,
            backgroundColor: colors.tint,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderTab = (tab: TabType, label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity
      key={tab}
      style={[
        s.tab,
        { borderColor: colors.gray200 },
        activeTab === tab && { backgroundColor: colors.tint, borderColor: colors.tint },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons name={icon} size={16} color={activeTab === tab ? colors.card : colors.icon} />
      <Text style={[s.tabText, { color: activeTab === tab ? colors.card : colors.icon }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTransactionItem = ({ item }: { item: AdminWalletTransaction }) => (
    <View style={[s.txItem, { backgroundColor: colors.card }]}>
      <View
        style={[
          s.txIcon,
          { backgroundColor: item.type === 'commission' ? colors.successLight : colors.errorLight },
        ]}
      >
        <Ionicons
          name={item.type === 'commission' ? 'trending-up' : 'swap-horizontal'}
          size={18}
          color={item.type === 'commission' ? colors.success : colors.error}
        />
      </View>
      <View style={s.txDetails}>
        <Text style={[s.txDescription, { color: colors.text }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[s.txMeta, { color: colors.icon }]}>
          {item.orderNumber ? `Order #${item.orderNumber}` : item.type}
          {' · '}
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <Text
        style={[
          s.txAmount,
          { color: item.type === 'commission' ? colors.success : colors.error },
        ]}
      >
        {item.type === 'commission' ? '+' : '-'}
        {formatCurrency(Math.abs(item.amount))}
      </Text>
    </View>
  );

  const renderOverview = () => (
    <ScrollView
      style={s.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Balance Cards */}
      <View style={s.balanceSection}>
        <View style={[s.balanceCard, { backgroundColor: colors.tint }]}>
          <Text style={s.balanceLabel}>Total Balance</Text>
          <Text style={s.balanceAmount}>{formatCurrency(summary?.balance?.total || 0)}</Text>
          <Text style={s.balanceSub}>
            Available: {formatCurrency(summary?.balance?.available || 0)}
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={s.statsSection}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Statistics</Text>
        <View style={s.statsGrid}>
          <View style={[s.statCard, { backgroundColor: colors.card }]}>
            <View style={[s.statIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="cash" size={20} color={colors.success} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>
              {formatCurrency(summary?.statistics?.totalCommissions || 0)}
            </Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>Total Commissions</Text>
          </View>

          <View style={[s.statCard, { backgroundColor: colors.card }]}>
            <View style={[s.statIcon, { backgroundColor: colors.infoLighter }]}>
              <Ionicons name="receipt" size={20} color={colors.info} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>
              {summary?.statistics?.totalOrders || 0}
            </Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>Total Orders</Text>
          </View>

          <View style={[s.statCard, { backgroundColor: colors.card }]}>
            <View style={[s.statIcon, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="analytics" size={20} color={colors.warning} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>
              {formatCurrency(summary?.statistics?.averageCommission || 0)}
            </Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>Avg Commission</Text>
          </View>

          <View style={[s.statCard, { backgroundColor: colors.card }]}>
            <View style={[s.statIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="pie-chart" size={20} color={colors.purple} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>
              {summary?.statistics?.commissionRate != null
                ? `${(summary.statistics.commissionRate * 100).toFixed(1)}%`
                : 'N/A'}
            </Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>Commission Rate</Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={s.recentSection}>
        <View style={s.recentHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => setActiveTab('transactions')}>
            <Text style={[s.viewAllText, { color: colors.tint }]}>View All</Text>
          </TouchableOpacity>
        </View>
        {(summary?.recentTransactions || []).length === 0 ? (
          <View style={[s.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons name="wallet-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>
              No transactions yet. Commission will appear here when orders are placed.
            </Text>
          </View>
        ) : (
          summary?.recentTransactions
            .slice(0, 5)
            .map((tx) => <View key={tx._id}>{renderTransactionItem({ item: tx })}</View>)
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderTransactions = () => (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item._id}
      renderItem={renderTransactionItem}
      contentContainerStyle={s.txList}
      onEndReached={loadMoreTransactions}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={[s.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name="wallet-outline" size={48} color={colors.icon} />
          <Text style={[s.emptyText, { color: colors.icon }]}>No transactions yet</Text>
        </View>
      }
      ListFooterComponent={
        txLoading ? <ActivityIndicator style={{ padding: 16 }} color={colors.tint} /> : null
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    />
  );

  const renderBreakdown = () => {
    const maxTotal = breakdown.length > 0 ? Math.max(...breakdown.map((d) => d.total), 1) : 1;

    return (
      <ScrollView
        style={s.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        <Text style={[s.sectionTitle, { color: colors.text, padding: 16 }]}>
          Daily Commission (Last 30 Days)
        </Text>

        {breakdown.length === 0 ? (
          <View style={[s.emptyState, { backgroundColor: colors.card, margin: 16 }]}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>No data for this period</Text>
          </View>
        ) : (
          <View style={s.breakdownList}>
            {breakdown.map((day) => (
              <View key={day.date} style={[s.breakdownRow, { backgroundColor: colors.card }]}>
                <View style={s.breakdownDate}>
                  <Text style={[s.breakdownDateText, { color: colors.text }]}>
                    {formatShortDate(day.date)}
                  </Text>
                  <Text style={[s.breakdownCount, { color: colors.icon }]}>
                    {day.count} order{day.count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={[s.breakdownBarContainer, { backgroundColor: colors.gray200 }]}>
                  <View
                    style={[
                      s.breakdownBar,
                      { width: `${(day.total / maxTotal) * 100}%`, backgroundColor: colors.tint },
                    ]}
                  />
                </View>
                <Text style={[s.breakdownAmount, { color: colors.text }]}>
                  {formatCurrency(day.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.tint }]}>
        <Text style={s.headerTitle}>Platform Wallet</Text>
        <Text style={s.headerSubtitle}>
          {summary?.statistics?.commissionRate != null
            ? `${(summary.statistics.commissionRate * 100).toFixed(1)}% commission from all orders`
            : 'Commission from all orders'}
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        {renderTab('overview', 'Overview', 'grid-outline')}
        {renderTab('transactions', 'Transactions', 'list-outline')}
        {renderTab('breakdown', 'Daily', 'bar-chart-outline')}
      </View>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'breakdown' && renderBreakdown()}
    </View>
  );
}

// ADM-004: Per-screen ErrorBoundary so a wallet crash is isolated from the root.
export default withErrorBoundary(WalletScreenInner, { name: 'WalletScreen' });
