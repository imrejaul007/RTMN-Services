import React, { useState, useEffect, useCallback } from 'react';
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
import {
  gamificationStatsService,
  EconomyStats,
  EngagementStats,
  FraudAlert,
  FraudAlertResponse,
} from '../../services/api/gamificationStats';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { router } from 'expo-router';
import { s } from './styles/gamification-economy.styles';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
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

// SECURITY: OTA coin liability data must be fetched through the backend proxy
// (admin/ota/overview) rather than calling the OTA API directly from the client,
// because the OTA admin secret must not be bundled into client code.

function CoinLiabilitySection() {
  const [data, setData] = useState<{
    ota_coin: number;
    rez_coin: number;
    hotel_brand_coin: number;
    total: number;
  } | null>(null);
  const [notAvailable, setNotAvailable] = useState(false);

  useEffect(() => {
    apiClient
      .get<{
        coin_liability_paise: {
          ota_coin: number;
          rez_coin: number;
          hotel_brand_coin: number;
          total: number;
        };
      }>('admin/ota/overview')
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as unknown as {coin_liability_paise?: {ota_coin: number; rez_coin: number; hotel_brand_coin: number; total: number}};
          setData((d.coin_liability_paise ?? d) as unknown as {ota_coin: number; rez_coin: number; hotel_brand_coin: number; total: number});
        } else {
          setNotAvailable(true);
        }
      })
      .catch(() => {
        setNotAvailable(true);
      });
  }, []);

  if (notAvailable) {
    return (
      <View
        style={{
          backgroundColor: Colors.light.card,
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: Colors.light.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Ionicons name="information-circle" size={20} color={Colors.light.icon} />
        <Text style={{ color: Colors.light.icon, fontSize: 13, flex: 1 }}>
          OTA coin liability stats available via backend API (admin/ota/overview)
        </Text>
      </View>
    );
  }

  if (!data) return null;

  const items = [
    { label: 'OTA Coins', value: data.ota_coin, color: '#0891B2', icon: 'logo-bitcoin' as const },
    { label: 'REZ Coins', value: data.rez_coin, color: '#7C3AED', icon: 'wallet' as const },
    {
      label: 'Hotel Brand Coins',
      value: data.hotel_brand_coin,
      color: '#F59E0B',
      icon: 'bed' as const,
    },
  ];
  const total = data.total || 1;

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Total liability hero */}
      <View
        style={{
          backgroundColor: '#0F172A',
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Total Coin Liability</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>
            ₹{Math.round(total / 100).toLocaleString()}
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={28} color="#F59E0B" />
      </View>

      {/* Per-type bars */}
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <View
            key={item.label}
            style={{
              backgroundColor: Colors.light.card,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: Colors.light.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: `${item.color}20`,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name={item.icon} size={14} color={item.color} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.light.text }}>
                  {item.label}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.light.text }}>
                  ₹{Math.round(item.value / 100).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 11, color: Colors.light.icon }}>{pct}% of total</Text>
              </View>
            </View>
            <View style={{ height: 6, backgroundColor: Colors.light.border, borderRadius: 3 }}>
              <View
                style={{
                  height: 6,
                  width: `${pct}%`,
                  backgroundColor: item.color,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function GamificationEconomyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [economy, setEconomy] = useState<EconomyStats | null>(null);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [fraudData, setFraudData] = useState<FraudAlertResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [economyRes, engagementRes, fraudRes] = await Promise.all([
        gamificationStatsService.getEconomy(),
        gamificationStatsService.getEngagement(),
        gamificationStatsService.getFraudAlerts(),
      ]);

      if (economyRes.success && economyRes.data) setEconomy(economyRes.data as EconomyStats);
      if (engagementRes.success && engagementRes.data)
        setEngagement(engagementRes.data as EngagementStats);
      if (fraudRes.success && fraudRes.data) setFraudData(fraudRes.data as FraudAlertResponse);
    } catch (error) {
      logger.error('Failed to load gamification stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: Colors.light.background }]}>
        <ActivityIndicator size="large" color={Colors.light.success} />
        <Text style={[s.loadingText, { color: Colors.light.icon }]}>
          Loading economy data...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: Colors.light.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: Colors.light.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: Colors.light.text }]}>
            Gamification Economy
          </Text>
          <Text style={[s.headerSubtitle, { color: Colors.light.icon }]}>
            Monitor coins, engagement & fraud
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
            tintColor={Colors.light.success}
          />
        }
      >
        {/* Coin Type Liability Breakdown */}
        <Text style={[s.sectionTitle, { color: Colors.light.text }]}>
          Coin Liability by Type
        </Text>
        <CoinLiabilitySection />

        {/* Economy Overview */}
        <Text style={[s.sectionTitle, { color: Colors.light.text, marginTop: 8 }]}>
          Economy Overview
        </Text>

        {economy && (
          <>
            {/* Hero Card - Total in Circulation */}
            <View
              style={[
                s.heroCard,
                { backgroundColor: Colors.light.success, borderColor: Colors.light.successDark },
              ]}
            >
              <View style={s.heroRow}>
                <View>
                  <Text style={s.heroLabel}>Total Coins in Circulation</Text>
                  <Text style={s.heroValue}>{formatNumber(economy.totalInCirculation)}</Text>
                </View>
                <View style={s.heroIconWrap}>
                  <Ionicons name="logo-bitcoin" size={32} color={Colors.light.card} />
                </View>
              </View>
              <View style={s.heroSubRow}>
                <View style={s.heroSubItem}>
                  <Text style={s.heroSubLabel}>All-Time Earned</Text>
                  <Text style={s.heroSubValue}>
                    {formatNumber(economy.totalEarnedAllTime)}
                  </Text>
                </View>
                <View style={s.heroSubItem}>
                  <Text style={s.heroSubLabel}>All-Time Spent</Text>
                  <Text style={s.heroSubValue}>{formatNumber(economy.totalSpentAllTime)}</Text>
                </View>
              </View>
            </View>

            {/* Earned/Spent Grid */}
            <View style={s.cardGrid}>
              <StatCard
                icon="trending-up"
                iconColor={Colors.light.success}
                label="Earned Today"
                value={economy.coinsEarnedToday}
                bgColor={`${Colors.light.success}20`}
                textColor={Colors.light.success}
              />
              <StatCard
                icon="trending-down"
                iconColor={Colors.light.error}
                label="Spent Today"
                value={economy.coinsSpentToday}
                bgColor={`${Colors.light.error}20`}
                textColor={Colors.light.error}
              />
              <StatCard
                icon="calendar"
                iconColor={Colors.light.info}
                label="Earned This Week"
                value={economy.coinsEarnedThisWeek}
                bgColor={`${Colors.light.info}20`}
              />
              <StatCard
                icon="calendar"
                iconColor={Colors.light.warning}
                label="Spent This Week"
                value={economy.coinsSpentThisWeek}
                bgColor={`${Colors.light.warning}20`}
              />
              <StatCard
                icon="stats-chart"
                iconColor={Colors.light.purple}
                label="Earned This Month"
                value={economy.coinsEarnedThisMonth}
                bgColor={`${Colors.light.purple}20`}
              />
              <StatCard
                icon="stats-chart"
                iconColor="#EC4899"
                label="Spent This Month"
                value={economy.coinsSpentThisMonth}
                bgColor="#EC489920"
              />
            </View>

            {/* Net Flow Card */}
            <View
              style={[
                s.netFlowCard,
                {
                  backgroundColor:
                    economy.netFlowToday >= 0
                      ? `${Colors.light.success}15`
                      : `${Colors.light.error}15`,
                  borderColor:
                    economy.netFlowToday >= 0 ? Colors.light.success : Colors.light.error,
                },
              ]}
            >
              <Ionicons
                name={economy.netFlowToday >= 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={24}
                color={economy.netFlowToday >= 0 ? Colors.light.success : Colors.light.error}
              />
              <View style={s.netFlowText}>
                <Text style={[s.netFlowLabel, { color: Colors.light.icon }]}>
                  Net Flow Today
                </Text>
                <Text
                  style={[
                    s.netFlowValue,
                    {
                      color: economy.netFlowToday >= 0 ? Colors.light.success : Colors.light.error,
                    },
                  ]}
                >
                  {economy.netFlowToday >= 0 ? '+' : ''}
                  {formatNumber(economy.netFlowToday)} coins
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Engagement Metrics */}
        <Text style={[s.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>
          Engagement Metrics
        </Text>

        {engagement && (
          <View style={s.cardGrid}>
            <StatCard
              icon="medal"
              iconColor={Colors.light.warning}
              label="Achievements Unlocked"
              value={engagement.totalAchievementsUnlocked}
              bgColor={`${Colors.light.warning}20`}
            />
            <StatCard
              icon="flag"
              iconColor={Colors.light.success}
              label="Challenges Completed"
              value={engagement.totalChallengesCompleted}
              bgColor={`${Colors.light.success}20`}
            />
            <StatCard
              icon="hourglass"
              iconColor={Colors.light.info}
              label="Active Challenges"
              value={engagement.activeChallenges}
              bgColor={`${Colors.light.info}20`}
            />
            <StatCard
              icon="game-controller"
              iconColor={Colors.light.purple}
              label="Game Sessions Today"
              value={engagement.gameSessionsToday}
              bgColor={`${Colors.light.purple}20`}
            />
          </View>
        )}

        {engagement && (
          <View
            style={[
              s.totalSessionsCard,
              { backgroundColor: Colors.light.card, borderColor: Colors.light.border },
            ]}
          >
            <Ionicons name="game-controller" size={20} color={Colors.light.purple} />
            <Text style={[s.totalSessionsText, { color: Colors.light.text }]}>
              Total Game Sessions: {formatNumber(engagement.totalGameSessions)}
            </Text>
          </View>
        )}

        {/* Fraud Alerts */}
        <Text style={[s.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>
          Fraud Alerts
        </Text>

        {fraudData && fraudData.alertCount > 0 ? (
          <View>
            <View
              style={[
                s.alertBanner,
                { backgroundColor: Colors.light.warningLight, borderColor: Colors.light.warning },
              ]}
            >
              <Ionicons name="warning" size={20} color={Colors.light.warningDark} />
              <Text style={[s.alertBannerText, { color: Colors.light.warningDeep }]}>
                {fraudData.alertCount} user(s) earned &gt; {formatNumber(fraudData.threshold)} coins
                in the last {fraudData.window}
              </Text>
            </View>

            {fraudData.alerts.map((alert, index) => (
              <View
                key={alert.userId || index}
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
                      {alert.userName || 'Unknown User'}
                    </Text>
                    <Text style={[s.fraudId, { color: colors.errorDarker }]}>
                      ID:{' '}
                      {typeof alert.userId === 'object'
                        ? JSON.stringify(alert.userId)
                        : String(alert.userId).substring(0, 12)}
                      ...
                    </Text>
                  </View>
                </View>
                <View style={s.fraudMetrics}>
                  <View style={s.fraudMetricItem}>
                    <Text style={[s.fraudMetricLabel, { color: colors.errorDarker }]}>
                      Coins Earned
                    </Text>
                    <Text style={[s.fraudMetricValue, { color: Colors.light.errorDeep }]}>
                      {formatNumber(alert.totalEarned)}
                    </Text>
                  </View>
                  <View style={s.fraudMetricItem}>
                    <Text style={[s.fraudMetricLabel, { color: colors.errorDarker }]}>
                      Transactions
                    </Text>
                    <Text style={[s.fraudMetricValue, { color: Colors.light.errorDeep }]}>
                      {alert.transactionCount}
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
              No fraud alerts detected in the last 24 hours
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

