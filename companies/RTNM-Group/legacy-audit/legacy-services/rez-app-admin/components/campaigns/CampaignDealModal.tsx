import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CampaignDeal, StoreOption } from '../../services';

interface Props {
  visible: boolean;
  dealFormData: CampaignDeal;
  editingDealIndex: number | null;
  stores: StoreOption[];
  colors: any;
  isUploading: boolean;
  uploadingField: string | null;
  isSaving: boolean;
  onDealFormDataChange: (data: CampaignDeal) => void;
  onPickAndUploadImage: (field: 'bannerImage' | 'icon' | 'dealImage', imageType: 'banner' | 'icon' | 'deal') => Promise<void>;
  onSave: () => Promise<void>;
  onClose: () => void;
  onSelectStore: () => void;
}

export default function CampaignDealModal({
  visible,
  dealFormData,
  editingDealIndex,
  stores,
  colors,
  isUploading,
  uploadingField,
  isSaving,
  onDealFormDataChange,
  onPickAndUploadImage,
  onSave,
  onClose,
  onSelectStore,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.dealModalOverlay}>
        <ScrollView contentContainerStyle={styles.dealModalScrollContent}>
          <View style={[styles.dealModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.dealModalHeader}>
              <Text style={[styles.dealModalTitle, { color: colors.text }]}>
                {editingDealIndex !== null ? 'Edit Deal' : 'Add New Deal'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {/* Image Upload Section */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithUpload}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>
                  Deal Image *
                </Text>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.tint }]}
                  onPress={() => onPickAndUploadImage('dealImage', 'deal')}
                  disabled={isUploading}
                >
                  {isUploading && uploadingField === 'dealImage' ? (
                    <ActivityIndicator size="small" color={colors.card} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={14} color={colors.card} />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {dealFormData.image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: dealFormData.image }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => onDealFormDataChange({ ...dealFormData, image: '' })}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.imagePlaceholder,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                  onPress={() => onPickAndUploadImage('dealImage', 'deal')}
                  disabled={isUploading}
                >
                  <Ionicons name="image-outline" size={40} color={colors.icon} />
                  <Text style={[styles.imagePlaceholderText, { color: colors.icon }]}>
                    Tap to upload or enter URL below
                  </Text>
                </TouchableOpacity>
              )}

              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                    marginTop: 8,
                  },
                ]}
                value={dealFormData.image}
                onChangeText={(text: string) => onDealFormDataChange({ ...dealFormData, image: text })}
                placeholder="https://... or upload above"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Store Selection */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Link to Store</Text>
              <TouchableOpacity
                style={[
                  styles.storeSelectBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={onSelectStore}
              >
                {dealFormData.storeId ? (
                  <View style={styles.selectedStoreInfo}>
                    <Ionicons name="storefront" size={18} color={colors.tint} />
                    <Text
                      style={[styles.selectedStoreName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {stores.find((s) => s._id === dealFormData.storeId)?.name ||
                        dealFormData.store ||
                        'Store selected'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => onDealFormDataChange({ ...dealFormData, storeId: undefined })}
                      style={styles.clearStoreBtn}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.selectStorePlaceholder}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.icon} />
                    <Text style={[styles.selectStorePlaceholderText, { color: colors.icon }]}>
                      Select a store (optional)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {dealFormData.storeId && (
                <View style={[styles.linkedStoreHint, { backgroundColor: `${colors.tint}15` }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.tint} />
                  <Text style={[styles.linkedStoreHintText, { color: colors.tint }]}>
                    Store linked - users can visit this store from the deal
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Store Name (Display)</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={dealFormData.store || ''}
                onChangeText={(text: string) => onDealFormDataChange({ ...dealFormData, store: text })}
                placeholder="Store name shown on deal"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Cashback</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={dealFormData.cashback || ''}
                  onChangeText={(text: string) => onDealFormDataChange({ ...dealFormData, cashback: text })}
                  placeholder="e.g., 20%"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Coins</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={dealFormData.coins || ''}
                  onChangeText={(text: string) => onDealFormDataChange({ ...dealFormData, coins: text })}
                  placeholder="e.g., 3X"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Discount</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={dealFormData.discount || ''}
                  onChangeText={(text: string) => onDealFormDataChange({ ...dealFormData, discount: text })}
                  placeholder="e.g., 50% OFF"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Bonus</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={dealFormData.bonus || ''}
                  onChangeText={(text: string) => onDealFormDataChange({ ...dealFormData, bonus: text })}
                  placeholder="e.g., Extra 10%"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Drop</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={dealFormData.drop || ''}
                  onChangeText={(text: string) => onDealFormDataChange({ ...dealFormData, drop: text })}
                  placeholder="e.g., 500 coins"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Ends In</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={dealFormData.endsIn || ''}
                  onChangeText={(text: string) => onDealFormDataChange({ ...dealFormData, endsIn: text })}
                  placeholder="e.g., 2 days"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            {/* Deal Price - FREE or PAID */}
            <View style={[styles.formGroup, { marginTop: 12 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Deal Type</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.dealTypeBtn,
                    {
                      backgroundColor:
                        !dealFormData.price || dealFormData.price === 0
                          ? colors.tint
                          : colors.background,
                      borderColor: colors.tint,
                    },
                  ]}
                  onPress={() => onDealFormDataChange({ ...dealFormData, price: 0 })}
                >
                  <Ionicons
                    name="gift-outline"
                    size={16}
                    color={
                      !dealFormData.price || dealFormData.price === 0 ? colors.card : colors.tint
                    }
                  />
                  <Text
                    style={{
                      color:
                        !dealFormData.price || dealFormData.price === 0 ? colors.card : colors.tint,
                      marginLeft: 6,
                      fontWeight: '600',
                    }}
                  >
                    FREE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dealTypeBtn,
                    {
                      backgroundColor:
                        dealFormData.price && dealFormData.price > 0
                          ? colors.tint
                          : colors.background,
                      borderColor: colors.tint,
                      marginLeft: 12,
                    },
                  ]}
                  onPress={() =>
                    onDealFormDataChange({
                      ...dealFormData,
                      price: dealFormData.price && dealFormData.price > 0 ? dealFormData.price : 99,
                    })
                  }
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={dealFormData.price && dealFormData.price > 0 ? colors.card : colors.tint}
                  />
                  <Text
                    style={{
                      color:
                        dealFormData.price && dealFormData.price > 0 ? colors.card : colors.tint,
                      marginLeft: 6,
                      fontWeight: '600',
                    }}
                  >
                    PAID
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price input - only show if PAID is selected */}
            {dealFormData.price !== undefined && dealFormData.price > 0 && (
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Price</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={dealFormData.price?.toString() || ''}
                    onChangeText={(text: string) =>
                      onDealFormDataChange({ ...dealFormData, price: parseInt(text) || 0 })
                    }
                    placeholder="e.g., 99"
                    placeholderTextColor={colors.icon}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1.5 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Currency</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                    {(['INR', 'AED', 'USD'] as const).map((curr) => (
                      <TouchableOpacity
                        key={curr}
                        style={[
                          styles.currencyBtn,
                          {
                            backgroundColor:
                              (dealFormData.currency || 'INR') === curr
                                ? colors.tint
                                : colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => onDealFormDataChange({ ...dealFormData, currency: curr })}
                      >
                        <Text
                          style={{
                            color:
                              (dealFormData.currency || 'INR') === curr ? colors.card : colors.text,
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {curr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Redemption Limit (optional) */}
            <View style={[styles.formGroup, { marginTop: 12 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Redemption Limit (0 = unlimited)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={dealFormData.purchaseLimit?.toString() || '0'}
                onChangeText={(text: string) =>
                  onDealFormDataChange({ ...dealFormData, purchaseLimit: parseInt(text) || 0 })
                }
                placeholder="0"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
              {dealFormData.purchaseCount !== undefined && dealFormData.purchaseCount > 0 && (
                <Text style={{ color: colors.icon, fontSize: 12, marginTop: 4 }}>
                  {dealFormData.purchaseCount} redeemed so far
                </Text>
              )}
            </View>

            <View style={styles.dealModalButtons}>
              <TouchableOpacity
                style={[
                  styles.dealModalBtn,
                  styles.dealModalCancelBtn,
                  { borderColor: colors.border },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.dealModalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dealModalBtn,
                  styles.dealModalSaveBtn,
                  { backgroundColor: colors.tint },
                ]}
                onPress={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={[styles.dealModalBtnText, { color: colors.card }]}>
                    {editingDealIndex !== null ? 'Update Deal' : 'Add Deal'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
  },
  labelWithUpload: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    height: 140,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 12,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  storeSelectBtn: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  selectedStoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedStoreName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  clearStoreBtn: {
    padding: 2,
  },
  selectStorePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectStorePlaceholderText: {
    fontSize: 14,
  },
  linkedStoreHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  linkedStoreHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dealModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  dealModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dealModalContent: {
    borderRadius: 16,
    padding: 20,
  },
  dealModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dealModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dealModalButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  dealModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dealModalCancelBtn: {
    borderWidth: 1,
  },
  dealModalSaveBtn: {},
  dealModalBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  dealTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  currencyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 40,
  },
});
