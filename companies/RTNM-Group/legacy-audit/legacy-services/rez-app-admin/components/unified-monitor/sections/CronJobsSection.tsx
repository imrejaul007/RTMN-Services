import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SectionHeader, Badge, Card, StatusDot } from '../SectionCard';
import { healthToDot, timeAgoShort } from '../helpers';
import type { JobData } from '../types';

interface Props {
  jobs: JobData[];
  collapsed: boolean;
  onToggle: () => void;
}

export function CronJobsSection({ jobs, collapsed, onToggle }: Props) {
  const failing = jobs.filter((j) => j.status === 'failing').length;
  const overdue = jobs.filter((j) => j.status === 'warning').length;

  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader
          icon="timer"
          title={`Cron Jobs (${jobs.length})`}
          badge={
            jobs.length === 0 ? (
              <Badge label="NO DATA" color="#6B7280" bg="#F3F4F6" />
            ) : failing > 0 ? (
              <Badge label={`${failing} FAILING`} color="#991B1B" bg="#FEE2E2" />
            ) : overdue > 0 ? (
              <Badge label={`${overdue} OVERDUE`} color="#92400E" bg="#FEF3C7" />
            ) : (
              <Badge label="ALL OK" color="#065F46" bg="#D1FAE5" />
            )
          }
        />
      </TouchableOpacity>
      {!collapsed && jobs.length > 0 && (
        <View style={styles.body}>
          {jobs.map((j) => (
            <View key={j.name} style={styles.jobRow}>
              <StatusDot status={healthToDot(j.status)} />
              <View style={{ flex: 1 }}>
                <Text style={styles.jobName} numberOfLines={1}>{j.name}</Text>
                <Text style={styles.jobMeta}>{j.schedule} · Last: {timeAgoShort(j.lastRun)}</Text>
              </View>
              {j.consecutiveFailures > 0 && (
                <Badge label={`${j.consecutiveFailures}x fail`} color="#991B1B" bg="#FEE2E2" />
              )}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 10, gap: 6 },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  jobName: { fontSize: 13, fontWeight: '600', color: '#1a3a52' },
  jobMeta: { fontSize: 11, color: '#94A3B8' },
});
