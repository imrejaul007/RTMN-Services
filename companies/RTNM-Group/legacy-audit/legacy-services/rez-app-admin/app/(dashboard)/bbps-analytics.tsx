import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { bbpsService } from '../../services/api/bbps';
import { s } from './styles/bbps-analytics.styles';

interface KPIData {
  gmv: number;
  gmvChange: number;
  transactions: number;
  transactionsChange: number;
  failureRate: number;
  failureRateChange: number;
  coinsIssued: number;
  coinsIssuedChange: number;
}

interface AnalyticsData {
  period: string;
  kpi: KPIData;
  dailyGMV: Array<{ day: string; value: number }>;
  byBillType: Record<string, number>;
  coinsMetrics: { issued: number; redeemed: number };
  topProviders: Array<{ name: string; transactions: number; gmv: number; avgValue: number }>;
}

// DUMMY_ANALYTICS removed — real data loaded from bbpsService.getAnalytics()

export default function BBPSAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bbpsService.getAnalytics(period);
      setAnalytics(data);
    } catch (err: any) {
      logger.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics data');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAnalytics();
  }, [period, loadAnalytics]);

  const KPICard = ({ label, value, change }: { label: string; value: string; change: number }) => {
    const isPositive = change >= 0;
    return (
      <View style={[s.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.kpiLabel, { color: colors.icon }]}>{label}</Text>
        <Text style={[s.kpiValue, { color: colors.text }]}>{value}</Text>
        <View style={s.kpiChange}>
          <Ionicons
            name={isPositive ? 'arrow-up' : 'arrow-down'}
            size={14}
            color={isPositive ? colors.success : colors.error}
          />
          <Text
            style={[s.kpiChangeText, { color: isPositive ? colors.success : colors.error }]}
          >
            {isPositive ? '+' : ''}
            {change}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Analytics</Text>
      </View>

      {/* Time Range Selector */}
      <View style={s.periodSelector}>
        {[
          { label: 'Today', value: '1d' },
          { label: '7 Days', value: '7d' },
          { label: '30 Days', value: '30d' },
          { label: '90 Days', value: '90d' },
        ].map((p) => (
          <TouchableOpacity
            key={p.value}
            onPress={() => setPeriod(p.value)}
            style={[
              s.periodButton,
              {
                backgroundColor: period === p.value ? colors.tint : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                s.periodButtonText,
                {
                  color: period === p.value ? '#fff' : colors.text,
                  fontWeight: period === p.value ? '600' : '500',
                },
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.contentPadding}>
        {loading ? (
          <View style={s.centerContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : error ? (
          <View style={s.centerContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
            <Text style={[s.errorTitle, { color: colors.text }]}>
              Failed to Load Analytics
            </Text>
            <Text style={[s.errorMessage, { color: colors.icon }]}>{error}</Text>
            <TouchableOpacity
              style={[s.retryButton, { backgroundColor: colors.tint }]}
              onPress={loadAnalytics}
            >
              <Text style={s.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : analytics ? (
          <>
            {/* KPI Cards */}
            <View style={s.kpiRow}>
              <KPICard
                label="Total GMV"
                value={`₹${(analytics.kpi.gmv / 100000).toFixed(2)}L`}
                change={analytics.kpi.gmvChange}
              />
              <KPICard
                label="Transactions"
                value={analytics.kpi.transactions.toLocaleString()}
                change={analytics.kpi.transactionsChange}
              />
            </View>

            <View style={s.kpiRow}>
              <KPICard
                label="Failure Rate"
                value={`${analytics.kpi.failureRate}%`}
                change={analytics.kpi.failureRateChange}
              />
              <KPICard
                label="Coins Issued"
                value={(analytics.kpi.coinsIssued / 1000).toFixed(1) + 'K'}
                change={analytics.kpi.coinsIssuedChange}
              />
            </View>

            {/* GMV by Day Chart */}
            {analytics.dailyGMV.length > 0 && (
              <View
                style={[
                  s.chartContainer,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[s.chartTitle, { color: colors.text }]}>GMV by Day</Text>
                <View style={s.barChart}>
                  {(() => {
                    const maxDailyValue = Math.max(1, ...analytics.dailyGMV.map((d) => d.value));
                    return analytics.dailyGMV.map((item, idx) => (
                      <View key={idx} style={s.barWrapper}>
                        <View
                          style={[
                            s.bar,
                            {
                              backgroundColor: colors.tint,
                              height: Math.max(2, (item.value / maxDailyValue) * 120),
                            },
                          ]}
                        />
                        <Text style={[s.barLabel, { color: colors.icon }]}>{item.day}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>
            )}

            {/* Revenue by Bill Type */}
            <View
              style={[
                s.chartContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[s.chartTitle, { color: colors.text }]}>Revenue by Bill Type</Text>
              {(() => {
                const entries = Object.entries(analytics.byBillType);
                const maxVal = Math.max(1, ...entries.map(([, v]) => v));
                if (entries.length === 0) {
                  return (
                    <Text
                      style={[
                        s.typeValue,
                        { color: colors.icon, textAlign: 'center', paddingVertical: 12 },
                      ]}
                    >
                      No bill type data
                    </Text>
                  );
                }
                return entries.map(([type, volume]) => {
                  const pct = Math.round((volume / maxVal) * 100);
                  return (
                    <View key={type} style={s.typeRow}>
                      <Text style={[s.typeLabel, { color: colors.text }]}>{type}</Text>
                      <View style={[s.typeBar, { backgroundColor: colors.background }]}>
                        <View
                          style={[
                            s.typeBarFill,
                            {
                              backgroundColor: colors.tint,
                              width: `${pct}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[s.typeValue, { color: colors.icon }]}>
                        ₹{(volume / 1000).toFixed(0)}K
                      </Text>
                    </View>
                  );
                });
              })()}
            </View>

            {/* Coins Issued vs Redeemed */}
            <View
              style={[
                s.chartContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[s.chartTitle, { color: colors.text }]}>
                Coins Issued vs Redeemed
              </Text>
              <View style={s.coinsMetrics}>
                <View style={s.coinMetricItem}>
                  <View
                    style={[
                      s.coinMetricBar,
                      { backgroundColor: colors.success, width: '100%' },
                    ]}
                  />
                  <Text style={[s.coinMetricLabel, { color: colors.text }]}>
                    Issued: {analytics.coinsMetrics.issued.toLocaleString()}
                  </Text>
                </View>
                <View style={s.coinMetricItem}>
                  <View
                    style={[
                      s.coinMetricBar,
                      {
                        backgroundColor: colors.info,
                        width: `${analytics.coinsMetrics.issued > 0 ? (analytics.coinsMetrics.redeemed / analytics.coinsMetrics.issued) * 100 : 0}%`,
                      },
                    ]}
                  />
                  <Text style={[s.coinMetricLabel, { color: colors.text }]}>
                    Redeemed: {analytics.coinsMetrics.redeemed.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Top Providers Table */}
            <View
              style={[
                s.tableContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[s.chartTitle, { color: colors.text }]}>Top 10 Providers</Text>
              <View style={[s.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[s.tableHeaderCell, { color: colors.icon }]}>Provider</Text>
                <Text style={[s.tableHeaderCell, { color: colors.icon }]}>Txns</Text>
                <Text style={[s.tableHeaderCell, { color: colors.icon }]}>GMV</Text>
                <Text style={[s.tableHeaderCell, { color: colors.icon }]}>Avg</Text>
              </View>
              {analytics.topProviders.length === 0 && (
                <Text
                  style={[
                    { color: colors.icon, textAlign: 'center', paddingVertical: 12, fontSize: 13 },
                  ]}
                >
                  No provider data available
                </Text>
              )}
              {analytics.topProviders.map((provider, idx) => (
                <View key={idx} style={[s.tableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[s.tableCell, { color: colors.text, flex: 1 }]}>
                    {provider.name}
                  </Text>
                  <Text style={[s.tableCell, { color: colors.text }]}>
                    {provider.transactions}
                  </Text>
                  <Text style={[s.tableCell, { color: colors.text }]}>
                    ₹{(provider.gmv / 1000).toFixed(0)}K
                  </Text>
                  <Text style={[s.tableCell, { color: colors.tint }]}>
                    ₹{provider.avgValue}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

