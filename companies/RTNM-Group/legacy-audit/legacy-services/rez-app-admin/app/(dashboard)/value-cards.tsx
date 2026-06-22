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
import { valueCardsService, ValueCardAdmin } from '../../services/api/valueCards';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/value-cards.styles';

// ============================================
// TYPES & CONSTANTS
// ============================================

type ActiveFilter = 'all' | 'active' | 'inactive';

interface ValueCardFormData {
  title: string;
  subtitle: string;
  emoji: string;
  deepLinkPath: string;
  sortOrder: number;
  isActive: boolean;
}

const DEFAULT_FORM: ValueCardFormData = {
  title: '',
  subtitle: '',
  emoji: '',
  deepLinkPath: '',
  sortOrder: 0,
  isActive: true,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ValueCardsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // List state
  const [cards, setCards] = useState<ValueCardAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCard, setEditingCard] = useState<ValueCardAdmin | null>(null);
  const [formData, setFormData] = useState<ValueCardFormData>(DEFAULT_FORM);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadCards = useCallback(
    async (pageNum: number = 1) => {
      try {
        if (pageNum === 1) setLoading(true);
        const query: any = { page: pageNum, limit: 20 };
        if (activeFilter === 'active') query.isActive = true;
        if (activeFilter === 'inactive') query.isActive = false;
        if (searchQuery.trim()) query.search = searchQuery.trim();

        const data = await valueCardsService.getAll(query);
        setCards(data.valueCards);
        setTotalPages(data.pagination.pages);
        setPage(pageNum);
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to load value cards');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFilter, searchQuery]
  );

  useEffect(() => {
    loadCards(1);
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCards(1);
  }, [loadCards]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreate = () => {
    setEditingCard(null);
    setFormData({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (card: ValueCardAdmin) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      subtitle: card.subtitle || '',
      emoji: card.emoji || '',
      deepLinkPath: card.deepLinkPath || '',
      sortOrder: card.sortOrder || 0,
      isActive: card.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      showAlert('Error', 'Title is required');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCard) {
        await valueCardsService.update(editingCard._id, formData);
        showAlert('Success', 'Value card updated successfully');
      } else {
        await valueCardsService.create(formData);
        showAlert('Success', 'Value card created successfully');
      }
      setShowFormModal(false);
      loadCards(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save value card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (card: ValueCardAdmin) => {
    showConfirm(
      'Delete Value Card',
      `Are you sure you want to delete "${card.title}"?`,
      async () => {
        try {
          await valueCardsService.remove(card._id);
          showAlert('Success', 'Value card deleted');
          loadCards(page);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  const handleToggleActive = async (card: ValueCardAdmin) => {
    try {
      await valueCardsService.toggleActive(card._id);
      loadCards(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle status');
    }
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderCardItem = ({ item }: { item: ValueCardAdmin }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <Text style={s.cardEmoji}>{item.emoji || '?'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={s.cardSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ false: colors.border, true: colors.info }}
          thumbColor={colors.card}
        />
      </View>

      {/* Info Row */}
      <View style={s.cardInfoRow}>
        {item.deepLinkPath ? (
          <View style={s.infoChip}>
            <Ionicons name="link-outline" size={10} color={colors.gray700} />
            <Text style={[s.infoChipText, { marginLeft: 3 }]} numberOfLines={1}>
              {item.deepLinkPath}
            </Text>
          </View>
        ) : null}
        <View style={s.infoChip}>
          <Text style={s.infoChipText}>Order: {item.sortOrder}</Text>
        </View>
        <View
          style={[
            s.infoChip,
            { backgroundColor: item.isActive ? colors.successLight : colors.errorLight },
          ]}
        >
          <Text
            style={[
              s.infoChipText,
              { color: item.isActive ? colors.successDeep : colors.errorDeep },
            ]}
          >
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[s.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[s.actionText, { color: colors.error }]}>Delete</Text>
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
            {editingCard ? 'Edit Value Card' : 'Create Value Card'}
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
          <Text style={s.formSectionTitle}>Card Content</Text>

          <Text style={s.formLabel}>Title</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.title}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, title: v }))}
            placeholder="Save on Groceries"
            placeholderTextColor={colors.muted}
          />

          <Text style={s.formLabel}>Subtitle</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.subtitle}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, subtitle: v }))}
            placeholder="Up to 30% cashback on daily essentials"
            placeholderTextColor={colors.muted}
          />

          <Text style={s.formLabel}>Emoji</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.emoji}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, emoji: v }))}
            placeholder="e.g. a single emoji like a cart or bag"
            placeholderTextColor={colors.muted}
          />
          {formData.emoji ? <Text style={s.emojiPreview}>{formData.emoji}</Text> : null}

          {/* Navigation */}
          <Text style={s.formSectionTitle}>Navigation</Text>

          <Text style={s.formLabel}>Deep Link Path</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.deepLinkPath}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, deepLinkPath: v }))}
            placeholder="/explore/category/grocery"
            placeholderTextColor={colors.muted}
          />

          {/* Settings */}
          <Text style={s.formSectionTitle}>Settings</Text>

          <Text style={s.formLabel}>Sort Order (lower = shown first)</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={String(formData.sortOrder || '')}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, sortOrder: Number(v) || 0 }))}
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

          {/* Preview */}
          <Text style={s.formSectionTitle}>Preview</Text>
          <View style={s.previewCard}>
            <Text style={s.previewEmoji}>{formData.emoji || '?'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.previewTitle} numberOfLines={1}>
                {formData.title || 'Card Title'}
              </Text>
              <Text style={s.previewSubtitle} numberOfLines={2}>
                {formData.subtitle || 'Card subtitle will appear here'}
              </Text>
            </View>
          </View>
          <Text style={s.previewLabel}>This is how the value card will appear to users</Text>
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
        <Text style={[s.headerTitle, { color: colors.text }]}>Value Cards</Text>
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
          onSubmitEditing={() => loadCards(1)}
          placeholder="Search value cards..."
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
        data={cards}
        renderItem={renderCardItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : (
            <View style={s.emptyContainer}>
              <Ionicons name="card-outline" size={48} color={colors.gray300} />
              <Text style={s.emptyText}>No value cards found</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={s.pagination}>
              <TouchableOpacity
                style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
                onPress={() => page > 1 && loadCards(page - 1)}
                disabled={page <= 1}
              >
                <Text style={s.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={s.pageInfo}>
                Page {page} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
                onPress={() => page < totalPages && loadCards(page + 1)}
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

