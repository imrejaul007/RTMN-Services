import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/funnel-analytics.styles';

interface FunnelStep {
  label: string;
  count: number;
  pct: number;
  dropoff: number;
}

const FUNNELS = [
  { id: 'consumer_signup', label: 'Consumer Signup' },
  { id: 'merchant_onboard', label: 'Merchant Onboarding' },
  { id: 'trial_booking', label: 'Trial Booking' },
  { id: 'bbps_payment', label: 'BBPS Payment' },
];

export default function FunnelAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [funnel, setFunnel] = useState(FUNNELS[0].id);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get<any>(`admin/analytics/funnel?name=${funnel}`);
      if (res.success && res.data) {
        // Backend returns { name, steps: [{ name, count }] } — normalize to FunnelStep[]
        const payload = res.data;
        const rawSteps: Array<{ name: string; count: number }> =
          payload.steps ?? payload.data?.steps ?? (Array.isArray(payload) ? payload : []);
        if (rawSteps.length > 0) {
          const topCount = rawSteps[0].count || 1;
          const mapped: FunnelStep[] = rawSteps.map((s, i) => ({
            label: s.name,
            count: s.count,
            pct: Math.round((s.count / topCount) * 100),
            dropoff:
              i > 0
                ? Math.round(
                    ((rawSteps[i - 1].count - s.count) / (rawSteps[i - 1].count || 1)) * 100
                  )
                : 0,
          }));
          setSteps(mapped);
        } else {
          setSteps([]);
        }
      } else {
        setSteps([]);
      }
    } catch (err) {
      logger.error('Failed to load funnel data:', err);
      setSteps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [funnel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxCount = steps[0]?.count || 1;

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
      {/* Funnel selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.funnelSelector}>
        {FUNNELS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[s.funnelTab, funnel === f.id && s.funnelTabActive]}
            onPress={() => {
              setFunnel(f.id);
              setLoading(true);
            }}
          >
            <Text style={[s.funnelTabText, funnel === f.id && s.funnelTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.navy} style={{ marginTop: 40 }} />
      ) : steps.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyTitle}>No funnel data yet</Text>
          <Text style={s.emptyMessage}>
            Data will appear once users complete actions in this funnel.
          </Text>
        </View>
      ) : (
        <View style={s.funnelChart}>
          {steps.map((step, i) => {
            const barWidth = Math.round((step.count / maxCount) * 100);
            return (
              <View key={i} style={s.stepRow}>
                <View style={s.stepLeft}>
                  <Text style={s.stepLabel}>{step.label}</Text>
                  <Text style={s.stepCount}>{step.count.toLocaleString()}</Text>
                </View>
                <View style={s.stepBarArea}>
                  <View style={[s.stepBar, { width: `${barWidth}%` }]} />
                  <Text style={s.stepPct}>{step.pct}%</Text>
                </View>
                {step.dropoff > 0 && (
                  <View style={s.dropoffBadge}>
                    <Ionicons name="arrow-down" size={10} color={colors.error} />
                    <Text style={s.dropoffText}>{step.dropoff}%</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const createStyles = (colors: typeof Colors.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.navy,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyMessage: { fontSize: 14, color: colors.mutedDark, textAlign: 'center', lineHeight: 20 },
    funnelSelector: { padding: 16, maxHeight: 60 },
    funnelTab: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.gray200,
    },
    funnelTabActive: { backgroundColor: colors.navy, borderColor: colors.navy },
    funnelTabText: { fontSize: 13, color: colors.gray700, fontWeight: '600' },
    funnelTabTextActive: { color: colors.card },
    funnelChart: {
      margin: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      elevation: 2,
    },
    stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
    stepLeft: { width: 130 },
    stepLabel: { fontSize: 12, fontWeight: '600', color: colors.navy },
    stepCount: { fontSize: 11, color: colors.mutedDark },
    stepBarArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepBar: { height: 20, backgroundColor: colors.navy, borderRadius: 4, minWidth: 4 },
    stepPct: { fontSize: 12, fontWeight: '700', color: colors.navy },
    dropoffBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.errorLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    dropoffText: { fontSize: 10, fontWeight: '700', color: colors.error },
  });
