import React, { useState, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, Modal, TextInput, ScrollView, Switch,
  Image, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { offersService, type Offer, type CreateOfferRequest } from '../../services/api/offers';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  useOffersList,
  useOfferStats,
  useOfferStores,
} from '@/hooks/queries';
import { queryClient } from '../../config/reactQuery';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { s } from './styles/offers.styles';

const isWeb = Platform.OS === 'web';
const PAGE_SIZE = 50;
const MAX_CONTENT_WIDTH = 900;
type OfferCategory = CreateOfferRequest['category'];
type OfferType = CreateOfferRequest['type'];

const EXCLUSIVE_ZONES = [
  { value: '', label: 'No Zone (General)' }, { value: 'student', label: 'Student' },
  { value: 'corporate', label: 'Corporate' }, { value: 'women', label: 'Women' },
  { value: 'birthday', label: 'Birthday' }, { value: 'senior', label: 'Senior' },
  { value: 'defence', label: 'Defence' }, { value: 'healthcare', label: 'Healthcare' },
  { value: 'teacher', label: 'Teacher' }, { value: 'government', label: 'Government' },
  { value: 'differently-abled', label: 'Differently Abled' }, { value: 'first-time', label: 'First-time' },
];
const CATEGORIES: { value: OfferCategory; label: string }[] = [
  { value: 'general', label: 'General' }, { value: 'food', label: 'Food' },
  { value: 'fashion', label: 'Fashion' }, { value: 'electronics', label: 'Electronics' },
  { value: 'beauty', label: 'Beauty' }, { value: 'wellness', label: 'Wellness' },
  { value: 'entertainment', label: 'Entertainment' }, { value: 'mega', label: 'Mega' },
  { value: 'student', label: 'Student' }, { value: 'new_arrival', label: 'New' },
  { value: 'trending', label: 'Trending' },
];
const OFFER_TYPES: { value: OfferType; label: string }[] = [
  { value: 'cashback', label: 'Cashback' }, { value: 'discount', label: 'Discount' },
  { value: 'voucher', label: 'Voucher' }, { value: 'combo', label: 'Combo' },
  { value: 'special', label: 'Special' }, { value: 'walk_in', label: 'Walk-in' },
];
const FILTER_ZONES = [
  { value: '', label: 'All', icon: 'apps' }, { value: 'all-exclusive', label: 'Exclusive', icon: 'star' },
  { value: 'none', label: 'General', icon: 'grid' }, { value: 'student', label: 'Student', icon: 'school' },
  { value: 'corporate', label: 'Corporate', icon: 'briefcase' }, { value: 'women', label: 'Women', icon: 'female' },
  { value: 'birthday', label: 'Birthday', icon: 'gift' }, { value: 'senior', label: 'Senior', icon: 'people' },
  { value: 'defence', label: 'Defence', icon: 'shield' },
];

const DEFAULT_FORM: Partial<CreateOfferRequest> = {
  title: '', subtitle: '', description: '', image: '',
  category: 'general', type: 'cashback', cashbackPercentage: 10, storeId: '',
  exclusiveZone: '', eligibilityRequirement: '',
  validity: { startDate: new Date(), endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), isActive: true },
  metadata: { priority: 0, tags: [], isNew: false, isTrending: false, featured: false },
  isFreeDelivery: false,
};

function normalizeCategory(c?: string): OfferCategory {
  const allowed = new Set<OfferCategory>(CATEGORIES.map(c => c.value));
  return allowed.has(c as OfferCategory) ? (c as OfferCategory) : 'general';
}
function normalizeType(t?: string): OfferType {
  const allowed = new Set<OfferType>(OFFER_TYPES.map(t => t.value));
  return allowed.has(t as OfferType) ? (t as OfferType) : 'cashback';
}

