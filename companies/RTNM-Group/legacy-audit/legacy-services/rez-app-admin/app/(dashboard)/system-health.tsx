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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import {
  systemService,
  SystemHealthData,
  ReconciliationResult,
  QueueInfo,
  ScheduledJob,
} from '../../services/api/system';

// ---- Types for new features ----

interface ServiceUptimeHistory {
  service: string;
  uptimePercent: number;
}

interface Incident {
  service: string;
  downAt: string;
  restoredAt: string | null;
  duration: number | null; // minutes
}

// ---- Microservice Definitions ----

interface ServiceDef {
  name: string;
  url: string;
  path: string;
}

interface ServiceStatus {
  def: ServiceDef;
  status: 'loading' | 'healthy' | 'slow' | 'error' | 'unconfigured';
  responseMs: number | null;
  httpStatus: number | null;
  checkedAt: Date | null;
}

// Service URLs: read from env vars; fall back to localhost in __DEV__ only.
// If a URL is empty in production (env var not set), the service will be
// skipped during health checks and shown as "Not configured".
const SERVICE_URLS = {
  gateway: process.env.EXPO_PUBLIC_GATEWAY_URL || (__DEV__ ? 'http://localhost:5002' : ''),
  backend: process.env.EXPO_PUBLIC_BACKEND_URL || (__DEV__ ? 'http://localhost:5001' : ''),
  merchant:
    process.env.EXPO_PUBLIC_MERCHANT_SERVICE_URL || (__DEV__ ? 'http://localhost:5010' : ''),
  wallet: process.env.EXPO_PUBLIC_WALLET_SERVICE_URL || (__DEV__ ? 'http://localhost:5006' : ''),
  payment: process.env.EXPO_PUBLIC_PAYMENT_SERVICE_URL || (__DEV__ ? 'http://localhost:5005' : ''),
  auth: process.env.EXPO_PUBLIC_AUTH_SERVICE_URL || (__DEV__ ? 'http://localhost:5003' : ''),
  search: process.env.EXPO_PUBLIC_SEARCH_SERVICE_URL || (__DEV__ ? 'http://localhost:5008' : ''),
  catalog: process.env.EXPO_PUBLIC_CATALOG_SERVICE_URL || (__DEV__ ? 'http://localhost:5007' : ''),
  analytics:
    process.env.EXPO_PUBLIC_ANALYTICS_SERVICE_URL || (__DEV__ ? 'http://localhost:5011' : ''),
  gamification:
    process.env.EXPO_PUBLIC_GAMIFICATION_SERVICE_URL || (__DEV__ ? 'http://localhost:5009' : ''),
  marketing:
    process.env.EXPO_PUBLIC_MARKETING_SERVICE_URL || (__DEV__ ? 'http://localhost:5012' : ''),
};

const ALL_SERVICES: ServiceDef[] = [
  { name: 'API Gateway', url: SERVICE_URLS.gateway, path: '/health' },
  { name: 'Monolith API', url: SERVICE_URLS.backend, path: '/health' },
  { name: 'Merchant Service', url: SERVICE_URLS.merchant, path: '/health' },
  { name: 'Wallet Service', url: SERVICE_URLS.wallet, path: '/health' },
  { name: 'Payment Service', url: SERVICE_URLS.payment, path: '/health' },
  { name: 'Auth Service', url: SERVICE_URLS.auth, path: '/health' },
  { name: 'Search Service', url: SERVICE_URLS.search, path: '/health' },
  { name: 'Catalog Service', url: SERVICE_URLS.catalog, path: '/health' },
  { name: 'Analytics Service', url: SERVICE_URLS.analytics, path: '/health' },
  { name: 'Gamification Service', url: SERVICE_URLS.gamification, path: '/health' },
  { name: 'Marketing Service', url: SERVICE_URLS.marketing, path: '/health' },
];

// Only include services that have a configured URL
const SERVICES: ServiceDef[] = ALL_SERVICES.filter((s) => s.url !== '');

const PING_TIMEOUT_MS = 5000;
const SLOW_THRESHOLD_MS = 2000;

