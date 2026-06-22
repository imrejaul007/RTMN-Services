import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SectionHeader, Badge, Card, InfoRow } from '../SectionCard';
import { formatRupees } from '../helpers';
import type { AggregatorStats } from '../types';

interface Props {
  aggregator: AggregatorStats | null | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

export function AggregatorSection({ aggregator, collapsed, onToggle }: Props) {
  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader
          icon="globe"
          title="Aggregator Orders"
          badge={
            aggregator?.stuckOrders && aggregator.stuckOrders.length > 0 ? (
              <Badge label={`${aggregator.stuckOrders.length} STUCK`} color="#991B1B" bg="#FEE2E2" />
            ) : !aggregator ? (
              <Badge label="NO DATA" color="#6B7280" bg="#F3F4F6" />
            ) : undefined
          }
        />
      </TouchableOpacity>
      {!collapsed && aggregator && (
        <View style={styles.body}>
          {aggregator.platforms.map((p: any) => (
            <View key={p._id || p.name} style={styles.aggRow}>
              <Text style={styles.aggPlatform}>{p._id || p.name}</Text>
              <Text style={styles.aggStat}>{p.count ?? p.todayOrders ?? 0} orders</Text>
              <Text style={styles.aggStat}>{formatRupees(p.revenue ?? 0)}</Text>
            </View>
          ))}
          {aggregator.stuckOrders.length > 0 && (
            <>
              <Text style={[styles.subHeading, { color: '#EF4444' }]}>Stuck Orders</Text>
              {aggregator.stuckOrders.map((o: any) => (
                <InfoRow
                  key={o.id || o._id}
                  label={`${o.platform} · ${o.merchantName}`}
                  value={`${o.minutesStuck}m stuck`}
                  dot="red"
                />
              ))}
            </>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 10, gap: 6 },
  aggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  aggPlatform: { flex: 1, fontSize: 13, fontWeight: '600' as const, color: '#1a3a52' },
  aggStat: { fontSize: 11, color: '#64748B' },
  subHeading: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 2 },
});
