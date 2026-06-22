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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offerCommentsService, PendingComment } from '../../services/api/offerComments';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert } from '../../utils/alert';
import { logger } from '../../utils/logger';
import { s } from './styles/offer-comments.styles';

export default function OfferCommentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [comments, setComments] = useState<PendingComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Expanded comment
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await offerCommentsService.getPendingComments(pageNum, 20);

      if (append) {
        setComments((prev) => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      logger.error('[OfferComments] Failed to load comments:', error);
      showAlert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleApprove = async (commentId: string) => {
    try {
      setProcessingId(commentId);
      await offerCommentsService.moderateComment(commentId, 'approve');
      showAlert('Success', 'Comment approved and coins credited');
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTargetId || !rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }
    try {
      setProcessingId(rejectTargetId);
      await offerCommentsService.moderateComment(rejectTargetId, 'reject', rejectReason);
      showAlert('Success', 'Comment rejected');
      setComments((prev) => prev.filter((c) => c.id !== rejectTargetId));
      setShowRejectModal(false);
      setRejectReason('');
      setRejectTargetId(null);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getQualityBadge = (score: number) => {
    if (score >= 3) return { label: 'High', color: colors.success };
    if (score >= 2) return { label: 'Medium', color: colors.warning };
    return { label: 'Low', color: colors.error };
  };

  const renderCommentCard = ({ item }: { item: PendingComment }) => {
    const quality = getQualityBadge(item.qualityScore);
    const isExpanded = expandedId === item.id;

    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={[s.avatar, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.warningDark} />
          </View>
          <View style={s.cardInfo}>
            <Text style={[s.userName, { color: colors.text }]}>
              {item.user?.name || 'Unknown User'}
            </Text>
            <Text style={[s.subtitle, { color: colors.icon }]} numberOfLines={1}>
              on: {item.offer?.title || 'Unknown Offer'}
            </Text>
          </View>
          <View style={[s.qualityBadge, { backgroundColor: `${quality.color}20` }]}>
            <Text style={{ color: quality.color, fontSize: 10, fontWeight: '600' }}>
              Q: {quality.label}
            </Text>
          </View>
        </View>

        {/* Comment text */}
        <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)}>
          <Text
            style={[s.commentText, { color: colors.text }]}
            numberOfLines={isExpanded ? undefined : 3}
          >
            {item.text}
          </Text>
          {item.text.length > 120 && (
            <Text style={[s.expandText, { color: colors.tint }]}>
              {isExpanded ? 'Show less' : 'Show more'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Meta */}
        <View style={[s.metaRow, { borderTopColor: colors.border }]}>
          <Text style={[s.metaText, { color: colors.icon }]}>{item.text.length} chars</Text>
          <Text style={[s.metaText, { color: colors.icon }]}>
            {format(new Date(item.createdAt), 'MMM d, h:mm a')}
          </Text>
        </View>

        {/* Actions */}
        <View style={s.actionButtons}>
          <TouchableOpacity
            style={[s.actionButton, s.approveButton, { backgroundColor: colors.success }]}
            onPress={() => handleApprove(item.id)}
            disabled={processingId === item.id}
          >
            {processingId === item.id ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.card} />
                <Text style={[s.actionButtonText, { color: colors.card }]}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionButton, s.rejectButton, { backgroundColor: colors.error }]}
            onPress={() => {
              setRejectTargetId(item.id);
              setShowRejectModal(true);
            }}
            disabled={processingId === item.id}
          >
            <Ionicons name="close" size={18} color={colors.card} />
            <Text style={[s.actionButtonText, { color: colors.card }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && comments.length === 0) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card }]}>
        <Ionicons name="chatbubble-ellipses" size={24} color={colors.warningDark} />
        <Text style={[s.headerTitle, { color: colors.text }]}>Offer Comment Moderation</Text>
        <View style={[s.countBadge, { backgroundColor: colors.warningLight }]}>
          <Text style={[s.countText, { color: colors.warningDark }]}>
            {comments.length} pending
          </Text>
        </View>
      </View>

      <FlatList
        data={comments}
        renderItem={renderCommentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && comments.length > 0 ? (
            <ActivityIndicator style={{ padding: 20 }} color={colors.tint} />
          ) : null
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>
              No comments pending review
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Reject Comment</Text>
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
                  setRejectTargetId(null);
                }}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, { backgroundColor: colors.error }]}
                onPress={handleReject}
              >
                <Text style={[s.modalButtonText, { color: colors.card }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

