import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { s } from './styles/platform-control-center.styles';

interface PlatformStats {
  totalMerchants: number;
  activeMerchants: number;
  newThisMonth: number;
  churnedMerchants: number;
  planDistribution: {
    starter: number;
    growth: number;
    pro: number;
  };
  mrr: number;
  arr: number;
  upgradesThisMonth: number;
  aggregatorOrders: {
    today: number;
    pending: number;
    acceptanceRate: number;
  };
}

function StatCard({
  label,
  value,
  icon,
  iconColor,
  subtext,
  backgroundColor,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  subtext?: string;
  backgroundColor?: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[s.statCard, { backgroundColor: colors.card }]}>
      <View style={[s.statIconBox, { backgroundColor: backgroundColor || `${iconColor}15` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={s.statContent}>
        <Text style={[s.statLabel, { color: colors.icon }]}>{label}</Text>
        <Text style={[s.statValue, { color: colors.text }]}>
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </Text>
        {subtext && <Text style={[s.statSubtext, { color: colors.icon }]}>{subtext}</Text>}
      </View>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  iconColor,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View style={[s.cardIcon, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={[s.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function HorizontalBarChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View style={s.barChartContainer}>
      <View style={s.barRow}>
        {data.map((item, idx) => (
          <View
            key={idx}
            style={[
              s.barSegment,
              {
                backgroundColor: item.color,
                width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
              },
            ]}
          />
        ))}
      </View>
      <View style={s.barLegend}>
        {data.map((item, idx) => (
          <View key={idx} style={s.legendItem}>
            <View style={[s.legendColor, { backgroundColor: item.color }]} />
            <Text style={[s.legendLabel, { color: colors.text }]}>
              {item.label} ({item.value})
            </Text>
            <Text style={[s.legendPercent, { color: colors.icon }]}>
              {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function QuickActionButton({
  label,
  icon,
  onPress,
  variant = 'primary',
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        s.actionButton,
        {
          backgroundColor: isPrimary ? colors.tint : colors.border,
          borderColor: colors.tint,
          borderWidth: isPrimary ? 0 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={isPrimary ? colors.card : colors.text} />
      <Text
        style={[
          s.actionButtonLabel,
          { color: isPrimary ? colors.card : colors.text },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function PlatformControlCenterScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { hasRole } = useAuth();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();

    // Auto-refresh every 5 minutes
    intervalRef.current = setInterval(() => {
      loadData(true);
    }, 300000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await apiClient.get<PlatformStats>('admin/platform-stats');
      if (response.data) {
        setStats(response.data);
        setDataError(null);
        setIsOfflineMode(false);
      } else {
        setDataError('No data received from server');
        setIsOfflineMode(true);
        setStats(null);
      }
    } catch (error: any) {
      logger.error('Failed to load platform stats:', error.message);
      setDataError(error.message || 'Failed to load platform stats');
      setIsOfflineMode(true);
      setStats(null);
      if (!silent) {
        showAlert('Error', 'Unable to load platform stats. Please check your connection.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Require super_admin role
  if (!hasRole(ADMIN_ROLES.SUPER_ADMIN)) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.icon} />
        <Text style={[s.loadingText, { color: colors.text, fontWeight: '700', fontSize: 18, marginTop: 16 }]}>
          Access Denied
        </Text>
        <Text style={[s.loadingText, { color: colors.icon, textAlign: 'center', paddingHorizontal: 32 }]}>
          You need Super Admin privileges to access the Platform Control Center.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>
          Loading platform stats...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            Platform Control Center
          </Text>
          <Text style={[s.headerSubtitle, { color: colors.icon }]}>
            Real-time platform metrics
          </Text>
        </View>
      </View>

      {isOfflineMode && (
        <View style={[s.errorBanner, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="warning" size={18} color={colors.error} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.errorBannerTitle, { color: colors.error }]}>Offline Mode</Text>
            <Text style={[s.errorBannerText, { color: colors.errorDark }]}>
              Unable to fetch live data. Refresh to retry.
            </Text>
          </View>
        </View>
      )}

      {dataError && !stats && (
        <View style={[s.errorContainer, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="alert-circle" size={24} color={colors.error} />
          <Text style={[s.errorTitle, { color: colors.error }]}>Failed to Load Stats</Text>
          <Text style={[s.errorMessage, { color: colors.errorDark }]}>{dataError}</Text>
          <TouchableOpacity
            style={[s.retryButton, { backgroundColor: colors.error }]}
            onPress={() => loadData(false)}
          >
            <Ionicons name="refresh" size={16} color={colors.card} />
            <Text style={[s.retryButtonText, { color: colors.card }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {stats && (
        <>
          {/* Merchant Health Cards */}
          <SectionCard
            title="Merchant Health"
            icon="people"
            iconColor={colors.success}
          >
            <View style={s.statsGrid}>
              <StatCard
                label="Total Merchants"
                value={stats.totalMerchants}
                icon="storefront"
                iconColor={colors.info}
              />
              <StatCard
                label="Active (Last 7d)"
                value={stats.activeMerchants}
                icon="checkmark-circle"
                iconColor={colors.success}
                subtext={`${((stats.activeMerchants / stats.totalMerchants) * 100).toFixed(1)}% active`}
              />
              <StatCard
                label="New This Month"
                value={stats.newThisMonth}
                icon="add-circle"
                iconColor={colors.warning}
              />
              <StatCard
                label="Churned (30d+)"
                value={stats.churnedMerchants}
                icon="alert-circle"
                iconColor={colors.errorDark}
              />
            </View>
          </SectionCard>

          {/* Plan Distribution */}
          <SectionCard
            title="Plan Distribution"
            icon="pie-chart"
            iconColor={colors.purple}
          >
            <HorizontalBarChart
              data={[
                {
                  label: 'Starter',
                  value: stats.planDistribution.starter,
                  color: colors.info,
                },
                {
                  label: 'Growth',
                  value: stats.planDistribution.growth,
                  color: colors.warning,
                },
                {
                  label: 'Pro',
                  value: stats.planDistribution.pro,
                  color: colors.success,
                },
              ]}
            />
          </SectionCard>

          {/* Revenue Summary */}
          <SectionCard
            title="Revenue Summary"
            icon="cash"
            iconColor={colors.success}
          >
            <View style={s.statsGrid}>
              <StatCard
                label="MRR"
                value={`Rs ${(stats.mrr / 100000).toFixed(1)}L`}
                icon="trending-up"
                iconColor={colors.success}
                subtext="Monthly recurring"
              />
              <StatCard
                label="ARR"
                value={`Rs ${(stats.arr / 10000000).toFixed(1)}Cr`}
                icon="analytics"
                iconColor={colors.info}
                subtext="Annual estimate"
              />
              <StatCard
                label="Upgrades This Month"
                value={stats.upgradesThisMonth}
                icon="arrow-up"
                iconColor={colors.warning}
                subtext="Plan migrations"
              />
            </View>
          </SectionCard>

          {/* Aggregator Activity */}
          <SectionCard
            title="Aggregator Activity"
            icon="rocket"
            iconColor={colors.orange}
          >
            <View style={s.statsGrid}>
              <StatCard
                label="Orders Today"
                value={stats.aggregatorOrders.today}
                icon="bag"
                iconColor={colors.info}
              />
              <StatCard
                label="Pending Orders"
                value={stats.aggregatorOrders.pending}
                icon="hourglass"
                iconColor={colors.warning}
              />
              <StatCard
                label="Acceptance Rate"
                value={`${stats.aggregatorOrders.acceptanceRate}%`}
                icon="checkmark"
                iconColor={colors.success}
              />
            </View>
          </SectionCard>

          {/* Quick Actions */}
          <View style={s.actionsSection}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={s.actionsGrid}>
              <QuickActionButton
                label="View All Merchants"
                icon="list"
                onPress={() => router.push('/(dashboard)/merchants')}
              />
              <QuickActionButton
                label="Merchant Plans"
                icon="layers"
                onPress={() => router.push('/(dashboard)/platform-config')}
                variant="secondary"
              />
              <QuickActionButton
                label="Plan Analytics"
                icon="analytics"
                onPress={() => router.push('/(dashboard)/merchant-plan-analytics')}
              />
              <QuickActionButton
                label="Aggregator Monitor"
                icon="eye"
                onPress={() => router.push('/(dashboard)/aggregator-monitor')}
                variant="secondary"
              />
              <QuickActionButton
                label="System Health"
                icon="pulse"
                onPress={() => router.push('/(dashboard)/system-health')}
              />
            </View>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={[s.footerText, { color: colors.icon }]}>
              Last updated: {new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

