import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usersService, User, UserWallet } from '../../services/api/users';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { useDebouncedCallback } from '../../utils/debounce';
import { logger } from '../../utils/logger';
import { withErrorBoundary } from '../../components/ErrorBoundary';

type RoleFilter = 'all' | 'user' | 'merchant' | 'admin';
type StatusFilter = 'all' | 'active' | 'suspended';

function UsersScreenInner() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Sprint 14: inline suspend reason modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userWallet, setUserWallet] = useState<UserWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Sprint 14: Debounce search 500ms to reduce API calls
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
  }, 500);

  const loadData = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!append) setIsLoading(true);
      try {
        setError(null);
        const data = await usersService.getUsers({
          page: pageNum,
          limit: 20,
          role: roleFilter === 'all' ? undefined : roleFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchQuery || undefined,
        });

        if (append) {
          setUsers((prev) => [...prev, ...data.users]);
        } else {
          setUsers(data.users);
        }

        setTotalCount(data.pagination.total ?? 0);
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setPage(pageNum);
      } catch (err: any) {
        logger.error('[UsersScreen] Failed to load users:', err);
        setError(err.message || 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    },
    [roleFilter, statusFilter, searchQuery]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // BUG-001: onRefresh must depend on loadData, not its inputs directly, to avoid stale closures.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, [loadData]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
    setLoadingWallet(true);
    setUserWallet(null);

    try {
      const wallet = await usersService.getUserWallet(user._id);
      setUserWallet(wallet);
    } catch (err: any) {
      logger.error('[UsersScreen] Failed to load wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Sprint 14: open inline reason modal before suspending
  const handleSuspend = useCallback((userId: string) => {
    setSuspendTargetId(userId);
    setSuspendReason('');
    setShowSuspendModal(true);
  }, []);

  const confirmSuspend = useCallback(async () => {
    if (!suspendTargetId) return;
    if (!suspendReason.trim()) {
      showAlert('Required', 'Please enter a reason for suspension');
      return;
    }
    try {
      setProcessingUser(suspendTargetId);
      setShowSuspendModal(false);
      await usersService.setSuspendStatus(suspendTargetId, true, suspendReason.trim());
      showAlert('Success', 'User suspended successfully');
      await loadData(1);
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setProcessingUser(null);
      setSuspendTargetId(null);
    }
  }, [suspendTargetId, suspendReason, loadData]);

  const handleUnsuspend = useCallback(
    (userId: string) => {
      showConfirm(
        'Unsuspend User',
        'Are you sure you want to unsuspend this user? They will regain access to the platform.',
        async () => {
          try {
            setProcessingUser(userId);
            await usersService.setSuspendStatus(userId, false);
            showAlert('Success', 'User unsuspended successfully');
            await loadData(1);
          } catch (err: any) {
            showAlert('Error', err.message);
          } finally {
            setProcessingUser(null);
          }
        },
        'Unsuspend'
      );
    },
    [loadData]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'suspended':
        return colors.error;
      default:
        return colors.icon;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return colors.error;
      case 'merchant':
        return colors.info;
      case 'user':
        return colors.success;
      default:
        return colors.icon;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getUserDisplayName = (user: User): string => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.phoneNumber || user.email || 'Unknown';
  };

  // Normalize backend UPPERCASE referralTier (STARTER/BRONZE/SILVER/GOLD/PLATINUM/DIAMOND)
  // to the canonical lowercase 4-tier used by the frontend.
  const normalizeTier = (tier?: string): string => {
    const map: Record<string, string> = {
      STARTER: 'bronze',
      BRONZE: 'bronze',
      SILVER: 'silver',
      GOLD: 'gold',
      PLATINUM: 'platinum',
      DIAMOND: 'diamond',
      bronze: 'bronze',
      silver: 'silver',
      gold: 'gold',
      platinum: 'platinum',
      diamond: 'diamond',
    };
    return map[tier ?? ''] ?? '';
  };

  const getTierColor = (tier?: string) => {
    switch (normalizeTier(tier)) {
      // F-H7 FIX: diamond is a distinct tier (3x multiplier) — no longer collapsed into platinum
      case 'diamond':
        return '#B9F2FF';
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

  const getInitials = (user: User): string => {
    const name = getUserDisplayName(user);
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {totalCount > 0 && (
        <Text style={[styles.totalCount, { color: colors.icon }]}>
          {totalCount.toLocaleString()} total users
        </Text>
      )}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, email, or phone..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={debouncedSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.icon} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={[styles.filterLabel, { color: colors.icon }]}>Role</Text>
      <View style={styles.statusFilters}>
        {(['all', 'user', 'merchant', 'admin'] as RoleFilter[]).map((role) => (
          <TouchableOpacity
            key={role}
            style={[
              styles.filterChip,
              { backgroundColor: roleFilter === role ? colors.tint : colors.card },
            ]}
            onPress={() => {
              setRoleFilter(role);
              setIsLoading(true);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: roleFilter === role ? colors.card : colors.text },
              ]}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.filterLabel, { color: colors.icon, marginTop: 8 }]}>Status</Text>
      <View style={styles.statusFilters}>
        {(['all', 'active', 'suspended'] as StatusFilter[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              { backgroundColor: statusFilter === status ? colors.tint : colors.card },
            ]}
            onPress={() => {
              setStatusFilter(status);
              setIsLoading(true);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: statusFilter === status ? colors.card : colors.text },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // BUG-039 FIX: wrap renderUserItem in useCallback so FlatList doesn't
  // re-render every row when unrelated state changes in the parent.
  const renderUserItem = useCallback(
    ({ item }: { item: User }) => {
      const userId = item._id;
      const userStatus = item.status ?? 'active';
      // Check all possible suspension indicators returned by different backend routes
      const isSuspended =
        item.isSuspended || userStatus === 'suspended' || item.isActive === false;
      return (
        <View
          style={[
            styles.userCard,
            { backgroundColor: colors.card },
            isSuspended && styles.userCardSuspended,
          ]}
        >
          <View style={styles.userHeader}>
            <View style={[styles.userAvatar, { backgroundColor: `${colors.tint}20` }]}>
              <Text style={[styles.userAvatarText, { color: colors.tint }]}>
                {getInitials(item)}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {getUserDisplayName(item)}
              </Text>
              <View style={styles.badgeRow}>
                <View
                  style={[styles.roleBadge, { backgroundColor: `${getRoleColor(item.role)}20` }]}
                >
                  <Text style={[styles.roleBadgeText, { color: getRoleColor(item.role) }]}>
                    {item.role}
                  </Text>
                </View>
                {isSuspended ? (
                  <View style={[styles.statusBadge, { backgroundColor: colors.errorLight }]}>
                    <Text style={[styles.statusText, { color: colors.errorDark }]}>Suspended</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(userStatus)}20` },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[styles.statusText, { color: getStatusColor(userStatus) }]}
                    >
                      {userStatus}
                    </Text>
                  </View>
                )}
                {item.tier && (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getTierColor(item.tier)}20` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: getTierColor(item.tier) }]}>
                      {(() => {
                        const t = normalizeTier(item.tier);
                        return t.charAt(0).toUpperCase() + t.slice(1);
                      })()}
                    </Text>
                  </View>
                )}
                {item.segment && item.segment !== 'normal' && (
                  <View style={[styles.statusBadge, { backgroundColor: colors.successLight2 }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.greenDark }}>
                      {item.segment === 'verified_student'
                        ? 'Student'
                        : item.segment === 'verified_employee'
                          ? 'Employee'
                          : item.segment.replace('verified_', '')}
                    </Text>
                  </View>
                )}
                {item.isFlagged && (
                  <View style={[styles.statusBadge, { backgroundColor: colors.errorLight }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.errorDark }}>
                      Flagged
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.userDetails}>
            {item.email && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={16} color={colors.icon} />
                <Text style={[styles.detailText, { color: colors.icon }]}>{item.email}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color={colors.icon} />
              <Text style={[styles.detailText, { color: colors.icon }]}>{item.phoneNumber}</Text>
            </View>
            {item.coinBalance !== undefined && (
              <View style={styles.detailRow}>
                <Ionicons name="star-outline" size={16} color={colors.warning} />
                <Text style={[styles.detailText, { color: colors.icon }]}>
                  {item.coinBalance.toLocaleString()} coins
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.icon} />
              <Text style={[styles.detailText, { color: colors.icon }]}>
                Joined {format(new Date(item.createdAt), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.info }]}
              onPress={() => userId && router.push(`/users/${userId}`)}
              disabled={!userId}
            >
              <Ionicons name="eye" size={18} color={colors.card} />
              <Text style={styles.actionButtonText}>View</Text>
            </TouchableOpacity>
            {isSuspended ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={() => userId && handleUnsuspend(userId)}
                disabled={!userId || processingUser === userId}
              >
                {processingUser === userId ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={colors.card} />
                    <Text style={styles.actionButtonText}>Unsuspend</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.mutedDark }]}
                onPress={() => userId && handleSuspend(userId)}
                disabled={!userId || processingUser === userId}
              >
                {processingUser === userId ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <>
                    <Ionicons name="ban" size={18} color={colors.card} />
                    <Text style={styles.actionButtonText}>Suspend</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [colors, processingUser, handleSuspend, handleUnsuspend]
  );

  const renderDetailModal = () => (
    <Modal visible={showDetailModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>User Details</Text>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {selectedUser && (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* User Info Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalUserHeader}>
                  <View style={[styles.modalAvatar, { backgroundColor: colors.errorLight }]}>
                    <Ionicons name="person" size={32} color={colors.tint} />
                  </View>
                  <View style={styles.modalUserInfo}>
                    <Text style={[styles.modalUserName, { color: colors.text }]}>
                      {getUserDisplayName(selectedUser)}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: `${getRoleColor(selectedUser.role)}20` },
                        ]}
                      >
                        <Text
                          style={[styles.roleBadgeText, { color: getRoleColor(selectedUser.role) }]}
                        >
                          {selectedUser.role}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${getStatusColor(selectedUser.status ?? '')}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(selectedUser.status ?? 'active') },
                          ]}
                        >
                          {selectedUser.status ?? 'active'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                  {selectedUser.email && (
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Email</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {selectedUser.email}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={18} color={colors.icon} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: colors.icon }]}>Phone</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {selectedUser.phoneNumber}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.icon} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: colors.icon }]}>Joined</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {format(new Date(selectedUser.createdAt), 'MMMM d, yyyy')}
                      </Text>
                    </View>
                  </View>
                  {selectedUser.lastLogin && (
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Last Login</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {format(new Date(selectedUser.lastLogin), 'MMM d, yyyy h:mm a')}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.icon} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: colors.icon }]}>Verified</Text>
                      <Text
                        style={[
                          styles.infoValue,
                          { color: selectedUser.isVerified ? colors.success : colors.warning },
                        ]}
                      >
                        {selectedUser.isVerified ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Wallet Section */}
              <View style={styles.modalSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Wallet Balance</Text>
                {loadingWallet ? (
                  <View style={styles.walletLoading}>
                    <ActivityIndicator size="small" color={colors.tint} />
                    <Text style={[styles.walletLoadingText, { color: colors.icon }]}>
                      Loading wallet balance…
                    </Text>
                  </View>
                ) : userWallet ? (
                  <View style={[styles.walletCard, { backgroundColor: colors.tint }]}>
                    <View style={styles.walletIcon}>
                      <Ionicons name="wallet" size={28} color={colors.card} />
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletLabel}>Available Balance</Text>
                      <Text style={styles.walletBalance}>
                        {formatCurrency(userWallet.balance.available)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.walletEmpty, { backgroundColor: colors.background }]}>
                    <Ionicons name="wallet-outline" size={24} color={colors.icon} />
                    <Text style={[styles.walletEmptyText, { color: colors.icon }]}>
                      No wallet data available
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowDetailModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading && users.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error && users.length === 0) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            setIsLoading(true);
            loadData(1);
          }}
        >
          <Ionicons name="refresh" size={18} color={colors.card} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderFilters()}

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={{ padding: 16 }} color={colors.tint} />
          ) : !hasMore ? (
            <Text style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>
              No more results
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No users found</Text>
          </View>
        }
      />

      {renderDetailModal()}

      {/* Sprint 14: Suspend reason modal */}
      <Modal visible={showSuspendModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.modalOverlay }}>
          <View style={[styles.suspendModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.suspendModalTitle, { color: colors.text }]}>Suspend User</Text>
            <Text style={[styles.suspendModalSubtitle, { color: colors.icon }]}>
              Provide a reason for suspension (required)
            </Text>
            <TextInput
              style={[
                styles.suspendReasonInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Enter suspension reason..."
              placeholderTextColor={colors.icon}
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <View style={styles.suspendModalButtons}>
              <TouchableOpacity
                style={[styles.suspendCancelBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setShowSuspendModal(false);
                  setSuspendTargetId(null);
                }}
              >
                <Text style={[styles.suspendCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.suspendConfirmBtn, { backgroundColor: colors.error }]}
                onPress={confirmSuspend}
                disabled={processingUser !== null}
              >
                {processingUser !== null ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={styles.suspendConfirmText}>Suspend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  filtersContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
    fontSize: 15,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    marginLeft: 4,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userDetails: {
    marginTop: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.light.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: 450,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalUserInfo: {
    flex: 1,
    marginLeft: 16,
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  walletLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  walletLoadingText: {
    fontSize: 14,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
    marginLeft: 16,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 4,
  },
  walletBalance: {
    color: Colors.light.card,
    fontSize: 24,
    fontWeight: '700',
  },
  walletEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  walletEmptyText: {
    fontSize: 14,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 16,
  },
  // Sprint 14: new styles
  totalCount: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  userCardSuspended: {
    opacity: 0.65,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  suspendModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  suspendModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  suspendModalSubtitle: {
    fontSize: 14,
  },
  suspendReasonInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
  },
  suspendModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  suspendCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  suspendCancelText: {
    fontWeight: '600',
    fontSize: 14,
  },
  suspendConfirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  suspendConfirmText: {
    color: Colors.light.card,
    fontWeight: '700',
    fontSize: 14,
  },
});

// ADM-004: Per-screen ErrorBoundary so a users crash is isolated from the root.
export default withErrorBoundary(UsersScreenInner, { name: 'UsersScreen' });
