import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { s } from './styles/merchant-live-status.styles';

/**
 * Merchant Live Status Screen
 * Real-time overview of all online merchants — active sessions, pending orders,
 * broadcast queues, and health scores.
 *
 * Data: REST poll every 30s + WebSocket events for live session changes.
 */

interface MerchantLiveEntry {
  merchantId: string;
  businessName: string;
  city: string;
  activeSessions: number;
  pendingOrders: number;
  broadcastQueueDepth: number;
  healthScore: number | null;
  lastSeenAt: string;
  status: 'online' | 'idle' | 'offline';
}

interface LiveStatusSummary {
  totalOnline: number;
  totalIdle: number;
  totalOffline: number;
  totalActiveSessions: number;
  totalPendingOrders: number;
  generatedAt: string;
}

type SortKey = 'activeSessions' | 'pendingOrders' | 'healthScore' | 'businessName';

export default function MerchantLiveStatusScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [merchants, setMerchants] = useState<MerchantLiveEntry[]>([]);
  const [summary, setSummary] = useState<LiveStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('activeSessions');
  const [filter, setFilter] = useState<'all' | 'online' | 'idle' | 'offline'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  // ── Socket: live events ──────────────────────────
  // NOTE: 'merchant:session:change' and 'merchant:order:change' events have no
  // backend emitter yet. The component relies on polling via fetchData instead.
  const { connected: isConnected } = useAdminSocket();

  const fetchData = useCallback(async () => {
    // Guard against concurrent requests
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      const res = await apiClient.get<{
        merchants: MerchantLiveEntry[];
        summary: LiveStatusSummary;
      }>('admin/system/merchant-live-status');
      if (res.success && res.data) {
        setMerchants(res.data?.merchants ?? []);
        setSummary(res.data?.summary ?? null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      logger.warn('[MerchantLiveStatus] fetch failed', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(() => {
      // Skip if a fetch is already in-flight
      if (!isFetchingRef.current) {
        fetchData();
      }
    }, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  // ── Derived list ──────────────────────────────────────────────────────────
  const filtered = merchants.filter((m) => filter === 'all' || m.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'businessName') return a.businessName.localeCompare(b.businessName);
    if (sortBy === 'healthScore') return (b.healthScore ?? 0) - (a.healthScore ?? 0);
    return (b[sortBy] as number) - (a[sortBy] as number);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const statusColor = (s: MerchantLiveEntry['status']) => {
    if (s === 'online') return colors.greenDark ?? '#22c55e';
    if (s === 'idle') return '#f59e0b';
    return '#94a3b8';
  };

  const statusIcon = (s: MerchantLiveEntry['status']) => {
    if (s === 'online') return 'ellipse';
    if (s === 'idle') return 'ellipse-outline';
    return 'remove-circle-outline';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>
          Loading live status…
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.text }]}>Merchant Live Status</Text>
        <View style={s.headerRight}>
          {isConnected ? (
            <View style={s.liveBadge}>
              <View style={[s.liveDot, { backgroundColor: '#22c55e' }]} />
              <Text style={s.liveText}>LIVE</Text>
            </View>
          ) : (
            <Text style={[s.pollingText, { color: colors.textSecondary }]}>Polling 30s</Text>
          )}
        </View>
      </View>

      {/* Summary Cards */}
      {summary && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.summaryRow}
          contentContainerStyle={s.summaryContent}
        >
          {[
            { label: 'Online', value: summary.totalOnline, color: '#22c55e' },
            { label: 'Idle', value: summary.totalIdle, color: '#f59e0b' },
            { label: 'Offline', value: summary.totalOffline, color: '#94a3b8' },
            {
              label: 'Active Sessions',
              value: summary.totalActiveSessions,
              color: colors.tint,
            },
            { label: 'Pending Orders', value: summary.totalPendingOrders, color: '#f97316' },
          ].map((c) => (
            <View
              key={c.label}
              style={[
                s.summaryCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[s.summaryValue, { color: c.color }]}>{c.value}</Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{c.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Filter + Sort */}
      <View style={s.controls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'online', 'idle', 'offline'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                s.filterChip,
                filter === f && { backgroundColor: colors.tint },
              ]}
            >
              <Text
                style={[s.filterText, { color: filter === f ? '#fff' : colors.textSecondary }]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={s.sortDivider} />
          {(['activeSessions', 'pendingOrders', 'healthScore', 'businessName'] as SortKey[]).map(
            (key) => (
              <TouchableOpacity
                key={key}
                onPress={() => setSortBy(key)}
                style={[
                  s.filterChip,
                  sortBy === key && { backgroundColor: (colors as unknown as {secondary?: string}).secondary ?? '#6366f1' },
                ]}
              >
                <Text
                  style={[
                    s.filterText,
                    { color: sortBy === key ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {key === 'activeSessions'
                    ? 'Sessions'
                    : key === 'pendingOrders'
                      ? 'Orders'
                      : key === 'healthScore'
                        ? 'Health'
                        : 'Name'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* Merchant List */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.merchantId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.textSecondary} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              No merchants matching this filter
            </Text>
          </View>
        }
        ListFooterComponent={
          lastUpdated ? (
            <Text style={[s.updatedAt, { color: colors.textSecondary }]}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={[
              s.merchantCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={s.merchantHeader}>
              <Ionicons
                name={statusIcon(item.status)}
                size={14}
                color={statusColor(item.status)}
                style={s.statusDot}
              />
              <Text style={[s.merchantName, { color: colors.text }]} numberOfLines={1}>
                {item.businessName}
              </Text>
              <Text style={[s.merchantCity, { color: colors.textSecondary }]}>
                {item.city}
              </Text>
            </View>
            <View style={s.merchantStats}>
              {[
                {
                  icon: 'people-outline',
                  label: 'Sessions',
                  value: item.activeSessions,
                  warn: item.activeSessions > 10,
                },
                {
                  icon: 'receipt-outline',
                  label: 'Orders',
                  value: item.pendingOrders,
                  warn: item.pendingOrders > 5,
                },
                {
                  icon: 'megaphone-outline',
                  label: 'Queue',
                  value: item.broadcastQueueDepth,
                  warn: item.broadcastQueueDepth > 20,
                },
                {
                  icon: 'pulse-outline',
                  label: 'Health',
                  value: item.healthScore != null ? `${item.healthScore}%` : 'N/A',
                  warn: item.healthScore != null && item.healthScore < 40,
                },
              ].map((stat) => (
                <View key={stat.label} style={s.stat}>
                  <Ionicons
                    name={stat.icon as unknown as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={stat.warn ? '#f97316' : colors.textSecondary}
                  />
                  <Text style={[s.statValue, { color: stat.warn ? '#f97316' : colors.text }]}>
                    {stat.value}
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </View>
  );
}

