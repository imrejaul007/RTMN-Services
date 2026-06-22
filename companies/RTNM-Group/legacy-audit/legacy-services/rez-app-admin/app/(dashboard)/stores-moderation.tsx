import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  useColorScheme,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { showAlert, showConfirm } from '../../utils/alert';
import { useDebouncedCallback } from '../../utils/debounce';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { s } from './styles/stores-moderation.styles';

// ============================================
// TYPES
// ============================================

type StoreStatus = 'all' | 'active' | 'inactive' | 'flagged';

interface AdminStoreItem {
  _id: string;
  name: string;
  logo?: string;
  category?: string | { _id: string; name: string };
  merchant?: { _id: string; name?: string; businessName?: string };
  merchantInfo?: { businessName?: string; ownerName?: string };
  location?: { city?: string };
  ratings?: { average: number; count: number };
  isActive: boolean;
  isSuspended?: boolean;
  isFeatured?: boolean;
  adminApproved?: boolean;
}

interface StoresResponse {
  stores: AdminStoreItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
  };
  activeCount?: number;
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_TABS: { key: StoreStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'flagged', label: 'Flagged' },
];

// ============================================
// HELPERS
// ============================================

function getCategoryName(cat: AdminStoreItem['category']): string {
  if (!cat) return '';
  if (typeof cat === 'string') return cat;
  return cat.name || '';
}

function getMerchantName(item: AdminStoreItem): string {
  if (item.merchantInfo?.businessName) return item.merchantInfo.businessName;
  if (item.merchantInfo?.ownerName) return item.merchantInfo.ownerName;
  if (item.merchant?.businessName) return item.merchant.businessName;
  if (item.merchant?.name) return item.merchant.name;
  return 'Unknown Merchant';
}

