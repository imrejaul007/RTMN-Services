import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  experiencesService,
  type StoreExperience,
  type ExperienceRequest,
  type FilterCriteria,
  type CategoryOption,
  type TagOption,
  type PreviewStore,
  type AssignableStore,
  type RegionId,
  EXPERIENCE_TYPES,
  BACKGROUND_COLORS,
  COMMON_EMOJIS,
  REGIONS,
  type AssignableStore as StoreType,
} from '@/services/api/experiences';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '@/utils/alert';

const DEFAULT_FILTER: FilterCriteria = {
  tags: [],
  minRating: 0,
  isPremium: false,
  isOrganic: false,
  isPartner: false,
  isMall: false,
  isFastDelivery: false,
  isBudgetFriendly: false,
  isVerified: false,
  categories: [],
};

const FILTER_TOGGLES = [
  { key: 'isFastDelivery', label: 'Fast Delivery', icon: 'flash' },
  { key: 'isPremium', label: 'Premium', icon: 'diamond' },
  { key: 'isOrganic', label: 'Organic', icon: 'leaf' },
  { key: 'isPartner', label: 'Partner', icon: 'handshake' },
  { key: 'isMall', label: 'Mall', icon: 'business' },
  { key: 'isBudgetFriendly', label: 'Budget', icon: 'pricetag' },
  { key: 'isVerified', label: 'Verified', icon: 'checkmark-circle' },
];

interface Props {
  visible: boolean;
  editing: StoreExperience | null;
  colors: typeof Colors.light;
  onClose: () => void;
  onSave: (data: ExperienceRequest) => Promise<void>;
  onToggle: (exp: StoreExperience) => Promise<void>;
  onToggleFeatured: (exp: StoreExperience) => Promise<void>;
  onDelete: (exp: StoreExperience) => Promise<void>;
}

