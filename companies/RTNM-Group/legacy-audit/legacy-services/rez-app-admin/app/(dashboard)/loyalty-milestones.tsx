import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loyaltyMilestonesService, LoyaltyMilestone } from '../../services/api/loyaltyMilestones';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/loyalty-milestones.styles';

const TARGET_TYPES = ['orders', 'spend', 'referrals', 'reviews', 'checkins', 'purchases'];
const REWARD_TYPES = ['coins', 'badge', 'discount', 'freebie', 'tier_upgrade'];
const TIERS = ['bronze', 'silver', 'gold', 'platinum'];

export default function LoyaltyMilestonesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [milestones, setMilestones] = useState<LoyaltyMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<LoyaltyMilestone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetType, setFormTargetType] = useState('orders');
  const [formTargetValue, setFormTargetValue] = useState('');
  const [formReward, setFormReward] = useState('');
  const [formRewardType, setFormRewardType] = useState('coins');
  const [formRewardCoins, setFormRewardCoins] = useState('');
  const [formRewardDiscount, setFormRewardDiscount] = useState('');
  const [formIcon, setFormIcon] = useState('trophy');
  const [formColor, setFormColor] = useState(colors.warning);
  const [formTier, setFormTier] = useState('');
  const [formOrder, setFormOrder] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchMilestones = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await loyaltyMilestonesService.getMilestones(params);
      if (response.success && response.data) setMilestones(response.data.milestones || []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormTargetType('orders');
    setFormTargetValue('');
    setFormReward('');
    setFormRewardType('coins');
    setFormRewardCoins('');
    setFormRewardDiscount('');
    setFormIcon('trophy');
    setFormColor(colors.warning);
    setFormTier('');
    setFormOrder('0');
    setFormIsActive(true);
    setEditingMilestone(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };
  const openEdit = (m: LoyaltyMilestone) => {
    setEditingMilestone(m);
    setFormTitle(m.title);
    setFormDescription(m.description);
    setFormTargetType(m.targetType);
    setFormTargetValue(String(m.targetValue));
    setFormReward(m.reward);
    setFormRewardType(m.rewardType);
    setFormRewardCoins(m.rewardCoins ? String(m.rewardCoins) : '');
    setFormRewardDiscount(m.rewardDiscount ? String(m.rewardDiscount) : '');
    setFormIcon(m.icon);
    setFormColor(m.color);
    setFormTier(m.tier || '');
    setFormOrder(String(m.order));
    setFormIsActive(m.isActive);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formDescription || !formTargetValue || !formReward || !formRewardType) {
      showAlert('Error', 'Title, description, target value, reward, and reward type are required');
      return;
    }
    const coins = formRewardCoins ? parseInt(formRewardCoins) : 0;
    const discount = formRewardDiscount ? parseInt(formRewardDiscount) : 0;
    if (!coins && !discount) {
      showAlert('Error', 'Specify either reward coins or reward discount %');
      return;
    }
    if (discount && (discount < 0 || discount > 100)) {
      showAlert('Error', 'Reward discount must be between 0 and 100');
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        title: formTitle,
        description: formDescription,
        targetType: formTargetType,
        targetValue: parseInt(formTargetValue),
        reward: formReward,
        rewardType: formRewardType,
        rewardCoins: coins || undefined,
        rewardDiscount: discount || undefined,
        icon: formIcon,
        color: formColor,
        tier: formTier || undefined,
        order: parseInt(formOrder) || 0,
        isActive: formIsActive,
      };
      if (editingMilestone)
        await loyaltyMilestonesService.updateMilestone(editingMilestone._id, data);
      else await loyaltyMilestonesService.createMilestone(data);
      setShowModal(false);
      resetForm();
      fetchMilestones();
      showAlert('Success', editingMilestone ? 'Milestone updated' : 'Milestone created');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (m: LoyaltyMilestone) => {
    try {
      await loyaltyMilestonesService.toggleMilestone(m._id);
      fetchMilestones();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleDelete = async (m: LoyaltyMilestone) => {
    const confirmed = await showConfirm('Delete Milestone', `Delete "${m.title}"?`);
    if (!confirmed) return;
    try {
      await loyaltyMilestonesService.deleteMilestone(m._id);
      fetchMilestones();
      showAlert('Success', 'Milestone deleted');
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const getTierColor = (tier?: string) => {
    const map: Record<string, string> = {
      bronze: colors.bronze,
      silver: '#C0C0C0',
      gold: colors.goldBright,
      platinum: '#E5E4E2',
    };
    return map[tier || ''] || colors.mutedDark;
  };

  const stats = {
    total: milestones.length,
    active: milestones.filter((m) => m.isActive).length,
    inactive: milestones.filter((m) => !m.isActive).length,
  };

  if (loading)
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchMilestones();
          }}
        />
      }
    >
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Loyalty Milestones</Text>
          <Text style={[s.subtitle, { color: colors.icon }]}>
            Manage loyalty program milestones
          </Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.tint }]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={s.addBtnText}>Add Milestone</Text>
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: colors.info },
          { label: 'Active', value: stats.active, color: colors.success },
          { label: 'Inactive', value: stats.inactive, color: colors.error },
        ].map((item) => (
          <View
            key={item.label}
            style={[
              s.statCard,
              {
                backgroundColor: isDark ? colors.gray800 : colors.card,
                borderColor: isDark ? colors.gray700 : colors.gray200,
              },
            ]}
          >
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.filtersRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && { backgroundColor: colors.tint }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && { color: colors.card }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={[
          s.searchBar,
          {
            backgroundColor: isDark ? colors.gray800 : colors.backgroundSecondary,
            borderColor: isDark ? colors.gray700 : colors.gray200,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search milestones..."
          placeholderTextColor={colors.icon}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {milestones.map((m) => (
        <View
          key={m._id}
          style={[
            s.card,
            {
              backgroundColor: isDark ? colors.gray800 : colors.card,
              borderColor: isDark ? colors.gray700 : colors.gray200,
            },
          ]}
        >
          <View style={s.cardHeader}>
            <View style={[s.iconBadge, { backgroundColor: m.color + '30' }]}>
              <Ionicons name={(m.icon || 'trophy') as unknown as keyof typeof Ionicons.glyphMap} size={20} color={m.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>{m.title}</Text>
              <Text style={[s.cardMeta, { color: colors.icon }]} numberOfLines={1}>
                {m.description}
              </Text>
            </View>
            <Switch value={m.isActive} onValueChange={() => handleToggle(m)} />
          </View>
          <View style={s.tagRow}>
            <View style={[s.badge, { backgroundColor: `${colors.info}20` }]}>
              <Text style={[s.badgeText, { color: colors.info }]}>
                {m.targetType}: {m.targetValue}
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: `${colors.success}20` }]}>
              <Text style={[s.badgeText, { color: colors.success }]}>
                {m.rewardType}: {m.reward}
              </Text>
            </View>
            {m.tier && (
              <View style={[s.badge, { backgroundColor: getTierColor(m.tier) + '30' }]}>
                <Text style={[s.badgeText, { color: getTierColor(m.tier) }]}>{m.tier}</Text>
              </View>
            )}
            <Text style={[s.cardMeta, { color: colors.icon }]}>Order: {m.order}</Text>
          </View>
          <View style={s.cardActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(m)}>
              <Ionicons name="pencil" size={16} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(m)}>
              <Ionicons name="trash" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {milestones.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={colors.icon} />
          <Text style={[s.emptyText, { color: colors.icon }]}>
            No loyalty milestones found
          </Text>
        </View>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View
            style={[
              s.modalContent,
              { backgroundColor: isDark ? colors.gray800 : colors.card },
            ]}
          >
            <ScrollView>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {editingMilestone ? 'Edit Milestone' : 'Create Milestone'}
              </Text>
              {[
                { label: 'Title *', value: formTitle, setter: setFormTitle },
                { label: 'Description *', value: formDescription, setter: setFormDescription },
                {
                  label: 'Target Value *',
                  value: formTargetValue,
                  setter: setFormTargetValue,
                  keyboard: 'number-pad' as const,
                },
                { label: 'Reward *', value: formReward, setter: setFormReward },
                {
                  label: 'Reward Coins',
                  value: formRewardCoins,
                  setter: setFormRewardCoins,
                  keyboard: 'number-pad' as const,
                },
                {
                  label: 'Reward Discount %',
                  value: formRewardDiscount,
                  setter: setFormRewardDiscount,
                  keyboard: 'number-pad' as const,
                },
                { label: 'Icon', value: formIcon, setter: setFormIcon },
                { label: 'Color', value: formColor, setter: setFormColor },
                {
                  label: 'Order',
                  value: formOrder,
                  setter: setFormOrder,
                  keyboard: 'number-pad' as const,
                },
              ].map((field) => (
                <View key={field.label} style={s.formField}>
                  <Text style={[s.formLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[
                      s.formInput,
                      {
                        color: colors.text,
                        backgroundColor: isDark ? colors.gray700 : colors.backgroundSecondary,
                        borderColor: isDark ? colors.gray600 : colors.gray300,
                      },
                    ]}
                    value={field.value}
                    onChangeText={field.setter}
                    placeholderTextColor={colors.icon}
                    keyboardType={field.keyboard}
                  />
                </View>
              ))}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Target Type *</Text>
                <View style={s.typeRow}>
                  {TARGET_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        s.typeChip,
                        formTargetType === t && { backgroundColor: colors.tint },
                      ]}
                      onPress={() => setFormTargetType(t)}
                    >
                      <Text
                        style={[
                          s.typeChipText,
                          formTargetType === t && { color: colors.card },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Reward Type *</Text>
                <View style={s.typeRow}>
                  {REWARD_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        s.typeChip,
                        formRewardType === t && { backgroundColor: colors.tint },
                      ]}
                      onPress={() => setFormRewardType(t)}
                    >
                      <Text
                        style={[
                          s.typeChipText,
                          formRewardType === t && { color: colors.card },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Tier (Optional)</Text>
                <View style={s.typeRow}>
                  {['', ...TIERS].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeChip, formTier === t && { backgroundColor: colors.tint }]}
                      onPress={() => setFormTier(t)}
                    >
                      <Text style={[s.typeChipText, formTier === t && { color: colors.card }]}>
                        {t || 'None'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Active</Text>
                <Switch value={formIsActive} onValueChange={setFormIsActive} />
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.mutedDark }]}
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Text style={s.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.tint }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.card} size="small" />
                  ) : (
                    <Text style={s.modalBtnText}>
                      {editingMilestone ? 'Update' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

