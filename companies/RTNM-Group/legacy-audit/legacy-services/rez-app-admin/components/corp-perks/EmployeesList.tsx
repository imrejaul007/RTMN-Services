/**
 * CorpPerks Employees Page
 *
 * Manage corporate employees and their benefit enrollments
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
import { Card, StatsCard, StatusBadge, Loading, EmptyState, TabSelector, formatCurrency } from './index';
import { corpPerksApi, type Employee } from '../../services/api/corpPerks';
import { logger } from '../../utils/logger';

export default function CorpEmployeesPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');

  const fetchEmployees = useCallback(async () => {
    try {
      const result = await corpPerksApi.getEmployees({ limit: 50 });
      setEmployees(result.data);
    } catch (error) {
      logger.error('Failed to fetch employees:', error);
      setEmployees(MOCK_EMPLOYEES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || emp.enrollmentStatus === filterStatus;
    const matchesDept = filterDept === 'all' || emp.department === filterDept;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const departments = [...new Set(employees.map((e) => e.department))];
  const enrolledCount = employees.filter((e) => e.enrollmentStatus === 'enrolled').length;
  const totalSpend = employees.reduce((sum, e) => sum + (e.stats?.totalSpend || 0), 0);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <Loading message="Loading employees..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Employees</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(dashboard)/corp-employees/enroll')}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Enroll</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, ID, or department..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: filterStatus === 'all' ? colors.tint : colors.background },
            ]}
            onPress={() => setFilterStatus('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: filterStatus === 'all' ? '#fff' : colors.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: filterStatus === 'enrolled' ? colors.tint : colors.background },
            ]}
            onPress={() => setFilterStatus('enrolled')}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: filterStatus === 'enrolled' ? '#fff' : colors.text },
              ]}
            >
              Enrolled
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: filterStatus === 'pending' ? colors.tint : colors.background },
            ]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: filterStatus === 'pending' ? '#fff' : colors.text },
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Total Employees"
          value={employees.length}
          icon="people-outline"
          iconColor="#3b82f6"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Enrolled"
          value={enrolledCount}
          icon="checkmark-circle-outline"
          iconColor="#22c55e"
        />
      </View>

      <View style={styles.statsRow}>
        <StatsCard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          icon="wallet-outline"
          iconColor="#f59e0b"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Departments"
          value={departments.length}
          icon="business-outline"
          iconColor="#8b5cf6"
        />
      </View>

      {/* Employee List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredEmployees.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Employees Found"
            message="Enroll employees to give them access to corporate benefits"
            actionLabel="Enroll Employee"
            onAction={() => router.push('/(dashboard)/corp-employees/enroll')}
          />
        ) : (
          filteredEmployees.map((employee) => (
            <TouchableOpacity
              key={employee._id}
              onPress={() => router.push(`/corp-employees/${employee._id}`)}
            >
              <Card>
                <View style={styles.employeeHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {employee.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.employeeName, { color: colors.text }]}>
                        {employee.userId?.name || 'Unknown'}
                      </Text>
                      {getStatusBadge(employee.enrollmentStatus)}
                    </View>
                    <Text style={[styles.employeeId, { color: colors.textSecondary }]}>
                      {employee.employeeId} • {employee.department}
                    </Text>
                    <View style={styles.badgeRow}>
                      {getRoleBadge(employee.corpRole)}
                      {employee.designation && (
                        <Text style={[styles.designation, { color: colors.textSecondary }]}>
                          {employee.designation}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Benefits Summary */}
                {employee.benefits && employee.benefits.length > 0 && (
                  <View style={[styles.benefitsSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.benefitsLabel, { color: colors.textSecondary }]}>
                      Active Benefits
                    </Text>
                    <View style={styles.benefitsRow}>
                      {employee.benefits
                        .filter((b) => b.isActive)
                        .slice(0, 3)
                        .map((benefit, idx) => (
                          <View
                            key={idx}
                            style={[styles.benefitChip, { backgroundColor: colors.background }]}
                          >
                            <Text style={[styles.benefitChipText, { color: colors.text }]}>
                              {benefit.benefitType}: {formatCurrency(benefit.remainingAmount)}
                            </Text>
                          </View>
                        ))}
                      {employee.benefits.filter((b) => b.isActive).length > 3 && (
                        <Text style={[styles.moreBenefits, { color: colors.textSecondary }]}>
                          +{employee.benefits.filter((b) => b.isActive).length - 3} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Stats Row */}
                <View style={styles.employeeStats}>
                  <View style={styles.employeeStat}>
                    <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.employeeStatText, { color: colors.textSecondary }]}>
                      {employee.stats?.totalOrders || 0} orders
                    </Text>
                  </View>
                  <View style={styles.employeeStat}>
                    <Ionicons name="card-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.employeeStatText, { color: colors.textSecondary }]}>
                      {formatCurrency(employee.stats?.totalSpend || 0)} spent
                    </Text>
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
const MOCK_EMPLOYEES: Employee[] = [
  {
    _id: '1',
    userId: {
      _id: 'u1',
      name: 'Priya Sharma',
      email: 'priya@company.com',
      phoneNumber: '9876543210',
    },
    employeeId: 'EMP001',
    department: 'Engineering',
    level: 'L5',
    designation: 'Senior Engineer',
    employmentType: 'full_time',
    enrollmentStatus: 'enrolled',
    corpRole: 'corp_employee',
    benefits: [
      { benefitType: 'meal', benefitId: 'b1', allocatedAmount: 2000, utilizedAmount: 500, remainingAmount: 1500, enrolledAt: '2024-01-01', lastResetDate: '2024-01-01', rolloverAmount: 0, isActive: true },
      { benefitType: 'travel', benefitId: 'b2', allocatedAmount: 10000, utilizedAmount: 2000, remainingAmount: 8000, enrolledAt: '2024-01-01', lastResetDate: '2024-01-01', rolloverAmount: 0, isActive: true },
    ],
    stats: { totalOrders: 12, totalSpend: 45000, totalSavings: 5000 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '2',
    userId: {
      _id: 'u2',
      name: 'Rahul Verma',
      email: 'rahul@company.com',
      phoneNumber: '9876543211',
    },
    employeeId: 'EMP002',
    department: 'Sales',
    level: 'L4',
    designation: 'Account Manager',
    employmentType: 'full_time',
    enrollmentStatus: 'enrolled',
    corpRole: 'corp_manager',
    benefits: [
      { benefitType: 'meal', benefitId: 'b1', allocatedAmount: 2000, utilizedAmount: 1200, remainingAmount: 800, enrolledAt: '2024-01-01', lastResetDate: '2024-01-01', rolloverAmount: 0, isActive: true },
      { benefitType: 'travel', benefitId: 'b2', allocatedAmount: 10000, utilizedAmount: 5000, remainingAmount: 5000, enrolledAt: '2024-01-01', lastResetDate: '2024-01-01', rolloverAmount: 0, isActive: true },
      { benefitType: 'gift', benefitId: 'b3', allocatedAmount: 5000, utilizedAmount: 0, remainingAmount: 5000, enrolledAt: '2024-01-01', lastResetDate: '2024-01-01', rolloverAmount: 0, isActive: true },
    ],
    stats: { totalOrders: 25, totalSpend: 120000, totalSavings: 15000 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '3',
    userId: {
      _id: 'u3',
      name: 'Anita Desai',
      email: 'anita@company.com',
      phoneNumber: '9876543212',
    },
    employeeId: 'EMP003',
    department: 'HR',
    level: 'L6',
    designation: 'HR Manager',
    employmentType: 'full_time',
    enrollmentStatus: 'enrolled',
    corpRole: 'corp_hr',
    benefits: [
      { benefitType: 'meal', benefitId: 'b1', allocatedAmount: 2000, utilizedAmount: 0, remainingAmount: 2000, enrolledAt: '2024-01-01', lastResetDate: '2024-01-01', rolloverAmount: 0, isActive: true },
      { benefitType: 'wellness', benefitId: 'b4', allocatedAmount: 1500, utilizedAmount: 0, remainingAmount: 1500, enrolledAt: '2024-01-01', lastResetDate: '2024-01-01', rolloverAmount: 0, isActive: true },
    ],
    stats: { totalOrders: 8, totalSpend: 18000, totalSavings: 2000 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '4',
    userId: {
      _id: 'u4',
      name: 'Vikram Singh',
      email: 'vikram@company.com',
      phoneNumber: '9876543213',
    },
    employeeId: 'EMP004',
    department: 'Finance',
    level: 'L5',
    designation: 'Financial Analyst',
    employmentType: 'full_time',
    enrollmentStatus: 'pending',
    corpRole: 'corp_employee',
    benefits: [],
    stats: { totalOrders: 0, totalSpend: 0, totalSavings: 0 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
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
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
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
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  employeeInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  employeeId: {
    fontSize: 12,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  designation: {
    fontSize: 12,
  },
  benefitsSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 12,
  },
  benefitsLabel: {
    fontSize: 11,
    marginBottom: 8,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  benefitChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  benefitChipText: {
    fontSize: 11,
  },
  moreBenefits: {
    fontSize: 11,
    paddingVertical: 4,
  },
  employeeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  employeeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeStatText: {
    fontSize: 12,
  },
});
