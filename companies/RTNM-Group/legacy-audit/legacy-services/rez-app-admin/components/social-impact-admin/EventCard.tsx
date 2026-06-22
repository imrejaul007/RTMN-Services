import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import {
  SocialImpactEvent,
  getEventTypeEmoji,
  getStatusColor,
  EVENT_TYPES,
} from '@/services/api/socialImpact';

interface EventCardProps {
  item: SocialImpactEvent;
  colors: Record<string, string>;
  onEdit: (event: SocialImpactEvent) => void;
  onOpenParticipants: (event: SocialImpactEvent) => void;
  onApprove: (event: SocialImpactEvent) => void;
  onReject: (event: SocialImpactEvent) => void;
}

function getEventTypeLabel(eventType: string): string {
  return EVENT_TYPES.find((t: { value: string; label: string; emoji: string }) => t.value === eventType)?.label || eventType;
}

function formatDateShort(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export default function EventCard({
  item,
  colors,
  onEdit,
  onOpenParticipants,
  onApprove,
  onReject,
}: EventCardProps) {
  const emoji = getEventTypeEmoji(item.eventType);
  const statusColor = getStatusColor(item.eventStatus);
  const enrolled = item.capacity?.enrolled || 0;
  const goal = item.capacity?.goal || 1;
  const progressPercent = Math.min((enrolled / goal) * 100, 100);
  const isPending = item.status === 'pending_approval';
  const isRejected = item.status === 'rejected';

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, isPending && styles.pendingCard]}>
      {isPending && (
        <View style={styles.approvalBanner}>
          <Ionicons name="time-outline" size={14} color={colors.warning} />
          <Text style={styles.approvalBannerText}>Pending Admin Approval</Text>
          {(item as any).merchant?.businessName && (
            <Text style={styles.approvalMerchantText}>by {(item as any).merchant.businessName}</Text>
          )}
        </View>
      )}
      {isRejected && (
        <View style={[styles.approvalBanner, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="close-circle-outline" size={14} color={colors.error} />
          <Text style={[styles.approvalBannerText, { color: colors.error }]}>Rejected</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.icon }]} numberOfLines={1}>
              {getEventTypeLabel(item.eventType)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {item.eventStatus.charAt(0).toUpperCase() + item.eventStatus.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.organizer?.name ? (
          <View style={styles.metaChip}>
            <Ionicons name="business-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]} numberOfLines={1}>{item.organizer.name}</Text>
          </View>
        ) : null}
        {item.sponsor?.name ? (
          <View style={styles.metaChip}>
            <Ionicons name="ribbon-outline" size={13} color={colors.purple} />
            <Text style={[styles.metaText, { color: colors.purple }]} numberOfLines={1}>{item.sponsor.name}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {item.eventDate ? (
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>{formatDateShort(item.eventDate)}</Text>
          </View>
        ) : null}
        {item.location?.city ? (
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>{item.location.city}</Text>
          </View>
        ) : null}
        {item.eventTime?.start ? (
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {item.eventTime.start}{item.eventTime.end ? ` - ${item.eventTime.end}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.capacitySection}>
        <View style={styles.capacityHeader}>
          <Text style={[styles.capacityLabel, { color: colors.icon }]}>Capacity</Text>
          <Text style={[styles.capacityValue, { color: colors.text }]}>{enrolled} / {goal}</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: `${colors.border}80` }]}>
          <View style={[
            styles.progressBarFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: progressPercent >= 90 ? colors.error : progressPercent >= 70 ? colors.warning : colors.success,
            },
          ]} />
        </View>
      </View>

      <View style={styles.metaRow}>
        {(item.rewards?.rezCoins ?? 0) > 0 && (
          <View style={styles.metaChip}>
            <Ionicons name="logo-bitcoin" size={13} color={colors.warning} />
            <Text style={[styles.metaText, { color: colors.warning, fontWeight: '700' }]}>{item.rewards!.rezCoins} {BRAND.COIN_SHORT}</Text>
          </View>
        )}
        {(item.rewards?.brandCoins ?? 0) > 0 && (
          <View style={styles.metaChip}>
            <Ionicons name="diamond-outline" size={13} color={colors.purple} />
            <Text style={[styles.metaText, { color: colors.purple, fontWeight: '700' }]}>{item.rewards!.brandCoins} Brand</Text>
          </View>
        )}
        {item.featured && (
          <View style={[styles.featuredBadge, { backgroundColor: `${colors.warning}15` }]}>
            <Ionicons name="star" size={11} color={colors.warning} />
            <Text style={[styles.featuredBadgeText, { color: colors.warning }]}>Featured</Text>
          </View>
        )}
        {item.isCsrActivity && (
          <View style={[styles.csrBadge, { backgroundColor: `${colors.success}15` }]}>
            <Ionicons name="heart" size={11} color={colors.success} />
            <Text style={[styles.csrBadgeText, { color: colors.success }]}>CSR</Text>
          </View>
        )}
      </View>

      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        {isPending ? (
          <>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.success}15` }]} onPress={() => onApprove(item)}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.success }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.error}15` }]} onPress={() => onReject(item)}>
              <Ionicons name="close-circle" size={15} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.info}10` }]} onPress={() => onEdit(item)}>
              <Ionicons name="pencil" size={15} color={colors.info} />
              <Text style={[styles.actionBtnText, { color: colors.info }]}>Edit</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.tint}10` }]} onPress={() => onOpenParticipants(item)}>
              <Ionicons name="people" size={15} color={colors.tint} />
              <Text style={[styles.actionBtnText, { color: colors.tint }]}>Participants</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.info}10` }]} onPress={() => onEdit(item)}>
              <Ionicons name="pencil" size={15} color={colors.info} />
              <Text style={[styles.actionBtnText, { color: colors.info }]}>Edit</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pendingCard: { borderWidth: 1.5, borderColor: '#F59E0B', borderStyle: 'dashed' },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  approvalBannerText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  approvalMerchantText: { fontSize: 11, color: '#B45309', marginLeft: 'auto' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  cardEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  capacitySection: { marginBottom: 10 },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityLabel: { fontSize: 11, fontWeight: '500' },
  capacityValue: { fontSize: 12, fontWeight: '700' },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  featuredBadgeText: { fontSize: 11, fontWeight: '700' },
  csrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  csrBadgeText: { fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
});
