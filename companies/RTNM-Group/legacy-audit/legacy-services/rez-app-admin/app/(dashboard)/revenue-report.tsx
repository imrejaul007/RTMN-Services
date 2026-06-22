/**
 * app/(dashboard)/revenue-report.tsx
 * Admin — Merchant Revenue Reports
 *
 * Sections:
 *  - Store slug input + date range presets (Today / This Week / This Month / Custom)
 *  - Custom: start + end date text inputs (YYYY-MM-DD)
 *  - Revenue by day: vertical bar chart (View-height proportional)
 *  - Payment methods breakdown: horizontal % bar (cash vs online)
 *  - Top 10 items table: rank, name, count, revenue
 *  - CSV Export via Share.share
 *  - Pull-to-refresh
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Share,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/revenue-report.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface TopItem {
  name: string;
  count: number;
  revenue: number;
}

interface PaymentBreakdown {
  cash: number;
  online: number;
}

interface RevenueReportData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  completionRate: number;
  topItems: TopItem[];
  dailyRevenue: DailyRevenue[];
  paymentBreakdown?: PaymentBreakdown;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return toISODate(new Date());
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

function startOfWeekStr(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

function startOfMonthStr(): string {
  const d = new Date();
  d.setDate(1);
  return toISODate(d);
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function formatINR(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

// ─── CSV builder ──────────────────────────────────────────────────────────────

function buildCSV(storeSlug: string, from: string, to: string, data: RevenueReportData): string {
  const lines: string[] = [];

  lines.push(`Revenue Report — ${storeSlug}`);
  lines.push(`Period: ${from} to ${to}`);
  lines.push('');

  lines.push('SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Total Orders,${data.totalOrders}`);
  lines.push(`Total Revenue,${data.totalRevenue}`);
  lines.push(`Avg Order Value,${data.avgOrderValue}`);
  lines.push(`Completion Rate,${(data.completionRate * 100).toFixed(1)}%`);
  lines.push('');

  lines.push('DAILY REVENUE');
  lines.push('Date,Orders,Revenue');
  for (const d of data.dailyRevenue) {
    lines.push(`${d.date},${d.orders},${d.revenue}`);
  }
  lines.push('');

  if (data.paymentBreakdown) {
    lines.push('PAYMENT METHODS');
    lines.push('Method,Count');
    lines.push(`Cash,${data.paymentBreakdown.cash}`);
    lines.push(`Online,${data.paymentBreakdown.online}`);
    lines.push('');
  }

  lines.push('TOP ITEMS');
  lines.push('Rank,Item,Orders,Revenue');
  data.topItems.slice(0, 10).forEach((item, idx) => {
    const safeNameCsv = `"${item.name.replace(/"/g, '""')}"`;
    lines.push(`${idx + 1},${safeNameCsv},${item.count},${item.revenue}`);
  });

  return lines.join('\n');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type ColorsType = (typeof Colors)['light'];

interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  colors: ColorsType;
}

function StatCard({ label, value, icon, iconColor, colors }: StatCardProps) {
  return (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.statIconWrap, { backgroundColor: `${iconColor}1A` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.icon }]}>{label}</Text>
    </View>
  );
}

// ─── Preset type ─────────────────────────────────────────────────────────────

type Preset = 'today' | 'week' | 'month' | 'custom';

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function RevenueReportScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [slugInput, setSlugInput] = useState<string>('');
  const [storeSlug, setStoreSlug] = useState<string>('');

  const [preset, setPreset] = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState<string>(daysAgoStr(30));
  const [customTo, setCustomTo] = useState<string>(todayStr());

  const [data, setData] = useState<RevenueReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  // Resolved from/to for current preset
  function resolvedRange(): { from: string; to: string } {
    const today = todayStr();
    switch (preset) {
      case 'today':
        return { from: today, to: today };
      case 'week':
        return { from: startOfWeekStr(), to: today };
      case 'month':
        return { from: startOfMonthStr(), to: today };
      case 'custom':
        return { from: customFrom, to: customTo };
    }
  }

  const loadReport = useCallback(
    async (slug: string, from: string, to: string, isRefresh = false) => {
      if (!slug.trim()) return;
      if (!isValidDate(from) || !isValidDate(to)) {
        setError('Invalid date format — use YYYY-MM-DD');
        return;
      }
      try {
        setError(null);
        if (!isRefresh) setLoading(true);
        const encodedSlug = encodeURIComponent(slug.trim());
        const response = await apiClient.get<RevenueReportData>(
          `web-ordering/store/${encodedSlug}/analytics?period=custom&from=${from}&to=${to}`
        );
        if (response.success && response.data) {
          setData(response.data);
        } else {
          throw new Error(response.message ?? 'Failed to load report');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load report';
        setError(msg);
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!storeSlug) return;
    const { from, to } = resolvedRange();
    setLoading(true);
    loadReport(storeSlug, from, to);
  }, [storeSlug, preset, customFrom, customTo]);

  const onRefresh = useCallback(() => {
    if (!storeSlug) return;
    setRefreshing(true);
    const { from, to } = resolvedRange();
    loadReport(storeSlug, from, to, true);
  }, [storeSlug, preset, customFrom, customTo]);

  const handleLoad = useCallback(() => {
    const trimmed = slugInput.trim();
    if (!trimmed) return;
    setStoreSlug(trimmed);
    setData(null);
    setError(null);
  }, [slugInput]);

  const handleExport = useCallback(async () => {
    if (!data || !storeSlug) return;
    setExporting(true);
    try {
      const { from, to } = resolvedRange();
      const csv = buildCSV(storeSlug, from, to, data);
      await Share.share({
        message: csv,
        title: `Revenue Report — ${storeSlug} (${from} to ${to})`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      Alert.alert('Export Error', msg);
    } finally {
      setExporting(false);
    }
  }, [data, storeSlug, preset, customFrom, customTo]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const dailyData = data?.dailyRevenue ?? [];
  const maxRevenue = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.revenue), 1) : 1;

  const pb = data?.paymentBreakdown;
  const pbTotal = pb ? pb.cash + pb.online : 0;
  const cashPct = pbTotal > 0 ? (pb!.cash / pbTotal) * 100 : 50;
  const onlinePct = 100 - cashPct;

  const topItems = (data?.topItems ?? []).slice(0, 10);

  const PRESETS: Array<{ label: string; value: Preset }> = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom', value: 'custom' },
  ];

  const { from: resolvedFrom, to: resolvedTo } = resolvedRange();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerTitleBlock}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Revenue Report</Text>
          {storeSlug ? (
            <Text style={[s.headerSub, { color: colors.icon }]} numberOfLines={1}>
              {storeSlug}
            </Text>
          ) : null}
        </View>
        {data ? (
          <TouchableOpacity
            style={[
              s.exportBtn,
              { backgroundColor: colors.tint, opacity: exporting ? 0.5 : 1 },
            ]}
            onPress={handleExport}
            disabled={exporting}
            accessibilityLabel="Export CSV"
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={s.exportBtnText}>CSV</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            enabled={!!storeSlug}
          />
        }
      >
        {/* Store slug input */}
        {!storeSlug ? (
          <View
            style={[s.slugCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons
              name="storefront-outline"
              size={32}
              color={colors.tint}
              style={s.slugIcon}
            />
            <Text style={[s.slugHeading, { color: colors.text }]}>Enter Store Slug</Text>
            <Text style={[s.slugHint, { color: colors.icon }]}>
              The store&apos;s URL slug from web-ordering configuration
            </Text>
            <TextInput
              style={[
                s.slugInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="e.g. butter-chicken-palace"
              placeholderTextColor={colors.icon}
              value={slugInput}
              onChangeText={setSlugInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleLoad}
            />
            <TouchableOpacity
              style={[
                s.loadBtn,
                { backgroundColor: colors.tint, opacity: slugInput.trim() ? 1 : 0.4 },
              ]}
              onPress={handleLoad}
              disabled={!slugInput.trim()}
            >
              <Text style={s.loadBtnText}>Load Report</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Inline slug change */}
            <View style={s.changeStoreRow}>
              <TextInput
                style={[
                  s.inlineInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
                ]}
                value={slugInput}
                onChangeText={setSlugInput}
                placeholder="store slug"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleLoad}
              />
              <TouchableOpacity
                style={[s.goBtn, { backgroundColor: colors.tint }]}
                onPress={handleLoad}
              >
                <Text style={s.goBtnText}>Go</Text>
              </TouchableOpacity>
            </View>

            {/* Preset tabs */}
            <View style={s.presetRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    s.presetBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: preset === p.value ? colors.tint : colors.card,
                    },
                  ]}
                  onPress={() => setPreset(p.value)}
                >
                  <Text
                    style={[
                      s.presetBtnText,
                      { color: preset === p.value ? '#fff' : colors.text },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom date inputs */}
            {preset === 'custom' && (
              <View
                style={[
                  s.customDateRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={s.dateField}>
                  <Text style={[s.dateFieldLabel, { color: colors.icon }]}>From</Text>
                  <TextInput
                    style={[
                      s.dateInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={customFrom}
                    onChangeText={setCustomFrom}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.icon}
                    keyboardType="numeric"
                    maxLength={10}
                    returnKeyType="next"
                  />
                </View>
                <Ionicons
                  name="arrow-forward-outline"
                  size={18}
                  color={colors.icon}
                  style={s.dateArrow}
                />
                <View style={s.dateField}>
                  <Text style={[s.dateFieldLabel, { color: colors.icon }]}>To</Text>
                  <TextInput
                    style={[
                      s.dateInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={customTo}
                    onChangeText={setCustomTo}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.icon}
                    keyboardType="numeric"
                    maxLength={10}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (isValidDate(customFrom) && isValidDate(customTo)) {
                        setData(null);
                        setLoading(true);
                        loadReport(storeSlug, customFrom, customTo);
                      }
                    }}
                  />
                </View>
              </View>
            )}

            {/* Date range label */}
            <Text style={[s.dateRangeLabel, { color: colors.icon }]}>
              {resolvedFrom === resolvedTo ? resolvedFrom : `${resolvedFrom}  →  ${resolvedTo}`}
            </Text>

            {/* Loading */}
            {loading && (
              <View style={s.centered}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            )}

            {/* Error */}
            {!loading && error ? (
              <View style={s.centered}>
                <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
                <Text style={[s.errorTitle, { color: colors.text }]}>Failed to load</Text>
                <Text style={[s.errorMsg, { color: colors.icon }]}>{error}</Text>
                <TouchableOpacity
                  style={[s.retryBtn, { backgroundColor: colors.tint }]}
                  onPress={() => {
                    setLoading(true);
                    loadReport(storeSlug, resolvedFrom, resolvedTo);
                  }}
                >
                  <Text style={s.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Content */}
            {!loading && data ? (
              <>
                {/* Summary stats */}
                <View style={s.statGrid}>
                  <StatCard
                    label="Total Orders"
                    value={data.totalOrders.toLocaleString('en-IN')}
                    icon="receipt-outline"
                    iconColor={colors.info}
                    colors={colors}
                  />
                  <StatCard
                    label="Revenue"
                    value={formatINR(data.totalRevenue)}
                    icon="cash-outline"
                    iconColor={colors.success}
                    colors={colors}
                  />
                  <StatCard
                    label="Avg Order"
                    value={formatINR(data.avgOrderValue)}
                    icon="trending-up-outline"
                    iconColor={colors.purple}
                    colors={colors}
                  />
                  <StatCard
                    label="Completion"
                    value={`${(data.completionRate * 100).toFixed(1)}%`}
                    icon="checkmark-circle-outline"
                    iconColor={colors.successDark}
                    colors={colors}
                  />
                </View>

                {/* Revenue by day bar chart */}
                {dailyData.length > 0 && (
                  <View
                    style={[
                      s.section,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      Revenue by Day
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.barChartScroll}
                    >
                      {dailyData.map((d) => {
                        const barH =
                          d.revenue > 0 ? Math.max(8, (d.revenue / maxRevenue) * 120) : 3;
                        const labelShort = d.date.slice(5); // MM-DD
                        return (
                          <View key={d.date} style={s.barWrapper}>
                            <Text style={[s.barRevenueLabel, { color: colors.success }]}>
                              {d.revenue > 0 ? formatINR(d.revenue) : ''}
                            </Text>
                            <View
                              style={[
                                s.barFill,
                                {
                                  height: barH,
                                  backgroundColor: d.revenue > 0 ? colors.tint : colors.border,
                                },
                              ]}
                            />
                            <Text style={[s.barDateLabel, { color: colors.icon }]}>
                              {labelShort}
                            </Text>
                            <Text style={[s.barOrdersLabel, { color: colors.icon }]}>
                              {d.orders > 0 ? `${d.orders}` : ''}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                    <Text style={[s.barChartNote, { color: colors.icon }]}>
                      Bar height proportional to revenue · numbers = orders
                    </Text>
                  </View>
                )}

                {/* Payment methods breakdown */}
                {pb && pbTotal > 0 && (
                  <View
                    style={[
                      s.section,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      Payment Methods
                    </Text>
                    <View style={s.pmBar}>
                      <View
                        style={[
                          s.pmSegment,
                          { flex: cashPct, backgroundColor: colors.warningDark },
                        ]}
                      />
                      <View
                        style={[
                          s.pmSegment,
                          { flex: onlinePct, backgroundColor: colors.info },
                        ]}
                      />
                    </View>
                    <View style={s.pmLegend}>
                      <View style={s.pmLegendItem}>
                        <View style={[s.pmDot, { backgroundColor: colors.warningDark }]} />
                        <Text style={[s.pmLegendText, { color: colors.text }]}>
                          Cash — {pb.cash} ({cashPct.toFixed(1)}%)
                        </Text>
                      </View>
                      <View style={s.pmLegendItem}>
                        <View style={[s.pmDot, { backgroundColor: colors.info }]} />
                        <Text style={[s.pmLegendText, { color: colors.text }]}>
                          Online — {pb.online} ({onlinePct.toFixed(1)}%)
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Top 10 items table */}
                {topItems.length > 0 && (
                  <View
                    style={[
                      s.section,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[s.sectionTitle, { color: colors.text }]}>Top Items</Text>
                    {/* Table header */}
                    <View
                      style={[
                        s.tableRow,
                        s.tableHeader,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[s.tableCell, s.tableCellRank, { color: colors.icon }]}
                      >
                        #
                      </Text>
                      <Text
                        style={[s.tableCell, s.tableCellName, { color: colors.icon }]}
                      >
                        Item
                      </Text>
                      <Text style={[s.tableCell, s.tableCellNum, { color: colors.icon }]}>
                        Orders
                      </Text>
                      <Text style={[s.tableCell, s.tableCellNum, { color: colors.icon }]}>
                        Revenue
                      </Text>
                    </View>
                    {topItems.map((item, idx) => (
                      <View
                        key={`${item.name}-${idx}`}
                        style={[
                          s.tableRow,
                          {
                            backgroundColor: idx % 2 === 0 ? 'transparent' : `${colors.tint}08`,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <View style={s.tableCellRank}>
                          <View
                            style={[
                              s.rankBadge,
                              { backgroundColor: idx < 3 ? colors.tint : colors.slate },
                            ]}
                          >
                            <Text
                              style={[
                                s.rankBadgeText,
                                { color: idx < 3 ? '#fff' : colors.icon },
                              ]}
                            >
                              {idx + 1}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[s.tableCell, s.tableCellName, { color: colors.text }]}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[s.tableCell, s.tableCellNum, { color: colors.text }]}
                        >
                          {item.count.toLocaleString('en-IN')}
                        </Text>
                        <Text
                          style={[
                            s.tableCell,
                            s.tableCellNum,
                            { color: colors.success, fontWeight: '700' },
                          ]}
                        >
                          {formatINR(item.revenue)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* No data empty state */}
                {dailyData.length === 0 && topItems.length === 0 && (
                  <View style={s.centered}>
                    <Ionicons name="bar-chart-outline" size={44} color={colors.border} />
                    <Text style={[s.emptyNote, { color: colors.icon }]}>
                      No orders found for this period
                    </Text>
                  </View>
                )}
              </>
            ) : null}
          </>
        )}

        <View style={s.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

