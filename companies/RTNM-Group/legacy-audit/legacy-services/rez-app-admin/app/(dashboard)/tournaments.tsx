import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tournamentAdminService, TournamentAdmin } from '../../services/api/tournaments';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/tournaments.styles';

// Web-native datetime picker component
const DateTimeInput = ({
  value,
  onChange,
  isDark,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  placeholder?: string;
}) => {
  if (Platform.OS === 'web') {
    return (
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 15,
          borderRadius: 8,
          border: '1px solid #D1D5DB',
          backgroundColor: isDark ? Colors.light.slateDark : Colors.light.card,
          color: isDark ? Colors.light.slate : Colors.light.gray800,
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box' as const,
        }}
      />
    );
  }
  // Fallback for native (unlikely for admin app)
  return (
    <TextInput
      style={{
        borderWidth: 1,
        borderColor: Colors.light.gray300,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: isDark ? Colors.light.slate : Colors.light.gray800,
        backgroundColor: isDark ? Colors.light.slateDark : Colors.light.card,
      }}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder || 'YYYY-MM-DDTHH:mm'}
      placeholderTextColor={Colors.light.muted}
    />
  );
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: Colors.light.info,
  active: Colors.light.success,
  completed: Colors.light.mutedDark,
  cancelled: Colors.light.error,
};

const TYPE_COLORS: Record<string, string> = {
  daily: Colors.light.info,
  weekly: Colors.light.purple,
  monthly: Colors.light.warning,
  special: Colors.light.error,
};

const GAME_TYPES = [
  'spin_wheel',
  'memory_match',
  'coin_hunt',
  'guess_price',
  'quiz',
  'mixed',
] as const;
const TOURNAMENT_TYPES = ['daily', 'weekly', 'monthly', 'special'] as const;

interface FormData {
  name: string;
  description: string;
  type: string;
  gameType: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  entryFee: number;
  totalPrizePool: number;
  featured: boolean;
  prizes: { rank: number; coins: number; badge?: string; description?: string }[];
  rules: { minGamesRequired: number; maxGamesPerDay: number; scoringMethod: string };
}

const INITIAL_FORM: FormData = {
  name: '',
  description: '',
  type: 'daily',
  gameType: 'mixed',
  startDate: '',
  endDate: '',
  maxParticipants: 100,
  entryFee: 0,
  totalPrizePool: 1000,
  featured: false,
  prizes: [
    { rank: 1, coins: 500, description: '1st Place' },
    { rank: 2, coins: 300, description: '2nd Place' },
    { rank: 3, coins: 200, description: '3rd Place' },
  ],
  rules: { minGamesRequired: 3, maxGamesPerDay: 10, scoringMethod: 'cumulative' },
};

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