async function pingService(def: ServiceDef): Promise<{ responseMs: number; httpStatus: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const resp = await fetch(`${def.url}${def.path}`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { responseMs: Date.now() - start, httpStatus: resp.status };
  } catch {
    clearTimeout(timer);
    return { responseMs: Date.now() - start, httpStatus: 0 };
  }
}

// ---- Microservices Panel Component ----

function uptimeColor(pct: number): string {
  if (pct >= 99) return Colors.light.greenDark;
  if (pct >= 95) return Colors.light.warningDark;
  return Colors.light.errorDark;
}

function uptimeBg(pct: number): string {
  if (pct >= 99) return Colors.light.successLight2;
  if (pct >= 95) return Colors.light.warningLight;
  return Colors.light.errorLight;
}

function MicroservicesPanel({
  onHealthUpdate,
}: {
  onHealthUpdate?: (counts: {
    healthy: number;
    slow: number;
    error: number;
    total: number;
  }) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [services, setServices] = useState<ServiceStatus[]>(
    SERVICES.map((def) => ({
      def,
      status: 'loading',
      responseMs: null,
      httpStatus: null,
      checkedAt: null,
    }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [pinging, setPinging] = useState(false);
  const [uptimeHistory, setUptimeHistory] = useState<Record<string, number>>({});

  const fetchUptimeHistory = useCallback(async () => {
    const results = await Promise.allSettled(
      SERVICES.map(async (def) => {
        try {
          const resp = await fetch(
            `${def.url}/api/admin/health-history/${encodeURIComponent(def.name)}`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (resp.ok) {
            const json: { uptimePercent?: number } = await resp.json();
            return { name: def.name, pct: json.uptimePercent ?? 100 };
          }
        } catch {
          // non-critical
        }
        return { name: def.name, pct: 100 };
      })
    );
    const map: Record<string, number> = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') map[r.value.name] = r.value.pct;
    });
    setUptimeHistory(map);
  }, []);

  const pingAll = useCallback(async () => {
    setPinging(true);
    // Reset to loading state
    setServices(
      SERVICES.map((def) => ({
        def,
        status: 'loading',
        responseMs: null,
        httpStatus: null,
        checkedAt: null,
      }))
    );
    // Fetch uptime history in parallel
    fetchUptimeHistory();

    const results = await Promise.all(
      SERVICES.map(async (def) => {
        const { responseMs, httpStatus } = await pingService(def);
        let status: ServiceStatus['status'];
        if (httpStatus === 0) {
          status = 'error';
        } else if (httpStatus >= 200 && httpStatus < 300 && responseMs <= SLOW_THRESHOLD_MS) {
          status = 'healthy';
        } else if (httpStatus >= 200 && httpStatus < 300) {
          status = 'slow';
        } else {
          status = 'error';
        }
        const entry: ServiceStatus = { def, status, responseMs, httpStatus, checkedAt: new Date() };
        // Update individual service in state as each resolves
        setServices((prev) => prev.map((s) => (s.def.name === def.name ? entry : s)));
        return entry;
      })
    );

    setLastChecked(new Date());
    setPinging(false);
    return results;
  }, []);

  useEffect(() => {
    pingAll();
  }, [pingAll]);

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const slowCount = services.filter((s) => s.status === 'slow').length;
  const errorCount = services.filter((s) => s.status === 'error').length;
  const totalCount = SERVICES.length;

  useEffect(() => {
    onHealthUpdate?.({
      healthy: healthyCount,
      slow: slowCount,
      error: errorCount,
      total: totalCount,
    });
  }, [healthyCount, slowCount, errorCount, totalCount, onHealthUpdate]);

  const summaryColor =
    errorCount > 0
      ? Colors.light.errorDark
      : slowCount > 0
        ? Colors.light.warningDark
        : Colors.light.greenDark;

  const dotColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return Colors.light.greenDark;
      case 'slow':
        return Colors.light.warningDark;
      case 'error':
        return Colors.light.errorDark;
      case 'unconfigured':
        return Colors.light.icon;
      default:
        return Colors.light.icon;
    }
  };

  const dotBg = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return Colors.light.successLight2;
      case 'slow':
        return Colors.light.warningLight;
      case 'error':
        return Colors.light.errorLight;
      case 'unconfigured':
        return Colors.light.slate;
      default:
        return Colors.light.slate;
    }
  };

  // Services without a URL (env var not set in production)
  const unconfiguredServices: ServiceStatus[] = ALL_SERVICES.filter((s) => s.url === '').map(
    (def) => ({
      def,
      status: 'unconfigured' as const,
      responseMs: null,
      httpStatus: null,
      checkedAt: null,
    })
  );

  // Combine configured (pinged) + unconfigured for display
  const allDisplayServices = [...services, ...unconfiguredServices];

  return (
    <View style={[mspStyles.card, { backgroundColor: Colors.light.card }]}>
      {/* Card Header */}
      <View style={mspStyles.header}>
        <View style={mspStyles.headerLeft}>
          <View style={[mspStyles.icon, { backgroundColor: '#6366F120' }]}>
            <Ionicons name="globe-outline" size={18} color="#6366F1" />
          </View>
          <Text style={[mspStyles.title, { color: Colors.light.text }]}>Microservices</Text>
        </View>
        <TouchableOpacity
          style={[mspStyles.refreshBtn, pinging && mspStyles.refreshBtnDisabled]}
          onPress={pingAll}
          disabled={pinging}
        >
          {pinging ? (
            <ActivityIndicator size="small" color={Colors.light.card} />
          ) : (
            <>
              <Ionicons name="refresh" size={14} color={Colors.light.card} />
              <Text style={mspStyles.refreshBtnText}>Refresh All</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Summary Bar */}
      <View style={[mspStyles.summaryBar, { backgroundColor: `${summaryColor}12` }]}>
        <Text style={[mspStyles.summaryText, { color: summaryColor }]}>
          {healthyCount}/{totalCount} services healthy
        </Text>
        {slowCount > 0 && (
          <Text
            style={[
              mspStyles.summaryChip,
              { color: Colors.light.warningDark, backgroundColor: Colors.light.warningLight },
            ]}
          >
            {slowCount} slow
          </Text>
        )}
        {errorCount > 0 && (
          <Text
            style={[
              mspStyles.summaryChip,
              { color: Colors.light.errorDark, backgroundColor: Colors.light.errorLight },
            ]}
          >
            {errorCount} down
          </Text>
        )}
      </View>

      {/* Service Rows */}
      {allDisplayServices.map((svc, idx) => (
        <View
          key={svc.def.name}
          style={[
            mspStyles.row,
            idx < allDisplayServices.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: Colors.light.border,
            },
          ]}
        >
          {/* Status dot */}
          <View style={[mspStyles.statusDot, { backgroundColor: dotBg(svc.status) }]}>
            {svc.status === 'loading' ? (
              <ActivityIndicator
                size="small"
                color={Colors.light.icon}
                style={{ transform: [{ scale: 0.6 }] }}
              />
            ) : (
              <View style={[mspStyles.innerDot, { backgroundColor: dotColor(svc.status) }]} />
            )}
          </View>

          {/* Name */}
          <Text style={[mspStyles.serviceName, { color: Colors.light.text }]} numberOfLines={1}>
            {svc.def.name}
          </Text>

          {/* Response time */}
          <Text
            style={[
              mspStyles.responseTime,
              {
                color:
                  svc.status === 'loading'
                    ? Colors.light.icon
                    : svc.status === 'unconfigured'
                      ? Colors.light.icon
                      : svc.status === 'error'
                        ? Colors.light.errorDark
                        : svc.status === 'slow'
                          ? Colors.light.warningDark
                          : Colors.light.greenDark,
              },
            ]}
          >
            {svc.status === 'loading'
              ? '...'
              : svc.status === 'unconfigured'
                ? 'Not configured'
                : svc.status === 'error'
                  ? 'timeout'
                  : svc.responseMs !== null
                    ? `${svc.responseMs}ms`
                    : '--'}
          </Text>
          {/* 24h uptime % */}
          {uptimeHistory[svc.def.name] !== undefined && (
            <View
              style={[
                mspStyles.uptimeBadge,
                { backgroundColor: uptimeBg(uptimeHistory[svc.def.name]) },
              ]}
            >
              <Text
                style={[mspStyles.uptimeText, { color: uptimeColor(uptimeHistory[svc.def.name]) }]}
              >
                {uptimeHistory[svc.def.name].toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Last checked */}
      {lastChecked && (
        <Text style={[mspStyles.lastChecked, { color: Colors.light.icon }]}>
          Last checked:{' '}
          {lastChecked.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </Text>
      )}
    </View>
  );
}

const mspStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  refreshBtnDisabled: {
    opacity: 0.6,
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  summaryChip: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  serviceName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  responseTime: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 60,
  },
  lastChecked: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
  uptimeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  uptimeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

// ---- Status Badge Component ----

function StatusBadge({
  status,
  label,
}: {
  status:
    | 'healthy'
    | 'degraded'
    | 'unhealthy'
    | 'connected'
    | 'disconnected'
    | 'active'
    | 'unknown'
    | 'disabled';
  label?: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const statusColors: Record<string, { bg: string; text: string }> = {
    healthy: { bg: colors.successLight2, text: colors.greenDark },
    connected: { bg: colors.successLight2, text: colors.greenDark },
    active: { bg: colors.successLight2, text: colors.greenDark },
    degraded: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
    unknown: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
    disabled: { bg: Colors.light.slate, text: '#64748B' },
    unhealthy: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
    disconnected: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
  };

  const colorSet = statusColors[status] || statusColors.unknown;
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.badge, { backgroundColor: colorSet.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: colorSet.text }]} />
      <Text style={[styles.badgeText, { color: colorSet.text }]}>{displayLabel}</Text>
    </View>
  );
}

// ---- Severity Badge ----

function SeverityBadge({ severity }: { severity: string }) {
  const severityColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
    high: { bg: '#FED7AA', text: '#EA580C' },
    medium: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
    low: { bg: Colors.light.slate, text: '#64748B' },
  };

  const colorSet = severityColors[severity] || severityColors.low;

  return (
    <View style={[styles.badge, { backgroundColor: colorSet.bg }]}>
      <Text style={[styles.badgeText, { color: colorSet.text }]}>{severity.toUpperCase()}</Text>
    </View>
  );
}

// ---- Info Row ----

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: Colors.light.icon }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor || Colors.light.text }]}>{value}</Text>
    </View>
  );
}

