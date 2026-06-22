import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../constants/Colors';

interface StatusBadgeProps {
  status: string;
  colors: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: Colors.light.slateMedium,
  scheduled: Colors.light.info,
  active: Colors.light.success,
  paused: Colors.light.warning,
  exhausted: Colors.light.error,
  expired: Colors.light.secondaryText,
  cancelled: Colors.light.errorDark,
};

export default function StatusBadge({ status, colors }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || colors.slateMedium;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: `${color}20` }]}>
      <View style={[badgeStyles.dot, { backgroundColor: color }]} />
      <Text style={[badgeStyles.text, { color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const badgeStyles = {
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '600' as const },
};
