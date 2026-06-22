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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/event-rewards.styles';
import {
  adminEventsService,
  EventRewardConfig,
  EventRewardConfigRequest,
  RewardAction,
  REWARD_ACTIONS,
  AdminEvent,
} from '../../services/api/events';

interface RewardItem {
  action: RewardAction;
  coins: number;
  dailyLimit?: number;
  requiresVerification: boolean;
}

const DEFAULT_REWARD_ITEM: RewardItem = {
  action: 'entry_reward',
  coins: 10,
  dailyLimit: undefined,
  requiresVerification: false,
};

const DEFAULT_FORM: Partial<EventRewardConfigRequest> = {
  eventId: undefined,
  rewards: [{ ...DEFAULT_REWARD_ITEM }],
  isActive: true,
  validFrom: '',
  validUntil: '',
};

export default function EventRewardsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data states
  const [configs, setConfigs] = useState<EventRewardConfig[]>([]);
  const [globalConfig, setGlobalConfig] = useState<EventRewardConfig | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EventRewardConfig | null>(null);
  const [formData, setFormData] = useState<Partial<EventRewardConfigRequest>>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Event search for picker
  const [eventSearch, setEventSearch] = useState('');

  // ==========================================
  // DATA LOADING
  // ==========================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [configsData, globalData, eventsData] = await Promise.all([
        adminEventsService.getRewardConfigs(),
        adminEventsService.getGlobalRewardConfig(),
        adminEventsService.getEvents({ limit: 100 }),
      ]);
      setConfigs(configsData.filter((c) => !c.isGlobal));
      setGlobalConfig(globalData);
      setEvents(eventsData.events || []);
    } catch (error: any) {
      logger.error('Failed to load data:', error);
      showAlert('Error', error.message || 'Failed to load reward configs');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreateNew = () => {
    setEditingConfig(null);
    setFormData({
      ...DEFAULT_FORM,
      rewards: [{ ...DEFAULT_REWARD_ITEM }],
    });
    setShowFormModal(true);
  };

  const handleEdit = (config: EventRewardConfig) => {
    setEditingConfig(config);
    setFormData({
      eventId: config.isGlobal
        ? undefined
        : (typeof config.eventId === 'object'
            ? (config.eventId as AdminEvent)?._id
            : config.eventId) || undefined,
      rewards: config.rewards.map((r) => ({
        action: r.action,
        coins: r.coins,
        dailyLimit: r.dailyLimit,
        requiresVerification: r.requiresVerification,
      })),
      isActive: config.isActive,
      validFrom: config.validFrom || '',
      validUntil: config.validUntil || '',
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.rewards || formData.rewards.length === 0) {
      showAlert('Error', 'At least one reward is required');
      return;
    }

    // Validate rewards
    for (const reward of formData.rewards) {
      if (!reward.action) {
        showAlert('Error', 'All rewards must have an action type');
        return;
      }
      if (!reward.coins || reward.coins <= 0) {
        showAlert('Error', 'All rewards must have a positive coin amount');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editingConfig) {
        await adminEventsService.updateRewardConfig(editingConfig._id, formData);
        showAlert('Success', 'Reward config updated successfully');
      } else {
        await adminEventsService.createRewardConfig(formData as EventRewardConfigRequest);
        showAlert('Success', 'Reward config created successfully');
      }
      setShowFormModal(false);
      await loadData();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (config: EventRewardConfig) => {
    const name = config.isGlobal
      ? 'Global Default Config'
      : config.eventName || 'this reward config';
    showConfirm(
      'Delete Reward Config',
      `Are you sure you want to delete "${name}"?`,
      async () => {
        try {
          await adminEventsService.deleteRewardConfig(config._id);
          showAlert('Success', 'Reward config deleted');
          await loadData();
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Delete'
    );
  };

  // ==========================================
  // REWARD ITEMS MANAGEMENT
  // ==========================================

  const addRewardItem = () => {
    setFormData((p) => ({
      ...p,
      rewards: [...(p.rewards || []), { ...DEFAULT_REWARD_ITEM }],
    }));
  };

  const removeRewardItem = (index: number) => {
    setFormData((p) => ({
      ...p,
      rewards: (p.rewards || []).filter((_, i) => i !== index),
    }));
  };

  const updateRewardItem = (index: number, field: keyof RewardItem, value: any) => {
    setFormData((p) => ({
      ...p,
      rewards: (p.rewards || []).map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }));
  };

  // ==========================================
  // HELPERS
  // ==========================================

  const getActionLabel = (action: RewardAction): string => {
    const found = REWARD_ACTIONS.find((a) => a.value === action);
    return found?.label || action;
  };

  const getActionIcon = (action: RewardAction): string => {
    const found = REWARD_ACTIONS.find((a) => a.value === action);
    return found?.icon || 'gift-outline';
  };

  const getEventName = (config: EventRewardConfig): string => {
    if (config.isGlobal) return 'Global Default';
    if (config.eventName) return config.eventName;
    if (typeof config.eventId === 'object' && (config.eventId as AdminEvent)?.title) {
      return (config.eventId as AdminEvent).title;
    }
    const event = events.find((e) => e._id === config.eventId);
    return event?.title || 'Unknown Event';
  };

  const getTotalCoins = (rewards: EventRewardConfig['rewards']): number => {
    return rewards.reduce((sum, r) => sum + r.coins, 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filteredEvents = events.filter(
    (e) => !eventSearch || e.title.toLowerCase().includes(eventSearch.toLowerCase())
  );

  // ==========================================
  // RENDER SECTIONS
  // ==========================================

  const renderHeader = () => (
    <View style={s.header}>
      <View>
        <Text style={[s.headerTitle, { color: colors.text }]}>Event Rewards</Text>
        <Text style={[s.headerSubtitle, { color: colors.icon }]}>
          Manage coin rewards for event actions
        </Text>
      </View>
      <TouchableOpacity
        style={[s.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={20} color={colors.card} />
        <Text style={s.createBtnText}>Add Config</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGlobalConfig = () => {
    if (!globalConfig) {
      return (
        <TouchableOpacity
          style={[
            s.globalCard,
            s.globalCardEmpty,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={handleCreateNew}
        >
          <Ionicons name="globe-outline" size={32} color={colors.icon} />
          <Text style={[s.globalEmptyTitle, { color: colors.text }]}>
            No Global Default Config
          </Text>
          <Text style={[s.globalEmptyText, { color: colors.icon }]}>
            Create a global config to set default rewards for all events
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={[s.globalCard, { backgroundColor: colors.card }]}>
        <View style={s.globalCardHeader}>
          <View style={s.globalCardTitleRow}>
            <View style={[s.globalIconBox, { backgroundColor: `${colors.info}20` }]}>
              <Ionicons name="globe" size={24} color={colors.info} />
            </View>
            <View>
              <Text style={[s.globalTitle, { color: colors.text }]}>
                Global Default Config
              </Text>
              <Text style={[s.globalSubtitle, { color: colors.icon }]}>
                Applies to all events without specific config
              </Text>
            </View>
          </View>
          <View
            style={[
              s.activeChip,
              {
                backgroundColor: globalConfig.isActive
                  ? `${colors.success}15`
                  : `${colors.mutedDark}15`,
              },
            ]}
          >
            <View
              style={[
                s.activeDot,
                { backgroundColor: globalConfig.isActive ? colors.success : colors.mutedDark },
              ]}
            />
            <Text
              style={{
                color: globalConfig.isActive ? colors.success : colors.mutedDark,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              {globalConfig.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Rewards Preview */}
        <View style={s.rewardsPreview}>
          {globalConfig.rewards.map((reward, idx) => (
            <View
              key={idx}
              style={[s.rewardPreviewItem, { backgroundColor: colors.background }]}
            >
              <Ionicons name={getActionIcon(reward.action) as unknown as keyof typeof Ionicons.glyphMap} size={14} color={colors.tint} />
              <Text style={[s.rewardPreviewText, { color: colors.text }]}>
                {getActionLabel(reward.action)}
              </Text>
              <Text style={[s.rewardPreviewCoins, { color: colors.warning }]}>
                {reward.coins} coins
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={[s.globalSummary, { borderTopColor: colors.border }]}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: colors.text }]}>
              {globalConfig.rewards.length}
            </Text>
            <Text style={[s.summaryLabel, { color: colors.icon }]}>Rewards</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: colors.warning }]}>
              {getTotalCoins(globalConfig.rewards)}
            </Text>
            <Text style={[s.summaryLabel, { color: colors.icon }]}>Total Coins</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.globalActions}>
          <TouchableOpacity
            style={[s.globalActionBtn, { backgroundColor: `${colors.info}10` }]}
            onPress={() => handleEdit(globalConfig)}
          >
            <Ionicons name="pencil" size={16} color={colors.info} />
            <Text style={[s.globalActionText, { color: colors.info }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.globalActionBtn, { backgroundColor: `${colors.error}10` }]}
            onPress={() => handleDelete(globalConfig)}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
            <Text style={[s.globalActionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderConfigItem = ({ item }: { item: EventRewardConfig }) => (
    <View style={[s.configCard, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={s.configHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.configEventName, { color: colors.text }]} numberOfLines={1}>
            {getEventName(item)}
          </Text>
          <View style={s.configMeta}>
            <View style={s.metaChip}>
              <Ionicons name="gift-outline" size={11} color={colors.icon} />
              <Text style={[s.metaText, { color: colors.icon }]}>
                {item.rewards.length} reward{item.rewards.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={s.metaChip}>
              <Ionicons name="logo-bitcoin" size={11} color={colors.warning} />
              <Text style={[s.metaText, { color: colors.warning }]}>
                {getTotalCoins(item.rewards)} coins
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[
            s.activeChip,
            { backgroundColor: item.isActive ? `${colors.success}15` : `${colors.mutedDark}15` },
          ]}
        >
          <View
            style={[
              s.activeDot,
              { backgroundColor: item.isActive ? colors.success : colors.mutedDark },
            ]}
          />
          <Text
            style={{
              color: item.isActive ? colors.success : colors.mutedDark,
              fontSize: 11,
              fontWeight: '600',
            }}
          >
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Rewards list */}
      <View style={[s.rewardsList, { borderTopColor: colors.border }]}>
        {item.rewards.slice(0, 4).map((reward, idx) => (
          <View key={idx} style={s.rewardListItem}>
            <Ionicons name={getActionIcon(reward.action) as unknown as keyof typeof Ionicons.glyphMap} size={14} color={colors.tint} />
            <Text style={[s.rewardItemAction, { color: colors.text }]} numberOfLines={1}>
              {getActionLabel(reward.action)}
            </Text>
            <Text style={[s.rewardItemCoins, { color: colors.warning }]}>{reward.coins}c</Text>
            {reward.dailyLimit && (
              <Text style={[s.rewardItemLimit, { color: colors.icon }]}>
                ({reward.dailyLimit}/day)
              </Text>
            )}
            {reward.requiresVerification && (
              <Ionicons name="shield-checkmark" size={12} color={colors.purple} />
            )}
          </View>
        ))}
        {item.rewards.length > 4 && (
          <Text style={[s.moreRewards, { color: colors.icon }]}>
            +{item.rewards.length - 4} more
          </Text>
        )}
      </View>

      {/* Validity */}
      {(item.validFrom || item.validUntil) && (
        <View style={[s.validityRow, { borderTopColor: colors.border }]}>
          <Ionicons name="time-outline" size={12} color={colors.icon} />
          <Text style={[s.validityText, { color: colors.icon }]}>
            {item.validFrom ? formatDate(item.validFrom) : 'Start'} -{' '}
            {item.validUntil ? formatDate(item.validUntil) : 'No end'}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={[s.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[s.actionIconBtn, { backgroundColor: `${colors.info}10` }]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={16} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionIconBtn, { backgroundColor: `${colors.error}10` }]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={s.emptyState}>
      <Ionicons name="gift-outline" size={48} color={colors.icon} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No Event-Specific Configs</Text>
      <Text style={[s.emptyText, { color: colors.icon }]}>
        Event-specific reward configurations will appear here. The global default applies to all
        events without a specific config.
      </Text>
    </View>
  );

  const renderSectionHeader = () => (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionTitle, { color: colors.text }]}>
        Event-Specific Configs ({configs.length})
      </Text>
    </View>
  );

  // ==========================================
  // FORM MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowFormModal(false)} style={s.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {editingConfig ? 'Edit Reward Config' : 'Add Reward Config'}
          </Text>
          <TouchableOpacity
            style={[s.modalSaveBtn, { backgroundColor: colors.tint }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.modalSaveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.modalBody}
          contentContainerStyle={s.modalBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Selection */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>
              Event (leave empty for Global Default)
            </Text>
            <TouchableOpacity
              style={[
                s.eventSelectBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowEventPicker(true)}
            >
              {formData.eventId ? (
                <View style={s.selectedEventRow}>
                  <Ionicons name="calendar" size={16} color={colors.tint} />
                  <Text
                    style={[s.selectedEventName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {events.find((e) => e._id === formData.eventId)?.title || 'Selected Event'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setFormData((p) => ({ ...p, eventId: undefined }))}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.icon} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.eventSelectPlaceholder}>
                  <Ionicons name="globe-outline" size={16} color={colors.icon} />
                  <Text style={[s.eventSelectPlaceholderText, { color: colors.icon }]}>
                    Global Default (no specific event)
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Rewards Array */}
          <View style={[s.formSection, { borderColor: colors.border }]}>
            <View style={s.formSectionHeader}>
              <Ionicons name="gift" size={18} color={colors.tint} />
              <Text style={[s.formSectionTitle, { color: colors.text }]}>
                Rewards ({(formData.rewards || []).length})
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[s.addRewardBtn, { backgroundColor: colors.tint }]}
                onPress={addRewardItem}
              >
                <Ionicons name="add" size={16} color={colors.card} />
                <Text style={s.addRewardBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {(formData.rewards || []).map((reward, index) => (
              <View
                key={index}
                style={[
                  s.rewardFormItem,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={s.rewardFormHeader}>
                  <Text style={[s.rewardFormIndex, { color: colors.icon }]}>#{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeRewardItem(index)}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>

                {/* Action Type */}
                <View style={s.formGroup}>
                  <Text style={[s.formSubLabel, { color: colors.text }]}>Action</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {REWARD_ACTIONS.map((action) => (
                      <TouchableOpacity
                        key={action.value}
                        style={[
                          s.actionChip,
                          { borderColor: colors.border },
                          reward.action === action.value && {
                            backgroundColor: colors.tint,
                            borderColor: colors.tint,
                          },
                        ]}
                        onPress={() => updateRewardItem(index, 'action', action.value)}
                      >
                        <Ionicons
                          name={action.icon as unknown as keyof typeof Ionicons.glyphMap}
                          size={12}
                          color={reward.action === action.value ? colors.card : colors.icon}
                        />
                        <Text
                          style={[
                            s.actionChipText,
                            { color: reward.action === action.value ? colors.card : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Coins & Limit */}
                <View style={s.formRow}>
                  <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[s.formSubLabel, { color: colors.text }]}>Coins *</Text>
                    <TextInput
                      style={[
                        s.formInput,
                        {
                          backgroundColor: colors.card,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={reward.coins ? String(reward.coins) : ''}
                      onChangeText={(text) => updateRewardItem(index, 'coins', parseInt(text) || 0)}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                  <View style={[s.formGroup, { flex: 1 }]}>
                    <Text style={[s.formSubLabel, { color: colors.text }]}>Daily Limit</Text>
                    <TextInput
                      style={[
                        s.formInput,
                        {
                          backgroundColor: colors.card,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={reward.dailyLimit ? String(reward.dailyLimit) : ''}
                      onChangeText={(text) =>
                        updateRewardItem(index, 'dailyLimit', text ? parseInt(text) : undefined)
                      }
                      keyboardType="numeric"
                      placeholder="No limit"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                </View>

                {/* Requires Verification */}
                <View
                  style={[
                    s.switchRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.switchRowLabel, { color: colors.text }]}>
                      Requires Verification
                    </Text>
                    <Text style={[s.switchRowHint, { color: colors.icon }]}>
                      Admin must verify before coins are awarded
                    </Text>
                  </View>
                  <Switch
                    value={reward.requiresVerification}
                    onValueChange={(val) => updateRewardItem(index, 'requiresVerification', val)}
                    trackColor={{ true: colors.tint }}
                  />
                </View>
              </View>
            ))}

            {(formData.rewards || []).length === 0 && (
              <View style={s.noRewardsBox}>
                <Ionicons name="gift-outline" size={24} color={colors.icon} />
                <Text style={[s.noRewardsText, { color: colors.icon }]}>
                  No rewards added. Tap "Add" to create one.
                </Text>
              </View>
            )}
          </View>

          {/* Validity Dates */}
          <View style={[s.formSection, { borderColor: colors.border }]}>
            <View style={s.formSectionHeader}>
              <Ionicons name="time" size={18} color={colors.tint} />
              <Text style={[s.formSectionTitle, { color: colors.text }]}>Validity Period</Text>
            </View>

            <View style={s.formRow}>
              <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[s.formSubLabel, { color: colors.text }]}>Valid From</Text>
                {Platform.OS === 'web' ? (
                  <View>
                    <input
                      type="date"
                      value={
                        formData.validFrom
                          ? new Date(formData.validFrom).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e: any) => {
                        setFormData((p) => ({
                          ...p,
                          validFrom: e.target.value ? new Date(e.target.value).toISOString() : '',
                        }));
                      }}
                      style={{
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        color: colors.text,
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[
                      s.formInput,
                      {
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={formData.validFrom ? formatDate(formData.validFrom) : ''}
                    onChangeText={(text) => setFormData((p) => ({ ...p, validFrom: text }))}
                    placeholder="Optional start date"
                    placeholderTextColor={colors.icon}
                  />
                )}
              </View>
              <View style={[s.formGroup, { flex: 1 }]}>
                <Text style={[s.formSubLabel, { color: colors.text }]}>Valid Until</Text>
                {Platform.OS === 'web' ? (
                  <View>
                    <input
                      type="date"
                      value={
                        formData.validUntil
                          ? new Date(formData.validUntil).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e: any) => {
                        setFormData((p) => ({
                          ...p,
                          validUntil: e.target.value ? new Date(e.target.value).toISOString() : '',
                        }));
                      }}
                      style={{
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        color: colors.text,
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[
                      s.formInput,
                      {
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={formData.validUntil ? formatDate(formData.validUntil) : ''}
                    onChangeText={(text) => setFormData((p) => ({ ...p, validUntil: text }))}
                    placeholder="Optional end date"
                    placeholderTextColor={colors.icon}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Active Toggle */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Status</Text>
            <View
              style={[
                s.switchBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[s.switchLabel, { color: colors.icon }]}>
                {formData.isActive !== false ? 'Active' : 'Inactive'}
              </Text>
              <Switch
                value={formData.isActive !== false}
                onValueChange={(val) => setFormData((p) => ({ ...p, isActive: val }))}
                trackColor={{ true: colors.tint }}
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // EVENT PICKER MODAL
  // ==========================================

  const renderEventPickerModal = () => (
    <Modal visible={showEventPicker} animationType="fade" transparent>
      <View style={s.pickerOverlay}>
        <View style={[s.pickerContent, { backgroundColor: colors.card }]}>
          <View style={[s.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.pickerTitle, { color: colors.text }]}>Select Event</Text>
            <TouchableOpacity onPress={() => setShowEventPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              s.pickerSearchBox,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.icon} />
            <TextInput
              style={[s.pickerSearchInput, { color: colors.text }]}
              value={eventSearch}
              onChangeText={setEventSearch}
              placeholder="Search events..."
              placeholderTextColor={colors.icon}
            />
          </View>

          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item._id}
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  s.pickerItem,
                  { borderColor: colors.border },
                  formData.eventId === item._id && {
                    backgroundColor: `${colors.tint}10`,
                    borderColor: colors.tint,
                  },
                ]}
                onPress={() => {
                  setFormData((p) => ({ ...p, eventId: item._id }));
                  setShowEventPicker(false);
                  setEventSearch('');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.pickerItemName, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[s.pickerItemMeta, { color: colors.icon }]}>
                    {formatDate(item.date)} | {item.status}
                  </Text>
                </View>
                {formData.eventId === item._id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.pickerEmpty}>
                <Text style={[s.pickerEmptyText, { color: colors.icon }]}>
                  No events found
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  const ListHeader = () => (
    <>
      {renderHeader()}
      {renderGlobalConfig()}
      {renderSectionHeader()}
    </>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[s.loadingText, { color: colors.icon }]}>
            Loading reward configs...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={configs}
        keyExtractor={(item) => item._id}
        renderItem={renderConfigItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />

      {renderFormModal()}
      {renderEventPickerModal()}
    </SafeAreaView>
  );
}

// ==========================================
