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
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { flashSalesService, FlashSale } from '../../services/api/flashSales';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/flash-sales.styles';

// ============================================
// TYPES & CONSTANTS
// ============================================

type StatusFilter = 'all' | 'active' | 'scheduled' | 'ended' | 'sold_out';

const STATUS_COLORS: Record<string, string> = {
  active: Colors.light.success,
  scheduled: Colors.light.info,
  ended: Colors.light.error,
  sold_out: Colors.light.mutedDark,
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  ended: 'Ended',
  sold_out: 'Sold Out',
};

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'ended', label: 'Ended' },
  { key: 'sold_out', label: 'Sold Out' },
];

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month} ${day}, ${year} ${hours}:${mins}`;
  } catch {
    return dateString;
  }
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

function toLocalDatetimeString(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return '';
  }
}

function fromLocalDatetimeString(localStr: string): string {
  try {
    const d = new Date(localStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch {
    return '';
  }
}

// ============================================
// COMPONENT
// ============================================

export default function FlashSalesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<FlashSale | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formDiscountPercentage, setFormDiscountPercentage] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formMaxQuantity, setFormMaxQuantity] = useState('');
  const [formLimitPerUser, setFormLimitPerUser] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState('');
  const [formFlashSalePrice, setFormFlashSalePrice] = useState('');
  const [formPromoCode, setFormPromoCode] = useState('');
  const [formPriority, setFormPriority] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);

  // ============================================
  // DATA FETCHING
  // ============================================

  // Debounce search to avoid API storms on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSales = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params: { status?: string; search?: string; limit?: number } = { limit: 100 };
        if (activeFilter !== 'all') {
          params.status = activeFilter;
        }
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }

        const result = await flashSalesService.getSales(params);
        const salesData = result?.data?.sales || (result as unknown as {sales?: unknown[]})?.sales || [];
        setSales(Array.isArray(salesData) ? (salesData as FlashSale[]) : []);
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to load flash sales');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const onRefresh = () => {
    fetchSales(true);
  };

  // ============================================
  // STATS COMPUTATION
  // ============================================

  const totalCount = sales.length;
  const activeCount = sales.filter((s) => s.status === 'active').length;
  const scheduledCount = sales.filter((s) => s.status === 'scheduled').length;
  const endedCount = sales.filter((s) => s.status === 'ended').length;

  // ============================================
  // FORM HELPERS
  // ============================================

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormImage('');
    setFormDiscountPercentage('');
    setFormStartTime('');
    setFormEndTime('');
    setFormMaxQuantity('');
    setFormLimitPerUser('');
    setFormOriginalPrice('');
    setFormFlashSalePrice('');
    setFormPromoCode('');
    setFormPriority('0');
    setFormEnabled(true);
  };

  const populateForm = (sale: FlashSale) => {
    setFormTitle(sale.title || '');
    setFormDescription(sale.description || '');
    setFormImage(sale.image || '');
    setFormDiscountPercentage(String(sale.discountPercentage ?? ''));
    setFormStartTime(sale.startTime ? toLocalDatetimeString(sale.startTime) : '');
    setFormEndTime(sale.endTime ? toLocalDatetimeString(sale.endTime) : '');
    setFormMaxQuantity(String(sale.maxQuantity ?? ''));
    setFormLimitPerUser(String(sale.limitPerUser ?? ''));
    setFormOriginalPrice(String(sale.originalPrice ?? ''));
    setFormFlashSalePrice(String(sale.flashSalePrice ?? ''));
    setFormPromoCode(sale.promoCode || '');
    setFormPriority(String(sale.priority ?? 0));
    setFormEnabled(sale.enabled ?? true);
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleCreate = () => {
    setEditingSale(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (sale: FlashSale) => {
    setEditingSale(sale);
    populateForm(sale);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      showAlert('Error', 'Title is required');
      return;
    }
    if (!formStartTime.trim()) {
      showAlert('Error', 'Start time is required');
      return;
    }
    if (!formEndTime.trim()) {
      showAlert('Error', 'End time is required');
      return;
    }

    if (!formDescription.trim()) {
      showAlert('Error', 'Description is required');
      return;
    }
    if (!formImage.trim()) {
      showAlert('Error', 'Image URL is required');
      return;
    }

    const discount = parseFloat(formDiscountPercentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      showAlert('Error', 'Discount percentage must be between 0 and 100');
      return;
    }

    const maxQty = parseInt(formMaxQuantity);
    if (!maxQty || maxQty < 1) {
      showAlert('Error', 'Max quantity must be at least 1');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<FlashSale> = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        image: formImage.trim(),
        discountPercentage: discount,
        startTime: fromLocalDatetimeString(formStartTime) || formStartTime,
        endTime: fromLocalDatetimeString(formEndTime) || formEndTime,
        maxQuantity: parseInt(formMaxQuantity) || 0,
        limitPerUser: parseInt(formLimitPerUser) || 1,
        originalPrice: parseFloat(formOriginalPrice) || undefined,
        flashSalePrice: parseFloat(formFlashSalePrice) || undefined,
        promoCode: formPromoCode.trim() || undefined,
        priority: parseInt(formPriority) || 0,
        enabled: formEnabled,
      };

      if (editingSale) {
        await flashSalesService.updateSale(editingSale._id, payload);
        showAlert('Success', 'Flash sale updated successfully');
      } else {
        await flashSalesService.createSale(payload);
        showAlert('Success', 'Flash sale created successfully');
      }

      setShowModal(false);
      setEditingSale(null);
      resetForm();
      fetchSales();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save flash sale');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (sale: FlashSale) => {
    try {
      await flashSalesService.toggleSale(sale._id);
      fetchSales();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle flash sale');
    }
  };

  const handleDelete = async (sale: FlashSale) => {
    const confirmed = await showConfirm(
      'Delete Flash Sale',
      `Are you sure you want to delete "${sale.title}"? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await flashSalesService.deleteSale(sale._id);
        showAlert('Success', 'Flash sale deleted');
        fetchSales();
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to delete flash sale');
      }
    }
  };

  const handleSearch = () => {
    fetchSales();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderStatCard = (label: string, value: number, icon: string, color: string) => (
    <View style={[s.statCard, { backgroundColor: colors.card }]} key={label}>
      <View style={[s.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as unknown as keyof typeof Ionicons.glyphMap} size={20} color={color} />
      </View>
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.secondaryText }]}>{label}</Text>
    </View>
  );

  const renderStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || colors.mutedDark;
    const label = STATUS_LABELS[status] || status;
    return (
      <View style={[s.statusBadge, { backgroundColor: color + '20' }]}>
        <View style={[s.statusDot, { backgroundColor: color }]} />
        <Text style={[s.statusBadgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderSaleCard = (sale: FlashSale) => (
    <View style={[s.saleCard, { backgroundColor: colors.card }]} key={sale._id}>
      {/* Top row: image placeholder + info + discount badge */}
      <View style={s.saleCardHeader}>
        {sale.image ? (
          <Image source={{ uri: sale.image }} style={s.imagePlaceholder} resizeMode="cover" />
        ) : (
          <View style={[s.imagePlaceholder, { backgroundColor: colors.border }]}>
            <Ionicons name="image-outline" size={28} color={colors.secondaryText} />
          </View>
        )}
        <View style={s.saleCardInfo}>
          <View style={s.saleCardTitleRow}>
            <Text style={[s.saleCardTitle, { color: colors.text }]} numberOfLines={1}>
              {sale.title}
            </Text>
            {sale.discountPercentage > 0 && (
              <View style={s.discountBadge}>
                <Text style={s.discountBadgeText}>{sale.discountPercentage}% OFF</Text>
              </View>
            )}
          </View>
          {sale.description ? (
            <Text
              style={[s.saleCardDescription, { color: colors.secondaryText }]}
              numberOfLines={2}
            >
              {truncateText(sale.description, 100)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Time and status row */}
      <View style={s.saleCardMeta}>
        <View style={s.timeRow}>
          <Ionicons name="time-outline" size={14} color={colors.secondaryText} />
          <Text style={[s.timeText, { color: colors.secondaryText }]}>
            {formatDate(sale.startTime)} - {formatDate(sale.endTime)}
          </Text>
        </View>
        {renderStatusBadge(sale.status)}
      </View>

      {/* Pricing row */}
      {(sale.originalPrice != null || sale.flashSalePrice != null) && (
        <View style={s.pricingRow}>
          {sale.originalPrice != null && (
            <Text style={[s.originalPrice, { color: colors.secondaryText }]}>
              Original: {sale.originalPrice.toFixed(2)}
            </Text>
          )}
          {sale.flashSalePrice != null && (
            <Text style={[s.flashPrice, { color: colors.success }]}>
              Sale: {sale.flashSalePrice.toFixed(2)}
            </Text>
          )}
          {sale.promoCode ? (
            <View style={[s.promoCodeBadge, { backgroundColor: colors.border }]}>
              <Ionicons name="pricetag-outline" size={12} color={colors.secondaryText} />
              <Text style={[s.promoCodeText, { color: colors.text }]}>{sale.promoCode}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Stats row */}
      <View style={[s.statsRow, { borderTopColor: colors.border }]}>
        <View style={s.statItem}>
          <Ionicons name="eye-outline" size={14} color={colors.secondaryText} />
          <Text style={[s.statItemText, { color: colors.secondaryText }]}>
            {sale.viewCount ?? 0}
          </Text>
        </View>
        <View style={s.statItem}>
          <Ionicons name="hand-left-outline" size={14} color={colors.secondaryText} />
          <Text style={[s.statItemText, { color: colors.secondaryText }]}>
            {sale.clickCount ?? 0}
          </Text>
        </View>
        <View style={s.statItem}>
          <Ionicons name="cart-outline" size={14} color={colors.secondaryText} />
          <Text style={[s.statItemText, { color: colors.secondaryText }]}>
            {sale.purchaseCount ?? 0}
          </Text>
        </View>
        <View style={s.statItem}>
          <Ionicons name="cube-outline" size={14} color={colors.secondaryText} />
          <Text style={[s.statItemText, { color: colors.secondaryText }]}>
            {sale.soldQuantity ?? 0}/{sale.maxQuantity ?? 0}
          </Text>
        </View>
      </View>

      {/* Actions row */}
      <View style={[s.actionsRow, { borderTopColor: colors.border }]}>
        <View style={s.toggleRow}>
          <Text style={[s.toggleLabel, { color: colors.secondaryText }]}>Enabled</Text>
          <Switch
            value={sale.enabled}
            onValueChange={() => handleToggle(sale)}
            trackColor={{ false: colors.gray300, true: colors.success }}
            thumbColor={colors.card}
            style={s.toggleSwitch}
          />
        </View>
        <View style={s.actionButtons}>
          <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(sale)}>
            <Ionicons name="create-outline" size={20} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(sale)}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFormField = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    options?: {
      placeholder?: string;
      keyboardType?: 'default' | 'numeric' | 'decimal-pad';
      multiline?: boolean;
    }
  ) => (
    <View style={s.formField}>
      <Text style={[s.inputLabel, { color: colors.secondaryText }]}>{label}</Text>
      <TextInput
        style={[
          s.input,
          { backgroundColor: colors.border + '40', color: colors.text, borderColor: colors.border },
          options?.multiline && s.inputMultiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder || ''}
        placeholderTextColor={colors.secondaryText}
        keyboardType={options?.keyboardType || 'default'}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
      />
    </View>
  );

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading && !refreshing) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[s.loadingText, { color: colors.secondaryText }]}>
            Loading flash sales...
          </Text>
        </View>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View>
          <Text style={[s.headerTitle, { color: colors.text }]}>Flash Sales</Text>
          <Text style={[s.headerSubtitle, { color: colors.secondaryText }]}>
            Manage time-limited flash sale campaigns
          </Text>
        </View>
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: colors.tint }]}
          onPress={handleCreate}
        >
          <Ionicons name="add" size={24} color={colors.card} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={s.scrollContentContainer}
      >
        {/* Stats Row */}
        <View style={s.statsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.statsScrollContent}
          >
            {renderStatCard('Total', totalCount, 'flash-outline', colors.info)}
            {renderStatCard('Active', activeCount, 'checkmark-circle-outline', colors.success)}
            {renderStatCard('Scheduled', scheduledCount, 'calendar-outline', colors.warning)}
            {renderStatCard('Ended', endedCount, 'close-circle-outline', colors.error)}
          </ScrollView>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterTabsContainer}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  s.filterTab,
                  isActive && { backgroundColor: colors.tint },
                  !isActive && { backgroundColor: colors.card },
                ]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text
                  style={[
                    s.filterTabText,
                    { color: isActive ? colors.card : colors.secondaryText },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search Bar */}
        <View style={s.searchContainer}>
          <View
            style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by title..."
              placeholderTextColor={colors.secondaryText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  // Trigger fresh fetch after clearing
                  setTimeout(() => fetchSales(), 0);
                }}
              >
                <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sale Cards */}
        {sales.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="flash-outline" size={48} color={colors.secondaryText} />
            <Text style={[s.emptyText, { color: colors.secondaryText }]}>
              No flash sales found
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={handleCreate}
            >
              <Text style={s.emptyBtnText}>Create Flash Sale</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.salesList}>{sales.map((sale) => renderSaleCard(sale))}</View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {editingSale ? 'Edit Flash Sale' : 'Create Flash Sale'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setEditingSale(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {renderFormField('Title *', formTitle, setFormTitle, {
                placeholder: 'Enter sale title',
              })}

              {renderFormField('Description *', formDescription, setFormDescription, {
                placeholder: 'Enter sale description',
                multiline: true,
              })}

              {renderFormField('Image URL *', formImage, setFormImage, {
                placeholder: 'https://example.com/image.jpg',
              })}

              <View style={s.formRow}>
                <View style={s.formRowHalf}>
                  {renderFormField(
                    'Discount % *',
                    formDiscountPercentage,
                    setFormDiscountPercentage,
                    {
                      placeholder: 'e.g. 50',
                      keyboardType: 'decimal-pad',
                    }
                  )}
                </View>
                <View style={s.formRowHalf}>
                  {renderFormField('Priority', formPriority, setFormPriority, {
                    placeholder: '0',
                    keyboardType: 'numeric',
                  })}
                </View>
              </View>

              <View style={s.formField}>
                <Text style={[s.inputLabel, { color: colors.secondaryText }]}>
                  Start Time *
                </Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="datetime-local"
                    value={formStartTime}
                    onChange={(e: any) => setFormStartTime(e.target.value)}
                    style={{
                      padding: 12,
                      fontSize: 14,
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.border + '40',
                      color: colors.text,
                      width: '100%',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <TextInput
                    style={[
                      s.input,
                      {
                        backgroundColor: colors.border + '40',
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={formStartTime}
                    onChangeText={setFormStartTime}
                    placeholder="YYYY-MM-DDTHH:MM"
                    placeholderTextColor={colors.secondaryText}
                  />
                )}
              </View>

              <View style={s.formField}>
                <Text style={[s.inputLabel, { color: colors.secondaryText }]}>End Time *</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="datetime-local"
                    value={formEndTime}
                    onChange={(e: any) => setFormEndTime(e.target.value)}
                    style={{
                      padding: 12,
                      fontSize: 14,
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.border + '40',
                      color: colors.text,
                      width: '100%',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <TextInput
                    style={[
                      s.input,
                      {
                        backgroundColor: colors.border + '40',
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={formEndTime}
                    onChangeText={setFormEndTime}
                    placeholder="YYYY-MM-DDTHH:MM"
                    placeholderTextColor={colors.secondaryText}
                  />
                )}
              </View>

              <View style={s.formRow}>
                <View style={s.formRowHalf}>
                  {renderFormField('Max Quantity *', formMaxQuantity, setFormMaxQuantity, {
                    placeholder: '100',
                    keyboardType: 'numeric',
                  })}
                </View>
                <View style={s.formRowHalf}>
                  {renderFormField('Limit/User', formLimitPerUser, setFormLimitPerUser, {
                    placeholder: '1',
                    keyboardType: 'numeric',
                  })}
                </View>
              </View>

              <View style={s.formRow}>
                <View style={s.formRowHalf}>
                  {renderFormField('Original Price', formOriginalPrice, setFormOriginalPrice, {
                    placeholder: '0.00',
                    keyboardType: 'decimal-pad',
                  })}
                </View>
                <View style={s.formRowHalf}>
                  {renderFormField('Flash Sale Price', formFlashSalePrice, setFormFlashSalePrice, {
                    placeholder: '0.00',
                    keyboardType: 'decimal-pad',
                  })}
                </View>
              </View>

              {renderFormField('Promo Code', formPromoCode, setFormPromoCode, {
                placeholder: 'e.g. FLASH50',
              })}

              <View style={[s.switchRow, { marginTop: 16, marginBottom: 16 }]}>
                <Text
                  style={[
                    s.inputLabel,
                    { color: colors.secondaryText, marginBottom: 0, marginTop: 0 },
                  ]}
                >
                  Enabled
                </Text>
                <Switch
                  value={formEnabled}
                  onValueChange={setFormEnabled}
                  trackColor={{ false: colors.gray300, true: colors.success }}
                  thumbColor={colors.card}
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[s.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[s.modalBtn, s.cancelBtn]}
                onPress={() => {
                  setShowModal(false);
                  setEditingSale(null);
                }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.saveBtn, { backgroundColor: colors.tint }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={s.saveBtnText}>{editingSale ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

