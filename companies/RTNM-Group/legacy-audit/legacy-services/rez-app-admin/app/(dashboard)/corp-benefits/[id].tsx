/**
 * CorpPerks Benefit Detail Page
 * Route: /corp-benefits/[id]
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatusBadge, BenefitBadge, Loading, SectionHeader } from '@/components/corp-perks';
import { corpPerksApi, type Benefit } from '@/services/api/corpPerks';
import { logger } from '@/utils/logger';

export default function BenefitDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [benefit, setBenefit] = useState<Benefit | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const fetchBenefit = useCallback(async () => {
    if (!id) return;
    try {
      const data = await corpPerksApi.getBenefit(id);
      setBenefit(data);
      if (data) {
        setEditName(data.name);
        setEditAmount(String(data.amount));
      }
    } catch (error) {
      logger.error('Failed to fetch benefit:', error);
      // Use mock data
      setBenefit(MOCK_BENEFIT);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBenefit();
  }, [fetchBenefit]);

  const handleSave = async () => {
    if (!benefit) return;
    try {
      const updated = await corpPerksApi.updateBenefit(benefit._id, {
        name: editName,
        amount: parseFloat(editAmount),
      });
      setBenefit(updated);
      setEditing(false);
      Alert.alert('Success', 'Benefit updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update benefit');
    }
  };

  const handleToggleActive = async () => {
    if (!benefit) return;
    Alert.alert(
      benefit.isActive ? 'Deactivate Benefit' : 'Activate Benefit',
      `Are you sure you want to ${benefit.isActive ? 'deactivate' : 'activate'} this benefit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const updated = await corpPerksApi.updateBenefit(benefit._id, {
                name: benefit.name,
                benefitType: benefit.benefitType,
                amount: benefit.amount,
                periodType: benefit.periodType,
                startDate: benefit.startDate,
                isActive: !benefit.isActive,
              } as any);
              setBenefit(updated);
              Alert.alert('Success', `Benefit ${updated.isActive ? 'activated' : 'deactivated'}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to update benefit');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return <Loading message="Loading benefit..." />;
  }

  if (!benefit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Benefit not found</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: 'Benefit Details',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              {editing ? (
                <TextInput
                  style={[styles.editName, { color: colors.text, borderColor: colors.border }]}
                  value={editName}
                  onChangeText={setEditName}
                />
              ) : (
                <Text style={[styles.benefitName, { color: colors.text }]}>{benefit.name}</Text>
              )}
              <BenefitBadge type={benefit.benefitType} />
            </View>
            <StatusBadge status={benefit.isActive ? 'active' : 'inactive'} />
          </View>

          <View style={styles.amountRow}>
            {editing ? (
              <View style={styles.editAmountRow}>
                <Text style={[styles.currencySymbol, { color: colors.text }]}>₹</Text>
                <TextInput
                  style={[styles.editAmount, { color: colors.text, borderColor: colors.border }]}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="numeric"
                />
              </View>
            ) : (
              <Text style={[styles.amount, { color: colors.tint }]}>
                {formatCurrency(benefit.amount)}
              </Text>
            )}
            <Text style={[styles.period, { color: colors.textSecondary }]}>
              / {benefit.periodType}
            </Text>
          </View>

          {benefit.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {benefit.description}
            </Text>
          )}

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            {editing ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.background }]}
                  onPress={() => setEditing(false)}
                >
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.tint }]}
                  onPress={handleSave}
                >
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>Save</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.background }]}
                  onPress={() => setEditing(true)}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: benefit.isActive ? '#ef444420' : '#22c55e20' }]}
                  onPress={handleToggleActive}
                >
                  <Ionicons
                    name={benefit.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={16}
                    color={benefit.isActive ? '#ef4444' : '#22c55e'}
                  />
                  <Text style={[styles.actionButtonText, { color: benefit.isActive ? '#ef4444' : '#22c55e' }]}>
                    {benefit.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="people-outline" size={24} color="#3b82f6" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {benefit.enrolledEmployees}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Enrolled</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="wallet-outline" size={24} color="#f59e0b" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(benefit.totalAllocated)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Allocated</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="trending-down-outline" size={24} color="#22c55e" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(benefit.totalUtilized)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Utilized</Text>
          </Card>
        </View>

        {/* Utilization */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Utilization Rate</Text>
          <View style={[styles.utilBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.utilFill,
                {
                  backgroundColor: colors.tint,
                  width: `${benefit.totalAllocated > 0 ? (benefit.totalUtilized / benefit.totalAllocated) * 100 : 0}%`,
                },
              ]}
            />
          </View>
          <View style={styles.utilLabels}>
            <Text style={[styles.utilPercent, { color: colors.text }]}>
              {benefit.totalAllocated > 0
                ? Math.round((benefit.totalUtilized / benefit.totalAllocated) * 100)
                : 0}%
            </Text>
            <Text style={[styles.utilText, { color: colors.textSecondary }]}>
              {formatCurrency(benefit.totalAllocated - benefit.totalUtilized)} remaining
            </Text>
          </View>
        </Card>

        {/* Rules */}
        {benefit.rules && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Rules</Text>
            <View style={styles.ruleRow}>
              <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Requires Approval</Text>
              <Text style={[styles.ruleValue, { color: colors.text }]}>
                {benefit.rules.requiresApproval ? 'Yes' : 'No'}
              </Text>
            </View>
            {benefit.rules.autoApprovalLimit && (
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Auto-Approve Limit</Text>
                <Text style={[styles.ruleValue, { color: colors.text }]}>
                  {formatCurrency(benefit.rules.autoApprovalLimit)}
                </Text>
              </View>
            )}
            <View style={styles.ruleRow}>
              <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Rollover Enabled</Text>
              <Text style={[styles.ruleValue, { color: colors.text }]}>
                {benefit.rules.rolloverEnabled ? 'Yes' : 'No'}
              </Text>
            </View>
          </Card>
        )}

        {/* Dates */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Timeline</Text>
          <View style={styles.ruleRow}>
            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Start Date</Text>
            <Text style={[styles.ruleValue, { color: colors.text }]}>
              {formatDate(benefit.startDate)}
            </Text>
          </View>
          {benefit.endDate && (
            <View style={styles.ruleRow}>
              <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>End Date</Text>
              <Text style={[styles.ruleValue, { color: colors.text }]}>
                {formatDate(benefit.endDate)}
              </Text>
            </View>
          )}
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MOCK_BENEFIT: Benefit = {
  _id: '1',
  name: 'Monthly Meal Allowance',
  description: 'Monthly meal allowance for all full-time employees',
  benefitType: 'meal',
  amount: 2000,
  periodType: 'monthly',
  rules: {
    requiresApproval: false,
    autoApprovalLimit: 2000,
    rolloverEnabled: false,
  },
  enrolledEmployees: 45,
  totalAllocated: 90000,
  totalUtilized: 67500,
  isActive: true,
  startDate: '2024-01-01',
  createdAt: '2024-01-01',
  updatedAt: '2024-04-01',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  benefitName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  editName: {
    fontSize: 20,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
  },
  editAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 4,
  },
  editAmount: {
    fontSize: 24,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 100,
  },
  period: {
    fontSize: 16,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  utilBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  utilFill: {
    height: '100%',
    borderRadius: 4,
  },
  utilLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  utilPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  utilText: {
    fontSize: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  ruleLabel: {
    fontSize: 14,
  },
  ruleValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
