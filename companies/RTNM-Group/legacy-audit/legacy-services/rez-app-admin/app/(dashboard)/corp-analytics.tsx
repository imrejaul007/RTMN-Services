/**
 * CorpPerks Analytics Dashboard
 * Route: /corp-analytics
 *
 * Analytics and insights for CorpPerks performance
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatsCard, TabSelector } from '@/components/corp-perks';

const { width } = Dimensions.get('window');

// Mock analytics data
const MOCK_ANALYTICS = {
  overview: {
    totalEmployees: 245,
    activeEmployees: 198,
    totalBenefits: 1250000,
    utilizedBenefits: 875000,
    totalBookings: 156,
    totalSpend: 2450000,
    gstSaved: 185000,
  },
  monthly: [
    { month: 'Jan', benefits: 85000, bookings: 12, karma: 45000 },
    { month: 'Feb', benefits: 92000, bookings: 18, karma: 52000 },
    { month: 'Mar', benefits: 115000, bookings: 24, karma: 61000 },
    { month: 'Apr', benefits: 108000, bookings: 21, karma: 58000 },
  ],
  topBenefits: [
    { name: 'Meal Benefits', used: 185000, percentage: 65 },
    { name: 'Travel', used: 245000, percentage: 82 },
    { name: 'Wellness', used: 78000, percentage: 45 },
    { name: 'Learning', used: 156000, percentage: 78 },
    { name: 'Gifting', used: 211000, percentage: 92 },
  ],
  topEmployees: [
    { name: 'Priya Sharma', department: 'Engineering', karma: 12500, benefits: 45000 },
    { name: 'Rahul Verma', department: 'Sales', karma: 11200, benefits: 38000 },
    { name: 'Anita Patel', department: 'Marketing', karma: 9800, benefits: 32000 },
    { name: 'Vikram Singh', department: 'Operations', karma: 8500, benefits: 28000 },
  ],
  departmentBreakdown: [
    { name: 'Engineering', employees: 85, spend: 450000, karma: 125000 },
    { name: 'Sales', employees: 45, spend: 320000, karma: 98000 },
    { name: 'Marketing', employees: 35, spend: 280000, karma: 76000 },
    { name: 'Operations', employees: 40, spend: 220000, karma: 65000 },
    { name: 'HR', employees: 15, spend: 180000, karma: 45000 },
  ],
};

export default function CorpAnalyticsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month');
  const [analytics, setAnalytics] = useState(MOCK_ANALYTICS);

  const fetchAnalytics = useCallback(async () => {
    // Simulate API call
    await new Promise((r) => setTimeout(r, 500));
    setAnalytics(MOCK_ANALYTICS);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString('en-IN');
  };

  const periods = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
  ];

  const maxBenefitValue = Math.max(...analytics.monthly.map((m) => m.benefits));
  const maxBookingsValue = Math.max(...analytics.monthly.map((m) => m.bookings));
  const maxKarmaValue = Math.max(...analytics.monthly.map((m) => m.karma));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          CorpPerks performance insights
        </Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        <TabSelector
          tabs={periods}
          selected={period}
          onSelect={setPeriod}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Active Employees"
              value={analytics.overview.activeEmployees}
              icon="people-outline"
              iconColor="#3b82f6"
            />
            <StatsCard
              title="Benefits Used"
              value={formatCurrency(analytics.overview.utilizedBenefits)}
              icon="wallet-outline"
              iconColor="#22c55e"
            />
          </View>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Total Bookings"
              value={analytics.overview.totalBookings}
              icon="bed-outline"
              iconColor="#f59e0b"
            />
            <StatsCard
              title="GST Saved"
              value={formatCurrency(analytics.overview.gstSaved)}
              icon="receipt-outline"
              iconColor="#8b5cf6"
            />
          </View>
        </View>

        {/* Monthly Trends Chart */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Trends</Text>
          <Card>
            <View style={styles.chartContainer}>
              {/* Simple bar chart */}
              <View style={styles.chart}>
                {analytics.monthly.map((data, idx) => (
                  <View key={idx} style={styles.barGroup}>
                    <View style={styles.barStack}>
                      <View
                        style={[
                          styles.bar,
                          styles.barBenefits,
                          {
                            height: `${(data.benefits / maxBenefitValue) * 100}%`,
                            backgroundColor: '#3b82f6',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.bar,
                          styles.barBookings,
                          {
                            height: `${(data.bookings / maxBookingsValue) * 100}%`,
                            backgroundColor: '#f59e0b',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                      {data.month}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Benefits
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Bookings
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Benefits Utilization */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Benefits Utilization</Text>
          {analytics.topBenefits.map((benefit, idx) => (
            <Card key={idx}>
              <View style={styles.utilizationRow}>
                <View style={styles.utilizationInfo}>
                  <Text style={[styles.utilizationName, { color: colors.text }]}>
                    {benefit.name}
                  </Text>
                  <Text style={[styles.utilizationAmount, { color: colors.textSecondary }]}>
                    {formatCurrency(benefit.used)} used
                  </Text>
                </View>
                <View style={styles.utilizationBar}>
                  <View
                    style={[
                      styles.utilizationFill,
                      { width: `${benefit.percentage}%`, backgroundColor: '#22c55e' },
                    ]}
                  />
                </View>
                <Text style={[styles.utilizationPercent, { color: '#22c55e' }]}>
                  {benefit.percentage}%
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Top Performers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Karma Earners</Text>
          {analytics.topEmployees.map((employee, idx) => (
            <Card key={idx}>
              <View style={styles.employeeRow}>
                <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? '#f59e0b' : colors.tint + '20' }]}>
                  <Text style={[styles.rankText, { color: idx === 0 ? '#fff' : colors.tint }]}>
                    #{idx + 1}
                  </Text>
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={[styles.employeeName, { color: colors.text }]}>
                    {employee.name}
                  </Text>
                  <Text style={[styles.employeeDept, { color: colors.textSecondary }]}>
                    {employee.department}
                  </Text>
                </View>
                <View style={styles.employeeStats}>
                  <View style={styles.employeeStat}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={[styles.employeeStatText, { color: '#f59e0b' }]}>
                      {formatNumber(employee.karma)}
                    </Text>
                  </View>
                  <Text style={[styles.employeeBenefits, { color: colors.textSecondary }]}>
                    {formatCurrency(employee.benefits)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Department Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>By Department</Text>
          <Card>
            {analytics.departmentBreakdown.map((dept, idx) => {
              const totalSpend = analytics.departmentBreakdown.reduce((sum, d) => sum + d.spend, 0);
              const percentage = Math.round((dept.spend / totalSpend) * 100);
              return (
                <View key={idx} style={[styles.deptRow, idx < analytics.departmentBreakdown.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 12, marginBottom: 12 }]}>
                  <View style={styles.deptInfo}>
                    <Text style={[styles.deptName, { color: colors.text }]}>{dept.name}</Text>
                    <Text style={[styles.deptEmployees, { color: colors.textSecondary }]}>
                      {dept.employees} employees
                    </Text>
                  </View>
                  <View style={styles.deptStats}>
                    <Text style={[styles.deptSpend, { color: colors.tint }]}>
                      {formatCurrency(dept.spend)}
                    </Text>
                    <Text style={[styles.deptPercent, { color: colors.textSecondary }]}>
                      {percentage}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  periodContainer: { paddingHorizontal: 16, marginVertical: 8 },
  content: { flex: 1, paddingHorizontal: 16 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  chartContainer: { height: 180, marginBottom: 16 },
  chart: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 150 },
  barGroup: { alignItems: 'center', flex: 1 },
  barStack: { height: 140, width: 30, flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  bar: { width: 12, borderRadius: 4, minHeight: 4 },
  barBenefits: {},
  barBookings: {},
  barLabel: { fontSize: 11, marginTop: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  utilizationRow: { flexDirection: 'row', alignItems: 'center' },
  utilizationInfo: { width: 100 },
  utilizationName: { fontSize: 14, fontWeight: '500' },
  utilizationAmount: { fontSize: 12, marginTop: 2 },
  utilizationBar: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginHorizontal: 12 },
  utilizationFill: { height: '100%', borderRadius: 4 },
  utilizationPercent: { width: 40, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  employeeRow: { flexDirection: 'row', alignItems: 'center' },
  rankBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: '700' },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 14, fontWeight: '600' },
  employeeDept: { fontSize: 12, marginTop: 2 },
  employeeStats: { alignItems: 'flex-end' },
  employeeStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  employeeStatText: { fontSize: 14, fontWeight: '600' },
  employeeBenefits: { fontSize: 11, marginTop: 2 },
  deptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deptInfo: { flex: 1 },
  deptName: { fontSize: 14, fontWeight: '500' },
  deptEmployees: { fontSize: 12, marginTop: 2 },
  deptStats: { alignItems: 'flex-end' },
  deptSpend: { fontSize: 14, fontWeight: '600' },
  deptPercent: { fontSize: 11, marginTop: 2 },
});
