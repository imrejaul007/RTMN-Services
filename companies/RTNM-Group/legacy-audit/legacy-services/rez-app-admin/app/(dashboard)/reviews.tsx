import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  useColorScheme,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { reviewsAdminService } from '../../services/api/reviews';
import { apiClient } from '../../services/api/apiClient';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/reviews.styles';

// ============================================
// TYPES
// ============================================

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type FilterStatus = ReviewStatus | 'all';

interface AdminReview {
  _id: string;
  storeId: string;
  storeName: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: ReviewStatus;
}

interface ReviewsResponse {
  reviews: AdminReview[];
  total: number;
  pending: number;
}

// ============================================
// CONSTANTS
// ============================================

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ color: i <= rating ? '#F59E0B' : '#D1D5DB', fontSize: 14 }}>
          ★
        </Text>
      ))}
      <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 4 }}>{rating}/5</Text>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ReviewsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminReview | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const loadData = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (!append) setLoading(true);

        const status = activeFilter === 'all' ? '' : activeFilter;
        const { reviews: items } = await reviewsAdminService.getReviews(pageNum, 20, status);

        const mapped: AdminReview[] = items.map((r) => ({
          _id: r._id,
          storeId: r.store?._id ?? '',
          storeName: r.store?.name ?? 'Unknown Store',
          userId: r.user?._id ?? '',
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          status: r.moderationStatus,
        }));

        if (!append) {
          setReviews(mapped);
        } else {
          setReviews((prev) => [...prev, ...mapped]);
        }

        setHasMore(mapped.length === 20);
        setPage(pageNum);

        // Refresh pending count from stats
        try {
          const stats = await reviewsAdminService.getStats();
          setPendingCount(stats.pending);
        } catch {
          if (activeFilter === 'pending') setPendingCount(mapped.length);
        }
      } catch {
        showAlert('Error', 'Failed to load reviews');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFilter]
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(1);
  }, [loadData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = useCallback(
    (review: AdminReview) => {
      showConfirm(
        'Approve Review?',
        `Approve this ${review.rating}-star review for ${review.storeName}?`,
        async () => {
          setProcessingId(review._id);
          try {
            await reviewsAdminService.approveReview(review._id);
            showAlert('Success', 'Review approved');
            loadData(1);
          } catch {
            showAlert('Error', 'Failed to approve review');
          } finally {
            setProcessingId(null);
          }
        },
        'Approve'
      );
    },
    [loadData]
  );

  const handleRejectOpen = useCallback((review: AdminReview) => {
    setRejectTarget(review);
    setRejectReason('');
    setShowRejectModal(true);
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectTarget) return;
    setShowRejectModal(false);
    setProcessingId(rejectTarget._id);
    try {
      await reviewsAdminService.rejectReview(rejectTarget._id, rejectReason.trim());
      showAlert('Success', 'Review rejected');
      loadData(1);
    } catch {
      showAlert('Error', 'Failed to reject review');
    } finally {
      setProcessingId(null);
      setRejectTarget(null);
      setRejectReason('');
    }
  }, [rejectTarget, rejectReason, loadData]);

  const handleBulkApproveAll = useCallback(() => {
    const count = pendingCount || reviews.filter((r) => r.status === 'pending').length;
    if (count === 0) {
      showAlert('Info', 'No pending reviews to approve');
      return;
    }
    showConfirm(
      'Approve All Pending?',
      `This will approve ${count} pending review${count !== 1 ? 's' : ''}. Continue?`,
      async () => {
        setBulkApproving(true);
        try {
          await apiClient.post('admin/reviews/bulk-approve', { status: 'approved' });
          showAlert('Success', `All pending reviews approved`);
          loadData(1);
        } catch {
          showAlert('Error', 'Failed to bulk approve reviews');
        } finally {
          setBulkApproving(false);
        }
      },
      'Approve All'
    );
  }, [pendingCount, reviews, loadData]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderReview = useCallback(
    ({ item }: { item: AdminReview }) => {
      const isProcessing = processingId === item._id;

      return (
        <View style={[s.card, { backgroundColor: colors.card }]}>
          {/* Rating + Date row */}
          <View style={s.rowBetween}>
            <StarRating rating={item.rating} />
            <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>
              {formatDate(item.createdAt)}
            </Text>
          </View>

          {/* Store name */}
          <Text style={[s.storeName, { color: colors.tint }]}>{item.storeName}</Text>

          {/* Comment */}
          <Text style={[s.comment, { color: colors.text }]} numberOfLines={4}>
            {item.comment}
          </Text>

          {/* Status badge */}
          <View
            style={[
              s.badge,
              {
                backgroundColor:
                  item.status === 'pending'
                    ? '#FEF9C3'
                    : item.status === 'approved'
                      ? '#DCFCE7'
                      : '#FEE2E2',
              },
            ]}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color:
                  item.status === 'pending'
                    ? '#92400E'
                    : item.status === 'approved'
                      ? '#166534'
                      : '#991B1B',
              }}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>

          {/* Action buttons */}
          {item.status === 'pending' && (
            <View style={s.actionRow}>
              <TouchableOpacity
                onPress={() => handleApprove(item)}
                disabled={isProcessing}
                style={[s.actionBtn, { backgroundColor: '#22c55e' }]}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.actionBtnText}>Approve</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRejectOpen(item)}
                disabled={isProcessing}
                style={[s.actionBtn, { backgroundColor: '#ef4444' }]}
              >
                <Text style={s.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === 'approved' && (
            <TouchableOpacity
              onPress={() => handleRejectOpen(item)}
              disabled={isProcessing}
              style={[s.actionBtn, { backgroundColor: '#ef4444', marginTop: 10 }]}
            >
              <Text style={s.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [colors, processingId, handleApprove, handleRejectOpen]
  );

  const pendingLabel = pendingCount > 0 ? ` (${pendingCount})` : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Review Moderation</Text>
        <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginTop: 2 }}>
          {pendingCount} pending review{pendingCount !== 1 ? 's' : ''}
        </Text>

        {/* Bulk Approve button — only visible on pending tab */}
        {activeFilter === 'pending' && (
          <TouchableOpacity
            onPress={handleBulkApproveAll}
            disabled={bulkApproving || pendingCount === 0}
            style={[
              s.bulkBtn,
              { backgroundColor: pendingCount === 0 ? colors.gray300 : '#22c55e' },
            ]}
          >
            {bulkApproving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={15} color="#fff" />
                <Text style={s.bulkBtnText}>Approve All Pending</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12, marginBottom: 4 }}
        >
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FILTER_TABS.map((tab) => {
              const label =
                tab.key === 'pending' && pendingCount > 0 ? `Pending${pendingLabel}` : tab.label;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  style={[
                    s.pill,
                    {
                      backgroundColor: activeFilter === tab.key ? colors.tint : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: activeFilter === tab.key ? '#fff' : colors.text,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* List */}
      {loading && reviews.length === 0 ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          renderItem={renderReview}
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          onEndReached={() => hasMore && !loading && loadData(page + 1, true)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading && reviews.length > 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} />
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="star-outline" size={48} color={colors.tabIconDefault} />
              <Text style={{ color: colors.tabIconDefault, marginTop: 12, textAlign: 'center' }}>
                No {activeFilter === 'all' ? '' : activeFilter + ' '}reviews found
              </Text>
            </View>
          }
        />
      )}

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Reject Review</Text>
            <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginBottom: 10 }}>
              Reason (optional, internal only):
            </Text>
            <TextInput
              style={[s.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Spam / Fake / Inappropriate..."
              placeholderTextColor={colors.tabIconDefault}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                style={[
                  s.modalBtn,
                  { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRejectConfirm}
                style={[s.modalBtn, { backgroundColor: '#ef4444' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

