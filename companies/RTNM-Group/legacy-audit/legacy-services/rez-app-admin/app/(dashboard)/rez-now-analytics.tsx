/**
 * app/(dashboard)/rez-now-analytics.tsx
 * REZ Now — per-store analytics dashboard
 *
 * Sections:
 *  - Store slug input (if no slug supplied via params)
 *  - 2×2 summary stat cards
 *  - Top items horizontal scroll
 *  - Orders-by-hour bar chart (View-width bars, no external lib)
 *  - New vs Returning ratio bar
 *  - Order status pills
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
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { rezNowAnalyticsService, type RezNowAnalytics } from '../../services/api/rezNowAnalytics';
import { s } from './styles/rez-now-analytics.styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  colors: (typeof Colors)['light'];
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RezNowAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const params = useLocalSearchParams<{ storeSlug?: string }>();

  const [storeSlug, setStoreSlug] = useState<string>(params.storeSlug ?? '');
  const [slugInput, setSlugInput] = useState<string>(params.storeSlug ?? '');
  const [period, setPeriod] = useState<string>('30d');
  const [analytics, setAnalytics] = useState<RezNowAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (slug: string, selectedPeriod: string) => {
    if (!slug.trim()) return;
    try {
      setError(null);
      const data = await rezNowAnalyticsService.getAnalytics(slug.trim(), selectedPeriod);
      setAnalytics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(msg);
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (storeSlug) {
      setLoading(true);
      loadAnalytics(storeSlug, period);
    }
  }, [storeSlug, period, loadAnalytics]);

  const onRefresh = useCallback(() => {
    if (!storeSlug) return;
    setRefreshing(true);
    loadAnalytics(storeSlug, period);
  }, [storeSlug, period, loadAnalytics]);

  const handleLoad = useCallback(() => {
    const trimmed = slugInput.trim();
    if (!trimmed) return;
    setStoreSlug(trimmed);
    setAnalytics(null);
    setError(null);
  }, [slugInput]);

  // ── Derived stats ────────────────────────────────────────────────────────────

  const cancellationRate = analytics
    ? analytics.totalOrders > 0
      ? ((analytics.ordersByStatus['cancelled'] ?? 0) / analytics.totalOrders) * 100
      : 0
    : 0;

  // Orders by hour — find peak
  const hourCounts = analytics?.ordersByHour ?? [];
  const maxHourCount = hourCounts.length > 0 ? Math.max(...hourCounts.map((h) => h.count), 1) : 1;
  const peakHour = hourCounts.reduce(
    (best, h) => (h.count > (best?.count ?? 0) ? h : best),
    hourCounts[0] ?? null
  );

  // New vs returning
  const nvr = analytics?.newVsReturning;
  const nvrTotal = (nvr?.new ?? 0) + (nvr?.returning ?? 0);
  const newPct = nvrTotal > 0 ? ((nvr?.new ?? 0) / nvrTotal) * 100 : 50;

  // Status pills config
  const STATUS_CONFIG: Array<{ key: string; label: string; color: string; bg: string }> = [
    { key: 'completed', label: 'Completed', color: colors.success, bg: colors.successLight },
    { key: 'cancelled', label: 'Cancelled', color: colors.error, bg: colors.errorLight },
    { key: 'preparing', label: 'Preparing', color: colors.warningDark, bg: colors.warningLight },
  ];

  const PERIODS = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
  ];

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
          <Text style={[s.headerTitle, { color: colors.text }]}>REZ Now Analytics</Text>
          {storeSlug ? (
            <Text style={[s.headerSub, { color: colors.icon }]} numberOfLines={1}>
              {storeSlug}
            </Text>
          ) : null}
        </View>
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
        {/* ── Store slug input ── */}
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
              <Text style={s.loadBtnText}>Load Analytics</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Change store */}
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

            {/* Period selector */}
            <View style={s.periodRow}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    s.periodBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: period === p.value ? colors.tint : colors.card,
                    },
                  ]}
                  onPress={() => setPeriod(p.value)}
                >
                  <Text
                    style={[
                      s.periodBtnText,
                      { color: period === p.value ? '#fff' : colors.text },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Loading ── */}
            {loading && (
              <View style={s.centered}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            )}

            {/* ── Error ── */}
            {!loading && error ? (
              <View style={s.centered}>
                <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
                <Text style={[s.errorTitle, { color: colors.text }]}>Failed to load</Text>
                <Text style={[s.errorMsg, { color: colors.icon }]}>{error}</Text>
                <TouchableOpacity
                  style={[s.retryBtn, { backgroundColor: colors.tint }]}
                  onPress={() => {
                    setLoading(true);
                    loadAnalytics(storeSlug, period);
                  }}
                >
                  <Text style={s.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ── Content ── */}
            {!loading && analytics ? (
              <>
                {/* 2×2 Summary grid */}
                <View style={s.statGrid}>
                  <StatCard
                    label="Total Orders"
                    value={analytics.totalOrders.toLocaleString('en-IN')}
                    icon="receipt-outline"
                    iconColor={colors.info}
                    colors={colors}
                  />
                  <StatCard
                    label="Revenue"
                    value={formatINR(analytics.totalRevenue)}
                    icon="cash-outline"
                    iconColor={colors.success}
                    colors={colors}
                  />
                  <StatCard
                    label="Avg Order"
                    value={formatINR(analytics.avgOrderValue)}
                    icon="trending-up-outline"
                    iconColor={colors.purple}
                    colors={colors}
                  />
                  <StatCard
                    label="Cancellation"
                    value={`${cancellationRate.toFixed(1)}%`}
                    icon="close-circle-outline"
                    iconColor={colors.error}
                    colors={colors}
                  />
                </View>

                {/* Order status pills */}
                <View
                  style={[
                    s.section,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Order Status</Text>
                  <View style={s.pillsRow}>
                    {STATUS_CONFIG.map(({ key, label, color, bg }) => {
                      const count = analytics.ordersByStatus[key] ?? 0;
                      return (
                        <View key={key} style={[s.pill, { backgroundColor: bg }]}>
                          <View style={[s.pillDot, { backgroundColor: color }]} />
                          <Text style={[s.pillLabel, { color }]}>{label}</Text>
                          <Text style={[s.pillCount, { color }]}>{count}</Text>
                        </View>
                      );
                    })}
                    {/* Other statuses */}
                    {Object.entries(analytics.ordersByStatus)
                      .filter(([k]) => !['completed', 'cancelled', 'preparing'].includes(k))
                      .map(([k, v]) => (
                        <View key={k} style={[s.pill, { backgroundColor: colors.slate }]}>
                          <View style={[s.pillDot, { backgroundColor: colors.muted }]} />
                          <Text style={[s.pillLabel, { color: colors.mutedDark }]}>{k}</Text>
                          <Text style={[s.pillCount, { color: colors.mutedDark }]}>{v}</Text>
                        </View>
                      ))}
                  </View>
                </View>

                {/* Top items horizontal scroll */}
                {analytics.topItems.length > 0 && (
                  <View
                    style={[
                      s.section,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[s.sectionTitle, { color: colors.text }]}>Top Items</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.topItemsScroll}
                    >
                      {analytics.topItems.map((item, idx) => (
                        <View
                          key={idx}
                          style={[
                            s.itemCard,
                            { backgroundColor: colors.background, borderColor: colors.border },
                          ]}
                        >
                          <View style={[s.itemRankBadge, { backgroundColor: colors.tint }]}>
                            <Text style={s.itemRankText}>#{idx + 1}</Text>
                          </View>
                          <Text style={[s.itemName, { color: colors.text }]} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text style={[s.itemCount, { color: colors.icon }]}>
                            {item.count} orders
                          </Text>
                          <Text style={[s.itemRevenue, { color: colors.success }]}>
                            {formatINR(item.revenue)}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Orders by hour bar chart */}
                {hourCounts.length > 0 && (
                  <View
                    style={[
                      s.section,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={s.sectionTitleRow}>
                      <Text style={[s.sectionTitle, { color: colors.text }]}>
                        Orders by Hour
                      </Text>
                      {peakHour ? (
                        <Text
                          style={[
                            s.peakBadge,
                            { backgroundColor: colors.warningLight, color: colors.warningDark },
                          ]}
                        >
                          Peak {pad2(peakHour.hour)}:00
                        </Text>
                      ) : null}
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.hourChartScroll}
                    >
                      {Array.from({ length: 24 }, (_, h) => {
                        const entry = hourCounts.find((x) => x.hour === h);
                        const count = entry?.count ?? 0;
                        const barH = count > 0 ? Math.max(6, (count / maxHourCount) * 100) : 2;
                        const isPeak = peakHour?.hour === h && count > 0;
                        return (
                          <View key={h} style={s.hourBarWrapper}>
                            <Text
                              style={[
                                s.hourBarCount,
                                { color: isPeak ? colors.warningDark : colors.icon },
                              ]}
                            >
                              {count > 0 ? count : ''}
                            </Text>
                            <View
                              style={[
                                s.hourBar,
                                {
                                  height: barH,
                                  backgroundColor: isPeak
                                    ? colors.warningDark
                                    : count > 0
                                      ? colors.tint
                                      : colors.border,
                                },
                              ]}
                            />
                            <Text style={[s.hourLabel, { color: colors.icon }]}>
                              {pad2(h)}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* New vs Returning ratio bar */}
                <View
                  style={[
                    s.section,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[s.sectionTitle, { color: colors.text }]}>
                    New vs Returning
                  </Text>
                  {nvrTotal > 0 ? (
                    <>
                      <View style={s.nvrBar}>
                        <View
                          style={[
                            s.nvrSegment,
                            { flex: nvr?.new ?? 0, backgroundColor: colors.info },
                          ]}
                        />
                        <View
                          style={[
                            s.nvrSegment,
                            { flex: nvr?.returning ?? 0, backgroundColor: colors.purple },
                          ]}
                        />
                      </View>
                      <View style={s.nvrLegend}>
                        <View style={s.nvrLegendItem}>
                          <View style={[s.nvrDot, { backgroundColor: colors.info }]} />
                          <Text style={[s.nvrLegendText, { color: colors.text }]}>
                            New — {nvr?.new ?? 0} ({newPct.toFixed(0)}%)
                          </Text>
                        </View>
                        <View style={s.nvrLegendItem}>
                          <View style={[s.nvrDot, { backgroundColor: colors.purple }]} />
                          <Text style={[s.nvrLegendText, { color: colors.text }]}>
                            Returning — {nvr?.returning ?? 0} ({(100 - newPct).toFixed(0)}%)
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={[s.emptyNote, { color: colors.icon }]}>
                      No data available
                    </Text>
                  )}
                </View>
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

