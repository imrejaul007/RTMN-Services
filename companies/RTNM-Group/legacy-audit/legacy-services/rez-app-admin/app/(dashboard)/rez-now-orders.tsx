/**
 * app/(dashboard)/rez-now-orders.tsx
 * REZ Now Orders — admin view of all web-ordering (dine-in QR) orders
 *
 * Displays:
 * - Filter bar: status (all/pending/confirmed/preparing/ready/completed/cancelled)
 *   + date range (today/7d/30d)
 * - Paginated table: Order #, Store, Customer, Items, Total, Payment, Status, Date
 * - Tap a row to expand inline: full item list, customer phone, table number
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/rez-now-orders.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

type DateRange = 'today' | '7d' | '30d';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface RezNowOrder {
  _id: string;
  orderNumber: string;
  storeName: string;
  storeId: string;
  customerName?: string;
  customerPhone?: string;
  tableNumber?: string;
  items: OrderItem[];
  itemCount: number;
  total: number;
  paymentStatus: string;
  paymentMethod?: string;
  status: string;
  createdAt: string;
}

interface OrdersResponse {
  orders: RezNowOrder[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: OrderStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const DATE_FILTERS: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
];

const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getStatusColors(status: string): { bg: string; text: string } {
  switch (status.toLowerCase()) {
    case 'pending':
      return { bg: '#fef3c7', text: '#d97706' };
    case 'confirmed':
      return { bg: '#dbeafe', text: '#2563eb' };
    case 'preparing':
      return { bg: '#ffedd5', text: '#ea580c' };
    case 'ready':
      return { bg: '#dcfce7', text: '#16a34a' };
    case 'completed':
      return { bg: '#f3f4f6', text: '#6b7280' };
    case 'cancelled':
      return { bg: '#fee2e2', text: '#dc2626' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280' };
  }
}

function getPaymentStatusColors(status: string): { bg: string; text: string } {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'success':
      return { bg: '#dcfce7', text: '#16a34a' };
    case 'pending':
      return { bg: '#fef3c7', text: '#d97706' };
    case 'failed':
    case 'refunded':
      return { bg: '#fee2e2', text: '#dc2626' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280' };
  }
}

function buildDateFilter(range: DateRange): string {
  const now = new Date();
  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return `&from=${start.toISOString()}`;
  }
  if (range === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return `&from=${start.toISOString()}`;
  }
  // 30d
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return `&from=${start.toISOString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor?: string;
}

function FilterChip({ label, active, onPress, activeColor = '#3b82f6' }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[
        s.filterChip,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.filterChipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, text } = getStatusColors(status);
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: text }]}>{status}</Text>
    </View>
  );
}

interface PaymentBadgeProps {
  status: string;
  method?: string;
}

function PaymentBadge({ status, method }: PaymentBadgeProps) {
  const { bg, text } = getPaymentStatusColors(status);
  const label = method ? `${method} · ${status}` : status;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface OrderRowProps {
  order: RezNowOrder;
  expanded: boolean;
  onToggle: () => void;
  colors: (typeof Colors)['light'];
}

function OrderRow({ order, expanded, onToggle, colors }: OrderRowProps) {
  return (
    <View style={[s.orderCard, { backgroundColor: colors.card }]}>
      {/* Main row — tappable */}
      <TouchableOpacity style={s.orderRowMain} onPress={onToggle} activeOpacity={0.75}>
        {/* Left: order number + store + date */}
        <View style={s.orderColMain}>
          <Text style={[s.orderNumber, { color: colors.text }]} numberOfLines={1}>
            #{order.orderNumber}
          </Text>
          <Text style={[s.orderStore, { color: colors.icon }]} numberOfLines={1}>
            {order.storeName}
          </Text>
          <Text style={[s.orderDate, { color: colors.icon }]}>
            {formatDate(order.createdAt)}
          </Text>
        </View>

        {/* Middle: customer + items */}
        <View style={s.orderColMid}>
          <Text style={[s.orderCustomer, { color: colors.text }]} numberOfLines={1}>
            {order.customerName || order.customerPhone || 'Walk-in'}
          </Text>
          <Text style={[s.orderItemCount, { color: colors.icon }]}>
            {order.itemCount ?? order.items?.length ?? 0} items
          </Text>
        </View>

        {/* Right: total + payment + status */}
        <View style={s.orderColRight}>
          <Text style={[s.orderTotal, { color: colors.text }]}>
            {formatCurrency(order.total ?? 0)}
          </Text>
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.icon}
          style={s.expandIcon}
        />
      </TouchableOpacity>

      {/* Expanded detail panel */}
      {expanded && (
        <View style={[s.expandedPanel, { borderTopColor: colors.border ?? '#e5e7eb' }]}>
          {/* Customer info */}
          <View style={s.expandedRow}>
            <Ionicons name="person-outline" size={14} color={colors.icon} />
            <Text style={[s.expandedLabel, { color: colors.icon }]}>Customer:</Text>
            <Text style={[s.expandedValue, { color: colors.text }]}>
              {order.customerName || 'N/A'}
              {order.customerPhone ? `  ·  ${order.customerPhone}` : ''}
            </Text>
          </View>

          {order.tableNumber ? (
            <View style={s.expandedRow}>
              <Ionicons name="restaurant-outline" size={14} color={colors.icon} />
              <Text style={[s.expandedLabel, { color: colors.icon }]}>Table:</Text>
              <Text style={[s.expandedValue, { color: colors.text }]}>
                {order.tableNumber}
              </Text>
            </View>
          ) : null}

          {/* Items list */}
          <View style={[s.itemsContainer, { borderColor: colors.border ?? '#e5e7eb' }]}>
            <Text style={[s.itemsHeader, { color: colors.icon }]}>ITEMS</Text>
            {(order.items ?? []).length === 0 ? (
              <Text style={[s.noItems, { color: colors.icon }]}>
                No item details available
              </Text>
            ) : (
              order.items.map((item, idx) => (
                <View key={idx} style={s.itemLine}>
                  <Text style={[s.itemQty, { color: colors.icon }]}>{item.quantity}×</Text>
                  <Text style={[s.itemName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[s.itemPrice, { color: colors.text }]}>
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
              ))
            )}
            <View style={[s.itemTotalLine, { borderTopColor: colors.border ?? '#e5e7eb' }]}>
              <Text style={[s.itemTotalLabel, { color: colors.icon }]}>Total</Text>
              <Text style={[s.itemTotalValue, { color: colors.text }]}>
                {formatCurrency(order.total ?? 0)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RezNowOrdersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [orders, setOrders] = useState<RezNowOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateRange>('7d');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInProgressRef = useRef(false);

  const loadOrders = useCallback(
    async (pageNum: number = 1) => {
      if (fetchInProgressRef.current) return;
      fetchInProgressRef.current = true;
      try {
        setError(null);
        const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        const dateParam = buildDateFilter(dateFilter);
        const url = `admin/web-ordering/orders?limit=${PAGE_SIZE}&page=${pageNum}${statusParam}${dateParam}`;

        const response = await apiClient.get<OrdersResponse>(url);

        if (response.success && response.data) {
          setOrders(response.data.orders ?? []);
          setTotalPages(response.data.totalPages ?? 1);
          setTotalCount(response.data.total ?? 0);
          setPage(pageNum);
        } else {
          // Graceful fallback — endpoint may not exist yet
          setOrders([]);
          setTotalPages(1);
          setTotalCount(0);
          if (response.message && !response.message.includes('404')) {
            setError(response.message);
          }
        }
      } catch (err: any) {
        // 404 = endpoint not deployed yet, show empty state rather than error
        const msg: string = err?.message ?? '';
        if (msg.includes('404') || msg.includes('not found')) {
          setOrders([]);
          setTotalPages(1);
          setTotalCount(0);
        } else {
          setError(msg || 'Failed to load REZ Now orders');
        }
      } finally {
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    },
    [statusFilter, dateFilter]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(1);
    setRefreshing(false);
  }, [loadOrders]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOrders(1);
    }, [loadOrders])
  );

  const handleStatusChange = useCallback((s: OrderStatus) => {
    setStatusFilter(s);
    setPage(1);
    setExpandedId(null);
  }, []);

  const handleDateChange = useCallback((d: DateRange) => {
    setDateFilter(d);
    setPage(1);
    setExpandedId(null);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ── Loading state ──
  if (loading && orders.length === 0) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // ── Error state ──
  if (error && orders.length === 0) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.icon} />
        <Text style={[s.errorText, { color: colors.text }]}>{error}</Text>
        <TouchableOpacity
          style={[s.retryBtn, { backgroundColor: colors.tint }]}
          onPress={() => {
            setLoading(true);
            setError(null);
            loadOrders(1);
          }}
        >
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border ?? '#e5e7eb' }]}>
        <View style={s.headerLeft}>
          <Ionicons
            name="bag-handle-outline"
            size={22}
            color={colors.tint}
            style={s.headerIcon}
          />
          <View>
            <Text style={[s.title, { color: colors.text }]}>REZ Now Orders</Text>
            <Text style={[s.subtitle, { color: colors.icon }]}>
              Web-ordering (dine-in QR) — {totalCount} total
            </Text>
          </View>
        </View>
      </View>

      {/* ── Filter bar ── */}
      <View style={[s.filterSection, { borderBottomColor: colors.border ?? '#e5e7eb' }]}>
        {/* Status filter */}
        <Text style={[s.filterLabel, { color: colors.icon }]}>STATUS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={statusFilter === f.key}
              onPress={() => handleStatusChange(f.key)}
              activeColor={colors.tint}
            />
          ))}
        </ScrollView>

        {/* Date range filter */}
        <Text style={[s.filterLabel, { color: colors.icon, marginTop: 8 }]}>DATE RANGE</Text>
        <View style={s.filterRow}>
          {DATE_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={dateFilter === f.key}
              onPress={() => handleDateChange(f.key)}
              activeColor={colors.tint}
            />
          ))}
        </View>
      </View>

      {/* ── Orders list ── */}
      <View style={s.listSection}>
        {orders.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="bag-handle-outline" size={56} color={colors.icon} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No orders found</Text>
            <Text style={[s.emptySubtitle, { color: colors.icon }]}>
              {statusFilter !== 'all'
                ? `No ${statusFilter} orders in this date range.`
                : 'REZ Now orders will appear here once placed.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Column headers */}
            <View style={[s.tableHeader, { backgroundColor: colors.card }]}>
              <Text style={[s.tableHeaderCell, { flex: 2.2, color: colors.icon }]}>
                ORDER / STORE
              </Text>
              <Text style={[s.tableHeaderCell, { flex: 1.8, color: colors.icon }]}>
                CUSTOMER
              </Text>
              <Text
                style={[
                  s.tableHeaderCell,
                  { flex: 1.6, color: colors.icon, textAlign: 'right' },
                ]}
              >
                TOTAL / STATUS
              </Text>
            </View>

            {orders.map((order) => (
              <OrderRow
                key={order._id}
                order={order}
                expanded={expandedId === order._id}
                onToggle={() => handleToggleExpand(order._id)}
                colors={colors}
              />
            ))}
          </>
        )}
      </View>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <View style={[s.pagination, { borderTopColor: colors.border ?? '#e5e7eb' }]}>
          <TouchableOpacity
            style={[
              s.pageBtn,
              { borderColor: colors.border ?? '#e5e7eb' },
              page <= 1 && s.pageBtnDisabled,
            ]}
            onPress={() => {
              if (page > 1) {
                setLoading(true);
                loadOrders(page - 1);
              }
            }}
            disabled={page <= 1}
          >
            <Ionicons name="chevron-back" size={16} color={page <= 1 ? colors.icon : colors.tint} />
            <Text style={[s.pageBtnText, { color: page <= 1 ? colors.icon : colors.tint }]}>
              Prev
            </Text>
          </TouchableOpacity>

          <Text style={[s.pageInfo, { color: colors.icon }]}>
            Page {page} of {totalPages}
          </Text>

          <TouchableOpacity
            style={[
              s.pageBtn,
              { borderColor: colors.border ?? '#e5e7eb' },
              page >= totalPages && s.pageBtnDisabled,
            ]}
            onPress={() => {
              if (page < totalPages) {
                setLoading(true);
                loadOrders(page + 1);
              }
            }}
            disabled={page >= totalPages}
          >
            <Text
              style={[
                s.pageBtnText,
                { color: page >= totalPages ? colors.icon : colors.tint },
              ]}
            >
              Next
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={page >= totalPages ? colors.icon : colors.tint}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.footer} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