export default function OffersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [filterZone, setFilterZone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const { data: offersData, isLoading, refetch, isRefetching } = useOffersList({
    page: 1,
    limit: PAGE_SIZE,
    exclusiveZone: filterZone || undefined,
    search: searchQuery || undefined,
    isActive: showPendingOnly ? undefined : undefined,
  });

  const { data: stats } = useOfferStats();
  const { data: storesData } = useOfferStores();

  const offers = offersData?.offers ?? [];
  const pagination = offersData?.pagination;
  const stores = storesData ?? [];

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState<Partial<CreateOfferRequest>>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingOffer, setRejectingOffer] = useState<Offer | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showZoneSelector, setShowZoneSelector] = useState(false);

  const onRefresh = () => { refetch(); };

  const openCreate = () => {
    setEditingOffer(null);
    setFormData({ ...DEFAULT_FORM, storeId: stores[0]?._id || '' });
    setTagsInput('');
    setShowModal(true);
  };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title, subtitle: offer.subtitle || '', description: offer.description || '',
      image: offer.image, category: normalizeCategory(offer.category),
      type: normalizeType(offer.type), cashbackPercentage: offer.cashbackPercentage,
      storeId: offer.store.id, exclusiveZone: offer.exclusiveZone || '',
      eligibilityRequirement: offer.eligibilityRequirement || '',
      validity: { startDate: new Date(offer.validity.startDate), endDate: new Date(offer.validity.endDate), isActive: offer.validity.isActive },
      metadata: { priority: offer.metadata?.priority || 0, tags: offer.metadata?.tags || [], isNew: offer.metadata?.isNew || false, isTrending: offer.metadata?.isTrending || false, featured: offer.metadata?.featured || false },
      isFreeDelivery: offer.isFreeDelivery || false,
    });
    setTagsInput(offer.metadata?.tags?.join(', ') || '');
    setShowModal(true);
  };

  const saveOffer = async () => {
    if (!formData.title || !formData.image || !formData.storeId) {
      showAlert('Validation Error', 'Please fill in title, image URL, and select a store'); return;
    }
    setIsSaving(true);
    try {
      const data: CreateOfferRequest = {
        title: formData.title!, subtitle: formData.subtitle,
        description: formData.description, image: formData.image!,
        category: formData.category || 'general', type: formData.type || 'cashback',
        cashbackPercentage: formData.cashbackPercentage || 0, storeId: formData.storeId!,
        exclusiveZone: formData.exclusiveZone || null, eligibilityRequirement: formData.eligibilityRequirement,
        validity: { startDate: formData.validity?.startDate || new Date(), endDate: formData.validity?.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), isActive: formData.validity?.isActive ?? true },
        metadata: { priority: formData.metadata?.priority || 0, tags: (tagsInput || '').split(',').map(t => t.trim()).filter(Boolean), isNew: formData.metadata?.isNew || false, isTrending: formData.metadata?.isTrending || false, featured: formData.metadata?.featured || false },
        isFreeDelivery: formData.isFreeDelivery || false,
      };
      if (editingOffer) { await offersService.updateOffer(editingOffer._id, data); showAlert('Success', 'Offer updated successfully'); }
      else { await offersService.createOffer(data); showAlert('Success', 'Offer created successfully'); }
      setShowModal(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.stats() });
    } catch (error: any) { showAlert('Error', error.message || 'Failed to save offer'); }
    finally { setIsSaving(false); }
  };

  const toggleOffer = async (offer: Offer) => {
    try {
      const result = await offersService.toggleOffer(offer._id);
      queryClient.setQueryData(queryKeys.offers.list({ page: 1, limit: PAGE_SIZE }), (old: any) => old ? {
        ...old, offers: old.offers.map((o: Offer) => o._id === offer._id ? { ...o, validity: { ...o.validity, isActive: result.isActive } } : o)
      } : old);
    } catch (error: any) { showAlert('Error', error.message || 'Failed to toggle offer'); }
  };

  const deleteOffer = (offer: Offer) => {
    showConfirm('Delete Offer', `Delete "${offer.title}"?`, async () => {
      try {
        await offersService.deleteOffer(offer._id);
        queryClient.setQueryData(queryKeys.offers.list({ page: 1, limit: PAGE_SIZE }), (old: any) => old ? { ...old, offers: old.offers.filter((o: Offer) => o._id !== offer._id) } : old);
        showAlert('Success', 'Offer deleted successfully');
      } catch (error: any) { showAlert('Error', error.message || 'Failed to delete offer'); }
    }, 'Delete');
  };

  const approveOffer = async (offer: Offer) => {
    try {
      await offersService.approveOffer(offer._id);
      queryClient.setQueryData(queryKeys.offers.list({ page: 1, limit: PAGE_SIZE }), (old: any) => old ? { ...old, offers: old.offers.map((o: Offer) => o._id === offer._id ? { ...o, adminApproved: true } : o) } : old);
      showAlert('Approved', `"${offer.title}" has been approved`);
    } catch (error: any) { showAlert('Error', error.message || 'Failed to approve offer'); }
  };

  const rejectOffer = (offer: Offer) => { setRejectingOffer(offer); setRejectReason(''); setShowRejectModal(true); };

  const confirmReject = async () => {
    if (!rejectingOffer) return;
    if (!rejectReason.trim()) { showAlert('Required', 'Please enter a rejection reason'); return; }
    setIsRejecting(true);
    try {
      await offersService.rejectOffer(rejectingOffer._id, rejectReason.trim());
      queryClient.setQueryData(queryKeys.offers.list({ page: 1, limit: PAGE_SIZE }), (old: any) => old ? { ...old, offers: old.offers.map((o: Offer) => o._id === rejectingOffer._id ? { ...o, adminApproved: false } : o) } : old);
      showAlert('Rejected', `"${rejectingOffer.title}" has been rejected`);
      setShowRejectModal(false); setRejectingOffer(null);
    } catch (error: any) { showAlert('Error', error.message || 'Failed to reject offer'); }
    finally { setIsRejecting(false); }
  };

  const getStoreLabel = () => stores.find(s => s._id === formData.storeId)?.name || (editingOffer && formData.storeId ? editingOffer.store?.name : null) || 'Select store...';
  const getCategoryLabel = () => CATEGORIES.find(c => c.value === formData.category)?.label || 'Select...';
  const getTypeLabel = () => OFFER_TYPES.find(t => t.value === formData.type)?.label || 'Select...';
  const getZoneLabel = () => EXCLUSIVE_ZONES.find(z => z.value === (formData.exclusiveZone || ''))?.label || 'No Zone';

  const renderSelector = (visible: boolean, onClose: () => void, title: string, options: { value: string; label: string }[], selectedValue: string, onSelect: (v: string) => void) => (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={s.selectorOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[s.selectorBox, { backgroundColor: colors.card }]}>
          <Text style={[s.selectorTitle, { color: colors.text }]}>{title}</Text>
          <ScrollView style={s.selectorList} showsVerticalScrollIndicator={false}>
            {options.map(opt => (
              <TouchableOpacity key={opt.value} style={[s.selectorOption, selectedValue === opt.value && { backgroundColor: colors.tint + '15' }]} onPress={() => { onSelect(opt.value); onClose(); }}>
                <Text style={[s.selectorOptionText, { color: selectedValue === opt.value ? colors.tint : colors.text }]}>{opt.label}</Text>
                {selectedValue === opt.value && <Ionicons name="checkmark" size={20} color={colors.tint} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderOfferCard = ({ item }: { item: Offer }) => {
    const isExpired = new Date(item.validity.endDate) < new Date();
    return (
      <View style={[s.offerCard, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#888' }]}>
        <View style={s.offerCardContent}>
          <Image source={{ uri: item.image }} style={s.offerImage} />
          <View style={s.offerDetails}>
            <Text style={[s.offerTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[s.offerStore, { color: colors.textSecondary }]} numberOfLines={1}>{item.store.name}</Text>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: colors.success }]}><Text style={s.badgeText}>{item.cashbackPercentage}%</Text></View>
              {item.exclusiveZone && <View style={[s.badge, { backgroundColor: colors.purple }]}><Text style={s.badgeText}>{item.exclusiveZone}</Text></View>}
              {isExpired ? <View style={[s.badge, { backgroundColor: colors.error }]}><Text style={s.badgeText}>Expired</Text></View>
               : item.adminApproved === false ? <View style={[s.badge, { backgroundColor: colors.warning }]}><Text style={s.badgeText}>Pending</Text></View>
               : item.adminApproved === true ? <View style={[s.badge, { backgroundColor: colors.successDark }]}><Text style={s.badgeText}>Approved</Text></View> : null}
            </View>
          </View>
          <Switch value={item.validity.isActive} onValueChange={() => toggleOffer(item)} trackColor={{ false: colors.border, true: colors.success }} thumbColor={colors.card} style={s.switch} />
        </View>
        <View style={[s.offerActions, { borderTopColor: colors.border }]}>
          {item.adminApproved !== true && (
            <>
              <TouchableOpacity style={s.actionButton} onPress={() => approveOffer(item)}><Ionicons name="checkmark-circle-outline" size={16} color={colors.success} /><Text style={[s.actionText, { color: colors.success }]}>Approve</Text></TouchableOpacity>
              <View style={[s.actionDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={s.actionButton} onPress={() => rejectOffer(item)}><Ionicons name="close-circle-outline" size={16} color={colors.warning} /><Text style={[s.actionText, { color: colors.warning }]}>Reject</Text></TouchableOpacity>
              <View style={[s.actionDivider, { backgroundColor: colors.border }]} />
            </>
          )}
          <TouchableOpacity style={s.actionButton} onPress={() => openEdit(item)}><Ionicons name="pencil-outline" size={16} color={colors.info} /><Text style={[s.actionText, { color: colors.info }]}>Edit</Text></TouchableOpacity>
          <View style={[s.actionDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={s.actionButton} onPress={() => deleteOffer(item)}><Ionicons name="trash-outline" size={16} color={colors.error} /><Text style={[s.actionText, { color: colors.error }]}>Delete</Text></TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.contentWrapper}>
          <View style={[s.header, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}><Ionicons name="chevron-back" size={22} color={colors.text} /></TouchableOpacity>
              <Text style={[s.headerTitle, { color: colors.text }]}>Offers</Text>
            </View>
            <TouchableOpacity style={s.addButton} onPress={openCreate}><Ionicons name="add" size={20} color={colors.card} /><Text style={s.addButtonText}>Add Offer</Text></TouchableOpacity>
          </View>

          {stats && (
            <View style={s.statsRow}>
              <View style={[s.statCard, { backgroundColor: colors.card }]}><Text style={[s.statNumber, { color: colors.text }]}>{stats.total}</Text><Text style={[s.statLabel, { color: colors.textSecondary }]}>Total</Text></View>
              <View style={[s.statCard, { backgroundColor: colors.card }]}><Text style={[s.statNumber, { color: colors.success }]}>{stats.active}</Text><Text style={[s.statLabel, { color: colors.textSecondary }]}>Active</Text></View>
              <View style={[s.statCard, { backgroundColor: colors.card }]}><Text style={[s.statNumber, { color: colors.warning }]}>{stats.inactive}</Text><Text style={[s.statLabel, { color: colors.textSecondary }]}>Inactive</Text></View>
              <View style={[s.statCard, { backgroundColor: colors.card }]}><Text style={[s.statNumber, { color: colors.error }]}>{stats.expired}</Text><Text style={[s.statLabel, { color: colors.textSecondary }]}>Expired</Text></View>
            </View>
          )}

          <View style={[s.searchBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search offers..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></TouchableOpacity> : null}
          </View>

          <View style={s.filterWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContent}>
              <TouchableOpacity style={[s.filterChip, { backgroundColor: showPendingOnly ? colors.warning : colors.card, borderWidth: 1, borderColor: showPendingOnly ? colors.warning : colors.border }]} onPress={() => setShowPendingOnly(!showPendingOnly)}>
                <Ionicons name="time" size={14} color={showPendingOnly ? colors.card : colors.textSecondary} />
                <Text style={[s.filterChipText, { color: showPendingOnly ? colors.card : colors.text }]}>Pending Approval</Text>
              </TouchableOpacity>
              {FILTER_ZONES.map(zone => {
                const sel = filterZone === zone.value;
                return (
                  <TouchableOpacity key={zone.value} style={[s.filterChip, { backgroundColor: sel ? colors.success : colors.card, borderWidth: 1, borderColor: sel ? colors.success : colors.border }]} onPress={() => setFilterZone(zone.value)}>
                    <Ionicons name={zone.icon as unknown as keyof typeof Ionicons.glyphMap} size={14} color={sel ? colors.card : colors.textSecondary} />
                    <Text style={[s.filterChipText, { color: sel ? colors.card : colors.text }]}>{zone.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {isLoading && offers.length === 0 ? (
            <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /><Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading offers...</Text></View>
          ) : (
            <FlatList
              data={offers} keyExtractor={item => item._id} renderItem={renderOfferCard}
              contentContainerStyle={s.listContent}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.tint} />}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={
                <View style={s.emptyContainer}>
                  <Ionicons name="pricetag-outline" size={64} color={colors.textSecondary} />
                  <Text style={[s.emptyTitle, { color: colors.text }]}>No offers found</Text>
                  <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>{searchQuery || filterZone ? 'Try adjusting your filters' : 'Create your first offer to get started'}</Text>
                  <TouchableOpacity style={s.emptyButton} onPress={openCreate}><Text style={s.emptyButtonText}>Create Offer</Text></TouchableOpacity>
                </View>
              }
            />
          )}

          {pagination && pagination.totalPages > 0 && offers.length > 0 && (
            <View style={[s.paginationBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <Text style={[s.paginationPage, { color: colors.text }]}>Page {pagination.page} of {pagination.totalPages}</Text>
              <Text style={[s.paginationTotal, { color: colors.textSecondary }]}>{pagination.total} offers</Text>
            </View>
          )}
        </View>

        {/* Create/Edit Modal */}
        <Modal visible={showModal} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { backgroundColor: colors.card }]}>
              <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[s.modalTitle, { color: colors.text }]}>{editingOffer ? 'Edit Offer' : 'Create Offer'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              </View>
              <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={[s.inputLabel, { color: colors.text }]}>Title *</Text>
                <TextInput style={[s.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={formData.title} onChangeText={v => setFormData(p => ({ ...p, title: v }))} placeholder="Enter offer title" placeholderTextColor={colors.textSecondary} />
                <Text style={[s.inputLabel, { color: colors.text }]}>Image URL *</Text>
                <TextInput style={[s.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={formData.image} onChangeText={v => setFormData(p => ({ ...p, image: v }))} placeholder="https://..." placeholderTextColor={colors.textSecondary} />
                <Text style={[s.inputLabel, { color: colors.text }]}>Store *</Text>
                <TouchableOpacity style={[s.selectInput, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowStoreSelector(true)}>
                  <Text style={[s.selectText, { color: formData.storeId ? colors.text : colors.textSecondary }]}>{getStoreLabel()}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={s.rowInputs}>
                  <View style={s.halfInput}>
                    <Text style={[s.inputLabel, { color: colors.text }]}>Category</Text>
                    <TouchableOpacity style={[s.selectInput, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowCategorySelector(true)}>
                      <Text style={s.selectText}>{getCategoryLabel()}</Text><Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.halfInput}>
                    <Text style={[s.inputLabel, { color: colors.text }]}>Type</Text>
                    <TouchableOpacity style={[s.selectInput, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowTypeSelector(true)}>
                      <Text style={s.selectText}>{getTypeLabel()}</Text><Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[s.inputLabel, { color: colors.text }]}>Cashback %</Text>
                <TextInput style={[s.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={String(formData.cashbackPercentage || '')} onChangeText={v => setFormData(p => ({ ...p, cashbackPercentage: parseFloat(v) || 0 }))} keyboardType="decimal-pad" placeholder="10" placeholderTextColor={colors.textSecondary} />
                <Text style={[s.inputLabel, { color: colors.text }]}>Exclusive Zone</Text>
                <TouchableOpacity style={[s.selectInput, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setShowZoneSelector(true)}>
                  <Text style={s.selectText}>{getZoneLabel()}</Text><Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[s.inputLabel, { color: colors.text }]}>Subtitle</Text>
                <TextInput style={[s.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={formData.subtitle} onChangeText={v => setFormData(p => ({ ...p, subtitle: v }))} placeholder="Subtitle" placeholderTextColor={colors.textSecondary} />
                <Text style={[s.inputLabel, { color: colors.text }]}>Description</Text>
                <TextInput style={[s.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, minHeight: 60 }]} value={formData.description} onChangeText={v => setFormData(p => ({ ...p, description: v }))} multiline placeholder="Description" placeholderTextColor={colors.textSecondary} />
                <Text style={[s.inputLabel, { color: colors.text }]}>Eligibility</Text>
                <TextInput style={[s.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={formData.eligibilityRequirement} onChangeText={v => setFormData(p => ({ ...p, eligibilityRequirement: v }))} placeholder="Eligibility requirement" placeholderTextColor={colors.textSecondary} />
                <Text style={[s.inputLabel, { color: colors.text }]}>Tags (comma-separated)</Text>
                <TextInput style={[s.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={tagsInput} onChangeText={setTagsInput} placeholder="tag1, tag2" placeholderTextColor={colors.textSecondary} />
                <View style={s.switchRow}>
                  <Text style={[s.switchLabel, { color: colors.text }]}>Free Delivery</Text>
                  <Switch value={formData.isFreeDelivery ?? false} onValueChange={v => setFormData(p => ({ ...p, isFreeDelivery: v }))} trackColor={{ false: colors.border, true: colors.success }} thumbColor={colors.card} />
                </View>
                <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.tint }]} onPress={saveOffer} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>{editingOffer ? 'Update Offer' : 'Create Offer'}</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Reject Modal */}
        <Modal visible={showRejectModal} transparent animationType="fade">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowRejectModal(false)}>
            <View style={[s.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Reject Offer</Text>
              <TextInput style={[s.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={rejectReason} onChangeText={setRejectReason} placeholder="Enter rejection reason..." placeholderTextColor={colors.textSecondary} multiline />
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.error }]} onPress={confirmReject} disabled={isRejecting}>
                {isRejecting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Reject Offer</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {renderSelector(showStoreSelector, () => setShowStoreSelector(false), 'Select Store', stores.map(s => ({ value: s._id, label: s.name })), formData.storeId || '', v => setFormData(p => ({ ...p, storeId: v })))}
        {renderSelector(showCategorySelector, () => setShowCategorySelector(false), 'Category', CATEGORIES, formData.category || 'general', v => setFormData(p => ({ ...p, category: normalizeCategory(v) })))}
        {renderSelector(showTypeSelector, () => setShowTypeSelector(false), 'Type', OFFER_TYPES, formData.type || 'cashback', v => setFormData(p => ({ ...p, type: normalizeType(v) })))}
        {renderSelector(showZoneSelector, () => setShowZoneSelector(false), 'Exclusive Zone', EXCLUSIVE_ZONES, formData.exclusiveZone || '', v => setFormData(p => ({ ...p, exclusiveZone: v })))}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

