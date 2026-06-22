import React from 'react';
import { View, Text } from 'react-native';
import { SectionHeader, Card, InfoRow } from '../SectionCard';
import { formatRupees } from '../helpers';
import type { DashboardStats } from '../../../services/api/dashboard';

interface Props {
  stats: DashboardStats | null | undefined;
}

export function PlatformSummarySection({ stats }: Props) {
  return (
    <Card style={{ marginBottom: 40 }}>
      <SectionHeader icon="analytics" title="Platform Summary" />
      <View style={styles.body}>
        <InfoRow label="Total Merchants" value={stats?.merchants.total ?? '—'} />
        <InfoRow label="Active Merchants" value={stats?.merchants.active ?? '—'} />
        <InfoRow label="Total Users" value={stats?.users.total ?? '—'} />
        <InfoRow label="Orders This Month" value={stats?.orders.thisMonth ?? '—'} />
        <InfoRow
          label="Revenue MTD"
          value={stats?.revenue.thisMonth != null ? formatRupees(stats.revenue.thisMonth) : '—'}
        />
        <InfoRow
          label="Platform Fees"
          value={
            stats?.revenue.totalPlatformFees != null
              ? formatRupees(stats.revenue.totalPlatformFees)
              : '—'
          }
        />
        <InfoRow label="Coins Awarded Today" value={stats?.coins.awardedToday ?? '—'} />
        <InfoRow label="Coins Pending Approval" value={stats?.coins.pendingApproval ?? '—'} />
      </View>
    </Card>
  );
}

const styles = {
  body: { marginTop: 10, gap: 6 },
};
