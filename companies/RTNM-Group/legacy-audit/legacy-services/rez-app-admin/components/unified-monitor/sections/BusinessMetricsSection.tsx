import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SectionHeader, Card, InfoRow } from '../SectionCard';
import type { BusinessMetrics } from '../types';

interface Props {
  businessMetrics: BusinessMetrics | null | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

export function BusinessMetricsSection({ businessMetrics, collapsed, onToggle }: Props) {
  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader icon="bar-chart" title="Business Metrics (7d)" />
      </TouchableOpacity>
      {!collapsed && businessMetrics && (
        <View style={styles.body}>
          {businessMetrics.summary && (
            <>
              <InfoRow label="Bookings" value={businessMetrics.summary.totalBookings ?? 0} />
              <InfoRow label="Orders" value={businessMetrics.summary.totalOrders ?? 0} />
              <InfoRow label="New Users" value={businessMetrics.summary.newUsers ?? 0} />
              <InfoRow label="Coins Earned" value={(businessMetrics.summary.coinsEarned ?? 0).toLocaleString()} />
              <InfoRow label="Coins Redeemed" value={(businessMetrics.summary.coinsRedeemed ?? 0).toLocaleString()} />
              <InfoRow label="BBPS Completed" value={businessMetrics.summary.bbpsCompleted ?? 0} />
            </>
          )}
          {businessMetrics.health && (
            <>
              <InfoRow
                label="Payment Success"
                value={businessMetrics.health.paymentSuccessRate ?? '—'}
                dot={(() => {
                  const rate = parseFloat(businessMetrics.health!.paymentSuccessRate);
                  if (isNaN(rate)) return 'amber';
                  return rate >= 95 ? 'green' : rate >= 85 ? 'amber' : 'red';
                })()}
              />
              <InfoRow label="Earn/Redeem Ratio" value={businessMetrics.health.coinsEarnedVsRedeemedRatio ?? '—'} />
            </>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = {
  body: { marginTop: 10, gap: 6 },
};
