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
  Modal,
  TextInput,
  ScrollView,
  Switch,
  useColorScheme,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { adminTrialsService, type TrialBundle } from '../../services/api/trials';
import { s } from './styles/bundle-management.styles';

type FilterType = 'all' | 'active' | 'pass' | 'pack';

const INITIAL_FORM = {
  name: '',
  description: '',
  bundleType: 'pass' as 'pass' | 'pack',
  price: '',
  originalPrice: '',
  trialSlots: '5',
  trialCoinsIncluded: '100',
  bonusRewardCoins: '50',
  validityDays: '30',
  category: '',
  maxUsesPerMerchant: '1',
  featured: false,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BundleManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [bundles, setBundles] = useState<TrialBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<TrialBundle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  // Load bundles from API
  const loadBundles = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await adminTrialsService.listBundles();
      const data = (response as unknown as {data?: {bundles?: TrialBundle[]}})?.data ?? response;
      setBundles((data as {bundles?: TrialBundle[]})?.bundles || []);
    } catch (err: any) {
      logger.error('Failed to load bundles:', err);
      if (!isRefresh) setBundles([]);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBundles(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadBundles]);

  useEffect(() => {
    loadBundles();
  }, [loadBundles]);

  // ─── Modal helpers ───────────────────────────────────

  const resetForm = () => setFormData({ ...INITIAL_FORM });

  const openCreateModal = () => {
    setEditingBundle(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (bundle: TrialBundle) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      description: bundle.description || '',
      bundleType: bundle.bundleType,
      price: String(bundle.price),
      originalPrice: String(bundle.originalPrice),
      trialSlots: String(bundle.trialSlots),
      trialCoinsIncluded: String(bundle.trialCoinsIncluded),
      bonusRewardCoins: String(bundle.bonusRewardCoins),
      validityDays: String(bundle.validityDays),
      category: bundle.category || '',
      maxUsesPerMerchant: String((bundle as unknown as {maxUsesPerMerchant?: number}).maxUsesPerMerchant ?? 1),
      featured: bundle.featured,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBundle(null);
    resetForm();
  };

  // ─── CRUD ────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showAlert('Validation Error', 'Please enter bundle name');
      return;
    }
    if (!formData.description.trim()) {
      showAlert('Validation Error', 'Please enter bundle description');
      return;
    }
    if (!formData.price) {
      showAlert('Validation Error', 'Please enter bundle price');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBundle) {
        // Update
        await adminTrialsService.updateBundle(editingBundle._id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          bundleType: formData.bundleType,
          price: parseInt(formData.price) || 0,
          originalPrice: parseInt(formData.originalPrice) || parseInt(formData.price) || 0,
          trialSlots: parseInt(formData.trialSlots) || 5,
          trialCoinsIncluded: parseInt(formData.trialCoinsIncluded) || 100,
          bonusRewardCoins: parseInt(formData.bonusRewardCoins) || 50,
          validityDays: parseInt(formData.validityDays) || 30,
          category: formData.category || null,
          maxUsesPerMerchant: parseInt(formData.maxUsesPerMerchant) || 1,
          featured: formData.featured,
        });
        await loadBundles();
        handleCloseModal();
        showAlert('Success', 'Bundle updated successfully');
      } else {
        // Create
        await adminTrialsService.createBundle({
          name: formData.name.trim(),
          description: formData.description.trim(),
          slug: slugify(formData.name),
          bundleType: formData.bundleType,
          price: parseInt(formData.price) || 0,
          originalPrice: parseInt(formData.originalPrice) || parseInt(formData.price) || 0,
          trialSlots: parseInt(formData.trialSlots) || 5,
          trialCoinsIncluded: parseInt(formData.trialCoinsIncluded) || 100,
          bonusRewardCoins: parseInt(formData.bonusRewardCoins) || 50,
          validityDays: parseInt(formData.validityDays) || 30,
          category: formData.category || undefined,
          maxUsesPerMerchant: parseInt(formData.maxUsesPerMerchant) || 1,
          featured: formData.featured,
        });
        await loadBundles();
        handleCloseModal();
        showAlert('Success', 'Bundle created successfully');
      }
    } catch (err: any) {
      showAlert('Error', err.message || `Failed to ${editingBundle ? 'update' : 'create'} bundle`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (bundle: TrialBundle) => {
    try {
      await adminTrialsService.updateBundle(bundle._id, {
        isActive: !bundle.isActive,
      });
      setBundles(bundles.map((b) => (b._id === bundle._id ? { ...b, isActive: !b.isActive } : b)));
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update bundle');
    }
  };

  const handleToggleFeatured = async (bundle: TrialBundle) => {
    try {
      await adminTrialsService.updateBundle(bundle._id, {
        featured: !bundle.featured,
      });
      setBundles(bundles.map((b) => (b._id === bundle._id ? { ...b, featured: !b.featured } : b)));
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update bundle');
    }
  };

  const handleDelete = (bundle: TrialBundle) => {
    showConfirm(
      'Delete Bundle',
      `Are you sure you want to delete "${bundle.name}"? This cannot be undone.`,
      async () => {
        try {
          await adminTrialsService.deleteBundle(bundle._id);
          setBundles((prev) => prev.filter((b) => b._id !== bundle._id));
          showAlert('Success', 'Bundle deleted successfully');
        } catch (err: any) {
          showAlert('Error', err.message || 'Failed to delete bundle');
        }
      }
    );
  };

  // ─── Filters ─────────────────────────────────────────

  const filteredBundles = bundles.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'active') return b.isActive;
    if (filter === 'pass') return b.bundleType === 'pass';
    if (filter === 'pack') return b.bundleType === 'pack';
    return true;
  });

  const getTypeLabel = (type: string): string => {
    return type === 'pass' ? 'Pass' : 'Pack';
  };

  // ─── Card renderer ──────────────────────────────────

  const renderBundle = ({ item }: { item: TrialBundle }) => {
    const discount =
      item.originalPrice > 0
        ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
        : 0;

    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Title + Type badge + Actions */}
        <View style={s.cardHeader}>
          <View style={s.cardTitle}>
            <View style={s.titleRow}>
              <Text style={[s.title, { color: colors.text }]}>{item.name}</Text>
              <View
                style={[
                  s.typeBadge,
                  { backgroundColor: item.bundleType === 'pass' ? '#F0FDF4' : '#EEF2FF' },
                ]}
              >
                <Text
                  style={[
                    s.typeBadgeText,
                    { color: item.bundleType === 'pass' ? '#16A34A' : '#6366F1' },
                  ]}
                >
                  {getTypeLabel(item.bundleType)}
                </Text>
              </View>
            </View>
            {item.description ? (
              <Text style={[s.description, { color: colors.icon }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
          {/* Edit / Delete actions */}
          <View style={s.cardActions}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.background }]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="pencil" size={14} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#FEF2F2' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Price */}
        <View style={[s.priceSection, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[s.price, { color: colors.text }]}>
              {'\u20B9'}
              {item.price}
            </Text>
            {item.originalPrice > item.price && (
              <Text style={[s.originalPrice, { color: colors.icon }]}>
                was {'\u20B9'}
                {item.originalPrice}
              </Text>
            )}
          </View>
          {discount > 0 && (
            <View style={s.discountBadge}>
              <Text style={s.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        {/* Details grid */}
        <View style={s.details}>
          <View style={s.detailRow}>
            <View style={s.detailItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#8B5CF6" />
              <Text style={[s.detailText, { color: colors.text }]}>
                {item.trialSlots} trials
              </Text>
            </View>
            <View style={s.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
              <Text style={[s.detailText, { color: colors.text }]}>
                {item.validityDays} days
              </Text>
            </View>
          </View>
          <View style={s.detailRow}>
            <View style={s.detailItem}>
              <Ionicons name="diamond-outline" size={16} color="#8B5CF6" />
              <Text style={[s.detailText, { color: colors.text }]}>
                {item.trialCoinsIncluded} coins
              </Text>
            </View>
            {item.bonusRewardCoins > 0 && (
              <View style={s.detailItem}>
                <Ionicons name="gift-outline" size={16} color="#F59E0B" />
                <Text style={[s.detailText, { color: colors.text }]}>
                  +{item.bonusRewardCoins} bonus
                </Text>
              </View>
            )}
          </View>
          <View style={s.detailRow}>
            {item.category ? (
              <View style={s.detailItem}>
                <Ionicons name="pricetag-outline" size={16} color="#8B5CF6" />
                <Text style={[s.detailText, { color: colors.text }]}>{item.category}</Text>
              </View>
            ) : null}
            <View style={s.detailItem}>
              <Ionicons name="cart-outline" size={16} color="#8B5CF6" />
              <Text style={[s.detailText, { color: colors.text }]}>
                {item.totalPurchases ?? 0} purchases
              </Text>
            </View>
          </View>
        </View>

        {/* Toggles */}
        <View style={[s.toggleSection, { borderTopColor: colors.border }]}>
          <View style={s.toggleItem}>
            <Text style={[s.toggleLabel, { color: colors.text }]}>Active</Text>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{ false: colors.border, true: '#8B5CF6' }}
              thumbColor={item.isActive ? '#8B5CF6' : '#E5E7EB'}
            />
          </View>
          <View style={s.toggleItem}>
            <Text style={[s.toggleLabel, { color: colors.text }]}>Featured</Text>
            <Switch
              value={item.featured}
              onValueChange={() => handleToggleFeatured(item)}
              trackColor={{ false: colors.border, true: '#F59E0B' }}
              thumbColor={item.featured ? '#F59E0B' : '#E5E7EB'}
            />
          </View>
        </View>
      </View>
    );
  };

  // ─── Loading state ──────────────────────────────────

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={['#16A34A', '#22C55E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <View style={s.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Trial Bundles & Passes</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      </View>
    );
  }

  // ─── Main render ────────────────────────────────────

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#16A34A', '#22C55E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Trial Bundles & Passes</Text>
          <TouchableOpacity style={s.createButton} onPress={openCreateModal}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={[s.filterContainer, { borderBottomColor: colors.border }]}>
        {(['all', 'active', 'pass', 'pack'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              s.filterTab,
              filter === f && [s.filterTabActive, { borderBottomColor: '#16A34A' }],
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                s.filterTabText,
                filter === f && { color: '#16A34A', fontWeight: '600' },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bundles List */}
      {filteredBundles.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="pricetag-outline" size={64} color={colors.icon} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Bundles</Text>
          <Text style={[s.emptySubtitle, { color: colors.icon }]}>
            {filter === 'all' ? 'Create your first bundle' : `No ${filter} bundles found`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBundles}
          renderItem={renderBundle}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Create / Edit Bundle Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {editingBundle ? 'Edit Bundle' : 'Create Bundle'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalForm} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Name *</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Bundle name"
                  placeholderTextColor={colors.icon}
                  value={formData.name}
                  onChangeText={(v) => setFormData({ ...formData, name: v })}
                />
              </View>

              {/* Description */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Description *</Text>
                <TextInput
                  style={[
                    s.formInput,
                    s.textArea,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="Bundle description"
                  placeholderTextColor={colors.icon}
                  value={formData.description}
                  onChangeText={(v) => setFormData({ ...formData, description: v })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Type */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Type *</Text>
                <View style={s.typeSelector}>
                  {(['pass', 'pack'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        s.typeOption,
                        formData.bundleType === t && s.typeOptionActive,
                        { borderColor: formData.bundleType === t ? '#16A34A' : colors.border },
                      ]}
                      onPress={() => setFormData({ ...formData, bundleType: t })}
                    >
                      <Text
                        style={[
                          s.typeOptionText,
                          { color: formData.bundleType === t ? '#16A34A' : colors.text },
                        ]}
                      >
                        {getTypeLabel(t)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Price ({'\u20B9'}) *</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="99"
                  placeholderTextColor={colors.icon}
                  value={formData.price}
                  onChangeText={(v) => setFormData({ ...formData, price: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Original Price */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>
                  Original Price ({'\u20B9'})
                </Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="199"
                  placeholderTextColor={colors.icon}
                  value={formData.originalPrice}
                  onChangeText={(v) => setFormData({ ...formData, originalPrice: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Trial Slots */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Trial Slots</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="5"
                  placeholderTextColor={colors.icon}
                  value={formData.trialSlots}
                  onChangeText={(v) => setFormData({ ...formData, trialSlots: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Trial Coins */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Trial Coins Included</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="100"
                  placeholderTextColor={colors.icon}
                  value={formData.trialCoinsIncluded}
                  onChangeText={(v) => setFormData({ ...formData, trialCoinsIncluded: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Bonus Reward Coins */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Bonus Reward Coins</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="50"
                  placeholderTextColor={colors.icon}
                  value={formData.bonusRewardCoins}
                  onChangeText={(v) => setFormData({ ...formData, bonusRewardCoins: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Validity Days */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Validity Days</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="30"
                  placeholderTextColor={colors.icon}
                  value={formData.validityDays}
                  onChangeText={(v) => setFormData({ ...formData, validityDays: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Category */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Category (optional)</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Beauty & Wellness"
                  placeholderTextColor={colors.icon}
                  value={formData.category}
                  onChangeText={(v) => setFormData({ ...formData, category: v })}
                />
              </View>

              {/* Max Uses Per Merchant */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>
                  Max Uses Per Merchant
                </Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="1"
                  placeholderTextColor={colors.icon}
                  value={formData.maxUsesPerMerchant}
                  onChangeText={(v) => setFormData({ ...formData, maxUsesPerMerchant: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Featured */}
              <View style={[s.formField, s.toggleField]}>
                <Text style={[s.formLabel, { color: colors.text }]}>Featured</Text>
                <Switch
                  value={formData.featured}
                  onValueChange={(v) => setFormData({ ...formData, featured: v })}
                  trackColor={{ false: colors.border, true: '#16A34A' }}
                  thumbColor={formData.featured ? '#16A34A' : '#E5E7EB'}
                />
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[s.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[s.modalButton, { borderColor: colors.border }]}
                onPress={handleCloseModal}
                disabled={isSubmitting}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, s.modalButtonPrimary]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.modalButtonPrimaryText}>
                    {editingBundle ? 'Save' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

