import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { adminTrialsService, FraudAlert, FraudSignalType } from '../../services/api/trials';
import { Colors } from '@/constants/Colors';
import { socketService } from '../../services/socket';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/fraud-alerts.styles';

type SignalFilter = 'all' | 'geo_mismatch' | 'instant_completion' | 'velocity_abuse';

const DEFAULT_SIGNAL_STYLE = { bg: '#F3F4F6', text: '#6B7280', icon: 'warning' };

const SIGNAL_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  geo_mismatch: { bg: '#FEE2E2', text: '#DC2626', icon: 'location' },
  instant_completion: { bg: '#FEF3C7', text: '#D97706', icon: 'flash' },
  velocity_abuse: { bg: '#FEE2E2', text: '#DC2626', icon: 'alert-circle' },
  duplicate_trial_month: { bg: '#E0E7FF', text: '#4338CA', icon: 'copy' },
  geo_implausible: { bg: '#FEE2E2', text: '#DC2626', icon: 'navigate' },
  scan_geo_missing: { bg: '#FEF3C7', text: '#D97706', icon: 'location-outline' },
};

const SIGNAL_LABELS: Record<string, string> = {
  geo_mismatch: 'Geo Mismatch',
  instant_completion: 'Instant Completion',
  velocity_abuse: 'Velocity Abuse',
  duplicate_trial_month: 'Duplicate Trial',
  geo_implausible: 'Geo Implausible',
  scan_geo_missing: 'Scan Geo Missing',
};



