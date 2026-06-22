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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/merchant-plan-analytics.styles';

interface PlanData {
  name: string;
  count: number;
  mrrContribution: number;
}

interface TopMerchant {
  name: string;
  plan: string;
  mrr: number;
}

interface TrendData {
  month: string;
  starter: number;
  growth: number;
  pro: number;
}

interface MerchantPlanAnalyticsData {
  plans: PlanData[];
  topMerchants: TopMerchant[];
  trends: TrendData[];
}

function SectionCard({
  title,
  icon,
  iconColor,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View style={[s.cardIcon, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={[s.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function FunnelVisualization({
  data,
}: {
  data: { level: string; count: number; percentage: number; color: string }[];
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={s.funnelContainer}>
      {data.map((item, idx) => (
        <View key={idx} style={s.funnelLevel}>
          <View
            style={[
              s.funnelBox,
              {
                backgroundColor: item.color,
                width: `${item.percentage}%`,
              },
            ]}
          />
          <View style={s.funnelLabel}>
            <Text style={[s.funnelLevelText, { color: colors.text }]}>{item.level}</Text>
            <Text style={[s.funnelCount, { color: colors.icon }]}>
              {item.count} ({item.percentage.toFixed(1)}%)
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SimpleLineChart({ data, height = 180 }: { data: TrendData[]; height?: number }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (!data || data.length === 0) {
    return (
      <View style={[s.emptyChart, { height }]}>
        <Text style={[s.emptyChartText, { color: colors.icon }]}>
          Connect analytics to see trends
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.flatMap((d) => [d.starter, d.growth, d.pro]));

  return (
    <View style={[s.chartContainer, { height }]}>
      <View style={s.chartBars}>
        {data.map((item, idx) => (
          <View key={idx} style={s.chartColumn}>
            <View style={s.barsGroup}>
              <View
                style={[
                  s.chartBar,
                  {
                    height: `${(item.starter / maxValue) * 100}%`,
                    backgroundColor: colors.info,
                  },
                ]}
              />
              <View
                style={[
                  s.chartBar,
                  {
                    height: `${(item.growth / maxValue) * 100}%`,
                    backgroundColor: colors.warning,
                  },
                ]}
              />
              <View
                style={[
                  s.chartBar,
                  {
                    height: `${(item.pro / maxValue) * 100}%`,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            </View>
            <Text style={[s.chartLabel, { color: colors.icon }]}>{item.month}</Text>
          </View>
        ))}
      </View>
      <View style={s.chartLegend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.info }]} />
          <Text style={[s.legendText, { color: colors.text }]}>Starter</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[s.legendText, { color: colors.text }]}>Growth</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[s.legendText, { color: colors.text }]}>Pro</Text>
        </View>
      </View>
    </View>
  );
}

export default function MerchantPlanAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planData, setPlanData] = useState<PlanData[]>([]);
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  const totalMrr = planData.reduce((sum, p) => sum + p.mrrContribution, 0);
  const starterCount = planData.length > 0 ? planData[0].count : 0;

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get<MerchantPlanAnalyticsData>('/admin/merchants/plan-analytics');
      if (res.success && res.data) {
        setPlanData(res.data.plans ?? []);
        setTopMerchants(res.data.topMerchants ?? []);
        setTrendData(res.data.trends ?? []);
      } else {
        throw new Error(res.message || 'Failed to load plan analytics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load plan analytics');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleExportCSV = () => {
    showAlert('Export', 'CSV export triggered for plan analytics data');
  };

  if (isLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.icon} />
        <Text
          style={[s.loadingText, { color: colors.text, fontWeight: '600', marginTop: 12 }]}
        >
          Failed to load plan analytics
        </Text>
        <Text style={[s.loadingText, { color: colors.icon }]}>{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setIsLoading(true);
            fetchData();
          }}
          style={[s.actionButton, { backgroundColor: colors.tint, marginTop: 16, width: 120 }]}
        >
          <Text style={[s.actionButtonText, { color: colors.card }]}>Retry</Text>
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
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Plan Analytics</Text>
          <Text style={[s.headerSubtitle, { color: colors.icon }]}>
            Subscription deep dive
          </Text>
        </View>
      </View>

      {/* Plan Breakdown Table */}
      <SectionCard title="Plan Breakdown" icon="layers" iconColor={colors.purple}>
        <View style={s.tableContainer}>
          <View
            style={[
              s.tableRow,
              s.tableHeader,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[s.tableCell, s.planCol, { color: colors.icon, fontWeight: '600' }]}
            >
              Plan
            </Text>
            <Text
              style={[s.tableCell, s.numCol, { color: colors.icon, fontWeight: '600' }]}
            >
              Count
            </Text>
            <Text
              style={[s.tableCell, s.mrrCol, { color: colors.icon, fontWeight: '600' }]}
            >
              MRR
            </Text>
            <Text
              style={[
                s.tableCell,
                s.percentCol,
                { color: colors.icon, fontWeight: '600' },
              ]}
            >
              % Total
            </Text>
          </View>
          {planData.map((plan, idx) => (
            <View
              key={idx}
              style={[
                s.tableRow,
                idx < planData.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[s.tableCell, s.planCol, { color: colors.text }]}>
                {plan.name}
              </Text>
              <Text style={[s.tableCell, s.numCol, { color: colors.text }]}>
                {plan.count}
              </Text>
              <Text
                style={[
                  s.tableCell,
                  s.mrrCol,
                  { color: colors.success, fontWeight: '600' },
                ]}
              >
                Rs {(plan.mrrContribution / 100000).toFixed(2)}L
              </Text>
              <Text style={[s.tableCell, s.percentCol, { color: colors.text }]}>
                {totalMrr > 0 ? ((plan.mrrContribution / totalMrr) * 100).toFixed(1) : '0.0'}%
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Upgrade Funnel */}
      <SectionCard title="Upgrade Funnel" icon="trending-up" iconColor={colors.success}>
        <FunnelVisualization
          data={[
            {
              level: 'Starter',
              count: starterCount,
              percentage: 100,
              color: colors.info,
            },
            {
              level: 'Growth',
              count: planData[1]?.count ?? 0,
              percentage:
                starterCount > 0 && planData[1] ? (planData[1].count / starterCount) * 100 : 0,
              color: colors.warning,
            },
            {
              level: 'Pro',
              count: planData[2]?.count ?? 0,
              percentage:
                starterCount > 0 && planData[2] ? (planData[2].count / starterCount) * 100 : 0,
              color: colors.success,
            },
          ]}
        />
      </SectionCard>

      {/* Top Revenue Merchants */}
      <SectionCard title="Top Revenue Merchants" icon="medal" iconColor={colors.gold}>
        <View style={s.merchantList}>
          {topMerchants.map((merchant, idx) => (
            <View
              key={idx}
              style={[
                s.merchantRow,
                idx < topMerchants.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={s.merchantInfo}>
                <View style={[s.rankBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[s.rankText, { color: colors.text }]}>{idx + 1}</Text>
                </View>
                <View style={s.merchantDetails}>
                  <Text style={[s.merchantName, { color: colors.text }]} numberOfLines={1}>
                    {merchant.name}
                  </Text>
                  <Text style={[s.planName, { color: colors.icon }]}>
                    {merchant.plan} Plan
                  </Text>
                </View>
              </View>
              <Text style={[s.merchantMrr, { color: colors.success, fontWeight: '600' }]}>
                Rs {(merchant.mrr / 1000).toFixed(1)}K
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Monthly Trend */}
      <SectionCard title="Monthly Trend (Last 6 Months)" icon="analytics" iconColor={colors.info}>
        <SimpleLineChart data={trendData} />
        <View style={s.trendCta}>
          <Ionicons name="link" size={14} color={colors.icon} />
          <Text style={[s.trendCtaText, { color: colors.icon }]}>
            Connect advanced analytics for real-time data
          </Text>
        </View>
      </SectionCard>

      {/* Action Buttons */}
      <View style={s.actionsSection}>
        <TouchableOpacity
          style={[s.actionButton, { backgroundColor: colors.tint }]}
          onPress={handleExportCSV}
        >
          <Ionicons name="download" size={18} color={colors.card} />
          <Text style={[s.actionButtonText, { color: colors.card }]}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.actionButton,
            { borderWidth: 1, borderColor: colors.tint, backgroundColor: colors.card },
          ]}
          onPress={() => router.push('/(dashboard)/platform-config')}
        >
          <Ionicons name="settings" size={18} color={colors.tint} />
          <Text style={[s.actionButtonText, { color: colors.tint }]}>Edit Plan Limits</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={[s.footerText, { color: colors.icon }]}>
          Data as of {new Date().toLocaleDateString('en-IN')}
        </Text>
      </View>
    </ScrollView>
  );
}

