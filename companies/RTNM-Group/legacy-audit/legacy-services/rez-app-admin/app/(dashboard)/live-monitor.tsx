/**
 * app/(dashboard)/live-monitor.tsx — REZ LIVE MONITOR
 *
 * Refactored: replaces `useState + useEffect + Promise.allSettled` data fetching
 * with React Query hooks (`useSystemHealth`, `useReconciliation`, `useScheduledJobs`).
 *
 * Sections:
 *   1. Live Status Bar   — server online, socket connected, countdown, last update
 *   2. KPI Cards         — orders today, GMV, active users, payment success rate, alerts
 *   3. Server Health     — CPU, memory, uptime, Node version
 *   4. Database & Redis  — MongoDB status/conns/latency, Redis status/keys
 *   5. Live Order Feed   — last 10 orders, socket-pushed
 *   6. Queue Health      — waiting/active/completed/failed per queue
 *   7. Cron Jobs         — name, schedule, last run, status
 *   8. Financial Health  — coins earned/redeemed ratio, cashback, reversals
 *   9. Error Rate        — from system health data
 *  10. Active Connections
 *
 * Auto-refreshes via React Query background refetching + manual pull-to-refresh.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, useColorScheme, AppState, AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { socketService } from '../../services/socket';
import { ordersService, Order } from '../../services/api/orders';
import { useSystemHealth } from '@/hooks/queries/useSystemHealth';
import { useReconciliation } from '@/hooks/queries/useSystemHealth';
import { useScheduledJobs } from '@/hooks/queries/useSystemHealth';
import type { EconomicsOverview } from '../../services/api/economics';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { PulseDot, Pill } from '../../components/live-monitor/LiveMonitorComponents';
import { s } from './styles/live-monitor.styles';
import {
  KpiRow, ServerHealthSection, DatabaseRedisSection, QueueHealthSection,
  CronJobsSection, FinancialHealthSection, ErrorRateSection, ActiveConnectionsSection,
  formatRupees,
} from '../../components/live-monitor/Sections';

const NAVY = Colors.light.navy;
const BG = Colors.light.background;

interface LiveOrderItem {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
  storeName: string;
  createdAt: string;
}

function orderStatusColor(status: string): string {
  const map: Record<string, string> = {
    delivered: Colors.light.success, confirmed: Colors.light.info,
    preparing: Colors.light.warning, ready: Colors.light.cyan,
    dispatched: Colors.light.info, placed: Colors.light.purple,
    cancelled: Colors.light.error, refunded: Colors.light.orange,
    returned: Colors.light.orange, out_for_delivery: Colors.light.purple,
    cancelling: Colors.light.warning,
  };
  return map[status] ?? Colors.light.muted;
}

function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing',
    ready: 'Ready', dispatched: 'Dispatched', out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered', cancelling: 'Cancelling', cancelled: 'Cancelled',
    refunded: 'Refunded', returned: 'Returned',
  };
  return map[status] ?? status;
}

function timeAgo(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return iso;
  }
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function LiveMonitorScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const queryClient = useQueryClient();

  // React Query hooks — replaces Promise.allSettled pattern
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: reconciliation } = useReconciliation();
  const { data: scheduledJobs } = useScheduledJobs();

  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [liveOrderFeed, setLiveOrderFeed] = useState<LiveOrderItem[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [fetchedAt] = useState(new Date());
  const [socketConnectionLost, setSocketConnectionLost] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Live Order Feed + Socket ───────────────────────────────────────────────
  // Keep socket-specific logic separate from data-fetching hooks.
  // The live order feed is a real-time push channel, distinct from the
  // React Query polling that handles system health / stats / economics.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let unsubLost: (() => void) | undefined;
    let unsubRestored: (() => void) | undefined;

    const setup = async () => {
      try {
        unsubLost = socketService.onConnectionLost(() => setSocketConnectionLost(true));
        unsubRestored = socketService.onConnectionRestored(() => setSocketConnectionLost(false));
        await socketService.connect();
        setSocketConnected(true);

        const unsub = socketService.onNewOrder(({ orderId, merchantName, amount }) => {
          setLiveOrderFeed((prev) => [{
            id: orderId,
            orderNumber: `#${orderId.slice(-6).toUpperCase()}`,
            amount,
            status: 'placed',
            storeName: merchantName,
            createdAt: new Date().toISOString(),
          }, ...prev.slice(0, 9)]);
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
        });

        // Seed live feed from last 10 orders on connect
        try {
          const resp = await ordersService.getOrders(1, 10);
          const orders: LiveOrderItem[] = (resp.orders ?? []).map((o: Order) => ({
            id: o._id, orderNumber: o.orderNumber, amount: o.totals?.total ?? 0,
            status: o.status, storeName: o.store?.name ?? 'Unknown', createdAt: o.createdAt,
          }));
          setLiveOrderFeed(orders);
        } catch { /* non-critical */ }

        cleanup = unsub;
      } catch {
        setSocketConnected(false);
      }
    };

    setup();

    return () => {
      if (cleanup) cleanup();
      if (unsubLost) unsubLost();
      if (unsubRestored) unsubRestored();
    };
  }, [queryClient]);

  // ── Countdown timer (no data fetching — just UI update) ─────────────────────
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 10 : c - 1));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // ── AppState: pause countdown when backgrounded ─────────────────────────────
  useEffect(() => {
    const handle = (next: AppStateStatus) => {
      if (next === 'active') setCountdown(10);
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, []);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.system.health() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.system.reconciliation() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.system.jobs() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() }),
    ]);
    setRefreshing(false);
    setCountdown(10);
  }, [queryClient]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const serverOnline = health !== null && !healthLoading;
  const overallStatus = health?.overallStatus ?? 'unknown';
  const queues = health?.queues?.queues ?? [];
  const jobs = health?.jobs ?? scheduledJobs ?? [];
  const totalFailed = queues.reduce((sum: number, q: { failed?: number }) => sum + (q.failed ?? 0), 0);
  const fraudAlertCount = (health as unknown as {fraudAlerts?: {alertCount?: number}})?.fraudAlerts?.alertCount ?? 0;
  const activeAlerts = fraudAlertCount + (totalFailed > 0 ? 1 : 0);
  const ordersToday = (health as unknown as {stats?: {orders?: {today?: number}}})?.stats?.orders?.today ?? 0;
  const gmvToday = (health as unknown as {stats?: {revenue?: {today?: number}}})?.stats?.revenue?.today ?? 0;

  // BUG-019: Use actual success/failure counts
  const paymentSuccessCount = (health as unknown as {payments?: {successCount?: number}})?.payments?.successCount;
  const paymentFailureCount = (health as unknown as {payments?: {failureCount?: number}})?.payments?.failureCount;
  const paymentSuccessRate: number | null =
    paymentSuccessCount != null && paymentFailureCount != null
      ? paymentSuccessCount + paymentFailureCount > 0
        ? Math.round((paymentSuccessCount / (paymentSuccessCount + paymentFailureCount)) * 100)
        : null
      : null;
  const paymentSuccessDisplay = paymentSuccessRate !== null ? `${paymentSuccessRate}%` : 'N/A';

  // ── Loading state ──────────────────────────────────────────────────────────
  if (healthLoading) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: NAVY }]} edges={['top']}>
        <StatusBar style="light" />
        <View style={s.loadingOuter}>
          <View style={s.loadingInner}>
            <ActivityIndicator size="large" color={NAVY} />
            <Text style={s.loadingText}>Loading Live Monitor...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: NAVY }]} edges={['top']}>
      <StatusBar style="light" />

      {socketConnectionLost && (
        <View style={{ backgroundColor: Colors.light.error, paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Connection lost — real-time updates unavailable. Pull to refresh.</Text>
        </View>
      )}

      {/* ── Top Status Bar ────────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.card} />
        </TouchableOpacity>
        <View style={s.topBarCenter}>
          <Text style={s.topBarTitle}>LIVE MONITOR</Text>
          <Text style={s.topBarSub}>{fetchedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
        </View>
        <View style={s.topBarRight}>
          <View style={s.statusPill}>
            <PulseDot color={serverOnline ? Colors.light.success : Colors.light.error} />
            <Text style={[s.statusPillText, { color: serverOnline ? Colors.light.success : Colors.light.error }]}>
              {serverOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={[s.statusPill, { marginLeft: 6 }]}>
            <PulseDot color={socketConnected ? '#06B6D4' : Colors.light.warning} />
            <Text style={[s.statusPillText, { color: socketConnected ? '#06B6D4' : Colors.light.warning }]}>
              {socketConnected ? 'Socket' : 'No WS'}
            </Text>
          </View>
          <View style={[s.statusPill, { marginLeft: 6, backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <Ionicons name="refresh" size={11} color={Colors.light.card} />
            <Text style={[s.statusPillText, { color: '#fff' }]}>{countdown}s</Text>
          </View>
        </View>
      </View>

      {/* ── Overall Health Banner ───────────────────────────────────────────── */}
      <View style={[s.healthBanner, { backgroundColor: overallStatus === 'healthy' ? Colors.light.successLight2 : overallStatus === 'degraded' ? Colors.light.warningLight : Colors.light.errorLight }]}>
        <Ionicons
          name={overallStatus === 'healthy' ? 'shield-checkmark' : overallStatus === 'degraded' ? 'warning' : 'alert-circle'}
          size={14}
          color={overallStatus === 'healthy' ? Colors.light.greenDark : overallStatus === 'degraded' ? Colors.light.warningDark : Colors.light.errorDark}
        />
        <Text style={[s.healthBannerText, { color: overallStatus === 'healthy' ? Colors.light.greenDark : overallStatus === 'degraded' ? Colors.light.warningDark : Colors.light.errorDark }]}>
          Platform is <Text style={{ fontWeight: '700', textTransform: 'uppercase' }}>
            {overallStatus === 'healthy' ? 'FULLY OPERATIONAL' : overallStatus === 'degraded' ? 'DEGRADED' : 'UNHEALTHY'}
          </Text>
          {totalFailed > 0 && `  \u2022  ${totalFailed} queue failure${totalFailed > 1 ? 's' : ''}`}
          {fraudAlertCount > 0 && `  \u2022  ${fraudAlertCount} fraud alert${fraudAlertCount > 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* ── Scrollable Body ─────────────────────────────────────────────── */}
      <ScrollView
        style={[s.scroll, { backgroundColor: BG }]}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards */}
        <KpiRow
          ordersToday={ordersToday}
          gmvToday={gmvToday}
          activeUsers={(health as unknown as {stats?: {users?: {active?: number}}})?.stats?.users?.active?.toLocaleString() ?? '—'}
          paymentSuccessDisplay={paymentSuccessDisplay}
          paymentSuccessRate={paymentSuccessRate}
          activeAlerts={activeAlerts}
          fraudAlertCount={fraudAlertCount}
          socketConnected={socketConnected}
        />

        {/* Server Health */}
        <ServerHealthSection health={health ?? null} />

        {/* Database & Redis */}
        <DatabaseRedisSection health={health ?? null} />

        {/* Live Order Feed */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <View style={[s.cardIconBox, { backgroundColor: `${Colors.light.orange}20` }]}>
                <Ionicons name="pulse-outline" size={16} color={Colors.light.orange} />
              </View>
              <Text style={s.cardTitle}>Live Order Feed</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PulseDot color={socketConnected ? Colors.light.success : Colors.light.warning} />
              <Text style={{ fontSize: 11, color: Colors.light.muted, fontWeight: '500' }}>{socketConnected ? 'Live' : 'Polled'}</Text>
            </View>
          </View>
          {liveOrderFeed.length > 0 ? (
            <>
              <View style={[s.tableHead, { borderBottomColor: Colors.light.border }]}>
                <Text style={[s.tableHeadCell, { flex: 2 }]}>Order</Text>
                <Text style={[s.tableHeadCell, { flex: 2 }]}>Store</Text>
                <Text style={[s.tableHeadCell, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
                <Text style={[s.tableHeadCell, { flex: 1.5, textAlign: 'center' }]}>Status</Text>
                <Text style={[s.tableHeadCell, { flex: 1.2, textAlign: 'right' }]}>Time</Text>
              </View>
              {liveOrderFeed.slice(0, 10).map((order, idx) => (
                <View key={`${order.id}-${idx}`} style={[s.tableRow, idx < liveOrderFeed.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border }]}>
                  <Text style={[s.tableCell, { flex: 2, color: Colors.light.navy, fontWeight: '600' }]} numberOfLines={1}>{order.orderNumber}</Text>
                  <Text style={[s.tableCell, { flex: 2 }]} numberOfLines={1}>{order.storeName}</Text>
                  <Text style={[s.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: '600' }]}>{formatRupees(order.amount)}</Text>
                  <View style={{ flex: 1.5, alignItems: 'center' }}>
                    <Pill label={orderStatusLabel(order.status)} color={orderStatusColor(order.status)} bg={`${orderStatusColor(order.status)}18`} />
                  </View>
                  <Text style={[s.tableCell, { flex: 1.2, textAlign: 'right', color: Colors.light.muted }]}>{timeAgo(order.createdAt)}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={{ fontSize: 13, color: Colors.light.muted, textAlign: 'center', paddingVertical: 16 }}>No orders to display</Text>
          )}
        </View>

        {/* Queue Health */}
        <QueueHealthSection health={health ?? null} totalFailed={totalFailed} />

        {/* Cron Jobs */}
        <CronJobsSection jobs={jobs} />

        {/* Financial Health */}
        <FinancialHealthSection economics={health as unknown as EconomicsOverview ?? null} coinRatio={(health as unknown as {coinRatio?: string})?.coinRatio ?? 'N/A'} />

        {/* Error Rate & Alerts */}
        <ErrorRateSection totalFailed={totalFailed} fraudAlertCount={fraudAlertCount} economics={health as unknown as EconomicsOverview ?? null} />

        {/* Active Connections */}
        <ActiveConnectionsSection socketConnected={socketConnected} serverOnline={serverOnline} health={health ?? null} />

        {/* Footer */}
        <View style={s.footer}>
          <Ionicons name="refresh-circle" size={16} color={Colors.light.muted} />
          <Text style={s.footerText}>Pull to refresh \u00b7 Auto-refetch via React Query \u00b7 Next in {countdown}s</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

