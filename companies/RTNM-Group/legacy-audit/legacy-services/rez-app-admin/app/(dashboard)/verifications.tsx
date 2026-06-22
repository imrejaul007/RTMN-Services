import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import {
  zoneVerificationsService,
  ZoneVerification,
  VerificationStats,
  VerificationType,
  UserInfo,
} from '../../services/api/zoneVerifications';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { usersService } from '../../services/api/users';
import { s } from './styles/verifications.styles';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type TypeFilter = 'all' | VerificationType;

const VERIFICATION_TYPES: { value: TypeFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All Types', icon: 'layers-outline' },
  { value: 'student', label: 'Student', icon: 'school-outline' },
  { value: 'corporate', label: 'Corporate', icon: 'briefcase-outline' },
  { value: 'defence', label: 'Defence', icon: 'shield-outline' },
  { value: 'healthcare', label: 'Healthcare', icon: 'medkit-outline' },
  { value: 'senior', label: 'Senior', icon: 'person-outline' },
  { value: 'teacher', label: 'Teacher', icon: 'book-outline' },
  { value: 'government', label: 'Government', icon: 'business-outline' },
  { value: 'differentlyAbled', label: 'Differently Abled', icon: 'accessibility-outline' },
];

export default function VerificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [verifications, setVerifications] = useState<ZoneVerification[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<ZoneVerification | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailVerification, setDetailVerification] = useState<ZoneVerification | null>(null);

  // Type filter modal
  const [showTypeFilter, setShowTypeFilter] = useState(false);

  // Bulk approve modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInstituteName, setBulkInstituteName] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Flag user modal
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagUserId, setFlagUserId] = useState('');
  const [flagReason, setFlagReason] = useState('');

  const loadData = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!append) setIsLoading(true);
      try {
        setLoadError(null);
        const data = await zoneVerificationsService.getVerifications(
          pageNum,
          20,
          statusFilter === 'all' ? 'all' : statusFilter,
          typeFilter === 'all' ? undefined : typeFilter
        );

        if (append) {
          setVerifications((prev) => {
            const next = [...prev, ...data.verifications];
            return next.filter(
              (verification, index, array) =>
                array.findIndex((item) => item._id === verification._id) === index
            );
          });
        } else {
          setVerifications(data.verifications);
        }

        setHasMore(data.pagination.hasNext);
        setPage(pageNum);
      } catch (error) {
        logger.error('Failed to load verifications:', error);
        setLoadError('Failed to load verifications');
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, typeFilter]
  );

  const loadStats = useCallback(async () => {
    try {
      const data = await zoneVerificationsService.getStats();
      setStats(data);
    } catch (error) {
      logger.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadStats();
  }, [loadData, loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(1), loadStats()]);
    setRefreshing(false);
  }, [loadData, loadStats]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  }, [isLoading, hasMore, page, loadData]);

  const handleApprove = async (verification: ZoneVerification) => {
    showConfirm(
      'Approve Verification',
      `Are you sure you want to approve this ${verification.verificationType} verification?`,
      async () => {
        try {
          setProcessingId(verification._id);
          await zoneVerificationsService.approveVerification(verification._id);
          showAlert('Success', 'Verification approved successfully');
          await Promise.all([loadData(1), loadStats()]);
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingId(null);
        }
      },
      'Approve'
    );
  };

  const handleRejectClick = (verification: ZoneVerification) => {
    setSelectedVerification(verification);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedVerification) return;

    const isRevoke = selectedVerification.status === 'approved';

    if (!isRevoke && !rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      setProcessingId(selectedVerification._id);
      if (isRevoke) {
        await zoneVerificationsService.revokeVerification(
          selectedVerification._id,
          rejectReason.trim() || undefined
        );
        showAlert('Success', 'Verification revoked');
      } else {
        await zoneVerificationsService.rejectVerification(selectedVerification._id, rejectReason);
        showAlert('Success', 'Verification rejected');
      }
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedVerification(null);
      await Promise.all([loadData(1), loadStats()]);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (verification: ZoneVerification) => {
    setSelectedVerification(verification);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReApprove = async (verification: ZoneVerification) => {
    showConfirm(
      'Re-approve Verification',
      `Are you sure you want to re-approve this ${verification.verificationType} verification?`,
      async () => {
        try {
          setProcessingId(verification._id);
          await zoneVerificationsService.reApproveVerification(verification._id);
          showAlert('Success', 'Verification re-approved successfully');
          await Promise.all([loadData(1), loadStats()]);
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingId(null);
        }
      },
      'Re-approve'
    );
  };

  const handleViewDetails = (verification: ZoneVerification) => {
    setDetailVerification(verification);
    setShowDetailModal(true);
  };

  const getUserInfo = (
    verification: ZoneVerification
  ): { name: string; phone: string; email: string } => {
    const userId = verification.userId;
    if (typeof userId === 'string') {
      return { name: 'Unknown', phone: '-', email: '-' };
    }
    const user: UserInfo = userId;
    const fullName =
      user.fullName ||
      user.profile?.fullName ||
      [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ');
    return {
      name: fullName || 'Unknown',
      phone: user.phoneNumber || '-',
      email: user.email || verification.submittedData?.email || '-',
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'rejected':
        return colors.error;
      default:
        return colors.icon;
    }
  };

  const getTypeIcon = (type: string): string => {
    const found = VERIFICATION_TYPES.find((t) => t.value === type);
    return found?.icon || 'document-outline';
  };

  const getTypeLabel = (type: string): string => {
    const found = VERIFICATION_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const filteredVerifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return verifications;

    return verifications.filter((verification) => {
      const userInfo = getUserInfo(verification);
      const haystack = [
        userInfo.name,
        userInfo.phone,
        userInfo.email,
        verification.submittedData?.instituteName,
        verification.submittedData?.companyName,
        verification.submittedData?.documentType,
        verification.verificationType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [searchQuery, verifications]);

  const renderHeader = () => {
    if (!stats) return null;

    return (
      <View style={s.headerContainer}>
        <View
          style={[s.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[s.heroTitle, { color: colors.text }]}>Verification Queue</Text>
          <Text style={[s.heroSubtitle, { color: colors.icon }]}>
            Review proofs, approve trusted users, and keep questionable submissions in manual
            review.
          </Text>

          <View style={s.statsContainer}>
            <View style={[s.statCard, { backgroundColor: colors.warningLight }]}>
              <Text style={[s.statValue, { color: colors.warningDark }]}>{stats.pending}</Text>
              <Text style={[s.statLabel, { color: colors.icon }]}>Pending</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.successLight }]}>
              <Text style={[s.statValue, { color: colors.successDark }]}>
                {stats.approved}
              </Text>
              <Text style={[s.statLabel, { color: colors.icon }]}>Approved</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.errorLight }]}>
              <Text style={[s.statValue, { color: colors.errorDark }]}>{stats.rejected}</Text>
              <Text style={[s.statLabel, { color: colors.icon }]}>Rejected</Text>
            </View>
          </View>

          <View
            style={[
              s.searchBar,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={colors.icon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search name, phone, email, institute"
              placeholderTextColor={colors.icon}
              style={[s.searchInput, { color: colors.text }]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.icon} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={s.filtersContainer}>
            <View style={s.statusFilters}>
              {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    s.filterChip,
                    {
                      backgroundColor:
                        statusFilter === status ? colors.tint : colors.backgroundSecondary,
                      borderColor: statusFilter === status ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setStatusFilter(status);
                    setIsLoading(true);
                  }}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      { color: statusFilter === status ? colors.card : colors.text },
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                s.typeFilterButton,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              ]}
              onPress={() => setShowTypeFilter(true)}
            >
              <Ionicons name={getTypeIcon(typeFilter) as unknown as keyof typeof Ionicons.glyphMap} size={18} color={colors.tint} />
              <Text style={[s.typeFilterText, { color: colors.text }]}>
                {typeFilter === 'all' ? 'All Types' : getTypeLabel(typeFilter)}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.bulkApproveButton, { backgroundColor: colors.successLight }]}
              onPress={() => setShowBulkModal(true)}
            >
              <Ionicons name="checkmark-done" size={16} color={colors.successDark} />
              <Text style={[s.bulkApproveText, { color: colors.successDark }]}>
                Bulk Approve
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loadError ? (
          <View style={[s.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.errorDark} />
            <Text style={[s.errorBannerText, { color: colors.errorDark }]}>{loadError}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderVerificationItem = useCallback(
    ({ item }: { item: ZoneVerification }) => {
      const userInfo = getUserInfo(item);
      const isProcessing = processingId === item._id;

      return (
        <TouchableOpacity
          style={[s.verificationCard, { backgroundColor: colors.card }]}
          onPress={() => handleViewDetails(item)}
          activeOpacity={0.7}
        >
          <View style={s.cardHeader}>
            <View style={[s.typeIcon, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons
                name={getTypeIcon(item.verificationType) as unknown as keyof typeof Ionicons.glyphMap}
                size={20}
                color={colors.tint}
              />
            </View>
            <View style={s.cardHeaderInfo}>
              <Text style={[s.userName, { color: colors.text }]}>{userInfo.name}</Text>
              <Text style={[s.userPhone, { color: colors.icon }]}>{userInfo.phone}</Text>
            </View>
            <View
              style={[s.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}
            >
              <Text style={[s.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <View style={s.cardDetails}>
            <View style={s.detailRow}>
              <Ionicons name="document-text-outline" size={14} color={colors.icon} />
              <Text style={[s.detailText, { color: colors.icon }]}>
                {getTypeLabel(item.verificationType)} Verification
              </Text>
            </View>
            {item.submittedData?.instituteName && (
              <View style={s.detailRow}>
                <Ionicons name="business-outline" size={14} color={colors.icon} />
                <Text style={[s.detailText, { color: colors.icon }]}>
                  {item.submittedData.instituteName}
                </Text>
              </View>
            )}
            {item.submittedData?.email && (
              <View style={s.detailRow}>
                <Ionicons name="mail-outline" size={14} color={colors.icon} />
                <Text style={[s.detailText, { color: colors.icon }]}>
                  {item.submittedData.email}
                </Text>
              </View>
            )}
            <View style={s.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.icon} />
              <Text style={[s.detailText, { color: colors.icon }]}>
                {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
              </Text>
            </View>
          </View>

          {/* Document Preview */}
          {item.submittedData?.documentUrl && (
            <View style={s.documentPreview}>
              <Image
                source={{ uri: item.submittedData.documentUrl }}
                style={s.documentThumbnail}
                resizeMode="cover"
              />
              <Text style={[s.documentLabel, { color: colors.icon }]}>Document attached</Text>
            </View>
          )}

          {/* Action Buttons */}
          {item.status === 'pending' && (
            <View style={s.actionButtons}>
              <TouchableOpacity
                style={[s.actionButton, { backgroundColor: colors.success }]}
                onPress={() => handleApprove(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.card} />
                    <Text style={s.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionButton, { backgroundColor: colors.error }]}
                onPress={() => handleRejectClick(item)}
                disabled={isProcessing}
              >
                <Ionicons name="close" size={16} color={colors.card} />
                <Text style={s.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionButton, { backgroundColor: '#f59e0b' }]}
                onPress={() => {
                  setFlagUserId(
                    typeof item.userId === 'string' ? item.userId : (item.userId as unknown as {_id?: string})?._id || ''
                  );
                  setShowFlagModal(true);
                }}
              >
                <Ionicons name="flag" size={14} color={colors.card} />
                <Text style={s.actionButtonText}>Flag</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Revoke button for approved */}
          {item.status === 'approved' && (
            <View style={s.actionButtons}>
              <TouchableOpacity
                style={[s.actionButton, { backgroundColor: colors.error }]}
                onPress={() => handleRevoke(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <>
                    <Ionicons name="ban" size={16} color={colors.card} />
                    <Text style={s.actionButtonText}>Revoke</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Re-approve button for rejected */}
          {item.status === 'rejected' && (
            <View style={s.actionButtons}>
              <TouchableOpacity
                style={[s.actionButton, { backgroundColor: colors.success }]}
                onPress={() => handleReApprove(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.card} />
                    <Text style={s.actionButtonText}>Re-approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Rejection Reason */}
          {item.status === 'rejected' && item.rejectionReason && (
            <View style={[s.rejectionBox, { backgroundColor: colors.error + '10' }]}>
              <Text style={[s.rejectionLabel, { color: colors.error }]}>
                Rejection Reason:
              </Text>
              <Text style={[s.rejectionText, { color: colors.text }]}>
                {item.rejectionReason}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, processingId, handleApprove, handleRejectClick, getStatusColor]
  );

  if (isLoading && verifications.length === 0) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredVerifications}
        renderItem={renderVerificationItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={renderHeader()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? <ActivityIndicator style={{ padding: 20 }} color={colors.tint} /> : null
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>
              {searchQuery ? 'No matching verifications found' : 'No verifications found'}
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {selectedVerification?.status === 'approved'
                ? 'Revoke Verification'
                : 'Reject Verification'}
            </Text>
            <Text style={[s.modalSubtitle, { color: colors.icon }]}>
              {selectedVerification?.status === 'approved'
                ? 'Provide an optional reason for revoking this verification.'
                : 'Please provide a reason for rejection. This will be shown to the user.'}
            </Text>
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
                  setSelectedVerification(null);
                }}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, { backgroundColor: colors.error }]}
                onPress={handleRejectConfirm}
              >
                <Text style={[s.modalButtonText, { color: colors.card }]}>
                  {selectedVerification?.status === 'approved' ? 'Revoke' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Type Filter Modal */}
      <Modal visible={showTypeFilter} transparent animationType="fade">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeFilter(false)}
        >
          <View style={[s.typeFilterModal, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Filter by Type</Text>
            {VERIFICATION_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  s.typeFilterOption,
                  typeFilter === type.value && { backgroundColor: colors.tint + '20' },
                ]}
                onPress={() => {
                  setTypeFilter(type.value);
                  setShowTypeFilter(false);
                  setIsLoading(true);
                }}
              >
                <Ionicons
                  name={type.icon as unknown as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={typeFilter === type.value ? colors.tint : colors.icon}
                />
                <Text
                  style={[
                    s.typeFilterOptionText,
                    { color: typeFilter === type.value ? colors.tint : colors.text },
                  ]}
                >
                  {type.label}
                </Text>
                {typeFilter === type.value && (
                  <Ionicons name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={s.detailModalOverlay}>
          <View style={[s.detailModalContent, { backgroundColor: colors.card }]}>
            <View style={s.detailModalHeader}>
              <Text style={[s.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                Verification Details
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {detailVerification && (
              <ScrollView style={s.detailModalBody} showsVerticalScrollIndicator={false}>
                {/* User Info */}
                <View style={s.detailSection}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>
                    User Information
                  </Text>
                  <View style={[s.infoCard, { backgroundColor: colors.background }]}>
                    <View style={s.infoRow}>
                      <Ionicons name="person-outline" size={18} color={colors.icon} />
                      <View style={s.infoContent}>
                        <Text style={[s.infoLabel, { color: colors.icon }]}>Name</Text>
                        <Text style={[s.infoValue, { color: colors.text }]}>
                          {getUserInfo(detailVerification).name}
                        </Text>
                      </View>
                    </View>
                    <View style={s.infoRow}>
                      <Ionicons name="call-outline" size={18} color={colors.icon} />
                      <View style={s.infoContent}>
                        <Text style={[s.infoLabel, { color: colors.icon }]}>Phone</Text>
                        <Text style={[s.infoValue, { color: colors.text }]}>
                          {getUserInfo(detailVerification).phone}
                        </Text>
                      </View>
                    </View>
                    <View style={s.infoRow}>
                      <Ionicons name="mail-outline" size={18} color={colors.icon} />
                      <View style={s.infoContent}>
                        <Text style={[s.infoLabel, { color: colors.icon }]}>Email</Text>
                        <Text style={[s.infoValue, { color: colors.text }]}>
                          {getUserInfo(detailVerification).email}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Verification Info */}
                <View style={s.detailSection}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>
                    Verification Info
                  </Text>
                  <View style={[s.infoCard, { backgroundColor: colors.background }]}>
                    <View style={s.infoRow}>
                      <Ionicons name="document-text-outline" size={18} color={colors.icon} />
                      <View style={s.infoContent}>
                        <Text style={[s.infoLabel, { color: colors.icon }]}>Type</Text>
                        <Text style={[s.infoValue, { color: colors.text }]}>
                          {getTypeLabel(detailVerification.verificationType)}
                        </Text>
                      </View>
                    </View>
                    <View style={s.infoRow}>
                      <Ionicons name="flag-outline" size={18} color={colors.icon} />
                      <View style={s.infoContent}>
                        <Text style={[s.infoLabel, { color: colors.icon }]}>Status</Text>
                        <Text
                          style={[
                            s.infoValue,
                            { color: getStatusColor(detailVerification.status) },
                          ]}
                        >
                          {detailVerification.status.charAt(0).toUpperCase() +
                            detailVerification.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    {detailVerification.submittedData?.documentType && (
                      <View style={s.infoRow}>
                        <Ionicons name="folder-outline" size={18} color={colors.icon} />
                        <View style={s.infoContent}>
                          <Text style={[s.infoLabel, { color: colors.icon }]}>
                            Document Type
                          </Text>
                          <Text style={[s.infoValue, { color: colors.text }]}>
                            {detailVerification.submittedData.documentType}
                          </Text>
                        </View>
                      </View>
                    )}
                    {detailVerification.submittedData?.instituteName && (
                      <View style={s.infoRow}>
                        <Ionicons name="business-outline" size={18} color={colors.icon} />
                        <View style={s.infoContent}>
                          <Text style={[s.infoLabel, { color: colors.icon }]}>
                            Institution
                          </Text>
                          <Text style={[s.infoValue, { color: colors.text }]}>
                            {detailVerification.submittedData.instituteName}
                          </Text>
                        </View>
                      </View>
                    )}
                    <View style={s.infoRow}>
                      <Ionicons name="calendar-outline" size={18} color={colors.icon} />
                      <View style={s.infoContent}>
                        <Text style={[s.infoLabel, { color: colors.icon }]}>Submitted</Text>
                        <Text style={[s.infoValue, { color: colors.text }]}>
                          {format(new Date(detailVerification.createdAt), 'MMMM d, yyyy h:mm a')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Document Image */}
                {detailVerification.submittedData?.documentUrl && (
                  <View style={s.detailSection}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      Uploaded Document
                    </Text>
                    <Image
                      source={{ uri: detailVerification.submittedData.documentUrl }}
                      style={s.documentImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Rejection Reason */}
                {detailVerification.status === 'rejected' && detailVerification.rejectionReason && (
                  <View style={s.detailSection}>
                    <Text style={[s.sectionTitle, { color: colors.error }]}>
                      Rejection Reason
                    </Text>
                    <View style={[s.rejectionBox, { backgroundColor: colors.error + '10' }]}>
                      <Text style={[s.rejectionText, { color: colors.text }]}>
                        {detailVerification.rejectionReason}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Actions for pending */}
                {detailVerification.status === 'pending' && (
                  <View style={s.detailActions}>
                    <TouchableOpacity
                      style={[s.detailActionButton, { backgroundColor: colors.success }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleApprove(detailVerification);
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color={colors.card} />
                      <Text style={s.detailActionText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.detailActionButton, { backgroundColor: colors.error }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleRejectClick(detailVerification);
                      }}
                    >
                      <Ionicons name="close" size={20} color={colors.card} />
                      <Text style={s.detailActionText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Revoke for approved */}
                {detailVerification.status === 'approved' && (
                  <View style={s.detailActions}>
                    <TouchableOpacity
                      style={[s.detailActionButton, { backgroundColor: colors.error }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleRevoke(detailVerification);
                      }}
                    >
                      <Ionicons name="ban" size={20} color={colors.card} />
                      <Text style={s.detailActionText}>Revoke Verification</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Re-approve for rejected */}
                {detailVerification.status === 'rejected' && (
                  <View style={s.detailActions}>
                    <TouchableOpacity
                      style={[s.detailActionButton, { backgroundColor: colors.success }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleReApprove(detailVerification);
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color={colors.card} />
                      <Text style={s.detailActionText}>Re-approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[s.closeButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={s.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bulk Approve Modal */}
      <Modal visible={showBulkModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              Bulk Approve by Institution
            </Text>
            <TextInput
              style={[s.rejectInput, { color: colors.text, borderColor: colors.text + '30' }]}
              placeholder="Enter institution name"
              placeholderTextColor={colors.text + '66'}
              value={bulkInstituteName}
              onChangeText={setBulkInstituteName}
            />
            <Text style={{ fontSize: 12, color: colors.text + '66', marginBottom: 12 }}>
              All pending verifications matching this name will be approved.
            </Text>
            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.cancelButton, { borderColor: colors.text + '30' }]}
                onPress={() => {
                  setShowBulkModal(false);
                  setBulkInstituteName('');
                }}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitButton, { backgroundColor: '#16a34a' }]}
                disabled={bulkProcessing}
                onPress={async () => {
                  if (!bulkInstituteName.trim()) {
                    showAlert('Required', 'Enter institution name');
                    return;
                  }
                  setBulkProcessing(true);
                  try {
                    const result = await zoneVerificationsService.bulkApproveByInstitution(
                      bulkInstituteName.trim()
                    );
                    showAlert(
                      'Done',
                      `${result.approved} verifications approved for ${bulkInstituteName}`
                    );
                    setShowBulkModal(false);
                    setBulkInstituteName('');
                    loadData();
                    loadStats();
                  } catch (e: any) {
                    showAlert('Error', e.message);
                  } finally {
                    setBulkProcessing(false);
                  }
                }}
              >
                {bulkProcessing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.submitButtonText}>Approve All</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Flag User Modal */}
      <Modal visible={showFlagModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Flag User</Text>
            <Text style={{ fontSize: 12, color: colors.text + '99', marginBottom: 12 }}>
              Flagged users cannot auto-verify. All future submissions go to manual review.
            </Text>
            <TextInput
              style={[
                s.rejectInput,
                { color: colors.text, borderColor: colors.text + '30', minHeight: 80 },
              ]}
              placeholder="Reason for flagging"
              placeholderTextColor={colors.text + '66'}
              value={flagReason}
              onChangeText={setFlagReason}
              multiline
            />
            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.cancelButton, { borderColor: colors.text + '30' }]}
                onPress={() => {
                  setShowFlagModal(false);
                  setFlagReason('');
                  setFlagUserId('');
                }}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitButton, { backgroundColor: '#f59e0b' }]}
                onPress={async () => {
                  if (!flagReason.trim()) {
                    showAlert('Required', 'Enter a reason');
                    return;
                  }
                  try {
                    await usersService.flagUser(flagUserId, flagReason.trim());
                    showAlert('Flagged', 'User flagged. Auto-verify disabled.');
                    setShowFlagModal(false);
                    setFlagReason('');
                    setFlagUserId('');
                    loadData();
                  } catch (e: any) {
                    showAlert('Error', e.message);
                  }
                }}
              >
                <Text style={s.submitButtonText}>Flag User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

