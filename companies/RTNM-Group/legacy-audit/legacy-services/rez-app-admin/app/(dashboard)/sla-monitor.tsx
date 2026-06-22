/**
 * SLA Monitor Screen — v3 Architecture Part 13
 *
 * Real-time dashboard for the three SLA contracts:
 *   1. Customer snapshot freshness   — breach > 15 min stale
 *   2. Merchant-events queue depth   — breach > 500 pending
 *   3. Daily stats availability      — breach if missing by 3am
 *
 * Data sources:
 *   • REST: GET /api/admin/system/sla-status  (polled every 30s)
 *   • Socket: 'sla:breach' event from admin room (real-time alerts)
 */

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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { s } from './styles/sla-monitor.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type SlaStatus = 'ok' | 'warning' | 'breach' | 'unknown' | 'degraded';

interface MetricResult {
  status: SlaStatus;
  reason?: string;
  checkedAt?: string;
  // snapshot
  ageSeconds?: number;
  ageMinutes?: number;
  thresholdSec?: number;
  merchantId?: string;
  // queue
  waiting?: number;
  active?: number;
  failed?: number;
  threshold?: number;
  // daily stats
  date?: string;
  merchantCount?: number;
}

interface SlaData {
  overallStatus: SlaStatus;
  metrics: {
    customerSnapshot: MetricResult;
    merchantEventQueue: MetricResult;
    dailyStats: MetricResult;
    broadcastQueue: MetricResult;
  };
  generatedAt: string;
}

