import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SectionHeader, Badge, Card, StatusDot } from '../SectionCard';
import type { SlaData } from '../types';

interface Props {
  sla: SlaData | null | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

const LABEL_COLORS: Record<string, { fg: string; bg: string }> = {
  ok: { fg: '#065F46', bg: '#D1FAE5' },
  warning: { fg: '#92400E', bg: '#FEF3C7' },
  breach: { fg: '#991B1B', bg: '#FEE2E2' },
  degraded: { fg: '#92400E', bg: '#FEF3C7' },
  unknown: { fg: '#6B7280', bg: '#F3F4F6' },
};

export function SlaSection({ sla, collapsed, onToggle }: Props) {
  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader
          icon="shield-checkmark"
          title="SLA Contracts"
          badge={
            sla ? (
              <Badge
                label={sla.overallStatus.toUpperCase()}
                color={LABEL_COLORS[sla.overallStatus]?.fg ?? '#6B7280'}
                bg={LABEL_COLORS[sla.overallStatus]?.bg ?? '#F3F4F6'}
              />
            ) : undefined
          }
        />
      </TouchableOpacity>
      {!collapsed && sla?.metrics && (
        <View style={styles.body}>
          {Object.entries(sla.metrics).map(([key, m]) => (
            <View key={key} style={styles.slaRow}>
              <StatusDot status={healthToDot(m.status)} />
              <View style={{ flex: 1 }}>
                <Text style={styles.slaName}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                {m.reason && <Text style={styles.slaReason}>{m.reason}</Text>}
              </View>
              <Badge
                label={m.status.toUpperCase()}
                color={LABEL_COLORS[m.status]?.fg ?? '#6B7280'}
                bg={LABEL_COLORS[m.status]?.bg ?? '#F3F4F6'}
              />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function healthToDot(status: string): 'green' | 'amber' | 'red' | 'gray' {
  if (['healthy', 'connected', 'ok', 'active'].includes(status)) return 'green';
  if (['degraded', 'warning', 'idle', 'unknown'].includes(status)) return 'amber';
  if (['unhealthy', 'disconnected', 'breach', 'down', 'failing'].includes(status)) return 'red';
  return 'gray';
}

const styles = StyleSheet.create({
  body: { marginTop: 10, gap: 6 },
  slaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  slaName: { fontSize: 13, fontWeight: '600' as const, color: '#1a3a52', textTransform: 'capitalize' as const },
  slaReason: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
});