export default function TournamentsPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [items, setItems] = useState<TournamentAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<TournamentAdmin | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detailItem, setDetailItem] = useState<TournamentAdmin | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Reactivate modal
  const [reactivateItem, setReactivateItem] = useState<TournamentAdmin | null>(null);
  const [reactivateModalVisible, setReactivateModalVisible] = useState(false);
  const [reactivateStartDate, setReactivateStartDate] = useState('');
  const [reactivateEndDate, setReactivateEndDate] = useState('');
  const [reactivating, setReactivating] = useState(false);

  const fetchItems = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const result = await tournamentAdminService.getAll({
          page: pageNum,
          limit: 20,
          status: filterStatus || undefined,
          type: filterType || undefined,
        });

        if (!mountedRef.current) return;
        setItems(result.tournaments || []);
        setPage(result.pagination?.page || 1);
        setTotalPages(result.pagination?.pages || 1);
      } catch (error: any) {
        if (!mountedRef.current) return;
        showAlert('Error', error.message || 'Failed to load tournaments');
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filterStatus, filterType]
  );

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  // Helper: generate ISO datetime string for N hours from now
  const futureDate = (hoursFromNow: number) => {
    const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      ...INITIAL_FORM,
      startDate: futureDate(1), // 1 hour from now
      endDate: futureDate(25), // ~1 day from now
    });
    setModalVisible(true);
  };

  const openEditModal = (item: TournamentAdmin) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      type: item.type,
      gameType: item.gameType,
      startDate: item.startDate?.slice(0, 16) || '',
      endDate: item.endDate?.slice(0, 16) || '',
      maxParticipants: item.maxParticipants,
      entryFee: item.entryFee || 0,
      totalPrizePool: item.totalPrizePool || 0,
      featured: item.featured || false,
      prizes: item.prizes || INITIAL_FORM.prizes,
      rules: item.rules || INITIAL_FORM.rules,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showAlert('Validation', 'Tournament name is required');
      return;
    }
    if (!form.startDate || !form.endDate) {
      showAlert('Validation', 'Start and end dates are required');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      showAlert('Validation', 'End date must be after start date');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await tournamentAdminService.update(editingItem._id, form as unknown as Partial<TournamentAdmin>);        showAlert('Success', 'Tournament updated');
      } else {
        await tournamentAdminService.create(form as unknown as Partial<TournamentAdmin>);
        showAlert('Success', 'Tournament created');
      }
      setModalVisible(false);
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (item: TournamentAdmin) => {
    const confirmed = await showConfirm('Activate Tournament', `Activate "${item.name}"?`);
    if (!confirmed) return;

    try {
      await tournamentAdminService.activate(item._id);
      showAlert('Success', 'Tournament activated');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleCancel = async (item: TournamentAdmin) => {
    const confirmed = await showConfirm(
      'Cancel Tournament',
      `Cancel "${item.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await tournamentAdminService.cancel(item._id);
      showAlert('Success', 'Tournament cancelled');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleDelete = async (item: TournamentAdmin) => {
    const confirmed = await showConfirm(
      'Delete Tournament',
      `Delete "${item.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await tournamentAdminService.delete(item._id);
      showAlert('Success', 'Tournament deleted');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleClone = async (item: TournamentAdmin) => {
    const confirmed = await showConfirm(
      'Clone Tournament',
      `Create a copy of "${item.name}" with new dates?`
    );
    if (!confirmed) return;

    try {
      await tournamentAdminService.clone(item._id);
      showAlert('Success', 'Tournament cloned! Edit the copy to set your preferred dates.');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const openReactivateModal = (item: TournamentAdmin) => {
    setReactivateItem(item);
    // Default: start in 1 hour, same duration as original
    const originalDuration = new Date(item.endDate).getTime() - new Date(item.startDate).getTime();
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + originalDuration);
    setReactivateStartDate(start.toISOString().slice(0, 16));
    setReactivateEndDate(end.toISOString().slice(0, 16));
    setReactivateModalVisible(true);
  };

  const handleReactivate = async () => {
    if (!reactivateItem || !reactivateStartDate || !reactivateEndDate) return;
    try {
      setReactivating(true);
      await tournamentAdminService.reactivate(
        reactivateItem._id,
        reactivateStartDate,
        reactivateEndDate
      );
      showAlert('Success', 'Tournament reactivated!');
      setReactivateModalVisible(false);
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setReactivating(false);
    }
  };

  const viewDetail = async (item: TournamentAdmin) => {
    try {
      const full = await tournamentAdminService.getById(item._id);
      setDetailItem(full);
      setDetailModalVisible(true);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const renderItem = ({ item }: { item: TournamentAdmin }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.mutedDark;
    const typeColor = TYPE_COLORS[item.type] || colors.mutedDark;

    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: isDark ? colors.slateDark : colors.card }]}
        onPress={() => viewDetail(item)}
      >
        <View style={s.cardHeader}>
          <Text
            style={[s.cardTitle, { color: isDark ? colors.slate : colors.gray800 }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={[s.chip, { backgroundColor: typeColor + '20' }]}>
            <Text style={[s.chipText, { color: typeColor }]}>{item.type}</Text>
          </View>
          <Text style={s.metaText}>{item.gameType}</Text>
          <Text style={s.metaText}>{item.participantsCount || 0} players</Text>
          <Text style={s.metaText}>{item.totalPrizePool} coins</Text>
        </View>

        <View style={s.dateRow}>
          <Text style={s.dateText}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>
        </View>

        <View style={s.cardActions}>
          {/* Upcoming: Edit, Activate, Delete */}
          {item.status === 'upcoming' && (
            <>
              <TouchableOpacity style={s.actionBtn} onPress={() => openEditModal(item)}>
                <Ionicons name="create-outline" size={16} color={colors.info} />
                <Text style={[s.actionText, { color: colors.info }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => handleActivate(item)}>
                <Ionicons name="play-outline" size={16} color={colors.success} />
                <Text style={[s.actionText, { color: colors.success }]}>Activate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[s.actionText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
          {/* Active: Cancel */}
          {item.status === 'active' && (
            <TouchableOpacity style={s.actionBtn} onPress={() => handleCancel(item)}>
              <Ionicons name="close-circle-outline" size={16} color={colors.error} />
              <Text style={[s.actionText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          {/* Completed/Cancelled: Reactivate */}
          {(item.status === 'completed' || item.status === 'cancelled') && (
            <TouchableOpacity style={s.actionBtn} onPress={() => openReactivateModal(item)}>
              <Ionicons name="refresh-outline" size={16} color={colors.warning} />
              <Text style={[s.actionText, { color: colors.warning }]}>Reactivate</Text>
            </TouchableOpacity>
          )}
          {/* Clone: available for all statuses */}
          <TouchableOpacity style={s.actionBtn} onPress={() => handleClone(item)}>
            <Ionicons name="copy-outline" size={16} color={colors.purple} />
            <Text style={[s.actionText, { color: colors.purple }]}>Clone</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[
        s.container,
        { backgroundColor: isDark ? Colors.dark.background : colors.background },
      ]}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.pageTitle, { color: isDark ? colors.slate : colors.gray800 }]}>
          Tournaments
        </Text>
        <TouchableOpacity style={s.createButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={s.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        {['', 'upcoming', 'active', 'completed', 'cancelled'].map((tf) => (
          <TouchableOpacity
            key={tf || 'all'}
            style={[s.filterChip, filterStatus === tf && s.filterChipActive]}
            onPress={() => setFilterStatus(tf)}
          >
            <Text
              style={[s.filterChipText, filterStatus === tf && s.filterChipTextActive]}
            >
              {tf || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color={colors.info} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(1, true)} />
          }
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color={colors.muted} />
              <Text style={s.emptyText}>No tournaments found</Text>
            </View>
          }
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={s.pagination}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => fetchItems(page - 1)}
            style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={page <= 1 ? colors.muted : colors.info}
            />
          </TouchableOpacity>
          <Text style={s.pageInfo}>
            Page {page} of {totalPages}
          </Text>
          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => fetchItems(page + 1)}
            style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={page >= totalPages ? colors.muted : colors.info}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView
          style={[
            s.modalContainer,
            { backgroundColor: isDark ? Colors.dark.background : colors.background },
          ]}
        >
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={isDark ? colors.slate : colors.gray800} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: isDark ? colors.slate : colors.gray800 }]}>
              {editingItem ? 'Edit Tournament' : 'Create Tournament'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.info} />
              ) : (
                <Text style={s.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent}>
            <Text
              style={[s.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}
            >
              Name *
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  color: isDark ? colors.slate : colors.gray800,
                  backgroundColor: isDark ? colors.slateDark : colors.card,
                },
              ]}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Tournament name"
              placeholderTextColor={colors.muted}
            />

            <Text
              style={[s.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}
            >
              Description
            </Text>
            <TextInput
              style={[
                s.textArea,
                {
                  color: isDark ? colors.slate : colors.gray800,
                  backgroundColor: isDark ? colors.slateDark : colors.card,
                },
              ]}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Tournament description"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text
              style={[s.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}
            >
              Type
            </Text>
            <View style={s.chipRow}>
              {TOURNAMENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    s.selectChip,
                    form.type === t && {
                      backgroundColor: (TYPE_COLORS[t] || colors.mutedDark) + '20',
                      borderColor: TYPE_COLORS[t],
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, type: t }))}
                >
                  <Text
                    style={[s.selectChipText, form.type === t && { color: TYPE_COLORS[t] }]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={[s.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}
            >
              Game Type
            </Text>
            <View style={s.chipRow}>
              {GAME_TYPES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[s.selectChip, form.gameType === g && s.selectChipActive]}
                  onPress={() => setForm((f) => ({ ...f, gameType: g }))}
                >
                  <Text
                    style={[s.selectChipText, form.gameType === g && { color: colors.info }]}
                  >
                    {g.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={[s.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}
            >
              Start Date
            </Text>
            <DateTimeInput
              value={form.startDate}
              onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
              isDark={isDark}
              placeholder="Select start date & time"
            />

            <Text
              style={[s.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}
            >
              End Date
            </Text>
            <DateTimeInput
              value={form.endDate}
              onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
              isDark={isDark}
              placeholder="Select end date & time"
            />

            <View style={s.numberRow}>
              <View style={s.numberField}>
                <Text
                  style={[
                    s.fieldLabel,
                    { color: isDark ? colors.slateLight : colors.gray700 },
                  ]}
                >
                  Max Players
                </Text>
                <TextInput
                  style={[
                    s.input,
                    {
                      color: isDark ? colors.slate : colors.gray800,
                      backgroundColor: isDark ? colors.slateDark : colors.card,
                    },
                  ]}
                  value={String(form.maxParticipants)}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, maxParticipants: parseInt(v) || 100 }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={s.numberField}>
                <Text
                  style={[
                    s.fieldLabel,
                    { color: isDark ? colors.slateLight : colors.gray700 },
                  ]}
                >
                  Prize Pool
                </Text>
                <TextInput
                  style={[
                    s.input,
                    {
                      color: isDark ? colors.slate : colors.gray800,
                      backgroundColor: isDark ? colors.slateDark : colors.card,
                    },
                  ]}
                  value={String(form.totalPrizePool)}
                  onChangeText={(v) => setForm((f) => ({ ...f, totalPrizePool: parseInt(v) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={s.numberField}>
                <Text
                  style={[
                    s.fieldLabel,
                    { color: isDark ? colors.slateLight : colors.gray700 },
                  ]}
                >
                  Entry Fee
                </Text>
                <TextInput
                  style={[
                    s.input,
                    {
                      color: isDark ? colors.slate : colors.gray800,
                      backgroundColor: isDark ? colors.slateDark : colors.card,
                    },
                  ]}
                  value={String(form.entryFee)}
                  onChangeText={(v) => setForm((f) => ({ ...f, entryFee: parseInt(v) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView
          style={[
            s.modalContainer,
            { backgroundColor: isDark ? Colors.dark.background : colors.background },
          ]}
        >
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color={isDark ? colors.slate : colors.gray800} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: isDark ? colors.slate : colors.gray800 }]}>
              Tournament Details
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {detailItem && (
            <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent}>
              <Text style={[s.detailName, { color: isDark ? colors.slate : colors.gray800 }]}>
                {detailItem.name}
              </Text>

              <View style={s.metaRow}>
                <View
                  style={[
                    s.statusBadge,
                    {
                      backgroundColor:
                        (STATUS_COLORS[detailItem.status] || colors.mutedDark) + '20',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: STATUS_COLORS[detailItem.status] || colors.mutedDark,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {detailItem.status}
                  </Text>
                </View>
                <View
                  style={[
                    s.chip,
                    { backgroundColor: (TYPE_COLORS[detailItem.type] || colors.mutedDark) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      s.chipText,
                      { color: TYPE_COLORS[detailItem.type] || colors.mutedDark },
                    ]}
                  >
                    {detailItem.type}
                  </Text>
                </View>
              </View>

              {detailItem.description ? (
                <Text
                  style={[
                    s.detailDescription,
                    { color: isDark ? colors.slateMedium : colors.mutedDark },
                  ]}
                >
                  {detailItem.description}
                </Text>
              ) : null}

              <View style={s.detailGrid}>
                <View style={s.detailCell}>
                  <Text style={s.detailLabel}>Game Type</Text>
                  <Text
                    style={[s.detailValue, { color: isDark ? colors.slate : colors.gray800 }]}
                  >
                    {detailItem.gameType}
                  </Text>
                </View>
                <View style={s.detailCell}>
                  <Text style={s.detailLabel}>Players</Text>
                  <Text
                    style={[s.detailValue, { color: isDark ? colors.slate : colors.gray800 }]}
                  >
                    {detailItem.participantsCount || 0}/{detailItem.maxParticipants}
                  </Text>
                </View>
                <View style={s.detailCell}>
                  <Text style={s.detailLabel}>Prize Pool</Text>
                  <Text
                    style={[s.detailValue, { color: isDark ? colors.slate : colors.gray800 }]}
                  >
                    {detailItem.totalPrizePool} coins
                  </Text>
                </View>
                <View style={s.detailCell}>
                  <Text style={s.detailLabel}>Entry Fee</Text>
                  <Text
                    style={[s.detailValue, { color: isDark ? colors.slate : colors.gray800 }]}
                  >
                    {detailItem.entryFee || 'Free'}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  s.detailSectionTitle,
                  { color: isDark ? colors.slate : colors.gray800 },
                ]}
              >
                Dates
              </Text>
              <Text style={s.dateText}>Start: {formatDate(detailItem.startDate)}</Text>
              <Text style={s.dateText}>End: {formatDate(detailItem.endDate)}</Text>

              {detailItem.prizes?.length > 0 && (
                <>
                  <Text
                    style={[
                      s.detailSectionTitle,
                      { color: isDark ? colors.slate : colors.gray800 },
                    ]}
                  >
                    Prizes
                  </Text>
                  {detailItem.prizes.map((prize, idx) => (
                    <View key={idx} style={s.prizeRow}>
                      <Text style={s.prizeRank}>#{prize.rank}</Text>
                      <Text
                        style={[
                          s.prizeCoins,
                          { color: isDark ? colors.slate : colors.gray800 },
                        ]}
                      >
                        {prize.coins} coins
                      </Text>
                      {prize.description ? (
                        <Text style={s.prizeDesc}>{prize.description}</Text>
                      ) : null}
                    </View>
                  ))}
                </>
              )}

              {detailItem.participants?.length > 0 && (
                <>
                  <Text
                    style={[
                      s.detailSectionTitle,
                      { color: isDark ? colors.slate : colors.gray800 },
                    ]}
                  >
                    Top Participants ({detailItem.participants.length})
                  </Text>
                  {detailItem.participants
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10)
                    .map((p, idx) => (
                      <View key={idx} style={s.participantRow}>
                        <Text style={s.participantRank}>#{idx + 1}</Text>
                        <Text
                          style={[
                            s.participantName,
                            { color: isDark ? colors.slate : colors.gray800 },
                          ]}
                        >
                          {p.user?.name || p.user?.toString()?.slice(-6) || 'User'}
                        </Text>
                        <Text style={s.participantScore}>{p.score} pts</Text>
                        <Text style={s.participantGames}>{p.gamesPlayed}g</Text>
                      </View>
                    ))}
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
      {/* Reactivate Modal */}
      <Modal visible={reactivateModalVisible} animationType="slide" transparent>
        <View style={s.reactivateOverlay}>
          <View
            style={[
              s.reactivateCard,
              { backgroundColor: isDark ? colors.slateDark : colors.card },
            ]}
          >
            <Text
              style={[s.reactivateTitle, { color: isDark ? colors.slate : colors.gray800 }]}
            >
              Reactivate Tournament
            </Text>
            {reactivateItem && <Text style={s.reactivateSubtitle}>{reactivateItem.name}</Text>}

            <Text
              style={[
                s.fieldLabel,
                { color: isDark ? colors.slateLight : colors.gray700, marginTop: 16 },
              ]}
            >
              New Start Date
            </Text>
            <DateTimeInput
              value={reactivateStartDate}
              onChange={setReactivateStartDate}
              isDark={isDark}
              placeholder="Select start date & time"
            />

            <Text
              style={[
                s.fieldLabel,
                { color: isDark ? colors.slateLight : colors.gray700, marginTop: 12 },
              ]}
            >
              New End Date
            </Text>
            <DateTimeInput
              value={reactivateEndDate}
              onChange={setReactivateEndDate}
              isDark={isDark}
              placeholder="Select end date & time"
            />

            <Text style={s.reactivateNote}>
              This will reset all participants and set the tournament to upcoming/active based on
              the start date.
            </Text>

            <View style={s.reactivateActions}>
              <TouchableOpacity
                style={s.reactivateCancelBtn}
                onPress={() => setReactivateModalVisible(false)}
              >
                <Text style={s.reactivateCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.reactivateConfirmBtn, reactivating && { opacity: 0.6 }]}
                onPress={handleReactivate}
                disabled={reactivating}
              >
                {reactivating ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={s.reactivateConfirmText}>Reactivate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

