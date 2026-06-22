import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BonusCampaignAdmin } from '../../services/api/bonusZone';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';

interface CampaignCardProps {
  item: BonusCampaignAdmin;
  colors: Record<string, string>;
  onEdit: (item: BonusCampaignAdmin) => void;
  onLoadAnalytics: (id: string) => void;
  onDuplicate: (item: BonusCampaignAdmin) => void;
  onStatusChange: (item: BonusCampaignAdmin, status: string) => void;
  onFund: (item: BonusCampaignAdmin) => void;
  onDelete: (item: BonusCampaignAdmin) => void;
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  cashback_boost: 'Cashback Boost',
  bank_offer: 'Bank Offer',
  bill_upload_bonus: 'Bill Upload',
  category_multiplier: 'Category Multiplier',
  first_transaction_bonus: 'First Transaction',
  festival_offer: 'Festival Offer',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  flat: 'Flat Coins',
  multiplier: 'Multiplier',
};

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

function formatBudget(consumed: number, total: number): string {
  const percent = total > 0 ? Math.round((consumed / total) * 100) : 0;
  return `${consumed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;
}

export default function CampaignCard({
  item,
  colors,
  onEdit,
  onLoadAnalytics,
  onDuplicate,
  onStatusChange,
  onFund,
  onDelete,
}: CampaignCardProps) {
  const consumed = item.reward?.consumedBudget || 0;
  const total = item.reward?.totalBudget || 1;
  const percent = total > 0 ? Math.min(100, Math.round((consumed / total) * 100)) : 0;
  const isExhausted = consumed >= total;

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={cardStyles.cardHeader}>
        <View style={cardStyles.cardHeaderLeft}>
          <Text style={cardStyles.cardIcon}>{item.display?.icon || '🎁'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[cardStyles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={cardStyles.cardSlug}>{item.slug}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} colors={colors} />
      </View>

      {/* Info Row */}
      <View style={cardStyles.cardInfoRow}>
        <View style={cardStyles.infoChip}>
          <Text style={cardStyles.infoChipText}>
            {CAMPAIGN_TYPE_LABELS[item.campaignType] || item.campaignType}
          </Text>
        </View>
        <View style={cardStyles.infoChip}>
          <Text style={cardStyles.infoChipText}>
            {REWARD_TYPE_LABELS[item.reward?.type] || item.reward?.type}: {item.reward?.value}
          </Text>
        </View>
        {item.display?.featured && (
          <View style={[cardStyles.infoChip, { backgroundColor: colors.warningLight }]}>
            <Text style={[cardStyles.infoChipText, { color: colors.warningDark }]}>Featured</Text>
          </View>
        )}
      </View>

      {/* Budget */}
      <View style={cardStyles.budgetRow}>
        <Text style={cardStyles.budgetLabel}>Budget:</Text>
        <Text style={cardStyles.budgetValue}>{formatBudget(consumed, total)}</Text>
      </View>

      {/* Budget Progress Bar */}
      <View style={cardStyles.progressBarBg}>
        <View
          style={[
            cardStyles.progressBarFill,
            {
              width: `${percent}%`,
              backgroundColor: isExhausted ? colors.error : colors.success,
            },
          ]}
        />
      </View>

      {/* Schedule */}
      <View style={cardStyles.scheduleRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.mutedDark} />
        <Text style={cardStyles.scheduleText}>
          {formatDate(item.startTime)} → {formatDate(item.endTime)}
        </Text>
      </View>

      {/* Claims & Priority */}
      <View style={cardStyles.statsRow}>
        <Text style={cardStyles.statsText}>
          Claims: {item.limits?.currentGlobalClaims || 0}
          {item.limits?.totalGlobalClaims ? ` / ${item.limits.totalGlobalClaims}` : ''}
        </Text>
        <Text style={cardStyles.statsText}>Priority: {item.display?.priority || 0}</Text>
      </View>

      {/* Actions */}
      <View style={cardStyles.cardActions}>
        <TouchableOpacity style={cardStyles.actionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[cardStyles.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={cardStyles.actionBtn} onPress={() => onLoadAnalytics(item._id)}>
          <Ionicons name="bar-chart-outline" size={18} color={colors.purple} />
          <Text style={[cardStyles.actionText, { color: colors.purple }]}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={cardStyles.actionBtn} onPress={() => onDuplicate(item)}>
          <Ionicons name="copy-outline" size={18} color={colors.mutedDark} />
          <Text style={[cardStyles.actionText, { color: colors.secondaryText }]}>Dup</Text>
        </TouchableOpacity>

        {item.status === 'active' && (
          <TouchableOpacity
            style={cardStyles.actionBtn}
            onPress={() => onStatusChange(item, 'paused')}
          >
            <Ionicons name="pause-circle-outline" size={18} color={colors.warning} />
            <Text style={[cardStyles.actionText, { color: colors.warning }]}>Pause</Text>
          </TouchableOpacity>
        )}

        {item.status === 'paused' && (
          <TouchableOpacity
            style={cardStyles.actionBtn}
            onPress={() => onStatusChange(item, 'active')}
          >
            <Ionicons name="play-circle-outline" size={18} color={colors.success} />
            <Text style={[cardStyles.actionText, { color: colors.success }]}>Resume</Text>
          </TouchableOpacity>
        )}

        {item.status === 'draft' && (
          <TouchableOpacity
            style={cardStyles.actionBtn}
            onPress={() => onStatusChange(item, 'scheduled')}
          >
            <Ionicons name="rocket-outline" size={18} color={colors.success} />
            <Text style={[cardStyles.actionText, { color: colors.success }]}>Publish</Text>
          </TouchableOpacity>
        )}

        {['active', 'exhausted'].includes(item.status) && (
          <TouchableOpacity style={cardStyles.actionBtn} onPress={() => onFund(item)}>
            <Ionicons name="add-circle-outline" size={18} color={colors.success} />
            <Text style={[cardStyles.actionText, { color: colors.success }]}>+Fund</Text>
          </TouchableOpacity>
        )}

        {['draft', 'cancelled'].includes(item.status) && (
          <TouchableOpacity style={cardStyles.actionBtn} onPress={() => onDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[cardStyles.actionText, { color: colors.error }]}>Del</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSlug: { fontSize: 11, color: Colors.light.muted, marginTop: 1 },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  infoChipText: { fontSize: 11, fontWeight: '500', color: Colors.light.gray700 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  budgetLabel: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  budgetValue: { fontSize: 12, color: Colors.light.gray700, fontWeight: '600' },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.light.gray200,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: { height: 4, borderRadius: 2 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  scheduleText: { fontSize: 11, color: Colors.light.mutedDark },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statsText: { fontSize: 11, color: Colors.light.muted },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundSecondary,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionText: { fontSize: 12, fontWeight: '500' },
});
