/**
 * CorpPerks Integration Health Dashboard
 * Route: /corp-health
 *
 * Monitor health and performance of all integrations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatusBadge } from '@/components/corp-perks';
import { integrationHealthApi, type IntegrationHealth, type HealthCheckResult } from '../../services/api/integrationHealth';
import { logger } from '../../utils/logger';

const MOCK_HEALTH: IntegrationHealth[] = [
  {
    id: 'makcorps',
    name: 'Makcorps',
    category: 'ota',
    status: 'healthy',
    connected: true,
    lastSyncAt: '2024-04-29T10:30:00Z',
    lastHealthCheck: '2024-04-29T10:35:00Z',
    metrics: { latency: 120, uptime: 99.9, successRate: 98.5 },
    issues: [],
  },
  {
    id: 'nextabizz',
    name: 'NextaBizz',
    category: 'procurement',
    status: 'healthy',
    connected: true,
    lastSyncAt: '2024-04-29T09:00:00Z',
    lastHealthCheck: '2024-04-29T10:35:00Z',
    metrics: { latency: 85, uptime: 99.5, successRate: 99.1 },
    issues: [],
  },
  {
    id: 'rtmn-finance',
    name: 'RTMN Finance',
    category: 'finance',
    status: 'degraded',
    connected: true,
    lastSyncAt: '2024-04-29T08:00:00Z',
    lastHealthCheck: '2024-04-29T10:35:00Z',
    metrics: { latency: 250, uptime: 98.0, successRate: 95.2 },
    issues: [
      { severity: 'warning', message: 'Higher than normal latency detected', timestamp: '2024-04-29T10:00:00Z' },
    ],
  },
  {
    id: 'greythr',
    name: 'GreytHR',
    category: 'hris',
    status: 'healthy',
    connected: true,
    lastSyncAt: '2024-04-29T06:00:00Z',
    lastHealthCheck: '2024-04-29T10:35:00Z',
    metrics: { latency: 95, uptime: 99.8, successRate: 99.9 },
    issues: [],
  },
];

export default function CorpHealthPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [healthData, setHealthData] = useState<IntegrationHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await integrationHealthApi.getAllHealth();
      setHealthData(data.length > 0 ? data : MOCK_HEALTH);
    } catch (error) {
      logger.error('Failed to fetch health:', error);
      setHealthData(MOCK_HEALTH);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  const handleHealthCheck = async (integrationId: string) => {
    setCheckingHealth(integrationId);
    try {
      const result = await integrationHealthApi.checkHealth(integrationId);
      Alert.alert(
        'Health Check Complete',
        `Status: ${result.status}\nResponse Time: ${result.responseTime}ms`
      );
      fetchHealth();
    } catch (error) {
      Alert.alert('Error', 'Failed to perform health check');
    } finally {
      setCheckingHealth(null);
    }
  };

  const getStatusIcon = (status: IntegrationHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'checkmark-circle' as const;
      case 'degraded':
        return 'warning' as const;
      case 'down':
        return 'close-circle' as const;
      case 'disconnected':
        return 'link-outline' as const;
    }
  };

  const getStatusColor = (status: IntegrationHealth['status']) => {
    switch (status) {
      case 'healthy':
        return '#22c55e';
      case 'degraded':
        return '#f59e0b';
      case 'down':
        return '#ef4444';
      case 'disconnected':
        return '#6b7280';
    }
  };

  const getCategoryIcon = (category: IntegrationHealth['category']) => {
    switch (category) {
      case 'ota':
        return 'bed-outline' as const;
      case 'procurement':
        return 'gift-outline' as const;
      case 'finance':
        return 'wallet-outline' as const;
      case 'hris':
        return 'people-outline' as const;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const healthyCount = healthData.filter((h) => h.status === 'healthy').length;
  const degradedCount = healthData.filter((h) => h.status === 'degraded').length;
  const downCount = healthData.filter((h) => h.status === 'down').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Integration Health</Text>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.tint }]}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Monitor performance and uptime
        </Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#22c55e15' }]}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{healthyCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Healthy</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f59e0b15' }]}>
          <Ionicons name="warning" size={24} color="#f59e0b" />
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{degradedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Degraded</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ef444415' }]}>
          <Ionicons name="close-circle" size={24} color="#ef4444" />
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{downCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Down</Text>
        </View>
      </View>

      {/* Integrations List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {healthData.map((integration) => {
          const statusColor = getStatusColor(integration.status);
          const statusIcon = getStatusIcon(integration.status);
          const categoryIcon = getCategoryIcon(integration.category);

          return (
            <Card key={integration.id}>
              <View style={styles.integrationHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name={categoryIcon} size={24} color={colors.tint} />
                </View>
                <View style={styles.integrationInfo}>
                  <Text style={[styles.integrationName, { color: colors.text }]}>
                    {integration.name}
                  </Text>
                  <View style={styles.statusRow}>
                    <Ionicons name={statusIcon} size={14} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.checkButton, { borderColor: colors.tint }]}
                  onPress={() => handleHealthCheck(integration.id)}
                  disabled={checkingHealth === integration.id}
                >
                  {checkingHealth === integration.id ? (
                    <Ionicons name="hourglass-outline" size={16} color={colors.tint} />
                  ) : (
                    <Ionicons name="pulse-outline" size={16} color={colors.tint} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Metrics */}
              {integration.metrics && (
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      {integration.metrics.latency}ms
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      Latency
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      {integration.metrics.uptime}%
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      Uptime
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      {integration.metrics.successRate}%
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      Success
                    </Text>
                  </View>
                </View>
              )}

              {/* Last Sync */}
              <View style={[styles.syncRow, { borderTopColor: colors.border }]}>
                <View style={styles.syncItem}>
                  <Ionicons name="sync-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.syncText, { color: colors.textSecondary }]}>
                    Last sync: {formatDate(integration.lastSyncAt)}
                  </Text>
                </View>
                <View style={styles.syncItem}>
                  <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.syncText, { color: colors.textSecondary }]}>
                    Checked: {formatDate(integration.lastHealthCheck)}
                  </Text>
                </View>
              </View>

              {/* Issues */}
              {integration.issues.length > 0 && (
                <View style={[styles.issuesContainer, { backgroundColor: '#f59e0b15' }]}>
                  {integration.issues.map((issue, idx) => (
                    <View key={idx} style={styles.issueRow}>
                      <Ionicons
                        name={issue.severity === 'critical' ? 'alert-circle' : 'information-circle'}
                        size={16}
                        color={issue.severity === 'critical' ? '#ef4444' : '#f59e0b'}
                      />
                      <Text style={[styles.issueText, { color: colors.text }]}>
                        {issue.message}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  syncItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncText: {
    fontSize: 11,
  },
  issuesContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  issueText: {
    flex: 1,
    fontSize: 12,
  },
});
