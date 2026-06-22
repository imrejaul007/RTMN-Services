import React, { useState, useEffect, useCallback } from 'react';
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
import { quickActionsService, QuickActionAdmin } from '../../services/api/quickActions';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/quick-actions.styles';

// ============================================
// TYPES & CONSTANTS
// ============================================

type ActiveFilter = 'all' | 'active' | 'inactive';

interface QuickActionFormData {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  deepLinkPath: string;
  targetAchievementTypes: string[];
  priority: number;
  isActive: boolean;
}

const DEFAULT_FORM: QuickActionFormData = {
  slug: '',
  title: '',
  subtitle: '',
  icon: 'flash',
  iconColor: Colors.light.info,
  deepLinkPath: '',
  targetAchievementTypes: [],
  priority: 0,
  isActive: true,
};

const COMMON_ICONS = [
  'flash',
  'star',
  'heart',
  'gift',
  'trophy',
  'ribbon',
  'rocket',
  'flame',
  'sparkles',
  'diamond',
  'medal',
  'cash',
  'wallet',
  'cart',
  'bag-handle',
  'storefront',
  'camera',
  'videocam',
  'share-social',
  'people',
  'person-add',
  'compass',
  'navigate',
  'map',
  'location',
  'search',
  'checkmark-circle',
  'shield-checkmark',
  'flag',
  'bookmark',
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function QuickActionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // List state
  const [actions, setActions] = useState<QuickActionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAction, setEditingAction] = useState<QuickActionAdmin | null>(null);
  const [formData, setFormData] = useState<QuickActionFormData>(DEFAULT_FORM);
  const [achievementTypesInput, setAchievementTypesInput] = useState('');

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadActions = useCallback(
    async (pageNum: number = 1) => {
      try {
        if (pageNum === 1) setLoading(true);
        const query: any = { page: pageNum, limit: 20 };
        if (activeFilter === 'active') query.isActive = true;
        if (activeFilter === 'inactive') query.isActive = false;
        if (searchQuery.trim()) query.search = searchQuery.trim();

        const data = await quickActionsService.getAll(query);
        setActions(data.quickActions);
        setTotalPages(data.pagination.pages);
        setPage(pageNum);
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to load quick actions');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFilter, searchQuery]
  );

  useEffect(() => {
    loadActions(1);
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActions(1);
  }, [loadActions]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreate = () => {
    setEditingAction(null);
    setFormData({ ...DEFAULT_FORM });
    setAchievementTypesInput('');
    setShowFormModal(true);
  };

  const handleEdit = (action: QuickActionAdmin) => {
    setEditingAction(action);
    setFormData({
      slug: action.slug,
      title: action.title,
      subtitle: action.subtitle || '',
      icon: action.icon,
      iconColor: action.iconColor || colors.info,
      deepLinkPath: action.deepLinkPath,
      targetAchievementTypes: action.targetAchievementTypes || [],
      priority: action.priority,
      isActive: action.isActive,
    });
    setAchievementTypesInput((action.targetAchievementTypes || []).join(', '));
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title) {
      showAlert('Error', 'Slug and title are required');
      return;
    }
    if (!formData.deepLinkPath) {
      showAlert('Error', 'Deep link path is required');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        targetAchievementTypes: achievementTypesInput
          ? achievementTypesInput
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };

      if (editingAction) {
        await quickActionsService.update(editingAction._id, payload);
        showAlert('Success', 'Quick action updated successfully');
      } else {
        await quickActionsService.create(payload);
        showAlert('Success', 'Quick action created successfully');
      }
      setShowFormModal(false);
      loadActions(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save quick action');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (action: QuickActionAdmin) => {
    showConfirm(
      'Delete Quick Action',
      `Are you sure you want to delete "${action.title}"?`,
      async () => {
        try {
          await quickActionsService.remove(action._id);
          showAlert('Success', 'Quick action deleted');
          loadActions(page);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  const handleToggleActive = async (action: QuickActionAdmin) => {
    try {
      await quickActionsService.toggleActive(action._id);
      loadActions(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle status');
    }
  };

  const handleMoveUp = async (action: QuickActionAdmin) => {
    const idx = actions.findIndex((a) => a._id === action._id);
    if (idx <= 0) return;

    const newOrder = [...actions];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    const orderedIds = newOrder.map((a) => a._id);

    try {
      await quickActionsService.reorder(orderedIds);
      loadActions(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reorder');
    }
  };

  const handleMoveDown = async (action: QuickActionAdmin) => {
    const idx = actions.findIndex((a) => a._id === action._id);
    if (idx >= actions.length - 1) return;

    const newOrder = [...actions];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    const orderedIds = newOrder.map((a) => a._id);

    try {
      await quickActionsService.reorder(orderedIds);
      loadActions(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reorder');
    }
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderActionCard = ({ item, index }: { item: QuickActionAdmin; index: number }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View
            style={[s.iconCircle, { backgroundColor: `${item.iconColor || colors.info}20` }]}
          >
            <Ionicons
              name={(item.icon as unknown as keyof typeof Ionicons.glyphMap) || 'flash'}
              size={20}
              color={item.iconColor || colors.info}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={s.cardSlug}>{item.slug}</Text>
          </View>
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ false: colors.border, true: colors.info }}
          thumbColor={colors.card}
        />
      </View>

      {/* Info */}
      {item.subtitle ? (
        <Text style={s.subtitleText} numberOfLines={1}>
          {item.subtitle}
        </Text>
      ) : null}

      <View style={s.cardInfoRow}>
        <View style={s.infoChip}>
          <Text style={s.infoChipText}>Priority: {item.priority}</Text>
        </View>
        <View style={s.infoChip}>
          <Ionicons name="link-outline" size={10} color={colors.gray700} />
          <Text style={[s.infoChipText, { marginLeft: 3 }]} numberOfLines={1}>
            {item.deepLinkPath}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[s.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, index === 0 && { opacity: 0.3 }]}
          onPress={() => handleMoveUp(item)}
          disabled={index === 0}
        >
          <Ionicons name="arrow-up-outline" size={18} color={colors.mutedDark} />
          <Text style={[s.actionText, { color: colors.mutedDark }]}>Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, index === actions.length - 1 && { opacity: 0.3 }]}
          onPress={() => handleMoveDown(item)}
          disabled={index === actions.length - 1}
        >
          <Ionicons name="arrow-down-outline" size={18} color={colors.mutedDark} />
          <Text style={[s.actionText, { color: colors.mutedDark }]}>Down</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[s.actionText, { color: colors.error }]}>Del</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
            {editingAction ? 'Edit Quick Action' : 'Create Quick Action'}
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
            placeholder="earn-coins"
            placeholderTextColor={colors.muted}
            editable={!editingAction}
          />

          <Text style={s.formLabel}>Title</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.title}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, title: v }))}
            placeholder="Earn Coins"
            placeholderTextColor={colors.muted}
          />

          <Text style={s.formLabel}>Subtitle</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.subtitle}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, subtitle: v }))}
            placeholder="Quick ways to earn rewards"
            placeholderTextColor={colors.muted}
          />

          {/* Icon */}
          <Text style={s.formSectionTitle}>Icon</Text>

          <Text style={s.formLabel}>Icon Name (Ionicons)</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.icon}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, icon: v }))}
            placeholder="flash"
            placeholderTextColor={colors.muted}
          />

          <Text style={s.formLabel}>Common Icons</Text>
          <View style={s.iconGrid}>
            {COMMON_ICONS.map((iconName) => (
              <TouchableOpacity
                key={iconName}
                style={[s.iconOption, formData.icon === iconName && s.iconOptionSelected]}
                onPress={() => setFormData((prev) => ({ ...prev, icon: iconName }))}
              >
                <Ionicons
                  name={iconName as unknown as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={formData.icon === iconName ? colors.card : colors.mutedDark}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.formLabel}>Icon Color</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.iconColor}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, iconColor: v }))}
            placeholder={colors.info}
            placeholderTextColor={colors.muted}
          />
          {formData.iconColor ? (
            <View style={s.iconPreviewRow}>
              <View style={[s.colorPreview, { backgroundColor: formData.iconColor }]} />
              <View
                style={[s.iconPreviewCircle, { backgroundColor: `${formData.iconColor}20` }]}
              >
                <Ionicons
                  name={(formData.icon as unknown as keyof typeof Ionicons.glyphMap) || 'flash'}
                  size={24}
                  color={formData.iconColor}
                />
              </View>
            </View>
          ) : null}

          {/* Navigation */}
          <Text style={s.formSectionTitle}>Navigation</Text>

          <Text style={s.formLabel}>Deep Link Path</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.deepLinkPath}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, deepLinkPath: v }))}
            placeholder="/earn-coins"
            placeholderTextColor={colors.muted}
          />

          <Text style={s.formLabel}>Target Achievement Types (comma-separated)</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={achievementTypesInput}
            onChangeText={setAchievementTypesInput}
            placeholder="daily_login, review_post, share_social"
            placeholderTextColor={colors.muted}
          />

          {/* Settings */}
          <Text style={s.formSectionTitle}>Settings</Text>

          <Text style={s.formLabel}>Priority (lower = shown first)</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={String(formData.priority || '')}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, priority: Number(v) || 0 }))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.muted}
          />

          <View style={s.switchRow}>
            <Text style={s.formLabel}>Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, isActive: v }))}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
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
        <Text style={[s.headerTitle, { color: colors.text }]}>Quick Actions</Text>
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
          onSubmitEditing={() => loadActions(1)}
          placeholder="Search quick actions..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterChips}>
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, activeFilter === f && s.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[s.filterChipText, activeFilter === f && s.filterChipTextActive]}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <FlatList
        data={actions}
        renderItem={renderActionCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : (
            <View style={s.emptyContainer}>
              <Ionicons name="flash-outline" size={48} color={colors.gray300} />
              <Text style={s.emptyText}>No quick actions found</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={s.pagination}>
              <TouchableOpacity
                style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
                onPress={() => page > 1 && loadActions(page - 1)}
                disabled={page <= 1}
              >
                <Text style={s.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={s.pageInfo}>
                Page {page} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
                onPress={() => page < totalPages && loadActions(page + 1)}
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
    </View>
  );
}

// ============================================
// STYLES
// ============================================

