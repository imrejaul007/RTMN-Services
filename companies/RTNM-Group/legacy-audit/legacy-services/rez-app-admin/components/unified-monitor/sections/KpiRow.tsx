import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KPICard } from '../SectionCard';
import { formatRupees } from '../helpers';
import type { DashboardStats } from '@/services/api/dashboard';
import type { BusinessMetrics } from '../types';

interface Props {
  stats: DashboardStats | null | undefined;
  businessMetrics: BusinessMetrics | null | undefined;
}

export function KpiRow({ stats, businessMetrics }: Props) {
  return (
    <View style={styles.kpiRow}>
      <KPICard
        label="Orders Today"
        value={stats?.orders.today ?? '—'}
        sub={`${stats?.orders.pendingCount ?? 0} pending`}
        icon="cart"
        color="#3B82F6"
      />
      <KPICard
        label="GMV Today"
        value={stats?.revenue.today != null ? formatRupees(stats.revenue.today) : '—'}
        sub={
          stats?.revenue.thisMonth != null
            ? `${formatRupees(stats.revenue.thisMonth)} MTD`
            : undefined
        }
        icon="cash"
        color="#10B981"
      />
      <KPICard
        label="Active Users"
        value={stats?.users.active ?? '—'}
        sub={`+${stats?.users.newToday ?? 0} today`}
        icon="people"
        color="#8B5CF6"
      />
      <KPICard
        label="Payment %"
        value={businessMetrics?.health?.paymentSuccessRate ?? '—'}
        icon="card"
        color="#F59E0B"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
