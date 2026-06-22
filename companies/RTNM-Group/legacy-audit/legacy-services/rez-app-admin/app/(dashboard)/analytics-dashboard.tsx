/**
 * app/(dashboard)/analytics-dashboard.tsx
 *
 * Platform Analytics Dashboard
 * - Platform overview: total users, active merchants, orders today, GMV today
 * - User growth numbers (7-day)
 * - Top merchants by revenue
 * - Recent suspicious activity log (flagged transactions)
 *
 * API: GET admin/dashboard/stats, GET admin/analytics/dashboard,
 *      GET /api/analytics/platform/summary (analytics-events service)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import {
  dashboardService,
  DashboardStats,
  AnalyticsDashboardResponse,
  PlatformSummaryResponse,
} from '../../services/api/dashboard';
import { storageService } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { s } from './styles/analytics-dashboard.styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Re-use types from the service layer
type UserGrowthDay = AnalyticsDashboardResponse['userGrowth'][number];
type TopMerchant = AnalyticsDashboardResponse['topMerchants'][number];
type SuspiciousActivity = AnalyticsDashboardResponse['suspiciousActivity'][number];
type AnalyticsDashboardData = AnalyticsDashboardResponse;
type PlatformSummary = PlatformSummaryResponse;
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const severityColor = (s: string) => {
  switch (s) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

const severityBg = (s: string) => {
  switch (s) {
    case 'high':
      return '#fee2e2';
    case 'medium':
      return '#fef3c7';
    default:
      return '#f3f4f6';
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface OverviewCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress?: () => void;
}

function OverviewCard({ title, value, subtitle, icon, iconColor, onPress }: OverviewCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[s.overviewCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[s.cardIconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[s.cardValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.cardTitle, { color: colors.icon }]}>{title}</Text>
      {subtitle ? (
        <Text style={[s.cardSubtitle, { color: colors.icon }]}>{subtitle}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

// Simple bar chart using View widths — no external library
function MiniBarChart({ data, max }: { data: UserGrowthDay[]; max: number }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={s.barChart}>
      {data.map((day) => {
        const pct = max > 0 ? Math.max((day.newUsers / max) * 100, 4) : 4;
        return (
          <View key={day.date} style={s.barColumn}>
            <Text style={[s.barTopLabel, { color: colors.icon }]}>
              {formatNumber(day.newUsers)}
            </Text>
            <View style={s.barTrack}>
              <View
                style={[s.barFill, { height: `${pct}%` as ViewStyle['height'], backgroundColor: colors.tint }]}
              />
            </View>
            <Text style={[s.barBottomLabel, { color: colors.icon }]}>{day.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function AnalyticsDashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { hasRole } = useAuth();

  // Role guard BEFORE any hooks that may vary — Rules of Hooks requires hooks count to
  // be identical on every render. useFocusEffect below must always run, so we gate
  // inside the effect rather than returning early before it.
  const isAuthorized = hasRole(ADMIN_ROLES.ADMIN);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
  const [platformSummary, setPlatformSummary] = useState<PlatformSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [statsData, analyticsData, platformRes] = await Promise.allSettled([
        dashboardService.getStats(),
        dashboardService.getAnalyticsDashboard(),
        dashboardService.getPlatformSummary('30d'),
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }

      if (analyticsData.status === 'fulfilled') {
        setAnalyticsData(analyticsData.value);
      } else {
        // Surface the real error so the user knows what went wrong
        setError(analyticsData.reason?.message || 'Failed to load analytics data');
        setAnalyticsData({ userGrowth: [], topMerchants: [], suspiciousActivity: [] });
      }

      if (platformRes.status === 'fulfilled' && platformRes.value) {
        setPlatformSummary(platformRes.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Require admin role (checked after all hooks to satisfy Rules of Hooks)
  if (!isAuthorized) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.icon} />
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: '700',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Access Denied
        </Text>
        <Text
          style={{ color: colors.icon, textAlign: 'center', paddingHorizontal: 32, marginTop: 8 }}
        >
          You need Admin privileges to view Analytics.
        </Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>Loading analytics...</Text>
      </View>
    );
  }

  const userGrowth = analyticsData?.userGrowth ?? [];
  const topMerchants = analyticsData?.topMerchants ?? [];
  const suspicious = analyticsData?.suspiciousActivity ?? [];
  const maxNewUsers = userGrowth.reduce((m, d) => Math.max(m, d.newUsers), 1);

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={s.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.tint }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Analytics Dashboard</Text>
          <Text style={s.headerSub}>Platform-wide metrics & insights</Text>
        </View>
        <TouchableOpacity style={s.headerRefreshBtn} onPress={onRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={[s.errorBanner, { backgroundColor: `${colors.error}15` }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[s.errorBannerText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Platform Overview */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Platform Overview</Text>
        <View style={s.overviewGrid}>
          <OverviewCard
            title="Total Users"
            value={formatNumber(stats?.users?.total ?? 0)}
            subtitle={`+${stats?.users?.newToday ?? 0} today`}
            icon="people"
            iconColor="#6366f1"
            onPress={() => router.push('/(dashboard)/users')}
          />
          <OverviewCard
            title="Active Merchants"
            value={formatNumber(stats?.merchants?.active ?? 0)}
            subtitle={`${stats?.merchants?.total ?? 0} total`}
            icon="storefront"
            iconColor="#10b981"
            onPress={() => router.push('/(dashboard)/merchants')}
          />
          <OverviewCard
            title="Orders Today"
            value={formatNumber(stats?.orders?.today ?? 0)}
            subtitle={`${stats?.orders?.pendingCount ?? 0} pending`}
            icon="receipt"
            iconColor="#f59e0b"
            onPress={() => router.push('/(dashboard)/orders')}
          />
          <OverviewCard
            title="GMV Today"
            value={formatCurrency(stats?.revenue?.today ?? 0)}
            subtitle="Gross merchandise value"
            icon="wallet"
            iconColor="#3b82f6"
          />
        </View>
      </View>

      {/* Platform Revenue Trend (from analytics service) */}
      {platformSummary && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            Platform Revenue (30 Days)
          </Text>
          <View style={[s.chartCard, { backgroundColor: colors.card }]}>
            <View style={s.platformRevenueRow}>
              <View style={s.platformRevenueStat}>
                <Text style={[s.platformRevenueValue, { color: colors.text }]}>
                  {formatCurrency(platformSummary.revenue)}
                </Text>
                <Text style={[s.platformRevenueLabel, { color: colors.icon }]}>
                  Total Revenue
                </Text>
              </View>
              <View style={s.platformRevenueStat}>
                <Text style={[s.platformRevenueValue, { color: colors.text }]}>
                  {formatNumber(platformSummary.visitors)}
                </Text>
                <Text style={[s.platformRevenueLabel, { color: colors.icon }]}>
                  Unique Visitors
                </Text>
              </View>
              <View style={s.platformRevenueStat}>
                <Text style={[s.platformRevenueValue, { color: colors.success }]}>
                  {(platformSummary.newVsReturning.ratio * 100).toFixed(0)}%
                </Text>
                <Text style={[s.platformRevenueLabel, { color: colors.icon }]}>
                  New Visitors
                </Text>
              </View>
            </View>
            {platformSummary.days.length > 0 &&
              (() => {
                const last14 = platformSummary.days.slice(-14);
                const maxRev = Math.max(...last14.map((x) => x.revenue), 1);
                return (
                  <View style={s.platformTrendBars}>
                    {last14.map((d) => {
                      const pct = Math.max((d.revenue / maxRev) * 100, 4);
                      return (
                        <View key={d.date} style={s.trendBarCol}>
                          <View style={s.trendBarTrack}>
                            <View
                              style={[
                                s.trendBarFill,
                                { height: `${pct}%` as ViewStyle['height'], backgroundColor: colors.tint },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
          </View>
        </View>
      )}

      {/* User Growth — 7 Day Chart */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>User Growth (7 Days)</Text>
          <TouchableOpacity onPress={() => router.push('/(dashboard)/users')}>
            <Text style={[s.viewAllLink, { color: colors.tint }]}>View all</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.chartCard, { backgroundColor: colors.card }]}>
          {userGrowth.length > 0 ? (
            <>
              <MiniBarChart data={userGrowth} max={maxNewUsers} />
              <View style={s.growthSummary}>
                <View style={s.growthSummaryItem}>
                  <Text style={[s.growthLabel, { color: colors.icon }]}>Total New (7d)</Text>
                  <Text style={[s.growthValue, { color: colors.text }]}>
                    {formatNumber(userGrowth.reduce((s, d) => s + d.newUsers, 0))}
                  </Text>
                </View>
                <View style={s.growthSummaryItem}>
                  <Text style={[s.growthLabel, { color: colors.icon }]}>Daily Avg</Text>
                  <Text style={[s.growthValue, { color: colors.text }]}>
                    {formatNumber(
                      Math.round(
                        userGrowth.reduce((s, d) => s + d.newUsers, 0) / (userGrowth.length || 1)
                      )
                    )}
                  </Text>
                </View>
                <View style={s.growthSummaryItem}>
                  <Text style={[s.growthLabel, { color: colors.icon }]}>Peak Day</Text>
                  <Text style={[s.growthValue, { color: colors.text }]}>
                    {formatNumber(maxNewUsers)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={s.emptyChart}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.icon} />
              <Text style={[s.emptyChartText, { color: colors.icon }]}>
                No user growth data available
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Top Merchants by Revenue */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            Top Merchants by Revenue
          </Text>
          <TouchableOpacity onPress={() => router.push('/(dashboard)/merchants')}>
            <Text style={[s.viewAllLink, { color: colors.tint }]}>View all</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.listCard, { backgroundColor: colors.card }]}>
          {topMerchants.length === 0 ? (
            <View style={s.emptyListRow}>
              <Ionicons name="storefront-outline" size={32} color={colors.icon} />
              <Text style={[s.emptyListText, { color: colors.icon }]}>
                No merchant revenue data
              </Text>
            </View>
          ) : (
            topMerchants.map((m, idx) => (
              <View
                key={m.id}
                style={[
                  s.merchantRow,
                  idx < topMerchants.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={[s.rankBadge, { backgroundColor: `${colors.tint}15` }]}>
                  <Text style={[s.rankText, { color: colors.tint }]}>#{idx + 1}</Text>
                </View>
                <View style={s.merchantInfo}>
                  <Text style={[s.merchantName, { color: colors.text }]} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={[s.merchantCategory, { color: colors.icon }]}>
                    {m.category} &middot; {m.orders} orders
                  </Text>
                </View>
                <Text style={[s.merchantRevenue, { color: colors.success }]}>
                  {formatCurrency(m.revenue)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Suspicious Activity Log */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Suspicious Activity</Text>
          <TouchableOpacity onPress={() => router.push('/(dashboard)/fraud-alerts')}>
            <Text style={[s.viewAllLink, { color: colors.tint }]}>View all</Text>
          </TouchableOpacity>
        </View>
        {suspicious.length === 0 ? (
          <View style={[s.cleanCard, { backgroundColor: colors.card }]}>
            <Ionicons name="shield-checkmark" size={36} color={colors.success} />
            <Text style={[s.cleanText, { color: colors.text }]}>No suspicious activity</Text>
            <Text style={[s.cleanSub, { color: colors.icon }]}>
              All transactions look normal
            </Text>
          </View>
        ) : (
          <View style={[s.listCard, { backgroundColor: colors.card }]}>
            {suspicious.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  s.suspiciousRow,
                  idx < suspicious.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[s.severityDot, { backgroundColor: severityColor(item.severity) }]}
                />
                <View style={s.suspiciousInfo}>
                  <View style={s.suspiciousTypeRow}>
                    <View
                      style={[s.typeBadge, { backgroundColor: severityBg(item.severity) }]}
                    >
                      <Text style={[s.typeText, { color: severityColor(item.severity) }]}>
                        {item.type.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.suspiciousDesc, { color: colors.text }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={[s.suspiciousTime, { color: colors.icon }]}>
                    {item.flaggedAt}
                    {item.amount ? ` \u00B7 ${formatCurrency(item.amount)}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Quick Nav Shortcuts */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Deep Dive Analytics</Text>
        <View style={s.shortcutsGrid}>
          {[
            {
              label: 'Business Metrics',
              icon: 'trending-up' as const,
              color: '#6366f1',
              route: '/(dashboard)/business-metrics',
            },
            {
              label: 'Revenue Vertical',
              icon: 'pie-chart' as const,
              color: '#10b981',
              route: '/(dashboard)/revenue-by-vertical',
            },
            {
              label: 'Cohort Analysis',
              icon: 'people-circle' as const,
              color: '#f59e0b',
              route: '/(dashboard)/cohort-analysis',
            },
            {
              label: 'Funnel Analytics',
              icon: 'filter' as const,
              color: '#3b82f6',
              route: '/(dashboard)/funnel-analytics',
            },
            {
              label: 'Marketing',
              icon: 'megaphone' as const,
              color: '#ec4899',
              route: '/(dashboard)/marketing-analytics',
            },
            {
              label: 'Fraud Reports',
              icon: 'shield' as const,
              color: '#ef4444',
              route: '/(dashboard)/fraud-reports',
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[s.shortcutCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(item.route)}
            >
              <View style={[s.shortcutIcon, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[s.shortcutLabel, { color: colors.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