export function ExperienceFormModal({ visible, editing, colors, onClose, onSave, onToggle, onToggleFeatured, onDelete }: Props) {
  const DEFAULT_FORM: Partial<ExperienceRequest> = {
    title: '', subtitle: '', description: '', slug: '', icon: '🛍️',
    iconType: 'emoji', type: 'custom', badge: '',
    badgeBg: colors.green, badgeColor: colors.card,
    backgroundColor: colors.warningLight, benefits: [],
    filterCriteria: DEFAULT_FILTER, regions: [], sortOrder: 0, isActive: true, isFeatured: false,
  };

  const [form, setForm] = useState<Partial<ExperienceRequest>>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [newBenefit, setNewBenefit] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [previewStores, setPreviewStores] = useState<PreviewStore[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
  const [assigned, setAssigned] = useState<AssignableStore[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssignableStore[]>([]);
  const [suggested, setSuggested] = useState<AssignableStore[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editing) {
        setForm({
          title: editing.title, subtitle: editing.subtitle || '',
          description: editing.description || '', slug: editing.slug,
          icon: editing.icon, iconType: editing.iconType, type: editing.type,
          badge: editing.badge || '', badgeBg: editing.badgeBg || colors.green,
          badgeColor: editing.badgeColor || colors.card,
          backgroundColor: editing.backgroundColor || colors.warningLight,
          benefits: editing.benefits || [],
          filterCriteria: editing.filterCriteria || DEFAULT_FILTER,
          regions: editing.regions || [], sortOrder: editing.sortOrder,
          isActive: editing.isActive, isFeatured: editing.isFeatured,
        });
        setShowFilter(true); setShowAssigned(true);
        loadAssigned(editing._id); loadSuggested();
        if (editing.filterCriteria && Object.keys(editing.filterCriteria).length > 0) {
          doPreview(editing.filterCriteria as FilterCriteria);
        }
      } else {
        setForm(DEFAULT_FORM); setPreviewStores([]); setPreviewTotal(0);
        setAssigned([]); setShowFilter(false); setShowAssigned(false);
      }
      loadCategoriesAndTags();
    }
  }, [visible, editing]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => doStoreSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadCategoriesAndTags = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        experiencesService.getCategories(),
        experiencesService.getTags(),
      ]);
      setCategories(catRes); setTags(tagRes);
    } catch { /* silently fail */ }
  };

  const doPreview = async (criteria: FilterCriteria) => {
    setIsLoadingPreview(true);
    try {
      const r = await experiencesService.previewStores(criteria, 5);
      setPreviewStores(r.stores); setPreviewTotal(r.total);
    } catch { /* silently fail */ }
    finally { setIsLoadingPreview(false); }
  };

  const doStoreSearch = async (q: string) => {
    setIsSearching(true);
    try {
      const r = await experiencesService.searchStores(q);
      const assignedIds = assigned.map(s => s._id);
      setSearchResults(r.stores.filter(s => !assignedIds.includes(s._id)));
    } catch { setSearchResults([]); }
    finally { setIsSearching(false); }
  };

  const loadSuggested = async () => {
    if (suggested.length > 0) return;
    setIsLoadingSuggested(true);
    try {
      const r = await experiencesService.getSuggestedStores();
      const assignedIds = assigned.map(s => s._id);
      setSuggested(r.stores.filter(s => !assignedIds.includes(s._id)));
    } catch { setSuggested([]); }
    finally { setIsLoadingSuggested(false); }
  };

  const loadAssigned = async (id: string) => {
    try {
      const r = await experiencesService.getAssignedStores(id);
      setAssigned(r.stores);
    } catch { setAssigned([]); }
  };

  const doSave = async () => {
    if (!form.title?.trim() || !form.slug?.trim() || !form.icon?.trim() || !form.type) {
      showAlert('Validation Error', 'Title, slug, icon, and type are required');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(form as ExperienceRequest);
    } finally { setIsSaving(false); }
  };

  const toggleToggle = (key: string) => {
    const fc = { ...(form.filterCriteria || DEFAULT_FILTER), [key]: !(form.filterCriteria as any)?.[key] };
    setForm(prev => ({ ...prev, filterCriteria: fc }));
    doPreview(fc);
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const fc = { ...(form.filterCriteria || DEFAULT_FILTER), tags: [...(form.filterCriteria?.tags || []), newTag.trim().toLowerCase()] };
    setForm(prev => ({ ...prev, filterCriteria: fc }));
    setNewTag('');
    doPreview(fc);
  };

  const removeTag = (tag: string) => {
    const fc = { ...(form.filterCriteria || DEFAULT_FILTER), tags: (form.filterCriteria?.tags || []).filter(t => t !== tag) };
    setForm(prev => ({ ...prev, filterCriteria: fc }));
    doPreview(fc);
  };

  const toggleCategory = (id: string) => {
    const cats = form.filterCriteria?.categories || [];
    const fc = { ...(form.filterCriteria || DEFAULT_FILTER), categories: cats.includes(id) ? cats.filter(c => c !== id) : [...cats, id] };
    setForm(prev => ({ ...prev, filterCriteria: fc }));
    doPreview(fc);
  };

  const toggleRegion = (r: RegionId) => {
    const regs = form.regions || [];
    setForm(prev => ({ ...prev, regions: regs.includes(r) ? regs.filter(x => x !== r) : [...regs, r] }));
  };

  const addBenefit = () => {
    if (!newBenefit.trim()) return;
    setForm(prev => ({ ...prev, benefits: [...(prev.benefits || []), newBenefit.trim()] }));
    setNewBenefit('');
  };

  const assignStore = async (store: AssignableStore) => {
    if (!editing) return;
    setIsAssigning(true);
    try {
      await experiencesService.assignStore(editing._id, store._id);
      setAssigned(prev => [...prev, store]);
      setSearchResults(prev => prev.filter(s => s._id !== store._id));
      setSuggested(prev => prev.filter(s => s._id !== store._id));
    } catch (e: any) { showAlert('Error', e.message || 'Failed to assign'); }
    finally { setIsAssigning(false); }
  };

  const removeStore = async (store: AssignableStore) => {
    if (!editing) return;
    showConfirm('Remove Store', `Remove "${store.name}" from this experience?`, async () => {
      try {
        await experiencesService.removeStore(editing._id, store._id);
        setAssigned(prev => prev.filter(s => s._id !== store._id));
      } catch (e: any) { showAlert('Error', e.message || 'Failed to remove'); }
    }, 'Remove');
  };

  const s = StyleSheet.create({
    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: '600' },
    saveBtn: { fontSize: 16, fontWeight: '600' },
    modalContent: { flex: 1, padding: 16 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    textInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text, backgroundColor: colors.card },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconPreview: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    iconPreviewText: { fontSize: 28 },
    sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.icon, marginTop: 16, marginBottom: 8 },
    typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8, marginBottom: 8 },
    typeChipText: { fontSize: 12 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    toggleLabel: { fontSize: 14, color: colors.text, flex: 1 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    benefitChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: colors.tint + '20' },
    benefitChipText: { fontSize: 12, color: colors.tint },
    tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: colors.info + '20', marginRight: 6, marginBottom: 6 },
    tagChipText: { fontSize: 11, color: colors.info },
    previewCard: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 6, gap: 10 },
    previewLogo: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight },
    previewInfo: { flex: 1 },
    previewName: { fontSize: 13, fontWeight: '600' },
    previewMeta: { fontSize: 11, color: colors.icon },
    regionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
    regionText: { fontSize: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    storeItem: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 6, gap: 10 },
    storeLogo: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight },
    storeInfo: { flex: 1 },
    storeName: { fontSize: 13, fontWeight: '600' },
    storeMeta: { fontSize: 11, color: colors.icon },
    removeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error + '20' },
    emptyState: { alignItems: 'center', padding: 20, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
    emptyText: { fontSize: 13, color: colors.icon, marginTop: 8 },
    gridRow: { flexDirection: 'row', flexWrap: 'wrap' },
    sectionToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 12 },
    sectionToggleLabel: { fontSize: 15, fontWeight: 600, color: colors.text },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.modalContainer}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={s.modalTitle}>{editing ? 'Edit Experience' : 'New Experience'}</Text>
          <TouchableOpacity onPress={doSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color={colors.tint} /> : <Text style={s.saveBtn}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
          <View style={s.formGroup}>
            <Text style={s.formLabel}>Icon</Text>
            <View style={s.iconRow}>
              <TouchableOpacity style={[s.iconPreview, { backgroundColor: form.backgroundColor || colors.warningLight }]} onPress={() => setShowEmoji(!showEmoji)}>
                <Text style={s.iconPreviewText}>{form.icon || '🛍️'}</Text>
              </TouchableOpacity>
              {showEmoji && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  {COMMON_EMOJIS.map((e, i) => (
                    <TouchableOpacity key={i} style={{ padding: 8 }} onPress={() => { setForm(p => ({ ...p, icon: e })); setShowEmoji(false); }}>
                      <Text style={{ fontSize: 24 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Title *</Text>
            <TextInput style={s.textInput} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))} placeholder="Experience title" placeholderTextColor={colors.icon} />
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Slug *</Text>
            <TextInput style={s.textInput} value={form.slug} onChangeText={v => setForm(p => ({ ...p, slug: v }))} placeholder="url-slug" placeholderTextColor={colors.icon} />
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Subtitle</Text>
            <TextInput style={s.textInput} value={form.subtitle} onChangeText={v => setForm(p => ({ ...p, subtitle: v }))} placeholder="Short subtitle" placeholderTextColor={colors.icon} />
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Description</Text>
            <TextInput style={[s.textInput, { minHeight: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} placeholder="Description" placeholderTextColor={colors.icon} multiline />
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Type *</Text>
            <View style={s.gridRow}>
              {EXPERIENCE_TYPES.map(et => (
                <TouchableOpacity key={et.value} style={[s.typeChip, { borderColor: form.type === et.value ? colors.tint : colors.border, backgroundColor: form.type === et.value ? colors.tint + '20' : 'transparent' }]} onPress={() => setForm(p => ({ ...p, type: et.value as any }))}>
                  <Text style={[s.typeChipText, { color: form.type === et.value ? colors.tint : colors.icon }]}>{et.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Badge</Text>
            <TextInput style={s.textInput} value={form.badge} onChangeText={v => setForm(p => ({ ...p, badge: v }))} placeholder="e.g. NEW, SALE" placeholderTextColor={colors.icon} />
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Benefits</Text>
            <View style={s.benefitRow}>
              <TextInput style={[s.textInput, { flex: 1 }]} value={newBenefit} onChangeText={setNewBenefit} placeholder="Add a benefit" placeholderTextColor={colors.icon} onSubmitEditing={addBenefit} />
              <TouchableOpacity style={{ padding: 10, backgroundColor: colors.tint, borderRadius: 8 }} onPress={addBenefit}><Ionicons name="add" size={20} color={colors.card} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
              {(form.benefits || []).map((b, i) => (
                <View key={i} style={[s.benefitChip, { marginRight: 6, marginBottom: 6 }]}>
                  <Text style={s.benefitChipText}>{b}</Text>
                  <TouchableOpacity onPress={() => setForm(p => ({ ...p, benefits: p.benefits?.filter((_, j) => j !== i) }))}>
                    <Ionicons name="close-circle" size={14} color={colors.tint} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Background Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {BACKGROUND_COLORS.map((c, i) => (
                <TouchableOpacity key={i} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, marginRight: 8, borderWidth: form.backgroundColor === c ? 2 : 0, borderColor: colors.tint }} onPress={() => setForm(p => ({ ...p, backgroundColor: c }))} />
              ))}
            </ScrollView>
          </View>

          <View style={s.formGroup}>
            <View style={s.sectionToggle}>
              <Text style={s.sectionToggleLabel}>Regions</Text>
            </View>
            <View style={s.gridRow}>
              {REGIONS.map(r => (
                <TouchableOpacity key={r.value} style={[s.regionChip, { borderColor: form.regions?.includes(r.value as RegionId) ? colors.tint : colors.border, backgroundColor: form.regions?.includes(r.value as RegionId) ? colors.tint + '20' : 'transparent' }]} onPress={() => toggleRegion(r.value as RegionId)}>
                  <Text style={s.regionText}>{r.flag} {r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.formGroup}>
            <View style={s.sectionToggle}>
              <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
                <Text style={s.sectionToggleLabel}>Store Filter Criteria {showFilter ? '▼' : '▶'}</Text>
              </TouchableOpacity>
            </View>
            {showFilter && (
              <>
                {FILTER_TOGGLES.map(ft => (
                  <View key={ft.key} style={s.toggleRow}>
                    <Text style={s.toggleLabel}>{ft.label}</Text>
                    <Switch value={!!(form.filterCriteria as any)?.[ft.key]} onValueChange={() => toggleToggle(ft.key)} trackColor={{ false: colors.border, true: colors.tint + '50' }} thumbColor={(form.filterCriteria as any)?.[ft.key] ? colors.tint : colors.icon} />
                  </View>
                ))}
                <View style={{ marginTop: 8 }}>
                  <Text style={[s.sectionTitle, { marginTop: 8 }]}>Categories</Text>
                  <View style={s.gridRow}>
                    {categories.map(c => (
                      <TouchableOpacity key={c._id} style={[s.typeChip, { borderColor: form.filterCriteria?.categories?.includes(c._id) ? colors.tint : colors.border, backgroundColor: form.filterCriteria?.categories?.includes(c._id) ? colors.tint + '20' : 'transparent' }]} onPress={() => toggleCategory(c._id)}>
                        <Text style={{ fontSize: 12, color: form.filterCriteria?.categories?.includes(c._id) ? colors.tint : colors.icon }}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[s.sectionTitle, { marginTop: 8 }]}>Tags</Text>
                  <View style={s.benefitRow}>
                    <TextInput style={[s.textInput, { flex: 1 }]} value={newTag} onChangeText={setNewTag} placeholder="Add tag" placeholderTextColor={colors.icon} onSubmitEditing={addTag} />
                    <TouchableOpacity style={{ padding: 10, backgroundColor: colors.info, borderRadius: 8 }} onPress={addTag}><Ionicons name="add" size={20} color={colors.card} /></TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                    {(form.filterCriteria?.tags || []).map((t, i) => (
                      <View key={i} style={[s.tagChip, { marginBottom: 6 }]}>
                        <Text style={s.tagChipText}>{t}</Text>
                        <TouchableOpacity onPress={() => removeTag(t)}><Ionicons name="close-circle" size={12} color={colors.info} /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <Text style={[s.sectionTitle, { marginTop: 8 }]}>Preview ({previewTotal} stores)</Text>
                  {isLoadingPreview ? <ActivityIndicator size="small" color={colors.tint} /> : previewStores.map(ps => (
                    <View key={ps._id} style={s.previewCard}>
                      <View style={s.previewLogo}><Ionicons name="storefront" size={18} color={colors.warning} /></View>
                      <View style={s.previewInfo}>
                        <Text style={s.previewName}>{ps.name}</Text>
                        <Text style={s.previewMeta}>{ps.category || ''} {ps.rating ? `• ⭐${ps.rating}` : ''}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={s.formGroup}>
            <View style={s.sectionToggle}>
              <TouchableOpacity onPress={() => { setShowAssigned(!showAssigned); if (!showAssigned) { loadSuggested(); } }}>
                <Text style={s.sectionToggleLabel}>Assigned Stores ({assigned.length}) {showAssigned ? '▼' : '▶'}</Text>
              </TouchableOpacity>
            </View>
            {showAssigned && editing && (
              <>
                <TextInput style={s.textInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search stores to assign..." placeholderTextColor={colors.icon} />
                {searchResults.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {searchResults.map(sr => (
                      <View key={sr._id} style={s.storeItem}>
                        <View style={s.storeLogo}><Ionicons name="storefront" size={18} color={colors.warning} /></View>
                        <View style={s.storeInfo}><Text style={s.storeName}>{sr.name}</Text><Text style={s.storeMeta}>{sr.category || ''}</Text></View>
                        <TouchableOpacity style={{ padding: 8 }} onPress={() => assignStore(sr)} disabled={isAssigning}><Ionicons name="add-circle" size={24} color={colors.tint} /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {isLoadingSuggested && <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: 8 }} />}
                {suggested.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={s.sectionTitle}>Suggested</Text>
                    {suggested.map(sg => (
                      <View key={sg._id} style={s.storeItem}>
                        <View style={s.storeLogo}><Ionicons name="storefront" size={18} color={colors.warning} /></View>
                        <View style={s.storeInfo}><Text style={s.storeName}>{sg.name}</Text><Text style={s.storeMeta}>{sg.category || ''}</Text></View>
                        <TouchableOpacity style={{ padding: 8 }} onPress={() => assignStore(sg)} disabled={isAssigning}><Ionicons name="add-circle" size={24} color={colors.tint} /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {assigned.length === 0 && (
                  <View style={[s.emptyState, { marginTop: 8 }]}><Text style={s.emptyText}>No stores assigned yet</Text></View>
                )}
                {assigned.map(asn => (
                  <View key={asn._id} style={s.storeItem}>
                    <View style={s.storeLogo}><Ionicons name="storefront" size={18} color={colors.warning} /></View>
                    <View style={s.storeInfo}><Text style={s.storeName}>{asn.name}</Text><Text style={s.storeMeta}>{asn.category || ''}</Text></View>
                    <TouchableOpacity style={s.removeBtn} onPress={() => removeStore(asn)}><Ionicons name="remove-circle" size={22} color={colors.error} /></TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>

          <View style={s.formGroup}>
            <Text style={s.formLabel}>Sort Order</Text>
            <TextInput style={s.textInput} value={String(form.sortOrder || 0)} onChangeText={v => setForm(p => ({ ...p, sortOrder: parseInt(v) || 0 }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.icon} />
          </View>

          <View style={s.formGroup}>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Active</Text>
              <Switch value={form.isActive ?? true} onValueChange={v => setForm(p => ({ ...p, isActive: v }))} trackColor={{ false: colors.border, true: colors.tint + '50' }} thumbColor={form.isActive ? colors.tint : colors.icon} />
            </View>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Featured</Text>
              <Switch value={form.isFeatured ?? false} onValueChange={v => setForm(p => ({ ...p, isFeatured: v }))} trackColor={{ false: colors.border, true: colors.tint + '50' }} thumbColor={form.isFeatured ? colors.tint : colors.icon} />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
