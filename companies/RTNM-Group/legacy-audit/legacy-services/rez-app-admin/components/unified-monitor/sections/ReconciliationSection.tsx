import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SectionHeader, Badge, Card, InfoRow } from '../SectionCard';
import { formatRupees, timeAgoShort } from '../helpers';
import type { ReconciliationResult } from '../../../services/api/system';

interface Props {
  reconciliation: ReconciliationResult | null | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

export function ReconciliationSection({ reconciliation, collapsed, onToggle }: Props) {
  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader
          icon="calculator"
          title="Reconciliation"
          badge={
            reconciliation?.summary ? (
              reconciliation.summary.criticalCount > 0 ? (
                <Badge label={`${reconciliation.summary.criticalCount} CRITICAL`} color="#991B1B" bg="#FEE2E2" />
              ) : reconciliation.summary.totalDiscrepancies > 0 ? (
                <Badge label={`${reconciliation.summary.totalDiscrepancies} issues`} color="#92400E" bg="#FEF3C7" />
              ) : (
                <Badge label="CLEAN" color="#065F46" bg="#D1FAE5" />
              )
            ) : undefined
          }
        />
      </TouchableOpacity>
      {!collapsed && reconciliation && (
        <View style={styles.body}>
          {reconciliation.hasResults && reconciliation.summary ? (
            <>
              <InfoRow label="Users Checked" value={reconciliation.usersChecked ?? '—'} />
              <InfoRow
                label="Discrepancies"
                value={reconciliation.summary.totalDiscrepancies}
                dot={reconciliation.summary.totalDiscrepancies > 0 ? 'amber' : 'green'}
              />
              <InfoRow
                label="Critical"
                value={reconciliation.summary.criticalCount}
                dot={reconciliation.summary.criticalCount > 0 ? 'red' : 'green'}
              />
              <InfoRow
                label="High"
                value={reconciliation.summary.highCount}
                dot={reconciliation.summary.highCount > 0 ? 'amber' : 'green'}
              />
              <InfoRow label="Total Difference" value={formatRupees(reconciliation.summary.totalDifferenceAmount)} />
              {reconciliation.timestamp && (
                <InfoRow label="Last Run" value={timeAgoShort(reconciliation.timestamp)} />
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>{reconciliation.message || 'No reconciliation data available'}</Text>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = {
  body: { marginTop: 10, gap: 6 },
  emptyText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' as const },
};
