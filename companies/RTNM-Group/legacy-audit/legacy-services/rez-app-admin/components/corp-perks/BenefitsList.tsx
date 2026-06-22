/**
 * CorpPerks Benefits Page
 *
 * Manage corporate benefit packages (meal, travel, gift, wellness, flex, learning)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { Card, StatsCard, StatusBadge, BenefitBadge, Loading, EmptyState, TabSelector, formatCurrency } from './index';
import { corpPerksApi, type Benefit } from '../../services/api/corpPerks';
import { logger } from '../../utils/logger';

export default function CorpBenefitsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const fetchBenefits = useCallback(async () => {
    try {
      const result = await corpPerksApi.getBenefits({ isActive: true });
      setBenefits(result.data);
    } catch (error) {
      logger.error('Failed to fetch benefits:', error);
      setBenefits(MOCK_BENEFITS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBenefits();
  }, [fetchBenefits]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBenefits();
  }, [fetchBenefits]);

  const filteredBenefits = benefits.filter((benefit) => {
    const matchesSearch = benefit.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || benefit.benefitType === filterType;
    return matchesSearch && matchesType;
  });

  const totalAllocated = benefits.reduce((sum, b) => sum + b.totalAllocated, 0);
  const totalUtilized = benefits.reduce((sum, b) => sum + b.totalUtilized, 0);
  const activeCount = benefits.filter((b) => b.isActive).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'meal', label: 'Meal' },
    { key: 'travel', label: 'Travel' },
    { key: 'gift', label: 'Gift' },
    { key: 'wellness', label: 'Wellness' },
  ];

  if (loading) {
    return <Loading message="Loading benefits..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Benefits</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(dashboard)/corp-benefits/create')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search benefits..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Total Allocated"
          value={formatCurrency(totalAllocated)}
          icon="wallet-outline"
          iconColor="#3b82f6"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Utilized"
          value={formatCurrency(totalUtilized)}
          icon="trending-down-outline"
          iconColor="#f59e0b"
        />
      </View>

      <View style={styles.statsRow}>
        <StatsCard
          title="Active Benefits"
          value={activeCount}
          icon="checkmark-circle-outline"
          iconColor="#22c55e"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Employees"
          value={benefits.reduce((sum, b) => sum + b.enrolledEmployees, 0)}
          icon="people-outline"
          iconColor="#8b5cf6"
        />
      </View>

      {/* Filter Tabs */}
      <TabSelector tabs={tabs} selected={filterType} onSelect={setFilterType} />

      {/* Benefits List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBenefits.length === 0 ? (
          <EmptyState
            icon="gift-outline"
            title="No Benefits Found"
            message="Create your first benefit package to get started"
            actionLabel="Create Benefit"
            onAction={() => router.push('/(dashboard)/corp-benefits/create')}
          />
        ) : (
          filteredBenefits.map((benefit) => (
            <TouchableOpacity
              key={benefit._id}
              onPress={() => router.push(`/corp-benefits/${benefit._id}`)}
            >
              <Card>
                <View style={styles.benefitHeader}>
                  <View style={styles.benefitInfo}>
                    <View style={styles.benefitTitleRow}>
                      <Text style={[styles.benefitName, { color: colors.text }]}>
                        {benefit.name}
                      </Text>
                      <BenefitBadge type={benefit.benefitType} />
                    </View>
                    <Text style={[styles.benefitAmount, { color: colors.tint }]}>
                      {formatCurrency(benefit.amount)} / {benefit.periodType}
                    </Text>
                  </View>
                  <StatusBadge status={benefit.isActive ? 'active' : 'inactive'} />
                </View>

                <View style={styles.benefitStats}>
                  <View style={styles.benefitStat}>
                    <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.benefitStatText, { color: colors.textSecondary }]}>
                      {benefit.enrolledEmployees} enrolled
                    </Text>
                  </View>
                  <View style={styles.benefitStat}>
                    <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.benefitStatText, { color: colors.textSecondary }]}>
                      {formatCurrency(benefit.totalAllocated)} allocated
                    </Text>
                  </View>
                </View>

                {/* Utilization Bar */}
                <View style={styles.utilizationContainer}>
                  <View style={styles.utilizationHeader}>
                    <Text style={[styles.utilizationLabel, { color: colors.textSecondary }]}>
                      Utilization
                    </Text>
                    <Text style={[styles.utilizationPercent, { color: colors.text }]}>
                      {benefit.totalAllocated > 0
                        ? Math.round((benefit.totalUtilized / benefit.totalAllocated) * 100)
                        : 0}%
                    </Text>
                  </View>
                  <View style={[styles.utilizationBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.utilizationFill,
                        {
                          backgroundColor: colors.tint,
                          width: `${
                            benefit.totalAllocated > 0
                              ? (benefit.totalUtilized / benefit.totalAllocated) * 100
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Mock data for demo
const MOCK_BENEFITS: Benefit[] = [
  {
    _id: '1',
    name: 'Monthly Meal Allowance',
    benefitType: 'meal',
    amount: 2000,
    periodType: 'monthly',
    enrolledEmployees: 45,
    totalAllocated: 90000,
    totalUtilized: 67500,
    isActive: true,
    startDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '2',
    name: 'Business Travel Budget',
    benefitType: 'travel',
    amount: 10000,
    periodType: 'monthly',
    enrolledEmployees: 20,
    totalAllocated: 200000,
    totalUtilized: 85000,
    isActive: true,
    startDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '3',
    name: 'Festival Gift Fund',
    benefitType: 'gift',
    amount: 5000,
    periodType: 'yearly',
    enrolledEmployees: 50,
    totalAllocated: 250000,
    totalUtilized: 250000,
    isActive: true,
    startDate: '2024-01-01',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  benefitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  benefitName: {
    fontSize: 16,
    fontWeight: '600',
  },
  benefitAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  benefitStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  benefitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  benefitStatText: {
    fontSize: 12,
  },
  utilizationContainer: {
    marginTop: 4,
  },
  utilizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  utilizationLabel: {
    fontSize: 11,
  },
  utilizationPercent: {
    fontSize: 11,
    fontWeight: '600',
  },
  utilizationBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 2,
  },
});
