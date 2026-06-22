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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { adCampaignsService, AdCampaign, AdNetworkStats } from '../../services/api/adCampaigns';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/ads.styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#7c3aed';
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const DANGER = '#ef4444';
const INFO = '#3b82f6';

type TabFilter = 'all' | 'pending_review' | 'active' | 'rejected';

const TABS: { key: TabFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'pending_review', label: 'Pending Review', icon: 'time' },
  { key: 'active', label: 'Active', icon: 'checkmark-circle' },
  { key: 'rejected', label: 'Rejected', icon: 'close-circle' },
];

const PLACEMENT_LABELS: Record<AdCampaign['placement'], string> = {
  home_banner: 'Home Banner',
  explore_feed: 'Explore Feed',
  store_listing: 'Store Listing',
  search_result: 'Search Result',
};

const STATUS_CONFIG: Record<AdCampaign['status'], { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
  pending_review: { label: 'Pending', color: WARNING, bg: '#fef3c7' },
  active: { label: 'Active', color: SUCCESS, bg: '#d1fae5' },
  paused: { label: 'Paused', color: INFO, bg: '#dbeafe' },
  rejected: { label: 'Rejected', color: DANGER, bg: '#fee2e2' },
  completed: { label: 'Completed', color: '#6b7280', bg: '#f3f4f6' },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as keyof typeof Colors];

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [stats, setStats] = useState<AdNetworkStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingAd, setRejectingAd] = useState<AdCampaign | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAd, setDetailAd] = useState<AdCampaign | null>(null);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  // BUG-061 FIX: Replaced manual page/hasMore state with useInfiniteQuery.
  const {
    data: pages = [],
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['ads', activeTab],
    queryFn: ({ pageParam = 1 }) => {
      const query: any = { page: pageParam, limit: 20 };
      if (activeTab !== 'all') query.status = activeTab;
      return adCampaignsService.fetchAds(query);
    },
    getNextPageParam: (_lastPage: any, allPages: any[]) => {
      const last = allPages[allPages.length - 1];
      return last?.pagination?.hasNext ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const ads = useMemo(() => {
    const allAds: AdCampaign[] = [];
    for (const page of pages as Array<{data?: {ads?: AdCampaign[]}}>) {
      const data = page?.data;
      if (data?.ads) allAds.push(...data.ads);
    }
    return allAds;
  }, [pages]);

  const hasMore = hasNextPage ?? false;

  const loadStats = useCallback(async () => {
    try {
      const data = await adCampaignsService.fetchAdStats();
      setStats(data);
    } catch (error) {
      logger.error('[AdsScreen] loadStats error:', error);
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

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleApprove = async (ad: AdCampaign) => {
    showConfirm(
      'Approve Ad',
      `Approve "${ad.title}" from ${ad.merchantId?.businessName ?? ad.merchantId?.name ?? 'merchant'}?`,
      async () => {
        try {
          await adCampaignsService.approveAd(ad._id);
          showAlert('Success', 'Ad approved and set to active.');
          await Promise.all([refetch(), loadStats()]);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Approve'
    );
  };

  const handleRejectOpen = (ad: AdCampaign) => {
    setRejectingAd(ad);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingAd) return;
    if (!rejectionReason.trim()) {
      showAlert('Required', 'Please enter a rejection reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      await adCampaignsService.rejectAd(rejectingAd._id, rejectionReason.trim());
      showAlert('Done', 'Ad has been rejected.');
      setShowRejectModal(false);
      setRejectingAd(null);
      setRejectionReason('');
      await Promise.all([refetch(), loadStats()]);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForcePause = (ad: AdCampaign) => {
    showConfirm(
      'Force Pause',
      `Pause "${ad.title}"? The merchant will be notified.`,
      async () => {
        try {
          await adCampaignsService.pauseAd(ad._id);
          showAlert('Success', 'Ad has been paused.');
          await Promise.all([refetch(), loadStats()]);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Pause'
    );
  };

  const handleViewDetail = (ad: AdCampaign) => {
    setDetailAd(ad);
    setShowDetailModal(true);
  };

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const renderHeader = () => (
    <View style={s.header}>
      <View>
        <Text style={[s.headerTitle, { color: colors.text }]}>Ad Network</Text>
        <Text style={[s.headerSubtitle, { color: colors.icon }]}>
          Review and manage merchant ads
        </Text>
      </View>
    </View>
  );

  const renderStats = () => {
    const statItems = [
      {
        label: 'Total Ads',
        value: stats?.total ?? 0,
        color: PRIMARY,
        icon: 'megaphone' as const,
      },
      {
        label: 'Pending Review',
        value: stats?.byStatus?.['pending_review'] ?? 0,
        color: WARNING,
        icon: 'time' as const,
      },
      {
        label: 'Active',
        value: stats?.byStatus?.['active'] ?? 0,
        color: SUCCESS,
        icon: 'checkmark-circle' as const,
      },
      {
        label: 'Impressions',
        value: formatNumber(stats?.totalImpressions ?? 0),
        color: INFO,
        icon: 'eye' as const,
      },
    ];

    return (
      <View style={s.statsBar}>
        {statItems.map((item, idx) => (
          <View key={idx} style={[s.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name={item.icon} size={18} color={item.color} />
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={s.tabsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsContent}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabItem, { backgroundColor: isActive ? PRIMARY : colors.card }]}
              onPress={() => {
                setActiveTab(tab.key);
              }}
            >
              <Ionicons name={tab.icon as unknown as keyof typeof Ionicons.glyphMap} size={15} color={isActive ? '#fff' : colors.icon} />
              <Text style={[s.tabLabel, { color: isActive ? '#fff' : colors.icon }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderAdCard = useCallback(
    ({ item }: { item: AdCampaign }) => {
      const statusCfg = STATUS_CONFIG[item.status];
      const merchantName =
        item.merchantId?.businessName ?? item.merchantId?.name ?? 'Unknown Merchant';

      return (
        <View style={[s.card, { backgroundColor: colors.card }]}>
          {/* Card Top */}
          <View style={s.cardTop}>
            <View style={s.cardMeta}>
              <Text style={[s.cardMerchant, { color: colors.icon }]} numberOfLines={1}>
                {merchantName}
              </Text>
              <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <View style={s.cardBadges}>
              {/* Placement badge */}
              <View style={[s.badge, { backgroundColor: '#ede9fe' }]}>
                <Text style={[s.badgeText, { color: PRIMARY }]}>
                  {PLACEMENT_LABELS[item.placement] ?? item.placement}
                </Text>
              </View>
              {/* Status badge */}
              <View style={[s.badge, { backgroundColor: statusCfg.bg }]}>
                <Text style={[s.badgeText, { color: statusCfg.color }]}>
                  {statusCfg.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Metrics Row */}
          <View style={[s.metricsRow, { borderTopColor: colors.border }]}>
            <View style={s.metricItem}>
              <Ionicons name="pricetag" size={13} color={colors.icon} />
              <Text style={[s.metricText, { color: colors.text }]}>
                {item.bidType} · ₹{item.bidAmount}
              </Text>
            </View>
            <View style={s.metricItem}>
              <Ionicons name="wallet" size={13} color={colors.icon} />
              <Text style={[s.metricText, { color: colors.text }]}>
                ₹{item.totalSpent.toFixed(0)} / ₹{item.totalBudget}
              </Text>
            </View>
            <View style={s.metricItem}>
              <Ionicons name="eye" size={13} color={colors.icon} />
              <Text style={[s.metricText, { color: colors.text }]}>
                {formatNumber(item.impressions)} impr.
              </Text>
            </View>
            <View style={s.metricItem}>
              <Ionicons name="hand-left" size={13} color={colors.icon} />
              <Text style={[s.metricText, { color: colors.text }]}>
                {formatNumber(item.clicks)} ({(item.ctr ?? 0).toFixed(2)}%)
              </Text>
            </View>
          </View>

          {/* Created date */}
          <Text style={[s.cardDate, { color: colors.icon }]}>
            Created {formatDate(item.createdAt)}
          </Text>

          {/* Rejection reason if present */}
          {item.status === 'rejected' && item.rejectionReason ? (
            <View style={[s.rejectionBanner, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="alert-circle" size={13} color={DANGER} />
              <Text style={[s.rejectionText, { color: DANGER }]} numberOfLines={2}>
                {item.rejectionReason}
              </Text>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={s.actionsRow}>
            {item.status === 'pending_review' && (
              <>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: SUCCESS }]}
                  onPress={() => handleApprove(item)}
                >
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={s.actionBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: DANGER }]}
                  onPress={() => handleRejectOpen(item)}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                  <Text style={s.actionBtnText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
            {item.status === 'active' && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: WARNING }]}
                onPress={() => handleForcePause(item)}
              >
                <Ionicons name="pause" size={14} color="#fff" />
                <Text style={s.actionBtnText}>Force Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                s.actionBtn,
                { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
              ]}
              onPress={() => handleViewDetail(item)}
            >
              <Ionicons name="eye-outline" size={14} color={colors.text} />
              <Text style={[s.actionBtnText, { color: colors.text }]}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [colors, activeTab]
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={s.emptyContainer}>
        <Ionicons name="megaphone-outline" size={52} color={colors.icon} />
        <Text style={[s.emptyTitle, { color: colors.text }]}>No Ads Found</Text>
        <Text style={[s.emptySubtitle, { color: colors.icon }]}>
          {activeTab === 'all'
            ? 'No ad campaigns have been submitted yet.'
            : `No ads with status "${TABS.find((t) => t.key === activeTab)?.label}" at the moment.`}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={s.footerLoader}>
        <ActivityIndicator size="small" color={PRIMARY} />
      </View>
    );
  };

  // ─── Rejection Modal ───────────────────────────────────────────────────────

  const renderRejectModal = () => (
    <Modal
      visible={showRejectModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRejectModal(false)}
    >
      <View style={s.modalOverlay}>
        <View style={[s.rejectModalBox, { backgroundColor: colors.card }]}>
          <Text style={[s.rejectModalTitle, { color: colors.text }]}>Reject Ad</Text>
          {rejectingAd ? (
            <Text style={[s.rejectModalSubtitle, { color: colors.icon }]}>
              Rejecting "{rejectingAd.title}"
            </Text>
          ) : null}
          <TextInput
            style={[
              s.rejectInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter rejection reason..."
            placeholderTextColor={colors.icon}
            value={rejectionReason}
            onChangeText={setRejectionReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={s.rejectActions}>
            <TouchableOpacity
              style={[s.rejectCancelBtn, { borderColor: colors.border }]}
              onPress={() => {
                setShowRejectModal(false);
                setRejectingAd(null);
                setRejectionReason('');
              }}
              disabled={isSubmitting}
            >
              <Text style={[s.rejectCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.rejectConfirmBtn, { backgroundColor: DANGER }]}
              onPress={handleRejectConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.rejectConfirmText}>Confirm Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── Detail Modal ──────────────────────────────────────────────────────────

  const renderDetailModal = () => {
    if (!detailAd) return null;
    const statusCfg = STATUS_CONFIG[detailAd.status];
    const merchantName =
      detailAd.merchantId?.businessName ?? detailAd.merchantId?.name ?? 'Unknown Merchant';

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[s.detailHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={s.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.detailHeaderTitle, { color: colors.text }]}>Ad Details</Text>
            <View style={s.modalCloseBtn} />
          </View>

          <ScrollView
            style={s.detailScroll}
            contentContainerStyle={s.detailContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Status + Merchant */}
            <View style={s.detailSection}>
              <View style={s.detailRow}>
                <Text style={[s.detailLabel, { color: colors.icon }]}>Status</Text>
                <View style={[s.badge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[s.badgeText, { color: statusCfg.color }]}>
                    {statusCfg.label}
                  </Text>
                </View>
              </View>
              <View style={s.detailRow}>
                <Text style={[s.detailLabel, { color: colors.icon }]}>Merchant</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>{merchantName}</Text>
              </View>
            </View>

            {/* Creative */}
            <View style={[s.detailSection, { borderTopColor: colors.border }]}>
              <Text style={[s.detailSectionTitle, { color: colors.text }]}>Creative</Text>
              <DetailRow label="Title" value={detailAd.title} colors={colors} />
              <DetailRow label="Headline" value={detailAd.headline} colors={colors} />
              <DetailRow label="Description" value={detailAd.description} colors={colors} />
              <DetailRow label="CTA Text" value={detailAd.ctaText} colors={colors} />
              <DetailRow label="Image URL" value={detailAd.imageUrl} colors={colors} />
            </View>

            {/* Targeting */}
            <View style={[s.detailSection, { borderTopColor: colors.border }]}>
              <Text style={[s.detailSectionTitle, { color: colors.text }]}>Targeting</Text>
              <DetailRow
                label="Placement"
                value={PLACEMENT_LABELS[detailAd.placement] ?? detailAd.placement}
                colors={colors}
              />
              <DetailRow label="Segment" value={detailAd.targetSegment || '—'} colors={colors} />
              <DetailRow
                label="Start Date"
                value={formatDate(detailAd.startDate)}
                colors={colors}
              />
              <DetailRow
                label="End Date"
                value={detailAd.endDate ? formatDate(detailAd.endDate) : 'No end date'}
                colors={colors}
              />
            </View>

            {/* Budget */}
            <View style={[s.detailSection, { borderTopColor: colors.border }]}>
              <Text style={[s.detailSectionTitle, { color: colors.text }]}>Budget</Text>
              <DetailRow label="Bid Type" value={detailAd.bidType} colors={colors} />
              <DetailRow label="Bid Amount" value={`₹${detailAd.bidAmount}`} colors={colors} />
              <DetailRow label="Daily Budget" value={`₹${detailAd.dailyBudget}`} colors={colors} />
              <DetailRow label="Total Budget" value={`₹${detailAd.totalBudget}`} colors={colors} />
              <DetailRow
                label="Total Spent"
                value={`₹${detailAd.totalSpent.toFixed(2)}`}
                colors={colors}
              />
            </View>

            {/* Performance */}
            <View style={[s.detailSection, { borderTopColor: colors.border }]}>
              <Text style={[s.detailSectionTitle, { color: colors.text }]}>Performance</Text>
              <DetailRow
                label="Impressions"
                value={formatNumber(detailAd.impressions)}
                colors={colors}
              />
              <DetailRow label="Clicks" value={formatNumber(detailAd.clicks)} colors={colors} />
              <DetailRow label="CTR" value={`${(detailAd.ctr ?? 0).toFixed(2)}%`} colors={colors} />
            </View>

            {/* Rejection reason if present */}
            {detailAd.status === 'rejected' && detailAd.rejectionReason ? (
              <View style={[s.detailSection, { borderTopColor: colors.border }]}>
                <Text style={[s.detailSectionTitle, { color: DANGER }]}>Rejection Reason</Text>
                <Text style={[s.detailValue, { color: DANGER }]}>
                  {detailAd.rejectionReason}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderStats()}
      {renderTabs()}

      {isLoading && !refreshing ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={ads}
          keyExtractor={(item: AdCampaign) => item._id}
          renderItem={renderAdCard}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderRejectModal()}
      {renderDetailModal()}
    </SafeAreaView>
  );
}

// ─── Sub-component ─────────────────────────────────────────────────────────────

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={s.detailRow}>
      <Text style={[s.detailLabel, { color: colors.icon }]}>{label}</Text>
      <Text
        style={[s.detailValue, { color: colors.text, flex: 1, textAlign: 'right' }]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

