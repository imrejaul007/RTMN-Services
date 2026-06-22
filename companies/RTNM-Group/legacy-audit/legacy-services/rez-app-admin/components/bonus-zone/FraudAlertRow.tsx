import React from 'react';
import { View, Text } from 'react-native';
import { BonusFraudAlert } from '../../services/api/bonusZone';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';

interface FraudAlertRowProps {
  alert: BonusFraudAlert;
  colors: Record<string, string>;
}

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

export default function FraudAlertRow({ alert, colors }: FraudAlertRowProps) {
  const severityColors: Record<string, string> = {
    low: colors.secondaryText,
    medium: colors.warning,
    high: colors.error,
    critical: colors.errorDark,
  };
  const severityColor = severityColors[alert.severity] || colors.secondaryText;

  return (
    <View
      style={[
        rowStyles.row,
        {
          backgroundColor: colors.card,
          borderLeftColor: severityColor,
        },
      ]}
    >
      <View style={rowStyles.header}>
        <View
          style={[
            rowStyles.severityBadge,
            { backgroundColor: `${severityColor}20` },
          ]}
        >
          <Text style={[rowStyles.severityText, { color: severityColor }]}>
            {alert.severity.toUpperCase()}
          </Text>
        </View>
        <Text style={rowStyles.date}>{formatDate(alert.detectedAt)}</Text>
      </View>
      <Text style={[rowStyles.type, { color: colors.text }]}>{alert.alertType}</Text>
      <Text style={rowStyles.desc} numberOfLines={2}>
        {alert.description}
      </Text>
      {alert.userName && <Text style={rowStyles.user}>User: {alert.userName}</Text>}
      {alert.campaignTitle && (
        <Text style={rowStyles.campaign}>Campaign: {alert.campaignTitle}</Text>
      )}
    </View>
  );
}

const rowStyles = {
  row: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  date: { fontSize: 11, color: Colors.light.muted },
  type: { fontSize: 13, fontWeight: '600' as const, marginBottom: 2 },
  desc: { fontSize: 12, color: Colors.light.mutedDark, marginBottom: 4 },
  user: { fontSize: 11, color: Colors.light.muted },
  campaign: { fontSize: 11, color: Colors.light.muted },
};
