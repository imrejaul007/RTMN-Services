import { normalizeOrderStatus } from '../../constants/orderStatuses';
import { logger } from '../../utils/logger';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { withErrorBoundary } from '../../components/ErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersService, Order } from '../../services/api/orders';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert } from '../../utils/alert';
import { formatLabel } from '../../utils/formatLabel';
import { useDebouncedCallback } from '../../utils/debounce';

type StatusFilter =
  | 'all'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelling'
  | 'cancelled'
  | 'returned'
  | 'refunded';
type FulfillmentFilter = 'all' | 'delivery' | 'pickup' | 'drive_thru' | 'dine_in' | 'web_menu';

const FULFILLMENT_LABELS: Record<string, string> = {
  delivery: 'Delivery',
  pickup: 'Pickup',
  drive_thru: 'Drive-Thru',
  dine_in: 'Dine-In',
  web_menu: 'Web Menu',
};

const FULFILLMENT_ICONS: Record<string, string> = {
  delivery: 'bicycle-outline',
  pickup: 'bag-handle-outline',
  drive_thru: 'car-outline',
  dine_in: 'restaurant-outline',
  web_menu: 'qr-code-outline',
};

// Canonical status transitions — aligned with rez-shared/src/orderStatuses.ts
const STATUS_TRANSITIONS_MAP: { [key: string]: string[] } = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'cancelled'],
  dispatched: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['returned', 'refunded'],
  cancelling: ['cancelled'],
  cancelled: ['refunded'],
  returned: ['refunded'],
  refunded: [],
};

