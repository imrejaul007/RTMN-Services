import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { s } from './styles/moderation-queue.styles';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlaggedUser {
  userId: string;
  name: string;
  email: string | null;
  totalCoinsToday: number;
  checkInCount: number;
  flaggedAt: string;
}

interface QueueResponse {
  items: FlaggedUser[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ModerationQueueScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, hasRole } = useAuth();

  const [users, setUsers] = useState<FlaggedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 20;

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FlaggedUser | null>(null);
  const [coinsToDeduct, setCoinsToDeduct] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Idempotency key: generated once per reject modal session so accidental double-taps
  // or network retries collapse to a single server-side deduction.
  const idempotencyKey = useRef<string | null>(null);

  // RBAC: Rejecting a flagged user deducts up to 100k coins. Restrict to SUPER_ADMIN,
  // matching wallet-adjustment's gate since the financial impact is equivalent.
  if (!user || !hasRole(ADMIN_ROLES.SUPER_ADMIN)) {
    return (
      <View
        style={[
          s.centered,
          { backgroundColor: colors.background, paddingHorizontal: 32 },
        ]}
      >
        <Ionicons name="lock-closed-outline" size={48} color={colors.muted} />
        <Text
          style={[
            s.emptyTitle,
            { color: colors.text, marginTop: 16, textAlign: 'center' },
          ]}
        >
          Access Denied
        </Text>
        <Text
          style={[s.emptySubtitle, { color: colors.muted, marginTop: 8 }]}
        >
          You need Super Admin privileges to access the Moderation Queue.
        </Text>
      </View>
    );
  }

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchQueue = useCallback(async (targetPage: number, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (targetPage === 1) {
      setIsLoading(true);
    }

    try {
      const response = await apiClient.get<QueueResponse>(
        `admin/moderation/queue?page=${targetPage}&limit=${LIMIT}`
      );

      if (response.success && response.data) {
        const { items, total, totalPages: pages } = response.data;
        if (targetPage === 1) {
          setUsers(items);
        } else {
          setUsers((prev) => [...prev, ...items]);
        }
        setTotalCount(total);
        setTotalPages(pages);
        setPage(targetPage);
      } else {
        showAlert('Error', response.message || 'Failed to load moderation queue');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Network error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue(1);
  }, [fetchQueue]);

  const handleRefresh = useCallback(() => {
    fetchQueue(1, true);
  }, [fetchQueue]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && !refreshing && page < totalPages) {
      fetchQueue(page + 1);
    }
  }, [isLoading, refreshing, page, totalPages, fetchQueue]);

  // ── Approve ─────────────────────────────────────────────────────────────────

