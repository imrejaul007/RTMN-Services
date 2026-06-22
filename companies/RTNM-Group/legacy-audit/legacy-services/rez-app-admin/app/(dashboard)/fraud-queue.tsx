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
  useColorScheme,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNowStrict } from 'date-fns';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { usersService, FraudFlaggedUser, FraudQueueSummary } from '../../services/api/users';
import { s } from './styles/fraud-queue.styles';

type ReviewFilter = 'all' | 'pending' | 'cleared';

const AUTO_REFRESH_INTERVAL = 30000;

const EMPTY_SUMMARY: FraudQueueSummary = {
  all: 0,
  pending: 0,
  cleared: 0,
  suspended: 0,
};

function formatRelativeTime(value?: string) {
  if (!value) return 'Unknown';
  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

function getRiskTone(
  zScore: number | undefined,
  colors: typeof Colors.light
): { label: string; background: string; text: string } {
  if ((zScore ?? 0) >= 6) {
    return { label: 'Critical', background: colors.errorLight, text: colors.errorDark };
  }
  if ((zScore ?? 0) >= 4) {
    return { label: 'High Risk', background: colors.warningLight, text: colors.warningDeep };
  }
  return { label: 'Review', background: colors.infoLight, text: colors.infoDark };
}

export default function FraudQueueScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [items, setItems] = useState<FraudFlaggedUser[]>([]);
  const [summary, setSummary] = useState<FraudQueueSummary>(EMPTY_SUMMARY);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQueue = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await usersService.getFraudQueue('all');
      setItems(response.users);
      setSummary(response.summary);
      setLastRefreshed(new Date());
    } catch (err: any) {
      logger.error('[FraudQueue] Load error:', err.message);
      if (!silent) setError(err.message || 'Failed to load fraud queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    intervalRef.current = setInterval(() => loadQueue(true), AUTO_REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadQueue]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadQueue(true);
    setRefreshing(false);
  }, [loadQueue]);

  const updateLocalSummary = useCallback(
    (updater: (current: FraudQueueSummary) => FraudQueueSummary) => {
      setSummary((current) => updater(current));
    },
    []
  );

  const handleClearFlag = useCallback(
    async (userId: string) => {
      setProcessingId(userId);
      try {
        await usersService.clearFraudFlag(userId);
        const clearedAt = new Date().toISOString();
        setItems((prev) =>
          prev.map((item) =>
            item._id === userId
              ? {
                  ...item,
                  reviewStatus: 'cleared',
                  clearedAt,
                  fraudFlags: {
                    ...item.fraudFlags,
                    coinVelocity: {
                      ...item.fraudFlags?.coinVelocity,
                      cleared: true,
                      clearedAt,
                    },
                  },
                }
              : item
          )
        );
        updateLocalSummary((current) => ({
          ...current,
          pending: Math.max(0, current.pending - 1),
          cleared: current.cleared + 1,
        }));
        showAlert('Success', 'Fraud flag cleared');
      } catch (err: any) {
        showAlert('Error', err.message || 'Failed to clear flag');
      } finally {
        setProcessingId(null);
      }
    },
    [updateLocalSummary]
  );

  const openSuspendModal = useCallback((userId: string) => {
    setSuspendTargetId(userId);
    setSuspendReason('');
    setShowSuspendModal(true);
  }, []);

  const confirmSuspend = useCallback(async () => {
    if (!suspendTargetId) return;
    if (!suspendReason.trim()) {
      showAlert('Required', 'Please enter a suspension reason');
      return;
    }

    setProcessingId(suspendTargetId);
    setShowSuspendModal(false);
    try {
      await usersService.setSuspendStatus(suspendTargetId, true, suspendReason.trim());
      setItems((prev) =>
        prev.map((item) =>
          item._id === suspendTargetId ? { ...item, isSuspended: true, status: 'suspended' } : item
        )
      );
      updateLocalSummary((current) => ({
        ...current,
        suspended: current.suspended + 1,
      }));
      showAlert('Success', 'User suspended');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to suspend user');
    } finally {
      setProcessingId(null);
      setSuspendTargetId(null);
      setSuspendReason('');
    }
  }, [suspendReason, suspendTargetId, updateLocalSummary]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'pending'
            ? item.reviewStatus !== 'cleared'
            : item.reviewStatus === 'cleared';

      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [item.name, item.email, item.phoneNumber, item._id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filter, items, searchQuery]);

  const pendingCount = summary.pending;
  const healthLabel = pendingCount > 0 ? 'Needs review' : 'Healthy';

  const renderItem = useCallback(
    ({ item }: { item: FraudFlaggedUser }) => {
      const isCleared = item.reviewStatus === 'cleared';
      const isSuspended = item.isSuspended || item.status === 'suspended';
      const flaggedAt = item.fraudFlags?.coinVelocity?.flaggedAt ?? item.flaggedAt;
      const clearedAt = item.fraudFlags?.coinVelocity?.clearedAt ?? item.clearedAt;
      const zScore = item.fraudFlags?.coinVelocity?.zScore ?? item.zScore;
      const earnedLast24h = item.fraudFlags?.coinVelocity?.earnedLast24h ?? item.earnedLast24h;
      const riskTone = getRiskTone(zScore, colors);

      return (
        <View
          style={[
            s.card,
            {
              backgroundColor: colors.card,
              borderColor: isCleared ? colors.successLight : colors.border,
            },
          ]}
        >
          <View style={s.cardTopRow}>
            <View
              style={[
                s.initials,
                { backgroundColor: isCleared ? colors.successLight : colors.errorLight },
              ]}
            >
              <Text
                style={[
                  s.initialsText,
                  { color: isCleared ? colors.successDark : colors.errorDark },
                ]}
              >
                {(item.name ?? item.email ?? item.phoneNumber ?? '??').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={s.userInfo}>
              <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
                {item.name || item.phoneNumber || item.email || item._id.slice(0, 10)}
              </Text>
              <Text style={[s.metaText, { color: colors.icon }]} numberOfLines={1}>
                {item.email || item.phoneNumber || item._id}
              </Text>
            </View>
            <View
              style={[
                s.badge,
                {
                  backgroundColor: isCleared ? colors.successLight : riskTone.background,
                },
              ]}
            >
              <Text
                style={[
                  s.badgeText,
                  {
                    color: isCleared ? colors.successDark : riskTone.text,
                  },
                ]}
              >
                {isCleared ? 'Cleared' : riskTone.label}
              </Text>
            </View>
          </View>

          <View style={s.metricRow}>
            <View style={[s.metricCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[s.metricValue, { color: colors.text }]}>
                {earnedLast24h?.toLocaleString() ?? '0'}
              </Text>
              <Text style={[s.metricLabel, { color: colors.icon }]}>Coins in 24h</Text>
            </View>
            <View style={[s.metricCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[s.metricValue, { color: colors.errorDark }]}>
                {typeof zScore === 'number' ? zScore.toFixed(2) : '--'}
              </Text>
              <Text style={[s.metricLabel, { color: colors.icon }]}>Z-score</Text>
            </View>
          </View>

          <View style={[s.timelineCard, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={s.timelineRow}>
              <Ionicons name="time-outline" size={14} color={colors.icon} />
              <Text style={[s.timelineText, { color: colors.text }]}>
                Flagged {formatRelativeTime(flaggedAt)}
              </Text>
            </View>
            {isCleared && (
              <View style={s.timelineRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.successDark} />
                <Text style={[s.timelineText, { color: colors.text }]}>
                  Cleared {formatRelativeTime(clearedAt)}
                </Text>
              </View>
            )}
            {isSuspended && (
              <View style={s.timelineRow}>
                <Ionicons name="ban-outline" size={14} color={colors.errorDark} />
                <Text style={[s.timelineText, { color: colors.text }]}>User is suspended</Text>
              </View>
            )}
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[
                s.secondaryButton,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
              onPress={() => router.push(`/(dashboard)/users/${encodeURIComponent(item._id)}`)}
            >
              <Ionicons name="open-outline" size={16} color={colors.text} />
              <Text style={[s.secondaryButtonText, { color: colors.text }]}>Open User</Text>
            </TouchableOpacity>

            {!isCleared && (
              <TouchableOpacity
                style={[s.positiveButton, { backgroundColor: colors.successLight }]}
                onPress={() => handleClearFlag(item._id)}
                disabled={processingId === item._id}
              >
                {processingId === item._id ? (
                  <ActivityIndicator size="small" color={colors.successDark} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={colors.successDark}
                    />
                    <Text style={[s.positiveButtonText, { color: colors.successDark }]}>
                      Clear
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {!isSuspended && !isCleared && (
              <TouchableOpacity
                style={[s.negativeButton, { backgroundColor: colors.errorLight }]}
                onPress={() => openSuspendModal(item._id)}
                disabled={processingId === item._id}
              >
                <Ionicons name="ban" size={16} color={colors.errorDark} />
                <Text style={[s.negativeButtonText, { color: colors.errorDark }]}>
                  Suspend
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [colors, handleClearFlag, openSuspendModal, processingId, router]
  );

  const listHeader = (
    <View style={s.headerWrap}>
      <View
        style={[
          s.heroCard,
          {
            backgroundColor: colors.card,
            borderColor: pendingCount > 0 ? colors.warningLight : colors.successLight,
          },
        ]}
      >
        <View style={s.heroTopRow}>
          <View style={s.heroCopy}>
            <Text style={[s.screenTitle, { color: colors.text }]}>Fraud Queue</Text>
            <Text style={[s.screenSubtitle, { color: colors.icon }]}>
              Monitor coin-velocity flags, review suspicious users, and take action fast.
            </Text>
          </View>
          <TouchableOpacity
            style={[
              s.refreshButton,
              { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
            ]}
            onPress={() => loadQueue(true)}
          >
            <Ionicons name="refresh" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            s.liveStrip,
            {
              backgroundColor: pendingCount > 0 ? colors.warningLight : colors.successLight,
            },
          ]}
        >
          <View
            style={[
              s.liveDot,
              { backgroundColor: pendingCount > 0 ? colors.warningDark : colors.successDark },
            ]}
          />
          <Text
            style={[
              s.liveStripText,
              { color: pendingCount > 0 ? colors.warningDeep : colors.successDeep },
            ]}
          >
            Auto-refresh every 30s. Last sync{' '}
            {formatDistanceToNowStrict(lastRefreshed, { addSuffix: true })}.
          </Text>
          <View
            style={[
              s.healthPill,
              {
                backgroundColor: pendingCount > 0 ? colors.errorLight : colors.successLight2,
              },
            ]}
          >
            <Text
              style={[
                s.healthPillText,
                {
                  color: pendingCount > 0 ? colors.errorDark : colors.greenDark,
                },
              ]}
            >
              {healthLabel}
            </Text>
          </View>
        </View>

        <View style={s.summaryGrid}>
          {[
            { label: 'All', value: summary.all, tone: colors.text },
            { label: 'Pending', value: summary.pending, tone: colors.errorDark },
            { label: 'Cleared', value: summary.cleared, tone: colors.successDark },
            { label: 'Suspended', value: summary.suspended, tone: colors.warningDeep },
          ].map((entry) => (
            <View
              key={entry.label}
              style={[
                s.summaryCard,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              ]}
            >
              <Text style={[s.summaryValue, { color: entry.tone }]}>{entry.value}</Text>
              <Text style={[s.summaryLabel, { color: colors.icon }]}>{entry.label}</Text>
            </View>
          ))}
        </View>

        <View
          style={[
            s.searchShell,
            { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.icon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, email, phone, or user id"
            placeholderTextColor={colors.icon}
            style={[s.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.filterRow}>
          {(['all', 'pending', 'cleared'] as ReviewFilter[]).map((value) => {
            const active = filter === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  s.filterChip,
                  {
                    backgroundColor: active ? colors.tint : colors.backgroundSecondary,
                    borderColor: active ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => setFilter(value)}
              >
                <Text
                  style={[s.filterChipText, { color: active ? colors.card : colors.text }]}
                >
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>
          Loading fraud review queue…
        </Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[s.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[s.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => loadQueue()}
        >
          <Text style={s.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View
            style={[
              s.emptyState,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[s.emptyIconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="shield-checkmark" size={28} color={colors.successDark} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {searchQuery
                ? 'No matching users found'
                : filter === 'cleared'
                  ? 'No cleared reviews yet'
                  : 'No active fraud flags'}
            </Text>
            <Text style={[s.emptySubtitle, { color: colors.icon }]}>
              {searchQuery
                ? 'Try a different user identifier or clear the search.'
                : filter === 'cleared'
                  ? 'Resolved reviews will appear here once flags are cleared.'
                  : 'The queue is empty right now, which means coin velocity checks are clean.'}
            </Text>
          </View>
        }
      />

      <Modal visible={showSuspendModal} transparent animationType="slide">
        <View style={[s.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Suspend User</Text>
            <Text style={[s.modalSubtitle, { color: colors.icon }]}>
              Record a clear operational reason before suspending this account.
            </Text>
            <TextInput
              style={[s.reasonInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Suspension reason"
              placeholderTextColor={colors.icon}
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={[s.modalSecondary, { borderColor: colors.border }]}
                onPress={() => {
                  setShowSuspendModal(false);
                  setSuspendTargetId(null);
                  setSuspendReason('');
                }}
              >
                <Text style={[s.modalSecondaryText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalPrimary, { backgroundColor: colors.errorDark }]}
                onPress={confirmSuspend}
                disabled={processingId !== null}
              >
                {processingId !== null ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.modalPrimaryText}>Suspend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

