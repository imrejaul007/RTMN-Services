/**
 * app/(dashboard)/web-menu-analytics.tsx
 * Web Menu Analytics — QR scan orders & dine-in web performance
 *
 * Displays:
 * - Summary cards: total web menu orders, average order value, total revenue
 * - Top 5 stores by web menu orders
 * - Recent web menu orders (last 20)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { showAlert } from '../../utils/alert';
import { s } from './styles/web-menu-analytics.styles';

interface WebMenuOrder {
  _id: string;
  orderNumber: string;
  storeName: string;
  storeId: string;
  customerPhone: string;
  customerName?: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  tableNumber?: string;
}

interface WebMenuData {
  totalCount: number;
  todayCount: number;
  monthCount: number;
  totalRevenue: number;
  todayRevenue: number;
  avgOrderValue: number;
  topStores: { storeId: string; storeName: string; count: number; revenue: number }[];
  recentOrders: WebMenuOrder[];
}

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
}

function KPICard({ label, value, subtext, icon, iconColor, backgroundColor }: KPICardProps) {
  return (
    <View style={[s.kpiCard, { backgroundColor }]}>
      <View style={s.kpiIconContainer}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
      <View style={s.kpiContent}>
        <Text style={s.kpiLabel}>{label}</Text>
        <Text style={s.kpiValue}>{value}</Text>
        {subtext && <Text style={s.kpiSubtext}>{subtext}</Text>}
      </View>
    </View>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
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

export default function WebMenuAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [data, setData] = useState<WebMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);

  const loadData = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;
    try {
      setError(null);
      const response = await apiClient.get<WebMenuData>('admin/dashboard/web-menu-analytics');
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to load web menu analytics');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to load web menu analytics';
      setError(msg);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading && !data) {
    return (
      <View
        style={[
          s.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View
        style={[
          s.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={48} color={colors.icon} />
        <Text style={[s.emptyText, { color: colors.text, marginTop: 12 }]}>{error}</Text>
      </View>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.header}>
          <Text style={[s.title, { color: colors.text }]}>Web Menu Analytics</Text>
          <Text style={[s.subtitle, { color: colors.icon }]}>
            QR scan orders & dine-in web performance
          </Text>
        </View>
        <View style={s.emptyContainer}>
          <Ionicons name="qr-code-outline" size={64} color={colors.icon} />
          <Text style={[s.emptyText, { color: colors.text }]}>No web menu orders found</Text>
          <Text style={[s.emptySubtext, { color: colors.icon }]}>
            Web menu orders will appear here once customers scan QR codes
          </Text>
        </View>
      </ScrollView>
    );
  }

  const recentOrders = data.recentOrders ?? [];

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Web Menu Analytics</Text>
        <Text style={[s.subtitle, { color: colors.icon }]}>
          QR scan orders & dine-in web performance
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.icon }]}>SUMMARY</Text>
        <View style={s.kpiGrid}>
          <KPICard
            label="Total Orders"
            value={data.totalCount}
            subtext={`${data.todayCount} today · ${data.monthCount} this month`}
            icon="receipt-outline"
            iconColor="#3B82F6"
            backgroundColor={`${colors.card}`}
          />
          <KPICard
            label="Total Revenue"
            value={formatCurrency(data.totalRevenue)}
            subtext={`${formatCurrency(data.todayRevenue)} today`}
            icon="cash-outline"
            iconColor="#10b981"
            backgroundColor={`${colors.card}`}
          />
        </View>
        <View style={[s.kpiGrid, { marginTop: 12 }]}>
          <KPICard
            label="Avg Order Value"
            value={formatCurrency(data.avgOrderValue)}
            icon="trending-up-outline"
            iconColor="#f59e0b"
            backgroundColor={`${colors.card}`}
          />
          <KPICard
            label="Active Stores"
            value={data.topStores.length}
            icon="storefront-outline"
            iconColor="#8b5cf6"
            backgroundColor={`${colors.card}`}
          />
        </View>
      </View>

      {/* Top 5 Stores */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.icon }]}>TOP STORES BY WEB ORDERS</Text>
        {(data.topStores ?? []).map((store, index) => (
          <View key={store.storeId} style={[s.storeRow, { backgroundColor: colors.card }]}>
            <View style={[s.storeRank, { backgroundColor: `${colors.tint}20` }]}>
              <Text style={[s.storeRankText, { color: colors.tint }]}>#{index + 1}</Text>
            </View>
            <View style={s.storeInfo}>
              <Text style={[s.storeName, { color: colors.text }]} numberOfLines={1}>
                {store.storeName}
              </Text>
              <Text style={[s.storeStats, { color: colors.icon }]}>
                {store.count} orders · {formatCurrency(store.revenue)}
              </Text>
            </View>
            <View style={s.storeOrderCount}>
              <Text style={[s.storeOrderCountText, { color: colors.tint }]}>
                {store.count}
              </Text>
              <Text style={[s.storeOrderLabel, { color: colors.icon }]}>orders</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Web Menu Orders */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.icon }]}>
          RECENT WEB MENU ORDERS (LAST {recentOrders.length})
        </Text>
        {recentOrders.map((order) => (
          <View key={order._id} style={[s.orderRow, { backgroundColor: colors.card }]}>
            <View style={s.orderLeft}>
              <Text style={[s.orderNumber, { color: colors.text }]}>#{order.orderNumber}</Text>
              <Text style={[s.orderMeta, { color: colors.icon }]} numberOfLines={1}>
                {order.customerName || order.customerPhone || 'Walk-in'} · {order.storeName}
                {order.tableNumber ? ` · T${order.tableNumber}` : ''}
              </Text>
              <Text style={[s.orderDate, { color: colors.icon }]}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
            <View style={s.orderRight}>
              <Text style={[s.orderAmount, { color: colors.text }]}>
                {formatCurrency(order.total ?? 0)}
              </Text>
              <View style={[s.orderStatusBadge, { backgroundColor: `${colors.tint}15` }]}>
                <Text style={[s.orderStatusText, { color: colors.tint }]}>{order.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={[s.footerText, { color: colors.icon }]}>
          Showing {data.totalCount} total web menu orders · Last 20 shown below
        </Text>
      </View>
    </ScrollView>
  );
}

