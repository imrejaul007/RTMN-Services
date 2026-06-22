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
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  leaderboardConfigService,
  LeaderboardConfigAdmin,
  LeaderboardStats,
  LeaderboardAnalytics,
  LeaderboardPrize,
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardStatus,
  PrizeHistoryEntry,
} from '../../services/api/leaderboardConfig';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/leaderboard-config.styles';

// ============================================
// TYPES & CONSTANTS
// ============================================

type StatusFilter = 'all' | LeaderboardStatus;

const STATUS_COLORS: Record<string, string> = {
  active: Colors.light.success,
  paused: Colors.light.warning,
  archived: Colors.light.mutedDark,
};

const LEADERBOARD_TYPE_LABELS: Record<LeaderboardType, string> = {
  coins: 'Coins',
  spending: 'Spending',
  reviews: 'Reviews',
  referrals: 'Referrals',
  cashback: 'Cashback',
  streak: 'Streak',
  custom: 'Custom',
};

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  'all-time': 'All Time',
};

const COIN_TRANSACTION_SOURCES = [
  'order',
  'creator_pick_reward',
  'social_share_reward',
  'spin_wheel',
  'scratch_card',
  'quiz_game',
  'memory_match',
  'coin_hunt',
  'guess_price',
  'daily_login',
  'achievement',
  'challenge',
  'admin',
  'review',
  'bill_upload',
  'survey',
  'merchant_award',
  'bonus_campaign',
  'referral',
  'cashback',
  'purchase_reward',
];

const VERIFICATION_OPTIONS = [
  { key: '', label: 'None' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'kyc', label: 'KYC' },
];

// ============================================
// FORM DEFAULTS
// ============================================

interface LeaderboardFormData {
  slug: string;
  title: string;
  subtitle: string;
  leaderboardType: LeaderboardType;
  period: LeaderboardPeriod;
  sources: string[];
  prizePool: LeaderboardPrize[];
  eligibility: {
    minAccountAgeDays: number;
    minActivityThreshold: number;
    requiredVerification: string;
    excludedUserIds: string[];
  };
  antiFraud: {
    maxRankJumpPerCycle: number;
    minDifferentDays: number;
    flagDuplicateDevices: boolean;
  };
  display: {
    icon: string;
    backgroundColor: string;
    featured: boolean;
    priority: number;
  };
  topN: number;
  status: LeaderboardStatus;
}

