import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { bankOffersService, BankOffer } from '../../services/api/bankOffers';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/bank-offers.styles';

// ============================================
// TYPES & CONSTANTS
// ============================================
type StatusFilter = 'all' | 'active' | 'inactive';
type CardTypeFilter = 'all' | 'credit' | 'debit' | 'wallet' | 'upi';

const CARD_TYPES: CardTypeFilter[] = ['all', 'credit', 'debit', 'wallet', 'upi'];

const CARD_TYPE_COLORS: Record<string, string> = {
  credit: Colors.light.purple,
  debit: Colors.light.info,
  wallet: Colors.light.warning,
  upi: Colors.light.success,
  all: Colors.light.mutedDark,
};

const CARD_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  credit: 'card-outline',
  debit: 'card-outline',
  wallet: 'wallet-outline',
  upi: 'phone-portrait-outline',
  all: 'apps-outline',
};

interface OfferFormData {
  bankName: string;
  bankLogo: string;
  offerTitle: string;
  offerDescription: string;
  discountPercentage: string;
  maxDiscount: string;
  minTransactionAmount: string;
  cardType: string;
  validFrom: string;
  validUntil: string;
  terms: string;
  promoCode: string;
  usageLimitPerUser: string;
  totalUsageLimit: string;
  priority: string;
  isActive: boolean;
}

