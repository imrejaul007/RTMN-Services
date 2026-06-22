import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/revenue-by-vertical.styles';

// --- Types ---

interface VerticalItem {
  _id: string;
  revenue: number;
  transactions: number;
  avgTransaction: number;
  storeCount: number;
  uniqueCustomers: number;
  prevRevenue: number;
  growth: number;
}

// --- Constants ---

const VERTICAL_COLORS: Record<string, string> = {
  restaurant: '#EF4444',
  salon: '#EC4899',
  retail: '#3B82F6',
  grocery: '#22C55E',
  electronics: '#8B5CF6',
  beauty: '#F59E0B',
  healthcare: '#06B6D4',
  'home-kitchen': '#F97316',
  default: '#6B7280',
};

const VERTICAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  restaurant: 'restaurant-outline',
  salon: 'cut-outline',
  retail: 'storefront-outline',
  grocery: 'cart-outline',
  electronics: 'phone-portrait-outline',
  beauty: 'sparkles-outline',
  healthcare: 'medkit-outline',
  'home-kitchen': 'home-outline',
  default: 'grid-outline',
};

const PERIODS = [
  { label: '24h', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
];

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function periodLabel(p: string): string {
  return p === '24h' ? '24 hours' : p === '7d' ? '7 days' : '30 days';
}

// --- Component ---

export default function RevenueByVerticalScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [data, setData] = useState<VerticalItem[]>([]);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await apiClient.get<any>(`admin/economics/revenue-by-vertical?period=${period}`);
      if (!mountedRef.current) return;
      const payload = res.data;
      const raw = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.breakdown)
          ? payload.breakdown
          : [];
      setData(raw);
    } catch {
      if (!mountedRef.current) return;
      setError('Failed to load revenue data');
      setData([]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const safeData = Array.isArray(data) ? data : [];
  const totalRevenue = safeData.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalTransactions = safeData.reduce((s, d) => s + (d.transactions || 0), 0);
  const totalCustomers = safeData.reduce((s, d) => s + (d.uniqueCustomers || 0), 0);
  const totalStores = safeData.reduce((s, d) => s + (d.storeCount || 0), 0);
  const avgOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
  const prevTotalRevenue = safeData.reduce((s, d) => s + (d.prevRevenue || 0), 0);
  const overallGrowth =
    prevTotalRevenue > 0
      ? Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100)
      : totalRevenue > 0
        ? 100
        : 0;

  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
        />
      }
    >
      {/* Period Selector */}
      <View style={s.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[s.periodBtn, period === p.value && s.periodBtnActive]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[s.periodBtnText, period === p.value && s.periodBtnTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total Revenue Hero Card */}
      <View style={s.heroCard}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroLabel}>Total Revenue ({periodLabel(period)})</Text>
            <Text style={s.heroValue}>{loading ? '...' : formatCurrency(totalRevenue)}</Text>
          </View>
          {!loading && overallGrowth !== 0 && (
            <View
              style={[s.growthBadge, overallGrowth > 0 ? s.growthUp : s.growthDown]}
            >
              <Ionicons
                name={overallGrowth > 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={overallGrowth > 0 ? colors.green : colors.error}
              />
              <Text
                style={[
                  s.growthText,
                  { color: overallGrowth > 0 ? colors.green : colors.error },
                ]}
              >
                {overallGrowth > 0 ? '+' : ''}
                {overallGrowth}%
              </Text>
            </View>
          )}
        </View>
        {!loading && <Text style={s.heroSub}>vs previous {periodLabel(period)}</Text>}
      </View>

      {/* Summary Stat Cards */}
      {!loading && (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Ionicons name="receipt-outline" size={18} color={colors.info} />
            <Text style={s.statValue}>{totalTransactions.toLocaleString('en-IN')}</Text>
            <Text style={s.statLabel}>Transactions</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="cash-outline" size={18} color={colors.green} />
            <Text style={s.statValue}>{formatCurrency(avgOrderValue)}</Text>
            <Text style={s.statLabel}>Avg Order</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="people-outline" size={18} color={colors.purple} />
            <Text style={s.statValue}>{totalCustomers.toLocaleString('en-IN')}</Text>
            <Text style={s.statLabel}>Customers</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="storefront-outline" size={18} color={colors.warning} />
            <Text style={s.statValue}>{totalStores}</Text>
            <Text style={s.statLabel}>Stores</Text>
          </View>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              fetchData();
            }}
          >
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Vertical Breakdown */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.navy} style={{ marginTop: 40 }} />
      ) : (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Revenue by Vertical</Text>
          {safeData.length === 0 && !error && (
            <View style={s.emptyBox}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.gray300} />
              <Text style={s.emptyTitle}>No revenue data</Text>
              <Text style={s.emptyText}>
                No completed transactions found for the last {periodLabel(period)}.
              </Text>
            </View>
          )}
          {safeData.map((item, i) => {
            const pct = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;
            const nameKey = (item._id || '').toLowerCase().replace(/\s+/g, '-');
            const color = VERTICAL_COLORS[nameKey] || VERTICAL_COLORS.default;
            const icon = VERTICAL_ICONS[nameKey] || VERTICAL_ICONS.default;
            const growth = item.growth || 0;

            return (
              <View key={i} style={s.verticalCard}>
                {/* Header */}
                <View style={s.verticalHeader}>
                  <View style={[s.iconCircle, { backgroundColor: color + '18' }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.verticalName}>{item._id || 'Unknown'}</Text>
                    <Text style={s.verticalShare}>{pct}% of total</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.verticalRevenue}>{formatCurrency(item.revenue || 0)}</Text>
                    {growth !== 0 && (
                      <View style={s.inlineGrowth}>
                        <Ionicons
                          name={growth > 0 ? 'arrow-up' : 'arrow-down'}
                          size={10}
                          color={growth > 0 ? colors.green : colors.error}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            color: growth > 0 ? colors.green : colors.error,
                            fontWeight: '600',
                          }}
                        >
                          {growth > 0 ? '+' : ''}
                          {growth}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>

                {/* Metrics Row */}
                <View style={s.metricsRow}>
                  <View style={s.metric}>
                    <Text style={s.metricValue}>
                      {(item.transactions || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={s.metricLabel}>Txns</Text>
                  </View>
                  <View style={s.metric}>
                    <Text style={s.metricValue}>
                      {formatCurrency(Math.round(item.avgTransaction || 0))}
                    </Text>
                    <Text style={s.metricLabel}>Avg Order</Text>
                  </View>
                  <View style={s.metric}>
                    <Text style={s.metricValue}>
                      {(item.uniqueCustomers || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={s.metricLabel}>Customers</Text>
                  </View>
                  <View style={s.metric}>
                    <Text style={s.metricValue}>{item.storeCount || 0}</Text>
                    <Text style={s.metricLabel}>Stores</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// --- Styles ---

const createStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Period selector
    periodRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 12 },
    periodBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.gray200,
    },
    periodBtnActive: { backgroundColor: colors.navy, borderColor: colors.navy },
    periodBtnText: { fontSize: 13, color: colors.gray700, fontWeight: '600' },
    periodBtnTextActive: { color: colors.card },

    // Hero card
    heroCard: {
      marginHorizontal: 16,
      backgroundColor: colors.navy,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    heroValue: { fontSize: 28, fontWeight: '800', color: '#ffcd57' },
    heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 },
    growthBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    growthUp: { backgroundColor: 'rgba(34,197,94,0.15)' },
    growthDown: { backgroundColor: 'rgba(239,68,68,0.15)' },
    growthText: { fontSize: 13, fontWeight: '700' },

    // Summary stat cards
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      gap: 8,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      gap: 4,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    statValue: { fontSize: 14, fontWeight: '800', color: colors.navy },
    statLabel: { fontSize: 10, color: colors.mutedDark, textAlign: 'center' },

    // Error
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      backgroundColor: colors.errorLight,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    errorText: { flex: 1, fontSize: 13, color: colors.errorDeep },
    retryText: { fontSize: 13, fontWeight: '700', color: colors.info },

    // Section
    section: { paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.navy,
      marginBottom: 12,
    },

    // Empty state
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 40,
      gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.mutedDark },
    emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center' },

    // Vertical cards
    verticalCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    verticalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    iconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verticalName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.navy,
      textTransform: 'capitalize',
    },
    verticalShare: { fontSize: 11, color: colors.muted, marginTop: 1 },
    verticalRevenue: { fontSize: 15, fontWeight: '800', color: colors.navy },
    inlineGrowth: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 2,
    },

    // Bar
    barTrack: {
      height: 6,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 10,
    },
    barFill: { height: 6, borderRadius: 3 },

    // Metrics row
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metric: { alignItems: 'center', flex: 1 },
    metricValue: { fontSize: 13, fontWeight: '700', color: colors.gray700 },
    metricLabel: { fontSize: 10, color: colors.muted, marginTop: 2 },
  });