function OrdersScreenInner() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(false);
  }, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Reason modal (refund / cancel)
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [reasonAction, setReasonAction] = useState<'refund' | 'cancel'>('refund');
  const [reasonOrderId, setReasonOrderId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [statusOrderCurrent, setStatusOrderCurrent] = useState<string>('');

  const loadData = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!append) setIsLoading(true);
      try {
        setError(null);
        const data = await ordersService.getOrders(
          pageNum,
          20,
          statusFilter === 'all' ? undefined : statusFilter,
          undefined,
          searchQuery || undefined,
          fulfillmentFilter === 'all' ? undefined : fulfillmentFilter
        );

        const orderList = data?.orders ?? [];
        if (append) {
          setOrders((prev) => [...prev, ...orderList]);
        } else {
          setOrders(orderList);
        }

        setHasMore((data?.pagination?.page ?? 1) < (data?.pagination?.totalPages ?? 1));
        setPage(pageNum);
      } catch (error: any) {
        logger.error('Failed to load orders:', error);
        setError(error?.message || 'Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, searchQuery, fulfillmentFilter]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, [loadData]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  }, [isLoading, hasMore, page, loadData]);

  const handleRefund = (orderId: string) => {
    const order = orders.find((o) => o._id === orderId);
    const total = order?.totals?.total ?? 0;
    const alreadyRefunded = order?.totals?.refundAmount ?? 0;
    setRefundAmount(total - alreadyRefunded);
    setReasonOrderId(orderId);
    setReasonAction('refund');
    setReasonText('');
    setShowReasonModal(true);
  };

  const handleCancel = (orderId: string) => {
    setRefundAmount(0);
    setReasonOrderId(orderId);
    setReasonAction('cancel');
    setReasonText('');
    setShowReasonModal(true);
  };

  const handleReasonConfirm = async () => {
    if (!reasonText.trim() || !reasonOrderId) {
      setReasonError('Please provide a reason');
      return;
    }
    setReasonError(null);
    try {
      setProcessingOrder(reasonOrderId);
      if (reasonAction === 'refund') {
        await ordersService.refundOrder(reasonOrderId, refundAmount, reasonText, `refund-${reasonOrderId}-${Date.now()}`);
        showAlert('Success', 'Refund processed successfully');
      } else {
        await ordersService.cancelOrder(reasonOrderId, reasonText);
        showAlert('Success', 'Order cancelled');
      }
      setShowReasonModal(false);
      setReasonText('');
      setReasonOrderId(null);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingOrder(null);
    }
  };

  // Canonical status transitions — matches backend Order model
  // Defined outside render path (static object); referenced via closure is fine
  const STATUS_TRANSITIONS = STATUS_TRANSITIONS_MAP;

  const handleUpdateStatus = (orderId: string, currentStatus: string) => {
    setStatusOrderId(orderId);
    setStatusOrderCurrent(currentStatus);
    setShowStatusModal(true);
  };

  const handleStatusSelect = async (newStatus: string) => {
    if (!statusOrderId) return;
    try {
      setProcessingOrder(statusOrderId);
      setShowStatusModal(false);
      await ordersService.updateOrderStatus(statusOrderId, newStatus);
      showAlert('Success', `Order status updated to ${newStatus}`);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingOrder(null);
      setStatusOrderId(null);
    }
  };

  // AA-DSH-023: Memoize getStatusColor to avoid recalculation on every render
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'delivered':
        return colors.success;
      case 'placed':
        return colors.warning;
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return colors.info;
      case 'dispatched':
        return colors.purple;
      case 'returned':
        return colors.mutedDark;
      case 'cancelled':
      case 'refunded':
        return colors.error;
      default:
        return colors.icon;
    }
  }, [colors]);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
      case 'refunded':
        return colors.error;
      default:
        return colors.icon;
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    // AA-DSH-016: Use device locale instead of hardcoded 'en-IN'
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-IN';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount ?? 0);
  };

  const safeFormatDate = (dateStr: string | undefined, pattern: string = 'MMM d, yyyy h:mm a') => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), pattern);
    } catch {
      return '—';
    }
  };

  const renderFilters = () => {
    // AA-DSH-026: Show active filters count
    const activeFiltersCount =
      (statusFilter !== 'all' ? 1 : 0) + (fulfillmentFilter !== 'all' ? 1 : 0);

    return (
    <View style={styles.filtersContainer}>
      {activeFiltersCount > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: colors.icon, fontWeight: '500' }}>
            Active Filters: {activeFiltersCount}
            {statusFilter !== 'all' && ` (Status: ${formatLabel(statusFilter)})`}
            {fulfillmentFilter !== 'all' && ` (Type: ${FULFILLMENT_LABELS[fulfillmentFilter]})`}
          </Text>
        </View>
      )}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by order number..."
          placeholderTextColor={colors.icon}
          value={searchInput}
          onChangeText={(text) => {
            setSearchInput(text);
            setIsSearching(true);
            debouncedSearch(text);
          }}
        />
        {searchInput ? (
          <TouchableOpacity
            onPress={() => {
              setSearchInput('');
              setSearchQuery('');
              setIsSearching(false);
            }}
          >
            <Ionicons name="close-circle" size={20} color={colors.icon} />
          </TouchableOpacity>
        ) : isSearching ? (
          // AA-DSH-024: Show spinner while searching (300ms debounce)
          <ActivityIndicator size="small" color={colors.icon} />
        ) : null}
      </View>

      <View style={styles.statusFilters}>
        {(
          [
            'all',
            'placed',
            'confirmed',
            'preparing',
            'ready',
            'dispatched',
            'out_for_delivery',
            'delivered',
            'cancelling',
            'cancelled',
            'returned',
            'refunded',
          ] as StatusFilter[]
        ).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              { backgroundColor: statusFilter === status ? colors.tint : colors.card },
            ]}
            onPress={() => {
              setStatusFilter(status);
              setIsLoading(true);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: statusFilter === status ? colors.card : colors.text },
              ]}
            >
              {status === 'all' ? 'All' : formatLabel(status)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fulfillment type filter */}
      <View style={[styles.statusFilters, { marginTop: 8 }]}>
        {(
          ['all', 'delivery', 'pickup', 'drive_thru', 'dine_in', 'web_menu'] as FulfillmentFilter[]
        ).map((ft) => (
          <TouchableOpacity
            key={ft}
            style={[
              styles.filterChip,
              {
                backgroundColor: fulfillmentFilter === ft ? colors.navy : colors.card,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                minHeight: 36,
                justifyContent: 'center',
              },
            ]}
            onPress={() => {
              setFulfillmentFilter(ft);
              setIsLoading(true);
            }}
          >
            {ft !== 'all' && (
              <Ionicons
                name={(FULFILLMENT_ICONS[ft] || 'help-circle-outline') as unknown as keyof typeof Ionicons.glyphMap}
                size={14}
                color={fulfillmentFilter === ft ? colors.card : colors.icon}
              />
            )}
            <Text
              style={[
                styles.filterChipText,
                { color: fulfillmentFilter === ft ? colors.card : colors.text },
              ]}
            >
              {ft === 'all' ? 'All Types' : FULFILLMENT_LABELS[ft] || ft}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
    );
  };

  const renderOrderItem = useCallback(
    ({ item }: { item: Order }) => {
      const customerName = item.user?.profile
        ? `${item.user.profile.firstName || ''} ${item.user.profile.lastName || ''}`.trim()
        : item.user?.phoneNumber || 'Unknown';

      return (
        <TouchableOpacity
          style={[styles.orderCard, { backgroundColor: colors.card }]}
          onPress={() => {
            setSelectedOrder(item);
            setShowDetailModal(true);
          }}
        >
          <View style={styles.orderHeader}>
            <View>
              <Text style={[styles.orderNumber, { color: colors.text }]}>#{item.orderNumber}</Text>
              <Text style={[styles.storeName, { color: colors.icon }]}>
                {item.store?.name || (item.items?.[0] as unknown as {store?: {name?: string}})?.store?.name || 'Unknown Store'}
              </Text>
              {item.items?.length > 0 && (
                <Text style={[styles.productNames, { color: colors.icon }]} numberOfLines={1}>
                  {item.items
                    .map((i: any) => i.name || i.product?.name)
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {item.fulfillmentType && item.fulfillmentType !== 'delivery' && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: colors.infoLight,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                    },
                  ]}
                >
                  <Ionicons
                    name={(FULFILLMENT_ICONS[item.fulfillmentType] || 'help-circle-outline') as unknown as keyof typeof Ionicons.glyphMap}
                    size={11}
                    color={colors.navy}
                  />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ fontSize: 12, fontWeight: '600', color: colors.navy }}
                  >
                    {' '}
                    {/* min readable */}
                    {FULFILLMENT_LABELS[item.fulfillmentType] || item.fulfillmentType}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(item.status)}20` },
                ]}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.statusText,
                    { color: getStatusColor(normalizeOrderStatus(item.status)) },
                  ]}
                >
                  {normalizeOrderStatus(item.status).replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={colors.icon} />
              <Text style={[styles.detailText, { color: colors.icon }]}>{customerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="receipt-outline" size={16} color={colors.icon} />
              <Text style={[styles.detailText, { color: colors.icon }]}>
                {item.items?.length || 0} items
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.icon} />
              <Text style={[styles.detailText, { color: colors.icon }]}>
                {safeFormatDate(item.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.orderFooter}>
            <View>
              <Text style={[styles.totalLabel, { color: colors.icon }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.text }]}>
                {formatCurrency(item.totals?.total || 0)}
              </Text>
            </View>
            <View style={styles.paymentInfo}>
              <View
                style={[
                  styles.paymentBadge,
                  { backgroundColor: `${getPaymentStatusColor(item.paymentStatus)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.paymentStatusText,
                    { color: getPaymentStatusColor(item.paymentStatus) },
                  ]}
                >
                  {item.paymentStatus}
                </Text>
              </View>
              <Text style={[styles.deliveryType, { color: colors.icon }]}>
                {item.fulfillmentType
                  ? FULFILLMENT_LABELS[item.fulfillmentType] || item.deliveryType
                  : item.deliveryType}
              </Text>
            </View>
          </View>

          {/* Fee breakdown */}
          {item.totals?.platformFee > 0 && (
            <View style={[styles.feeBreakdown, { borderTopColor: colors.border }]}>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: colors.icon }]}>
                  {`Platform Fee (${item.totals?.total && item.totals.total > 0 ? ((item.totals?.platformFee / item.totals.total) * 100).toFixed(0) : '—'}%)`}
                </Text>
                <Text style={[styles.feeValue, { color: colors.tint }]}>
                  {formatCurrency(item.totals?.platformFee || 0)}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: colors.icon }]}>Merchant Payout</Text>
                <Text style={[styles.feeValue, { color: colors.success }]}>
                  {formatCurrency(item.totals.merchantPayout || 0)}
                </Text>
              </View>
            </View>
          )}

          {/* Coin & Cashback Details */}
          {(() => {
            const lockFee =
              item.items?.reduce((sum: number, i: any) => sum + (i.discount || 0), 0) || 0;
            const coinsUsed = item.payment?.coinsUsed;
            const checkoutCoins = coinsUsed?.totalCoinsValue || coinsUsed?.rezCoins || 0;
            const cashback = item.totals?.cashback || 0;
            const hasDetails = lockFee > 0 || checkoutCoins > 0 || cashback > 0;

            if (!hasDetails) return null;

            return (
              <View style={[styles.feeBreakdown, { borderTopColor: colors.border }]}>
                {lockFee > 0 && (
                  <View style={styles.feeRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="lock-closed" size={13} color={colors.successDark} />
                      <Text style={[styles.feeLabel, { color: colors.successDark }]}>
                        Lock Fee Paid
                      </Text>
                    </View>
                    <Text style={[styles.feeValue, { color: colors.successDark }]}>
                      {formatCurrency(lockFee)}
                    </Text>
                  </View>
                )}
                {checkoutCoins > 0 && (
                  <View style={styles.feeRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="wallet" size={13} color={colors.purpleDark} />
                      <Text style={[styles.feeLabel, { color: colors.purpleDark }]}>
                        Coins Used at Checkout
                      </Text>
                    </View>
                    <Text style={[styles.feeValue, { color: colors.purpleDark }]}>
                      {formatCurrency(checkoutCoins)}
                    </Text>
                  </View>
                )}
                {cashback > 0 && (
                  <View style={styles.feeRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="gift" size={13} color={colors.warningDark} />
                      <Text style={[styles.feeLabel, { color: colors.warningDark }]}>
                        {item.status === 'delivered'
                          ? 'Cashback Earned'
                          : 'Cashback (after delivery)'}
                      </Text>
                    </View>
                    <Text style={[styles.feeValue, { color: colors.warningDark }]}>
                      {formatCurrency(cashback)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Actions for specific statuses */}
          {(item.status === 'delivered' || item.status === 'confirmed') &&
            item.paymentStatus === 'completed' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.warning }]}
                  onPress={() => handleRefund(item._id)}
                  disabled={processingOrder === item._id}
                >
                  {processingOrder === item._id ? (
                    <ActivityIndicator size="small" color={colors.card} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={16} color={colors.card} />
                      <Text style={styles.actionButtonText}>Refund</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

          {(item.status === 'placed' || item.status === 'confirmed') && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={() => handleCancel(item._id)}
                disabled={processingOrder === item._id}
              >
                {processingOrder === item._id ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <>
                    <Ionicons name="close" size={16} color={colors.card} />
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Update Status button for orders with available transitions */}
          {STATUS_TRANSITIONS[item.status]?.length > 0 && (
            <View
              style={[
                styles.actionButtons,
                {
                  marginTop:
                    item.status === 'placed' ||
                    item.status === 'confirmed' ||
                    (item.status === 'delivered' && item.paymentStatus === 'completed')
                      ? 0
                      : 12,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.tint }]}
                onPress={() => handleUpdateStatus(item._id, item.status)}
                disabled={processingOrder === item._id}
              >
                {processingOrder === item._id ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <>
                    <Ionicons name="swap-horizontal" size={16} color={colors.card} />
                    <Text style={styles.actionButtonText}>Update Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [
      colors,
      processingOrder,
      getStatusColor,
      getPaymentStatusColor,
      formatCurrency,
      handleRefund,
      handleCancel,
      handleUpdateStatus,
      STATUS_TRANSITIONS,
    ]
  );

  if (isLoading && orders.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderFilters()}

      {error && orders.length === 0 && (
        <View style={{ padding: 16, backgroundColor: '#FEE2E2', margin: 8, borderRadius: 8 }}>
          <Text style={{ color: '#C62828', marginBottom: 8 }}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setIsLoading(true);
              loadData(1);
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text style={{ color: '#C62828', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={{ padding: 16 }} color={colors.tint} />
          ) : !hasMore ? (
            <Text style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>
              No more results
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No orders found</Text>
          </View>
        }
      />

      {/* Order Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Order #{selectedOrder?.orderNumber}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <View style={styles.modalBody}>
                {/* Fulfillment badge in modal */}
                {selectedOrder.fulfillmentType && selectedOrder.fulfillmentType !== 'delivery' && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                      gap: 6,
                      backgroundColor: colors.infoLight,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Ionicons
                      name={
                        (FULFILLMENT_ICONS[selectedOrder.fulfillmentType] ||
                          'help-circle-outline') as unknown as keyof typeof Ionicons.glyphMap
                      }
                      size={14}
                      color={colors.navy}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.navy }}>
                      {FULFILLMENT_LABELS[selectedOrder.fulfillmentType] ||
                        selectedOrder.fulfillmentType}
                    </Text>
                    {selectedOrder.fulfillmentDetails?.tableNumber && (
                      <Text style={{ fontSize: 12, color: colors.navy }}>
                        • Table {selectedOrder.fulfillmentDetails.tableNumber}
                      </Text>
                    )}
                    {selectedOrder.fulfillmentDetails?.vehicleInfo && (
                      <Text style={{ fontSize: 12, color: colors.navy }}>
                        • {selectedOrder.fulfillmentDetails.vehicleInfo}
                      </Text>
                    )}
                  </View>
                )}

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Items</Text>
                {selectedOrder.items?.map((item: any, index: number) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={[styles.itemName, { color: colors.text }]}>
                      {item.quantity}x {item.name || item.product?.name || 'Item'}
                    </Text>
                    <Text style={[styles.itemPrice, { color: colors.icon }]}>
                      {formatCurrency(item.total ?? item.subtotal ?? 0)}
                    </Text>
                  </View>
                ))}

                <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.icon }]}>Subtotal</Text>
                    <Text style={[styles.totalValue, { color: colors.text }]}>
                      {formatCurrency(selectedOrder.totals?.subtotal || 0)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.icon }]}>Tax</Text>
                    <Text style={[styles.totalValue, { color: colors.text }]}>
                      {formatCurrency(selectedOrder.totals?.tax || 0)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.icon }]}>Delivery</Text>
                    <Text style={[styles.totalValue, { color: colors.text }]}>
                      {/* Backend field is totals.delivery not totals.deliveryFee */}
                      {formatCurrency(
                        (selectedOrder.totals as unknown as {delivery?: number; deliveryFee?: number})?.delivery ??
                          (selectedOrder.totals as unknown as {delivery?: number; deliveryFee?: number})?.deliveryFee ??
                          0
                      )}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabelBold, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.totalValueBold, { color: colors.text }]}>
                      {formatCurrency(selectedOrder.totals?.total || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowStatusModal(false);
          setStatusOrderId(null);
        }}
      >
        <View style={styles.reasonModalOverlay}>
          <View style={[styles.reasonModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.reasonModalHeader}>
              <Ionicons name="swap-horizontal" size={24} color={colors.tint} />
              <Text style={[styles.reasonModalTitle, { color: colors.text }]}>Update Status</Text>
            </View>
            <Text style={[{ fontSize: 13, color: colors.icon, marginBottom: 16 }]}>
              Current: {statusOrderCurrent.replace(/_/g, ' ')}
            </Text>
            <View style={{ gap: 8 }}>
              {(STATUS_TRANSITIONS[statusOrderCurrent] || []).map((nextStatus: string) => (
                <TouchableOpacity
                  key={nextStatus}
                  style={[
                    styles.statusOption,
                    {
                      backgroundColor: `${getStatusColor(nextStatus)}15`,
                      borderColor: getStatusColor(nextStatus),
                    },
                  ]}
                  onPress={() => handleStatusSelect(nextStatus)}
                >
                  <View
                    style={[styles.statusDot, { backgroundColor: getStatusColor(nextStatus) }]}
                  />
                  <Text style={[styles.statusOptionText, { color: colors.text }]}>
                    {nextStatus.replace(/_/g, ' ')}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.icon} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.border, marginTop: 16 }]}
              onPress={() => {
                setShowStatusModal(false);
                setStatusOrderId(null);
              }}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reason Modal (Refund / Cancel) */}
      <Modal
        visible={showReasonModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowReasonModal(false);
          setReasonText('');
          setReasonOrderId(null);
          setReasonError(null);
          setRefundAmount(0);
        }}
      >
        <View style={styles.reasonModalOverlay}>
          <View style={[styles.reasonModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.reasonModalHeader}>
              <Ionicons
                name="warning"
                size={24}
                color={reasonAction === 'refund' ? colors.error : colors.warning}
              />
              <Text style={[styles.reasonModalTitle, { color: colors.text }]}>
                {reasonAction === 'refund' ? 'Refund Order' : 'Cancel Order'}
              </Text>
            </View>

            {/* AA-ORD-019: Clarify difference between cancel and refund */}
            <Text style={{ fontSize: 12, color: colors.icon, marginBottom: 12 }}>
              {reasonAction === 'refund'
                ? 'Return payment for fulfilled order'
                : 'Revoke order before fulfillment'}
            </Text>

            {/* AA-ORD-017: Show order summary before refund/cancel confirmation */}
            {selectedOrder && (
              <View style={{ backgroundColor: colors.border + '20', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: colors.icon, marginBottom: 4 }}>Order Summary</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 2 }}>
                  Order #{(selectedOrder as unknown as {id?: string}).id ?? selectedOrder._id}
                </Text>
                {selectedOrder.user?.profile?.firstName && (
                  <Text style={{ fontSize: 12, color: colors.text, marginBottom: 4 }}>
                    Customer: {[selectedOrder.user.profile.firstName, selectedOrder.user.profile.lastName].filter(Boolean).join(' ') || 'N/A'}
                  </Text>
                )}
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  Total: {formatCurrency((selectedOrder as unknown as {totals?: {total?: number}}).totals?.total ?? (selectedOrder as unknown as {total?: number}).total ?? 0)}
                </Text>
              </View>
            )}

            {reasonAction === 'refund' && (
              <TextInput
                style={[
                  styles.reasonInput,
                  { color: colors.text, borderColor: colors.border, marginBottom: 12 },
                ]}
                placeholder={`Refund amount (₹${refundAmount.toFixed(2)})`}
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
                value={refundAmount > 0 ? String(refundAmount) : ''}
                onChangeText={(text) => {
                  const parsed = parseFloat(text.replace(/[^0-9.]/g, ''));
                  setRefundAmount(isNaN(parsed) ? 0 : parsed);
                }}
              />
            )}
            <TextInput
              style={[
                styles.reasonInput,
                { color: colors.text, borderColor: reasonError ? '#C62828' : colors.border },
              ]}
              placeholder={
                reasonAction === 'refund'
                  ? 'Enter refund reason...'
                  : 'Enter cancellation reason...'
              }
              placeholderTextColor={colors.icon}
              value={reasonText}
              onChangeText={(text) => {
                // AA-DSH-027: Limit character input to 500
                if (text.length <= 500) {
                  setReasonText(text);
                  if (reasonError && text.trim()) setReasonError(null);
                }
              }}
              maxLength={500}
              multiline
              numberOfLines={3}
            />
            {reasonError && (
              <Text style={{ color: '#C62828', fontSize: 13, marginTop: 4 }}>{reasonError}</Text>
            )}
            {/* AA-DSH-027: Show character count */}
            <Text style={{ fontSize: 12, color: colors.icon, marginTop: 4, textAlign: 'right' }}>
              {reasonText.length}/500 characters
            </Text>
            <View style={styles.reasonModalButtons}>
              <TouchableOpacity
                style={[styles.reasonModalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowReasonModal(false);
                  setReasonText('');
                  setReasonOrderId(null);
                  setReasonError(null);
                  setRefundAmount(0);
                }}
              >
                <Text style={[styles.reasonModalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reasonModalButton,
                  { backgroundColor: reasonAction === 'refund' ? colors.error : colors.warning },
                ]}
                onPress={handleReasonConfirm}
              >
                <Text style={[styles.reasonModalButtonText, { color: colors.card }]}>
                  {reasonAction === 'refund' ? 'Refund' : 'Cancel Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
    fontSize: 15,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  orderCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  storeName: {
    fontSize: 13,
    marginTop: 2,
  },
  productNames: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  paymentInfo: {
    alignItems: 'flex-end',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deliveryType: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  feeBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feeLabel: {
    fontSize: 12,
  },
  feeValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.light.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
  },
  totalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 14,
  },
  totalLabelBold: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValueBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 16,
  },
  reasonModalOverlay: {
    flex: 1,
    backgroundColor: Colors.light.modalOverlay,
    justifyContent: 'center',
    padding: 20,
  },
  reasonModalContent: {
    borderRadius: 16,
    padding: 20,
  },
  reasonModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  reasonModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reasonModalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  reasonModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reasonModalButtonText: {
    fontWeight: '600',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});

// ADM-004: Per-screen ErrorBoundary so an orders crash is isolated from the root.
export default withErrorBoundary(OrdersScreenInner, { name: 'OrdersScreen' });
