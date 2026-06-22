import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { economicsService, EconomicsOverview } from '../../services/api/economics';
import { apiClient } from '../../services/api/apiClient';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { s } from './styles/economics.styles';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatSourceName(source: string): string {
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string | number;
  bgColor: string;
  textColor?: string;
}

function StatCard({ icon, iconColor, label, value, bgColor, textColor }: StatCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        statCardStyles.card,
        { backgroundColor: Colors.light.card, borderColor: Colors.light.border },
      ]}
    >
      <View style={[statCardStyles.iconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[statCardStyles.value, { color: textColor || Colors.light.text }]}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </Text>
      <Text style={[statCardStyles.label, { color: Colors.light.icon }]}>{label}</Text>
    </View>
  );
}

const statCardStyles = StyleSheet.create({
  card: {
    width: '48%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default function EconomicsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [data, setData] = useState<EconomicsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coinBreakdown, setCoinBreakdown] = useState<{
    coins: {
      rezCoins: number;
      promoCoins: number;
      priveCoins: number;
      brandedCoins: number;
      trialCoins: number;
    };
    liabilityINR: {
      rez: number;
      promo: number;
      prive: number;
      branded: number;
      trial: number;
      total: number;
    };
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const overview = await economicsService.getOverview();
      setData(overview);

      // Load coin breakdown
      try {
        const breakdownRes = await apiClient.get<any>('admin/economics/coin-liability-breakdown');
        if (breakdownRes.success) {
          setCoinBreakdown(breakdownRes.data);
        }
      } catch (e) {
        logger.error('Failed to load coin breakdown:', e);
      }
    } catch (error) {
      logger.error('Failed to load economics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(() => loadData(true), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <View style={[s.centered, { backgroundColor: Colors.light.background }]}>
        <ActivityIndicator size="large" color={Colors.light.warning} />
        <Text style={[s.loadingText, { color: Colors.light.icon }]}>
          Loading economics data...
        </Text>
      </View>
    );
  }

  const cashbackTrend = data?.cashbackToday.yesterdayAmount
    ? Math.round(
        ((data.cashbackToday.totalAmount - data.cashbackToday.yesterdayAmount) /
          data.cashbackToday.yesterdayAmount) *
          100
      )
    : data?.cashbackToday.totalAmount
      ? 100
      : 0;

  const maxHourlyCount = data?.fraudAlerts?.hourlyAlertCounts?.length
    ? Math.max(...(data.fraudAlerts?.hourlyAlertCounts ?? []).map((h) => h.count), 1)
    : 1;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: Colors.light.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: Colors.light.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: Colors.light.text }]}>
            Economic Control Center
          </Text>
          <Text style={[s.headerSubtitle, { color: Colors.light.icon }]}>
            Auto-refreshes every 30s
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
          <Ionicons name="refresh" size={22} color={Colors.light.icon} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.warning}
          />
        }
      >
        {data && (
          <>
            {/* ── Section 1: Cashback Hero ─────────────────────── */}
            <Text style={[s.sectionTitle, { color: Colors.light.text }]}>Cashback Today</Text>

            <View
              style={[
                s.heroCard,
                { backgroundColor: Colors.light.warning, borderColor: Colors.light.warningDark },
              ]}
            >
              <View style={s.heroRow}>
                <View>
                  <Text style={s.heroLabel}>Total Cashback Issued</Text>
                  <Text style={s.heroValue}>
                    {formatNumber(data.cashbackToday.totalAmount)}
                  </Text>
                </View>
                <View style={s.heroIconWrap}>
                  <Ionicons name="cash" size={32} color={Colors.light.card} />
                </View>
              </View>
              <View style={s.heroSubRow}>
                <View style={s.heroSubItem}>
                  <Text style={s.heroSubLabel}>Transactions</Text>
                  <Text style={s.heroSubValue}>
                    {formatNumber(data.cashbackToday.transactionCount)}
                  </Text>
                </View>
                <View style={s.heroSubItem}>
                  <Text style={s.heroSubLabel}>vs Yesterday</Text>
                  <Text style={s.heroSubValue}>
                    {cashbackTrend >= 0 ? '↑' : '↓'} {Math.abs(cashbackTrend)}%
                  </Text>
                </View>
                <View style={s.heroSubItem}>
                  <Text style={s.heroSubLabel}>Yesterday</Text>
                  <Text style={s.heroSubValue}>
                    {formatNumber(data.cashbackToday.yesterdayAmount)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Section 2: Merchant Liability ────────────────── */}
            <Text style={[s.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>
              Merchant Liability
            </Text>

            <View style={s.cardGrid}>
              <StatCard
                icon="wallet"
                iconColor={Colors.light.warning}
                label="Total Pending"
                value={data.merchantLiability.totalPending}
                bgColor={`${Colors.light.warning}20`}
                textColor={Colors.light.warningDark}
              />
              <StatCard
                icon="checkmark-circle"
                iconColor={Colors.light.success}
                label="Total Settled"
                value={data.merchantLiability.totalSettled}
                bgColor={`${Colors.light.success}20`}
                textColor={Colors.light.successDark}
              />
              <StatCard
                icon="hourglass"
                iconColor={Colors.light.info}
                label="Awaiting Settlement"
                value={data.merchantLiability.pendingSettlementCount}
                bgColor={`${Colors.light.info}20`}
              />
              <StatCard
                icon="alert-circle"
                iconColor={Colors.light.error}
                label="Disputed"
                value={data.merchantLiability.disputedCount}
                bgColor={`${Colors.light.error}20`}
                textColor={Colors.light.errorDark}
              />
            </View>

            {/* ── Section 3: Fraud Spike Monitor ───────────────── */}
            <Text style={[s.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>
              Fraud Spike Monitor
            </Text>

            {data.fraudAlerts.alertCount > 0 ? (
              <View>
                <View
                  style={[
                    s.alertBanner,
                    {
                      backgroundColor: Colors.light.warningLight,
                      borderColor: Colors.light.warning,
                    },
                  ]}
                >
                  <Ionicons name="warning" size={20} color={Colors.light.warningDark} />
                  <Text style={[s.alertBannerText, { color: Colors.light.warningDeep }]}>
                    {data.fraudAlerts.alertCount} user(s) earned &gt;{' '}
                    {formatNumber(data.fraudAlerts.threshold)} coins in {data.fraudAlerts.window}
                  </Text>
                </View>

                {/* Hourly bar chart */}
                {data?.fraudAlerts?.hourlyAlertCounts?.length > 0 && (
                  <View
                    style={[
                      s.chartCard,
                      { backgroundColor: Colors.light.card, borderColor: Colors.light.border },
                    ]}
                  >
                    <Text style={[s.chartTitle, { color: Colors.light.text }]}>
                      Hourly Fraud Alerts (24h)
                    </Text>
                    {(data?.fraudAlerts?.hourlyAlertCounts ?? []).map((item) => (
                      <View key={item.hour} style={s.barRow}>
                        <Text style={[s.barLabel, { color: Colors.light.icon }]}>
                          {item.hour}h
                        </Text>
                        <View style={s.barTrack}>
                          <View
                            style={[
                              s.barFill,
                              {
                                width: `${(item.count / maxHourlyCount) * 100}%`,
                                backgroundColor:
                                  item.count > 0 ? Colors.light.error : Colors.light.gray200,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[s.barCount, { color: Colors.light.icon }]}>
                          {item.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Top flagged users */}
                {(data?.fraudAlerts?.topFlaggedUsers ?? []).map((user, idx) => (
                  <View
                    key={user.userId || idx}
                    style={[
                      s.fraudCard,
                      { backgroundColor: Colors.light.errorLight, borderColor: '#FECACA' },
                    ]}
                  >
                    <View style={s.fraudHeader}>
                      <View
                        style={[s.fraudIconWrap, { backgroundColor: Colors.light.errorLight }]}
                      >
                        <Ionicons name="alert-circle" size={20} color={Colors.light.error} />
                      </View>
                      <View style={s.fraudInfo}>
                        <Text style={[s.fraudName, { color: Colors.light.errorDeep }]}>
                          {user.userName?.trim() || 'Unknown User'}
                        </Text>
                        <Text style={[s.fraudId, { color: colors.errorDarker }]}>
                          ID: {String(user.userId).substring(0, 12)}...
                        </Text>
                      </View>
                    </View>
                    <View style={s.fraudMetrics}>
                      <View style={s.fraudMetricItem}>
                        <Text style={[s.fraudMetricLabel, { color: colors.errorDarker }]}>
                          Coins Earned
                        </Text>
                        <Text style={[s.fraudMetricValue, { color: Colors.light.errorDeep }]}>
                          {formatNumber(user.totalEarned)}
                        </Text>
                      </View>
                      <View style={s.fraudMetricItem}>
                        <Text style={[s.fraudMetricLabel, { color: colors.errorDarker }]}>
                          Transactions
                        </Text>
                        <Text style={[s.fraudMetricValue, { color: Colors.light.errorDeep }]}>
                          {user.transactionCount}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={[
                  s.noAlertsCard,
                  { backgroundColor: colors.successLighter, borderColor: '#BBF7D0' },
                ]}
              >
                <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                <Text style={[s.noAlertsText, { color: '#166534' }]}>
                  No fraud alerts in the last 24 hours
                </Text>
              </View>
            )}

            {/* ── Section 4: Coin Issuance Rate ────────────────── */}
            <Text style={[s.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>
              Coin Issuance Rate
            </Text>

            <View
              style={[
                s.issuanceCard,
                {
                  backgroundColor:
                    (data?.coinIssuance?.changePercent ?? 0) >= 0
                      ? `${Colors.light.success}15`
                      : `${Colors.light.error}15`,
                  borderColor:
                    (data?.coinIssuance?.changePercent ?? 0) >= 0
                      ? Colors.light.success
                      : Colors.light.error,
                },
              ]}
            >
              <View style={s.issuanceRow}>
                <View style={s.issuanceItem}>
                  <Text style={[s.issuanceLabel, { color: Colors.light.icon }]}>Today</Text>
                  <Text style={[s.issuanceBigValue, { color: Colors.light.text }]}>
                    {formatNumber(data?.coinIssuance?.todayTotal ?? 0)}
                  </Text>
                </View>
                <View style={s.issuanceItem}>
                  <Text style={[s.issuanceLabel, { color: Colors.light.icon }]}>Rate</Text>
                  <Text style={[s.issuanceBigValue, { color: Colors.light.text }]}>
                    {formatNumber(data?.coinIssuance?.hourlyRate ?? 0)}/hr
                  </Text>
                </View>
                <View style={s.issuanceItem}>
                  <Text style={[s.issuanceLabel, { color: Colors.light.icon }]}>
                    vs Yesterday
                  </Text>
                  <Text
                    style={[
                      s.issuanceBigValue,
                      {
                        color:
                          (data?.coinIssuance?.changePercent ?? 0) >= 0
                            ? Colors.light.success
                            : Colors.light.error,
                      },
                    ]}
                  >
                    {(data?.coinIssuance?.changePercent ?? 0) >= 0 ? '↑' : '↓'}{' '}
                    {Math.abs(data?.coinIssuance?.changePercent ?? 0)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Coin Liability Breakdown */}
            {coinBreakdown && (
              <View
                style={[
                  s.sectionCard,
                  { backgroundColor: Colors.light.card, borderColor: Colors.light.border },
                ]}
              >
                <Text style={[s.sectionTitle, { color: Colors.light.text, marginBottom: 12 }]}>
                  Coin Liability by Type
                </Text>
                {[
                  {
                    label: 'REZ Coins',
                    value: coinBreakdown?.liabilityINR?.rez ?? 0,
                    coins: coinBreakdown?.coins?.rezCoins ?? 0,
                    color: '#ffcd57',
                  },
                  {
                    label: 'Promo Coins',
                    value: coinBreakdown?.liabilityINR?.promo ?? 0,
                    coins: coinBreakdown?.coins?.promoCoins ?? 0,
                    color: '#F97316',
                  },
                  {
                    label: 'Privé Coins',
                    value: coinBreakdown?.liabilityINR?.prive ?? 0,
                    coins: coinBreakdown?.coins?.priveCoins ?? 0,
                    color: '#7C3AED',
                  },
                  {
                    label: 'Branded',
                    value: coinBreakdown?.liabilityINR?.branded ?? 0,
                    coins: coinBreakdown?.coins?.brandedCoins ?? 0,
                    color: '#0EA5E9',
                  },
                  {
                    label: 'Trial Coins',
                    value: coinBreakdown?.liabilityINR?.trial ?? 0,
                    coins: coinBreakdown?.coins?.trialCoins ?? 0,
                    color: '#10B981',
                  },
                ].map((item) => (
                  <View key={item.label} style={s.coinBreakdownRow}>
                    <View style={[s.coinTypeDot, { backgroundColor: item.color }]} />
                    <Text style={s.coinTypeLabel}>{item.label}</Text>
                    <Text style={s.coinTypeCoins}>
                      {(item.coins ?? 0).toLocaleString()} coins
                    </Text>
                    <Text style={s.coinTypeLiability}>
                      ₹{(item.value ?? 0).toLocaleString()}
                    </Text>
                  </View>
                ))}
                <View style={s.coinBreakdownTotal}>
                  <Text style={s.coinTotalLabel}>Total Liability</Text>
                  <Text style={s.coinTotalValue}>
                    ₹{(coinBreakdown?.liabilityINR?.total ?? 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {/* Top Sources */}
            {(data?.coinIssuance?.topSources?.length ?? 0) > 0 && (
              <View
                style={[
                  s.sourcesCard,
                  { backgroundColor: Colors.light.card, borderColor: Colors.light.border },
                ]}
              >
                <Text style={[s.sourcesTitle, { color: Colors.light.text }]}>
                  Top Sources Today
                </Text>
                {(data?.coinIssuance?.topSources ?? []).map((src, idx) => (
                  <View
                    key={src.source}
                    style={[
                      s.sourceRow,
                      idx < (data?.coinIssuance?.topSources?.length ?? 0) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: Colors.light.border,
                      },
                    ]}
                  >
                    <View style={s.sourceInfo}>
                      <Text style={[s.sourceRank, { color: Colors.light.icon }]}>
                        #{idx + 1}
                      </Text>
                      <Text style={[s.sourceName, { color: Colors.light.text }]}>
                        {formatSourceName(src.source)}
                      </Text>
                    </View>
                    <View style={s.sourceStats}>
                      <Text style={[s.sourceAmount, { color: Colors.light.text }]}>
                        {formatNumber(src.amount)}
                      </Text>
                      <View style={s.sourceBadge}>
                        <Text style={s.sourceBadgeText}>{src.count} txns</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── Section 5: Reward Reversal Queue ─────────────── */}
            <Text style={[s.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>
              Reward Reversal Queue
            </Text>

            <View style={s.cardGrid}>
              <StatCard
                icon="time"
                iconColor={Colors.light.warning}
                label="Pending Reversals"
                value={data.rewardReversals.pendingReversals}
                bgColor={`${Colors.light.warning}20`}
                textColor={
                  data.rewardReversals.pendingReversals > 0 ? Colors.light.warningDark : undefined
                }
              />
              <StatCard
                icon="checkmark-done"
                iconColor={Colors.light.success}
                label="Completed Today"
                value={data.rewardReversals.completedReversalsToday}
                bgColor={`${Colors.light.success}20`}
              />
            </View>

            {data.rewardReversals.completedReversalAmount > 0 && (
              <View
                style={[
                  s.infoRow,
                  { backgroundColor: Colors.light.card, borderColor: Colors.light.border },
                ]}
              >
                <Text style={[s.infoLabel, { color: Colors.light.icon }]}>
                  Reversed Amount Today
                </Text>
                <Text style={[s.infoValue, { color: Colors.light.text }]}>
                  {formatNumber(data.rewardReversals.completedReversalAmount)} RC
                </Text>
              </View>
            )}

            {data.rewardReversals.oldestPendingAge !== null &&
              data.rewardReversals.oldestPendingAge > 0 && (
                <View
                  style={[
                    s.warningRow,
                    {
                      backgroundColor:
                        data.rewardReversals.oldestPendingAge > 24
                          ? Colors.light.errorLight
                          : '#FFFBEB',
                      borderColor:
                        data.rewardReversals.oldestPendingAge > 24 ? '#FECACA' : '#FDE68A',
                    },
                  ]}
                >
                  <Ionicons
                    name="warning"
                    size={16}
                    color={
                      data.rewardReversals.oldestPendingAge > 24
                        ? Colors.light.error
                        : Colors.light.warning
                    }
                  />
                  <Text
                    style={[
                      s.warningText,
                      {
                        color:
                          data.rewardReversals.oldestPendingAge > 24
                            ? Colors.light.errorDeep
                            : Colors.light.warningDeep,
                      },
                    ]}
                  >
                    Oldest pending reversal: {data.rewardReversals.oldestPendingAge}h ago
                  </Text>
                </View>
              )}

            {/* ── Section 6: Settlement Due ────────────────────── */}
            <Text style={[s.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>
              Settlement Due Merchants
            </Text>

            <View style={s.cardGrid}>
              <StatCard
                icon="people"
                iconColor={Colors.light.info}
                label="Merchants Due"
                value={data.settlementDue.totalDueMerchants}
                bgColor={`${Colors.light.info}20`}
              />
              <StatCard
                icon="cash"
                iconColor={Colors.light.warning}
                label="Total Pending"
                value={data.settlementDue.totalPendingAmount}
                bgColor={`${Colors.light.warning}20`}
                textColor={Colors.light.warningDark}
              />
            </View>

            {/* Top merchants table */}
            {(data?.settlementDue?.topMerchants?.length ?? 0) > 0 && (
              <View
                style={[
                  s.tableCard,
                  { backgroundColor: Colors.light.card, borderColor: Colors.light.border },
                ]}
              >
                <Text style={[s.tableTitle, { color: Colors.light.text }]}>
                  Top Pending Settlements
                </Text>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderText, { color: Colors.light.icon, flex: 2 }]}>
                    Store
                  </Text>
                  <Text
                    style={[
                      s.tableHeaderText,
                      { color: Colors.light.icon, flex: 1, textAlign: 'right' },
                    ]}
                  >
                    Amount
                  </Text>
                  <Text
                    style={[
                      s.tableHeaderText,
                      { color: Colors.light.icon, flex: 1, textAlign: 'right' },
                    ]}
                  >
                    Cycle
                  </Text>
                </View>
                {(data?.settlementDue?.topMerchants ?? []).map((m, idx) => (
                  <View
                    key={m.merchantId || idx}
                    style={[
                      s.tableRow,
                      idx < (data?.settlementDue?.topMerchants?.length ?? 0) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: Colors.light.border,
                      },
                    ]}
                  >
                    <Text
                      style={[s.tableCell, { color: Colors.light.text, flex: 2 }]}
                      numberOfLines={1}
                    >
                      {m.storeName}
                    </Text>
                    <Text
                      style={[
                        s.tableCell,
                        {
                          color: Colors.light.warningDark,
                          flex: 1,
                          textAlign: 'right',
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {formatNumber(m.pendingAmount)}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <View style={s.cycleBadge}>
                        <Text style={s.cycleBadgeText}>{m.settlementCycle}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Last updated */}
            <View style={s.lastUpdated}>
              <Text style={[s.lastUpdatedText, { color: Colors.light.icon }]}>
                Last updated:{' '}
                {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : '—'}
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