function isStoreFlagged(store: AdminStoreItem): boolean {
  return !!store.isSuspended || store.adminApproved === false;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function StoresModerationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { hasRole } = useAuth();

  const [stores, setStores] = useState<AdminStoreItem[]>([]);
  const [activeStoreCount, setActiveStoreCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StoreStatus>('all');
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Debounce search input
  const debouncedSearch = useDebouncedCallback((text: string) => {
    setSearchQuery(text);
  }, 350);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const loadData = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (!append) setLoading(true);

        const params = new URLSearchParams({
          page: String(pageNum),
          limit: '20',
        });

        if (searchQuery) params.set('search', searchQuery);

        if (statusFilter === 'active') params.set('isActive', 'true');
        else if (statusFilter === 'inactive') params.set('isActive', 'false');
        else if (statusFilter === 'flagged') params.set('isSuspended', 'true');

        const res = await apiClient.get<StoresResponse>(`admin/stores?${params.toString()}`);
        const data = res.data;
        const items: AdminStoreItem[] =
          data?.stores ??
          (Array.isArray(res.data) ? (res.data as unknown as AdminStoreItem[]) : []);

        if (!append) {
          setStores(items);
        } else {
          setStores((prev) => [...prev, ...items]);
        }

        setHasMore(items.length === 20);
        setPage(pageNum);

        if (data?.activeCount !== undefined) {
          setActiveStoreCount(data.activeCount);
        }
      } catch {
        showAlert('Error', 'Failed to load stores');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, searchQuery]
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(1);
  }, [loadData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleToggleStatus = useCallback(
    (store: AdminStoreItem) => {
      const next = !store.isActive;
      const action = next ? 'Activate' : 'Deactivate';
      showConfirm(
        `${action} Store?`,
        `${action} "${store.name}"?`,
        async () => {
          setProcessingId(store._id);
          try {
            await apiClient.patch(`admin/stores/${store._id}/status`, { isActive: next });
            showAlert('Success', `Store ${next ? 'activated' : 'deactivated'}`);
            loadData(1);
          } catch {
            showAlert('Error', `Failed to ${action.toLowerCase()} store`);
          } finally {
            setProcessingId(null);
          }
        },
        action
      );
    },
    [loadData]
  );

  const handleViewProfile = useCallback((store: AdminStoreItem) => {
    const categoryName = getCategoryName(store.category);
    const status = store.isSuspended ? 'Suspended' : store.isActive ? 'Active' : 'Inactive';
    showAlert(
      store.name,
      `Category: ${categoryName || 'N/A'}\nStatus: ${status}\nMerchant: ${getMerchantName(store)}`
    );
  }, []);

  const handleSuspend = useCallback(
    (store: AdminStoreItem) => {
      showConfirm(
        'Suspend Store?',
        `Suspend "${store.name}"? This will deactivate the store and mark it as suspended.`,
        async () => {
          setProcessingId(store._id);
          try {
            await apiClient.patch(`admin/stores/${store._id}/status`, {
              isActive: false,
              isSuspended: true,
            });
            showAlert('Success', 'Store suspended');
            loadData(1);
          } catch {
            showAlert('Error', 'Failed to suspend store');
          } finally {
            setProcessingId(null);
          }
        },
        'Suspend'
      );
    },
    [loadData]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderStore = useCallback(
    ({ item }: { item: AdminStoreItem }) => {
      const isProcessing = processingId === item._id;
      const flagged = isStoreFlagged(item);
      const categoryName = getCategoryName(item.category);
      const merchantName = getMerchantName(item);
      const city = item.location?.city;
      const rating = item.ratings?.average;

      return (
        <View style={[s.card, { backgroundColor: colors.card }]}>
          {/* Logo + Info */}
          <View style={s.cardHeader}>
            {item.logo ? (
              <Image source={{ uri: item.logo }} style={s.logo} />
            ) : (
              <View style={[s.logoPlaceholder, { backgroundColor: colors.gray200 }]}>
                <Ionicons name="storefront-outline" size={22} color={colors.tabIconDefault} />
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.storeName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {categoryName ? (
                <Text style={{ fontSize: 12, color: colors.tabIconDefault }}>{categoryName}</Text>
              ) : null}
              <Text style={{ fontSize: 12, color: colors.tabIconDefault }} numberOfLines={1}>
                {merchantName}
              </Text>
              {city ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  <Ionicons name="location-outline" size={11} color={colors.tabIconDefault} />
                  <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>{city}</Text>
                </View>
              ) : null}
            </View>

            {/* Right: Rating + isActive badge */}
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {rating !== undefined && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>
                    {rating.toFixed(1)}
                  </Text>
                </View>
              )}
              <View
                style={[
                  s.statusBadge,
                  {
                    backgroundColor: flagged ? '#FEF9C3' : item.isActive ? '#DCFCE7' : '#FEE2E2',
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: flagged ? '#92400E' : item.isActive ? '#166534' : '#991B1B',
                  }}
                >
                  {flagged ? 'FLAGGED' : item.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actionRow}>
            <TouchableOpacity
              onPress={() => handleToggleStatus(item)}
              disabled={isProcessing}
              style={[
                s.actionBtn,
                {
                  backgroundColor: item.isActive ? '#ef4444' : '#22c55e',
                  opacity: isProcessing ? 0.6 : 1,
                },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.actionBtnText}>
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSuspend(item)}
              disabled={isProcessing || !!item.isSuspended}
              style={[
                s.actionBtn,
                {
                  backgroundColor: item.isSuspended ? '#d4d4d4' : '#f97316',
                  opacity: isProcessing || item.isSuspended ? 0.6 : 1,
                },
              ]}
            >
              <Text style={s.actionBtnText}>{item.isSuspended ? 'Suspended' : 'Suspend'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleViewProfile(item)}
              style={[s.actionBtn, { backgroundColor: colors.gray200 }]}
            >
              <Text style={[s.actionBtnText, { color: colors.text }]}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [colors, processingId, handleToggleStatus, handleSuspend, handleViewProfile]
  );

  // Role guard: require Admin role
  if (!hasRole(ADMIN_ROLES.ADMIN)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={s.emptyState}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.tabIconDefault} />
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: '700',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Access Denied
          </Text>
          <Text
            style={{
              color: colors.tabIconDefault,
              textAlign: 'center',
              paddingHorizontal: 32,
              marginTop: 8,
            }}
          >
            You need Admin privileges to access Store Moderation.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.rowBetween}>
          <Text style={[s.title, { color: colors.text }]}>Store Moderation</Text>
          {activeStoreCount > 0 && (
            <View style={[s.countBadge, { backgroundColor: colors.successLight }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.successDark }}>
                {activeStoreCount} active
              </Text>
            </View>
          )}
        </View>

        {/* Search */}
        <View style={[s.searchBar, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={16} color={colors.tabIconDefault} />
          <TextInput
            style={{ flex: 1, padding: 10, color: colors.text, fontSize: 14 }}
            placeholder="Search by store or merchant name..."
            placeholderTextColor={colors.tabIconDefault}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              debouncedSearch(text);
            }}
            returnKeyType="search"
            onSubmitEditing={() => setSearchQuery(searchText)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                setSearchQuery('');
              }}
            >
              <Ionicons name="close-circle" size={16} color={colors.tabIconDefault} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10, marginBottom: 4 }}
        >
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STATUS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setStatusFilter(tab.key)}
                style={[
                  s.pill,
                  {
                    backgroundColor: statusFilter === tab.key ? colors.tint : colors.card,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: statusFilter === tab.key ? '#fff' : colors.text,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* List */}
      {loading && stores.length === 0 ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item._id}
          renderItem={renderStore}
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          onEndReached={() => hasMore && !loading && loadData(page + 1, true)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading && stores.length > 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} />
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="storefront-outline" size={48} color={colors.tabIconDefault} />
              <Text style={{ color: colors.tabIconDefault, marginTop: 12, textAlign: 'center' }}>
                No {statusFilter === 'all' ? '' : statusFilter + ' '}stores found
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

