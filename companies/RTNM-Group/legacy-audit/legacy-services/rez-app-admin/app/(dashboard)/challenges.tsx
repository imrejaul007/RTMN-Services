/**
 * app/(dashboard)/challenges.tsx — Challenge Management screen.
 *
 * Refactored: replaces `useState + useEffect + challengesService` data fetching
 * with React Query hooks (`useChallengesList`, `useChallengeStats`,
 * `useChallengeAnalytics`, `useChallengeTemplates`).
 *
 * Mutation service calls replaced with `useCreateChallenge`, `useUpdateChallenge`,
 * `useDeleteChallenge`, etc. from `useChallengeMutations.ts`.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import type { AdminChallenge, ChallengeStatus, ChallengeVisibility, ChallengeTemplate } from '../../services/api/challenges';
import { useChallengesList, useChallengeStats, useChallengeAnalytics, useChallengeTemplates } from '@/hooks/queries/useChallenges';
import {
  useCreateChallenge, useUpdateChallenge, useDeleteChallenge,
  useToggleChallengeFeatured, useChangeChallengeStatus, useCloneChallenge,
  useCreateChallengeFromTemplate,
} from '@/hooks/queries/useChallengeMutations';
import { ChallengeFormModal } from '../../components/challenges/ChallengeFormModal';
import { ChallengeCard } from '../../components/challenges/ChallengeCard';
import { ChallengeTemplateModal } from '../../components/challenges/ChallengeTemplateModal';
import { s } from './styles/challenges.styles';

const TYPE_COLORS: Record<string, string> = {
  daily: Colors.light.info, weekly: Colors.light.purple, monthly: Colors.light.warning, special: Colors.light.error,
};
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: Colors.light.success, medium: Colors.light.warning, hard: Colors.light.error,
};
const STATUS_COLORS: Record<string, string> = {
  draft: Colors.light.slateMedium, scheduled: Colors.light.info, active: Colors.light.success,
  paused: Colors.light.warning, completed: Colors.light.indigo,
  expired: Colors.light.error, disabled: Colors.light.mutedDark,
};
const VISIBILITY_LABELS: Record<string, string> = {
  play_and_earn: 'Play & Earn', missions: 'Missions', both: 'Both',
};
const VISIBILITY_COLORS: Record<string, string> = {
  play_and_earn: Colors.light.purple, missions: Colors.light.info, both: Colors.light.success,
};
const CHALLENGE_STATUSES: ChallengeStatus[] = ['draft', 'scheduled', 'active', 'paused', 'completed', 'expired', 'disabled'];
const CHALLENGE_TYPES = ['daily', 'weekly', 'monthly', 'special'] as const;
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChallengeFormData {
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  title: string; description: string; icon: string; action: string;
  target: number; coins: number; difficulty: 'easy' | 'medium' | 'hard';
  startDate: string; endDate: string; featured: boolean; active: boolean;
  status: ChallengeStatus; visibility: ChallengeVisibility; priority: number;
  scheduledPublishAt?: string; maxParticipants?: number;
}

const DEFAULT_FORM: ChallengeFormData = {
  type: 'daily', title: '', description: '', icon: '', action: 'visit_stores',
  target: 1, coins: 50, difficulty: 'easy',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  featured: false, active: true, status: 'active', visibility: 'both', priority: 0,
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getStatus(item: AdminChallenge): string {
  if (item.status) return item.status;
  const now = new Date();
  if (!item.active) return 'disabled';
  if (new Date(item.endDate) < now) return 'expired';
  return 'active';
}

function formatDateShort(dateString: string): string {
  try {
    const { format } = require('date-fns');
    return format(new Date(dateString), 'MMM dd, HH:mm');
  } catch {
    return dateString;
  }
}

function formatActionName(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ChallengesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Filter state
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallenge | null>(null);
  const [form, setForm] = useState<ChallengeFormData>({ ...DEFAULT_FORM });
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Build filter params
  const filterParams = {
    type: filterType !== 'all' ? filterType : undefined,
    difficulty: filterDifficulty !== 'all' ? filterDifficulty : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
  };

  // ── Data hooks ──────────────────────────────────────────────────────────────
  // useChallengesList replaces the manual loadChallenges / useEffect pattern.
  // React Query handles caching, background refetch, loading/error states.
  const { data: listData, isLoading, isRefetching, refetch } = useChallengesList(filterParams);
  const challenges: AdminChallenge[] = (listData as unknown as {challenges?: AdminChallenge[]})?.challenges ?? [];
  const hasMore = listData?.pagination?.hasNext ?? false;

  // Stats & analytics hooks — replace loadStats() and loadAnalytics()
  const { data: stats } = useChallengeStats();
  const { data: analytics } = useChallengeAnalytics();
  const { data: templates = [] } = useChallengeTemplates();

  // ── Mutation hooks ─────────────────────────────────────────────────────────
  // These replace challengesService.create / update / delete / etc. calls.
  // They automatically invalidate queries on success.
  const createMutation = useCreateChallenge();
  const updateMutation = useUpdateChallenge();
  const deleteMutation = useDeleteChallenge();
  const toggleFeaturedMutation = useToggleChallengeFeatured();
  const changeStatusMutation = useChangeChallengeStatus();
  const cloneMutation = useCloneChallenge();
  const createFromTemplateMutation = useCreateChallengeFromTemplate();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleFilterChange = useCallback((type: string, difficulty: string, status: string) => {
    setFilterType(type);
    setFilterDifficulty(difficulty);
    setFilterStatus(status);
    setPage(1);
  }, []);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleCreateNew = () => {
    setEditingChallenge(null);
    setForm({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (challenge: AdminChallenge) => {
    setEditingChallenge(challenge);
    setForm({
      type: challenge.type, title: challenge.title, description: challenge.description,
      icon: challenge.icon, action: challenge.requirements.action,
      target: challenge.requirements.target, coins: challenge.rewards.coins,
      difficulty: challenge.difficulty, startDate: challenge.startDate, endDate: challenge.endDate,
      featured: challenge.featured, active: challenge.active,
      status: challenge.status || (challenge.active ? 'active' : 'disabled'),
      visibility: challenge.visibility || 'both', priority: challenge.priority || 0,
      scheduledPublishAt: challenge.scheduledPublishAt, maxParticipants: challenge.maxParticipants,
    });
    setShowFormModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { showAlert('Error', 'Please enter a title'); return; }
    if (!form.description.trim()) { showAlert('Error', 'Please enter a description'); return; }
    if (!form.icon.trim()) { showAlert('Error', 'Please enter an icon'); return; }
    if (!form.target || form.target < 1) { showAlert('Error', 'Target must be at least 1'); return; }
    if (form.coins < 0) { showAlert('Error', 'Coins must be 0 or more'); return; }
    if (form.status === 'scheduled' && !form.scheduledPublishAt) { showAlert('Error', 'Scheduled challenges require a publish date'); return; }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (!form.startDate || !form.endDate) { showAlert('Error', 'Please set both start and end dates'); return; }
    if (end <= start) { showAlert('Error', 'End date must be after start date'); return; }

    const payload = {
      type: form.type, title: form.title.trim(), description: form.description.trim(),
      icon: form.icon.trim(),
      requirements: { action: form.action, target: form.target },
      rewards: { coins: form.coins },
      difficulty: form.difficulty, startDate: form.startDate, endDate: form.endDate,
      featured: form.featured, active: form.status === 'active', status: form.status,
      visibility: form.visibility, priority: form.priority,
      ...(form.status === 'scheduled' && form.scheduledPublishAt ? { scheduledPublishAt: form.scheduledPublishAt } : {}),
      ...(form.maxParticipants && form.maxParticipants > 0 ? { maxParticipants: form.maxParticipants } : {}),
    };

    const mutation = editingChallenge ? updateMutation : createMutation;
    mutation.mutate(editingChallenge ? { id: editingChallenge._id, payload } : payload, {
      onSuccess: (res: any) => {
        if (res.success) {
          showAlert('Success', editingChallenge ? 'Challenge updated successfully' : 'Challenge created successfully');
          setShowFormModal(false);
        } else {
          showAlert('Error', res.message || 'Operation failed');
        }
      },
      onError: (err: any) => showAlert('Error', err?.message || 'Operation failed'),
    });
  };

  const handleChangeStatus = (challenge: AdminChallenge, newStatus: ChallengeStatus) => {
    if (newStatus === 'disabled' || newStatus === 'paused') {
      showConfirm(
        `${newStatus === 'disabled' ? 'Disable' : 'Pause'} Challenge`,
        `${newStatus === 'disabled' ? 'Disable' : 'Pause'} "${challenge.title}"? ${newStatus === 'disabled' ? 'This will hide it from all users.' : 'Users will not see this challenge until resumed.'}`,
        () => changeStatusMutation.mutate({ id: challenge._id, status: newStatus }, {
          onError: (err: any) => showAlert('Error', err?.message || 'Failed to change status'),
        }),
        newStatus === 'disabled' ? 'Disable' : 'Pause'
      );
    } else {
      changeStatusMutation.mutate({ id: challenge._id, status: newStatus }, {
        onError: (err: any) => showAlert('Error', err?.message || 'Failed to change status'),
      });
    }
  };

  const handleClone = (challenge: AdminChallenge) => {
    showConfirm('Clone Challenge', `Clone "${challenge.title}" with new dates?`, () => {
      cloneMutation.mutate(challenge._id, {
        onSuccess: (res: any) => {
          if (res.success) showAlert('Success', 'Challenge cloned successfully');
          else showAlert('Error', res.message || 'Failed to clone');
        },
        onError: (err: any) => showAlert('Error', err?.message || 'Failed to clone'),
      });
    }, 'Clone');
  };

  const handleDelete = (challenge: AdminChallenge) => {
    showConfirm('Delete Challenge', `Delete "${challenge.title}"?`, () => {
      deleteMutation.mutate(challenge._id, {
        onSuccess: (res: any) => {
          if (res.success) showAlert('Success', 'Challenge deleted');
          else showAlert('Error', res.message || 'Failed to delete');
        },
        onError: (err: any) => showAlert('Error', err?.message || 'Failed to delete'),
      });
    }, 'Delete');
  };

  const handleToggleFeatured = (challenge: AdminChallenge) => {
    toggleFeaturedMutation.mutate(challenge._id, {
      onError: (err: any) => showAlert('Error', err?.message || 'Failed to toggle featured'),
    });
  };

  const handleCreateFromTemplate = (index: number) => {
    createFromTemplateMutation.mutate(index, {
      onSuccess: (res: any) => {
        if (res.success) { showAlert('Success', 'Challenge created from template'); setShowTemplateModal(false); }
        else showAlert('Error', res.message || 'Failed to create');
      },
      onError: (err: any) => showAlert('Error', err?.message || 'Failed to create'),
    });
  };

  // ── On-refresh handler ────────────────────────────────────────────────────
  // React Query: just call refetch() — it handles loading state internally
  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // ── Load more ────────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((p) => p + 1);
      // React Query handles pagination internally via the list query
    }
  }, [isLoading, hasMore]);

  // ─── Render helpers ──────────────────────────────────────────────────────

  const renderStatsRow = () => (
    <View style={s.statsRow}>
      {[
        { label: 'Total', value: (stats as unknown as {total?: number})?.total ?? 0, color: colors.text },
        { label: 'Active', value: (stats as unknown as {active?: number})?.active ?? 0, color: colors.success },
        { label: 'Participants', value: (analytics as unknown as {totalParticipants?: number})?.totalParticipants ?? 0, color: colors.purple },
        { label: 'Completion', value: `${(analytics as unknown as {avgCompletionRate?: number})?.avgCompletionRate ?? (stats as unknown as {avgCompletionRate?: number})?.avgCompletionRate ?? 0}%`, color: colors.info },
        { label: 'Coin Liability', value: (analytics as unknown as {totalCoinLiability?: number})?.totalCoinLiability ?? 0, color: colors.warning },
      ].map((item, idx) => (
        <View key={idx} style={[s.statItem, { backgroundColor: colors.card }]}>
          <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderConversionFunnel = () => {
    const funnel = (analytics as unknown as {conversionFunnel?: Record<string, number>})?.conversionFunnel;
    if (!funnel || Object.keys(funnel).length === 0) return null;
    const steps = ['impression', 'join', 'progress_update', 'completion', 'claim'];
    const stepLabels: Record<string, string> = { impression: 'Viewed', join: 'Joined', progress_update: 'In Progress', completion: 'Completed', claim: 'Claimed' };
    const stepColors: Record<string, string> = { impression: colors.slateMedium, join: colors.info, progress_update: colors.purple, completion: colors.warning, claim: colors.success };
    const funnelData = funnel as Record<string, { uniqueUsers?: number }>;
    const maxUsers = Math.max(...steps.map((s) => funnelData[s]?.uniqueUsers ?? 0), 1);
    return (
      <View style={[s.funnelContainer, { backgroundColor: colors.card }]}>
        <Text style={[s.funnelTitle, { color: colors.text }]}>Conversion Funnel (30d)</Text>
        {steps.map((step, idx) => {
          const data = funnelData[step];
          if (!data) return null;
          const barWidth = Math.max(((data.uniqueUsers ?? 0) / maxUsers) * 100, 5);
          const prevUsers = idx > 0 ? (funnelData[steps[idx - 1]]?.uniqueUsers ?? 0) : 0;
          const convRate = idx > 0 && prevUsers > 0 ? `${Math.round(((data.uniqueUsers ?? 0) / prevUsers) * 100)}%` : '';
          return (
            <View key={step} style={s.funnelStep}>
              <View style={s.funnelLabelRow}>
                <Text style={[s.funnelStepLabel, { color: colors.text }]}>{stepLabels[step] || step}</Text>
                <Text style={[s.funnelStepCount, { color: colors.icon }]}>{data.uniqueUsers ?? 0} users {convRate ? `(${convRate})` : ''}</Text>
              </View>
              <View style={[s.funnelBarBg, { backgroundColor: `${colors.border}50` }]}>
                <View style={[s.funnelBar, { width: `${barWidth}%`, backgroundColor: stepColors[step] || colors.mutedDark }]} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderFilters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
      {['all', ...CHALLENGE_TYPES].map((type) => {
        const isActive = filterType === type;
        return (
          <TouchableOpacity
            key={type}
            style={[s.filterChip, { backgroundColor: isActive ? `${TYPE_COLORS[type] || colors.tint}20` : colors.card, borderColor: isActive ? (TYPE_COLORS[type] || colors.tint) : colors.border }]}
            onPress={() => handleFilterChange(type, filterDifficulty, filterStatus)}
          >
            <Text style={[s.filterChipText, { color: isActive ? (TYPE_COLORS[type] || colors.tint) : colors.icon }]}>
              {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={s.filterDivider} />
      {['all', ...DIFFICULTY_LEVELS].map((diff) => {
        const isActive = filterDifficulty === diff;
        return (
          <TouchableOpacity
            key={`diff-${diff}`}
            style={[s.filterChip, { backgroundColor: isActive ? `${DIFFICULTY_COLORS[diff] || colors.tint}20` : colors.card, borderColor: isActive ? (DIFFICULTY_COLORS[diff] || colors.tint) : colors.border }]}
            onPress={() => handleFilterChange(filterType, diff, filterStatus)}
          >
            <Text style={[s.filterChipText, { color: isActive ? (DIFFICULTY_COLORS[diff] || colors.tint) : colors.icon }]}>
              {diff === 'all' ? 'All Diff.' : diff.charAt(0).toUpperCase() + diff.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={s.filterDivider} />
      {['all', ...CHALLENGE_STATUSES].map((status) => {
        const isActive = filterStatus === status;
        return (
          <TouchableOpacity
            key={`status-${status}`}
            style={[s.filterChip, { backgroundColor: isActive ? `${STATUS_COLORS[status] || colors.tint}20` : colors.card, borderColor: isActive ? (STATUS_COLORS[status] || colors.tint) : colors.border }]}
            onPress={() => handleFilterChange(filterType, filterDifficulty, status)}
          >
            <Text style={[s.filterChipText, { color: isActive ? (STATUS_COLORS[status] || colors.tint) : colors.icon }]}>
              {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading && challenges.length === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: colors.text }]}>Challenge Management</Text>
            <Text style={[s.headerSubtitle, { color: colors.icon }]}>Manage Play & Earn challenges</Text>
          </View>
        </View>
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Challenge Management</Text>
          <Text style={[s.headerSubtitle, { color: colors.icon }]}>Manage Play & Earn challenges</Text>
        </View>
      </View>
      {renderStatsRow()}
      {renderConversionFunnel()}
      <View style={{ marginBottom: 8 }}>
        {renderFilters()}
      </View>
      <View style={s.buttonRow}>
        <TouchableOpacity style={[s.createBtn, { backgroundColor: colors.tint }]} onPress={handleCreateNew}>
          <Ionicons name="add" size={18} color={colors.card} /><Text style={s.createBtnText}>Create Challenge</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.templateBtn, { backgroundColor: colors.purple }]} onPress={() => setShowTemplateModal(true)}>
          <Ionicons name="copy" size={18} color={colors.card} /><Text style={s.createBtnText}>From Template</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={challenges}
        renderItem={({ item }) => (
          <ChallengeCard
            item={item}
            colors={colors}
            onEdit={handleEdit}
            onClone={handleClone}
            onChangeStatus={handleChangeStatus}
            onToggleFeatured={handleToggleFeatured}
            onDelete={handleDelete}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.tint} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.tint} /> : <View style={{ height: 20 }} />}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="flag-outline" size={56} color={colors.icon} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No challenges</Text>
            <Text style={[s.emptyText, { color: colors.icon }]}>Create your first challenge or use a template</Text>
          </View>
        }
      />

      <ChallengeFormModal
        visible={showFormModal}
        isEditing={!!editingChallenge}
        isSaving={isSaving}
        form={form}
        onClose={() => setShowFormModal(false)}
        onSave={handleSave}
        onChange={setForm}
      />
      <ChallengeTemplateModal
        visible={showTemplateModal}
        templates={templates as ChallengeTemplate[]}
        onClose={() => setShowTemplateModal(false)}
        onCreateFromTemplate={handleCreateFromTemplate}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

