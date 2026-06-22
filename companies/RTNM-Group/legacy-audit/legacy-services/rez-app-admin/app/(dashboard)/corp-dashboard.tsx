/**
 * CorpPerks Dashboard
 * Route: /corp-dashboard
 * Main dashboard showing overview of CorpPerks metrics
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatsCard, TabSelector } from '@/components/corp-perks';

export default function CorpDashboard() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const tabs = [
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>CorpPerks</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Corporate Benefits Dashboard
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TabSelector tabs={tabs} selected={selectedPeriod} onSelect={setSelectedPeriod} />
        </View>

        {/* Overview Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
          <View style={styles.statsRow}>
            <StatsCard
              title="Active Companies"
              value="12"
              icon="business-outline"
              iconColor="#3b82f6"
              trend={{ value: 20, isPositive: true }}
            />
            <View style={{ width: 12 }} />
            <StatsCard
              title="Enrolled Employees"
              value="486"
              icon="people-outline"
              iconColor="#22c55e"
              trend={{ value: 15, isPositive: true }}
            />
          </View>
          <View style={styles.statsRow}>
            <StatsCard
              title="Total Benefits"
              value="₹45L"
              icon="gift-outline"
              iconColor="#f59e0b"
            />
            <View style={{ width: 12 }} />
            <StatsCard
              title="GST Saved (ITC)"
              value="₹2.3L"
              icon="checkmark-circle-outline"
              iconColor="#8b5cf6"
              trend={{ value: 8, isPositive: true }}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="restaurant-outline" size={24} color="#f59e0b" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Corporate Dining</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                48 orders this month
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#3b82f620' }]}>
                <Ionicons name="bed-outline" size={24} color="#3b82f6" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Hotel Bookings</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                12 bookings this month
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#ec489920' }]}>
                <Ionicons name="gift-outline" size={24} color="#ec4899" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Gift Campaigns</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                3 active campaigns
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="document-text-outline" size={24} color="#22c55e" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>GST Invoices</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                156 invoices generated
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <Card>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="person-add-outline" size={16} color="#22c55e" />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityText, { color: colors.text }]}>
                  5 new employees enrolled
                </Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  2 hours ago
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="receipt-outline" size={16} color="#f59e0b" />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityText, { color: colors.text }]}>
                  Team lunch booked - ₹4,500
                </Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  5 hours ago
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#ec489920' }]}>
                <Ionicons name="gift-outline" size={16} color="#ec4899" />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityText, { color: colors.text }]}>
                  Diwali campaign launched
                </Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  1 day ago
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  periodSelector: {
    marginTop: 8,
  },
  statsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginLeft: 44,
  },
});
