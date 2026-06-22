import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SectionHeader, Badge, Card, InfoRow } from '../SectionCard';
import { healthToDot } from '../helpers';
import type { BbpsHealth } from '../types';

interface Props {
  bbps: BbpsHealth | null | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

export function BbpsSection({ bbps, collapsed, onToggle }: Props) {
  const down = bbps?.billers?.filter((b) => b.status === 'down').length ?? 0;
  const degraded = bbps?.billers?.filter((b) => b.status === 'degraded').length ?? 0;

  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader
          icon="receipt"
          title="BBPS Providers"
          badge={
            !bbps?.billers || bbps.billers.length === 0 ? (
              <Badge label="NO DATA" color="#6B7280" bg="#F3F4F6" />
            ) : down > 0 ? (
              <Badge label={`${down} DOWN`} color="#991B1B" bg="#FEE2E2" />
            ) : degraded > 0 ? (
              <Badge label={`${degraded} DEGRADED`} color="#92400E" bg="#FEF3C7" />
            ) : (
              <Badge label="ALL OK" color="#065F46" bg="#D1FAE5" />
            )
          }
        />
      </TouchableOpacity>
      {!collapsed && bbps?.billers && bbps.billers.length > 0 && (
        <View style={styles.body}>
          {bbps.billers.map((b) => (
            <InfoRow key={b.name} label={b.name} value={`${b.successRate}%`} dot={healthToDot(b.status)} />
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = {
  body: { marginTop: 10, gap: 6 },
};