const DEFAULT_FORM: LeaderboardFormData = {
  slug: '',
  title: '',
  subtitle: '',
  leaderboardType: 'coins',
  period: 'weekly',
  sources: [],
  prizePool: [],
  eligibility: {
    minAccountAgeDays: 0,
    minActivityThreshold: 0,
    requiredVerification: '',
    excludedUserIds: [],
  },
  antiFraud: {
    maxRankJumpPerCycle: 50,
    minDifferentDays: 3,
    flagDuplicateDevices: true,
  },
  display: {
    icon: 'trophy',
    backgroundColor: Colors.light.warningLight,
    featured: false,
    priority: 50,
  },
  topN: 100,
  status: 'paused',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function LeaderboardConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // List state
  const [configs, setConfigs] = useState<LeaderboardConfigAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LeaderboardConfigAdmin | null>(null);
  const [formData, setFormData] = useState<LeaderboardFormData>(DEFAULT_FORM);
  const [excludedIdsInput, setExcludedIdsInput] = useState('');

  // Analytics modal
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<LeaderboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Prize history
  const [showPrizeHistory, setShowPrizeHistory] = useState(false);
  const [prizeHistoryConfigId, setPrizeHistoryConfigId] = useState<string | null>(null);
  const [prizeHistory, setPrizeHistory] = useState<PrizeHistoryEntry[]>([]);
  const [prizeHistoryLoading, setPrizeHistoryLoading] = useState(false);
  const [prizeHistoryPage, setPrizeHistoryPage] = useState(1);
  const [prizeHistoryTotalPages, setPrizeHistoryTotalPages] = useState(1);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadConfigs = useCallback(
    async (pageNum: number = 1) => {
      try {
        if (pageNum === 1) setLoading(true);
        const query: any = { page: pageNum, limit: 20 };
        if (statusFilter !== 'all') query.status = statusFilter;
        if (searchQuery.trim()) query.search = searchQuery.trim();

        const data = await leaderboardConfigService.getAll(query);
        setConfigs(data.configs);
        setTotalPages(data.pagination.pages);
        setPage(pageNum);
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to load configs');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, searchQuery]
  );

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await leaderboardConfigService.getStats();
      setStats(data);
    } catch (error: any) {
      logger.error('Stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (configId: string) => {
    try {
      setAnalyticsLoading(true);
      setSelectedAnalyticsId(configId);
      const data = await leaderboardConfigService.getAnalytics(configId);
      setAnalytics(data);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadPrizeHistory = useCallback(async (configId: string, pageNum: number = 1) => {
    try {
      setPrizeHistoryLoading(true);
      const data = await leaderboardConfigService.getPrizeHistory({
        configId,
        page: pageNum,
        limit: 20,
      });
      setPrizeHistory(data.prizes);
      setPrizeHistoryTotalPages(data.pagination.pages);
      setPrizeHistoryPage(pageNum);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load prize history');
    } finally {
      setPrizeHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs(1);
    loadStats();
  }, [statusFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConfigs(1);
    loadStats();
  }, [loadConfigs, loadStats]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({ ...DEFAULT_FORM, prizePool: [], sources: [] });
    setExcludedIdsInput('');
    setShowFormModal(true);
  };

  const handleEdit = (config: LeaderboardConfigAdmin) => {
    setEditingConfig(config);
    setFormData({
      slug: config.slug,
      title: config.title,
      subtitle: config.subtitle,
      leaderboardType: config.leaderboardType,
      period: config.period,
      sources: (config as unknown as {coinTransactionSources?: string[]}).coinTransactionSources || config.sources || [],
      prizePool: config.prizePool || [],
      eligibility: {
        minAccountAgeDays: config.eligibility?.minAccountAgeDays || 0,
        minActivityThreshold: config.eligibility?.minActivityThreshold || 0,
        requiredVerification: config.eligibility?.requiredVerification || '',
        excludedUserIds: config.eligibility?.excludedUserIds || [],
      },
      antiFraud: {
        maxRankJumpPerCycle: config.antiFraud?.maxRankJumpPerCycle || 50,
        minDifferentDays: config.antiFraud?.minDifferentDays || 3,
        flagDuplicateDevices: config.antiFraud?.flagDuplicateDevices ?? true,
      },
      display: {
        icon: config.display?.icon || 'trophy',
        backgroundColor: config.display?.backgroundColor || colors.warningLight,
        featured: config.display?.featured || false,
        priority: config.display?.priority || 50,
      },
      topN: config.topN || 100,
      status: config.status,
    });
    setExcludedIdsInput((config.eligibility?.excludedUserIds || []).join(', '));
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title) {
      showAlert('Error', 'Slug and title are required');
      return;
    }

    try {
      setIsSaving(true);
      // Map frontend 'sources' to backend 'coinTransactionSources'
      const { sources, ...rest } = formData;
      const payload = {
        ...rest,
        coinTransactionSources: sources,
        eligibility: {
          ...formData.eligibility,
          excludedUserIds: excludedIdsInput
            ? excludedIdsInput
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        },
      };

      if (editingConfig) {
        await leaderboardConfigService.update(editingConfig._id, payload);
        showAlert('Success', 'Leaderboard config updated successfully');
      } else {
        await leaderboardConfigService.create(payload);
        showAlert('Success', 'Leaderboard config created successfully');
      }
      setShowFormModal(false);
      loadConfigs(1);
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (config: LeaderboardConfigAdmin) => {
    if (config.status === 'active') {
      showAlert('Error', 'Cannot delete an active leaderboard. Pause or archive it first.');
      return;
    }

    showConfirm(
      'Delete Leaderboard',
      `Are you sure you want to delete "${config.title}"?`,
      async () => {
        try {
          await leaderboardConfigService.remove(config._id);
          showAlert('Success', 'Leaderboard deleted');
          loadConfigs(page);
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  const handleStatusChange = async (
    config: LeaderboardConfigAdmin,
    newStatus: LeaderboardStatus
  ) => {
    try {
      await leaderboardConfigService.updateStatus(config._id, newStatus);
      showAlert('Success', `Status changed to ${newStatus}`);
      loadConfigs(page);
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update status');
    }
  };

  const handleDistributePrizes = async (config: LeaderboardConfigAdmin) => {
    showConfirm(
      'Distribute Prizes',
      `Are you sure you want to distribute prizes for "${config.title}"?`,
      async () => {
        try {
          const result = await leaderboardConfigService.distributePrizes(config._id);
          const totalAmount = result.totalAmount ?? 0;
          showAlert(
            'Success',
            `Distributed ${result.distributed} prizes totaling ${totalAmount} coins`
          );
          loadConfigs(page);
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to distribute prizes');
        }
      }
    );
  };

  const handleViewPrizeHistory = (config: LeaderboardConfigAdmin) => {
    setPrizeHistoryConfigId(config._id);
    setShowPrizeHistory(true);
    loadPrizeHistory(config._id, 1);
  };

  // ==========================================
  // PRIZE POOL HELPERS
  // ==========================================

  const addPrizeRow = () => {
    setFormData((prev) => ({
      ...prev,
      prizePool: [
        ...prev.prizePool,
        {
          rankStart:
            prev.prizePool.length > 0 ? prev.prizePool[prev.prizePool.length - 1].rankEnd + 1 : 1,
          rankEnd: 1,
          prizeAmount: 0,
          prizeLabel: '',
        },
      ],
    }));
  };

  const removePrizeRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      prizePool: prev.prizePool.filter((_, i) => i !== index),
    }));
  };

  const updatePrizeRow = (index: number, field: keyof LeaderboardPrize, value: any) => {
    setFormData((prev) => ({
      ...prev,
      prizePool: prev.prizePool.map((p, i) =>
        i === index ? { ...p, [field]: field === 'prizeLabel' ? value : Number(value) || 0 } : p
      ),
    }));
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderStatusBadge = (status: string) => (
    <View
      style={[
        s.statusBadge,
        { backgroundColor: `${STATUS_COLORS[status] || colors.slateMedium}20` },
      ]}
    >
      <View
        style={[s.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.slateMedium }]}
      />
      <Text style={[s.statusText, { color: STATUS_COLORS[status] || colors.slateMedium }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );

  const getPrizePoolTotal = (prizePool: LeaderboardPrize[]) => {
    return prizePool.reduce((sum, p) => {
      const count = Math.max(1, p.rankEnd - p.rankStart + 1);
      return sum + p.prizeAmount * count;
    }, 0);
  };

  const renderConfigCard = ({ item }: { item: LeaderboardConfigAdmin }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View
            style={[
              s.iconCircle,
              { backgroundColor: item.display?.backgroundColor || colors.warningLight },
            ]}
          >
            <Ionicons
              name={(item.display?.icon as unknown as string) || 'trophy'}
              size={20}
              color={colors.navy}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={s.cardSlug}>{item.slug}</Text>
          </View>
        </View>
        {renderStatusBadge(item.status)}
      </View>

      {/* Info Row */}
      <View style={s.cardInfoRow}>
        <View style={s.infoChip}>
          <Text style={s.infoChipText}>
            {LEADERBOARD_TYPE_LABELS[item.leaderboardType] || item.leaderboardType}
          </Text>
        </View>
        <View style={s.infoChip}>
          <Text style={s.infoChipText}>{PERIOD_LABELS[item.period] || item.period}</Text>
        </View>
        <View style={s.infoChip}>
          <Text style={s.infoChipText}>Top {item.topN || 100}</Text>
        </View>
        {item.display?.featured && (
          <View style={[s.infoChip, { backgroundColor: colors.warningLight }]}>
            <Text style={[s.infoChipText, { color: colors.warningDark }]}>Featured</Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={s.statsRow}>
        <Text style={s.statsText}>
          Prize Pool: {getPrizePoolTotal(item.prizePool || []).toLocaleString()} coins
        </Text>
        <Text style={s.statsText}>Participants: {item.participantsCount || 0}</Text>
      </View>

      {/* Actions */}
      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[s.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => loadAnalytics(item._id)}>
          <Ionicons name="bar-chart-outline" size={18} color={colors.purple} />
          <Text style={[s.actionText, { color: colors.purple }]}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => handleViewPrizeHistory(item)}>
          <Ionicons name="time-outline" size={18} color={colors.cyan} />
          <Text style={[s.actionText, { color: colors.cyan }]}>History</Text>
        </TouchableOpacity>

        {item.status === 'active' && (
          <TouchableOpacity style={s.actionBtn} onPress={() => handleDistributePrizes(item)}>
            <Ionicons name="gift-outline" size={18} color={colors.success} />
            <Text style={[s.actionText, { color: colors.success }]}>Prizes</Text>
          </TouchableOpacity>
        )}

        {item.status === 'active' && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleStatusChange(item, 'paused')}
          >
            <Ionicons name="pause-circle-outline" size={18} color={colors.warning} />
            <Text style={[s.actionText, { color: colors.warning }]}>Pause</Text>
          </TouchableOpacity>
        )}

        {item.status === 'paused' && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleStatusChange(item, 'active')}
          >
            <Ionicons name="play-circle-outline" size={18} color={colors.success} />
            <Text style={[s.actionText, { color: colors.success }]}>Activate</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'archived' && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleStatusChange(item, 'archived')}
          >
            <Ionicons name="archive-outline" size={18} color={colors.mutedDark} />
            <Text style={[s.actionText, { color: colors.mutedDark }]}>Archive</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'active' && (
          <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[s.actionText, { color: colors.error }]}>Del</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ==========================================
  // STATS ROW
  // ==========================================

  const renderStatsRow = () => {
    if (statsLoading) {
      return <ActivityIndicator size="small" color={colors.info} style={{ paddingVertical: 12 }} />;
    }
    if (!stats) return null;

    return (
      <View style={s.dashboardGrid}>
        <View style={[s.dashboardCard, { backgroundColor: colors.infoLight }]}>
          <Text style={[s.dashboardValue, { color: '#1D4ED8' }]}>
            {stats.activeLeaderboards}
          </Text>
          <Text style={s.dashboardLabel}>Active</Text>
        </View>
        <View style={[s.dashboardCard, { backgroundColor: colors.successLighter }]}>
          <Text style={[s.dashboardValue, { color: colors.greenDark }]}>
            {stats.totalPrizesDistributed?.toLocaleString()}
          </Text>
          <Text style={s.dashboardLabel}>Prizes Given</Text>
        </View>
        <View style={[s.dashboardCard, { backgroundColor: colors.warningLight }]}>
          <Text style={[s.dashboardValue, { color: colors.warningDark }]}>
            {stats.participationRate}%
          </Text>
          <Text style={s.dashboardLabel}>Participation</Text>
        </View>
      </View>
    );
  };

  // ==========================================
  // FORM MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {editingConfig ? 'Edit Leaderboard' : 'Create Leaderboard'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={s.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={s.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Basic Info */}
          <Text style={s.formSectionTitle}>Basic Info</Text>

          <Text style={s.formLabel}>Slug (unique identifier)</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.slug}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              }))
            }
            placeholder="weekly-top-spenders"
            placeholderTextColor={colors.muted}
            editable={!editingConfig}
          />

          <Text style={s.formLabel}>Title</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.title}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, title: v }))}
            placeholder="Top Spenders This Week"
            placeholderTextColor={colors.muted}
          />

          <Text style={s.formLabel}>Subtitle</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.subtitle}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, subtitle: v }))}
            placeholder="Compete for weekly prizes!"
            placeholderTextColor={colors.muted}
          />

          <Text style={s.formLabel}>Leaderboard Type</Text>
          <View style={s.chipRow}>
            {(Object.entries(LEADERBOARD_TYPE_LABELS) as [LeaderboardType, string][]).map(
              ([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[s.chip, formData.leaderboardType === key && s.chipSelected]}
                  onPress={() => setFormData((prev) => ({ ...prev, leaderboardType: key }))}
                >
                  <Text
                    style={[
                      s.chipText,
                      formData.leaderboardType === key && s.chipTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          <Text style={s.formLabel}>Period</Text>
          <View style={s.chipRow}>
            {(Object.entries(PERIOD_LABELS) as [LeaderboardPeriod, string][]).map(
              ([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[s.chip, formData.period === key && s.chipSelected]}
                  onPress={() => setFormData((prev) => ({ ...prev, period: key }))}
                >
                  <Text
                    style={[s.chipText, formData.period === key && s.chipTextSelected]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          <Text style={s.formLabel}>Status</Text>
          <View style={s.chipRow}>
            {(['active', 'paused', 'archived'] as LeaderboardStatus[]).map((st) => (
              <TouchableOpacity
                key={st}
                style={[s.chip, formData.status === st && s.chipSelected]}
                onPress={() => setFormData((prev) => ({ ...prev, status: st }))}
              >
                <Text style={[s.chipText, formData.status === st && s.chipTextSelected]}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sources */}
          <Text style={s.formSectionTitle}>Sources</Text>
          <Text style={s.formHint}>
            Select CoinTransaction sources to track. Leave empty for all.
          </Text>
          <View style={s.chipRow}>
            {COIN_TRANSACTION_SOURCES.map((src) => {
              const selected = formData.sources.includes(src);
              return (
                <TouchableOpacity
                  key={src}
                  style={[s.chip, selected && s.chipSelected]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sources: selected
                        ? prev.sources.filter((s) => s !== src)
                        : [...prev.sources, src],
                    }))
                  }
                >
                  <Text style={[s.chipText, selected && s.chipTextSelected]}>
                    {src.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prize Pool */}
          <Text style={s.formSectionTitle}>Prize Pool</Text>
          {formData.prizePool.map((prize, index) => (
            <View key={index} style={s.prizeRow}>
              <View style={s.prizeRowHeader}>
                <Text style={s.prizeRowLabel}>Prize Tier {index + 1}</Text>
                <TouchableOpacity onPress={() => removePrizeRow(index)}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={s.formRow}>
                <View style={s.formRowItem}>
                  <Text style={s.formLabel}>Rank Start</Text>
                  <TextInput
                    style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(prize.rankStart || '')}
                    onChangeText={(v) => updatePrizeRow(index, 'rankStart', v)}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={s.formRowItem}>
                  <Text style={s.formLabel}>Rank End</Text>
                  <TextInput
                    style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(prize.rankEnd || '')}
                    onChangeText={(v) => updatePrizeRow(index, 'rankEnd', v)}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
              <View style={s.formRow}>
                <View style={s.formRowItem}>
                  <Text style={s.formLabel}>Prize Amount</Text>
                  <TextInput
                    style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(prize.prizeAmount || '')}
                    onChangeText={(v) => updatePrizeRow(index, 'prizeAmount', v)}
                    keyboardType="numeric"
                    placeholder="500"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={s.formRowItem}>
                  <Text style={s.formLabel}>Prize Label</Text>
                  <TextInput
                    style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={prize.prizeLabel}
                    onChangeText={(v) => updatePrizeRow(index, 'prizeLabel', v)}
                    placeholder="Gold Prize"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={s.addPrizeBtn} onPress={addPrizeRow}>
            <Ionicons name="add-circle" size={22} color={colors.info} />
            <Text style={s.addPrizeBtnText}>Add Prize Tier</Text>
          </TouchableOpacity>

          {/* Eligibility */}
          <Text style={s.formSectionTitle}>Eligibility</Text>

          <View style={s.formRow}>
            <View style={s.formRowItem}>
              <Text style={s.formLabel}>Min Account Age (days)</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.eligibility.minAccountAgeDays || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    eligibility: { ...prev.eligibility, minAccountAgeDays: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={s.formRowItem}>
              <Text style={s.formLabel}>Min Activity Threshold</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.eligibility.minActivityThreshold || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    eligibility: { ...prev.eligibility, minActivityThreshold: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <Text style={s.formLabel}>Required Verification</Text>
          <View style={s.chipRow}>
            {VERIFICATION_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  s.chip,
                  formData.eligibility.requiredVerification === key && s.chipSelected,
                ]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    eligibility: { ...prev.eligibility, requiredVerification: key },
                  }))
                }
              >
                <Text
                  style={[
                    s.chipText,
                    formData.eligibility.requiredVerification === key && s.chipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.formLabel}>Excluded User IDs (comma-separated)</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={excludedIdsInput}
            onChangeText={setExcludedIdsInput}
            placeholder="userId1, userId2"
            placeholderTextColor={colors.muted}
          />

          {/* Anti-Fraud */}
          <Text style={s.formSectionTitle}>Anti-Fraud</Text>

          <View style={s.formRow}>
            <View style={s.formRowItem}>
              <Text style={s.formLabel}>Max Rank Jump/Cycle</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.antiFraud.maxRankJumpPerCycle || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    antiFraud: { ...prev.antiFraud, maxRankJumpPerCycle: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={s.formRowItem}>
              <Text style={s.formLabel}>Min Different Days</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.antiFraud.minDifferentDays || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    antiFraud: { ...prev.antiFraud, minDifferentDays: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={s.switchRow}>
            <Text style={s.formLabel}>Flag Duplicate Devices</Text>
            <Switch
              value={formData.antiFraud.flagDuplicateDevices}
              onValueChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  antiFraud: { ...prev.antiFraud, flagDuplicateDevices: v },
                }))
              }
            />
          </View>

          {/* Display */}
          <Text style={s.formSectionTitle}>Display</Text>

          <View style={s.formRow}>
            <View style={s.formRowItem}>
              <Text style={s.formLabel}>Icon (Ionicons name)</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.display.icon}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    display: { ...prev.display, icon: v },
                  }))
                }
                placeholder="trophy"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={s.formRowItem}>
              <Text style={s.formLabel}>Background Color</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.display.backgroundColor}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    display: { ...prev.display, backgroundColor: v },
                  }))
                }
                placeholder={colors.warningLight}
                placeholderTextColor={colors.muted}
              />
              {formData.display.backgroundColor ? (
                <View
                  style={[
                    s.colorPreview,
                    { backgroundColor: formData.display.backgroundColor },
                  ]}
                />
              ) : null}
            </View>
          </View>

          <View style={s.formRow}>
            <View style={s.formRowItem}>
              <Text style={s.formLabel}>Priority (0-100)</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.display.priority || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    display: { ...prev.display, priority: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={s.formRowItem}>
              <Text style={s.formLabel}>Top N (10-1000)</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.topN || '')}
                onChangeText={(v) => {
                  const val = Math.max(10, Math.min(1000, Number(v) || 10));
                  setFormData((prev) => ({ ...prev, topN: val }));
                }}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={s.switchRow}>
            <Text style={s.formLabel}>Featured</Text>
            <Switch
              value={formData.display.featured}
              onValueChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  display: { ...prev.display, featured: v },
                }))
              }
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // ANALYTICS MODAL
  // ==========================================

  const renderAnalyticsModal = () => (
    <Modal visible={!!selectedAnalyticsId} animationType="slide" transparent>
      <View style={s.analyticsOverlay}>
        <View style={[s.analyticsContainer, { backgroundColor: colors.card }]}>
          <View style={s.analyticsHeader}>
            <Text style={[s.analyticsTitle, { color: colors.text }]}>
              Leaderboard Analytics
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedAnalyticsId(null);
                setAnalytics(null);
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {analyticsLoading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : analytics ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={s.analyticsGrid}>
                <View style={s.analyticsCard}>
                  <Text style={s.analyticsCardValue}>{analytics.totalParticipants}</Text>
                  <Text style={s.analyticsCardLabel}>Total Participants</Text>
                </View>
                <View style={s.analyticsCard}>
                  <Text style={s.analyticsCardValue}>{analytics.activeParticipants}</Text>
                  <Text style={s.analyticsCardLabel}>Active Now</Text>
                </View>
                <View style={s.analyticsCard}>
                  <Text style={s.analyticsCardValue}>
                    {analytics.totalPrizesAwarded?.toLocaleString()}
                  </Text>
                  <Text style={s.analyticsCardLabel}>Prizes Awarded</Text>
                </View>
                <View style={s.analyticsCard}>
                  <Text style={s.analyticsCardValue}>
                    {analytics.avgScore?.toLocaleString()}
                  </Text>
                  <Text style={s.analyticsCardLabel}>Avg Score</Text>
                </View>
                <View style={s.analyticsCard}>
                  <Text style={s.analyticsCardValue}>{analytics.cyclesCompleted}</Text>
                  <Text style={s.analyticsCardLabel}>Cycles Done</Text>
                </View>
                <View style={s.analyticsCard}>
                  <Text style={[s.analyticsCardValue, { fontSize: 14 }]} numberOfLines={1}>
                    {analytics.topScorer || 'N/A'}
                  </Text>
                  <Text style={s.analyticsCardLabel}>Top Scorer</Text>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // PRIZE HISTORY MODAL
  // ==========================================

  const renderPrizeHistoryModal = () => (
    <Modal visible={showPrizeHistory} animationType="slide" transparent>
      <View style={s.analyticsOverlay}>
        <View
          style={[s.analyticsContainer, { backgroundColor: colors.card, maxHeight: '80%' }]}
        >
          <View style={s.analyticsHeader}>
            <Text style={[s.analyticsTitle, { color: colors.text }]}>Prize History</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPrizeHistory(false);
                setPrizeHistoryConfigId(null);
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {prizeHistoryLoading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : prizeHistory.length > 0 ? (
            <ScrollView>
              {prizeHistory.map((entry) => (
                <View
                  key={entry._id}
                  style={[s.prizeHistoryRow, { borderColor: colors.border }]}
                >
                  <View style={s.prizeHistoryInfo}>
                    <Text
                      style={[s.prizeHistoryUser, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {entry.userName || entry.userId}
                    </Text>
                    <Text style={s.prizeHistoryMeta}>
                      Rank #{entry.rank} - {entry.prizeLabel}
                    </Text>
                    <Text style={s.prizeHistoryDate}>
                      {entry.cycle} - {new Date(entry.distributedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={s.prizeHistoryAmount}>{entry.prizeAmount} coins</Text>
                </View>
              ))}

              {prizeHistoryTotalPages > 1 && (
                <View style={s.pagination}>
                  <TouchableOpacity
                    style={[s.pageBtn, prizeHistoryPage <= 1 && s.pageBtnDisabled]}
                    onPress={() =>
                      prizeHistoryPage > 1 &&
                      prizeHistoryConfigId &&
                      loadPrizeHistory(prizeHistoryConfigId, prizeHistoryPage - 1)
                    }
                    disabled={prizeHistoryPage <= 1}
                  >
                    <Text style={s.pageBtnText}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={s.pageInfo}>
                    Page {prizeHistoryPage} of {prizeHistoryTotalPages}
                  </Text>
                  <TouchableOpacity
                    style={[
                      s.pageBtn,
                      prizeHistoryPage >= prizeHistoryTotalPages && s.pageBtnDisabled,
                    ]}
                    onPress={() =>
                      prizeHistoryPage < prizeHistoryTotalPages &&
                      prizeHistoryConfigId &&
                      loadPrizeHistory(prizeHistoryConfigId, prizeHistoryPage + 1)
                    }
                    disabled={prizeHistoryPage >= prizeHistoryTotalPages}
                  >
                    <Text style={s.pageBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={s.emptyContainer}>
              <Ionicons name="time-outline" size={48} color={colors.gray300} />
              <Text style={s.emptyText}>No prize history found</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <Text style={[s.headerTitle, { color: colors.text }]}>Leaderboard Config</Text>
        <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={s.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[s.filtersBar, { backgroundColor: colors.card }]}>
        <TextInput
          style={[s.searchInput, { color: colors.text, borderColor: colors.border }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => loadConfigs(1)}
          placeholder="Search leaderboards..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterChips}>
          {(['all', 'active', 'paused', 'archived'] as StatusFilter[]).map((sf) => (
            <TouchableOpacity
              key={sf}
              style={[s.filterChip, statusFilter === sf && s.filterChipActive]}
              onPress={() => setStatusFilter(sf)}
            >
              <Text
                style={[s.filterChipText, statusFilter === sf && s.filterChipTextActive]}
              >
                {sf === 'all' ? 'All' : sf.charAt(0).toUpperCase() + sf.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <FlatList
        data={configs}
        renderItem={renderConfigCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={renderStatsRow}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : (
            <View style={s.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color={colors.gray300} />
              <Text style={s.emptyText}>No leaderboard configs found</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={s.pagination}>
              <TouchableOpacity
                style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
                onPress={() => page > 1 && loadConfigs(page - 1)}
                disabled={page <= 1}
              >
                <Text style={s.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={s.pageInfo}>
                Page {page} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
                onPress={() => page < totalPages && loadConfigs(page + 1)}
                disabled={page >= totalPages}
              >
                <Text style={s.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Modals */}
      {renderFormModal()}
      {renderAnalyticsModal()}
      {renderPrizeHistoryModal()}
    </View>
  );
}

// ============================================