interface BreachAlert {
  id: string;
  metric: string;
  value: string;
  severity: 'warning' | 'error';
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SlaStatus,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  ok: { color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle', label: 'OK' },
  warning: { color: '#D97706', bg: '#FEF3C7', icon: 'warning', label: 'Warning' },
  breach: { color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle', label: 'Breach' },
  unknown: { color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle', label: 'Unknown' },
  degraded: { color: '#9333EA', bg: '#F3E8FF', icon: 'pulse', label: 'Degraded' },
};

function fmt(ts?: string) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusChip({ status }: { status: SlaStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  return (
    <View style={[s.chip, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
      <Text style={[s.chipText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function MetricCard({
  title,
  icon,
  metric,
  subtitle,
  detail,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  metric: MetricResult;
  subtitle: string;
  detail?: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const cfg = STATUS_CONFIG[metric.status] || STATUS_CONFIG.unknown;

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: cfg.color + '33' }]}>
      <View style={s.cardHeader}>
        <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
          <Ionicons name={icon} size={18} color={cfg.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[s.cardTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[s.cardSubtitle, { color: colors.secondaryText }]}>{subtitle}</Text>
        </View>
        <StatusChip status={metric.status} />
      </View>

      {detail ? <Text style={[s.cardDetail, { color: colors.text }]}>{detail}</Text> : null}

      {metric.reason ? (
        <Text style={[s.cardReason, { color: colors.secondaryText }]}>
          Reason: {metric.reason}
        </Text>
      ) : null}

      <Text style={[s.cardChecked, { color: colors.secondaryText }]}>
        Last checked: {fmt(metric.checkedAt)}
      </Text>
    </View>
  );
}

function BreachItem({ item, colors }: { item: BreachAlert; colors: typeof Colors.light }) {
  const isError = item.severity === 'error';
  return (
    <View
      style={[
        s.breachItem,
        {
          backgroundColor: isError ? '#FEE2E2' : '#FEF3C7',
          borderLeftColor: isError ? '#DC2626' : '#D97706',
        },
      ]}
    >
      <View style={s.breachHeader}>
        <Ionicons
          name={isError ? 'alert-circle' : 'warning'}
          size={14}
          color={isError ? '#DC2626' : '#D97706'}
        />
        <Text style={[s.breachMetric, { color: isError ? '#991B1B' : '#92400E' }]}>
          {item.metric.replace(/_/g, ' ').toUpperCase()}
        </Text>
        <Text style={[s.breachTime, { color: colors.secondaryText }]}>
          {fmt(item.timestamp)}
        </Text>
      </View>
      <Text style={[s.breachValue, { color: colors.text }]}>{item.value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SlaMonitorScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [data, setData] = useState<SlaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [breaches, setBreaches] = useState<BreachAlert[]>([]);
  const [lastPoll, setLastPoll] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { connected, on, off } = useAdminSocket();

  // ── Fetch SLA status from REST ─────────────────────────────────────────────
  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get<SlaData>('admin/system/sla-status');
      if (res?.success && res?.data) {
        setData(res.data);
        setLastPoll(new Date().toISOString());
      }
    } catch (err: any) {
      logger.warn('[SlaMonitor] Fetch failed:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Initial load + 30s poll ────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(() => fetchStatus(true), 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchStatus]);

  // ── Real-time socket breach alerts ─────────────────────────────────────────
  useEffect(() => {
    const handleBreach = (alert: any) => {
      const breach: BreachAlert = {
        id: `${alert.metric}:${Date.now()}`,
        metric: alert.metric,
        value: alert.value,
        severity: alert.severity,
        timestamp: alert.timestamp || new Date().toISOString(),
      };
      setBreaches((prev) => [breach, ...prev].slice(0, 30)); // keep latest 30
      // Refresh data immediately on breach
      fetchStatus(true);
    };

    on('sla:breach', handleBreach);
    return () => off('sla:breach', handleBreach);
  }, [on, off, fetchStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStatus();
  }, [fetchStatus]);

  // ── Build metric detail strings ────────────────────────────────────────────
  // FIX-BUG-MEDIUM-002: Add fallback values to prevent "undefined" in UI strings
  const snapshotDetail = data?.metrics.customerSnapshot
    ? data.metrics.customerSnapshot.ageSeconds !== undefined
      ? `${data.metrics.customerSnapshot.ageMinutes ?? '?'}m stale  ·  SLA: <15m`
      : data.metrics.customerSnapshot.reason || 'Unable to fetch status'
    : null;

  const queueDetail = data?.metrics.merchantEventQueue
    ? data.metrics.merchantEventQueue.waiting !== undefined
      ? `${data.metrics.merchantEventQueue.waiting ?? '?'} waiting  ·  ${data.metrics.merchantEventQueue.active ?? '?'} active  ·  SLA: <500`
      : data.metrics.merchantEventQueue.reason || 'Unable to fetch status'
    : null;

  const dailyStatsDetail = data?.metrics.dailyStats
    ? data.metrics.dailyStats.merchantCount !== undefined
      ? `${data.metrics.dailyStats.merchantCount ?? '?'} merchants have stats for ${data.metrics.dailyStats.date ?? '?'}`
      : data.metrics.dailyStats.reason || 'Unable to fetch status'
    : null;

  const broadcastDetail = data?.metrics.broadcastQueue
    ? data.metrics.broadcastQueue.waiting !== undefined
      ? `${data.metrics.broadcastQueue.waiting ?? '?'} waiting  ·  ${data.metrics.broadcastQueue.active ?? '?'} active`
      : data.metrics.broadcastQueue.reason || 'Unable to fetch status'
    : null;

  const overallCfg = STATUS_CONFIG[data?.overallStatus || 'unknown'];

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ── */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View>
          <Text style={[s.title, { color: colors.text }]}>SLA Monitor</Text>
          <Text style={[s.subtitle, { color: colors.secondaryText }]}>
            v3 Merchant Platform Observability
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => fetchStatus()}
          style={[s.refreshBtn, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Ionicons name="refresh" size={18} color={colors.tint} />
        </TouchableOpacity>
      </View>

      {/* ── Overall status banner ── */}
      {data ? (
        <View
          style={[
            s.banner,
            { backgroundColor: overallCfg.bg, borderColor: overallCfg.color + '55' },
          ]}
        >
          <Ionicons name={overallCfg.icon} size={22} color={overallCfg.color} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[s.bannerTitle, { color: overallCfg.color }]}>
              System Status: {overallCfg.label}
            </Text>
            <Text style={[s.bannerSub, { color: overallCfg.color + 'CC' }]}>
              Updated {fmt(data.generatedAt)} · Poll every 30s
            </Text>
          </View>
          {/* Socket indicator */}
          <View
            style={[s.socketDot, { backgroundColor: connected ? '#10B981' : '#9CA3AF' }]}
          />
          <Text style={[s.socketLabel, { color: colors.secondaryText }]}>
            {connected ? 'Live' : 'Polling'}
          </Text>
        </View>
      ) : loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={colors.tint} />
          <Text style={[s.loadingText, { color: colors.secondaryText }]}>
            Loading SLA data…
          </Text>
        </View>
      ) : null}

      {/* ── Metric Cards ── */}
      {data ? (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.secondaryText }]}>METRICS</Text>

          <MetricCard
            title="Customer Snapshot Freshness"
            icon="people"
            metric={data.metrics.customerSnapshot}
            subtitle="Alert if snapshot is > 15 min stale"
            detail={snapshotDetail ?? undefined}
          />

          <MetricCard
            title="Merchant Event Queue"
            icon="layers"
            metric={data.metrics.merchantEventQueue}
            subtitle="Alert if > 500 pending jobs"
            detail={queueDetail ?? undefined}
          />

          <MetricCard
            title="Daily Stats Availability"
            icon="bar-chart"
            metric={data.metrics.dailyStats}
            subtitle="Alert if yesterday's stats missing by 3am"
            detail={dailyStatsDetail ?? undefined}
          />

          <MetricCard
            title="Broadcast Queue"
            icon="megaphone"
            metric={data.metrics.broadcastQueue}
            subtitle="Campaign broadcast dispatch depth"
            detail={broadcastDetail ?? undefined}
          />
        </View>
      ) : null}

      {/* ── Breach History ── */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={[s.sectionTitle, { color: colors.secondaryText }]}>BREACH ALERTS</Text>
          {breaches.length > 0 ? (
            <TouchableOpacity onPress={() => setBreaches([])}>
              <Text style={[s.clearBtn, { color: colors.tint }]}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {breaches.length === 0 ? (
          <View
            style={[s.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="checkmark-circle-outline" size={28} color="#10B981" />
            <Text style={[s.emptyText, { color: colors.secondaryText }]}>
              No breach alerts this session
            </Text>
            <Text style={[s.emptySubText, { color: colors.secondaryText }]}>
              Alerts appear here in real-time via socket
            </Text>
          </View>
        ) : (
          <FlatList
            data={breaches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <BreachItem item={item} colors={colors} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          />
        )}
      </View>

      {/* ── SLA Reference ── */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.secondaryText }]}>SLA THRESHOLDS</Text>
        <View
          style={[s.refCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {[
            { label: 'Customer Snapshot', threshold: '< 15 min stale', warn: '5 min' },
            { label: 'Merchant Event Queue', threshold: '< 500 pending', warn: '200 jobs' },
            { label: 'Daily Stats', threshold: 'Present by 3am', warn: 'None' },
            { label: 'Broadcast Queue', threshold: 'No hard limit', warn: '1,000 jobs' },
          ].map((row) => (
            <View key={row.label} style={[s.refRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.refLabel, { color: colors.text }]}>{row.label}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.refBreachVal, { color: '#DC2626' }]}>
                  Breach: {row.threshold}
                </Text>
                <Text style={[s.refWarnVal, { color: '#D97706' }]}>Warn: {row.warn}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {lastPoll ? (
        <Text style={[s.footer, { color: colors.secondaryText }]}>
          Last polled: {fmt(lastPoll)}
        </Text>
      ) : null}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

