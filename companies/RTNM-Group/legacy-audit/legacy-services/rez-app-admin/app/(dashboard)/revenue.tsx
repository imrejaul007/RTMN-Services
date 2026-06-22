/**
 * app/(dashboard)/revenue.tsx
 *
 * Revenue Dashboard Screen
 * - KPI cards: Total Users, Active Merchants, Daily Transactions, WAU
 * - 7-day bar chart (navy bars, gold on highest day)
 * - Top merchants table
 * - Tier distribution (View-based circles)
 * - Date range selector
 * - Export button
 */

import React, { useState, useCallback, useRef } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { isAllowedOpenUrl } from '../../utils/urlValidator';
import { s } from './styles/revenue.styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = 'today' | '7d' | '30d';

interface AdminStats {
  totalUsers: number;
  activeMerchants: number;
  dailyTransactions: number;
  dailyRevenue: number;
  weeklyActiveUsers: number;
}

interface RevenueDay {
  date: string;
  revenue: number;
  transactions: number;
}

interface TopMerchant {
  merchantId: string;
  storeName: string;
  monthlyRevenue: number;
  visitCount: number;
}

interface UserTiers {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const shortDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return iso.slice(5, 10);
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KPICardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

function KPICard({ title, value, icon, iconColor }: KPICardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[kpiStyles.card, { backgroundColor: colors.card }]}>
      <View style={[kpiStyles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[kpiStyles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[kpiStyles.title, { color: colors.icon }]}>{title}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    width: '47.5%',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 11, textAlign: 'center' },
});

// 7-day bar chart — navy bars, gold highlight for highest day
interface RevenueBarChartProps {
  data: RevenueDay[];
}

function RevenueBarChart({ data }: RevenueBarChartProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (data.length === 0) {
    return (
      <View style={chartStyles.empty}>
        <Ionicons name="bar-chart-outline" size={36} color={colors.icon} />
        <Text style={[chartStyles.emptyText, { color: colors.icon }]}>No revenue data</Text>
      </View>
    );
  }

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const maxIdx = data.reduce((mi, d, i) => (d.revenue > data[mi].revenue ? i : mi), 0);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.bars}>
        {data.map((day, idx) => {
          const pct = Math.max((day.revenue / maxRev) * 100, 4);
          const isHighest = idx === maxIdx;
          const barColor = isHighest ? colors.gold : colors.navy;
          return (
            <View key={day.date} style={chartStyles.barCol}>
              <Text style={[chartStyles.topLabel, { color: colors.icon }]}>
                {day.revenue > 0 ? formatCurrency(day.revenue) : ''}
              </Text>
              <View style={chartStyles.barTrack}>
                <View
                  style={[
                    chartStyles.barFill,
                    { height: `${pct}%` as ViewStyle['height'], backgroundColor: barColor },
                  ]}
                />
              </View>
              <Text style={[chartStyles.bottomLabel, { color: colors.icon }]}>
                {shortDate(day.date)}
              </Text>
            </View>
          );
        })}
      </View>
      {/* Legend */}
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: colors.navy }]} />
          <Text style={[chartStyles.legendText, { color: colors.icon }]}>Daily Revenue</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: colors.gold }]} />
          <Text style={[chartStyles.legendText, { color: colors.icon }]}>Peak Day</Text>
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { paddingTop: 8 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
    marginBottom: 8,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  topLabel: { fontSize: 7, fontWeight: '600', marginBottom: 2, textAlign: 'center' },
  barTrack: {
    width: '65%',
    height: 80,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  bottomLabel: { fontSize: 8, marginTop: 4, textAlign: 'center' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13 },
});

// Tier distribution pie (View-based circles)
interface TierCirclesProps {
  tiers: UserTiers;
}