// ---- Section Card ----

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
    <View style={[styles.card, { backgroundColor: Colors.light.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.cardIcon, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={[styles.cardTitle, { color: Colors.light.text }]}>{title}</Text>
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

// ---- Main Component ----

export default function SystemHealthScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringRecon, setTriggeringRecon] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [microHealth, setMicroHealth] = useState({ healthy: 0, slow: 0, error: 0, total: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      loadAllData(true);
    }, 30000);
  }, []);

  useEffect(() => {
    loadAllData();
    if (autoRefresh) startAutoRefresh();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) startAutoRefresh();
  }, [autoRefresh, startAutoRefresh]);

  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [health, recon, incidentsRes] = await Promise.allSettled([
        systemService.getHealth(),
        systemService.getReconciliation(),
        apiClient.get<Incident[]>('admin/incidents'),
      ]);

      if (health.status === 'fulfilled') setHealthData(health.value);
      if (recon.status === 'fulfilled') setReconciliation(recon.value);
      if (
        incidentsRes.status === 'fulfilled' &&
        incidentsRes.value.success &&
        incidentsRes.value.data
      ) {
        setIncidents(incidentsRes.value.data);
      }
    } catch (error: any) {
      logger.error('Failed to load system health:', error.message);
      if (!silent) {
        showAlert('Error', 'Failed to load system health data.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData(true);
    setRefreshing(false);
  }, []);

  const handleTriggerReconciliation = async () => {
    setTriggeringRecon(true);
    try {
      const result = await systemService.triggerReconciliation();
      setReconciliation(result);
      showAlert('Success', 'Reconciliation completed successfully.');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to trigger reconciliation.');
    } finally {
      setTriggeringRecon(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.icon }]}>Loading system health...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>System Health</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            {autoRefresh ? 'Auto-refreshing every 30s' : 'Auto-refresh paused'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Switch
            value={autoRefresh}
            onValueChange={setAutoRefresh}
            trackColor={{ true: colors.tint, false: colors.border }}
            thumbColor={colors.card}
            style={{ transform: [{ scale: 0.8 }] }}
          />
          {healthData && (
            <StatusBadge
              status={
                microHealth.error > 0
                  ? 'degraded'
                  : microHealth.slow > 0 && healthData.overallStatus === 'healthy'
                    ? 'degraded'
                    : healthData.overallStatus
              }
            />
          )}
        </View>
      </View>

      {/* Platform Uptime Summary */}
      {healthData && (
        <View style={[styles.uptimeSummaryBar, { backgroundColor: colors.card }]}>
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={microHealth.error > 0 ? colors.warning : colors.success}
          />
          <Text style={[styles.uptimeSummaryText, { color: colors.text }]}>
            Platform uptime:{' '}
            <Text
              style={{
                fontWeight: '700',
                color: microHealth.error > 0 ? colors.warning : colors.success,
              }}
            >
              {microHealth.total > 0
                ? `${((microHealth.healthy / microHealth.total) * 100).toFixed(1)}%`
                : '—'}
            </Text>
            {'  '}
            <Text style={[styles.uptimeSummaryMeta, { color: colors.icon }]}>
              (calculated from all services)
            </Text>
          </Text>
        </View>
      )}

      {/* Microservices Health Panel */}
      <MicroservicesPanel onHealthUpdate={setMicroHealth} />

      {/* Server Status */}
      {healthData && (
        <SectionCard title="Server Status" icon="server" iconColor={colors.info}>
          <InfoRow label="Uptime" value={healthData.server.uptimeFormatted} />
          <InfoRow
            label="Memory (Heap)"
            value={`${healthData.server.memory.heapUsedMB} MB / ${healthData.server.memory.heapTotalMB} MB`}
          />
          <InfoRow label="RSS Memory" value={`${healthData.server.memory.rssMB} MB`} />
          <InfoRow
            label="System Memory"
            value={`${healthData.server.freeMemoryGB} GB free / ${healthData.server.totalMemoryGB} GB`}
          />
          <InfoRow label="CPU Usage" value={`${healthData.server.cpuUsagePercent}%`} />
          <InfoRow label="CPU Cores" value={healthData.server.cpuCores} />
          <InfoRow label="Node.js" value={healthData.server.nodeVersion} />
          <InfoRow label="Platform" value={healthData.server.platform} />
          <InfoRow label="PID" value={healthData.server.pid} />
        </SectionCard>
      )}

      {/* Database Status */}
      {healthData && (
        <SectionCard
          title="Database (MongoDB)"
          icon="layers"
          iconColor={colors.success}
          headerRight={<StatusBadge status={healthData.database.status as 'active' | 'unknown' | 'disabled' | 'connected' | 'disconnected' | 'healthy' | 'unhealthy' | 'degraded'} />}
        >
          <InfoRow label="Status" value={healthData.database.status} />
          <InfoRow label="Connections" value={healthData.database.connectionCount} />
          <InfoRow label="Host" value={healthData.database.host} />
          <InfoRow label="Database" value={healthData.database.name} />
        </SectionCard>
      )}

      {/* Redis Status */}
      {healthData && (
        <SectionCard
          title="Redis"
          icon="flash"
          iconColor={colors.error}
          headerRight={
            <StatusBadge
              status={!healthData.redis.enabled ? 'disabled' : (healthData.redis.status as 'active' | 'unknown' | 'disabled' | 'connected' | 'disconnected' | 'healthy' | 'unhealthy' | 'degraded')}
              label={!healthData.redis.enabled ? 'Disabled' : undefined}
            />
          }
        >
          <InfoRow
            label="Status"
            value={healthData.redis.enabled ? healthData.redis.status : 'Disabled'}
          />
          {healthData.redis.memory && (
            <InfoRow label="Memory Used" value={healthData.redis.memory} />
          )}
          <InfoRow label="Keys (DB Size)" value={healthData.redis.dbSize} />
        </SectionCard>
      )}

      {/* Queue Health */}
      {healthData?.queues && (
        <SectionCard
          title="Queue Health"
          icon="list"
          iconColor={colors.purple}
          headerRight={<StatusBadge status={healthData.queues.overall as 'active' | 'unknown' | 'disabled' | 'connected' | 'disconnected' | 'healthy' | 'unhealthy' | 'degraded'} />}
        >
          {/* Table header */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderCell, styles.tableNameCol, { color: colors.icon }]}>
              Queue
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableNumCol, { color: colors.icon }]}>
              Wait
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableNumCol, { color: colors.icon }]}>
              Active
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableNumCol, { color: colors.icon }]}>
              Done
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableNumCol, { color: colors.icon }]}>
              Fail
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableStatusCol, { color: colors.icon }]}>
              Status
            </Text>
          </View>
          {healthData.queues.queues.map((queue: QueueInfo, index: number) => (
            <View
              key={queue.name}
              style={[
                styles.tableRow,
                index < healthData.queues.queues.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.tableCell, styles.tableNameCol, { color: colors.text }]}
                numberOfLines={1}
              >
                {queue.name}
              </Text>
              <Text style={[styles.tableCell, styles.tableNumCol, { color: colors.text }]}>
                {queue.status === 'disabled' ? '-' : (queue.waiting ?? 0)}
              </Text>
              <Text style={[styles.tableCell, styles.tableNumCol, { color: colors.text }]}>
                {queue.status === 'disabled' ? '-' : (queue.active ?? 0)}
              </Text>
              <Text style={[styles.tableCell, styles.tableNumCol, { color: colors.text }]}>
                {queue.status === 'disabled' ? '-' : (queue.completed ?? 0)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableNumCol,
                  { color: (queue.failed ?? 0) > 0 ? colors.errorDark : colors.text },
                ]}
              >
                {queue.status === 'disabled' ? '-' : (queue.failed ?? 0)}
              </Text>
              <View style={[styles.tableStatusCol, { justifyContent: 'center' }]}>
                <StatusBadge status={queue.status as 'active' | 'unknown' | 'disabled' | 'connected' | 'disconnected' | 'healthy' | 'unhealthy' | 'degraded'} />
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Scheduled Jobs */}
      {healthData?.jobs && (
        <SectionCard title="Scheduled Jobs" icon="time" iconColor={colors.warning}>
          {healthData.jobs.map((job: ScheduledJob, index: number) => (
            <View
              key={job.name}
              style={[
                styles.jobRow,
                index < healthData.jobs.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.jobMain}>
                <View style={styles.jobNameRow}>
                  <Text style={[styles.jobName, { color: colors.text }]}>{job.name}</Text>
                  <StatusBadge status={job.status as 'active' | 'unknown' | 'disabled' | 'connected' | 'disconnected' | 'healthy' | 'unhealthy' | 'degraded'} />
                </View>
                <Text style={[styles.jobDesc, { color: colors.icon }]}>{job.description}</Text>
              </View>
              <View style={styles.jobMeta}>
                <View style={styles.jobMetaRow}>
                  <Ionicons name="repeat" size={12} color={colors.icon} />
                  <Text style={[styles.jobMetaText, { color: colors.icon }]}>
                    {job.scheduleHuman}
                  </Text>
                </View>
                {job.lastRun && (
                  <View style={styles.jobMetaRow}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                    <Text style={[styles.jobMetaText, { color: colors.icon }]}>
                      Last: {formatTimestamp(job.lastRun)}
                    </Text>
                  </View>
                )}
                {!job.lastRun && (
                  <View style={styles.jobMetaRow}>
                    <Ionicons name="help-circle" size={12} color={colors.icon} />
                    <Text style={[styles.jobMetaText, { color: colors.icon }]}>
                      No run recorded
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Reconciliation */}
      <SectionCard
        title="Reconciliation"
        icon="shield-checkmark"
        iconColor="#06B6D4"
        headerRight={
          <TouchableOpacity
            style={[styles.runButton, triggeringRecon && styles.runButtonDisabled]}
            onPress={handleTriggerReconciliation}
            disabled={triggeringRecon}
          >
            {triggeringRecon ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="play" size={14} color={colors.card} />
                <Text style={styles.runButtonText}>Run Now</Text>
              </>
            )}
          </TouchableOpacity>
        }
      >
        {reconciliation && reconciliation.hasResults ? (
          <>
            <View style={styles.reconSummaryGrid}>
              <View style={[styles.reconStat, { backgroundColor: `${colors.info}10` }]}>
                <Text style={[styles.reconStatValue, { color: colors.info }]}>
                  {reconciliation.summary?.totalDiscrepancies ?? 0}
                </Text>
                <Text style={[styles.reconStatLabel, { color: colors.icon }]}>Discrepancies</Text>
              </View>
              <View style={[styles.reconStat, { backgroundColor: `${colors.errorLight}10` }]}>
                <Text style={[styles.reconStatValue, { color: colors.errorDark }]}>
                  {reconciliation.summary?.criticalCount ?? 0}
                </Text>
                <Text style={[styles.reconStatLabel, { color: colors.icon }]}>Critical</Text>
              </View>
              <View style={[styles.reconStat, { backgroundColor: `${colors.warningLight}10` }]}>
                <Text style={[styles.reconStatValue, { color: '#EA580C' }]}>
                  {reconciliation.summary?.highCount ?? 0}
                </Text>
                <Text style={[styles.reconStatLabel, { color: colors.icon }]}>High</Text>
              </View>
              <View style={[styles.reconStat, { backgroundColor: `${colors.warning}10` }]}>
                <Text style={[styles.reconStatValue, { color: colors.warning }]}>
                  {formatCurrency(reconciliation.summary?.totalDifferenceAmount ?? 0)}
                </Text>
                <Text style={[styles.reconStatLabel, { color: colors.icon }]}>Total Diff</Text>
              </View>
            </View>

            <InfoRow label="Users Checked" value={reconciliation.usersChecked ?? 0} />
            <InfoRow
              label="Duration"
              value={reconciliation.duration ? `${reconciliation.duration}ms` : 'N/A'}
            />
            <InfoRow
              label="Last Run"
              value={reconciliation.timestamp ? formatTimestamp(reconciliation.timestamp) : 'N/A'}
            />

            {/* Show discrepancy breakdown if any */}
            {reconciliation.discrepancies && reconciliation.discrepancies.length > 0 && (
              <View style={styles.discrepancySection}>
                <Text style={[styles.discrepancyTitle, { color: colors.text }]}>
                  Discrepancy Breakdown
                </Text>
                {/* Table header */}
                <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.tableHeaderCell, { flex: 2, color: colors.icon }]}>
                    Type
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.icon }]}>
                    Diff
                  </Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.icon }]}>
                    Severity
                  </Text>
                </View>
                {reconciliation.discrepancies.slice(0, 20).map((disc, idx) => (
                  <View
                    key={`${disc.userId}-${disc.type}-${idx}`}
                    style={[
                      styles.tableRow,
                      idx < Math.min(reconciliation.discrepancies!.length, 20) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.tableCell, { flex: 2, color: colors.text }]}
                      numberOfLines={1}
                    >
                      {formatDiscrepancyType(disc.type)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, color: colors.text }]}>
                      {formatCurrency(disc.difference)}
                    </Text>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <SeverityBadge severity={disc.severity} />
                    </View>
                  </View>
                ))}
                {reconciliation.discrepancies.length > 20 && (
                  <Text style={[styles.moreText, { color: colors.icon }]}>
                    ...and {reconciliation.discrepancies.length - 20} more
                  </Text>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={40} color={colors.icon} />
            <Text style={[styles.emptyStateText, { color: colors.icon }]}>
              {reconciliation?.message ||
                'No reconciliation results available. Click "Run Now" to trigger.'}
            </Text>
          </View>
        )}
      </SectionCard>

      {/* Incident Log */}
      <SectionCard title="Incident Log" icon="warning" iconColor={colors.error}>
        {incidents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            <Text style={[styles.emptyStateText, { color: colors.icon }]}>
              No incidents in the last 30 days
            </Text>
          </View>
        ) : (
          incidents.map((inc, idx) => (
            <View
              key={`${inc.service}-${inc.downAt}-${idx}`}
              style={[
                styles.incidentRow,
                idx < incidents.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.incidentDot,
                  { backgroundColor: inc.restoredAt ? colors.successLight : colors.errorLight },
                ]}
              >
                <View
                  style={[
                    styles.incidentDotInner,
                    { backgroundColor: inc.restoredAt ? colors.success : colors.errorDark },
                  ]}
                />
              </View>
              <View style={styles.incidentInfo}>
                <Text style={[styles.incidentService, { color: colors.text }]}>{inc.service}</Text>
                <Text style={[styles.incidentMeta, { color: colors.icon }]}>
                  Down: {formatTimestamp(inc.downAt)}
                  {inc.restoredAt
                    ? `  \u2022  Restored: ${formatTimestamp(inc.restoredAt)}`
                    : '  \u2022  Ongoing'}
                </Text>
              </View>
              {inc.duration !== null && (
                <View style={[styles.incidentDuration, { backgroundColor: `${colors.warning}18` }]}>
                  <Text style={[styles.incidentDurationText, { color: colors.warningDark }]}>
                    {inc.duration < 60
                      ? `${inc.duration}m`
                      : `${Math.floor(inc.duration / 60)}h ${inc.duration % 60}m`}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </SectionCard>

      {/* Last updated timestamp */}
      {healthData && (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            Last updated: {formatTimestamp(healthData.timestamp)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ---- Helpers ----

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `Rs ${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `Rs ${(amount / 1000).toFixed(1)}K`;
  }
  return `Rs ${amount.toFixed(2)}`;
}

function formatDiscrepancyType(type: string): string {
  const typeMap: Record<string, string> = {
    purchase_vs_cashback: 'Purchase vs Cashback',
    wallet_vs_transactions: 'Wallet vs Transactions',
    order_vs_wallet_deduction: 'Order vs Wallet',
    order_vs_merchant_settlement: 'Order vs Settlement',
  };
  return typeMap[type] || type;
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Platform uptime summary bar
  uptimeSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  uptimeSummaryText: {
    fontSize: 13,
    flex: 1,
  },
  uptimeSummaryMeta: {
    fontSize: 11,
  },

  // Incident rows
  incidentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  incidentDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  incidentInfo: { flex: 1 },
  incidentService: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  incidentMeta: { fontSize: 11 },
  incidentDuration: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  incidentDurationText: { fontSize: 11, fontWeight: '700' },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Card
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 13,
  },
  tableNameCol: {
    flex: 2,
  },
  tableNumCol: {
    flex: 1,
    textAlign: 'center',
  },
  tableStatusCol: {
    flex: 1.2,
    alignItems: 'flex-end',
  },

  // Job rows
  jobRow: {
    paddingVertical: 12,
  },
  jobMain: {
    marginBottom: 6,
  },
  jobNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  jobName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  jobDesc: {
    fontSize: 12,
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobMetaText: {
    fontSize: 11,
  },

  // Run button
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    color: Colors.light.card,
    fontSize: 12,
    fontWeight: '600',
  },

  // Reconciliation
  reconSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reconStat: {
    flex: 1,
    minWidth: '40%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reconStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  reconStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Discrepancy section
  discrepancySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  discrepancyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  moreText: {
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 11,
  },
});
