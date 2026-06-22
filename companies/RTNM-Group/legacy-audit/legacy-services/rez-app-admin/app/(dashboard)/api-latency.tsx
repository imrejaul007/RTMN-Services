import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/api-latency.styles';

interface EndpointMetric {
  route: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  rps: number;
  errorPct: number;
  count: number;
}

interface LatencyData {
  overall: { p50: number; p95: number; p99: number; rps: number; errorRate: number };
  slowest: EndpointMetric[];
  updatedAt: string;
}

const getLatencyColor = (ms: number) => {
  if (ms < 200) return '#22C55E';
  if (ms < 500) return '#F59E0B';
  if (ms < 1000) return '#F97316';
  return '#EF4444';
};

const LatencyBar = ({ value, max }: { value: number; max: number }) => (
  <View style={s.barTrack}>
    <View
      style={[
        s.barFill,
        {
          width: `${Math.min((value / max) * 100, 100)}%`,
          backgroundColor: getLatencyColor(value),
        },
      ]}
    />
  </View>
);

export default function ApiLatencyScreen() {
  const [data, setData] = useState<LatencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get<LatencyData>('/admin/system/metrics');
      setData(res.data ?? (res as unknown as LatencyData));
    } catch (e) {
      logger.error('[ApiLatency] fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1a3a52" />
      </View>
    );
  if (!data)
    return (
      <View style={s.center}>
        <Ionicons name="analytics-outline" size={48} color="#9CA3AF" />
        <Text style={s.emptyText}>No Prometheus metrics available</Text>
        <Text style={s.emptySubText}>Ensure PROMETHEUS_ENABLED=true in backend .env</Text>
      </View>
    );

  const maxP95 = Math.max(...(data.slowest || []).map((e) => e.p95), 1000);

  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
        />
      }
    >
      {/* Overall metrics */}
      <View style={s.overallCard}>
        <Text style={s.cardTitle}>Overall Platform Performance</Text>
        <View style={s.metricsGrid}>
          {[
            {
              label: 'p50',
              value: `${data.overall.p50}ms`,
              color: getLatencyColor(data.overall.p50),
            },
            {
              label: 'p95',
              value: `${data.overall.p95}ms`,
              color: getLatencyColor(data.overall.p95),
            },
            {
              label: 'p99',
              value: `${data.overall.p99}ms`,
              color: getLatencyColor(data.overall.p99),
            },
            { label: 'Req/s', value: `${data.overall.rps}`, color: '#1a3a52' },
            {
              label: 'Error Rate',
              value: `${data.overall.errorRate}%`,
              color: data.overall.errorRate > 1 ? '#EF4444' : '#22C55E',
            },
          ].map((m) => (
            <View key={m.label} style={s.metricCell}>
              <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Slowest endpoints */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Slowest Endpoints (p95 &gt; 200ms)</Text>
        {(data.slowest || []).length === 0 && (
          <Text style={s.emptyText}>All endpoints performing well ✓</Text>
        )}
        {(data.slowest || []).map((ep, i) => (
          <View key={i} style={s.endpointCard}>
            <View style={s.endpointHeader}>
              <View
                style={[
                  s.methodBadge,
                  { backgroundColor: ep.method === 'GET' ? '#DBEAFE' : '#FCE7F3' },
                ]}
              >
                <Text
                  style={[
                    s.methodText,
                    { color: ep.method === 'GET' ? '#1D4ED8' : '#9D174D' },
                  ]}
                >
                  {ep.method}
                </Text>
              </View>
              <Text style={s.routeText} numberOfLines={1}>
                {ep.route}
              </Text>
              <Text style={[s.p95Badge, { color: getLatencyColor(ep.p95) }]}>{ep.p95}ms</Text>
            </View>
            <LatencyBar value={ep.p95} max={maxP95} />
            <View style={s.endpointMeta}>
              <Text style={s.metaText}>p50: {ep.p50}ms</Text>
              <Text style={s.metaText}>p99: {ep.p99}ms</Text>
              <Text style={s.metaText}>{ep.rps} req/s</Text>
              {ep.errorPct > 0 && (
                <Text style={[s.metaText, { color: '#EF4444' }]}>
                  {ep.errorPct.toFixed(1)}% errors
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

