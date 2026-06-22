import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../../utils/alert';
import { usersService, User } from '../../../services/api/users';
import { useResetStreak } from '../../../hooks/queries/useUserMutations';

type Transaction = {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
};

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTx, setLoadingTx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const resetStreak = useResetStreak();

  // Suspend modal state
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const loadUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.getUser(id as string);
      setUser(data);
    } catch (err: any) {
      logger.error('[UserDetail] Load user error:', err.message);
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTransactions = useCallback(async () => {
    if (!id) return;
    setLoadingTx(true);
    try {
      const data = await usersService.getUserTransactions(id as string, 10);
      setTransactions(data);
    } catch (err: any) {
      logger.error('[UserDetail] Load transactions error:', err.message);
    } finally {
      setLoadingTx(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
    loadTransactions();
  }, [loadUser, loadTransactions]);

  const handleSuspend = useCallback(() => {
    setSuspendReason('');
    setShowSuspendModal(true);
  }, []);

  const confirmSuspend = useCallback(async () => {
    if (!user) return;
    if (!suspendReason.trim()) {
      showAlert('Required', 'Please enter a reason for suspension');
      return;
    }
    setProcessing(true);
    setShowSuspendModal(false);
    try {
      await usersService.setSuspendStatus(user._id, true, suspendReason.trim());
      showAlert('Success', 'User suspended successfully');
      await loadUser();
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setProcessing(false);
    }
  }, [user, suspendReason, loadUser]);

  const handleUnsuspend = useCallback(() => {
    if (!user) return;
    showConfirm(
      'Restore Account',
      'Are you sure you want to restore this account?',
      async () => {
        setProcessing(true);
        try {
          await usersService.setSuspendStatus(user._id, false);
          showAlert('Success', 'Account restored successfully');
          await loadUser();
        } catch (err: any) {
          showAlert('Error', err.message);
        } finally {
          setProcessing(false);
        }
      },
      'Restore'
    );
  }, [user, loadUser]);

  const handleResetStreak = useCallback(() => {
    if (!user) return;
    showConfirm(
      'Reset Streak',
      "This will reset the user's current streak to zero. Continue?",
      async () => {
        setProcessing(true);
        try {
          await resetStreak.mutateAsync({ userId: user._id });
          showAlert('Success', 'Streak reset successfully');
          await loadUser();
        } catch (err: any) {
          showAlert('Error', err.message);
        } finally {
          setProcessing(false);
        }
      },
      'Reset'
    );
  }, [user, loadUser]);

  const getInitials = (u: User): string => {
    const first = u.profile?.firstName;
    const last = u.profile?.lastName;
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first.slice(0, 2).toUpperCase();
    return u.phoneNumber.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (u: User): string => {
    if (u.profile?.firstName || u.profile?.lastName) {
      return `${u.profile.firstName || ''} ${u.profile.lastName || ''}`.trim();
    }
    return u.phoneNumber;
  };

  // Normalize backend UPPERCASE or Title Case tier to canonical lowercase.
  const normalizeTier = (tier?: string): string => {
    const map: Record<string, string> = {
      STARTER: 'bronze',
      BRONZE: 'bronze',
      SILVER: 'silver',
      GOLD: 'gold',
      PLATINUM: 'platinum',
      DIAMOND: 'platinum',
      Bronze: 'bronze',
      Silver: 'silver',
      Gold: 'gold',
      Platinum: 'platinum',
      bronze: 'bronze',
      silver: 'silver',
      gold: 'gold',
      platinum: 'platinum',
    };
    return map[tier ?? ''] ?? tier?.toLowerCase() ?? '';
  };

  const getTierColor = (tier?: string) => {
    switch (normalizeTier(tier)) {
      case 'platinum':
        return '#94A3B8';
      case 'gold':
        return colors.warning;
      case 'silver':
        return colors.muted;
      case 'bronze':
        return colors.bronze;
      default:
        return colors.icon;
    }
  };

  // Check all possible suspension indicators returned by different backend routes
  const isSuspended = user
    ? user.isSuspended || user.status === 'suspended' || user.isActive === false
    : false;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error || 'User not found'}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.tint }]}
          onPress={loadUser}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          User Details
        </Text>
        {processing && <ActivityIndicator size="small" color={colors.tint} />}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatarCircle, { backgroundColor: `${colors.tint}20` }]}>
            <Text style={[styles.avatarText, { color: colors.tint }]}>{getInitials(user)}</Text>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{getDisplayName(user)}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: `${colors.tint}20` }]}>
              <Text style={[styles.badgeText, { color: colors.tint }]}>{user.role}</Text>
            </View>
            {isSuspended ? (
              <View style={[styles.badge, { backgroundColor: colors.errorLight }]}>
                <Text style={[styles.badgeText, { color: colors.errorDark }]}>Suspended</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.badgeText, { color: colors.successDark }]}>Active</Text>
              </View>
            )}
            {user.tier && (
              <View style={[styles.badge, { backgroundColor: `${getTierColor(user.tier)}20` }]}>
                <Text style={[styles.badgeText, { color: getTierColor(user.tier) }]}>
                  {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Info</Text>
          {user.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={colors.icon} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={colors.icon} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.icon }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user.phoneNumber}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.icon} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.icon }]}>Joined</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {format(new Date(user.createdAt), 'MMMM d, yyyy')}
              </Text>
            </View>
          </View>
          {user.lastLogin && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={colors.icon} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Last Active</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {format(new Date(user.lastLogin), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
            </View>
          )}
          {user.stats?.lastActive && (
            <View style={styles.infoRow}>
              <Ionicons name="pulse-outline" size={18} color={colors.icon} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Last Active</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {format(new Date(user.stats.lastActive), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Stats</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {(user.stats?.lifetimeCoinsEarned ?? user.coinBalance ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Coins Earned</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {(user.stats?.coinsRedeemed ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Redeemed</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {(user.stats?.totalCheckIns ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Check-ins</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {user.stats?.currentStreak ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Streak</Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          {loadingTx ? (
            <ActivityIndicator size="small" color={colors.tint} style={{ padding: 16 }} />
          ) : transactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.icon }]}>No recent transactions</Text>
          ) : (
            transactions.map((tx) => (
              <View key={tx._id} style={[styles.txRow, { borderBottomColor: colors.border }]}>
                <View
                  style={[
                    styles.txIcon,
                    {
                      backgroundColor:
                        tx.type === 'credit' ? colors.successLight : colors.errorLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={tx.type === 'credit' ? colors.successDark : colors.errorDark}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txDescription, { color: colors.text }]} numberOfLines={1}>
                    {tx.description}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.icon }]}>
                    {format(new Date(tx.createdAt), 'MMM d, yyyy')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: tx.type === 'credit' ? colors.successDark : colors.errorDark },
                  ]}
                >
                  {tx.type === 'credit' ? '+' : '-'}
                  {tx.amount.toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Achievements */}
        {user.achievements && user.achievements.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
            {user.achievements.map((ach) => (
              <View key={ach._id} style={styles.achRow}>
                <Ionicons name="trophy" size={20} color={colors.warning} />
                <View style={styles.achInfo}>
                  <Text style={[styles.achTitle, { color: colors.text }]}>{ach.title}</Text>
                  {ach.description && (
                    <Text style={[styles.achDesc, { color: colors.icon }]}>{ach.description}</Text>
                  )}
                </View>
                <Text style={[styles.achDate, { color: colors.icon }]}>
                  {format(new Date(ach.unlockedAt), 'MMM d')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Admin Actions */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Admin Actions</Text>
          <View style={styles.actionsCol}>
            {isSuspended ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.success }]}
                onPress={handleUnsuspend}
                disabled={processing}
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.card} />
                <Text style={styles.actionBtnText}>Restore Account</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.error }]}
                onPress={handleSuspend}
                disabled={processing}
              >
                <Ionicons name="ban" size={20} color={colors.card} />
                <Text style={styles.actionBtnText}>Suspend Account</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.warning }]}
              onPress={handleResetStreak}
              disabled={processing || resetStreak.status === 'pending'}
            >
              {resetStreak.status === 'pending' ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Ionicons name="refresh" size={20} color={colors.card} />
              )}
              <Text style={styles.actionBtnText}>Reset Streak</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Suspend Reason Modal */}
      <Modal visible={showSuspendModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Suspend Account</Text>
            <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
              Enter a reason for suspension (required)
            </Text>
            <TextInput
              style={[styles.reasonInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Suspension reason..."
              placeholderTextColor={colors.icon}
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowSuspendModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.error }]}
                onPress={confirmSuspend}
                disabled={processing}
              >
                <Text style={styles.modalConfirmText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  profileCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  achRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  achInfo: {
    flex: 1,
  },
  achTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  achDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  achDate: {
    fontSize: 11,
  },
  actionsCol: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
