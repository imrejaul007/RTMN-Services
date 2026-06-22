import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  coinRewardsService,
  PendingCoinReward,
  CoinRewardStats,
} from '../../services/api/coinRewards';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { isAllowedOpenUrl } from '../../utils/urlValidator';
import { s } from './styles/coin-rewards.styles';

type TabType = 'pending' | 'approved' | 'rejected';

export default function CoinRewardsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as keyof typeof Colors];

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [stats, setStats] = useState<CoinRewardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  // BUG-012: Add error state so the UI can show a retry button on API failure.
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingReward, setProcessingReward] = useState<string | null>(null);
  // M8 FIX: Bulk reject modal
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  // BUG-061 FIX: Replaced manual page/hasMore state with useInfiniteQuery.
  const {
    data: pages = [],
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['coin-rewards', activeTab],
    queryFn: ({ pageParam = 1 }) => {
      return coinRewardsService.getRewards(pageParam, 20, activeTab);
    },
    getNextPageParam: (_lastPage: any, allPages: any[]) => {
      const last = allPages[allPages.length - 1];
      const pagination = last?.pagination;
      if (!pagination) return undefined;
      return pagination.page < pagination.totalPages ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const rewards = useMemo(() => {
    const allRewards: PendingCoinReward[] = [];
    for (const page of pages as Array<{rewards?: PendingCoinReward[]}>) {
      if (page?.rewards) allRewards.push(...page.rewards);
    }
    return allRewards;
  }, [pages]);

  const hasMore = hasNextPage ?? false;

  const loadStats = useCallback(async () => {
    try {
      const data = await coinRewardsService.getStats();
      setStats(data);
    } catch (error) {
      logger.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), refetch()]);
    setRefreshing(false);
  }, [loadStats, refetch]);

  const loadMore = useCallback(() => {
    if (isLoadingMore.current || !hasNextPage) return;
    isLoadingMore.current = true;
    void fetchNextPage();
    isLoadingMore.current = false;
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleApprove = async (rewardId: string) => {
    showConfirm(
      'Approve Reward',
      'Are you sure you want to approve this reward and credit coins to the user?',
      async () => {
        try {
          setProcessingReward(rewardId);
          await coinRewardsService.approveReward(rewardId);
          showAlert('Success', 'Reward approved and coins credited');
          await refetch();
          await loadStats();
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingReward(null);
        }
      },
      'Approve'
    );
  };

  const handleReject = async (rewardId: string) => {
    if (!rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }
    try {
      setProcessingReward(rewardId);
      await coinRewardsService.rejectReward(rewardId, rejectReason);
      showAlert('Success', 'Reward rejected');
      setShowRejectModal(false);
      setRejectReason('');
      await refetch();
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingReward(null);
    }
  };

  // M7 FIX: Use bulkApprove endpoint instead of looping individual approvals
  const handleBulkApprove = async () => {
    if (selectedRewards.length === 0) return;

    showConfirm(
      'Bulk Approve',
      `Approve ${selectedRewards.length} rewards?`,
      async () => {
        try {
          const result = await coinRewardsService.bulkApprove(selectedRewards);
          showAlert('Success', `${result.processed} rewards approved successfully.`);
        } catch (error: any) {
          showAlert('Error', error.message || 'Bulk approve failed');
        } finally {
          setSelectedRewards([]);
          setIsSelectionMode(false);
          await refetch();
          await loadStats();
        }
      },
      'Approve All'
    );
  };

  // M8 FIX: Bulk reject using the existing bulkReject endpoint
  const handleBulkReject = async () => {
    if (!bulkRejectReason.trim()) {
      showAlert('Required', 'Please enter a rejection reason');
      return;
    }
    try {
      const result = await coinRewardsService.bulkReject(selectedRewards, bulkRejectReason.trim());
      showAlert('Success', `${result.processed} rewards rejected.`);
    } catch (error: any) {
      showAlert('Error', error.message || 'Bulk reject failed');
    } finally {
      setBulkRejectReason('');
      setShowBulkRejectModal(false);
      setSelectedRewards([]);
      setIsSelectionMode(false);
      await refetch();
      await loadStats();
    }
  };

  const toggleSelection = (rewardId: string) => {
    setSelectedRewards((prev) =>
      prev.includes(rewardId) ? prev.filter((id) => id !== rewardId) : [...prev, rewardId]
    );
  };

  const getSourceIcon = (source: string): keyof typeof Ionicons.glyphMap => {
    switch (source) {
      case 'purchase_bonus':
        return 'cart';
      case 'social_media_post':
        return 'share-social';
      case 'review_bonus':
        return 'star';
      case 'referral_bonus':
        return 'people';
      default:
        return 'share-social';
    }
  };

  const getSourceLabel = (item: PendingCoinReward): string => {
    const platform = item.platform
      ? item.platform.charAt(0).toUpperCase() + item.platform.slice(1)
      : '';
    if (item.posterTitle && item.posterTitle !== 'Promotional Poster') {
      return `${platform} — ${item.posterTitle}`;
    }
    return platform ? `${platform} Share` : 'Social Media Post';
  };

  const renderStatsCard = () => (
    <View style={s.statsContainer}>
      <View style={[s.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[s.statsValue, { color: colors.text }]}>{stats?.pending || 0}</Text>
        <Text style={[s.statsLabel, { color: colors.icon }]}>Pending</Text>
      </View>
      <View style={[s.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[s.statsValue, { color: colors.success }]}>{stats?.approved || 0}</Text>
        <Text style={[s.statsLabel, { color: colors.icon }]}>Approved</Text>
      </View>
      <View style={[s.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[s.statsValue, { color: colors.error }]}>{stats?.rejected || 0}</Text>
        <Text style={[s.statsLabel, { color: colors.icon }]}>Rejected</Text>
      </View>
      <View style={[s.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[s.statsValue, { color: colors.warning }]}>
          {stats?.totalCoinsPending || 0}
        </Text>
        <Text style={[s.statsLabel, { color: colors.icon }]}>Coins Pending</Text>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={s.tabsContainer}>
      {(['pending', 'approved', 'rejected'] as TabType[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[s.tab, activeTab === tab && { backgroundColor: colors.tint }]}
          onPress={() => {
            setActiveTab(tab);
          }}
        >
          <Text style={[s.tabText, { color: activeTab === tab ? colors.card : colors.icon }]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRewardItem = ({ item }: { item: PendingCoinReward }) => {
    const userName = item.user?.profile
      ? `${item.user.profile.firstName || ''} ${item.user.profile.lastName || ''}`.trim()
      : item.user?.phoneNumber || 'Unknown User';

    return (
      <TouchableOpacity
        style={[s.rewardCard, { backgroundColor: colors.card }]}
        onPress={() => isSelectionMode && toggleSelection(item._id)}
        onLongPress={() => {
          setIsSelectionMode(true);
          toggleSelection(item._id);
        }}
      >
        {isSelectionMode && (
          <TouchableOpacity style={s.checkbox} onPress={() => toggleSelection(item._id)}>
            <Ionicons
              name={selectedRewards.includes(item._id) ? 'checkbox' : 'square-outline'}
              size={24}
              color={selectedRewards.includes(item._id) ? colors.tint : colors.icon}
            />
          </TouchableOpacity>
        )}

        <View style={s.rewardHeader}>
          <View style={[s.sourceIcon, { backgroundColor: `${colors.tint}20` }]}>
            <Ionicons name={getSourceIcon(item.source)} size={20} color={colors.tint} />
          </View>
          <View style={s.rewardInfo}>
            <Text style={[s.userName, { color: colors.text }]}>{userName}</Text>
            <Text style={[s.sourceLabel, { color: colors.icon }]}>{getSourceLabel(item)}</Text>
          </View>
          <View style={s.coinBadge}>
            <Ionicons name="sparkles" size={14} color={colors.warning} />
            <Text style={s.coinAmount}>{item.amount}</Text>
          </View>
        </View>

        {item.postUrl ? (
          <TouchableOpacity
            style={s.rewardDetails}
            onPress={() => {
              // Linking.openURL works on iOS, Android, and web — window.open was
              // web-only and crashed native builds.
              if (item.postUrl && isAllowedOpenUrl(item.postUrl)) {
                Linking.openURL(item.postUrl).catch((err: unknown) =>
                  logger.error('Failed to open reward URL:', err)
                );
              } else {
                showAlert('Error', 'Invalid reward URL');
              }
            }}
          >
            <Text style={[s.detailText, { color: colors.info }]} numberOfLines={1}>
              {item.postUrl}
            </Text>
            <Ionicons name="open-outline" size={14} color={colors.info} />
          </TouchableOpacity>
        ) : (
          <View style={s.rewardDetails}>
            <Text style={[s.detailText, { color: colors.icon }]}>No URL</Text>
          </View>
        )}
        <View style={[s.rewardDetails, { borderTopWidth: 0, marginTop: 4, paddingTop: 0 }]}>
          <Text style={[s.dateText, { color: colors.icon }]}>
            {format(new Date(item.submittedAt), 'MMM d, yyyy h:mm a')}
          </Text>
        </View>

        {activeTab === 'pending' && !isSelectionMode && (
          <View style={s.actionButtons}>
            <TouchableOpacity
              style={[s.actionButton, s.approveButton]}
              onPress={() => handleApprove(item._id)}
              disabled={processingReward === item._id}
            >
              {processingReward === item._id ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={colors.card} />
                  <Text style={s.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionButton, s.rejectButton]}
              onPress={() => {
                setProcessingReward(item._id);
                setShowRejectModal(true);
              }}
              disabled={processingReward === item._id}
            >
              <Ionicons name="close" size={18} color={colors.card} />
              <Text style={s.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'rejected' && item.rejectionReason && (
          <View style={[s.rejectionReason, { backgroundColor: colors.errorLight }]}>
            <Text style={{ color: colors.errorDark, fontSize: 12 }}>
              Reason: {item.rejectionReason}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && rewards.length === 0) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // BUG-012: Show error UI with retry button when the API call fails.
  if (error && rewards.length === 0) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ color: colors.error, marginTop: 12, fontSize: 16, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          style={{
            marginTop: 16,
            paddingHorizontal: 24,
            paddingVertical: 10,
            backgroundColor: colors.tint,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {renderStatsCard()}
      {renderTabs()}

      {isSelectionMode && activeTab === 'pending' && (
        <View style={[s.bulkActions, { backgroundColor: colors.card }]}>
          <Text style={[s.selectedCount, { color: colors.text }]}>
            {selectedRewards.length} selected
          </Text>
          <TouchableOpacity
            style={[s.bulkButton, { backgroundColor: colors.success }]}
            onPress={handleBulkApprove}
          >
            <Text style={s.bulkButtonText}>Approve All</Text>
          </TouchableOpacity>
          {/* M8 FIX: Bulk reject button */}
          <TouchableOpacity
            style={[s.bulkButton, { backgroundColor: colors.error }]}
            onPress={() => {
              setBulkRejectReason('');
              setShowBulkRejectModal(true);
            }}
          >
            <Text style={s.bulkButtonText}>Reject All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.bulkButton, { backgroundColor: colors.icon }]}
            onPress={() => {
              setIsSelectionMode(false);
              setSelectedRewards([]);
            }}
          >
            <Text style={s.bulkButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={rewards}
        renderItem={renderRewardItem}
        keyExtractor={(item: PendingCoinReward) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          // M9 FIX: only show spinner when actively loading more, not just because hasMore=true
          isLoading && hasMore ? (
            <ActivityIndicator style={{ padding: 20 }} color={colors.tint} />
          ) : null
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="gift-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>No {activeTab} rewards</Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Reject Reward</Text>
            <TextInput
              style={[s.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.icon}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setProcessingReward(null);
                }}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, { backgroundColor: colors.error }]}
                onPress={() => processingReward && handleReject(processingReward)}
              >
                <Text style={[s.modalButtonText, { color: colors.card }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* M8 FIX: Bulk Reject Modal */}
      <Modal visible={showBulkRejectModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              Reject {selectedRewards.length} Rewards
            </Text>
            <TextInput
              style={[s.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.icon}
              value={bulkRejectReason}
              onChangeText={setBulkRejectReason}
              multiline
              maxLength={500}
            />
            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowBulkRejectModal(false)}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, { backgroundColor: colors.error }]}
                onPress={handleBulkReject}
              >
                <Text style={[s.modalButtonText, { color: colors.card }]}>Reject All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

