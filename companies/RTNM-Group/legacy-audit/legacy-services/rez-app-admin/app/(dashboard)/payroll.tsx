import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { payrollService } from '../../services/api/payroll';
import type { OverviewStats, StaffMember, PayrollRun } from '../../services/api/payroll';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/payroll.styles';

type PayrollTab = 'overview' | 'staff' | 'attendance' | 'process';

// StaffMember, PayrollRun, OverviewStats are imported from services/api/payroll

interface PayrollEntry {
  _id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  baseSalary: number;
  bonusAmount: number;
  deductions: number;
  netSalary: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentDate?: string;
}

interface PayrollSummary {
  month: string;
  totalSalary: number;
  totalBonus: number;
  totalDeductions: number;
  staffCount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  entries: PayrollEntry[];
}

export default function PayrollScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<PayrollTab>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Overview state
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);

  // Staff list state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [staffPage, setStaffPage] = useState(1);
  const [staffTotal, setStaffTotal] = useState(0);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [attendanceGrid, setAttendanceGrid] = useState<any[]>([]);

  // Process payroll state
  const [processMonth, setProcessMonth] = useState(new Date().getMonth());
  const [processYear, setProcessYear] = useState(new Date().getFullYear());
  const [payrollPreview, setPayrollPreview] = useState<PayrollEntry[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>([]);
  const [showProcessModal, setShowProcessModal] = useState(false);

  // Fetch overview stats
  const fetchOverviewStats = useCallback(async () => {
    const emptyStats: OverviewStats = {
      totalStaff: 0,
      totalMonthlyPayroll: 0,
      avgSalary: 0,
      pendingApprovals: 0,
      merchantsProcessed: 0,
      totalMerchants: 0,
      topMerchants: [],
    };
    try {
      setLoading(true);
      const data = await payrollService.getOverview();
      setOverviewStats(data);
    } catch (error) {
      logger.error('[Payroll] Overview fetch error:', error);
      showAlert('Error', 'Failed to load payroll overview');
      setOverviewStats(emptyStats);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch staff list
  const fetchStaffList = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        const result = await payrollService.getStaff({
          page,
          limit: 20,
          merchantId: selectedStore !== 'all' ? selectedStore : undefined,
        });
        setStaffList(result.data);
        setStaffTotal(result.total);
        setStaffPage(page);
      } catch (error) {
        logger.error('[Payroll] Staff list fetch error:', error);
        setStaffList([]);
        setStaffTotal(0);
        showAlert('Error', 'Failed to load staff list');
      } finally {
        setLoading(false);
      }
    },
    [selectedStore]
  );

  // Fetch attendance
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const weekStart = new Date(attendanceDate);
      weekStart.setDate(attendanceDate.getDate() - attendanceDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const data = await payrollService.getAttendance(
        weekStart.toISOString(),
        weekEnd.toISOString()
      );
      setAttendanceGrid(data);
    } catch (error) {
      logger.error('[Payroll] Attendance fetch error:', error);
      setAttendanceGrid([]);
      showAlert('Error', 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [attendanceDate]);

  // Fetch payroll history
  const fetchPayrollHistory = useCallback(async () => {
    try {
      const data = await payrollService.getHistory({ page: 1, limit: 20 });
      setPayrollHistory(data);
    } catch (error) {
      logger.error('[Payroll] History fetch error:', error);
      setPayrollHistory([]);
    }
  }, []);

  // Process payroll
  const handleProcessPayroll = async () => {
    const totalAmount =
      payrollPreview.length > 0
        ? payrollPreview.reduce((sum, p) => sum + p.netSalary, 0)
        : (overviewStats?.totalMonthlyPayroll ?? 0);
    const staffCount =
      payrollPreview.length > 0 ? payrollPreview.length : (overviewStats?.totalStaff ?? 0);

    const confirmed = await showConfirm(
      'Confirm Payroll Processing',
      `Process payroll for ${new Date(processYear, processMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}?\n\nTotal Amount: ₹${totalAmount.toLocaleString()}\nStaff Count: ${staffCount}`
    );
    if (!confirmed) return;
    try {
      setLoading(true);
      await payrollService.processPayroll({
        month: processMonth + 1,
        year: processYear,
        totalAmount,
        staffCount,
      });
      showAlert('Success', 'Payroll processed successfully');
      setShowProcessModal(false);
      await fetchPayrollHistory();
    } catch (error: any) {
      showAlert('Error', 'Failed to process payroll');
    } finally {
      setLoading(false);
    }
  };

  // Load data when tabs change
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewStats();
    } else if (activeTab === 'staff') {
      fetchStaffList(1);
    } else if (activeTab === 'attendance') {
      fetchAttendance();
    } else if (activeTab === 'process') {
      fetchPayrollHistory();
    }
  }, [activeTab, fetchOverviewStats, fetchStaffList, fetchAttendance, fetchPayrollHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'overview') {
      await fetchOverviewStats();
    } else if (activeTab === 'staff') {
      await fetchStaffList(staffPage);
    } else if (activeTab === 'attendance') {
      await fetchAttendance();
    }
    setRefreshing(false);
  }, [activeTab, fetchOverviewStats, fetchStaffList, fetchAttendance, staffPage]);

  const renderOverviewTab = () => {
    if (loading || !overviewStats) {
      return (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={s.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards */}
        <View style={s.cardGrid}>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[s.cardLabel, { color: colors.icon }]}>Total Staff</Text>
            <Text style={[s.cardValue, { color: colors.text }]}>
              {overviewStats.totalStaff}
            </Text>
          </View>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[s.cardLabel, { color: colors.icon }]}>Monthly Payroll</Text>
            <Text style={[s.cardValue, { color: '#2ECC71' }]}>
              ₹{(overviewStats.totalMonthlyPayroll / 100000).toFixed(1)}L
            </Text>
          </View>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[s.cardLabel, { color: colors.icon }]}>Avg Salary</Text>
            <Text style={[s.cardValue, { color: colors.text }]}>
              ₹{(overviewStats.avgSalary / 1000).toFixed(1)}K
            </Text>
          </View>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[s.cardLabel, { color: colors.icon }]}>Pending</Text>
            <Text style={[s.cardValue, { color: colors.warning }]}>
              {overviewStats.pendingApprovals}
            </Text>
          </View>
        </View>

        {/* Health Metrics */}
        <View
          style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[s.sectionTitle, { color: colors.text }]}>Payroll Health</Text>
          <View style={s.healthMetric}>
            <Text style={[s.metricLabel, { color: colors.icon }]}>Merchants Processed</Text>
            <Text style={[s.metricValue, { color: colors.text }]}>
              {overviewStats.merchantsProcessed} / {overviewStats.totalMerchants}
            </Text>
            <View style={[s.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${overviewStats.totalMerchants > 0 ? (overviewStats.merchantsProcessed / overviewStats.totalMerchants) * 100 : 0}%`,
                    backgroundColor: '#FFCD57',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Top Merchants */}
        {overviewStats?.topMerchants &&
          Array.isArray(overviewStats.topMerchants) &&
          overviewStats.topMerchants.length > 0 && (
            <View
              style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[s.sectionTitle, { color: colors.text }]}>
                Top 5 by Payroll Cost
              </Text>
              {overviewStats.topMerchants.map((m, i) => (
                <View key={i} style={s.merchantRow}>
                  <Text style={[s.merchantName, { color: colors.text }]}>{m.name}</Text>
                  <Text style={[s.merchantPayroll, { color: colors.tint }]}>
                    ₹{m.payroll.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
      </ScrollView>
    );
  };

  const renderStaffTab = () => {
    return (
      <ScrollView
        contentContainerStyle={s.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Store Filter */}
        <View
          style={[
            s.filterContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[s.filterLabel, { color: colors.icon }]}>Filter by Store:</Text>
          <TouchableOpacity
            style={[
              s.filterButton,
              { backgroundColor: selectedStore === 'all' ? colors.tint : colors.border },
            ]}
            onPress={() => {
              setSelectedStore('all');
              fetchStaffList(1);
            }}
          >
            <Text
              style={[
                s.filterButtonText,
                { color: selectedStore === 'all' ? '#fff' : colors.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Staff List */}
        {loading ? (
          <View style={s.centerContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : staffList.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="people" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.text }]}>No staff members found</Text>
          </View>
        ) : (
          <>
            <FlatList
              scrollEnabled={false}
              data={staffList}
              renderItem={({ item }) => (
                <View
                  style={[
                    s.staffCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={s.staffInfo}>
                    <Text style={[s.staffName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[s.staffDetail, { color: colors.icon }]}>{item.role}</Text>
                    <Text style={[s.staffDetail, { color: colors.icon }]}>
                      {item.storeName}
                    </Text>
                  </View>
                  <View style={s.staffRight}>
                    <View style={[s.salaryBadge, { backgroundColor: colors.tint + '20' }]}>
                      <Text style={[s.salaryText, { color: colors.tint }]}>
                        ₹{(item.baseSalary ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.viewButton}
                      onPress={() =>
                        showAlert(
                          `${item.name}`,
                          `Role: ${item.role}\nStore: ${item.storeName}\nSalary Type: ${item.salaryType}\nBase Salary: ₹${(item.baseSalary ?? 0).toLocaleString()}${item.commissionRate != null ? `\nCommission: ${item.commissionRate}%` : ''}${item.hoursWorked != null ? `\nHours Worked: ${item.hoursWorked}` : ''}`
                        )
                      }
                    >
                      <Ionicons name="chevron-forward" size={20} color={colors.tint} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item._id}
              contentContainerStyle={s.staffList}
            />

            {/* Pagination */}
            {staffTotal > 20 && (
              <View style={s.paginationContainer}>
                <TouchableOpacity
                  disabled={staffPage === 1}
                  onPress={() => fetchStaffList(staffPage - 1)}
                  style={[
                    s.paginationButton,
                    staffPage === 1 && s.paginationButtonDisabled,
                  ]}
                >
                  <Text style={s.paginationButtonText}>Prev</Text>
                </TouchableOpacity>
                <Text style={[s.paginationText, { color: colors.text }]}>
                  Page {staffPage}
                </Text>
                <TouchableOpacity
                  disabled={staffPage * 20 >= staffTotal}
                  onPress={() => fetchStaffList(staffPage + 1)}
                  style={[
                    s.paginationButton,
                    staffPage * 20 >= staffTotal && s.paginationButtonDisabled,
                  ]}
                >
                  <Text style={s.paginationButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  const renderAttendanceTab = () => {
    return (
      <ScrollView
        contentContainerStyle={s.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Picker */}
        <View
          style={[
            s.datePickerContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() =>
              setAttendanceDate(new Date(attendanceDate.getTime() - 7 * 24 * 60 * 60 * 1000))
            }
          >
            <Ionicons name="chevron-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <Text style={[s.datePickerText, { color: colors.text }]}>
            {attendanceDate.toLocaleDateString()} - Week
          </Text>
          <TouchableOpacity
            onPress={() =>
              setAttendanceDate(new Date(attendanceDate.getTime() + 7 * 24 * 60 * 60 * 1000))
            }
          >
            <Ionicons name="chevron-forward" size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.centerContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <>
            {/* Attendance Grid Legend */}
            <View style={s.legend}>
              <View style={s.legendItem}>
                <View style={[s.legendColor, { backgroundColor: '#22C55E' }]} />
                <Text style={[s.legendText, { color: colors.text }]}>Present</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendColor, { backgroundColor: '#EF4444' }]} />
                <Text style={[s.legendText, { color: colors.text }]}>Absent</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendColor, { backgroundColor: '#F59E0B' }]} />
                <Text style={[s.legendText, { color: colors.text }]}>Half-day</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendColor, { backgroundColor: '#3B82F6' }]} />
                <Text style={[s.legendText, { color: colors.text }]}>Leave</Text>
              </View>
            </View>

            {attendanceGrid.length === 0 ? (
              <View style={s.emptyContainer}>
                <Ionicons name="calendar" size={48} color={colors.icon} />
                <Text style={[s.emptyText, { color: colors.text }]}>No attendance data</Text>
              </View>
            ) : (
              <View style={[s.gridContainer, { backgroundColor: colors.card }]}>
                {attendanceGrid.map((item, i) => (
                  <View key={i} style={s.gridRow}>
                    <Text style={[s.gridStaffName, { color: colors.text }]}>
                      {(item.staffId?.name || item.name || 'Staff').substring(0, 12)}
                    </Text>
                    {Array(7)
                      .fill(null)
                      .map((_, day) => {
                        const status = item.attendance?.[day]?.status || 'absent';
                        const colors_map: Record<string, string> = {
                          present: '#22C55E',
                          absent: '#EF4444',
                          half_day: '#F59E0B',
                          leave: '#3B82F6',
                        };
                        return (
                          <View
                            key={day}
                            style={[s.gridCell, { backgroundColor: colors_map[status] }]}
                          >
                            <Text style={s.gridCellText}>
                              {status === 'present'
                                ? 'P'
                                : status === 'absent'
                                  ? 'A'
                                  : status === 'half_day'
                                    ? 'H'
                                    : 'L'}
                            </Text>
                          </View>
                        );
                      })}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  const renderProcessTab = () => {
    return (
      <ScrollView contentContainerStyle={s.tabContent}>
        {/* Month/Year Selector */}
        <View
          style={[
            s.monthSelectorContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={s.monthSelector}>
            <Text style={[s.selectorLabel, { color: colors.icon }]}>Month:</Text>
            <TouchableOpacity
              style={[s.selectorButton, { backgroundColor: colors.border }]}
              onPress={() => setProcessMonth((prev) => (prev >= 11 ? 0 : prev + 1))}
              onLongPress={() => setProcessMonth((prev) => (prev <= 0 ? 11 : prev - 1))}
            >
              <Text style={[s.selectorButtonText, { color: colors.text }]}>
                {new Date(processYear, processMonth).toLocaleString('default', { month: 'short' })}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.monthSelector}>
            <Text style={[s.selectorLabel, { color: colors.icon }]}>Year:</Text>
            <TouchableOpacity
              style={[s.selectorButton, { backgroundColor: colors.border }]}
              onPress={() => {
                const currentYear = new Date().getFullYear();
                setProcessYear((prev) => (prev >= currentYear + 1 ? currentYear - 1 : prev + 1));
              }}
              onLongPress={() => {
                const currentYear = new Date().getFullYear();
                setProcessYear((prev) => (prev <= currentYear - 1 ? currentYear + 1 : prev - 1));
              }}
            >
              <Text style={[s.selectorButtonText, { color: colors.text }]}>{processYear}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payroll History */}
        <View style={s.historySection}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Payroll Runs</Text>
          {payrollHistory.length === 0 ? (
            <View style={s.emptyContainer}>
              <Ionicons name="document" size={48} color={colors.icon} />
              <Text style={[s.emptyText, { color: colors.text }]}>No payroll runs yet</Text>
            </View>
          ) : (
            payrollHistory.slice(0, 3).map((run) => (
              <View
                key={run._id}
                style={[
                  s.historyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={s.historyInfo}>
                  <Text style={[s.historyDate, { color: colors.text }]}>
                    {new Date(run.year, run.month - 1).toLocaleString('default', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={[s.historyDetail, { color: colors.icon }]}>
                    {run.staffCount} staff
                  </Text>
                </View>
                <View style={s.historyRight}>
                  <Text style={[s.historyAmount, { color: colors.tint }]}>
                    ₹{run.totalAmount.toLocaleString()}
                  </Text>
                  <View
                    style={[
                      s.statusBadge,
                      {
                        backgroundColor:
                          run.status === 'processed'
                            ? '#22C55E20'
                            : run.status === 'pending'
                              ? '#F59E0B20'
                              : '#EF444420',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.statusBadgeText,
                        {
                          color:
                            run.status === 'processed'
                              ? '#22C55E'
                              : run.status === 'pending'
                                ? '#F59E0B'
                                : '#EF4444',
                        },
                      ]}
                    >
                      {run.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Process Button */}
        <TouchableOpacity
          onPress={() => setShowProcessModal(true)}
          style={[s.processButton, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={s.processButtonText}>Run Payroll</Text>
        </TouchableOpacity>

        {/* Info Banner */}
        <View
          style={[
            s.infoBanner,
            { backgroundColor: colors.warning + '10', borderColor: colors.warning },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color={colors.warning} />
          <Text style={[s.infoBannerText, { color: colors.text }]}>
            Payroll processing triggers bank transfers via Razorpay Payouts. Transfers complete
            within 2 business days.
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Payroll Management</Text>
        <View style={s.headerSpacer} />
      </View>

      {/* Tab Navigation */}
      <View
        style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        {(['overview', 'staff', 'attendance', 'process'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              s.tabButton,
              activeTab === tab && { borderBottomColor: colors.tint, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                s.tabButtonText,
                { color: activeTab === tab ? colors.tint : colors.icon },
              ]}
            >
              {tab === 'overview'
                ? 'Overview'
                : tab === 'staff'
                  ? 'Staff'
                  : tab === 'attendance'
                    ? 'Attendance'
                    : 'Process'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'staff' && renderStaffTab()}
      {activeTab === 'attendance' && renderAttendanceTab()}
      {activeTab === 'process' && renderProcessTab()}

      {/* Process Payroll Modal */}
      <Modal visible={showProcessModal} transparent animationType="fade">
        <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Ionicons
              name="alert-circle"
              size={48}
              color={colors.warning}
              style={{ marginBottom: 12 }}
            />
            <Text style={[s.modalTitle, { color: colors.text }]}>
              Confirm Payroll Processing
            </Text>
            <Text style={[s.modalMessage, { color: colors.icon }]}>
              This will process payroll for all staff members and initiate bank transfers.
            </Text>
            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => setShowProcessModal(false)}
                style={[s.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleProcessPayroll}
                disabled={loading}
                style={[s.modalButton, { backgroundColor: colors.tint }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalButtonText, { color: '#fff' }]}>Process</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

