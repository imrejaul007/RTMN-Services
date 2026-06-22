import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { isAllowedOpenUrl } from '../../utils/urlValidator';
import { priveService } from '../../services/api/prive';
import { s } from './styles/prive-campaigns.styles';

interface PriveSubmission {
  _id: string;
  username: string;
  platform: 'instagram' | 'twitter' | 'youtube';
  campaignName: string;
  postUrl: string;
  screenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
}

// DUMMY_SUBMISSIONS removed — do not use dummy data in production

const PLATFORM_COLORS: Record<string, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: '#E1306C' },
  twitter: { label: 'Twitter/X', color: '#000000' },
  youtube: { label: 'YouTube', color: '#FF0000' },
};

export default function PriveCampaignsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [submissions, setSubmissions] = useState<PriveSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<PriveSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tabFilter, setTabFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'pending'
  );
  const [platformFilter, setPlatformFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<PriveSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [tabFilter, platformFilter, submissions]);

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await priveService.getSubmissions();
      setSubmissions(data);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  const filterSubmissions = () => {
    let filtered = submissions;

    if (tabFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === tabFilter);
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter((s) => s.platform === platformFilter);
    }

    setFilteredSubmissions(filtered);
  };

  const handleApprove = async (submission: PriveSubmission) => {
    try {
      setLoading(true);
      await priveService.reviewSubmission(submission._id, 'approve');
      setSubmissions((prev) =>
        prev.map((s) => (s._id === submission._id ? { ...s, status: 'approved' as const } : s))
      );
      showAlert('Success', 'Submission approved');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to approve submission');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    if (!rejectionReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      setLoading(true);
      await priveService.reviewSubmission(selectedSubmission._id, 'reject', rejectionReason);
      setSubmissions((prev) =>
        prev.map((s) =>
          s._id === selectedSubmission._id
            ? { ...s, status: 'rejected' as const, rejectionReason }
            : s
        )
      );
      showAlert('Success', 'Submission rejected');
      setShowRejectModal(false);
      setSelectedSubmission(null);
      setRejectionReason('');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reject submission');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) return;

    try {
      setLoading(true);
      const result = await priveService.bulkReviewSubmissions(ids, 'approve');
      setSubmissions((prev) =>
        prev.map((s) => (ids.includes(s._id) ? { ...s, status: 'approved' as const } : s))
      );
      setSelectedItems(new Set());
      showAlert('Success', result.message);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to approve selected submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) return;

    try {
      setLoading(true);
      const result = await priveService.bulkReviewSubmissions(
        ids,
        'reject',
        'Bulk rejected by admin'
      );
      setSubmissions((prev) =>
        prev.map((s) =>
          ids.includes(s._id)
            ? { ...s, status: 'rejected' as const, rejectionReason: 'Bulk rejected by admin' }
            : s
        )
      );
      setSelectedItems(new Set());
      showAlert('Success', result.message);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reject selected submissions');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  const renderSubmissionCard = ({ item }: { item: PriveSubmission }) => {
    const isSelected = selectedItems.has(item._id);
    const platformInfo = PLATFORM_COLORS[item.platform];

    return (
      <View
        style={[
          s.submissionCard,
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.tint : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        <TouchableOpacity style={s.selectButton} onPress={() => toggleItemSelection(item._id)}>
          <View
            style={[
              s.checkbox,
              {
                backgroundColor: isSelected ? colors.tint : colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <View style={s.submissionContent}>
          <View style={s.headerRow}>
            <Text style={[s.username, { color: colors.text }]}>{item.username}</Text>
            <View style={[s.platformBadge, { backgroundColor: platformInfo.color + '20' }]}>
              <Text style={[s.platformBadgeText, { color: platformInfo.color }]}>
                {platformInfo.label}
              </Text>
            </View>
          </View>

          <Text style={[s.campaignName, { color: colors.text }]}>{item.campaignName}</Text>

          <TouchableOpacity
            onPress={() => {
              if (isAllowedOpenUrl(item.postUrl)) {
                Linking.openURL(item.postUrl).catch(() => {
                  showAlert('Error', 'Could not open URL');
                });
              } else {
                showAlert('Error', 'Invalid campaign URL');
              }
            }}
          >
            <Text style={[s.postUrl, { color: colors.info }]}>View Post ↗</Text>
          </TouchableOpacity>

          {item.screenshotUrl && (
            <View style={[s.screenshotPlaceholder, { backgroundColor: colors.background }]}>
              <Ionicons name="image" size={32} color={colors.icon} />
              <Text style={[s.screenshotText, { color: colors.icon }]}>Screenshot</Text>
            </View>
          )}

          {item.status === 'pending' && (
            <View style={s.actionButtons}>
              <TouchableOpacity
                onPress={() => handleApprove(item)}
                disabled={loading}
                style={[s.approveButton, { backgroundColor: colors.success }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={s.buttonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSelectedSubmission(item);
                  setShowRejectModal(true);
                }}
                style={[s.rejectButton, { backgroundColor: colors.error }]}
              >
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={s.buttonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === 'rejected' && item.rejectionReason && (
            <View
              style={[
                s.rejectionBox,
                { backgroundColor: colors.error + '20', borderColor: colors.error },
              ]}
            >
              <Ionicons name="close-circle" size={14} color={colors.error} />
              <Text style={[s.rejectionText, { color: colors.error }]}>
                {item.rejectionReason}
              </Text>
            </View>
          )}

          {item.status === 'approved' && (
            <View
              style={[
                s.approvedBox,
                { backgroundColor: colors.success + '20', borderColor: colors.success },
              ]}
            >
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[s.approvedText, { color: colors.success }]}>Approved</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const getAnalytics = () => {
    const total = submissions.length;
    const approved = submissions.filter((s) => s.status === 'approved').length;
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(0) : '0';

    return { total, approvalRate };
  };

  const analytics = getAnalytics();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Privé Campaigns</Text>
          {pendingCount > 0 && (
            <View style={[s.pendingBadge, { backgroundColor: colors.warning }]}>
              <Text style={s.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabBarContent}
        >
          {[
            { label: 'All', value: 'all', count: submissions.length },
            {
              label: 'Pending',
              value: 'pending',
              count: submissions.filter((s) => s.status === 'pending').length,
            },
            {
              label: 'Approved',
              value: 'approved',
              count: submissions.filter((s) => s.status === 'approved').length,
            },
            {
              label: 'Rejected',
              value: 'rejected',
              count: submissions.filter((s) => s.status === 'rejected').length,
            },
          ].map((tab) => {
            const isActive = tabFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setTabFilter(tab.value as 'all' | 'pending' | 'approved' | 'rejected')}
                style={[
                  s.tab,
                  {
                    borderBottomColor: isActive ? colors.tint : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    s.tabText,
                    {
                      color: isActive ? colors.tint : colors.secondaryText,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      s.tabBadge,
                      { backgroundColor: isActive ? colors.tint : colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        s.tabBadgeText,
                        { color: isActive ? '#fff' : colors.secondaryText },
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Row */}
      <View style={s.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.platformFilters}
        >
          {[
            { label: 'All', value: 'all' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'Twitter', value: 'twitter' },
            { label: 'YouTube', value: 'youtube' },
          ].map((platform) => (
            <TouchableOpacity
              key={platform.value}
              onPress={() => setPlatformFilter(platform.value)}
              style={[
                s.platformChip,
                {
                  backgroundColor:
                    platformFilter === platform.value ? colors.info : colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  s.platformChipText,
                  {
                    color: platformFilter === platform.value ? '#fff' : colors.text,
                    fontWeight: platformFilter === platform.value ? '600' : '500',
                  },
                ]}
              >
                {platform.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Submissions List */}
      {loading ? (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : fetchError ? (
        <View style={s.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[s.emptyText, { color: colors.text }]}>{fetchError}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSubmissions}
          renderItem={renderSubmissionCard}
          keyExtractor={(item: PriveSubmission) => item._id}
          contentContainerStyle={s.listContent}
          scrollEnabled
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="document-outline" size={48} color={colors.icon} />
              <Text style={[s.emptyText, { color: colors.text }]}>No submissions found</Text>
            </View>
          }
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <View
          style={[
            s.bulkActionBar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <Text style={[s.bulkActionText, { color: colors.text }]}>
            {selectedItems.size} selected
          </Text>
          <View style={s.bulkActionButtons}>
            <TouchableOpacity
              style={[
                s.bulkApproveButton,
                {
                  backgroundColor: colors.success + '20',
                  opacity: selectedItems.size === 0 || loading ? 0.5 : 1,
                },
              ]}
              disabled={selectedItems.size === 0 || loading}
              onPress={handleBulkApprove}
            >
              <Text style={[s.bulkActionButtonText, { color: colors.success }]}>
                Approve Selected
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.bulkRejectButton,
                {
                  backgroundColor: colors.error + '20',
                  opacity: selectedItems.size === 0 || loading ? 0.5 : 1,
                },
              ]}
              disabled={selectedItems.size === 0 || loading}
              onPress={handleBulkReject}
            >
              <Text style={[s.bulkActionButtonText, { color: colors.error }]}>
                Reject Selected
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Analytics Section */}
      <View
        style={[
          s.analyticsContainer,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <Text style={[s.analyticsTitle, { color: colors.text }]}>Analytics</Text>
        <View style={s.analyticsGrid}>
          <View style={s.analyticsCard}>
            <Text style={[s.analyticsLabel, { color: colors.icon }]}>Total Campaigns</Text>
            <Text style={[s.analyticsValue, { color: colors.tint }]}>{analytics.total}</Text>
          </View>
          <View style={s.analyticsCard}>
            <Text style={[s.analyticsLabel, { color: colors.icon }]}>Approval Rate</Text>
            <Text style={[s.analyticsValue, { color: colors.success }]}>
              {analytics.approvalRate}%
            </Text>
          </View>
        </View>
      </View>

      {/* Rejection Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Reject Submission</Text>
            <Text style={[s.modalSubtitle, { color: colors.icon }]}>
              {selectedSubmission?.username} - {selectedSubmission?.campaignName}
            </Text>

            <TextInput
              style={[
                s.rejectionInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedSubmission(null);
                  setRejectionReason('');
                }}
                style={[s.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                disabled={loading}
                style={[s.modalButton, { backgroundColor: colors.error }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalButtonText, { color: '#fff' }]}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

