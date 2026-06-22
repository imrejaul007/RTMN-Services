import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SectionHeader, Badge, InfoRow, Card } from '../SectionCard';
import { healthToDot, formatUptime } from '../helpers';
import type { SystemHealthData } from '../../../services/api/system';

interface Props {
  data: SystemHealthData | null | undefined;
  collapsed: boolean;
  onToggle: () => void;
  dotColor: 'green' | 'amber' | 'red';
}

export function InfrastructureSection({ data, collapsed, onToggle, dotColor }: Props) {
  const dotBg = dotColor === 'green' ? '#D1FAE5' : dotColor === 'amber' ? '#FEF3C7' : '#FEE2E2';
  const dotTextColor = dotColor === 'green' ? '#065F46' : dotColor === 'amber' ? '#92400E' : '#991B1B';

  return (
    <Card>
      <TouchableOpacity onPress={onToggle}>
        <SectionHeader
          icon="server"
          title="Infrastructure"
          badge={
            data ? (
              <Badge label="HEALTHY" color={dotTextColor} bg={dotBg} />
            ) : undefined
          }
        />
      </TouchableOpacity>
      {!collapsed && data && (
        <View style={styles.body}>
          <Text style={styles.subHeading}>Server</Text>
          <InfoRow
            label="CPU"
            value={`${data.server.cpuUsagePercent?.toFixed(1) ?? '—'}%`}
            dot={healthToDot(
              (data.server.cpuUsagePercent ?? 0) > 90
                ? 'unhealthy'
                : (data.server.cpuUsagePercent ?? 0) > 70
                  ? 'degraded'
                  : 'healthy'
            )}
          />
          <InfoRow
            label="Memory (Heap)"
            value={`${data.server.memory.heapUsedMB}/${data.server.memory.heapTotalMB} MB`}
            dot={healthToDot(
              data.server.memory.heapTotalMB > 0
                ? data.server.memory.heapUsedMB / data.server.memory.heapTotalMB > 0.9
                  ? 'unhealthy'
                  : 'healthy'
                : 'unknown'
            )}
          />
          <InfoRow label="RSS" value={`${data.server.memory.rssMB} MB`} />
          <InfoRow label="Uptime" value={formatUptime(data.server.uptime)} />
          <InfoRow label="Node" value={data.server.nodeVersion} />
          <Text style={styles.subHeading}>MongoDB</Text>
          <InfoRow label="Status" value={data.database.status} dot={healthToDot(data.database.status)} />
          <InfoRow label="Connections" value={data.database.connectionCount} />
          <InfoRow label="Host" value={data.database.host} />
          <Text style={styles.subHeading}>Redis</Text>
          <InfoRow label="Status" value={data.redis.status} dot={healthToDot(data.redis.status)} />
          <InfoRow label="Memory" value={data.redis.memory ?? '—'} />
          <InfoRow label="Keys" value={data.redis.dbSize} />
        </View>
      )}
    </Card>
  );
}

const styles = {
  body: { marginTop: 10, gap: 6 },
  subHeading: { fontSize: 12, fontWeight: '700' as const, color: '#1a3a52', marginTop: 8, marginBottom: 2 },
};
