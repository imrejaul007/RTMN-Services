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
import { s } from './styles/bbps-health.styles';

const STATUS_CONFIG = {
  healthy: { color: '#22C55E', icon: 'checkmark-circle' as const, label: 'Healthy' },
  degraded: { color: '#F59E0B', icon: 'warning' as const, label: 'Degraded' },
  down: { color: '#EF4444', icon: 'close-circle' as const, label: 'Down' },
};

export default function BBPSHealthScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/admin/bbps/health');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setData(null);
      }
    } catch (err: any) {
      logger.error('Failed to load BBPS health data:', err);
      setData(null);
      setError(err.message || 'Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Show loading or empty state
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1a3a52" />
      </View>
    );
  }

  if (!data?.billers || data.billers.length === 0) {
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
        <View style={s.emptyContainer}>
          {error ? (
            <>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={[s.emptyTitle, { color: '#EF4444' }]}>
                Failed to load health data
              </Text>
              <Text style={s.emptyMessage}>{error}</Text>
              <Text style={[s.emptyMessage, { marginTop: 8 }]}>Pull down to retry</Text>
            </>
          ) : (
            <>
              <Text style={s.emptyTitle}>No BBPS health data available</Text>
              <Text style={s.emptyMessage}>
                Health status will appear once billers are configured and monitored.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  const billers = data.billers;

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
      {/* Summary */}
      <View style={s.summaryRow}>
        {[
          {
            label: 'Healthy',
            count: billers.filter((b: any) => b.status === 'healthy').length,
            color: '#22C55E',
          },
          {
            label: 'Degraded',
            count: billers.filter((b: any) => b.status === 'degraded').length,
            color: '#F59E0B',
          },
          {
            label: 'Down',
            count: billers.filter((b: any) => b.status === 'down').length,
            color: '#EF4444',
          },
        ].map((stat) => (
          <View key={stat.label} style={[s.summaryCard, { borderTopColor: stat.color }]}>
            <Text style={[s.summaryNum, { color: stat.color }]}>{stat.count}</Text>
            <Text style={s.summaryLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Biller list */}
      <View style={s.section}>
        {billers.map((b: any) => {
          const sc =
            STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.degraded;
          return (
            <View key={b.billerId || b.name} style={s.billerCard}>
              <View style={s.billerHeader}>
                <Ionicons name={sc.icon} size={18} color={sc.color} />
                <Text style={s.billerName}>{b.name}</Text>
                <View style={[s.statusBadge, { backgroundColor: sc.color + '20' }]}>
                  <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>
              <View style={s.billerMeta}>
                <View style={s.metaItem}>
                  <Text style={s.metaValue}>{b.successRate ?? 0}%</Text>
                  <Text style={s.metaLabel}>Success Rate</Text>
                </View>
                <View style={s.metaItem}>
                  <Text
                    style={[
                      s.metaValue,
                      (b.avgLatencyMs ?? b.avgLatency ?? 0) > 500 && { color: '#F59E0B' },
                    ]}
                  >
                    {b.avgLatencyMs ?? b.avgLatency ?? 0}ms
                  </Text>
                  <Text style={s.metaLabel}>Avg Latency</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={[s.metaValue, (b.pendingTx ?? 0) > 5 && { color: '#EF4444' }]}>
                    {b.pendingTx ?? 0}
                  </Text>
                  <Text style={s.metaLabel}>Pending Tx</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

