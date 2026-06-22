/**
 * app/(dashboard)/business-metrics.tsx
 * Real-time business metrics and KPI dashboard
 *
 * Displays:
 * - Daily KPIs: bookings, orders, new users, coins earned/redeemed
 * - 7-day trend charts
 * - Payment health status
 * - Coin economics sustainability
 * - BBPS success metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { showAlert } from '../../utils/alert';
import { s } from './styles/business-metrics.styles';

interface MetricsResponse {
  success: boolean;
  data: {
    events: Record<string, number[]>;
    days: number;
    summary: {
      totalBookings: number;
      totalOrders: number;
      paymentSuccess: number;
      paymentFailure: number;
      coinsEarned: number;
      coinsRedeemed: number;
      trialBooked: number;
      newUsers: number;
      bbpsCompleted: number;
    };
    health: {
      paymentSuccessRate: string;
      coinsEarnedVsRedeemedRatio: string;
    };
    generatedAt: string;
  };
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

interface HealthBadgeProps {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

// Simple web-compatible line chart using View bars (no native SVG dependency)
function SimpleLineChart({
  data,
  labels,
  color,
  height = 180,
}: {
  data: number[];
  labels: string[];
  color: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const barWidth = Math.max(4, Math.floor((Dimensions.get('window').width - 80) / data.length) - 4);

  return (
    <View style={{ marginVertical: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          height,
          gap: 2,
          paddingHorizontal: 4,
        }}
      >
        {data.map((val, i) => (
          <View
            key={i}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
          >
            <Text style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>{val}</Text>
            <View
              style={{
                width: barWidth,
                height: Math.max(2, (val / max) * (height - 30)),
                backgroundColor: color,
                borderRadius: 3,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4, paddingHorizontal: 4 }}>
        {labels.map((lbl, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: '#999' }}>{lbl}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HealthBadge({ label, value, status }: HealthBadgeProps) {
  const statusColor = {
    good: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
    neutral: '#9CA3AF',
  }[status];

  const backgroundColor = {
    good: '#D1FAE5',
    warning: '#FEF3C7',
    critical: '#FEE2E2',
    neutral: '#F3F4F6',
  }[status];

  const textColor = {
    good: '#065F46',
    warning: '#92400E',
    critical: '#7F1D1D',
    neutral: '#6B7280',
  }[status];

  return (
    <View style={[s.healthBadge, { borderLeftColor: statusColor }]}>
      <Text style={s.healthLabel}>{label}</Text>
      <View style={s.healthValueContainer}>
        <View
          style={{ backgroundColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}
        >
          <Text style={[s.healthValue, { color: textColor }]}>{value}</Text>
        </View>
        <View style={[s.healthIndicator, { backgroundColor: statusColor }]} />
      </View>
    </View>
  );
}

function getPaymentStatus(rateStr: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (rateStr === 'N/A') return 'neutral';
  const rate = parseFloat(rateStr) || 0;
  if (rate >= 95) return 'good';
  if (rate >= 90) return 'warning';
  return 'critical';
}

function getCoinStatus(ratioStr: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (ratioStr === 'N/A') return 'neutral';
  const ratio = parseFloat(ratioStr) || 0;
  if (ratio <= 1.2) return 'good';
  if (ratio <= 1.5) return 'warning';
  return 'critical';
}

export default function BusinessMetricsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadMetrics = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);
      const response = await apiClient.get<MetricsResponse['data']>(
        'admin/system/metrics/events?days=7',
        { timeout: 15000 }
      );
      if (!mountedRef.current) return;
      if (response.success && response.data) {
        const payload = response.data as unknown as {summary?: unknown; data?: {summary?: unknown}; [key: string]: unknown};
        const normalizedData = payload.summary ? payload : payload.data;
        if (normalizedData?.summary) {
          setMetrics({ success: true, data: normalizedData as {events: Record<string, number[]>; days: number; summary: { totalBookings: number; totalOrders: number; paymentSuccess: number; paymentFailure: number; coinsEarned: number; coinsRedeemed: number; trialBooked: number; newUsers: number; bbpsCompleted: number; }; health: { paymentSuccessRate: string; coinsEarnedVsRedeemedRatio: string; }; generatedAt: string } });
        } else {
          setError('Unexpected response format');
        }
      } else {
        const msg = (response as unknown as {message?: string}).message || 'Failed to load metrics';
        setError(msg);
        if (!isBackground) {
          showAlert('Error', msg);
        }
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.message || 'Failed to load metrics';
      setError(msg);
      if (!isBackground) {
        showAlert('Error', msg);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMetrics();
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(() => loadMetrics(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
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

  if (!metrics || !metrics.data) {
    return (
      <View
        style={[
          s.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.icon}
          style={{ marginBottom: 12 }}
        />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          {error ? 'Failed to load metrics' : 'No metrics data available'}
        </Text>
        {error && (
          <Text
            style={{
              color: colors.icon,
              fontSize: 13,
              marginBottom: 16,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            {error}
          </Text>
        )}
        <Text
          style={{ color: colors.tint, fontSize: 14, fontWeight: '600' }}
          onPress={() => loadMetrics()}
        >
          Tap to retry
        </Text>
      </View>
    );
  }

  const { summary, health, events } = metrics.data ?? {};
  const paymentSuccessRateStr = health?.paymentSuccessRate ?? 'N/A';
  const paymentStatus = getPaymentStatus(paymentSuccessRateStr);
  const coinRatioStr = health?.coinsEarnedVsRedeemedRatio ?? 'N/A';
  const coinStatus = getCoinStatus(coinRatioStr);

  // Prepare chart labels
  const daysCount = metrics.data?.days ?? 7;
  const chartLabels = Array.from({ length: daysCount }, (_, i) => {
    const date = new Date(Date.now() - (daysCount - 1 - i) * 24 * 60 * 60 * 1000);
    return (
      (date.getMonth() + 1).toString().padStart(2, '0') +
      '/' +
      date.getDate().toString().padStart(2, '0')
    );
  });

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Business Metrics</Text>
        <Text style={[s.subtitle, { color: colors.icon }]}>
          Last updated:{' '}
          {metrics.data?.generatedAt
            ? new Date(metrics.data.generatedAt).toLocaleTimeString()
            : '—'}
        </Text>
      </View>

      {/* KPI Cards Row 1 — Bookings & Orders */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.icon }]}>TODAY PERFORMANCE</Text>
        <View style={s.kpiGrid}>
          <KPICard
            label="Total Bookings"
            value={summary?.totalBookings ?? 0}
            icon="calendar-outline"
            iconColor="#3B82F6"
            backgroundColor={`${colors.card}`}
          />
          <KPICard
            label="Total Orders"
            value={summary?.totalOrders ?? 0}
            icon="receipt-outline"
            iconColor="#F97316"
            backgroundColor={`${colors.card}`}
          />
        </View>
      </View>

      {/* KPI Cards Row 2 — Users & Coins */}
      <View style={s.section}>
        <View style={s.kpiGrid}>
          <KPICard
            label="New Users"
            value={summary?.newUsers ?? 0}
            icon="person-add-outline"
            iconColor="#10b981"
            backgroundColor={`${colors.card}`}
          />
          <KPICard
            label="Coins Earned"
            value={(summary?.coinsEarned ?? 0).toLocaleString()}
            icon="star-outline"
            iconColor="#f59e0b"
            backgroundColor={`${colors.card}`}
          />
        </View>
      </View>

      {/* KPI Cards Row 3 — Coins Redeemed & Trials */}
      <View style={s.section}>
        <View style={s.kpiGrid}>
          <KPICard
            label="Coins Redeemed"
            value={(summary?.coinsRedeemed ?? 0).toLocaleString()}
            icon="gift-outline"
            iconColor="#ec4899"
            backgroundColor={`${colors.card}`}
          />
          <KPICard
            label="Trial Bookings"
            value={summary?.trialBooked ?? 0}
            icon="flask-outline"
            iconColor="#8b5cf6"
            backgroundColor={`${colors.card}`}
          />
        </View>
      </View>

      {/* KPI Cards Row 4 — BBPS */}
      <View style={s.section}>
        <View style={s.kpiGrid}>
          <KPICard
            label="BBPS Completed"
            value={summary?.bbpsCompleted ?? 0}
            icon="card-outline"
            iconColor="#06b6d4"
            backgroundColor={`${colors.card}`}
          />
          <KPICard
            label="Payments"
            value={`${summary?.paymentSuccess ?? 0} / ${(summary?.paymentSuccess ?? 0) + (summary?.paymentFailure ?? 0)}`}
            subtext="success / total"
            icon="checkmark-circle-outline"
            iconColor="#22C55E"
            backgroundColor={`${colors.card}`}
          />
        </View>
      </View>

      {/* Payment Health Section */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.icon }]}>PAYMENT HEALTH</Text>
        <HealthBadge
          label="Payment Success Rate"
          value={paymentSuccessRateStr === 'N/A' ? 'N/A' : `${paymentSuccessRateStr}%`}
          status={paymentStatus}
        />
        <Text style={[s.healthDetail, { color: colors.icon }]}>
          {summary?.paymentSuccess ?? 0} successful · {summary?.paymentFailure ?? 0} failed
        </Text>
      </View>

      {/* Coin Economics Section */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.icon }]}>COIN ECONOMICS</Text>
        <HealthBadge
          label="Earned vs Redeemed"
          value={coinRatioStr === 'N/A' ? 'N/A' : `${coinRatioStr}x`}
          status={coinStatus}
        />
        <Text style={[s.healthDetail, { color: colors.icon }]}>
          Sustainability indicator (lower is better)
        </Text>
      </View>

      {/* 7-Day Trend - Payment Success */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.icon }]}>7-DAY TRENDS</Text>
        <Text style={[s.chartLabel, { color: colors.text }]}>Payment Success</Text>
        {events?.['payment.success'] && (
          <SimpleLineChart data={events['payment.success']} labels={chartLabels} color="#3B82F6" />
        )}
      </View>

      {/* Orders Trend */}
      <View style={s.section}>
        <Text style={[s.chartLabel, { color: colors.text }]}>Orders Placed</Text>
        {events?.['order.placed'] && (
          <SimpleLineChart data={events['order.placed']} labels={chartLabels} color="#F97316" />
        )}
      </View>

      {/* Booking Trend */}
      <View style={s.section}>
        <Text style={[s.chartLabel, { color: colors.text }]}>Bookings Created</Text>
        {events?.['booking.created'] && (
          <SimpleLineChart data={events['booking.created']} labels={chartLabels} color="#10b981" />
        )}
      </View>

      {/* New Users Trend */}
      <View style={s.section}>
        <Text style={[s.chartLabel, { color: colors.text }]}>New User Signups</Text>
        {events?.['user.signup'] && (
          <SimpleLineChart
            data={events['user.signup']}
            labels={chartLabels}
            color="#8B5CF6"
            height={140}
          />
        )}
      </View>

      {/* Coin Economy Trend */}
      <View style={s.section}>
        <Text style={[s.chartLabel, { color: colors.text }]}>Coins: Earned vs Redeemed</Text>
        {events?.['coins.earned'] && events?.['coins.redeemed'] && (
          <View>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 4, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#f59e0b' }}
                />
                <Text style={{ fontSize: 11, color: '#666' }}>Earned</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ec4899' }}
                />
                <Text style={{ fontSize: 11, color: '#666' }}>Redeemed</Text>
              </View>
            </View>
            <SimpleLineChart data={events['coins.earned']} labels={chartLabels} color="#f59e0b" />
            <SimpleLineChart
              data={events['coins.redeemed']}
              labels={chartLabels}
              color="#ec4899"
              height={120}
            />
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={[s.footerText, { color: colors.icon }]}>
          Auto-refreshes every 5 minutes
        </Text>
      </View>
    </ScrollView>
  );
}

