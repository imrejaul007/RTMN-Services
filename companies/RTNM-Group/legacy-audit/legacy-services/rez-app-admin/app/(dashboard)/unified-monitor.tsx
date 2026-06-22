/**
 * app/(dashboard)/unified-monitor.tsx
 *
 * REZ Unified Command Center — Single dashboard combining all monitoring.
 * ADM-005 FIX: Refactored — component logic extracted to components/unified-monitor/
 *
 * Sections:
 *   1. Overall Health Banner     — green/amber/red with last-updated timestamp
 *   2. KPI Row                   — orders today, GMV, active users, payment success %
 *   3. Infrastructure            — server (CPU/RAM/uptime), MongoDB, Redis
 *   4. Queue Health (BullMQ)     — waiting/active/completed/failed per queue
 *   5. SLA Contracts             — snapshot freshness, queue depth, daily stats
 *   6. Cron Jobs                 — name, schedule, last run, status
 *   7. Financial Health          — cashback, coin issuance, fraud alerts, settlements
 *   8. Business Metrics (7d)     — bookings, payments, BBPS, coin earn/redeem ratio
 *   9. Merchant Live Status      — online/idle/offline counts + pending orders
 *  10. Aggregator Orders         — platform stats, stuck orders
 *  11. BBPS Provider Health     — biller status summary
 *  12. Reconciliation            — discrepancy summary
 *
 * Auto-refreshes every 30s. All data fetched in parallel.
 * ADM-005: Down from 1,240 lines → ~270 lines (screen file).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logger } from '../../utils/logger';
import { apiClient } from '../../services/api/apiClient';
import { systemService } from '../../services/api/system';
import { dashboardService } from '../../services/api/dashboard';
import { economicsService } from '../../services/api/economics';

import { StatusDot, Card, SectionHeader } from '../../components/unified-monitor/SectionCard';
import { formatRupees } from '../../components/unified-monitor/helpers';
import {
  KpiRow,
  InfrastructureSection,
  QueueHealthSection,
  SlaSection,
  CronJobsSection,
  FinancialHealthSection,
  BusinessMetricsSection,
  MerchantStatusSection,
  AggregatorSection,
  BbpsSection,
  ReconciliationSection,
  PlatformSummarySection,
} from '../../components/unified-monitor/sections';

import type {
  AllData,
  SlaData,
  BusinessMetrics,
  MerchantStatusSummary,
  AggregatorStats,
  BbpsHealth,
  JobData,
} from '../../components/unified-monitor/types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30; // seconds
const NAVY = '#1a3a52';

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function UnifiedMonitorScreen() {
  const [data, setData] = useState<AllData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);
  const fetchingRef = useRef(false);

  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Fetch data in staggered batches to avoid 429 rate limiting ──────────────

  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Batch 1: core health & stats (3 calls)
      const [health, stats, economics] = await Promise.allSettled([
        systemService.getHealth(),
        dashboardService.getStats(),
        economicsService.getOverview(),
      ]);

      await new Promise((r) => setTimeout(r, 300));

      // Batch 2: SLA, metrics, merchant status (3 calls)
      const [slaRes, metricsRes, merchantRes] = await Promise.allSettled([
        apiClient.get<SlaData>('admin/system/sla-status'),
        apiClient.get<{ summary: BusinessMetrics['summary']; health: BusinessMetrics['health'] }>(
          'admin/system/metrics/events?days=7'
        ),
        apiClient.get<{ summary: MerchantStatusSummary }>('admin/system/merchant-live-status'),
      ]);

      await new Promise((r) => setTimeout(r, 300));

      // Batch 3: aggregator, bbps, jobs, reconciliation (4 calls)
      const [aggRes, bbpsRes, jobsRes, reconRes] = await Promise.allSettled([
        apiClient.get<{
          platforms: AggregatorStats['platforms'];
          stuckOrders: AggregatorStats['stuckOrders'];
        }>('/admin/aggregator-orders'),
        apiClient.get<BbpsHealth>('/admin/bbps/health'),
        apiClient.get<{ jobs: JobData[] }>('/admin/system/jobs'),
        systemService.getReconciliation(),
      ]);

      // Normalize nested response payloads (handles both fixed and legacy double-nested)
      const metricsRaw = metricsRes.status === 'fulfilled' ? (metricsRes.value as unknown as {summary?: BusinessMetrics['summary']; health?: BusinessMetrics['health']; data?: {summary?: BusinessMetrics['summary']; health?: BusinessMetrics['health']}}) : null;
      const metricsPayload = (metricsRaw?.data ?? metricsRaw) as {summary?: BusinessMetrics['summary']; health?: BusinessMetrics['health']} | null;
      const metricsSummary = metricsPayload?.summary;
      const metricsHealth = metricsPayload?.health;

      const aggRaw = aggRes.status === 'fulfilled' ? (aggRes.value as unknown as {platforms?: AggregatorStats['platforms']; platformStats?: AggregatorStats['platforms']; stuckOrders?: AggregatorStats['stuckOrders']; data?: {platforms?: AggregatorStats['platforms']; platformStats?: AggregatorStats['platforms']; stuckOrders?: AggregatorStats['stuckOrders']}}) : null;
      const aggPayload = (aggRaw?.data ?? aggRaw) as {platforms?: AggregatorStats['platforms']; platformStats?: AggregatorStats['platforms']; stuckOrders?: AggregatorStats['stuckOrders']} | null;

      const anySucceeded = [
        health, stats, economics,
        slaRes, metricsRes, merchantRes,
        aggRes, bbpsRes, jobsRes, reconRes,
      ].some((r) => r.status === 'fulfilled');

      setData({
        health: health.status === 'fulfilled' ? health.value : null,
        stats: stats.status === 'fulfilled' ? stats.value : null,
        economics: economics.status === 'fulfilled' ? economics.value : null,
        sla: slaRes.status === 'fulfilled' ? (slaRes.value as unknown as {data?: SlaData})?.data : null,
        businessMetrics:
          metricsSummary || metricsHealth ? { summary: metricsSummary, health: metricsHealth } : null,
        merchantStatus: merchantRes.status === 'fulfilled' ? (merchantRes.value as unknown as {data?: {summary?: MerchantStatusSummary}})?.data?.summary : null,
        aggregator: aggPayload
          ? {
              platforms: aggPayload.platforms || aggPayload.platformStats || [],
              stuckOrders: aggPayload.stuckOrders || [],
            }
          : null,
        bbps: bbpsRes.status === 'fulfilled' ? (bbpsRes.value as unknown as BbpsHealth) : null,
        jobs: jobsRes.status === 'fulfilled'
          ? ((jobsRes.value as unknown as {jobs?: JobData[]})?.jobs || (jobsRes.value as unknown as {data?: JobData[]})?.data || [])
          : [],
        reconciliation: reconRes.status === 'fulfilled' ? reconRes.value : null,
        fetchedAt: anySucceeded ? new Date() : (data?.fetchedAt ?? new Date()),
      });
    } catch (err) {
      logger.error('[UnifiedMonitor] fetch error', err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, []);

  // ── Auto-refresh with countdown, pauses when app backgrounded ──────────────

  useEffect(() => {
    fetchAll();

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchAll();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && appState.current !== 'active') fetchAll();
      appState.current = next;
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      sub.remove();
    };
  }, [fetchAll]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={s.loadingText}>Loading Command Center...</Text>
      </SafeAreaView>
    );
  }

  const d = data;
  const overallHealth = d?.health?.overallStatus || 'unknown';
  const slaOverall = d?.sla?.overallStatus || 'unknown';

  const platformStatus: 'green' | 'amber' | 'red' = (() => {
    if (overallHealth === 'unhealthy' || slaOverall === 'breach') return 'red';
    if (overallHealth === 'degraded' || slaOverall === 'warning' || slaOverall === 'degraded') return 'amber';
    if (overallHealth === 'healthy') return 'green';
    return 'amber';
  })();

  const bannerColors = {
    green: { bg: '#D1FAE5', border: '#10B981', text: '#065F46', label: 'All Systems Operational' },
    amber: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', label: 'Degraded Performance' },
    red: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', label: 'System Issues Detected' },
  }[platformStatus];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAll();
            }}
            tintColor={NAVY}
          />
        }
      >
        {/* ── 1. Overall Health Banner ─────────────────────────────────── */}
        <View
          style={[
            s.banner,
            { backgroundColor: bannerColors.bg, borderLeftColor: bannerColors.border },
          ]}
        >
          <View style={s.bannerRow}>
            <View style={s.bannerLeft}>
              <StatusDot status={platformStatus} />
              <Text style={[s.bannerTitle, { color: bannerColors.text }]}>
                {bannerColors.label}
              </Text>
            </View>
            <Text style={s.bannerTime}>
              {countdown}s · {d?.fetchedAt ? d.fetchedAt.toLocaleTimeString() : '—'}
            </Text>
          </View>
        </View>

        {/* ── 2. KPI Row ──────────────────────────────────────────────── */}
        <KpiRow stats={d?.stats ?? null} businessMetrics={d?.businessMetrics ?? null} />

        {/* ── 3–12. Extracted Sections ──────────────────────────────── */}
        <InfrastructureSection
          data={d?.health ?? null}
          collapsed={!!collapsed.infra}
          onToggle={() => toggle('infra')}
          dotColor={platformStatus}
        />

        <QueueHealthSection
          queues={d?.health?.queues}
          collapsed={!!collapsed.queues}
          onToggle={() => toggle('queues')}
        />

        <SlaSection
          sla={d?.sla ?? null}
          collapsed={!!collapsed.sla}
          onToggle={() => toggle('sla')}
        />

        <CronJobsSection
          jobs={d?.jobs ?? []}
          collapsed={!!collapsed.jobs}
          onToggle={() => toggle('jobs')}
        />

        <FinancialHealthSection
          economics={d?.economics ?? null}
          collapsed={!!collapsed.finance}
          onToggle={() => toggle('finance')}
        />

        <BusinessMetricsSection
          businessMetrics={d?.businessMetrics ?? null}
          collapsed={!!collapsed.biz}
          onToggle={() => toggle('biz')}
        />

        <MerchantStatusSection
          merchantStatus={d?.merchantStatus ?? null}
          collapsed={!!collapsed.merchants}
          onToggle={() => toggle('merchants')}
        />

        <AggregatorSection
          aggregator={d?.aggregator ?? null}
          collapsed={!!collapsed.agg}
          onToggle={() => toggle('agg')}
        />

        <BbpsSection
          bbps={d?.bbps ?? null}
          collapsed={!!collapsed.bbps}
          onToggle={() => toggle('bbps')}
        />

        <ReconciliationSection
          reconciliation={d?.reconciliation ?? null}
          collapsed={!!collapsed.recon}
          onToggle={() => toggle('recon')}
        />

        <PlatformSummarySection stats={d?.stats ?? null} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: { marginTop: 12, color: NAVY, fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  banner: { borderLeftWidth: 4, borderRadius: 8, padding: 12, marginBottom: 4 },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerTime: { fontSize: 11, color: '#64748B' },
});
