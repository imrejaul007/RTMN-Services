import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Modal,
  Switch,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/gift-cards-admin.styles';

// ============================================
// TYPES & CONSTANTS
// ============================================
interface GiftCard {
  _id: string;
  name: string;
  description?: string;
  category: string;
  color: string;
  logo?: string;
  denominations: number[];
  cashbackPercentage: number;
  validityDays: number;
  termsAndConditions?: string;
  storeId?: string;
  isActive: boolean;
}
interface GiftCardFormData {
  name: string;
  description: string;
  category: string;
  color: string;
  logo: string;
  denominations: string;
  cashbackPercentage: string;
  validityDays: string;
  termsAndConditions: string;
  storeId: string;
  isActive: boolean;
}
const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'travel', label: 'Travel' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'general', label: 'General' },
];
const CAT_COLORS: Record<string, string> = {
  food: Colors.light.orange,
  shopping: Colors.light.purple,
  entertainment: Colors.light.pink,
  travel: Colors.light.cyan,
  beauty: '#F43F5E',
  general: Colors.light.mutedDark,
};
const DEFAULT_FORM: GiftCardFormData = {
  name: '',
  description: '',
  category: 'general',
  color: Colors.light.info,
  logo: '',
  denominations: '',
  cashbackPercentage: '',
  validityDays: '365',
  termsAndConditions: '',
  storeId: '',
  isActive: true,
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function GiftCardsAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean | undefined>(undefined);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
  const [formData, setFormData] = useState<GiftCardFormData>(DEFAULT_FORM);

  // DATA LOADING
  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (showActiveOnly !== undefined) params.set('isActive', String(showActiveOnly));
      const q = params.toString();
      const response = await apiClient.get<any>(`admin/gift-cards${q ? `?${q}` : ''}`);
      if (!response.success) throw new Error(response.message || 'Failed to load gift cards');
      setCards(response.data?.giftCards || response.data || []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load gift cards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, showActiveOnly]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCards();
  }, [loadCards]);

  // ACTIONS
  const handleCreate = () => {
    setEditingCard(null);
    setFormData({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (card: GiftCard) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      description: card.description || '',
      category: card.category,
      color: card.color || colors.info,
      logo: card.logo || '',
      denominations: (card.denominations || []).join(', '),
      cashbackPercentage: String(card.cashbackPercentage || ''),
      validityDays: String(card.validityDays || 365),
      termsAndConditions: card.termsAndConditions || '',
      storeId: card.storeId || '',
      isActive: card.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('Error', 'Name is required');
      return;
    }
    const denoms = formData.denominations
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);
    if (denoms.length === 0) {
      showAlert('Error', 'At least one valid denomination is required');
      return;
    }
    const cashback = Number(formData.cashbackPercentage) || 0;
    if (cashback < 0 || cashback > 100) {
      showAlert('Error', 'Cashback must be between 0 and 100');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        color: formData.color,
        logo: formData.logo.trim() || undefined,
        denominations: denoms,
        cashbackPercentage: cashback,
        validityDays: Number(formData.validityDays) || 365,
        termsAndConditions: formData.termsAndConditions.trim() || undefined,
        storeId: formData.storeId.trim() || undefined,
        isActive: formData.isActive,
      };
      if (editingCard) {
        const res = await apiClient.put(`admin/gift-cards/${editingCard._id}`, payload);
        if (!res.success) throw new Error(res.message || 'Failed to update');
        showAlert('Success', 'Gift card updated');
      } else {
        const res = await apiClient.post('admin/gift-cards', payload);
        if (!res.success) throw new Error(res.message || 'Failed to create');
        showAlert('Success', 'Gift card created');
      }
      setShowFormModal(false);
      loadCards();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save gift card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = (card: GiftCard) => {
    showConfirm(
      'Deactivate Gift Card',
      `Are you sure you want to deactivate "${card.name}"?`,
      async () => {
        try {
          const res = await apiClient.delete(`admin/gift-cards/${card._id}`);
          if (!res.success) throw new Error(res.message || 'Failed to deactivate');
          showAlert('Success', 'Gift card deactivated');
          loadCards();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to deactivate');
        }
      }
    );
  };

  // RENDERERS
  const renderCard = ({ item }: { item: GiftCard }) => {
    const catColor = CAT_COLORS[item.category] || colors.mutedDark;
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.colorStrip, { backgroundColor: item.color || catColor }]} />
        <View style={s.cardBody}>
          <View style={s.cardTopRow}>
            <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[s.catBadge, { backgroundColor: `${catColor}18` }]}>
              <Text style={[s.catBadgeText, { color: catColor }]}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
          </View>
          <View style={s.denomRow}>
            {(item.denominations || []).slice(0, 6).map((d, i) => (
              <View key={i} style={[s.denomPill, { backgroundColor: colors.background }]}>
                <Text style={s.denomText}>{d}</Text>
              </View>
            ))}
            {(item.denominations || []).length > 6 && (
              <Text style={s.moreText}>+{item.denominations.length - 6}</Text>
            )}
          </View>
          <View style={s.metaRow}>
            {item.cashbackPercentage > 0 && (
              <View style={s.cashbackBadge}>
                <Text style={s.cashbackText}>{item.cashbackPercentage}% cashback</Text>
              </View>
            )}
            <View style={[s.statusBadge, item.isActive ? s.activeBg : s.inactiveBg]}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: item.isActive ? colors.successDark : colors.mutedDark,
                }}
              >
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={s.cardActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
              <Ionicons name="create-outline" size={18} color={colors.info} />
              <Text style={[s.actionText, { color: colors.info }]}>Edit</Text>
            </TouchableOpacity>
            {item.isActive && (
              <TouchableOpacity style={s.actionBtn} onPress={() => handleDeactivate(item)}>
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[s.actionText, { color: colors.error }]}>Deactivate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const inp = (
    key: keyof GiftCardFormData,
    ph: string,
    opts?: { multi?: boolean; num?: boolean }
  ) => (
    <TextInput
      style={[
        s.formInput,
        opts?.multi && s.multiline,
        { color: colors.text, borderColor: colors.border },
      ]}
      value={String(formData[key])}
      onChangeText={(v) => setFormData((p) => ({ ...p, [key]: v }))}
      placeholder={ph}
      placeholderTextColor={colors.muted}
      multiline={opts?.multi}
      keyboardType={opts?.num ? 'numeric' : 'default'}
    />
  );

  // FORM MODAL
  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {editingCard ? 'Edit Gift Card' : 'New Gift Card'}
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
          <Text style={s.formLabel}>Name</Text>
          {inp('name', 'e.g. Swiggy Gift Card')}
          <Text style={s.formLabel}>Description</Text>
          {inp('description', 'Short description', { multi: true })}
          <Text style={s.formLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  s.filterChip,
                  formData.category === cat.value && s.filterChipActive,
                ]}
                onPress={() => setFormData((p) => ({ ...p, category: cat.value }))}
              >
                <Text
                  style={[
                    s.chipText,
                    formData.category === cat.value && s.chipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={s.formLabel}>Color (hex)</Text>
          <View style={s.colorRow}>
            <TextInput
              style={[
                s.formInput,
                { flex: 1, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.color}
              onChangeText={(v) => setFormData((p) => ({ ...p, color: v }))}
              placeholder={colors.info}
              placeholderTextColor={colors.muted}
            />
            <View style={[s.colorBox, { backgroundColor: formData.color || '#CCC' }]} />
          </View>
          <Text style={s.formLabel}>Logo URL</Text>
          {inp('logo', 'https://...')}
          <Text style={s.formLabel}>Denominations (comma-separated)</Text>
          {inp('denominations', '100, 250, 500, 1000')}
          <Text style={s.formLabel}>Cashback %</Text>
          {inp('cashbackPercentage', '5', { num: true })}
          <Text style={s.formLabel}>Validity Days</Text>
          {inp('validityDays', '365', { num: true })}
          <Text style={s.formLabel}>Terms & Conditions</Text>
          {inp('termsAndConditions', 'Enter terms...', { multi: true })}
          <Text style={s.formLabel}>Store ID (optional)</Text>
          {inp('storeId', 'MongoDB ObjectId')}
          <View style={s.switchRow}>
            <Text style={s.formLabel}>Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              trackColor={{ false: colors.border, true: colors.info }}
              thumbColor={colors.card}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // MAIN RENDER
  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <Text style={[s.headerTitle, { color: colors.text }]}>Gift Cards</Text>
        <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={s.createBtnText}>Add Gift Card</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.filtersBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[s.filterChip, selectedCategory === cat.value && s.filterChipActive]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Text
                style={[s.chipText, selectedCategory === cat.value && s.chipTextActive]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.toggleRow}>
          <Text style={{ fontSize: 12, color: colors.mutedDark, marginRight: 6 }}>Active only</Text>
          <Switch
            value={showActiveOnly === true}
            onValueChange={(v) => setShowActiveOnly(v ? true : undefined)}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor={colors.card}
          />
        </View>
      </View>
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : (
            <View style={s.emptyBox}>
              <Ionicons name="gift-outline" size={48} color={colors.gray300} />
              <Text style={s.emptyText}>No gift cards found</Text>
            </View>
          )
        }
      />
      {renderFormModal()}
    </View>
  );
}

// ============================================
// STYLES

