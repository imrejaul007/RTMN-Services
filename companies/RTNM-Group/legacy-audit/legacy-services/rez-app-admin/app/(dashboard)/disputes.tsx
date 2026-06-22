import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { styles as s } from './styles/disputes.styles';
import { disputesService, AdminDispute, DisputeStats } from '../../services/api/disputes';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';


// ─── Constants ──────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: Colors.light.error,
  under_review: Colors.light.warning,
  escalated: Colors.light.purple,
  resolved_refund: Colors.light.success,
  resolved_reject: Colors.light.info,
  auto_resolved: Colors.light.indigo,
  closed: Colors.light.mutedDark,
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved_refund: 'Refunded',
  resolved_reject: 'Rejected',
  auto_resolved: 'Auto-Resolved',
  closed: 'Closed',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: Colors.light.muted,
  medium: Colors.light.info,
  high: Colors.light.warning,
  urgent: Colors.light.error,
};

const REASON_LABELS: Record<string, string> = {
  item_not_received: 'Item Not Received',
  wrong_item: 'Wrong Item',
  damaged_item: 'Damaged Item',
  quality_issue: 'Quality Issue',
  unauthorized_charge: 'Unauthorized Charge',
  double_charge: 'Double Charge',
  service_not_rendered: 'Service Not Rendered',
  other: 'Other',
};

const STATUS_OPTIONS = [
  'all',
  'open',
  'under_review',
  'escalated',
  'resolved_refund',
  'resolved_reject',
  'auto_resolved',
];
const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'urgent'];

// ─── Component ──────────────────────────────────────────────

