/**
 * CorpPerks Employee Self-Service Portal
 * Route: /corp-portal
 *
 * Employee-facing portal for managing their corporate benefits
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, BenefitBadge, formatCurrency } from '@/components/corp-perks';
import { corpPerksApi, type BenefitEnrollment } from '@/services/api/corpPerks';

interface BenefitSummary {
  type: string;
  allocated: number;
  utilized: number;
  remaining: number;
}

const MOCK_PROFILE = {
  employeeId: 'EMP001',
  name: 'Priya Sharma',
  email: 'priya@company.com',
  department: 'Engineering',
  level: 'L5',
  enrollmentStatus: 'enrolled',
  benefits: [
    { type: 'meal', allocated: 2000, utilized: 500, remaining: 1500 },
    { type: 'travel', allocated: 10000, utilized: 2000, remaining: 8000 },
    { type: 'wellness', allocated: 3000, utilized: 0, remaining: 3000 },
  ],
  stats: {
    totalOrders: 12,
    totalSpend: 45000,
    totalSavings: 8500,
  },
};

export default function CorpPortalPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(true);
  const [profile] = useState(MOCK_PROFILE);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalAllocated = profile.benefits.reduce((sum, b) => sum + b.allocated, 0);
  const totalRemaining = profile.benefits.reduce((sum, b) => sum + b.remaining, 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meal': return 'restaurant-outline';
      case 'travel': return 'airplane-outline';
      case 'wellness': return 'fitness-outline';
      case 'gift': return 'gift-outline';
      case 'flex': return 'options-outline';
      case 'learning': return 'school-outline';
      default: return 'card-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'meal': return '#f59e0b';
      case 'travel': return '#3b82f6';
      case 'wellness': return '#22c55e';
      case 'gift': return '#ec4899';
      case 'flex': return '#8b5cf6';
      case 'learning': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Benefits</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {profile.department} • Level {profile.level}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: '#22c55e20' }]}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wallet Summary */}
        <Card style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.walletInfo}>
              <Text style={[styles.employeeName, { color: colors.text }]}>
                {profile.name}
              </Text>
              <Text style={[styles.employeeId, { color: colors.textSecondary }]}>
                {profile.employeeId}
              </Text>
            </View>
          </View>

          <View style={styles.balanceSection}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
              Total Balance Available
            </Text>
            <Text style={[styles.balanceAmount, { color: colors.tint }]}>
              {formatCurrency(totalRemaining)}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(totalAllocated)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Allocated
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(profile.stats.totalSpend)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Spent
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {profile.stats.totalOrders}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Transactions
              </Text>
            </View>
          </View>
        </Card>

        {/* Benefit Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Benefits</Text>

          {profile.benefits.map((benefit, idx) => (
            <Card key={idx}>
              <View style={styles.benefitHeader}>
                <View style={[styles.benefitIcon, { backgroundColor: getTypeColor(benefit.type) + '20' }]}>
                  <Ionicons
                    name={getTypeIcon(benefit.type) as any}
                    size={24}
                    color={getTypeColor(benefit.type)}
                  />
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={[styles.benefitName, { color: colors.text }]}>
                    {benefit.type.charAt(0).toUpperCase() + benefit.type.slice(1)} Allowance
                  </Text>
                  <Text style={[styles.benefitBalance, { color: getTypeColor(benefit.type) }]}>
                    {formatCurrency(benefit.remaining)} available
                  </Text>
                </View>
              </View>

              <View style={styles.benefitProgress}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: getTypeColor(benefit.type),
                        width: `${(benefit.utilized / benefit.allocated) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {formatCurrency(benefit.utilized)} used
                  </Text>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {formatCurrency(benefit.allocated)} total
                  </Text>
                </View>
              </View>

              <View style={styles.benefitActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: getTypeColor(benefit.type) + '15' }]}
                  onPress={() => Alert.alert(benefit.type, 'Booking would open here')}
                >
                  <Ionicons name="add-circle-outline" size={18} color={getTypeColor(benefit.type)} />
                  <Text style={[styles.actionButtonText, { color: getTypeColor(benefit.type) }]}>
                    Book
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.background }]}
                  onPress={() => Alert.alert('History', 'Transaction history would open here')}
                >
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>
                    History
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={() => Alert.alert('Hotel Booking', 'Hotel search would open')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#3b82f620' }]}>
                <Ionicons name="bed-outline" size={24} color="#3b82f6" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Book Hotel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={() => Alert.alert('Restaurant', 'Restaurant search would open')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="restaurant-outline" size={24} color="#f59e0b" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Book Dining</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={() => Alert.alert('Gift', 'Gift catalog would open')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#ec489920' }]}>
                <Ionicons name="gift-outline" size={24} color="#ec4899" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Claim Gift</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={() => Alert.alert('Invoices', 'My invoices would open')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="document-text-outline" size={24} color="#22c55e" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>My Invoices</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Help Section */}
        <Card>
          <View style={styles.helpRow}>
            <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
            <View style={styles.helpInfo}>
              <Text style={[styles.helpTitle, { color: colors.text }]}>Need Help?</Text>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Contact your HR admin or visit the help center
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </Card>

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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  walletCard: {
    padding: 20,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  walletInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '700',
  },
  employeeId: {
    fontSize: 13,
    marginTop: 2,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitName: {
    fontSize: 16,
    fontWeight: '600',
  },
  benefitBalance: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  benefitProgress: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 11,
  },
  benefitActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpInfo: {
    flex: 1,
    marginLeft: 14,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    marginTop: 2,
  },
});