  const handleApprove = useCallback(async (user: FlaggedUser) => {
    try {
      const response = await apiClient.post(`admin/moderation/${user.userId}/approve`);
      if (response.success) {
        setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
        setTotalCount((prev) => Math.max(0, prev - 1));
        showAlert('Approved', `${user.name} has been cleared.`);
      } else {
        showAlert('Error', response.message || 'Failed to approve user');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Network error');
    }
  }, []);

  // ── Reject ──────────────────────────────────────────────────────────────────

  const openRejectModal = useCallback((user: FlaggedUser) => {
    setSelectedUser(user);
    setCoinsToDeduct('');
    setRejectReason('');
    // Generate a stable idempotency key for this reject session. The same key is reused
    // on any retry so the backend can dedupe; it is only regenerated when a new modal opens.
    idempotencyKey.current = crypto.randomUUID();
    setRejectModalVisible(true);
  }, []);

  const closeRejectModal = useCallback(() => {
    setRejectModalVisible(false);
    setSelectedUser(null);
    idempotencyKey.current = null;
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!selectedUser) return;

    const coins = parseInt(coinsToDeduct, 10);
    if (isNaN(coins) || coins <= 0) {
      showAlert('Validation', 'Enter a valid positive coin amount to deduct.');
      return;
    }
    if (coins > 100000) {
      showAlert('Validation', 'Coin deduction cannot exceed 100,000.');
      return;
    }
    if (!rejectReason.trim()) {
      showAlert('Validation', 'Please provide a reason.');
      return;
    }

    // Extra safety confirmation for material deductions. The first modal collects the
    // amount and reason; this second prompt forces the admin to re-read the total before
    // committing to a clawback greater than 1,000 coins.
    if (coins > 1000) {
      const confirmed = await showConfirm(
        'Confirm Large Deduction',
        `Deduct ${coins.toLocaleString()} coins from ${selectedUser.name}? This cannot be undone.`
      );
      if (!confirmed) return;
    }

    // Idempotency key is populated in openRejectModal. If it is somehow missing, regenerate
    // defensively so the POST still carries a key.
    if (!idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID();
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`admin/moderation/${selectedUser.userId}/reject`, {
        coinsToDeduct: coins,
        reason: rejectReason.trim(),
        idempotencyKey: idempotencyKey.current,
      });

      if (response.success) {
        setUsers((prev) => prev.filter((u) => u.userId !== selectedUser.userId));
        setTotalCount((prev) => Math.max(0, prev - 1));
        closeRejectModal();
        showAlert('Rejected', `${coins} coins deducted from ${selectedUser.name}.`);
      } else {
        showAlert('Error', response.message || 'Failed to reject user');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, coinsToDeduct, rejectReason, closeRejectModal]);

  // ── Row Renderer ─────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: FlaggedUser }) => (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.cardHeader}>
          <View style={s.userInfo}>
            <View style={[s.avatarPlaceholder, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="person" size={18} color={colors.error} />
            </View>
            <View style={s.userDetails}>
              <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.email ? (
                <Text style={[s.userEmail, { color: colors.muted }]} numberOfLines={1}>
                  {item.email}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[s.badge, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="warning-outline" size={12} color={colors.error} />
            <Text style={[s.badgeText, { color: colors.error }]}>Flagged</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {item.totalCoinsToday.toLocaleString()}
            </Text>
            <Text style={[s.statLabel, { color: colors.muted }]}>Coins Today</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>{item.checkInCount}</Text>
            <Text style={[s.statLabel, { color: colors.muted }]}>Check-Ins</Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionButton, s.approveButton, { borderColor: colors.success }]}
            onPress={() => handleApprove(item)}
            activeOpacity={0.75}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <Text style={[s.actionButtonText, { color: colors.success }]}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionButton, s.rejectButton, { backgroundColor: colors.error }]}
            onPress={() => openRejectModal(item)}
            activeOpacity={0.75}
          >
            <Ionicons name="close-circle-outline" size={16} color="#fff" />
            <Text style={[s.actionButtonText, { color: '#fff' }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [colors, handleApprove, openRejectModal]
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header summary */}
      <View
        style={[s.summaryBar, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Ionicons name="shield-outline" size={16} color={colors.warning} />
        <Text style={[s.summaryText, { color: colors.text }]}>
          {totalCount} flagged {totalCount === 1 ? 'user' : 'users'} today
        </Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
        renderItem={renderItem}
        contentContainerStyle={users.length === 0 ? s.emptyContainer : s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          !isLoading && page < totalPages ? (
            <ActivityIndicator style={s.footerLoader} color={colors.tint} />
          ) : null
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No flagged activity</Text>
            <Text style={[s.emptySubtitle, { color: colors.muted }]}>
              All users are within normal coin earning limits today.
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRejectModal}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                Reject {'&'} Deduct Coins
              </Text>
              <TouchableOpacity
                onPress={closeRejectModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <Text style={[s.modalSubtitle, { color: colors.muted }]}>
                User: {selectedUser.name}
              </Text>
            )}

            <Text style={[s.fieldLabel, { color: colors.text }]}>Coins to Deduct</Text>
            <TextInput
              style={[
                s.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="e.g. 200"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={coinsToDeduct}
              onChangeText={setCoinsToDeduct}
            />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Reason</Text>
            <TextInput
              style={[
                s.input,
                s.textArea,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="Describe the reason for rejection..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[
                  s.modalButton,
                  s.modalCancelButton,
                  { borderColor: colors.border },
                ]}
                onPress={closeRejectModal}
                disabled={isSubmitting}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.modalButton,
                  s.modalConfirmButton,
                  { backgroundColor: isSubmitting ? colors.muted : colors.error },
                ]}
                onPress={handleRejectSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[s.modalButtonText, { color: '#fff' }]}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

