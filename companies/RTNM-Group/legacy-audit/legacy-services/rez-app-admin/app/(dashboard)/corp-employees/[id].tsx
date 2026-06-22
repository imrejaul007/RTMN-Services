/**
 * CorpPerks Employee Detail Page
 * Route: /corp-employees/[id]
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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatusBadge, BenefitBadge, Loading } from '@/components/corp-perks';
import { corpPerksApi, type Employee } from '@/services/api/corpPerks';
import { logger } from '@/utils/logger';

export default function EmployeeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployee = useCallback(async () => {
    if (!id) return;
    try {
      const data = await corpPerksApi.getEmployee(id);
      setEmployee(data);
    } catch (error) {
      logger.error('Failed to fetch employee:', error);
      setEmployee(MOCK_EMPLOYEE);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const handleToggleStatus = async () => {
    if (!employee) return;
    const newStatus = employee.enrollmentStatus === 'enrolled' ? 'suspended' : 'enrolled';
    Alert.alert(
      newStatus === 'suspended' ? 'Suspend Employee' : 'Reactivate Employee',
      `Are you sure you want to ${newStatus} this employee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setEmployee({ ...employee, enrollmentStatus: newStatus });
            Alert.alert('Success', `Employee ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <StatusBadge status="active" />;
      case 'pending':
        return <StatusBadge status="pending" />;
      case 'suspended':
        return <StatusBadge status="inactive" />;
      case 'terminated':
        return <StatusBadge status="rejected" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      corp_admin: '#8b5cf6',
      corp_hr: '#3b82f6',
      corp_finance: '#22c55e',
      corp_manager: '#f59e0b',
      corp_employee: '#6b7280',
    };
    const color = roleColors[role] || '#6b7280';

    return (
      <View style={[styles.roleBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.roleBadgeText, { color }]}>
          {role.replace('corp_', '').toUpperCase()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return <Loading message="Loading employee..." />;
  }

  if (!employee) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Employee not found</Text>
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
          title: employee.userId?.name || 'Employee',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {employee.userId?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.employeeName, { color: colors.text }]}>
                  {employee.userId?.name || 'Unknown'}
                </Text>
                {getStatusBadge(employee.enrollmentStatus)}
              </View>
              <Text style={[styles.employeeId, { color: colors.textSecondary }]}>
                {employee.employeeId}
              </Text>
              <View style={styles.badgeRow}>
                {getRoleBadge(employee.corpRole)}
                <Text style={[styles.department, { color: colors.textSecondary }]}>
                  {employee.department} • {employee.level}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Info */}
          <View style={[styles.contactSection, { borderTopColor: colors.border }]}>
            {employee.userId?.email && (
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {employee.userId.email}
                </Text>
              </View>
            )}
            {employee.userId?.phoneNumber && (
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {employee.userId.phoneNumber}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.background }]}
              onPress={() => router.push(`/corp-employees/${id}/benefits`)}
            >
              <Ionicons name="wallet-outline" size={18} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Manage Benefits</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    employee.enrollmentStatus === 'enrolled' ? '#ef444420' : '#22c55e20',
                },
              ]}
              onPress={handleToggleStatus}
            >
              <Ionicons
                name={employee.enrollmentStatus === 'enrolled' ? 'pause-circle-outline' : 'play-circle-outline'}
                size={18}
                color={employee.enrollmentStatus === 'enrolled' ? '#ef4444' : '#22c55e'}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: employee.enrollmentStatus === 'enrolled' ? '#ef4444' : '#22c55e' },
                ]}
              >
                {employee.enrollmentStatus === 'enrolled' ? 'Suspend' : 'Reactivate'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="receipt-outline" size={24} color="#3b82f6" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {employee.stats?.totalOrders || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Orders</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="card-outline" size={24} color="#f59e0b" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(employee.stats?.totalSpend || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Spend</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="pricetag-outline" size={24} color="#22c55e" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(employee.stats?.totalSavings || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Savings</Text>
          </Card>
        </View>

        {/* Active Benefits */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Active Benefits</Text>
            <TouchableOpacity
              onPress={() => router.push(`/corp-employees/${id}/benefits`)}
            >
              <Text style={[styles.viewAll, { color: colors.tint }]}>Manage</Text>
            </TouchableOpacity>
          </View>

          {employee.benefits && employee.benefits.length > 0 ? (
            employee.benefits.filter((b) => b.isActive).map((benefit, idx) => (
              <View key={idx} style={styles.benefitItem}>
                <View style={styles.benefitInfo}>
                  <BenefitBadge type={benefit.benefitType as any} />
                  <Text style={[styles.benefitType, { color: colors.textSecondary }]}>
                    {benefit.benefitType}
                  </Text>
                </View>
                <View style={styles.benefitAmounts}>
                  <Text style={[styles.benefitAllocated, { color: colors.text }]}>
                    {formatCurrency(benefit.allocatedAmount)}
                  </Text>
                  <Text style={[styles.benefitRemaining, { color: colors.textSecondary }]}>
                    {formatCurrency(benefit.remainingAmount)} left
                  </Text>
                </View>
                <View style={[styles.benefitBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.benefitFill,
                      {
                        backgroundColor: colors.tint,
                        width: `${(benefit.remainingAmount / benefit.allocatedAmount) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.noBenefits, { color: colors.textSecondary }]}>
              No active benefits. Allocate benefits to get started.
            </Text>
          )}
        </Card>

        {/* Employment Details */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Employment Details</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Employee ID</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{employee.employeeId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{employee.department}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Level</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{employee.level}</Text>
          </View>
          {employee.designation && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Designation</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{employee.designation}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Employment Type</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {employee.employmentType?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Corp Role</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {employee.corpRole?.replace('corp_', '').toUpperCase()}
            </Text>
          </View>
        </Card>

        {/* Timeline */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Timeline</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Enrolled At</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(employee.enrolledAt)}
            </Text>
          </View>
          {employee.terminatedAt && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Terminated At</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(employee.terminatedAt)}
              </Text>
            </View>
          )}
          {employee.stats?.lastOrderAt && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Order</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(employee.stats.lastOrderAt)}
              </Text>
            </View>
          )}
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MOCK_EMPLOYEE: Employee = {
  _id: '1',
  userId: {
    _id: 'u1',
    name: 'Priya Sharma',
    email: 'priya@company.com',
    phoneNumber: '+91 9876543210',
  },
  employeeId: 'EMP001',
  department: 'Engineering',
  level: 'L5',
  designation: 'Senior Engineer',
  employmentType: 'full_time',
  corpRole: 'corp_employee',
  enrollmentStatus: 'enrolled',
  enrolledAt: '2024-01-15',
  benefits: [
    {
      benefitId: 'b1',
      benefitType: 'meal',
      allocatedAmount: 2000,
      utilizedAmount: 500,
      remainingAmount: 1500,
      enrolledAt: '2024-01-15',
      lastResetDate: '2024-04-01',
      rolloverAmount: 0,
      isActive: true,
    },
    {
      benefitId: 'b2',
      benefitType: 'travel',
      allocatedAmount: 10000,
      utilizedAmount: 2000,
      remainingAmount: 8000,
      enrolledAt: '2024-01-15',
      lastResetDate: '2024-04-01',
      rolloverAmount: 0,
      isActive: true,
    },
  ],
  stats: {
    totalOrders: 12,
    totalSpend: 45000,
    totalSavings: 8500,
    lastOrderAt: '2024-04-20',
  },
  createdAt: '2024-01-15',
  updatedAt: '2024-04-20',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '700',
  },
  employeeId: {
    fontSize: 13,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  department: {
    fontSize: 13,
  },
  contactSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  benefitItem: {
    marginBottom: 16,
  },
  benefitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitType: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  benefitAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  benefitAllocated: {
    fontSize: 14,
    fontWeight: '600',
  },
  benefitRemaining: {
    fontSize: 12,
  },
  benefitBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  benefitFill: {
    height: '100%',
    borderRadius: 2,
  },
  noBenefits: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
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
