import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SectionHeader, Card, InfoRow, StatusDot } from '../SectionCard';
import type { MerchantStatusSummary } from '../types';

interface Props {
  merchantStatus: MerchantStatusSummary | null | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

export function MerchantStatusSection({ merchantStatus, collapsed, onToggle }: Props) {
  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader icon="storefront" title="Merchant Live Status" />
      </TouchableOpacity>
      {!collapsed && merchantStatus && (
        <View style={styles.body}>
          <View style={styles.merchantRow}>
            <View style={styles.merchantCard}>
              <StatusDot status="green" />
              <Text style={styles.merchantNum}>{merchantStatus.totalOnline}</Text>
              <Text style={styles.merchantLabel}>Online</Text>
            </View>
            <View style={styles.merchantCard}>
              <StatusDot status="amber" />
              <Text style={styles.merchantNum}>{merchantStatus.totalIdle}</Text>
              <Text style={styles.merchantLabel}>Idle</Text>
            </View>
            <View style={styles.merchantCard}>
              <StatusDot status="red" />
              <Text style={styles.merchantNum}>{merchantStatus.totalOffline}</Text>
              <Text style={styles.merchantLabel}>Offline</Text>
            </View>
          </View>
          <InfoRow label="Active Sessions" value={merchantStatus.totalActiveSessions} />
          <InfoRow
            label="Pending Orders"
            value={merchantStatus.totalPendingOrders}
            dot={merchantStatus.totalPendingOrders > 20 ? 'amber' : 'green'}
          />
        </View>
      )}
    </Card>
  );
}

const styles = {
  body: { marginTop: 10, gap: 6 },
  merchantRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 8 },
  merchantCard: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 4,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  merchantNum: { fontSize: 22, fontWeight: '800' as const, color: '#1a3a52' },
  merchantLabel: { fontSize: 11, color: '#64748B' },
};