function TierCircles({ tiers }: TierCirclesProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const total = tiers.bronze + tiers.silver + tiers.gold + tiers.platinum || 1;

  const tierData = [
    { label: 'Bronze', count: tiers.bronze, color: colors.bronze },
    { label: 'Silver', count: tiers.silver, color: colors.slateMedium },
    { label: 'Gold', count: tiers.gold, color: colors.gold },
    { label: 'Platinum', count: tiers.platinum, color: colors.indigo },
  ];

  return (
    <View style={tierStyles.container}>
      {tierData.map((t) => {
        const pct = Math.round((t.count / total) * 100);
        const size = 54 + pct * 0.6;
        return (
          <View key={t.label} style={tierStyles.tierItem}>
            <View
              style={[
                tierStyles.circle,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: `${t.color}20`,
                  borderColor: t.color,
                },
              ]}
            >
              <Text style={[tierStyles.circleCount, { color: t.color }]}>
                {formatNumber(t.count)}
              </Text>
              <Text style={[tierStyles.circlePct, { color: t.color }]}>{pct}%</Text>
            </View>
            <Text style={[tierStyles.tierLabel, { color: colors.text }]}>{t.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const tierStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingVertical: 12,
  },
  tierItem: { alignItems: 'center', gap: 6 },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  circleCount: { fontSize: 12, fontWeight: '700' },
  circlePct: { fontSize: 9, fontWeight: '600' },
  tierLabel: { fontSize: 11, fontWeight: '600' },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function RevenueScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDay[]>([]);
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [tiers, setTiers] = useState<UserTiers | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30;

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, revenueRes, merchantsRes, tiersRes] = await Promise.allSettled([
        apiClient.get<AdminStats>('admin/stats'),
        apiClient.get<RevenueDay[]>(`admin/revenue?days=${days}`),
        apiClient.get<TopMerchant[]>('admin/top-merchants?limit=10'),
        apiClient.get<UserTiers>('admin/user-tiers'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
        setStats(statsRes.value.data);
      }
      if (revenueRes.status === 'fulfilled' && revenueRes.value.success && revenueRes.value.data) {
        setRevenueData(revenueRes.value.data);
      } else {
        setRevenueData([]);
      }
      if (
        merchantsRes.status === 'fulfilled' &&
        merchantsRes.value.success &&
        merchantsRes.value.data
      ) {
        setTopMerchants(merchantsRes.value.data);
      } else {
        setTopMerchants([]);
      }
      if (tiersRes.status === 'fulfilled' && tiersRes.value.success && tiersRes.value.data) {
        setTiers(tiersRes.value.data);
      }
    } catch (err: any) {
      logger.error('Revenue fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll();
    }, [fetchAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const to = new Date().toISOString().split('T')[0];
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const from = fromDate.toISOString().split('T')[0];
      // Use apiClient to ensure auth token is sent with the export request
      const res = await apiClient.get<any>(`admin/export/revenue?from=${from}&to=${to}`);
      if (res.success && res.data?.downloadUrl) {
        if (isAllowedOpenUrl(res.data.downloadUrl)) {
          await Linking.openURL(res.data.downloadUrl);
        } else {
          Alert.alert('Error', 'Invalid download URL');
        }
      } else {
        Alert.alert(
          'Export',
          res.message || 'Export request sent. Check your email for the download link.'
        );
      }
    } catch {
      Alert.alert('Export Failed', 'Unable to export revenue data.');
    } finally {
      setExporting(false);
    }
  }, [days]);

  if (loading && !refreshing) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>Loading revenue data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={s.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.navy }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Revenue Dashboard</Text>
          <Text style={s.headerSub}>Platform financial overview</Text>
        </View>
        <TouchableOpacity
          style={[s.exportBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={14} color="#fff" />
              <Text style={s.exportBtnText}>Export</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Range Selector */}
      <View style={[s.rangeRow, { backgroundColor: colors.card }]}>
        {(['today', '7d', '30d'] as DateRange[]).map((r) => (
          <TouchableOpacity
            key={r}
            style={[s.rangeBtn, dateRange === r && { backgroundColor: colors.navy }]}
            onPress={() => setDateRange(r)}
          >
            <Text style={[s.rangeBtnText, { color: dateRange === r ? '#fff' : colors.icon }]}>
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : '30 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI Cards */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Key Metrics</Text>
        <View style={s.kpiGrid}>
          <KPICard
            title="Total Users"
            value={formatNumber(stats?.totalUsers ?? 0)}
            icon="people"
            iconColor={colors.indigo}
          />
          <KPICard
            title="Active Merchants"
            value={formatNumber(stats?.activeMerchants ?? 0)}
            icon="storefront"
            iconColor={colors.success}
          />
          <KPICard
            title="Daily Transactions"
            value={formatNumber(stats?.dailyTransactions ?? 0)}
            icon="swap-horizontal"
            iconColor={colors.warning}
          />
          <KPICard
            title="Weekly Active Users"
            value={formatNumber(stats?.weeklyActiveUsers ?? 0)}
            icon="pulse"
            iconColor={colors.pink}
          />
        </View>
      </View>

      {/* Revenue Chart */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Revenue ({dateRange === 'today' ? 'Today' : dateRange === '7d' ? '7 Days' : '30 Days'})
        </Text>
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <RevenueBarChart data={revenueData.slice(-7)} />
          {revenueData.length > 0 && (
            <View style={s.revenueStats}>
              <View style={s.revenueStat}>
                <Text style={[s.revenueStatValue, { color: colors.text }]}>
                  {formatCurrency(revenueData.reduce((s, d) => s + d.revenue, 0))}
                </Text>
                <Text style={[s.revenueStatLabel, { color: colors.icon }]}>Total Revenue</Text>
              </View>
              <View style={[s.revenueStatDivider, { backgroundColor: colors.border }]} />
              <View style={s.revenueStat}>
                <Text style={[s.revenueStatValue, { color: colors.text }]}>
                  {formatNumber(revenueData.reduce((s, d) => s + d.transactions, 0))}
                </Text>
                <Text style={[s.revenueStatLabel, { color: colors.icon }]}>Transactions</Text>
              </View>
              <View style={[s.revenueStatDivider, { backgroundColor: colors.border }]} />
              <View style={s.revenueStat}>
                <Text style={[s.revenueStatValue, { color: colors.text }]}>
                  {revenueData.length > 0
                    ? formatCurrency(
                        Math.round(
                          revenueData.reduce((s, d) => s + d.revenue, 0) / revenueData.length
                        )
                      )
                    : '₹0'}
                </Text>
                <Text style={[s.revenueStatLabel, { color: colors.icon }]}>Daily Avg</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Top Merchants Table */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Top Merchants</Text>
        <View style={[s.card, { backgroundColor: colors.card }]}>
          {/* Table header */}
          <View style={[s.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.tableHeaderCell, { flex: 0.5, color: colors.icon }]}>#</Text>
            <Text style={[s.tableHeaderCell, { flex: 2.5, color: colors.icon }]}>Store</Text>
            <Text
              style={[
                s.tableHeaderCell,
                { flex: 1.5, color: colors.icon, textAlign: 'right' },
              ]}
            >
              Revenue
            </Text>
            <Text
              style={[s.tableHeaderCell, { flex: 1, color: colors.icon, textAlign: 'right' }]}
            >
              Visits
            </Text>
          </View>
          {topMerchants.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="storefront-outline" size={32} color={colors.icon} />
              <Text style={[s.emptyText, { color: colors.icon }]}>No merchant data</Text>
            </View>
          ) : (
            topMerchants.map((m, idx) => (
              <View
                key={m.merchantId}
                style={[
                  s.tableRow,
                  idx < topMerchants.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={[s.rankCell, { flex: 0.5 }]}>
                  <Text style={[s.rankText, { color: colors.tint }]}>{idx + 1}</Text>
                </View>
                <Text
                  style={[s.tableCell, { flex: 2.5, color: colors.text }]}
                  numberOfLines={1}
                >
                  {m.storeName}
                </Text>
                <Text
                  style={[
                    s.tableCell,
                    { flex: 1.5, color: colors.success, textAlign: 'right', fontWeight: '600' },
                  ]}
                >
                  {formatCurrency(m.monthlyRevenue)}
                </Text>
                <Text
                  style={[s.tableCell, { flex: 1, color: colors.icon, textAlign: 'right' }]}
                >
                  {formatNumber(m.visitCount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Tier Distribution */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>User Tier Distribution</Text>
        <View style={[s.card, { backgroundColor: colors.card }]}>
          {tiers ? (
            <>
              <TierCircles tiers={tiers} />
              <View style={[s.tierTotal, { borderTopColor: colors.border }]}>
                <Text style={[s.tierTotalText, { color: colors.icon }]}>
                  Total tiered users:{' '}
                  <Text style={[s.tierTotalValue, { color: colors.text }]}>
                    {formatNumber(tiers.bronze + tiers.silver + tiers.gold + tiers.platinum)}
                  </Text>
                </Text>
              </View>
            </>
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="pie-chart-outline" size={32} color={colors.icon} />
              <Text style={[s.emptyText, { color: colors.icon }]}>No tier data</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

