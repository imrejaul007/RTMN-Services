import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ugcModerationService } from '../../services/api/ugcModeration';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert } from '../../utils/alert';
import { isAllowedOpenUrl } from '../../utils/urlValidator';
import { s } from './styles/ugc-moderation.styles';

interface PendingReel {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  creator: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  store: {
    id: string;
    name: string;
    logo?: string;
  } | null;
  tags: string[];
  createdAt: string;
}

export default function UgcModerationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [reels, setReels] = useState<PendingReel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Video preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadData = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await ugcModerationService.getPendingReels(pageNum, 20);

      if (append) {
        setReels((prev) => [...prev, ...(data.reels as unknown as PendingReel[])]);
      } else {
        setReels((data.reels as unknown as PendingReel[]));
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      logger.error('Failed to load reels:', error);
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

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  }, [isLoading, hasMore, page, loadData]);

  const handleApprove = async (reelId: string) => {
    try {
      setProcessingId(reelId);
      await ugcModerationService.moderateReel(reelId, 'approve');
      showAlert('Success', 'Reel approved, published, and coins credited');
      setReels((prev) => prev.filter((r) => r.id !== reelId));
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
      await ugcModerationService.moderateReel(rejectTargetId, 'reject', rejectReason);
      showAlert('Success', 'Reel rejected');
      setReels((prev) => prev.filter((r) => r.id !== rejectTargetId));
      setShowRejectModal(false);
      setRejectReason('');
      setRejectTargetId(null);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderReelCard = useCallback(
    ({ item }: { item: PendingReel }) => (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        {/* Thumbnail + play */}
        <TouchableOpacity
          style={s.thumbnailContainer}
          onPress={() => {
            if (isAllowedOpenUrl(item.videoUrl)) {
              Linking.openURL(item.videoUrl);
            } else {
              showAlert('Error', 'Invalid video URL');
            }
          }}
        >
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={s.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.thumbnail, { backgroundColor: colors.gray800 }]}>
              <Ionicons name="videocam" size={32} color={colors.mutedDark} />
            </View>
          )}
          <View style={s.playOverlay}>
            <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={s.durationBadge}>
            <Text style={s.durationText}>{formatDuration(item.duration)}</Text>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={s.reelInfo}>
          <Text style={[s.reelTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          {item.description && (
            <Text style={[s.reelDescription, { color: colors.icon }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="person-outline" size={13} color={colors.icon} />
              <Text style={[s.metaText, { color: colors.icon }]}>
                {item.creator?.name || 'Unknown'}
              </Text>
            </View>
            {item.store && (
              <View style={s.metaItem}>
                <Ionicons name="storefront-outline" size={13} color={colors.icon} />
                <Text style={[s.metaText, { color: colors.icon }]}>{item.store.name}</Text>
              </View>
            )}
            <Text style={[s.metaText, { color: colors.icon }]}>
              {format(new Date(item.createdAt), 'MMM d, h:mm a')}
            </Text>
          </View>

          {item.tags?.length > 0 && (
            <View style={s.tagsRow}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={[s.tag, { backgroundColor: `${colors.tint}15` }]}>
                  <Text style={{ color: colors.tint, fontSize: 10 }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={s.actionButtons}>
          <TouchableOpacity
            style={[s.actionButton, s.approveButton]}
            onPress={() => handleApprove(item.id)}
            disabled={processingId === item.id}
          >
            {processingId === item.id ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.card} />
                <Text style={s.actionButtonText}>Approve & Publish</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionButton, s.rejectButton]}
            onPress={() => {
              setRejectTargetId(item.id);
              setShowRejectModal(true);
            }}
            disabled={processingId === item.id}
          >
            <Ionicons name="close" size={18} color={colors.card} />
            <Text style={s.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [colors, processingId, handleApprove, setRejectTargetId, setShowRejectModal]
  );

  if (isLoading && reels.length === 0) {
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
        <Ionicons name="videocam" size={24} color={colors.error} />
        <Text style={[s.headerTitle, { color: colors.text }]}>UGC Reel Moderation</Text>
        <View style={[s.countBadge, { backgroundColor: colors.errorLight }]}>
          <Text style={[s.countText, { color: colors.error }]}>{reels.length} pending</Text>
        </View>
      </View>

      <FlatList
        data={reels}
        renderItem={renderReelCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? <ActivityIndicator style={{ padding: 20 }} color={colors.tint} /> : null
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>No reels pending review</Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Reject Reel</Text>
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

