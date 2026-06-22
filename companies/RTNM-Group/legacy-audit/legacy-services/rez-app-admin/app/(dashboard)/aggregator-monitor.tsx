import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/aggregator-monitor.styles';

interface PlatformStats {
  name: string;
  todayOrders: number;
  acceptanceRate: number;
  avgPrepTime: number;
  isAcceptanceEstimated?: boolean;
  isPrepTimeEstimated?: boolean;
}

interface AggregatorOrder {
  id: string;
  platform: string;
  merchantName: string;
  orderTotal: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'rejected';
  timeAgo: string;
}

interface StuckOrder {
  id: string;
  platform: string;
  merchantName: string;
  status: string;
  minutesStuck: number;
}

interface MerchantIntegration {
  merchantId: string;
  merchantName: string;
  platform: string;
  status: 'active' | 'paused' | 'error';
  lastSync: string;
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[s.statCard, { backgroundColor: colors.card }]}>
      <View style={[s.statIconBox, { backgroundColor: `${iconColor}15` }]}>
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
  headerRight,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
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
        {headerRight}
      </View>
      {children}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: colors.warningLight, text: colors.warningDark },
    accepted: { bg: colors.successLight2, text: colors.greenDark },
    preparing: { bg: colors.infoLight, text: colors.infoDark },
    ready: { bg: colors.successLight2, text: colors.greenDark },
    rejected: { bg: colors.errorLight, text: colors.errorDark },
    active: { bg: colors.successLight2, text: colors.greenDark },
    paused: { bg: colors.warningLight, text: colors.warningDark },
    error: { bg: colors.errorLight, text: colors.errorDark },
  };

  const colorSet = statusColors[status] || statusColors.pending;

  return (
    <View style={[s.badge, { backgroundColor: colorSet.bg }]}>
      <Text style={[s.badgeText, { color: colorSet.text }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const platformColors: Record<string, string> = {
    swiggy: '#EF4444',
    zomato: '#F97316',
    // 'dunzo' removed — company shut down in 2024. The historical-data
    // fallback below (colors.icon) handles any legacy rows that still
    // report platform: 'dunzo'.
    ondc: '#3B82F6',
  };

  return (
    <View
      style={[
        s.platformBadge,
        { backgroundColor: platformColors[platform.toLowerCase()] || colors.icon },
      ]}
    >
      <Text style={[s.platformBadgeText]}>{platform.substring(0, 2).toUpperCase()}</Text>
    </View>
  );
}

export default function AggregatorMonitorScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [recentOrders, setRecentOrders] = useState<AggregatorOrder[]>([]);
  const [stuckOrders, setStuckOrders] = useState<StuckOrder[]>([]);
  const [merchantIntegrations, setMerchantIntegrations] = useState<MerchantIntegration[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Load data on mount
    loadData(false);

    // Auto-refresh every 30 seconds if enabled
    if (autoRefreshEnabled) {
      intervalRef.current = setInterval(() => {
        loadData(true);
      }, 30000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefreshEnabled]);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await apiClient.get('/admin/aggregator-orders', {
        platform: '',
        status: '',
        page: 1,
      } as unknown as Record<string, unknown>);

      if (response.success && response.data) {
        // FIX-BUG-MEDIUM-001: Add null guards to avoid crash if API returns undefined fields
        const { orders = [], platformStats: stats = [] } = response.data as unknown as {orders?: unknown[]; platformStats?: unknown[]};

        // Transform platform stats from API format
        const transformedStats: PlatformStats[] = (stats || []).map((stat: any) => ({
          name: stat._id.charAt(0).toUpperCase() + stat._id.slice(1),
          todayOrders: stat.count,
          acceptanceRate: stat.acceptanceRate ?? 95, // Fallback estimated value
          avgPrepTime: stat.avgPrepTime ?? 20, // Fallback estimated value
          isAcceptanceEstimated: stat.acceptanceRate == null,
          isPrepTimeEstimated: stat.avgPrepTime == null,
        }));

        setPlatformStats(transformedStats);
        setRecentOrders((orders as AggregatorOrder[]) || []);
        setStuckOrders((orders as AggregatorOrder[])?.filter((o) => o.status === 'pending').slice(0, 2).map((o) => ({ id: o.id, platform: o.platform, merchantName: o.merchantName, status: o.status, minutesStuck: 0 })) || []);
        // NOTE: Integration status is derived from recent orders, not a real integrations API
        setMerchantIntegrations(
          orders?.slice(0, 5).map((o: any) => ({
            merchantId: o.id,
            merchantName: o.merchantName,
            platform: o.platform,
            status: o.status === 'accepted' || o.status === 'preparing' ? 'active' : 'paused',
            lastSync: o.timeAgo,
          })) || []
        );
      }
    } catch (error: any) {
      if (!silent) {
        showAlert('Error', 'Failed to load aggregator data');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, []);

  const handleRefreshButton = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
    showAlert(
      'Auto Refresh',
      autoRefreshEnabled
        ? 'Auto-refresh disabled. Tap to refresh manually.'
        : 'Auto-refresh enabled every 30s.'
    );
  };

  if (isLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>Loading aggregator data...</Text>
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
          <Text style={[s.headerTitle, { color: colors.text }]}>Aggregator Monitor</Text>
          <Text style={[s.headerSubtitle, { color: colors.icon }]}>
            Real-time order tracking
          </Text>
        </View>
        <TouchableOpacity
          style={[
            s.refreshButton,
            {
              backgroundColor: autoRefreshEnabled ? colors.tint : colors.border,
            },
          ]}
          onPress={handleRefreshButton}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={autoRefreshEnabled ? colors.card : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Platform Stats */}
      <View style={s.platformStatsContainer}>
        {platformStats.map((stat, idx) => (
          <StatCard
            key={idx}
            label={stat.name}
            value={stat.todayOrders}
            subtext={`${stat.acceptanceRate}% acceptance${stat.isAcceptanceEstimated ? ' (estimated)' : ''} | ~${stat.avgPrepTime}min prep${stat.isPrepTimeEstimated ? ' (estimated)' : ''}`}
            icon="bag"
            iconColor={colors.info}
          />
        ))}
      </View>

      {/* Live Order Feed */}
      <SectionCard
        title="Live Order Feed"
        icon="list"
        iconColor={colors.info}
        headerRight={
          <View style={[s.liveIndicator, { backgroundColor: colors.errorDark }]}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Live</Text>
          </View>
        }
      >
        <View style={s.orderFeed}>
          {recentOrders.map((order, idx) => (
            <View
              key={idx}
              style={[
                s.orderItem,
                idx < recentOrders.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={s.orderLeft}>
                <PlatformBadge platform={order.platform} />
                <View style={s.orderInfo}>
                  <Text style={[s.orderId, { color: colors.text }]} numberOfLines={1}>
                    {order.id} • {order.merchantName}
                  </Text>
                  <Text style={[s.orderTime, { color: colors.icon }]}>{order.timeAgo}</Text>
                </View>
              </View>
              <View style={s.orderRight}>
                <Text style={[s.orderAmount, { color: colors.text, fontWeight: '600' }]}>
                  Rs {order.orderTotal}
                </Text>
                <StatusBadge status={order.status} />
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Alert Items - Stuck Orders */}
      {stuckOrders.length > 0 && (
        <SectionCard
          title={`Alert: ${stuckOrders.length} Stuck Orders`}
          icon="alert-circle"
          iconColor={colors.errorDark}
        >
          <View style={s.alertList}>
            {stuckOrders.map((order, idx) => (
              <View
                key={idx}
                style={[
                  s.alertItem,
                  idx < stuckOrders.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={s.alertLeft}>
                  <View style={[s.alertIcon, { backgroundColor: colors.errorLight }]}>
                    <Ionicons name="warning" size={16} color={colors.errorDark} />
                  </View>
                  <View style={s.alertInfo}>
                    <Text style={[s.alertTitle, { color: colors.text }]} numberOfLines={1}>
                      {order.id} • {order.merchantName}
                    </Text>
                    <Text style={[s.alertSubtext, { color: colors.icon }]}>
                      {order.platform} • {order.minutesStuck}min stuck
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={[s.alertAction, { backgroundColor: colors.tint }]}>
                  <Ionicons name="checkmark" size={16} color={colors.card} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {/* Merchant Integration Status */}
      <SectionCard
        title="Merchant Integration Status (estimated)"
        icon="extension-puzzle"
        iconColor={colors.purple}
      >
        <View style={s.integrationList}>
          {merchantIntegrations.map((integration, idx) => (
            <View
              key={idx}
              style={[
                s.integrationItem,
                idx < merchantIntegrations.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={s.integrationLeft}>
                <PlatformBadge platform={integration.platform} />
                <View style={s.integrationInfo}>
                  <Text style={[s.integrationName, { color: colors.text }]} numberOfLines={1}>
                    {integration.merchantName}
                  </Text>
                  <Text style={[s.integrationTime, { color: colors.icon }]}>
                    {integration.lastSync}
                  </Text>
                </View>
              </View>
              <StatusBadge status={integration.status} />
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Integration data disclaimer */}
      <View style={s.infoNoteContainer}>
        <Ionicons name="information-circle-outline" size={14} color={colors.icon} />
        <Text style={[s.infoNoteText, { color: colors.icon }]}>
          Integration data is estimated from recent orders.
        </Text>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={[s.footerText, { color: colors.icon }]}>
          Last updated:{' '}
          {new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          {autoRefreshEnabled && '(auto-refresh enabled)'}
        </Text>
      </View>
    </ScrollView>
  );
}

