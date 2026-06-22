import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SectionHeader, Badge, Card, StatusDot } from '../SectionCard';
import { healthToDot } from '../helpers';
import type { QueueInfo } from '../../../services/api/system';

interface Props {
  queues: { overall: string; queues: QueueInfo[] } | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

export function QueueHealthSection({ queues, collapsed, onToggle }: Props) {
  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader
          icon="layers"
          title="Queue Health (BullMQ)"
          badge={
            queues ? (
              <Badge
                label={queues.overall.toUpperCase()}
                color={queues.overall === 'healthy' ? '#065F46' : '#92400E'}
                bg={queues.overall === 'healthy' ? '#D1FAE5' : '#FEF3C7'}
              />
            ) : undefined
          }
        />
      </TouchableOpacity>
      {!collapsed && queues?.queues && (
        <View style={styles.body}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Queue</Text>
            <Text style={styles.th}>Wait</Text>
            <Text style={styles.th}>Active</Text>
            <Text style={styles.th}>Failed</Text>
            <View style={{ flex: 0.5, alignItems: 'center' }} />
          </View>
          {queues.queues.map((q) => (
            <View key={q.name} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{q.name}</Text>
              <Text style={styles.td}>{q.waiting ?? 0}</Text>
              <Text style={styles.td}>{q.active ?? 0}</Text>
              <Text style={[styles.td, (q.failed ?? 0) > 0 && { color: '#EF4444', fontWeight: '600' }]}>
                {q.failed ?? 0}
              </Text>
              <View style={{ flex: 0.5, alignItems: 'center' }}>
                <StatusDot status={healthToDot(q.status)} />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 10, gap: 6 },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  th: { flex: 1, fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  td: { flex: 1, fontSize: 12, color: '#1a3a52' },
});