// PERF: Extract memoized FraudAlertCard component
const FraudAlertCard = React.memo(
  ({
    item,
    onView,
    onSuspend,
    actionLoading,
  }: {
    item: FraudAlert;
    onView: (item: FraudAlert) => void;
    onSuspend: (userId: string) => void;
    actionLoading: boolean;
  }) => {
    if (!item) return null;

    const userName = item.userId?.name || 'Unknown';
    const userInitials = userName.slice(0, 2).toUpperCase();
    const trialName = item.trialId?.name || 'Unknown Trial';
    const merchantName = item.merchantId?.name || '—';
    const alertDate = item.createdAt ? format(new Date(item.createdAt), 'MMM d, HH:mm') : '—';
    const signals = item.fraudSignals || [];

    return (
      <View style={s.alertCard}>
        {/* Header */}
        <View style={s.alertHeader}>
          <View style={s.userInfo}>
            <View style={s.userBadge}>
              <Text style={s.userBadgeText}>{userInitials}</Text>
            </View>
            <View style={s.userDetails}>
              <Text style={s.trialTitle} numberOfLines={1}>
                {trialName}
              </Text>
              <Text style={s.merchantName}>{merchantName}</Text>
            </View>
          </View>
          <Text style={s.timestamp}>{alertDate}</Text>
        </View>

        {/* Signals */}
        <View style={s.signalsContainer}>
          {signals.map((signal, idx) => {
            const colors = SIGNAL_COLORS[signal] || DEFAULT_SIGNAL_STYLE;
            return (
              <View key={idx} style={[s.signalTag, { backgroundColor: colors.bg }]}>
                <Ionicons name={colors.icon as unknown as keyof typeof Ionicons.glyphMap} size={12} color={colors.text} />
                <Text style={[s.signalText, { color: colors.text }]}>
                  {SIGNAL_LABELS[signal] || signal}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={s.actionsContainer}>
          <TouchableOpacity
            style={[s.actionButton, s.viewButton]}
            onPress={() => onView(item)}
          >
            <Ionicons name="eye-outline" size={14} color="#3B82F6" />
            <Text style={s.viewButtonText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionButton, s.suspendButton]}
            onPress={() => item.userId?._id && onSuspend(item.userId._id)}
            disabled={actionLoading}
          >
            <Ionicons name="ban" size={14} color="#DC2626" />
            <Text style={s.suspendButtonText}>Suspend</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if alert data changes
    return (
      prevProps.item._id === nextProps.item._id &&
      prevProps.actionLoading === nextProps.actionLoading
    );
  }
);

FraudAlertCard.displayName = 'FraudAlertCard';

export default function FraudAlertsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<SignalFilter>('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const [fetchError, setFetchError] = useState(false);
  // M12 FIX: pagination state
  const [alertPage, setAlertPage] = useState(1);
  const [alertHasMore, setAlertHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // M16 FIX: suspend modal with user-entered reason
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const FRAUD_PAGE_SIZE = 20;

  // M12 FIX: paginated load (page=1 resets, append adds more)
  const loadAlerts = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (!append) setLoading(true);
        setFetchError(false);
        const response = await adminTrialsService.getFraudAlerts({
          page: pageNum,
          limit: FRAUD_PAGE_SIZE,
          signalType: filterType !== 'all' ? filterType : undefined,
        });
        if (response.success && response.data) {
          const newAlerts = response.data.alerts || [];
          setAlerts((prev) => (append ? [...prev, ...newAlerts] : newAlerts));
          const { page: p, pages } = response.data.pagination || {};
          setAlertPage(pageNum);
          setAlertHasMore((p || 0) < (pages || 0));
        } else {
          if (!append) setFetchError(true);
        }
      } catch (err) {
        logger.error('Failed to load fraud alerts:', err);
        if (!append) setFetchError(true);
      } finally {
        setLoading(false);
      }
    },
    [filterType]
  );

  const loadMoreAlerts = useCallback(async () => {
    if (loadingMore || !alertHasMore) return;
    setLoadingMore(true);
    await loadAlerts(alertPage + 1, true);
    setLoadingMore(false);
  }, [loadingMore, alertHasMore, alertPage, loadAlerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNewAlertCount(0);
    setFetchError(false);
    try {
      const response = await adminTrialsService.getFraudAlerts({
        page: 1,
        limit: FRAUD_PAGE_SIZE,
        signalType: filterType !== 'all' ? filterType : undefined,
      });
      if (response.success && response.data) {
        setAlerts(response.data.alerts || []);
        const { page: p, pages } = response.data.pagination || {};
        setAlertPage(1);
        setAlertHasMore((p || 0) < (pages || 0));
      } else {
        setFetchError(true);
      }
    } catch (err) {
      logger.error('Failed to refresh alerts:', err);
      setFetchError(true);
    } finally {
      setRefreshing(false);
    }
  }, [filterType]);

  // M16 FIX: open modal to collect real suspension reason instead of hardcoding it
  const handleSuspendUser = useCallback((userId: string) => {
    setSuspendUserId(userId);
    setSuspendReason('');
    setShowSuspendModal(true);
  }, []);

  const confirmSuspendUser = useCallback(async () => {
    if (!suspendUserId) return;
    if (!suspendReason.trim()) {
      showAlert('Required', 'Please enter a suspension reason');
      return;
    }
    setActionLoading(true);
    try {
      await adminTrialsService.suspendUser(suspendUserId, suspendReason.trim());
      setAlerts((prev) => prev.filter((a) => a.userId?._id !== suspendUserId));
      showAlert('Success', 'User suspended');
      setShowSuspendModal(false);
      setSuspendUserId(null);
    } catch (err) {
      showAlert('Error', 'Failed to suspend user');
      logger.error('Suspend error:', err);
    } finally {
      setActionLoading(false);
    }
  }, [suspendUserId, suspendReason]);

  const handleViewAlert = useCallback((item: FraudAlert) => {
    const userName = item.userId?.name || item.userId?._id || 'Unknown';
    const trialName = item.trialId?.name || 'Unknown Trial';
    const dateStr = item.createdAt ? format(new Date(item.createdAt), 'PPp') : '—';
    showAlert(
      'Booking Details',
      `User: ${userName}\nTrial: ${trialName}\nDate: ${dateStr}\nSignals: ${(item.fraudSignals || []).join(', ') || 'None'}`
    );
  }, []);

  const renderEmptyState = useCallback(
    () => (
      <View style={s.emptyContainer}>
        {fetchError ? (
          <>
            <Ionicons name="cloud-offline" size={64} color="#EF4444" />
            <Text style={s.emptyTitle}>Failed to Load</Text>
            <Text style={s.emptySubtitle}>
              Could not fetch fraud alerts. Pull down to retry.
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="shield-checkmark" size={64} color={Colors.light.success} />
            <Text style={s.emptyTitle}>System is Clean</Text>
            <Text style={s.emptySubtitle}>No fraud alerts detected ✓</Text>
          </>
        )}
      </View>
    ),
    [fetchError]
  );

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [filterType, loadAlerts]);

  // Listen for anomaly:alert events emitted by anomalyDetectionJob.ts to 'admin-room'.
  useEffect(() => {
    const unsubscribe = socketService.onAnomalyAlert((alert) => {
      if (alert.severity === 'critical') {
        setNewAlertCount((c) => c + 1);
      }
      const ts = (alert as unknown as {detectedAt?: string}).detectedAt || alert.timestamp || new Date().toISOString();
      const mapped: FraudAlert = {
        _id: `socket-${Date.now()}`,
        userId: { _id: '', name: 'Live Alert' },
        trialId: { _id: '', name: alert.message || 'Live Detection' },
        merchantId: { _id: '', name: '—' },
        fraudSignals: [alert.type as FraudSignalType],
        status: 'pending',
        createdAt: ts,
      };
      setAlerts((prev) => [mapped, ...prev]);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#DC2626', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerContent}>
          <Text style={s.headerTitle}>Fraud Alerts</Text>
          <View
            style={[s.badgeContainer, alerts.length === 0 && { backgroundColor: '#10B981' }]}
          >
            <Text style={s.badgeText}>{alerts.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* LIVE indicator */}
      <View style={s.liveIndicator}>
        <View style={s.liveDot} />
        <Text style={s.liveText}>LIVE · Auto-refreshes every 60s</Text>
        {newAlertCount > 0 && (
          <View style={s.newBadge}>
            <Text style={s.newBadgeText}>{newAlertCount} new</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={s.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {(['all', 'geo_mismatch', 'instant_completion', 'velocity_abuse'] as const).map(
            (type) => (
              <TouchableOpacity
                key={type}
                style={[s.filterTab, filterType === type && s.filterTabActive]}
                onPress={() => setFilterType(type)}
              >
                <Text
                  style={[s.filterTabText, filterType === type && s.filterTabTextActive]}
                >
                  {type === 'all' ? 'All' : SIGNAL_LABELS[type]}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={({ item }) => (
            <FraudAlertCard
              item={item}
              onView={handleViewAlert}
              onSuspend={handleSuspendUser}
              actionLoading={actionLoading}
            />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.light.tint}
            />
          }
          scrollIndicatorInsets={{ right: 1 }}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          onScroll={() => setNewAlertCount(0)}
          onEndReached={loadMoreAlerts}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ padding: 16 }} color={Colors.light.tint} />
            ) : null
          }
        />
      )}

      {/* M16 FIX: Suspend user modal with real reason input */}
      <Modal visible={showSuspendModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              gap: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
              Suspend User
            </Text>
            <Text style={{ fontSize: 14, color: colors.icon }}>
              User: {suspendUserId?.slice(0, 12)}...
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                padding: 12,
                color: colors.text,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Enter suspension reason..."
              placeholderTextColor={colors.icon}
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              maxLength={300}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowSuspendModal(false);
                  setSuspendUserId(null);
                }}
                disabled={actionLoading}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: '#DC2626',
                  alignItems: 'center',
                }}
                onPress={confirmSuspendUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Suspend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
