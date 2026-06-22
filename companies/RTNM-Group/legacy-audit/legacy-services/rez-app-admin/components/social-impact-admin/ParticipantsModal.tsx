import React from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import {
  Participant,
  getEventTypeEmoji,
  PARTICIPANT_STATUSES,
} from '@/services/api/socialImpact';

function getParticipantStatusColor(status: string): string {
  return PARTICIPANT_STATUSES.find((s) => s.value === status)?.color || '#9CA3AF';
}

function getParticipantStatusLabel(status: string): string {
  return PARTICIPANT_STATUSES.find((s) => s.value === status)?.label || status;
}

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateString;
  }
}

interface ParticipantsModalProps {
  visible: boolean;
  event: Participant extends { event?: infer E } ? NonNullable<E> extends { _id: string } ? NonNullable<E> : never : never | null;
  participants: Participant[];
  participantFilter: string;
  isLoading: boolean;
  actionLoading: string | null;
  otpDisplay: { name: string; code: string } | null;
  colors: Record<string, string>;
  onClose: () => void;
  onFilterChange: (status: string) => void;
  onCheckIn: (participant: Participant) => void;
  onComplete: (participant: Participant) => void;
  onGenerateOTP: (participant: Participant) => void;
  onBulkComplete: () => void;
  onOtpDismiss: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEvent = any;

export default function ParticipantsModal({
  visible,
  event,
  participants,
  participantFilter,
  isLoading,
  actionLoading,
  otpDisplay,
  colors,
  onClose,
  onFilterChange,
  onCheckIn,
  onComplete,
  onGenerateOTP,
  onBulkComplete,
  onOtpDismiss,
}: ParticipantsModalProps & { event?: AnyEvent }) {
  const selectedEvent = event as AnyEvent | null;
  const eligibleCount = participants.filter(
    (p) => p.status === 'checked_in' || p.status === 'registered'
  ).length;

  const renderParticipant = ({ item }: { item: Participant }) => {
    const pStatusColor = getParticipantStatusColor(item.status);
    const pStatusLabel = getParticipantStatusLabel(item.status);
    const isLoading = actionLoading === item.user._id;
    const canCheckIn = item.status === 'registered';
    const canComplete = item.status === 'checked_in' || item.status === 'registered';

    return (
      <View style={[styles.participantCard, { backgroundColor: colors.card }]}>
        <View style={styles.participantCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.participantName, { color: colors.text }]}>
              {item.user.name || 'Unknown User'}
            </Text>
            {item.user.phoneNumber && (
              <Text style={[styles.participantPhone, { color: colors.icon }]}>
                {item.user.phoneNumber}
              </Text>
            )}
            <Text style={[styles.participantDate, { color: colors.icon }]}>
              Registered: {formatDate(item.registeredAt)}
            </Text>
            {item.checkedInAt && (
              <Text style={[styles.participantDate, { color: colors.warning }]}>
                Checked in: {formatDate(item.checkedInAt)}
              </Text>
            )}
            {item.completedAt && (
              <Text style={[styles.participantDate, { color: colors.success }]}>
                Completed: {formatDate(item.completedAt)}
              </Text>
            )}
          </View>
          <View style={[styles.participantStatusBadge, { backgroundColor: `${pStatusColor}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: pStatusColor }]} />
            <Text style={[styles.participantStatusText, { color: pStatusColor }]}>
              {pStatusLabel}
            </Text>
          </View>
        </View>

        {(canCheckIn || canComplete) && (
          <View style={styles.participantActions}>
            {canCheckIn && (
              <>
                <TouchableOpacity
                  style={[styles.participantActionBtn, { backgroundColor: `${colors.warning}15` }]}
                  onPress={() => onCheckIn(item)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.warning} />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={14} color={colors.warning} />
                      <Text style={[styles.participantActionText, { color: colors.warning }]}>
                        Check In
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.participantActionBtn, { backgroundColor: `${colors.purple}15` }]}
                  onPress={() => onGenerateOTP(item)}
                  disabled={isLoading}
                >
                  <Ionicons name="key-outline" size={14} color={colors.purple} />
                  <Text style={[styles.participantActionText, { color: colors.purple }]}>OTP</Text>
                </TouchableOpacity>
              </>
            )}
            {canComplete && (
              <TouchableOpacity
                style={[styles.participantActionBtn, { backgroundColor: `${colors.success}15` }]}
                onPress={() => onComplete(item)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.success} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                    <Text style={[styles.participantActionText, { color: colors.success }]}>
                      Complete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.coinsAwarded && (item.coinsAwarded.rez > 0 || item.coinsAwarded.brand > 0) && (
          <View style={[styles.coinsAwardedRow, { borderTopColor: colors.border }]}>
            <Ionicons name="gift-outline" size={13} color={colors.icon} />
            <Text style={[styles.coinsAwardedText, { color: colors.icon }]}>
              Awarded:
              {item.coinsAwarded.rez > 0 ? ` ${item.coinsAwarded.rez} ${BRAND.COIN_SHORT}` : ''}
              {item.coinsAwarded.brand > 0 ? ` ${item.coinsAwarded.brand} Brand` : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
            Participants
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {selectedEvent && (
          <View style={[styles.participantsBanner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={styles.participantsBannerEmoji}>
              {getEventTypeEmoji(selectedEvent.eventType)}
            </Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.participantsBannerTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedEvent.name}
              </Text>
              <Text style={[styles.participantsBannerSub, { color: colors.icon }]}>
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        {eligibleCount > 0 && (
          <View style={styles.bulkActionRow}>
            <TouchableOpacity
              style={[styles.bulkCompleteBtn, { backgroundColor: colors.success }]}
              onPress={onBulkComplete}
              disabled={actionLoading === 'bulk'}
            >
              {actionLoading === 'bulk' ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color={colors.card} />
                  <Text style={styles.bulkCompleteBtnText}>Complete All ({eligibleCount})</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[{ value: 'all', label: 'All', color: colors.tint }, ...PARTICIPANT_STATUSES].map((status) => {
              const isActive = participantFilter === status.value;
              const chipColor = status.color;
              return (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? `${chipColor}20` : colors.card,
                      borderColor: isActive ? chipColor : colors.border,
                    },
                  ]}
                  onPress={() => onFilterChange(status.value)}
                >
                  <Text style={[styles.filterChipText, { color: isActive ? chipColor : colors.icon }]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            data={participants}
            keyExtractor={(item, index) => item._id || `participant-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={renderParticipant}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={56} color={colors.icon} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No participants</Text>
                <Text style={[styles.emptyText, { color: colors.icon }]}>
                  No participants found for this event
                </Text>
              </View>
            }
          />
        )}

        {otpDisplay && (
          <View style={styles.otpBanner}>
            <View style={styles.otpBannerContent}>
              <Ionicons name="key" size={20} color={colors.purple} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.otpBannerLabel}>OTP for {otpDisplay.name}</Text>
                <Text style={styles.otpBannerCode}>{otpDisplay.code}</Text>
                <Text style={styles.otpBannerExpiry}>Expires in 30 minutes</Text>
              </View>
              <TouchableOpacity onPress={onOtpDismiss}>
                <Ionicons name="close-circle" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseBtn: { padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  participantsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  participantsBannerEmoji: { fontSize: 28 },
  participantsBannerTitle: { fontSize: 16, fontWeight: '700' },
  participantsBannerSub: { fontSize: 12, marginTop: 2 },
  bulkActionRow: { paddingHorizontal: 16, paddingVertical: 10 },
  bulkCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  bulkCompleteBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  filtersContainer: { marginBottom: 8 },
  filterRow: { paddingHorizontal: 16, gap: 6, flexDirection: 'row', alignItems: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  participantCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  participantCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  participantName: { fontSize: 15, fontWeight: '600' },
  participantPhone: { fontSize: 12, marginTop: 2 },
  participantDate: { fontSize: 11, marginTop: 3 },
  participantStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    marginLeft: 8,
  },
  participantStatusText: { fontSize: 11, fontWeight: '600' },
  participantActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  participantActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  participantActionText: { fontSize: 12, fontWeight: '600' },
  coinsAwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 10,
  },
  coinsAwardedText: { fontSize: 12 },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptyText: { fontSize: 14, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  otpBanner: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginHorizontal: 16,
  },
  otpBannerContent: { flexDirection: 'row', alignItems: 'center' },
  otpBannerLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  otpBannerCode: { fontSize: 28, fontWeight: '700', color: '#6D28D9', letterSpacing: 6 },
  otpBannerExpiry: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
