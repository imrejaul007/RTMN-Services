/**
 * components/mall-admin/tabs/MallModals.tsx
 * ADM-005: Mall CRUD modals for categories, offers, banners, collections.
 * Extracted from mall.tsx to keep the main file under 500 lines.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../../constants/Colors';
import { MallCategory, MallOffer, MallBanner, MallCollection } from '../../../services/api/mall';

type ColorsType = typeof Colors.light;

interface CategoryForm {
  name: string; slug: string; description: string; icon: string; image: string;
  color: string; backgroundColor: string; maxCashback: string; sortOrder: string;
  isActive: boolean; isFeatured: boolean;
}

interface OfferForm {
  title: string; subtitle: string; description: string; image: string;
  store: string; brand: string; offerType: string; value: string; valueType: string;
  minPurchase: string; maxDiscount: string; validFrom: string; validUntil: string;
  badge: string; isActive: boolean; isMallExclusive: boolean;
}

interface BannerForm {
  title: string; subtitle: string; image: string; backgroundColor: string;
  textColor: string; ctaText: string; ctaAction: string; ctaUrl: string;
  ctaBrand: string; ctaCategory: string; ctaCollection: string;
  position: string; priority: string; validFrom: string; validUntil: string;
  isActive: boolean; badge: string;
}

interface CollectionForm {
  name: string; slug: string; description: string; image: string;
  type: string; sortOrder: string; validFrom: string; validUntil: string;
  isActive: boolean;
}

interface Props {
  colors: ColorsType;
  // Category modal
  showCategoryModal: boolean; editingCategory: MallCategory | null;
  categoryForm: CategoryForm;
  onCategoryFormChange: React.Dispatch<React.SetStateAction<CategoryForm>>;
  onCloseCategoryModal: () => void; onSaveCategory: () => void;
  // Offer modal
  showOfferModal: boolean; editingOffer: MallOffer | null;
  offerForm: OfferForm;
  onOfferFormChange: React.Dispatch<React.SetStateAction<OfferForm>>;
  onCloseOfferModal: () => void; onSaveOffer: () => void;
  // Banner modal
  showBannerModal: boolean; editingBanner: MallBanner | null;
  bannerForm: BannerForm;
  onBannerFormChange: React.Dispatch<React.SetStateAction<BannerForm>>;
  onCloseBannerModal: () => void; onSaveBanner: () => void;
  // Collection modal
  showCollectionModal: boolean; editingCollection: MallCollection | null;
  collectionForm: CollectionForm;
  onCollectionFormChange: React.Dispatch<React.SetStateAction<CollectionForm>>;
  onCloseCollectionModal: () => void; onSaveCollection: () => void;
}

// ==================== SHARED HELPERS ====================

function formField(
  colors: ColorsType, label: string, value: string,
  onChange: (v: string) => void, opts?: { placeholder?: string; multiline?: boolean }
) {
  return (
    <View style={s.formField}>
      <Text style={[s.formLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[s.formInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, opts?.multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={opts?.placeholder || ''}
        placeholderTextColor={colors.icon} multiline={opts?.multiline}
      />
    </View>
  );
}

function switchField(colors: ColorsType, label: string, value: boolean, onChange: (v: boolean) => void) {
  return (
    <View style={s.switchField}>
      <Text style={[s.formLabel, { color: colors.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.tint }} thumbColor={colors.card} />
    </View>
  );
}

function tierBtns(colors: ColorsType, options: string[], current: string, onChange: (v: string) => void) {
  return (
    <View style={s.tierRow}>
      {options.map((t) => (
        <TouchableOpacity key={t}
          style={[s.tierBtn, current === t ? { backgroundColor: colors.tint } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => onChange(t)}>
          <Text style={{ color: current === t ? colors.card : colors.icon, fontSize: 12, fontWeight: '600' }}>
            {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'None'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ==================== MODALS ====================

export function MallModals({
  colors,
  showCategoryModal, editingCategory, categoryForm, onCategoryFormChange, onCloseCategoryModal, onSaveCategory,
  showOfferModal, editingOffer, offerForm, onOfferFormChange, onCloseOfferModal, onSaveOffer,
  showBannerModal, editingBanner, bannerForm, onBannerFormChange, onCloseBannerModal, onSaveBanner,
  showCollectionModal, editingCollection, collectionForm, onCollectionFormChange, onCloseCollectionModal, onSaveCollection,
}: Props) {
  return (
    <>
      {/* Category Modal */}
      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={onCloseCategoryModal}><Text style={[s.modalCancel, { color: colors.tint }]}>Cancel</Text></TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>{editingCategory ? 'Edit Category' : 'New Category'}</Text>
            <TouchableOpacity onPress={onSaveCategory}><Text style={[s.modalSave, { color: colors.tint }]}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {formField(colors, 'Name *', categoryForm.name, (v) => onCategoryFormChange((p) => ({ ...p, name: v })))}
            {formField(colors, 'Slug', categoryForm.slug, (v) => onCategoryFormChange((p) => ({ ...p, slug: v })), { placeholder: 'auto-generated from name' })}
            {formField(colors, 'Description', categoryForm.description, (v) => onCategoryFormChange((p) => ({ ...p, description: v })), { multiline: true })}
            {formField(colors, 'Icon (emoji)', categoryForm.icon, (v) => onCategoryFormChange((p) => ({ ...p, icon: v })))}
            {formField(colors, 'Image URL', categoryForm.image, (v) => onCategoryFormChange((p) => ({ ...p, image: v })), { placeholder: 'Category image URL' })}
            {formField(colors, 'Color', categoryForm.color, (v) => onCategoryFormChange((p) => ({ ...p, color: v })), { placeholder: colors.navy })}
            {formField(colors, 'Background Color', categoryForm.backgroundColor, (v) => onCategoryFormChange((p) => ({ ...p, backgroundColor: v })))}
            {formField(colors, 'Max Cashback %', categoryForm.maxCashback, (v) => onCategoryFormChange((p) => ({ ...p, maxCashback: v })))}
            {formField(colors, 'Sort Order', categoryForm.sortOrder, (v) => onCategoryFormChange((p) => ({ ...p, sortOrder: v })))}
            {switchField(colors, 'Active', categoryForm.isActive, (v) => onCategoryFormChange((p) => ({ ...p, isActive: v })))}
            {switchField(colors, 'Featured', categoryForm.isFeatured, (v) => onCategoryFormChange((p) => ({ ...p, isFeatured: v })))}
          </ScrollView>
        </View>
      </Modal>

      {/* Offer Modal */}
      <Modal visible={showOfferModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={onCloseOfferModal}><Text style={[s.modalCancel, { color: colors.tint }]}>Cancel</Text></TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>{editingOffer ? 'Edit Offer' : 'New Offer'}</Text>
            <TouchableOpacity onPress={onSaveOffer}><Text style={[s.modalSave, { color: colors.tint }]}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {formField(colors, 'Title *', offerForm.title, (v) => onOfferFormChange((p) => ({ ...p, title: v })))}
            {formField(colors, 'Subtitle', offerForm.subtitle, (v) => onOfferFormChange((p) => ({ ...p, subtitle: v })))}
            {formField(colors, 'Description', offerForm.description, (v) => onOfferFormChange((p) => ({ ...p, description: v })), { multiline: true })}
            {formField(colors, 'Image URL', offerForm.image, (v) => onOfferFormChange((p) => ({ ...p, image: v })))}
            <Text style={[s.formLabel, { color: colors.text, marginTop: 8, marginBottom: 4, fontSize: 13, fontWeight: '700' }]}>Link to Store OR Brand (one required)</Text>
            {formField(colors, 'Store ID', offerForm.store, (v) => onOfferFormChange((p) => ({ ...p, store: v, brand: v ? '' : p.brand })), { placeholder: 'MongoDB ObjectId of store' })}
            {formField(colors, 'Brand ID', offerForm.brand, (v) => onOfferFormChange((p) => ({ ...p, brand: v, store: v ? '' : p.store })), { placeholder: 'MongoDB ObjectId of brand (if no store)' })}
            <View style={s.formField}><Text style={[s.formLabel, { color: colors.text }]}>Offer Type</Text>{tierBtns(colors, ['cashback', 'discount', 'coins', 'combo'], offerForm.offerType, (v) => onOfferFormChange((p) => ({ ...p, offerType: v })))}</View>
            {formField(colors, 'Value', offerForm.value, (v) => onOfferFormChange((p) => ({ ...p, value: v })))}
            <View style={s.formField}><Text style={[s.formLabel, { color: colors.text }]}>Value Type</Text>{tierBtns(colors, ['percentage', 'fixed'], offerForm.valueType, (v) => onOfferFormChange((p) => ({ ...p, valueType: v })))}</View>
            {formField(colors, 'Min Purchase Amount', offerForm.minPurchase, (v) => onOfferFormChange((p) => ({ ...p, minPurchase: v })), { placeholder: 'e.g. 100' })}
            {formField(colors, 'Max Discount Amount', offerForm.maxDiscount, (v) => onOfferFormChange((p) => ({ ...p, maxDiscount: v })), { placeholder: 'e.g. 500' })}
            {formField(colors, 'Valid From (YYYY-MM-DD)', offerForm.validFrom, (v) => onOfferFormChange((p) => ({ ...p, validFrom: v })))}
            {formField(colors, 'Valid Until (YYYY-MM-DD)', offerForm.validUntil, (v) => onOfferFormChange((p) => ({ ...p, validUntil: v })))}
            <View style={s.formField}><Text style={[s.formLabel, { color: colors.text }]}>Badge</Text>{tierBtns(colors, ['', 'flash-sale', 'limited-time', 'best-deal', 'mall-exclusive'], offerForm.badge, (v) => onOfferFormChange((p) => ({ ...p, badge: v })))}</View>
            {switchField(colors, 'Active', offerForm.isActive, (v) => onOfferFormChange((p) => ({ ...p, isActive: v })))}
            {switchField(colors, 'Mall Exclusive', offerForm.isMallExclusive, (v) => onOfferFormChange((p) => ({ ...p, isMallExclusive: v })))}
          </ScrollView>
        </View>
      </Modal>

      {/* Banner Modal */}
      <Modal visible={showBannerModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={onCloseBannerModal}><Text style={[s.modalCancel, { color: colors.tint }]}>Cancel</Text></TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>{editingBanner ? 'Edit Banner' : 'New Banner'}</Text>
            <TouchableOpacity onPress={onSaveBanner}><Text style={[s.modalSave, { color: colors.tint }]}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {formField(colors, 'Title *', bannerForm.title, (v) => onBannerFormChange((p) => ({ ...p, title: v })))}
            {formField(colors, 'Subtitle', bannerForm.subtitle, (v) => onBannerFormChange((p) => ({ ...p, subtitle: v })))}
            {formField(colors, 'Image URL *', bannerForm.image, (v) => onBannerFormChange((p) => ({ ...p, image: v })))}
            {formField(colors, 'Background Color', bannerForm.backgroundColor, (v) => onBannerFormChange((p) => ({ ...p, backgroundColor: v })), { placeholder: colors.emerald })}
            {formField(colors, 'Text Color', bannerForm.textColor, (v) => onBannerFormChange((p) => ({ ...p, textColor: v })), { placeholder: colors.card })}
            {formField(colors, 'CTA Text', bannerForm.ctaText, (v) => onBannerFormChange((p) => ({ ...p, ctaText: v })), { placeholder: 'Shop Now' })}
            <View style={s.formField}><Text style={[s.formLabel, { color: colors.text }]}>CTA Action</Text>{tierBtns(colors, ['navigate', 'external', 'brand', 'category', 'collection'], bannerForm.ctaAction, (v) => onBannerFormChange((p) => ({ ...p, ctaAction: v })))}</View>
            {(bannerForm.ctaAction === 'navigate' || bannerForm.ctaAction === 'external') && formField(colors, 'CTA URL', bannerForm.ctaUrl, (v) => onBannerFormChange((p) => ({ ...p, ctaUrl: v })), { placeholder: 'URL or deep link route' })}
            {bannerForm.ctaAction === 'brand' && formField(colors, 'Target Brand/Store ID *', bannerForm.ctaBrand, (v) => onBannerFormChange((p) => ({ ...p, ctaBrand: v })), { placeholder: 'MongoDB ObjectId' })}
            {bannerForm.ctaAction === 'category' && formField(colors, 'Target Category ID *', bannerForm.ctaCategory, (v) => onBannerFormChange((p) => ({ ...p, ctaCategory: v })), { placeholder: 'MongoDB ObjectId' })}
            {bannerForm.ctaAction === 'collection' && formField(colors, 'Target Collection ID *', bannerForm.ctaCollection, (v) => onBannerFormChange((p) => ({ ...p, ctaCollection: v })), { placeholder: 'MongoDB ObjectId' })}
            <View style={s.formField}><Text style={[s.formLabel, { color: colors.text }]}>Position</Text>{tierBtns(colors, ['hero', 'inline', 'footer'], bannerForm.position, (v) => onBannerFormChange((p) => ({ ...p, position: v })))}</View>
            {formField(colors, 'Priority', bannerForm.priority, (v) => onBannerFormChange((p) => ({ ...p, priority: v })), { placeholder: '0' })}
            {formField(colors, 'Valid From (YYYY-MM-DD)', bannerForm.validFrom, (v) => onBannerFormChange((p) => ({ ...p, validFrom: v })))}
            {formField(colors, 'Valid Until (YYYY-MM-DD)', bannerForm.validUntil, (v) => onBannerFormChange((p) => ({ ...p, validUntil: v })))}
            {formField(colors, 'Badge', bannerForm.badge, (v) => onBannerFormChange((p) => ({ ...p, badge: v })), { placeholder: 'e.g. NEW, SALE' })}
            {switchField(colors, 'Active', bannerForm.isActive, (v) => onBannerFormChange((p) => ({ ...p, isActive: v })))}
          </ScrollView>
        </View>
      </Modal>

      {/* Collection Modal */}
      <Modal visible={showCollectionModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={onCloseCollectionModal}><Text style={[s.modalCancel, { color: colors.tint }]}>Cancel</Text></TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>{editingCollection ? 'Edit Collection' : 'New Collection'}</Text>
            <TouchableOpacity onPress={onSaveCollection}><Text style={[s.modalSave, { color: colors.tint }]}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {formField(colors, 'Name *', collectionForm.name, (v) => onCollectionFormChange((p) => ({ ...p, name: v })))}
            {formField(colors, 'Slug', collectionForm.slug, (v) => onCollectionFormChange((p) => ({ ...p, slug: v })), { placeholder: 'auto-generated from name' })}
            {formField(colors, 'Description', collectionForm.description, (v) => onCollectionFormChange((p) => ({ ...p, description: v })), { multiline: true })}
            {formField(colors, 'Image URL *', collectionForm.image, (v) => onCollectionFormChange((p) => ({ ...p, image: v })))}
            <View style={s.formField}><Text style={[s.formLabel, { color: colors.text }]}>Type</Text>{tierBtns(colors, ['curated', 'seasonal', 'trending', 'personalized'], collectionForm.type, (v) => onCollectionFormChange((p) => ({ ...p, type: v })))}</View>
            {formField(colors, 'Sort Order', collectionForm.sortOrder, (v) => onCollectionFormChange((p) => ({ ...p, sortOrder: v })))}
            {formField(colors, 'Valid From (YYYY-MM-DD)', collectionForm.validFrom, (v) => onCollectionFormChange((p) => ({ ...p, validFrom: v })), { placeholder: 'Optional' })}
            {formField(colors, 'Valid Until (YYYY-MM-DD)', collectionForm.validUntil, (v) => onCollectionFormChange((p) => ({ ...p, validUntil: v })), { placeholder: 'Optional' })}
            {switchField(colors, 'Active', collectionForm.isActive, (v) => onCollectionFormChange((p) => ({ ...p, isActive: v })))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalCancel: { fontSize: 16 },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalContent: { padding: 20, paddingBottom: 60 },
  formField: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  switchField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingVertical: 4 },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tierBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});
