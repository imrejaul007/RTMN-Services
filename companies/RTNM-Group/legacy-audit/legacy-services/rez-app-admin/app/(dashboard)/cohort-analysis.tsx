import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { styles as s } from './styles/cohort-analysis.styles';

export default function CohortAnalysisScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/analytics/cohorts?months=6');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setData(null);
      }
    } catch (err) {
      logger.error('Failed to load cohort data:', err);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Retention color scale
  const getRetentionColor = (pct: number) => {
    if (pct >= 70) return '#22C55E';
    if (pct >= 40) return '#F59E0B';
    if (pct >= 20) return '#F97316';
    return '#EF4444';
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );

  // Show empty state if no cohort data
  if (!data?.cohorts || data.cohorts.length === 0) {
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
          <Text style={s.emptyTitle}>No cohort data yet</Text>
          <Text style={s.emptyMessage}>
            Data will appear once users complete their first month of activity.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const cohorts = data.cohorts;
  const weeks = ['W0', 'W1', 'W2', 'W3', 'W4'];

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
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>User Retention Cohorts</Text>
        <Text style={s.infoSub}>
          % of users from each month still active in subsequent weeks
        </Text>
      </View>

      <ScrollView horizontal style={s.tableScroll}>
        <View style={s.table}>
          {/* Header */}
          <View style={s.tableRow}>
            <Text style={[s.cell, s.headerCell]}>Cohort</Text>
            <Text style={[s.cell, s.headerCell]}>Users</Text>
            {weeks.map((w) => (
              <Text key={w} style={[s.cell, s.headerCell]}>
                {w}
              </Text>
            ))}
          </View>
          {/* Rows */}
          {cohorts.map((cohort: any, i: number) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.cell, s.cohortCell]}>
                {cohort.cohort ?? cohort.month ?? '—'}
              </Text>
              <Text style={[s.cell, s.usersCell]}>
                {(cohort.size ?? cohort.users ?? 0).toLocaleString()}
              </Text>
              {(cohort.retention || []).map((pct: number, j: number) => (
                <View
                  key={j}
                  style={[s.retentionCell, { backgroundColor: getRetentionColor(pct) + '30' }]}
                >
                  <Text style={[s.retentionText, { color: getRetentionColor(pct) }]}>
                    {pct}%
                  </Text>
                </View>
              ))}
              {/* Fill empty weeks */}
              {Array(Math.max(0, weeks.length - (cohort.retention?.length || 0)))
                .fill(null)
                .map((_, j) => (
                  <View key={`empty-${j}`} style={s.retentionCell}>
                    <Text style={s.retentionEmpty}>-</Text>
                  </View>
                ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Key insight cards */}
      <View style={s.insightRow}>
        {[
          {
            label: 'Avg Week 1 Retention',
            value: `${Math.round(cohorts.reduce((s: number, c: any) => s + (c.retention?.[1] || 0), 0) / (cohorts.length || 1))}%`,
            color: '#22C55E',
          },
          {
            label: 'Avg Week 4 Retention',
            value: `${Math.round(cohorts.reduce((s: number, c: any) => s + (c.retention?.[4] || 0), 0) / (cohorts.filter((c: any) => c.retention?.length > 4).length || 1))}%`,
            color: '#F59E0B',
          },
        ].map((m) => (
          <View key={m.label} style={s.insightCard}>
            <Text style={[s.insightValue, { color: m.color }]}>{m.value}</Text>
            <Text style={s.insightLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const createStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.navy,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyMessage: { fontSize: 14, color: colors.mutedDark, textAlign: 'center', lineHeight: 20 },
    infoCard: { margin: 16, backgroundColor: colors.navy, borderRadius: 16, padding: 16 },
    infoTitle: { fontSize: 16, fontWeight: '800', color: '#ffcd57' },
    infoSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    tableScroll: { marginHorizontal: 16 },
    table: {
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.gray200,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.backgroundSecondary,
    },
    cell: { width: 80, padding: 10, justifyContent: 'center' },
    headerCell: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.mutedDark,
      backgroundColor: colors.backgroundTertiary,
    },
    cohortCell: { fontSize: 12, fontWeight: '600', color: colors.navy, width: 90 },
    usersCell: { fontSize: 12, color: colors.gray700 },
    retentionCell: { width: 60, alignItems: 'center', justifyContent: 'center', padding: 8 },
    retentionText: { fontSize: 12, fontWeight: '700' },
    retentionEmpty: { fontSize: 12, color: colors.gray300 },
    insightRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16 },
    insightCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      elevation: 1,
    },
    insightValue: { fontSize: 24, fontWeight: '800' },
    insightLabel: { fontSize: 12, color: colors.mutedDark, marginTop: 4, textAlign: 'center' },
  });