const DEFAULT_FORM: OfferFormData = {
  bankName: '',
  bankLogo: '',
  offerTitle: '',
  offerDescription: '',
  discountPercentage: '',
  maxDiscount: '',
  minTransactionAmount: '',
  cardType: 'all',
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  terms: '',
  promoCode: '',
  usageLimitPerUser: '',
  totalUsageLimit: '',
  priority: '0',
  isActive: true,
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function BankOffersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [offers, setOffers] = useState<BankOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [cardTypeFilter, setCardTypeFilter] = useState<CardTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingOffer, setEditingOffer] = useState<BankOffer | null>(null);
  const [formData, setFormData] = useState<OfferFormData>(DEFAULT_FORM);

  // ==========================================
  // Debounce search
  // ==========================================
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // ==========================================
  // Data Loading
  // ==========================================
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (cardTypeFilter !== 'all') params.cardType = cardTypeFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const response = await bankOffersService.getOffers(params);
      if (!response.success) throw new Error(response.message || 'Failed to load offers');
      setOffers(response.data?.offers || []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load bank offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, cardTypeFilter, debouncedSearch]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers();
  }, [fetchOffers]);

  // ==========================================
  // Stats
  // ==========================================
  const totalCount = offers.length;
  const activeCount = offers.filter((o) => o.isActive).length;
  const inactiveCount = offers.filter((o) => !o.isActive).length;

  // ==========================================
  // Actions
  // ==========================================
  const handleCreate = () => {
    setEditingOffer(null);
    setFormData({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (offer: BankOffer) => {
    setEditingOffer(offer);
    setFormData({
      bankName: offer.bankName || '',
      bankLogo: offer.bankLogo || '',
      offerTitle: offer.offerTitle || '',
      offerDescription: offer.offerDescription || '',
      discountPercentage: String(offer.discountPercentage ?? ''),
      maxDiscount: String(offer.maxDiscount ?? ''),
      minTransactionAmount: String(offer.minTransactionAmount ?? ''),
      cardType: offer.cardType || 'all',
      validFrom: offer.validFrom ? offer.validFrom.split('T')[0] : '',
      validUntil: offer.validUntil ? offer.validUntil.split('T')[0] : '',
      terms: offer.terms || '',
      promoCode: offer.promoCode || '',
      usageLimitPerUser: offer.usageLimitPerUser ? String(offer.usageLimitPerUser) : '',
      totalUsageLimit: offer.totalUsageLimit ? String(offer.totalUsageLimit) : '',
      priority: String(offer.priority ?? 0),
      isActive: offer.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.bankName.trim()) {
      showAlert('Error', 'Bank name is required');
      return;
    }
    if (!formData.offerTitle.trim()) {
      showAlert('Error', 'Offer title is required');
      return;
    }
    if (!formData.discountPercentage || Number(formData.discountPercentage) <= 0) {
      showAlert('Error', 'Discount percentage must be greater than 0');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Partial<BankOffer> = {
        bankName: formData.bankName.trim(),
        bankLogo: formData.bankLogo.trim() || undefined,
        offerTitle: formData.offerTitle.trim(),
        offerDescription: formData.offerDescription.trim() || undefined,
        discountPercentage: Number(formData.discountPercentage) || 0,
        maxDiscount: Number(formData.maxDiscount) || 0,
        minTransactionAmount: Number(formData.minTransactionAmount) || 0,
        cardType: formData.cardType,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
        terms: formData.terms.trim() || undefined,
        promoCode: formData.promoCode.trim() || undefined,
        usageLimitPerUser: formData.usageLimitPerUser
          ? Number(formData.usageLimitPerUser)
          : undefined,
        totalUsageLimit: formData.totalUsageLimit ? Number(formData.totalUsageLimit) : undefined,
        priority: Number(formData.priority) || 0,
        isActive: formData.isActive,
      };

      if (editingOffer) {
        const res = await bankOffersService.updateOffer(editingOffer._id, payload);
        if (!res.success) throw new Error(res.message || 'Failed to update offer');
        showAlert('Success', 'Bank offer updated successfully');
      } else {
        const res = await bankOffersService.createOffer(payload);
        if (!res.success) throw new Error(res.message || 'Failed to create offer');
        showAlert('Success', 'Bank offer created successfully');
      }
      setShowFormModal(false);
      fetchOffers();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save bank offer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (offer: BankOffer) => {
    try {
      const res = await bankOffersService.toggleOffer(offer._id);
      if (!res.success) throw new Error(res.message || 'Failed to toggle offer');
      fetchOffers();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle offer status');
    }
  };

  const handleDelete = (offer: BankOffer) => {
    showConfirm(
      'Delete Bank Offer',
      `Are you sure you want to delete "${offer.offerTitle}"? This action cannot be undone.`,
      async () => {
        try {
          const res = await bankOffersService.deleteOffer(offer._id);
          if (!res.success) throw new Error(res.message || 'Failed to delete offer');
          showAlert('Success', 'Bank offer deleted successfully');
          fetchOffers();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete offer');
        }
      }
    );
  };

  // ==========================================
  // Form Input Helper
  // ==========================================
  const renderInput = (
    key: keyof OfferFormData,
    placeholder: string,
    opts?: { multiline?: boolean; numeric?: boolean }
  ) => (
    <TextInput
      style={[
        s.formInput,
        opts?.multiline && s.multiline,
        { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
      ]}
      value={String(formData[key])}
      onChangeText={(v) => setFormData((p) => ({ ...p, [key]: v }))}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      multiline={opts?.multiline}
      keyboardType={opts?.numeric ? 'numeric' : 'default'}
    />
  );

  // ==========================================
  // Render: Stats Row
  // ==========================================
  const renderStatsRow = () => (
    <View style={s.statsRow}>
      <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.statIcon, { backgroundColor: colors.infoLight }]}>
          <Ionicons name="layers-outline" size={18} color={colors.info} />
        </View>
        <Text style={[s.statValue, { color: colors.text }]}>{totalCount}</Text>
        <Text style={[s.statLabel, { color: colors.secondaryText }]}>Total</Text>
      </View>
      <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.statIcon, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
        </View>
        <Text style={[s.statValue, { color: colors.text }]}>{activeCount}</Text>
        <Text style={[s.statLabel, { color: colors.secondaryText }]}>Active</Text>
      </View>
      <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.statIcon, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="close-circle-outline" size={18} color={colors.error} />
        </View>
        <Text style={[s.statValue, { color: colors.text }]}>{inactiveCount}</Text>
        <Text style={[s.statLabel, { color: colors.secondaryText }]}>Inactive</Text>
      </View>
    </View>
  );

  // ==========================================
  // Render: Filter Tabs
  // ==========================================
  const renderFilters = () => (
    <View
      style={[
        s.filtersContainer,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}
    >
      {/* Status filter tabs */}
      <View style={s.filterTabRow}>
        {(['all', 'active', 'inactive'] as StatusFilter[]).map((status) => {
          const isSelected = statusFilter === status;
          return (
            <TouchableOpacity
              key={status}
              style={[s.filterTab, isSelected && s.filterTabActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[s.filterTabText, isSelected && s.filterTabTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Card type filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.cardTypeFilterRow}
      >
        {CARD_TYPES.map((type) => {
          const isSelected = cardTypeFilter === type;
          const typeColor = CARD_TYPE_COLORS[type];
          return (
            <TouchableOpacity
              key={type}
              style={[
                s.cardTypeChip,
                { borderColor: isSelected ? typeColor : colors.border },
                isSelected && { backgroundColor: `${typeColor}15` },
              ]}
              onPress={() => setCardTypeFilter(type)}
            >
              <Ionicons
                name={CARD_TYPE_ICONS[type]}
                size={14}
                color={isSelected ? typeColor : colors.secondaryText}
              />
              <Text
                style={[
                  s.cardTypeChipText,
                  { color: isSelected ? typeColor : colors.secondaryText },
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search bar */}
      <View
        style={[
          s.searchBar,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by bank name or offer title..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ==========================================
  // Render: Offer Card
  // ==========================================
  const renderOfferCard = (offer: BankOffer) => {
    const typeColor = CARD_TYPE_COLORS[offer.cardType] || colors.mutedDark;
    const usagePercent =
      offer.totalUsageLimit && offer.totalUsageLimit > 0
        ? Math.round((offer.usageCount / offer.totalUsageLimit) * 100)
        : null;

    return (
      <View
        key={offer._id}
        style={[s.offerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Card Header */}
        <View style={s.offerCardHeader}>
          <View style={s.bankInfo}>
            <View style={[s.bankIconCircle, { backgroundColor: `${typeColor}15` }]}>
              <Ionicons name="business-outline" size={20} color={typeColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.bankName, { color: colors.text }]} numberOfLines={1}>
                {offer.bankName}
              </Text>
              <Text style={[s.offerTitle, { color: colors.secondaryText }]} numberOfLines={2}>
                {offer.offerTitle}
              </Text>
            </View>
          </View>
          <View style={[s.discountBadge, { backgroundColor: '#ECFDF5' }]}>
            <Text style={s.discountBadgeText}>{offer.discountPercentage ?? 0}%</Text>
            <Text style={s.discountBadgeSub}>OFF</Text>
          </View>
        </View>

        {/* Offer Details */}
        <View style={s.offerDetails}>
          <View style={s.detailRow}>
            <View style={s.detailItem}>
              <Ionicons name="arrow-up-circle-outline" size={14} color={colors.secondaryText} />
              <Text style={[s.detailLabel, { color: colors.secondaryText }]}>
                Max Discount
              </Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {offer.maxDiscount ?? 0}
              </Text>
            </View>
            <View style={s.detailItem}>
              <Ionicons name="cash-outline" size={14} color={colors.secondaryText} />
              <Text style={[s.detailLabel, { color: colors.secondaryText }]}>
                Min Transaction
              </Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {offer.minTransactionAmount ?? 0}
              </Text>
            </View>
          </View>

          {/* Card type badge */}
          <View style={s.badgeRow}>
            <View
              style={[
                s.typeBadge,
                { backgroundColor: `${typeColor}15`, borderColor: `${typeColor}30` },
              ]}
            >
              <Ionicons
                name={CARD_TYPE_ICONS[offer.cardType] || 'card-outline'}
                size={12}
                color={typeColor}
              />
              <Text style={[s.typeBadgeText, { color: typeColor }]}>
                {offer.cardType.charAt(0).toUpperCase() + offer.cardType.slice(1)}
              </Text>
            </View>
            {offer.promoCode ? (
              <View style={[s.promoBadge, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="ticket-outline" size={12} color={colors.warningDark} />
                <Text style={s.promoText}>{offer.promoCode}</Text>
              </View>
            ) : null}
          </View>

          {/* Dates */}
          <View style={s.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.secondaryText} />
            <Text style={[s.dateText, { color: colors.secondaryText }]}>
              {formatDate(offer.validFrom)} - {formatDate(offer.validUntil)}
            </Text>
          </View>

          {/* Usage */}
          <View style={s.usageRow}>
            <View style={{ flex: 1 }}>
              <View style={s.usageLabelRow}>
                <Ionicons name="people-outline" size={14} color={colors.secondaryText} />
                <Text style={[s.usageLabel, { color: colors.secondaryText }]}>
                  Usage: {offer.usageCount ?? 0}
                  {offer.totalUsageLimit ? ` / ${offer.totalUsageLimit}` : ''}
                </Text>
              </View>
              {usagePercent !== null && (
                <View style={s.usageBarBg}>
                  <View
                    style={[
                      s.usageBarFill,
                      {
                        width: `${Math.min(usagePercent, 100)}%`,
                        backgroundColor:
                          usagePercent >= 90
                            ? colors.error
                            : usagePercent >= 70
                              ? colors.warning
                              : colors.success,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Card Footer: toggle + actions */}
        <View style={[s.offerCardFooter, { borderTopColor: colors.border }]}>
          <View style={s.toggleContainer}>
            <Text
              style={[
                s.toggleLabel,
                { color: offer.isActive ? colors.success : colors.error },
              ]}
            >
              {offer.isActive ? 'Active' : 'Inactive'}
            </Text>
            <Switch
              value={offer.isActive}
              onValueChange={() => handleToggle(offer)}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.card}
            />
          </View>
          <View style={s.actionButtons}>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(offer)}>
              <Ionicons name="create-outline" size={18} color={colors.info} />
              <Text style={[s.actionBtnText, { color: colors.info }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(offer)}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[s.actionBtnText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ==========================================
  // Render: Form Modal
  // ==========================================
  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View
          style={[
            s.modalHeader,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {editingOffer ? 'Edit Bank Offer' : 'New Bank Offer'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={s.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Body */}
        <ScrollView
          style={s.formScroll}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Bank Name */}
          <Text style={[s.formLabel, { color: colors.secondaryText }]}>Bank Name *</Text>
          {renderInput('bankName', 'e.g. HDFC Bank')}

          {/* Bank Logo URL */}
          <Text style={[s.formLabel, { color: colors.secondaryText }]}>Bank Logo URL</Text>
          {renderInput('bankLogo', 'https://example.com/logo.png')}

          {/* Offer Title */}
          <Text style={[s.formLabel, { color: colors.secondaryText }]}>Offer Title *</Text>
          {renderInput('offerTitle', 'e.g. 10% Instant Discount on HDFC Cards')}

          {/* Offer Description */}
          <Text style={[s.formLabel, { color: colors.secondaryText }]}>Offer Description</Text>
          {renderInput('offerDescription', 'Describe the offer details...', { multiline: true })}

          {/* Discount & Amounts Row */}
          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: colors.secondaryText }]}>Discount % *</Text>
              {renderInput('discountPercentage', '10', { numeric: true })}
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: colors.secondaryText }]}>Max Discount</Text>
              {renderInput('maxDiscount', '500', { numeric: true })}
            </View>
          </View>

          <Text style={[s.formLabel, { color: colors.secondaryText }]}>
            Min Transaction Amount
          </Text>
          {renderInput('minTransactionAmount', '1000', { numeric: true })}

          {/* Card Type Picker */}
          <Text style={[s.formLabel, { color: colors.secondaryText }]}>Card Type</Text>
          <View style={s.cardTypePicker}>
            {CARD_TYPES.map((type) => {
              const isSelected = formData.cardType === type;
              const typeColor = CARD_TYPE_COLORS[type];
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    s.cardTypePickerItem,
                    { borderColor: isSelected ? typeColor : colors.border },
                    isSelected && { backgroundColor: `${typeColor}15` },
                  ]}
                  onPress={() => setFormData((p) => ({ ...p, cardType: type }))}
                >
                  <Ionicons
                    name={CARD_TYPE_ICONS[type]}
                    size={14}
                    color={isSelected ? typeColor : colors.secondaryText}
                  />
                  <Text
                    style={[
                      s.cardTypePickerText,
                      { color: isSelected ? typeColor : colors.secondaryText },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dates Row */}
          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: colors.secondaryText }]}>Valid From</Text>
              {renderInput('validFrom', 'YYYY-MM-DD')}
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: colors.secondaryText }]}>Valid Until</Text>
              {renderInput('validUntil', 'YYYY-MM-DD')}
            </View>
          </View>

          {/* Terms */}
          <Text style={[s.formLabel, { color: colors.secondaryText }]}>
            Terms & Conditions
          </Text>
          {renderInput('terms', 'Enter terms and conditions...', { multiline: true })}

          {/* Promo Code */}
          <Text style={[s.formLabel, { color: colors.secondaryText }]}>Promo Code</Text>
          {renderInput('promoCode', 'e.g. HDFC10OFF')}

          {/* Usage Limits Row */}
          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: colors.secondaryText }]}>
                Limit Per User
              </Text>
              {renderInput('usageLimitPerUser', 'e.g. 3', { numeric: true })}
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.formLabel, { color: colors.secondaryText }]}>
                Total Usage Limit
              </Text>
              {renderInput('totalUsageLimit', 'e.g. 1000', { numeric: true })}
            </View>
          </View>

          {/* Priority */}
          <Text style={[s.formLabel, { color: colors.secondaryText }]}>Priority</Text>
          {renderInput('priority', '0', { numeric: true })}

          {/* Active Toggle */}
          <View style={[s.formSwitchRow, { borderColor: colors.border }]}>
            <View>
              <Text style={[s.formSwitchLabel, { color: colors.text }]}>Active</Text>
              <Text style={[s.formSwitchHint, { color: colors.secondaryText }]}>
                Enable to make this offer visible to users
              </Text>
            </View>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              trackColor={{ false: colors.border, true: colors.info }}
              thumbColor={colors.card}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // ==========================================
  // Main Render
  // ==========================================
  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[s.headerTitle, { color: colors.text }]}>Bank Offers</Text>
            <Text style={[s.headerSubtitle, { color: colors.secondaryText }]}>
              Manage bank discount offers
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        {renderStatsRow()}

        {/* Filters */}
        {renderFilters()}

        {/* Content */}
        <View style={s.contentContainer}>
          {loading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={colors.info} />
              <Text style={[s.loadingText, { color: colors.secondaryText }]}>
                Loading offers...
              </Text>
            </View>
          ) : offers.length === 0 ? (
            <View style={s.emptyContainer}>
              <Ionicons name="card-outline" size={56} color={colors.gray300} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No Bank Offers Found</Text>
              <Text style={[s.emptySubtitle, { color: colors.secondaryText }]}>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Create your first bank offer to get started'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={s.emptyCreateBtn} onPress={handleCreate}>
                  <Ionicons name="add" size={18} color={colors.card} />
                  <Text style={s.emptyCreateBtnText}>Create Offer</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            offers.map((offer) => renderOfferCard(offer))
          )}
        </View>
      </ScrollView>

      {/* Form Modal */}
      {renderFormModal()}
    </View>
  );
}

// ============================================
// STYLES

