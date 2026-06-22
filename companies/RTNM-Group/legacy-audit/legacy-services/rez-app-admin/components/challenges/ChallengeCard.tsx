/**
 * ChallengeCard — card component for displaying a single challenge in the list.
 * Extracted from challenges.tsx to keep the main screen under 500 lines.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import type { AdminChallenge, ChallengeStatus } from '../../services/api/challenges';

const TYPE_COLORS: Record<string, string> = {
  daily: Colors.light.info, weekly: Colors.light.purple, monthly: Colors.light.warning, special: Colors.light.error,
};
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: Colors.light.success, medium: Colors.light.warning, hard: Colors.light.error,
};
const STATUS_COLORS: Record<string, string> = {
  draft: Colors.light.slateMedium, scheduled: Colors.light.info, active: Colors.light.success,
  paused: Colors.light.warning, completed: Colors.light.indigo,
  expired: Colors.light.error, disabled: Colors.light.mutedDark,
};
const VISIBILITY_LABELS: Record<string, string> = {
  play_and_earn: 'Play & Earn', missions: 'Missions', both: 'Both',
};
const VISIBILITY_COLORS: Record<string, string> = {
  play_and_earn: Colors.light.purple, missions: Colors.light.info, both: Colors.light.success,
};

function getStatus(item: AdminChallenge): string {
  if (item.status) return item.status;
  if (!item.active) return 'disabled';
  if (new Date(item.endDate) < new Date()) return 'expired';
  return 'active';
}

function formatDateShort(dateString: string): string {
  try {
    const { format } = require('date-fns');
    return format(new Date(dateString), 'MMM dd, HH:mm');
  } catch { return dateString; }
}

function formatActionName(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
}

interface Props {
  item: AdminChallenge;
  colors: typeof Colors.light;
  onEdit: (c: AdminChallenge) => void;
  onClone: (c: AdminChallenge) => void;
  onChangeStatus: (c: AdminChallenge, s: ChallengeStatus) => void;
  onToggleFeatured: (c: AdminChallenge) => void;
  onDelete: (c: AdminChallenge) => void;
}

export function ChallengeCard({ item, colors, onEdit, onClone, onChangeStatus, onToggleFeatured, onDelete }: Props) {
  const status = getStatus(item);
  const completionRate = item.participantCount > 0 ? ((item.completionCount / item.participantCount) * 100).toFixed(1) : '0';
  const statusColor = STATUS_COLORS[status] || colors.mutedDark;

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: statusColor }]}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <Text style={s.cardIcon}>{item.icon}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[s.cardDescription, { color: colors.icon }]} numberOfLines={1}>{item.description}</Text>
          </View>
        </View>
        <View style={[s.statusChip, { backgroundColor: `${statusColor}15` }]}>
          <Ionicons name={status === 'active' ? 'radio-button-on' : status === 'expired' ? 'close-circle' : 'help-circle-outline' as any} size={12} color={statusColor} />
          <Text style={[s.statusLabel, { color: statusColor }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
        </View>
      </View>

      <View style={s.badgesRow}>
        <View style={[s.typeBadge, { backgroundColor: `${TYPE_COLORS[item.type]}15` }]}>
          <Text style={[s.typeBadgeText, { color: TYPE_COLORS[item.type] }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
        </View>
        <View style={[s.difficultyBadge, { backgroundColor: `${DIFFICULTY_COLORS[item.difficulty]}15` }]}>
          <Text style={[s.difficultyBadgeText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>{item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}</Text>
        </View>
        <View style={[s.typeBadge, { backgroundColor: `${VISIBILITY_COLORS[item.visibility || 'both']}15` }]}>
          <Text style={[s.typeBadgeText, { color: VISIBILITY_COLORS[item.visibility || 'both'] }]}>{VISIBILITY_LABELS[item.visibility || 'both']}</Text>
        </View>
        {item.featured && (
          <View style={[s.featuredBadge, { backgroundColor: `${colors.warning}15` }]}>
            <Ionicons name="star" size={11} color={colors.warning} />
            <Text style={[s.featuredBadgeText, { color: colors.warning }]}>Featured</Text>
          </View>
        )}
        {(item.priority || 0) > 0 && (
          <View style={[s.featuredBadge, { backgroundColor: `${colors.indigo}15` }]}>
            <Ionicons name="arrow-up" size={11} color={colors.indigo} />
            <Text style={[s.featuredBadgeText, { color: colors.indigo }]}>P{item.priority}</Text>
          </View>
        )}
      </View>

      <View style={s.metaRow}>
        <View style={s.metaChip}>
          <Ionicons name="flash-outline" size={13} color={colors.icon} />
          <Text style={[s.metaText, { color: colors.icon }]}>{formatActionName(item.requirements.action)} x{item.requirements.target}</Text>
        </View>
        <View style={s.metaChip}>
          <Ionicons name="logo-bitcoin" size={13} color={colors.warning} />
          <Text style={[s.metaText, { color: colors.warning, fontWeight: '700' }]}>{item.rewards.coins} coins</Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <View style={s.metaChip}>
          <Ionicons name="people-outline" size={13} color={colors.icon} />
          <Text style={[s.metaText, { color: colors.icon }]}>{item.participantCount} participants</Text>
        </View>
        <View style={s.metaChip}>
          <Ionicons name="checkmark-circle-outline" size={13} color={colors.icon} />
          <Text style={[s.metaText, { color: colors.icon }]}>{item.completionCount} completed ({completionRate}%)</Text>
        </View>
      </View>

      <View style={[s.dateRow, { borderTopColor: colors.border }]}>
        <View style={s.dateInfo}>
          <Ionicons name="calendar-outline" size={12} color={colors.icon} />
          <Text style={[s.dateText, { color: colors.icon }]}>{formatDateShort(item.startDate)} - {formatDateShort(item.endDate)}</Text>
        </View>
        {item.maxParticipants && (
          <Text style={[s.maxParticipantsBadge, { backgroundColor: colors.background, color: colors.icon }]}>Max {item.maxParticipants}</Text>
        )}
      </View>

      <View style={s.statusActionsRow}>
        {status === 'draft' && (
          <TouchableOpacity style={[s.statusActionBtn, { backgroundColor: `${colors.success}15` }]} onPress={() => onChangeStatus(item, 'active')}>
            <Ionicons name="play" size={13} color={colors.success} /><Text style={[s.statusActionText, { color: colors.success }]}>Activate</Text>
          </TouchableOpacity>
        )}
        {status === 'active' && (
          <TouchableOpacity style={[s.statusActionBtn, { backgroundColor: `${colors.warning}15` }]} onPress={() => onChangeStatus(item, 'paused')}>
            <Ionicons name="pause" size={13} color={colors.warning} /><Text style={[s.statusActionText, { color: colors.warning }]}>Pause</Text>
          </TouchableOpacity>
        )}
        {status === 'paused' && (
          <TouchableOpacity style={[s.statusActionBtn, { backgroundColor: `${colors.success}15` }]} onPress={() => onChangeStatus(item, 'active')}>
            <Ionicons name="play" size={13} color={colors.success} /><Text style={[s.statusActionText, { color: colors.success }]}>Resume</Text>
          </TouchableOpacity>
        )}
        {(status === 'active' || status === 'paused') && (
          <TouchableOpacity style={[s.statusActionBtn, { backgroundColor: `${colors.mutedDark}15` }]} onPress={() => onChangeStatus(item, 'disabled')}>
            <Ionicons name="ban-outline" size={13} color={colors.mutedDark} /><Text style={[s.statusActionText, { color: colors.mutedDark }]}>Disable</Text>
          </TouchableOpacity>
        )}
        {(status === 'disabled' || status === 'expired') && (
          <TouchableOpacity style={[s.statusActionBtn, { backgroundColor: `${colors.info}15` }]} onPress={() => onClone(item)}>
            <Ionicons name="copy-outline" size={13} color={colors.info} /><Text style={[s.statusActionText, { color: colors.info }]}>Clone</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: `${colors.info}10` }]} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={16} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: `${colors.purple}10` }]} onPress={() => onClone(item)}>
          <Ionicons name="copy" size={16} color={colors.purple} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: item.featured ? `${colors.warning}15` : `${colors.border}50` }]} onPress={() => onToggleFeatured(item)}>
          <Ionicons name={item.featured ? 'star' : 'star-outline'} size={16} color={item.featured ? colors.warning : colors.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: `${colors.error}10` }]} onPress={() => onDelete(item)}>
          <Ionicons name="trash" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDescription: { fontSize: 12, marginTop: 2 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  difficultyBadgeText: { fontSize: 11, fontWeight: '700' },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 3 },
  featuredBadgeText: { fontSize: 11, fontWeight: '700' },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
  statusLabel: { fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, marginBottom: 8 },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12 },
  maxParticipantsBadge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  statusActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  statusActionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  statusActionText: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionIconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
