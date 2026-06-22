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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { photoModerationService, PhotoUploadItem } from '../../services/api/photoModeration';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/photo-moderation.styles';

export default function PhotoModerationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [photos, setPhotos] = useState<PhotoUploadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [totalPending, setTotalPending] = useState(0);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Photo preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState<PhotoUploadItem['photos']>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const loadData = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await photoModerationService.getPendingPhotos(pageNum, 20);

      if (append) {
        setPhotos((prev) => {
          const merged = [...prev, ...data.photos];
          const seen = new Set<string>();
          return merged.filter((p) => {
            if (seen.has(p._id)) return false;
            seen.add(p._id);
            return true;
          });
        });
      } else {
        setPhotos(data.photos);
      }

      setTotalPending(data.pagination.total);
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      logger.error('Failed to load photos:', error);
      showAlert('Error', error?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData(1);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  }, [isLoading, hasMore, page, loadData]);

  const handleApprove = (photoId: string) => {
    showConfirm('Approve Photo', 'This will credit coins to the user. Continue?', async () => {
      try {
        setProcessingId(photoId);
        await photoModerationService.moderatePhoto(photoId, 'approve');
        showAlert('Success', 'Photo approved and coins credited');
        setPhotos((prev) => prev.filter((p) => p._id !== photoId));
        setTotalPending((prev) => Math.max(0, prev - 1));
      } catch (error: any) {
        showAlert('Error', error?.message || 'An unexpected error occurred');
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleReject = async () => {
    if (!rejectTargetId || !rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }
    try {
      setProcessingId(rejectTargetId);
      await photoModerationService.moderatePhoto(rejectTargetId, 'reject', rejectReason);
      showAlert('Success', 'Photo rejected');
      setPhotos((prev) => prev.filter((p) => p._id !== rejectTargetId));
      setTotalPending((prev) => Math.max(0, prev - 1));
      setShowRejectModal(false);
      setRejectReason('');
      setRejectTargetId(null);
    } catch (error: any) {
      showAlert('Error', error?.message || 'An unexpected error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const openPreview = (item: PhotoUploadItem) => {
    setPreviewPhotos(item.photos || []);
    setPreviewIndex(0);
    setShowPreviewModal(true);
  };

  const getUserName = (item: PhotoUploadItem) => {
    const u = item.user;
    if (!u) return 'Unknown User';
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown User';
  };

  const renderPhotoCard = useCallback(
    ({ item }: { item: PhotoUploadItem }) => {
      const photoList = item.photos || [];
      return (
        <View style={[s.card, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={s.cardHeader}>
            <View style={[s.avatar, { backgroundColor: `${colors.tint}20` }]}>
              <Ionicons name="camera" size={20} color={colors.tint} />
            </View>
            <View style={s.cardInfo}>
              <Text style={[s.userName, { color: colors.text }]}>{getUserName(item)}</Text>
              <Text style={[s.subtitle, { color: colors.icon }]}>
                {(item.contentType || 'photo').replace('_', ' ')} &middot; {photoList.length} photo
                {photoList.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={[s.dateText, { color: colors.icon }]}>
              {item.createdAt ? format(new Date(item.createdAt), 'MMM d, h:mm a') : 'Unknown date'}
            </Text>
          </View>

          {/* Caption */}
          {item.caption && (
            <Text style={[s.caption, { color: colors.text }]} numberOfLines={2}>
              {item.caption}
            </Text>
          )}

          {/* Store */}
          {item.store && (
            <View style={s.storeRow}>
              <Ionicons name="storefront-outline" size={14} color={colors.icon} />
              <Text style={[s.storeText, { color: colors.icon }]}>{item.store.name}</Text>
            </View>
          )}

          {/* Photo thumbnails */}
          <TouchableOpacity style={s.photoGrid} onPress={() => openPreview(item)}>
            {photoList.slice(0, 4).map((photo, idx) => (
              <View key={idx} style={s.thumbnailWrapper}>
                <Image source={{ uri: photo.url }} style={s.thumbnail} resizeMode="cover" />
                {idx === 3 && photoList.length > 4 && (
                  <View style={s.moreOverlay}>
                    <Text style={s.moreText}>+{photoList.length - 4}</Text>
                  </View>
                )}
              </View>
            ))}
          </TouchableOpacity>

          {/* Actions */}
          <View style={s.actionButtons}>
            <TouchableOpacity
              style={[s.actionButton, s.approveButton]}
              onPress={() => handleApprove(item._id)}
              disabled={processingId === item._id}
            >
              {processingId === item._id ? (
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
                setRejectTargetId(item._id);
                setShowRejectModal(true);
              }}
              disabled={processingId === item._id}
            >
              <Ionicons name="close" size={18} color={colors.card} />
              <Text style={s.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [colors, processingId, openPreview, handleApprove, getUserName]
  );

  if (isLoading && photos.length === 0) {
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
        <Ionicons name="camera" size={24} color={colors.tint} />
        <Text style={[s.headerTitle, { color: colors.text }]}>Photo Moderation</Text>
        <View style={[s.countBadge, { backgroundColor: `${colors.tint}20` }]}>
          <Text style={[s.countText, { color: colors.tint }]}>{totalPending} pending</Text>
        </View>
      </View>

      <FlatList
        data={photos}
        renderItem={renderPhotoCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && !isLoading && photos.length > 0 ? (
            <ActivityIndicator style={{ padding: 20 }} color={colors.tint} />
          ) : null
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>No photos pending review</Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Reject Photo</Text>
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

      {/* Photo Preview Modal */}
      <Modal visible={showPreviewModal} transparent animationType="fade">
        <View style={s.previewOverlay}>
          <TouchableOpacity style={s.previewClose} onPress={() => setShowPreviewModal(false)}>
            <Ionicons name="close" size={28} color={colors.card} />
          </TouchableOpacity>
          {previewPhotos.length > 0 && (
            <Image
              source={{ uri: previewPhotos[previewIndex]?.url }}
              style={s.previewImage}
              resizeMode="contain"
            />
          )}
          {previewPhotos.length > 1 && (
            <View style={s.previewNav}>
              <TouchableOpacity
                style={[s.previewNavBtn, previewIndex === 0 && { opacity: 0.3 }]}
                onPress={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                disabled={previewIndex === 0}
              >
                <Ionicons name="chevron-back" size={24} color={colors.card} />
              </TouchableOpacity>
              <Text style={s.previewCounter}>
                {previewIndex + 1} / {previewPhotos.length}
              </Text>
              <TouchableOpacity
                style={[
                  s.previewNavBtn,
                  previewIndex === previewPhotos.length - 1 && { opacity: 0.3 },
                ]}
                onPress={() =>
                  setPreviewIndex(Math.min(previewPhotos.length - 1, previewIndex + 1))
                }
                disabled={previewIndex === previewPhotos.length - 1}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.card} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

