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
  Image,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  adminTrialsService,
  PendingTrial,
  FraudAlert,
  BreakageStats,
  DiscoveryCampaign,
  TrialBundle,
} from '@/services/api/trials';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '@/utils/alert';
import { s } from './styles/trial-approvals.styles';

type TabKey = 'approvals' | 'fraud' | 'breakage' | 'governor' | 'campaigns' | 'bundles';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'approvals', label: 'Approvals', icon: 'checkmark-circle' },
  { key: 'fraud', label: 'Fraud', icon: 'warning' },
  { key: 'breakage', label: 'Breakage', icon: 'trending-down' },
  { key: 'governor', label: 'Governor', icon: 'shield' },
  { key: 'campaigns', label: 'Campaigns', icon: 'megaphone' },
  { key: 'bundles', label: 'Bundles', icon: 'cube' },
];

export default function TrialApprovalsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('approvals');
  const insets = useSafeAreaInsets();

  // ── Approvals state ──
  const [trials, setTrials] = useState<PendingTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<PendingTrial | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fraud state ──
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [fraudLoading, setFraudLoading] = useState(false);

  // ── Breakage state ──
  const [breakageStats, setBreakageStats] = useState<BreakageStats | null>(null);
  const [breakageLoading, setBreakageLoading] = useState(false);

  // ── Governor state ──
  const [governorLoading, setGovernorLoading] = useState(false);

  // ── Campaigns state ──
  const [campaigns, setCampaigns] = useState<DiscoveryCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // ── Bundles state ──
  const [bundles, setBundles] = useState<TrialBundle[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);

  // ═══════════ DATA LOADERS ═══════════

  const loadTrials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminTrialsService.getPendingTrials({ page: 1, limit: 50 });
      if (response.success && response.data) {
        setTrials(response.data.trials || []);
      }
    } catch (err) {
      logger.error('Failed to load trials:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFraudAlerts = useCallback(async () => {
    try {
      setFraudLoading(true);
      const response = await adminTrialsService.getFraudAlerts({ page: 1, limit: 50 });
      if (response.success && response.data) {
        setFraudAlerts(response.data.alerts || []);
      }
    } catch (err) {
      logger.error('Failed to load fraud alerts:', err);
    } finally {
      setFraudLoading(false);
    }
  }, []);

  const loadBreakage = useCallback(async () => {
    try {
      setBreakageLoading(true);
      const response = await adminTrialsService.getBreakageStats();
      if (response.success && response.data) {
        setBreakageStats(response.data.stats || null);
      }
    } catch (err) {
      logger.error('Failed to load breakage stats:', err);
    } finally {
      setBreakageLoading(false);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaignsLoading(true);
      const response = await adminTrialsService.listDiscoveryCampaigns();
      if (response.success && response.data) {
        setCampaigns(response.data.campaigns || []);
      }
    } catch (err) {
      logger.error('Failed to load campaigns:', err);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const loadBundles = useCallback(async () => {
    try {
      setBundlesLoading(true);
      const response = await adminTrialsService.listBundles();
      if (response.success && response.data) {
        setBundles(response.data.bundles || []);
      }
    } catch (err) {
      logger.error('Failed to load bundles:', err);
    } finally {
      setBundlesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrials();
  }, [loadTrials]);

  useEffect(() => {
    if (activeTab === 'fraud' && fraudAlerts.length === 0 && !fraudLoading) loadFraudAlerts();
    if (activeTab === 'breakage' && !breakageStats && !breakageLoading) loadBreakage();
    if (activeTab === 'campaigns' && campaigns.length === 0 && !campaignsLoading) loadCampaigns();
    if (activeTab === 'bundles' && bundles.length === 0 && !bundlesLoading) loadBundles();
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'approvals') await loadTrials();
      else if (activeTab === 'fraud') await loadFraudAlerts();
      else if (activeTab === 'breakage') await loadBreakage();
      else if (activeTab === 'campaigns') await loadCampaigns();
      else if (activeTab === 'bundles') await loadBundles();
    } finally {
      setRefreshing(false);
    }
  }, [activeTab]);

  // ═══════════ APPROVAL ACTIONS ═══════════

  const handleApprove = async (trial: PendingTrial) => {
    const confirmed = await showConfirm(
      'Approve Trial?',
      `Are you sure you want to approve "${trial.title}" from ${trial.merchantName}?`
    );
    if (confirmed) await doApprove(trial);
  };

  const doApprove = async (trial: PendingTrial) => {
    setActionLoading(true);
    try {
      const response = await adminTrialsService.approveTrial(trial._id, { approved: true });
      if (response.success) {
        setTrials((prev) => prev.filter((t) => t._id !== trial._id));
        setShowDetail(false);
        showAlert('Success', 'Trial approved!');
      }
    } catch (err) {
      showAlert('Error', 'Failed to approve trial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      showAlert('Required', 'Please provide a rejection reason');
      return;
    }
    doReject();
  };

  const doReject = async () => {
    if (!selectedTrial) return;
    setActionLoading(true);
    try {
      const response = await adminTrialsService.approveTrial(selectedTrial._id, {
        approved: false,
        reason: rejectReason,
      });
      if (response.success) {
        setTrials((prev) => prev.filter((t) => t._id !== selectedTrial._id));
        setShowRejectModal(false);
        setRejectReason('');
        setShowDetail(false);
        showAlert('Success', 'Trial rejected');
      }
    } catch (err) {
      showAlert('Error', 'Failed to reject trial');
    } finally {
      setActionLoading(false);
    }
  };

  // ═══════════ GOVERNOR ACTIONS ═══════════

  const executeGovernorAction = async (action: string, label: string, params?: any) => {
    const confirmed = await showConfirm(
      'Confirm Action',
      `Execute "${label}"? This will take effect immediately.`
    );
    if (!confirmed) return;

    setGovernorLoading(true);
    try {
      const response = await adminTrialsService.executeGovernorAction({ action, ...params });
      if (response.success) {
        showAlert('Success', (response.data as unknown as {message?: string})?.message || `${label} executed`);
      }
    } catch (err) {
      showAlert('Error', `Failed to execute ${label}`);
    } finally {
      setGovernorLoading(false);
    }
  };

  // ═══════════ BUNDLE ACTIONS ═══════════

  const toggleBundleActive = async (bundle: TrialBundle) => {
    try {
      const response = await adminTrialsService.updateBundle(bundle._id, {
        isActive: !bundle.isActive,
      });
      if (response.success) {
        setBundles((prev) =>
          prev.map((b) => (b._id === bundle._id ? { ...b, isActive: !b.isActive } : b))
        );
      }
    } catch (err) {
      showAlert('Error', 'Failed to update bundle');
    }
  };

  const toggleBundleFeatured = async (bundle: TrialBundle) => {
    try {
      const response = await adminTrialsService.updateBundle(bundle._id, {
        featured: !bundle.featured,
      });
      if (response.success) {
        setBundles((prev) =>
          prev.map((b) => (b._id === bundle._id ? { ...b, featured: !b.featured } : b))
        );
      }
    } catch (err) {
      showAlert('Error', 'Failed to update bundle');
    }
  };

  // ═══════════ RENDERERS ═══════════

  const renderEmptyState = (message: string) => (
    <View style={s.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={64} color={Colors.light.success} />
      <Text style={s.emptyTitle}>{message}</Text>
    </View>
  );

  const renderTrial = ({ item }: { item: PendingTrial }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => {
        setSelectedTrial(item);
        setShowDetail(true);
      }}
      activeOpacity={0.7}
    >
      <View style={s.imageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0].url }}
            style={s.trialImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.trialImage, s.imagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color={Colors.light.secondaryText} />
          </View>
        )}
      </View>
      <View style={s.cardBody}>
        <Text style={s.merchantName}>{item.merchantName}</Text>
        <Text style={s.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={s.detailsRow}>
          <View style={s.detailChip}>
            <Text style={s.detailLabel}>Category</Text>
            <Text style={s.detailValue}>{item.category}</Text>
          </View>
          <View style={s.detailChip}>
            <Text style={s.detailLabel}>Coins</Text>
            <Text style={s.detailValue}>{item.trialCoinPrice}</Text>
          </View>
          <View style={s.detailChip}>
            <Text style={s.detailLabel}>Fee</Text>
            <Text style={s.detailValue}>₹{item.commitmentFee}</Text>
          </View>
        </View>
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.actionBtn, s.rejectBtnStyle]}
            onPress={() => {
              setSelectedTrial(item);
              setShowRejectModal(true);
            }}
          >
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={s.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, s.approveBtnStyle]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={s.approveBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFraudAlert = ({ item }: { item: FraudAlert }) => {
    const userName = item.userId?.name || item.userId?.email || 'Unknown User';
    const trialName = item.trialId?.name || item.trialId?.category || 'Unknown Trial';
    const merchantName = item.merchantId?.name || 'Unknown Merchant';
    const signals = item.fraudSignals || [];

    return (
      <View style={s.card}>
        <View style={s.cardBody}>
          <View style={s.fraudHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{userName}</Text>
              <Text style={s.merchantName}>
                {trialName} - {merchantName}
              </Text>
            </View>
            <Ionicons name="alert-circle" size={24} color={Colors.light.error} />
          </View>
          <View style={s.signalsRow}>
            {signals.map((signal, i) => (
              <View key={i} style={s.signalBadge}>
                <Text style={s.signalText}>
                  {signal === 'geo_mismatch'
                    ? 'Geo Mismatch'
                    : signal === 'instant_completion'
                      ? 'Instant Complete'
                      : signal === 'velocity_abuse'
                        ? 'Velocity Abuse'
                        : signal}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.dateText}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          {item.userId?._id && (
            <TouchableOpacity
              style={[s.actionBtn, s.rejectBtnStyle, { marginTop: 8 }]}
              onPress={async () => {
                const confirmed = await showConfirm(
                  'Suspend User?',
                  `Suspend ${userName} for fraud?`
                );
                if (!confirmed) return;
                try {
                  await adminTrialsService.suspendUser(item.userId._id, 'Fraud detected');
                  showAlert('Success', 'User suspended');
                } catch {
                  showAlert('Error', 'Failed to suspend user');
                }
              }}
            >
              <Ionicons name="ban" size={14} color="#EF4444" />
              <Text style={s.rejectBtnText}>Suspend User</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ═══════════ TAB CONTENT ═══════════

  const renderApprovalsTab = () => {
    if (loading && !refreshing) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      );
    }
    return (
      <FlatList
        data={trials}
        renderItem={renderTrial}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={renderEmptyState('No Pending Trials')}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderFraudTab = () => {
    if (fraudLoading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      );
    }
    return (
      <FlatList
        data={fraudAlerts}
        renderItem={renderFraudAlert}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={renderEmptyState('No Fraud Alerts')}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderBreakageTab = () => {
    if (breakageLoading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      );
    }
    if (!breakageStats) {
      return renderEmptyState('No Breakage Data');
    }
    return (
      <ScrollView
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Total */}
        <View style={s.statCard}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.statGradient}>
            <Ionicons name="trending-down" size={28} color="#FFF" />
            <Text style={s.statValue}>
              {breakageStats.totalBreakage?.toLocaleString() ?? 0}
            </Text>
            <Text style={s.statLabel}>Total Expired Coins (30d)</Text>
          </LinearGradient>
        </View>

        {/* Monthly */}
        {breakageStats.monthly && breakageStats.monthly.length > 0 && (
          <View style={s.card}>
            <View style={s.cardBody}>
              <Text style={s.sectionTitle}>Monthly Breakage</Text>
              {breakageStats.monthly.map((m) => (
                <View key={m.month} style={s.statRow}>
                  <Text style={s.statRowLabel}>{m.month}</Text>
                  <Text style={s.statRowValue}>{m.amount?.toLocaleString() ?? 0} coins</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Daily */}
        {breakageStats.daily && breakageStats.daily.length > 0 && (
          <View style={s.card}>
            <View style={s.cardBody}>
              <Text style={s.sectionTitle}>Daily Breakage (Last 30 Days)</Text>
              {breakageStats.daily.slice(-10).map((d) => (
                <View key={d.date} style={s.statRow}>
                  <Text style={s.statRowLabel}>{d.date}</Text>
                  <Text style={s.statRowValue}>{d.amount?.toLocaleString() ?? 0} coins</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderGovernorTab = () => {
    const actions = [
      {
        action: 'pause_bookings',
        label: 'Pause Bookings',
        desc: 'Stop new trial bookings globally',
        icon: 'pause-circle' as const,
        color: '#F59E0B',
      },
      {
        action: 'pause_purchases',
        label: 'Pause Coin Purchases',
        desc: 'Stop trial coin purchases globally',
        icon: 'card' as const,
        color: '#F97316',
      },
      {
        action: 'reduce_exposure',
        label: 'Reduce Exposure',
        desc: 'Lower trial offer visibility',
        icon: 'eye-off' as const,
        color: '#8B5CF6',
      },
      {
        action: 'freeze_merchant',
        label: 'Freeze Merchant',
        desc: 'Freeze a specific merchant',
        icon: 'snow' as const,
        color: '#3B82F6',
      },
      {
        action: 'unfreeze_merchant',
        label: 'Unfreeze Merchant',
        desc: 'Restore a frozen merchant',
        icon: 'sunny' as const,
        color: '#10B981',
      },
      {
        action: 'clawback',
        label: 'Clawback Coins',
        desc: 'Reclaim coins from fraudulent users',
        icon: 'arrow-undo-circle' as const,
        color: '#EF4444',
      },
    ];

    return (
      <ScrollView
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sectionSubtitle}>Emergency controls for the trial coin economy</Text>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.action}
            style={s.card}
            onPress={() => executeGovernorAction(a.action, a.label)}
            disabled={governorLoading}
            activeOpacity={0.7}
          >
            <View style={s.cardBody}>
              <View style={s.governorRow}>
                <View style={[s.governorIcon, { backgroundColor: a.color + '20' }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{a.label}</Text>
                  <Text style={s.merchantName}>{a.desc}</Text>
                </View>
                {governorLoading ? (
                  <ActivityIndicator size="small" color={a.color} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={Colors.light.secondaryText} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderCampaignsTab = () => {
    if (campaignsLoading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      );
    }
    return (
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={renderEmptyState('No Discovery Campaigns')}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
          />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardBody}>
              <View style={s.fraudHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  {item.subtitle ? <Text style={s.merchantName}>{item.subtitle}</Text> : null}
                </View>
                <View
                  style={[
                    s.statusBadge,
                    item.isActive ? s.activeBadge : s.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      s.statusText,
                      item.isActive ? s.activeText : s.inactiveText,
                    ]}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <View style={s.detailsRow}>
                <View style={s.detailChip}>
                  <Text style={s.detailLabel}>Type</Text>
                  <Text style={s.detailValue}>{item.type?.replace(/_/g, ' ')}</Text>
                </View>
                <View style={s.detailChip}>
                  <Text style={s.detailLabel}>Target</Text>
                  <Text style={s.detailValue}>{item.targetTrialCount} trials</Text>
                </View>
                <View style={s.detailChip}>
                  <Text style={s.detailLabel}>Reward</Text>
                  <Text style={s.detailValue}>{item.rewardCoins} coins</Text>
                </View>
              </View>
              <View style={s.dateRow}>
                <Text style={s.dateText}>
                  {new Date(item.startsAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                  {' → '}
                  {new Date(item.endsAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    );
  };

  const renderBundlesTab = () => {
    if (bundlesLoading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      );
    }
    return (
      <FlatList
        data={bundles}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={renderEmptyState('No Trial Bundles')}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
          />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardBody}>
              <View style={s.fraudHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.name}</Text>
                  <Text style={s.merchantName} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                <View
                  style={[
                    s.typeBadge,
                    item.bundleType === 'pass' ? s.passBadge : s.packBadge,
                  ]}
                >
                  <Text style={s.typeText}>{item.bundleType?.toUpperCase()}</Text>
                </View>
              </View>

              <View style={s.detailsRow}>
                <View style={s.detailChip}>
                  <Text style={s.detailLabel}>Price</Text>
                  <Text style={s.detailValue}>₹{item.price}</Text>
                </View>
                <View style={s.detailChip}>
                  <Text style={s.detailLabel}>Slots</Text>
                  <Text style={s.detailValue}>{item.trialSlots}</Text>
                </View>
                <View style={s.detailChip}>
                  <Text style={s.detailLabel}>Validity</Text>
                  <Text style={s.detailValue}>{item.validityDays}d</Text>
                </View>
              </View>

              {item.originalPrice > item.price && (
                <Text style={s.strikePrice}>
                  MRP ₹{item.originalPrice} (
                  {Math.round((1 - item.price / item.originalPrice) * 100)}% off)
                </Text>
              )}

              <View style={s.togglesRow}>
                <View style={s.toggleItem}>
                  <Text style={s.toggleLabel}>Active</Text>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => toggleBundleActive(item)}
                    trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                    thumbColor={item.isActive ? '#10B981' : '#94A3B8'}
                  />
                </View>
                <View style={s.toggleItem}>
                  <Text style={s.toggleLabel}>Featured</Text>
                  <Switch
                    value={item.featured}
                    onValueChange={() => toggleBundleFeatured(item)}
                    trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                    thumbColor={item.featured ? '#3B82F6' : '#94A3B8'}
                  />
                </View>
                <View style={s.toggleItem}>
                  <Text style={s.toggleLabel}>Purchases</Text>
                  <Text style={s.purchaseCount}>{item.totalPurchases ?? 0}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'approvals':
        return renderApprovalsTab();
      case 'fraud':
        return renderFraudTab();
      case 'breakage':
        return renderBreakageTab();
      case 'governor':
        return renderGovernorTab();
      case 'campaigns':
        return renderCampaignsTab();
      case 'bundles':
        return renderBundlesTab();
    }
  };

  // ═══════════ MAIN RENDER ═══════════

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Trial Management</Text>
          <View style={s.badgeContainer}>
            <Text style={s.badgeText}>{trials.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabBar}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={active ? '#FFFFFF' : Colors.light.secondaryText}
              />
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        {selectedTrial && (
          <View style={s.modalContainer}>
            <StatusBar style="light" />
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Trial Details</Text>
              <View style={{ width: 24 }} />
            </LinearGradient>

            <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
              {selectedTrial.images && selectedTrial.images.length > 0 && (
                <Image
                  source={{ uri: selectedTrial.images[0].url }}
                  style={s.detailImage}
                  resizeMode="cover"
                />
              )}

              <View style={s.section}>
                <Text style={s.sectionTitle}>Basic Information</Text>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Title</Text>
                  <Text style={s.infoValue}>{selectedTrial.title}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Merchant</Text>
                  <Text style={s.infoValue}>{selectedTrial.merchantName}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Category</Text>
                  <Text style={s.infoValue}>{selectedTrial.category}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Original Price</Text>
                  <Text style={s.infoValue}>₹{selectedTrial.originalPrice}</Text>
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Pricing & Slots</Text>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Trial Coin Price</Text>
                  <Text style={s.infoValue}>{selectedTrial.trialCoinPrice}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Commitment Fee</Text>
                  <Text style={s.infoValue}>₹{selectedTrial.commitmentFee}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Daily Slots</Text>
                  <Text style={s.infoValue}>{selectedTrial.dailySlots}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>QR Window</Text>
                  <Text style={s.infoValue}>
                    {selectedTrial.qrWindowType} ({selectedTrial.qrWindowMinutes} min)
                  </Text>
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Rewards</Text>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>ReZ Coins</Text>
                  <Text style={s.infoValue}>{selectedTrial.rewardCoins}</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Branded Coins</Text>
                  <Text style={s.infoValue}>{selectedTrial.brandedCoins}</Text>
                </View>
              </View>

              {selectedTrial.terms && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Terms & Conditions</Text>
                  <Text style={s.termsText}>{selectedTrial.terms}</Text>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={[s.actionBtnLg, s.rejectBtnStyle]}
                onPress={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                    <Text style={s.rejectBtnText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtnLg, s.approveBtnStyle]}
                onPress={() => handleApprove(selectedTrial)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={s.approveBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={s.rejectOverlay}>
          <View style={s.rejectModalContent}>
            <Text style={s.rejectModalTitle}>Rejection Reason</Text>
            <TextInput
              style={s.rejectInput}
              placeholder="Explain why this trial is being rejected..."
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholderTextColor={Colors.light.secondaryText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={s.rejectFooter}>
              <TouchableOpacity
                style={s.rejectCancel}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                <Text style={s.rejectCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.rejectConfirm, actionLoading && { opacity: 0.6 }]}
                onPress={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.rejectConfirmText}>Reject Trial</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

