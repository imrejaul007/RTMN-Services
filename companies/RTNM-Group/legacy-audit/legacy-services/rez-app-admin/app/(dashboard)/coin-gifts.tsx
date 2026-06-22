import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { coinGiftsAdminService, CoinGiftItem } from '../../services/api/coinGifts';
import { s } from './styles/coin-gifts.styles';

// ============================================
// TYPES & CONSTANTS
// ============================================
const STATUS_TABS = ['all', 'pending', 'delivered', 'claimed', 'expired', 'cancelled'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
  delivered: { bg: Colors.light.infoLighter, text: '#2563EB' },
  claimed: { bg: Colors.light.successLight, text: Colors.light.successDark },
  expired: { bg: Colors.light.backgroundSecondary, text: Colors.light.mutedDark },
  cancelled: { bg: Colors.light.errorLight, text: Colors.light.errorDark },
};

const COIN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  rez: { bg: '#EDE9FE', text: Colors.light.purpleDark },
  promo: { bg: Colors.light.warningLight, text: Colors.light.warningDark },
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function CoinGiftsAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as keyof typeof Colors];
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const isLoadingMore = useRef(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedGift, setSelectedGift] = useState<CoinGiftItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Refund modal state
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundGift, setRefundGift] = useState<CoinGiftItem | null>(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // BUG-061 FIX: Replaced manual page/hasMore state with useInfiniteQuery.
  const {
    data: pages = [],
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['coin-gifts', selectedStatus, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      return coinGiftsAdminService.getAll(
        pageParam,
        20,
        selectedStatus !== 'all' ? selectedStatus : undefined,
        debouncedSearch.trim() || undefined
      );
    },
    getNextPageParam: (_lastPage: any, allPages: any[]) => {
      const last = allPages[allPages.length - 1];
      const pagination = last?.pagination;
      if (!pagination) return undefined;
      return pagination.page < pagination.totalPages ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const gifts = useMemo(() => {
    const allGifts: CoinGiftItem[] = [];
    for (const page of pages as Array<{gifts?: CoinGiftItem[]}>) {
      if (page?.gifts) allGifts.push(...page.gifts);
    }
    return allGifts;
  }, [pages]);

  const total = useMemo(() => {
    const last = (pages as Array<{pagination?: {total?: number}}>)[pages.length - 1];
    return last?.pagination?.total ?? 0;
  }, [pages]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refetch();
    setRefreshing(false);
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (isLoadingMore.current || !hasNextPage) return;
    isLoadingMore.current = true;
    void fetchNextPage();
    isLoadingMore.current = false;
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 500);
  }, []);

  // ACTIONS
  const handleViewDetail = async (gift: CoinGiftItem) => {
    setSelectedGift(gift);
    setDetailModalVisible(true);
    setDetailLoading(true);
    try {
      const data = await coinGiftsAdminService.getById(gift._id);
      setDetailData(data);
      // Update selectedGift with fresh data from detail endpoint
      if (data?.gift) {
        setSelectedGift((prev) => (prev ? { ...prev, ...data.gift } : prev));
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load gift details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRefund = (gift: CoinGiftItem) => {
    if (gift.status !== 'pending' && gift.status !== 'delivered') {
      showAlert('Error', `Cannot refund gift in '${gift.status}' status`);
      return;
    }
    setRefundGift(gift);
    setRefundReason('');
    setRefundModalVisible(true);
  };

  const handleRefundSubmit = async () => {
    if (!refundGift) return;
    const reason = refundReason.trim();
    if (!reason) {
      showAlert('Error', 'Please provide a reason for the refund.');
      return;
    }
    setRefundSubmitting(true);
    try {
      const result = await coinGiftsAdminService.refund(refundGift._id, reason);
      showAlert('Success', result.message);
      setRefundModalVisible(false);
      void refetch();
      setDetailModalVisible(false);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to refund gift');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleDeliver = (gift: CoinGiftItem) => {
    if (gift.status !== 'pending') {
      showAlert('Error', `Cannot deliver gift in '${gift.status}' status`);
      return;
    }
    showConfirm('Deliver Gift', 'Manually deliver this gift to the recipient?', async () => {
      try {
        const result = await coinGiftsAdminService.deliver(gift._id);
        showAlert('Success', result.message);
        void refetch();
        setDetailModalVisible(false);
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to deliver gift');
      }
    });
  };

  // HELPERS
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserDisplay = (user: CoinGiftItem['sender']) => {
    if (!user) return 'Unknown';
    if (typeof user === 'string') return user;
    return user.fullName || user.phoneNumber || user._id?.slice(-6) || 'Unknown';
  };

  // RENDERERS
  const renderGiftRow = ({ item }: { item: CoinGiftItem }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const coinStyle = COIN_TYPE_COLORS[item.coinType] || COIN_TYPE_COLORS.rez;

    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleViewDetail(item)}
        activeOpacity={0.7}
      >
        <View style={s.cardTopRow}>
          <View style={s.cardLeftCol}>
            <View style={s.userRow}>
              <Ionicons name="person-outline" size={13} color={colors.mutedDark} />
              <Text style={[s.userLabel, { color: colors.mutedDark }]}>From:</Text>
              <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
                {getUserDisplay(item.sender)}
              </Text>
            </View>
            <View style={s.userRow}>
              <Ionicons name="arrow-forward-outline" size={13} color={colors.mutedDark} />
              <Text style={[s.userLabel, { color: colors.mutedDark }]}>To:</Text>
              <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
                {getUserDisplay(item.recipient)}
              </Text>
            </View>
          </View>
          <View style={s.cardRightCol}>
            <Text style={[s.amount, { color: colors.text }]}>{item.amount} NC</Text>
            <View style={[s.coinBadge, { backgroundColor: coinStyle.bg }]}>
              <Text style={[s.coinBadgeText, { color: coinStyle.text }]}>{item.coinType}</Text>
            </View>
          </View>
        </View>
        <View style={s.cardBottomRow}>
          <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[s.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
          <View style={s.deliveryBadge}>
            <Ionicons
              name={item.deliveryType === 'scheduled' ? 'time-outline' : 'flash-outline'}
              size={12}
              color={colors.mutedDark}
            />
            <Text style={s.deliveryText}>{item.deliveryType}</Text>
          </View>
          <Text style={s.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // DETAIL MODAL
  const renderDetailModal = () => (
    <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              setDetailModalVisible(false);
              setDetailData(null);
            }}
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>Gift Details</Text>
          <View style={{ width: 28 }} />
        </View>
        {detailLoading ? (
          <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
        ) : selectedGift ? (
          <ScrollView style={s.detailScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Status */}
            <View style={s.detailSection}>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Status</Text>
                <View
                  style={[
                    s.statusBadge,
                    {
                      backgroundColor: (STATUS_COLORS[selectedGift.status] || STATUS_COLORS.pending)
                        .bg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.statusText,
                      { color: (STATUS_COLORS[selectedGift.status] || STATUS_COLORS.pending).text },
                    ]}
                  >
                    {selectedGift.status}
                  </Text>
                </View>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Amount</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>
                  {selectedGift.amount} NC
                </Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Coin Type</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>
                  {selectedGift.coinType}
                </Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Theme</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>
                  {selectedGift.theme}
                </Text>
              </View>
            </View>

            {/* Sender / Recipient */}
            <View style={s.detailSection}>
              <Text style={s.sectionTitle}>Sender</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {getUserDisplay(selectedGift.sender)}
              </Text>
              {selectedGift.sender?.phoneNumber && (
                <Text style={s.phoneText}>{selectedGift.sender.phoneNumber}</Text>
              )}
            </View>
            <View style={s.detailSection}>
              <Text style={s.sectionTitle}>Recipient</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {getUserDisplay(selectedGift.recipient)}
              </Text>
              {selectedGift.recipient?.phoneNumber && (
                <Text style={s.phoneText}>{selectedGift.recipient.phoneNumber}</Text>
              )}
            </View>

            {/* Delivery */}
            <View style={s.detailSection}>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Delivery Type</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>
                  {selectedGift.deliveryType}
                </Text>
              </View>
              {selectedGift.scheduledAt && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Scheduled At</Text>
                  <Text style={[s.detailValue, { color: colors.text }]}>
                    {formatDateTime(selectedGift.scheduledAt)}
                  </Text>
                </View>
              )}
              {selectedGift.claimedAt && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Claimed At</Text>
                  <Text style={[s.detailValue, { color: colors.text }]}>
                    {formatDateTime(selectedGift.claimedAt)}
                  </Text>
                </View>
              )}
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Expires At</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>
                  {formatDateTime(selectedGift.expiresAt)}
                </Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Created</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>
                  {formatDateTime(selectedGift.createdAt)}
                </Text>
              </View>
            </View>

            {/* Message */}
            {selectedGift.message && (
              <View style={s.detailSection}>
                <Text style={s.sectionTitle}>Message</Text>
                <Text style={[s.messageText, { color: colors.text }]}>
                  {selectedGift.message}
                </Text>
              </View>
            )}

            {/* Transactions */}
            {detailData?.transactions?.length > 0 && (
              <View style={s.detailSection}>
                <Text style={s.sectionTitle}>
                  Transactions ({detailData.transactions.length})
                </Text>
                {detailData.transactions.map((tx: any, i: number) => (
                  <View key={tx._id || i} style={[s.txRow, { borderColor: colors.border }]}>
                    <Text style={[s.txType, { color: colors.text }]}>
                      {tx.type || tx.source}
                    </Text>
                    <Text
                      style={[
                        s.txAmount,
                        { color: tx.amount > 0 ? colors.successDark : colors.errorDark },
                      ]}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount} NC
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={s.detailActions}>
              {(selectedGift.status === 'pending' || selectedGift.status === 'delivered') && (
                <TouchableOpacity
                  style={[s.actionButton, s.refundButton]}
                  onPress={() => handleRefund(selectedGift)}
                >
                  <Ionicons name="return-down-back-outline" size={18} color={colors.card} />
                  <Text style={s.actionButtonText}>Refund</Text>
                </TouchableOpacity>
              )}
              {selectedGift.status === 'pending' && (
                <TouchableOpacity
                  style={[s.actionButton, s.deliverButton]}
                  onPress={() => handleDeliver(selectedGift)}
                >
                  <Ionicons name="send-outline" size={18} color={colors.card} />
                  <Text style={s.actionButtonText}>Deliver</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );

  // MAIN RENDER
  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <Text style={[s.headerTitle, { color: colors.text }]}>Coin Gifts</Text>
        <Text style={[s.headerSubtitle, { color: colors.mutedDark }]}>{total} total</Text>
      </View>

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.card }]}>
        <View style={[s.searchInput, { borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={[s.searchTextInput, { color: colors.text }]}
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search by phone or gift ID..."
            placeholderTextColor={colors.muted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Tabs */}
      <View style={[s.filtersBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.filterChip, selectedStatus === tab && s.filterChipActive]}
              onPress={() => setSelectedStatus(tab)}
            >
              <Text style={[s.chipText, selectedStatus === tab && s.chipTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Gift List */}
      <FlatList
        data={gifts}
        renderItem={renderGiftRow}
        keyExtractor={(item: CoinGiftItem) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator size="small" color={colors.info} style={{ paddingVertical: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : (
            <View style={s.emptyBox}>
              <Ionicons name="gift-outline" size={48} color={colors.gray300} />
              <Text style={s.emptyText}>No coin gifts found</Text>
            </View>
          )
        }
      />

      {renderDetailModal()}

      {/* Refund Reason Modal */}
      <Modal
        visible={refundModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRefundModalVisible(false)}
      >
        <View style={s.refundModalOverlay}>
          <View style={[s.refundModalCard, { backgroundColor: colors.card }]}>
            <View style={s.refundModalHeader}>
              <Text style={[s.refundModalTitle, { color: colors.text }]}>Refund Gift</Text>
              <TouchableOpacity
                onPress={() => setRefundModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.mutedDark} />
              </TouchableOpacity>
            </View>
            {refundGift && (
              <Text style={[s.refundModalSubtitle, { color: colors.mutedDark }]}>
                Refund {refundGift.amount} NC back to {getUserDisplay(refundGift.sender)}
              </Text>
            )}
            <Text style={[s.refundFieldLabel, { color: colors.text }]}>Reason</Text>
            <TextInput
              style={[
                s.refundInput,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="Enter refund reason..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              value={refundReason}
              onChangeText={setRefundReason}
            />
            <View style={s.refundModalActions}>
              <TouchableOpacity
                style={[s.refundCancelBtn, { borderColor: colors.border }]}
                onPress={() => setRefundModalVisible(false)}
                disabled={refundSubmitting}
              >
                <Text style={[s.refundBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.refundConfirmBtn,
                  { backgroundColor: refundSubmitting ? colors.muted : Colors.light.errorDark },
                ]}
                onPress={handleRefundSubmit}
                disabled={refundSubmitting}
              >
                {refundSubmitting ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={[s.refundBtnText, { color: colors.card }]}>Confirm Refund</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES

