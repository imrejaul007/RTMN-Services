/**
 * LiveMonitorSections — KPI, health, queue, financial sections for the Live Monitor screen.
 * Extracted to keep the main screen file under 500 lines.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import {
  SectionCard, MetricRow, ProgressBar, Pill, KPICard,
  ErrorRateCard, ConnCard,
} from './LiveMonitorComponents';
import type { SystemHealthData } from '../../services/api/system';

interface FraudFlaggedUser { userId: string; userName: string; transactionCount: number; totalEarned: number; }
interface CoinIssuance { todayTotal: number; hourlyRate: number; }
interface CashbackStats { totalAmount: number; transactionCount: number; yesterdayAmount: number; }
interface MerchantLiability { totalPending: number; pendingSettlementCount: number; disputedCount: number; }
interface RewardReversals { pendingReversals: number; completedReversalsToday: number; oldestPendingAge: number | null; }
interface FraudAlerts { topFlaggedUsers?: FraudFlaggedUser[]; }
interface EconomicsOverview { coinIssuance: CoinIssuance; cashbackToday: CashbackStats; merchantLiability: MerchantLiability; rewardReversals: RewardReversals; fraudAlerts?: FraudAlerts; }

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function statusColor(status: string): string {
  if (['healthy', 'connected', 'active'].includes(status)) return Colors.light.success;
  if (['degraded', 'unknown'].includes(status)) return Colors.light.warning;
  return Colors.light.error;
}

export function cpuColor(pct: number): string {
  if (pct < 60) return Colors.light.success;
  if (pct < 80) return Colors.light.warning;
  return Colors.light.error;
}

export function memColor(used: number, total: number): string {
  const ratio = total > 0 ? used / total : 0;
  if (ratio < 0.65) return Colors.light.success;
  if (ratio < 0.85) return Colors.light.warning;
  return Colors.light.error;
}

function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function formatRupees(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export { formatRupees };

// ─── KPI Row ───────────────────────────────────────────────────────────────────

interface KpiRowProps {
  ordersToday: number;
  gmvToday: number;
  activeUsers: number | string;
  paymentSuccessDisplay: string;
  paymentSuccessRate: number | null;
  activeAlerts: number;
  fraudAlertCount: number;
  socketConnected: boolean;
}

export function KpiRow({ ordersToday, gmvToday, activeUsers, paymentSuccessDisplay, paymentSuccessRate, activeAlerts, fraudAlertCount, socketConnected }: KpiRowProps) {
  return (
    <>
      <Text style={styles.sectionLabel}>KEY PERFORMANCE INDICATORS</Text>
      <View style={styles.kpiGrid}>
        <KPICard label="Orders Today" value={typeof ordersToday === 'number' ? ordersToday.toLocaleString() : ordersToday} icon="receipt-outline" iconColor={Colors.light.warning} bg={Colors.light.card} />
        <KPICard label="GMV Today" value={formatRupees(gmvToday)} icon="wallet-outline" iconColor={Colors.light.success} bg={Colors.light.card} sub={socketConnected ? 'Live' : 'Polled'} subColor={socketConnected ? Colors.light.success : Colors.light.muted} />
        <KPICard label="Active Users" value={typeof activeUsers === 'number' ? activeUsers.toLocaleString() : activeUsers} icon="people-outline" iconColor={Colors.light.cyan} bg={Colors.light.card} />
        <KPICard
          label="Pay Success" value={paymentSuccessDisplay} icon="card-outline"
          iconColor={paymentSuccessRate === null ? Colors.light.muted : paymentSuccessRate >= 95 ? Colors.light.success : paymentSuccessRate >= 85 ? Colors.light.warning : Colors.light.error}
          bg={Colors.light.card}
          sub={paymentSuccessRate === null ? 'No data' : paymentSuccessRate >= 95 ? 'Excellent' : paymentSuccessRate >= 85 ? 'Needs attention' : 'CRITICAL'}
          subColor={paymentSuccessRate === null ? Colors.light.muted : paymentSuccessRate >= 95 ? Colors.light.success : paymentSuccessRate >= 85 ? Colors.light.warning : Colors.light.error}
        />
        <KPICard label="Active Alerts" value={activeAlerts} icon={activeAlerts > 0 ? 'alert-circle' : 'checkmark-circle-outline'} iconColor={activeAlerts > 5 ? Colors.light.error : activeAlerts > 0 ? Colors.light.warning : Colors.light.success} bg={Colors.light.card} sub={activeAlerts === 0 ? 'All clear' : undefined} subColor={Colors.light.success} />
        <KPICard label="Fraud Flags" value={fraudAlertCount} icon="shield-outline" iconColor={fraudAlertCount > 0 ? Colors.light.error : Colors.light.success} bg={Colors.light.card} />
      </View>
    </>
  );
}

// ─── Server Health Section ─────────────────────────────────────────────────────

export function ServerHealthSection({ health }: { health: SystemHealthData | null }) {
  const cpuPct = health?.server?.cpuUsagePercent ?? 0;
  const heapUsed = health?.server?.memory?.heapUsedMB ?? 0;
  const heapTotal = health?.server?.memory?.heapTotalMB ?? 0;
  const rssMB = health?.server?.memory?.rssMB ?? 0;
  const overallStatus = health?.overallStatus ?? 'unknown';

  return (
    <SectionCard
      title="Server Health" icon="server-outline" iconColor={Colors.light.info} collapsible
      headerRight={health ? <Pill label={overallStatus.toUpperCase()} color={statusColor(overallStatus)} bg={`${statusColor(overallStatus)}20`} /> : null}
    >
      {health ? (
        <>
          <View style={styles.metricBlock}>
            <View style={styles.metricRowInline}>
              <Text style={styles.metricLabel}>CPU Usage</Text>
              <Text style={[styles.metricValueInline, { color: cpuColor(cpuPct) }]}>{cpuPct}%</Text>
            </View>
            <ProgressBar value={cpuPct} max={100} color={cpuColor(cpuPct)} height={8} />
            <Text style={styles.metricCaption}>{health?.server?.cpuCores ?? '—'} cores · {health?.server?.platform ?? '—'}</Text>
          </View>
          <View style={styles.metricBlock}>
            <View style={styles.metricRowInline}>
              <Text style={styles.metricLabel}>Heap Memory</Text>
              <Text style={[styles.metricValueInline, { color: memColor(heapUsed, heapTotal) }]}>{formatBytes(heapUsed)} / {formatBytes(heapTotal)}</Text>
            </View>
            <ProgressBar value={heapUsed} max={heapTotal} color={memColor(heapUsed, heapTotal)} height={8} />
            <Text style={styles.metricCaption}>RSS: {formatBytes(rssMB)} · System: {health.server.freeMemoryGB}GB free / {health.server.totalMemoryGB}GB</Text>
          </View>
          <MetricRow label="Uptime" value={formatUptime(health.server.uptime)} />
          <MetricRow label="Node.js" value={health.server.nodeVersion} />
          <MetricRow label="PID" value={health.server.pid} />
        </>
      ) : (
        <Text style={styles.naText}>Server data unavailable</Text>
      )}
    </SectionCard>
  );
}

// ─── Database & Redis Section ───────────────────────────────────────────────────

export function DatabaseRedisSection({ health }: { health: SystemHealthData | null }) {
  return (
    <SectionCard
      title="Database & Redis" icon="layers-outline" iconColor={Colors.light.success} collapsible
      headerRight={health ? <Pill label={health.database.status.toUpperCase()} color={statusColor(health.database.status)} bg={`${statusColor(health.database.status)}20`} /> : null}
    >
      {health ? (
        <>
          <View style={styles.subSection}>
            <View style={styles.subSectionHeader}>
              <Ionicons name="server" size={13} color={Colors.light.success} />
              <Text style={styles.subSectionTitle}>MongoDB</Text>
              <View style={[styles.dot, { backgroundColor: statusColor(health.database.status) }]} />
            </View>
            <MetricRow label="Status" value={health.database.status} valueColor={statusColor(health.database.status)} />
            <MetricRow label="Connections" value={health.database.connectionCount} />
            <MetricRow label="Database" value={health.database.name} />
            <MetricRow label="Host" value={health.database.host} />
          </View>
          <View style={[styles.subSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.border, marginTop: 8, paddingTop: 8 }]}>
            <View style={styles.subSectionHeader}>
              <Ionicons name="flash" size={13} color={Colors.light.error} />
              <Text style={styles.subSectionTitle}>Redis</Text>
              <View style={[styles.dot, { backgroundColor: !health.redis.enabled ? Colors.light.muted : statusColor(health.redis.status) }]} />
            </View>
            <MetricRow label="Status" value={health.redis.enabled ? health.redis.status : 'Disabled'} valueColor={health.redis.enabled ? statusColor(health.redis.status) : Colors.light.muted} />
            {health.redis.memory && <MetricRow label="Memory" value={health.redis.memory} />}
            <MetricRow label="Keys (DB Size)" value={health.redis.dbSize} />
          </View>
        </>
      ) : (
        <Text style={styles.naText}>Database data unavailable</Text>
      )}
    </SectionCard>
  );
}

// ─── Queue Health Section ──────────────────────────────────────────────────────

interface QueueHealthSectionProps {
  health: SystemHealthData | null;
  totalFailed: number;
}

export function QueueHealthSection({ health, totalFailed }: QueueHealthSectionProps) {
  const queues = health?.queues?.queues ?? [];

  return (
    <SectionCard
      title="Queue Health (BullMQ)" icon="list-outline" iconColor={Colors.light.purple} collapsible
      headerRight={health?.queues ? <Pill label={health.queues.overall.toUpperCase()} color={statusColor(health.queues.overall)} bg={`${statusColor(health.queues.overall)}20`} /> : null}
    >
      {queues.length > 0 ? (
        <>
          <View style={[styles.tableHead, { borderBottomColor: Colors.light.border }]}>
            <Text style={[styles.tableHeadCell, { flex: 2.5 }]}>Queue</Text>
            <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'center' }]}>Wait</Text>
            <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'center' }]}>Active</Text>
            <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'center' }]}>Done</Text>
            <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'center' }]}>Fail</Text>
          </View>
          {queues.map((q, idx) => {
            const hasFailed = (q.failed ?? 0) > 0;
            return (
              <View key={q.name} style={[styles.tableRow, hasFailed && { backgroundColor: `${Colors.light.error}08` }, idx < queues.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border }]}>
                <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {hasFailed && <View style={[styles.dot, { backgroundColor: Colors.light.error, flexShrink: 0 }]} />}
                  <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>{q.name}</Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{q.status === 'disabled' ? '—' : (q.waiting ?? 0)}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{q.status === 'disabled' ? '—' : (q.active ?? 0)}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: Colors.light.success }]}>{q.status === 'disabled' ? '—' : (q.completed ?? 0)}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', fontWeight: hasFailed ? '700' : '400' }, hasFailed && { color: Colors.light.error }]}>{q.status === 'disabled' ? '—' : (q.failed ?? 0)}</Text>
              </View>
            );
          })}
        </>
      ) : (
        <Text style={styles.naText}>Queue data unavailable</Text>
      )}
    </SectionCard>
  );
}

// ─── Cron Jobs Section ─────────────────────────────────────────────────────────

export function CronJobsSection({ jobs }: { jobs: any[] }) {
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

  return (
    <SectionCard title="Scheduled Cron Jobs" icon="time-outline" iconColor={Colors.light.warning} collapsible>
      {jobs.length > 0 ? (
        jobs.map((job, idx) => (
          <View key={job.name} style={[styles.jobRow, idx < jobs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.jobNameRow}>
                <Text style={styles.jobName} numberOfLines={1}>{job.name}</Text>
                <Pill label={job.status.toUpperCase()} color={job.status === 'active' ? Colors.light.greenDark : Colors.light.muted} bg={job.status === 'active' ? Colors.light.successLight2 : Colors.light.gray100} />
              </View>
              <Text style={styles.jobDesc} numberOfLines={1}>{job.description}</Text>
              <View style={styles.jobMeta}>
                <Text style={styles.jobMetaItem}><Ionicons name="repeat" size={11} color={Colors.light.muted} /> {job.scheduleHuman}</Text>
                <Text style={styles.jobMetaItem}><Ionicons name="checkmark-circle" size={11} color={job.lastRun ? Colors.light.success : Colors.light.muted} /> {job.lastRun ? timeAgo(job.lastRun) : 'Never ran'}</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.naText}>No scheduled jobs data</Text>
      )}
    </SectionCard>
  );
}

// ─── Financial Health Section ──────────────────────────────────────────────────

interface FinancialHealthSectionProps {
  economics: EconomicsOverview | null;
  coinRatio: string;
}

export function FinancialHealthSection({ economics, coinRatio }: FinancialHealthSectionProps) {
  return (
    <SectionCard title="Financial Health" icon="cash-outline" iconColor={Colors.light.success} collapsible>
      {economics ? (
        <>
          <View style={styles.metricBlock}>
            <View style={styles.metricRowInline}>
              <Text style={styles.metricLabel}>Coins Earned Today</Text>
              <Text style={[styles.metricValueInline, { color: Colors.light.warning }]}>{economics.coinIssuance.todayTotal.toLocaleString()}</Text>
            </View>
            <View style={styles.metricRowInline}>
              <Text style={styles.metricLabel}>Coin Hourly Rate</Text>
              <Text style={styles.metricValueInline}>{economics.coinIssuance.hourlyRate.toFixed(1)}/hr</Text>
            </View>
            <View style={styles.metricRowInline}>
              <Text style={styles.metricLabel}>Earned vs Redeemed</Text>
              <Text style={[styles.metricValueInline, { color: coinRatio === 'N/A' ? Colors.light.muted : parseFloat(coinRatio) <= 1.2 ? Colors.light.success : parseFloat(coinRatio) <= 1.5 ? Colors.light.warning : Colors.light.error }]}>{coinRatio}x</Text>
            </View>
            <Text style={styles.metricCaption}>Ratio &lt; 1.2 is sustainable</Text>
          </View>
          <View style={[styles.subSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.border, marginTop: 8, paddingTop: 8 }]}>
            <Text style={styles.subSectionTitle}>Cashback</Text>
            <MetricRow label="Total Today" value={formatRupees(economics.cashbackToday.totalAmount)} valueColor={Colors.light.success} />
            <MetricRow label="Transactions Today" value={economics.cashbackToday.transactionCount} />
            <MetricRow label="Yesterday Total" value={formatRupees(economics.cashbackToday.yesterdayAmount)} valueColor={Colors.light.muted} />
          </View>
          <View style={[styles.subSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.border, marginTop: 8, paddingTop: 8 }]}>
            <Text style={styles.subSectionTitle}>Merchant Liability</Text>
            <MetricRow label="Total Pending" value={formatRupees(economics.merchantLiability.totalPending)} />
            <MetricRow label="Pending Settlement Count" value={economics.merchantLiability.pendingSettlementCount} />
            <MetricRow label="Disputed Count" value={economics.merchantLiability.disputedCount} valueColor={economics.merchantLiability.disputedCount > 0 ? Colors.light.error : undefined} />
          </View>
          <View style={[styles.subSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.border, marginTop: 8, paddingTop: 8 }]}>
            <Text style={styles.subSectionTitle}>Reward Reversals</Text>
            <MetricRow label="Pending Reversals" value={economics.rewardReversals.pendingReversals} valueColor={economics.rewardReversals.pendingReversals > 10 ? Colors.light.error : economics.rewardReversals.pendingReversals > 0 ? Colors.light.warning : Colors.light.success} />
            <MetricRow label="Completed Today" value={economics.rewardReversals.completedReversalsToday} />
            {economics.rewardReversals.oldestPendingAge !== null && <MetricRow label="Oldest Pending Age" value={`${economics.rewardReversals.oldestPendingAge}h`} valueColor={economics.rewardReversals.oldestPendingAge > 48 ? Colors.light.error : Colors.light.warning} />}
          </View>
        </>
      ) : (
        <Text style={styles.naText}>Economics data unavailable</Text>
      )}
    </SectionCard>
  );
}

// ─── Error Rate & Alerts Section ───────────────────────────────────────────────

interface ErrorRateSectionProps {
  totalFailed: number;
  fraudAlertCount: number;
  economics: EconomicsOverview | null;
}

export function ErrorRateSection({ totalFailed, fraudAlertCount, economics }: ErrorRateSectionProps) {
  return (
    <SectionCard title="Error Rate & Alerts" icon="bug-outline" iconColor={Colors.light.error} collapsible>
      <View style={styles.errorRateGrid}>
        <ErrorRateCard label="Queue Failures" count={totalFailed} />
        <ErrorRateCard label="Fraud Flags" count={fraudAlertCount} />
        <ErrorRateCard label="Pending Reversals" count={economics?.rewardReversals?.pendingReversals ?? 0} />
        <ErrorRateCard label="Disputed Settlements" count={economics?.merchantLiability?.disputedCount ?? 0} />
      </View>
      {(economics?.fraudAlerts?.topFlaggedUsers ?? []).length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.subSectionTitle}>Top Fraud-Flagged Users</Text>
          {(economics?.fraudAlerts?.topFlaggedUsers ?? []).slice(0, 5).map((user: FraudFlaggedUser) => (
            <View key={user.userId} style={styles.metricRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>{user.userName}</Text>
                <Text style={styles.metricCaption}>{user.transactionCount} transactions</Text>
              </View>
              <Text style={[styles.metricValue, { color: Colors.light.error }]}>{formatRupees(user.totalEarned)}</Text>
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );
}

// ─── Active Connections Section ─────────────────────────────────────────────────

interface ActiveConnectionsSectionProps {
  socketConnected: boolean;
  serverOnline: boolean;
  health: SystemHealthData | null;
}

export function ActiveConnectionsSection({ socketConnected, serverOnline, health }: ActiveConnectionsSectionProps) {
  return (
    <SectionCard title="Active Connections" icon="wifi-outline" iconColor={Colors.light.cyan} collapsible>
      <View style={styles.connGrid}>
        <ConnCard label="Socket.IO" value={socketConnected ? 'Connected' : 'Disconnected'} icon="radio-button-on" color={socketConnected ? Colors.light.success : Colors.light.error} />
        <ConnCard label="MongoDB" value={health?.database?.connectionCount ? `${health.database.connectionCount} conns` : '—'} icon="layers" color={health?.database?.status === 'connected' ? Colors.light.success : Colors.light.error} />
        <ConnCard label="Redis" value={!health?.redis?.enabled ? 'Disabled' : health?.redis?.status === 'connected' ? `${health.redis.dbSize} keys` : 'Disconnected'} icon="flash" color={!health?.redis?.enabled ? Colors.light.muted : health?.redis?.status === 'connected' ? Colors.light.success : Colors.light.error} />
        <ConnCard label="API Health" value={serverOnline ? 'Operational' : 'Down'} icon="cloud" color={serverOnline ? Colors.light.success : Colors.light.error} />
      </View>
    </SectionCard>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: Colors.light.muted, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  naText: { fontSize: 13, color: Colors.light.muted, textAlign: 'center', paddingVertical: 16 },
  metricBlock: { marginBottom: 10 },
  metricRowInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 13, color: Colors.light.muted, fontWeight: '500' },
  metricValueInline: { fontSize: 13, fontWeight: '700', color: Colors.light.text },
  metricCaption: { fontSize: 11, color: Colors.light.muted, marginTop: 3 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border },
  metricValue: { fontSize: 13, fontWeight: '700', color: Colors.light.text },
  subSection: {},
  subSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  subSectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.light.gray600, textTransform: 'uppercase', letterSpacing: 0.4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tableHead: { flexDirection: 'row', paddingBottom: 7, borderBottomWidth: 1, marginBottom: 2 },
  tableHeadCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: Colors.light.muted },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  tableCell: { fontSize: 12, color: Colors.light.text },
  jobRow: { paddingVertical: 10 },
  jobNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  jobName: { fontSize: 13, fontWeight: '700', color: Colors.light.text, flex: 1, marginRight: 8 },
  jobDesc: { fontSize: 11, color: Colors.light.muted, marginBottom: 4 },
  jobMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  jobMetaItem: { fontSize: 11, color: Colors.light.muted },
  errorRateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  connGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