export default function DisputesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as keyof typeof Colors];

  // Data state
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Detail modal
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Resolve modal
  const [showResolve, setShowResolve] = useState(false);
  const [resolveDecision, setResolveDecision] = useState<'refund' | 'reject' | 'partial_refund'>(
    'refund'
  );
  const [resolveAmount, setResolveAmount] = useState('');
  const [resolveReason, setResolveReason] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  // Note modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Escalation reason modal
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateLoading, setEscalateLoading] = useState(false);

  // ─── Data Loading ───────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const response = await disputesService.getStats();
      if (response.success && response.data) {
        setStats(response.data as unknown as DisputeStats);
      }
    } catch (err) {
      logger.error('Failed to load stats:', err);
    }
  }, []);

  // BUG-061 FIX: Replaced manual page/hasMore state with useInfiniteQuery.
  const {
    data: pages = [],
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['disputes', filterStatus, filterPriority, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      const params: any = { page: pageParam, limit: 20 };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      return disputesService.getDisputes(params);
    },
    getNextPageParam: (_lastPage: unknown, allPages: unknown[]) => {
      const last = (allPages as Array<{data?: {pagination?: {hasNext?: boolean}}}>)[allPages.length - 1];
      const data = last?.data;
      const hasNext = data?.pagination?.hasNext ?? false;
      return hasNext ? allPages.length + 2 : undefined;
    },
    initialPageParam: 1,
  });

  const disputes = useMemo(() => {
    const allDisputes: AdminDispute[] = [];
    for (const page of pages as Array<{data?: {disputes?: AdminDispute[]}}>) {
      const data = page?.data;
      if (data?.disputes) allDisputes.push(...data.disputes);
    }
    return allDisputes;
  }, [pages]);

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

  // ─── Actions ────────────────────────────────────────────

  const openDetail = async (dispute: AdminDispute) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const response = await disputesService.getDispute(dispute._id);
      if (response.success && response.data) {
        setSelectedDispute(response.data as unknown as AdminDispute);
      } else {
        setSelectedDispute(dispute);
      }
    } catch {
      setSelectedDispute(dispute);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDispute) return;
    try {
      const response = await disputesService.assign(selectedDispute._id);
      if (response.success) {
        showAlert('Success', 'Dispute assigned to you');
        void refetch();
        loadStats();
        setShowDetail(false);
      } else {
        showAlert('Error', (response as unknown as {message?: string}).message || 'Failed to assign');
      }
    } catch (err: unknown) {
      showAlert('Error', (err as {message?: string}).message || 'Failed to assign');
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolveReason.trim()) {
      showAlert('Error', 'Please provide a reason');
      return;
    }
    if (
      resolveDecision === 'partial_refund' &&
      (!resolveAmount.trim() || isNaN(parseFloat(resolveAmount)) || parseFloat(resolveAmount) <= 0)
    ) {
      showAlert('Error', 'Please enter a valid refund amount');
      return;
    }

    setResolveLoading(true);
    try {
      const response = await disputesService.resolve(selectedDispute._id, {
        decision: resolveDecision,
        amount: resolveDecision === 'partial_refund' ? Number(resolveAmount) : undefined,
        reason: resolveReason,
      });

      if (response.success) {
        showAlert(
          'Success',
          `Dispute ${resolveDecision === 'reject' ? 'rejected' : 'resolved with refund'}`
        );
        setShowResolve(false);
        setShowDetail(false);
        setResolveReason('');
        setResolveAmount('');
        void refetch();
        loadStats();
      } else {
        showAlert('Error', (response as unknown as {message?: string}).message || 'Failed to resolve');
      }
    } catch (err: unknown) {
      showAlert('Error', (err as {message?: string}).message || 'Failed to resolve');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedDispute || !escalateReason.trim()) {
      showAlert('Error', 'Please provide an escalation reason');
      return;
    }

    setEscalateLoading(true);
    try {
      const response = await disputesService.escalate(selectedDispute._id, escalateReason.trim());
      if (response.success) {
        showAlert('Success', 'Dispute escalated');
        setShowEscalateModal(false);
        setShowDetail(false);
        setEscalateReason('');
        void refetch();
        loadStats();
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to escalate');
    } finally {
      setEscalateLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedDispute || !noteText.trim()) return;
    try {
      await disputesService.addNote(selectedDispute._id, noteText.trim());
      showAlert('Success', 'Note added');
      setShowNoteModal(false);
      setNoteText('');
      // Refresh detail
      openDetail(selectedDispute);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to add note');
    }
  };

  const handleSearch = () => {
    // Debounced search update triggers refetch via useInfiniteQuery queryKey
  };

  // ─── Stats Row ──────────────────────────────────────────

  const renderStats = () => {
    if (!stats) return null;
    return (
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderLeftColor: colors.error }]}>
          <Text style={s.statValue}>{stats.open ?? 0}</Text>
          <Text style={s.statLabel}>Open</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: colors.warning }]}>
          <Text style={s.statValue}>{stats.underReview ?? 0}</Text>
          <Text style={s.statLabel}>Reviewing</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: colors.purple }]}>
          <Text style={s.statValue}>{stats.escalated ?? 0}</Text>
          <Text style={s.statLabel}>Escalated</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: colors.success }]}>
          <Text style={s.statValue}>{stats.resolvedToday ?? 0}</Text>
          <Text style={s.statLabel}>Resolved Today</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: colors.info }]}>
          <Text style={s.statValue}>{stats.avgResolutionHours ?? 0}h</Text>
          <Text style={s.statLabel}>Avg Resolution</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: colors.indigo }]}>
          <Text style={s.statValue}>{stats.refundRate ?? 0}%</Text>
          <Text style={s.statLabel}>Refund Rate</Text>
        </View>
      </View>
    );
  };

  // ─── Filters ────────────────────────────────────────────

  const renderFilters = () => (
    <View style={s.filterSection}>
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by dispute # or order #..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
        {STATUS_OPTIONS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[s.chip, filterStatus === status && s.chipActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[s.chipText, filterStatus === status && s.chipTextActive]}>
              {status === 'all' ? 'All Status' : STATUS_LABELS[status] || status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
        {PRIORITY_OPTIONS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.chip, filterPriority === p && s.chipActive]}
            onPress={() => setFilterPriority(p)}
          >
            <Text style={[s.chipText, filterPriority === p && s.chipTextActive]}>
              {p === 'all' ? 'All Priority' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ─── Dispute Card ───────────────────────────────────────

  const renderDisputeCard = useCallback(({ item }: { item: AdminDispute }) => {
    const statusColor = STATUS_COLORS[item.status] || Colors.light.muted;
    const priorityColor = PRIORITY_COLORS[item.priority] || Colors.light.muted;
    const userName =
      typeof item.user === 'object'
        ? item.user?.profile?.firstName
          ? `${item.user.profile.firstName} ${item.user.profile?.lastName || ''}`.trim()
          : item.user?.phoneNumber || 'Unknown'
        : 'User';

    return (
      <TouchableOpacity style={s.card} onPress={() => openDetail(item)}>
        <View style={s.cardHeader}>
          <Text style={s.disputeNumber}>{item.disputeNumber}</Text>
          <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>

        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <Ionicons name="person-outline" size={14} color={Colors.light.mutedDark} />
            <Text style={s.cardRowText}>{userName}</Text>
          </View>
          <View style={s.cardRow}>
            <Ionicons name="receipt-outline" size={14} color={Colors.light.mutedDark} />
            <Text style={s.cardRowText}>Order: {item.targetRef}</Text>
          </View>
          <View style={s.cardRow}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.light.mutedDark} />
            <Text style={s.cardRowText}>{REASON_LABELS[item.reason] || item.reason}</Text>
          </View>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.amountText}>{item.amount ?? 0} coins</Text>
          <View style={[s.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={s.dateText}>{format(new Date(item.createdAt), 'MMM dd, HH:mm')}</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  // ─── Detail Modal ───────────────────────────────────────

  const renderDetailModal = () => {
    const d = selectedDispute;
    if (!d) return null;
    const isResolvable = ['open', 'under_review', 'escalated'].includes(d.status);

    return (
      <Modal visible={showDetail} animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>{d.disputeNumber}</Text>
            <View style={{ width: 24 }} />
          </View>

          {detailLoading ? (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={s.modalBody} contentContainerStyle={{ paddingBottom: 100 }}>
              {/* Status + Priority */}
              <View style={s.detailRow}>
                <View
                  style={[
                    s.badge,
                    { backgroundColor: (STATUS_COLORS[d.status] || '#999') + '20' },
                  ]}
                >
                  <Text style={[s.badgeText, { color: STATUS_COLORS[d.status] || '#999' }]}>
                    {STATUS_LABELS[d.status] || d.status}
                  </Text>
                </View>
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: (PRIORITY_COLORS[d.priority] || '#999') + '20',
                      marginLeft: 8,
                    },
                  ]}
                >
                  <Text
                    style={[s.badgeText, { color: PRIORITY_COLORS[d.priority] || '#999' }]}
                  >
                    {d.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Info */}
              <View style={s.infoSection}>
                <InfoRow label="Reason" value={REASON_LABELS[d.reason] || d.reason} />
                <InfoRow label="Amount" value={`${d.amount} coins`} />
                <InfoRow label="Order" value={d.targetRef} />
                <InfoRow
                  label="Created"
                  value={format(new Date(d.createdAt), 'MMM dd yyyy, HH:mm')}
                />
                <InfoRow
                  label="Auto-Resolve"
                  value={format(new Date(d.autoResolveAt), 'MMM dd yyyy, HH:mm')}
                />
                {d.assignedTo && (
                  <InfoRow
                    label="Assigned To"
                    value={
                      typeof d.assignedTo === 'object'
                        ? d.assignedTo.name || d.assignedTo.email
                        : d.assignedTo
                    }
                  />
                )}
              </View>

              {/* Description */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Description</Text>
                <Text style={s.descText}>{d.description}</Text>
              </View>

              {/* Evidence */}
              {d.evidence.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Evidence ({d.evidence.length})</Text>
                  {d.evidence.map((e, i) => (
                    <View key={i} style={s.evidenceItem}>
                      <Text style={s.evidenceType}>
                        {e.submitterType} — {format(new Date(e.submittedAt), 'MMM dd, HH:mm')}
                      </Text>
                      <Text style={s.evidenceDesc}>{e.description}</Text>
                      {e.attachments.length > 0 && (
                        <Text style={s.attachmentCount}>
                          {e.attachments.length} attachment(s)
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Merchant Response */}
              {d.merchantResponse && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Merchant Response</Text>
                  <Text style={s.descText}>{d.merchantResponse.response}</Text>
                  <Text style={s.dateText}>
                    {format(new Date(d.merchantResponse.respondedAt), 'MMM dd yyyy, HH:mm')}
                  </Text>
                </View>
              )}

              {/* Resolution */}
              {d.resolution && (
                <View
                  style={[
                    s.section,
                    {
                      backgroundColor:
                        d.resolution.decision === 'reject'
                          ? Colors.light.errorLight
                          : Colors.light.successLight,
                      borderRadius: 10,
                      padding: 12,
                    },
                  ]}
                >
                  <Text style={s.sectionTitle}>Resolution</Text>
                  <InfoRow
                    label="Decision"
                    value={d.resolution.decision.replace('_', ' ').toUpperCase()}
                  />
                  <InfoRow label="Amount" value={`${d.resolution.amount} coins`} />
                  <InfoRow label="Reason" value={d.resolution.reason} />
                  <InfoRow
                    label="Resolved At"
                    value={format(new Date(d.resolution.resolvedAt), 'MMM dd yyyy, HH:mm')}
                  />
                </View>
              )}

              {/* Timeline */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Timeline</Text>
                {d.timeline.map((t, i) => (
                  <View key={i} style={s.timelineItem}>
                    <View style={s.timelineDot} />
                    <View style={s.timelineContent}>
                      <Text style={s.timelineAction}>{t.action.replace(/_/g, ' ')}</Text>
                      {t.details && <Text style={s.timelineDetails}>{t.details}</Text>}
                      <Text style={s.timelineTime}>
                        {t.performerType} — {format(new Date(t.timestamp), 'MMM dd, HH:mm')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Actions */}
              {isResolvable && (
                <View style={s.actionSection}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: Colors.light.info }]}
                    onPress={handleAssign}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#fff" />
                    <Text style={s.actionBtnText}>Assign to Me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: Colors.light.success }]}
                    onPress={() => {
                      setResolveDecision('refund');
                      setShowResolve(true);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={s.actionBtnText}>Resolve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: Colors.light.purple }]}
                    onPress={() => {
                      setEscalateReason('');
                      setShowEscalateModal(true);
                    }}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={16} color="#fff" />
                    <Text style={s.actionBtnText}>Escalate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: Colors.light.mutedDark }]}
                    onPress={() => setShowNoteModal(true)}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={s.actionBtnText}>Add Note</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>

        {/* Resolve Sub-Modal */}
        <Modal
          visible={showResolve}
          transparent
          animationType="fade"
          onRequestClose={() => setShowResolve(false)}
        >
          <View style={s.overlay}>
            <View style={s.resolveModal}>
              <Text style={s.resolveTitle}>Resolve Dispute</Text>

              <Text style={s.inputLabel}>Decision</Text>
              <View style={s.decisionRow}>
                {(['refund', 'reject', 'partial_refund'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      s.decisionChip,
                      resolveDecision === d && s.decisionChipActive,
                    ]}
                    onPress={() => setResolveDecision(d)}
                  >
                    <Text
                      style={[
                        s.decisionChipText,
                        resolveDecision === d && s.decisionChipTextActive,
                      ]}
                    >
                      {d === 'partial_refund' ? 'Partial' : d.charAt(0).toUpperCase() + d.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {resolveDecision === 'partial_refund' && (
                <>
                  <Text style={s.inputLabel}>Refund Amount (coins)</Text>
                  <TextInput
                    style={s.input}
                    value={resolveAmount}
                    onChangeText={setResolveAmount}
                    keyboardType="numeric"
                    placeholder={`Max: ${selectedDispute?.amount || 0}`}
                  />
                </>
              )}

              <Text style={s.inputLabel}>Reason</Text>
              <TextInput
                style={[s.input, { height: 80 }]}
                value={resolveReason}
                onChangeText={setResolveReason}
                multiline
                placeholder="Explain the decision..."
              />

              <View style={s.resolveActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowResolve(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmBtn, resolveLoading && { opacity: 0.6 }]}
                  onPress={handleResolve}
                  disabled={resolveLoading}
                >
                  {resolveLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.confirmBtnText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Note Sub-Modal */}
        <Modal
          visible={showNoteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNoteModal(false)}
        >
          <View style={s.overlay}>
            <View style={s.resolveModal}>
              <Text style={s.resolveTitle}>Add Note</Text>
              <TextInput
                style={[s.input, { height: 100 }]}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                placeholder="Internal note..."
              />
              <View style={s.resolveActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowNoteModal(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmBtn} onPress={handleAddNote}>
                  <Text style={s.confirmBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Escalate Reason Sub-Modal */}
        <Modal
          visible={showEscalateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEscalateModal(false)}
        >
          <View style={s.overlay}>
            <View style={s.resolveModal}>
              <Text style={s.resolveTitle}>Escalate Dispute</Text>
              <Text style={s.inputLabel}>Escalation Reason</Text>
              <TextInput
                style={[s.input, { height: 80 }]}
                value={escalateReason}
                onChangeText={setEscalateReason}
                multiline
                placeholder="Why is this dispute being escalated?"
              />
              <View style={s.resolveActions}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setShowEscalateModal(false)}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmBtn, escalateLoading && { opacity: 0.6 }]}
                  onPress={handleEscalate}
                  disabled={escalateLoading}
                >
                  {escalateLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.confirmBtnText}>Escalate</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Modal>
    );
  };

  // ─── Main Render ────────────────────────────────────────

  return (
    <View style={s.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={s.pageTitle}>Dispute Management</Text>
      </View>

      {renderStats()}
      {renderFilters()}

      {isLoading && !refreshing ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item: AdminDispute) => item._id}
          renderItem={renderDisputeCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator size="small" style={{ padding: 16 }} /> : null
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.light.muted} />
              <Text style={s.emptyText}>No disputes found</Text>
            </View>
          }
          contentContainerStyle={
            disputes.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: 20 }
          }
        />
      )}

      {renderDetailModal()}
    </View>
  );
}

// ─── Helper Component ─────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

