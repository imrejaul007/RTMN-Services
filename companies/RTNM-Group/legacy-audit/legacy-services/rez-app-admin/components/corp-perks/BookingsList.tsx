/**
 * CorpPerks Hotel Bookings Page
 *
 * Manage corporate hotel bookings
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
import { Card, StatsCard, StatusBadge, Loading, EmptyState, TabSelector, formatCurrency, formatDate } from './index';
import { corpHotelsApi, type HotelBooking } from '../../services/api/corpHotels';
import { logger } from '../../utils/logger';

const MOCK_BOOKINGS: HotelBooking[] = [
  {
    _id: '1',
    bookingId: 'HB001',
    employee: {
      employeeId: 'EMP001',
      name: 'Priya Sharma',
      email: 'priya@company.com',
      department: 'Engineering',
    },
    company: {
      companyId: 'C001',
      name: 'Acme Technologies',
      gstIn: '27AABCU9603R1ZM',
    },
    property: {
      propertyId: 'P001',
      name: 'The Grand Mumbai',
      city: 'Mumbai',
    },
    room: {
      roomTypeId: 'R001',
      name: 'Deluxe Room',
      maxOccupancy: 2,
    },
    checkIn: '2024-04-15',
    checkOut: '2024-04-17',
    nights: 2,
    guests: 1,
    guestDetails: [{ name: 'Priya Sharma', age: 28 }],
    pricing: {
      roomRate: 4500,
      numberOfRooms: 1,
      subtotal: 9000,
      corporateDiscount: 500,
      gstAmount: 1530,
      totalAmount: 10030,
      currency: 'INR',
    },
    billing: {
      invoiceNumber: 'CP/HOT/2024-04/00001',
      billedTo: 'Acme Technologies',
      gstIn: '27AABCU9603R1ZM',
      paymentStatus: 'paid',
      paymentMethod: 'corporate_billing',
    },
    status: 'confirmed',
    approval: {
      required: false,
      status: 'approved',
    },
    createdAt: '2024-04-10',
    updatedAt: '2024-04-10',
  },
  {
    _id: '2',
    bookingId: 'HB002',
    employee: {
      employeeId: 'EMP002',
      name: 'Rahul Verma',
      email: 'rahul@company.com',
      department: 'Sales',
    },
    company: {
      companyId: 'C001',
      name: 'Acme Technologies',
      gstIn: '27AABCU9603R1ZM',
    },
    property: {
      propertyId: 'P002',
      name: 'ITC Gardenia',
      city: 'Bangalore',
    },
    room: {
      roomTypeId: 'R002',
      name: 'Executive Suite',
      maxOccupancy: 2,
    },
    checkIn: '2024-04-20',
    checkOut: '2024-04-23',
    nights: 3,
    guests: 1,
    guestDetails: [{ name: 'Rahul Verma', age: 32 }],
    pricing: {
      roomRate: 6500,
      numberOfRooms: 1,
      subtotal: 19500,
      corporateDiscount: 1000,
      gstAmount: 3330,
      totalAmount: 21830,
      currency: 'INR',
    },
    billing: {
      invoiceNumber: 'CP/HOT/2024-04/00002',
      billedTo: 'Acme Technologies',
      gstIn: '27AABCU9603R1ZM',
      paymentStatus: 'pending',
      paymentMethod: 'corporate_billing',
    },
    status: 'pending',
    approval: {
      required: true,
      status: 'pending',
    },
    createdAt: '2024-04-18',
    updatedAt: '2024-04-18',
  },
];

export default function HotelBookingsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchBookings = useCallback(async () => {
    try {
      const result = await corpHotelsApi.getBookings({ limit: 50 });
      setBookings(result.data);
    } catch (error) {
      logger.error('Failed to fetch bookings:', error);
      setBookings(MOCK_BOOKINGS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.bookingId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.property?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingApprovals = bookings.filter((b) => b.approval?.status === 'pending').length;
  const totalRevenue = bookings.reduce((sum, b) => sum + b.pricing?.totalAmount || 0, 0);
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;

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
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { color: '#22c55e', label: 'Confirmed' };
      case 'pending':
        return { color: '#f59e0b', label: 'Pending' };
      case 'checked_in':
        return { color: '#3b82f6', label: 'Checked In' };
      case 'checked_out':
        return { color: '#6b7280', label: 'Checked Out' };
      case 'cancelled':
        return { color: '#ef4444', label: 'Cancelled' };
      default:
        return { color: '#6b7280', label: status };
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending', label: 'Pending' },
    { key: 'checked_in', label: 'Active' },
  ];

  if (loading) {
    return <Loading message="Loading bookings..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Hotel Bookings</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => Alert.alert('New Booking', 'Hotel search would open here')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Book</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by booking ID, guest, or hotel..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Pending Approvals"
          value={pendingApprovals}
          icon="time-outline"
          iconColor="#f59e0b"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Confirmed"
          value={confirmedCount}
          icon="checkmark-circle-outline"
          iconColor="#22c55e"
        />
      </View>

      <View style={styles.statsRow}>
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon="wallet-outline"
          iconColor="#3b82f6"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Total Bookings"
          value={bookings.length}
          icon="bed-outline"
          iconColor="#8b5cf6"
        />
      </View>

      {/* Filter Tabs */}
      <TabSelector tabs={tabs} selected={filterStatus} onSelect={setFilterStatus} />

      {/* Bookings List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBookings.length === 0 ? (
          <EmptyState
            icon="bed-outline"
            title="No Bookings Found"
            message="Hotel bookings will appear here when employees make reservations"
            actionLabel="New Booking"
            onAction={() => Alert.alert('New Booking', 'Hotel search would open here')}
          />
        ) : (
          filteredBookings.map((booking) => {
            const statusConfig = getStatusConfig(booking.status);
            const needsApproval = booking.approval?.required && booking.approval?.status === 'pending';

            return (
              <TouchableOpacity
                key={booking._id}
                onPress={() => router.push(`/corp-bookings/${booking.bookingId}`)}
              >
                <Card>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingInfo}>
                      <View style={styles.bookingTitleRow}>
                        <Text style={[styles.bookingId, { color: colors.text }]}>
                          {booking.bookingId}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                          <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.hotelName, { color: colors.textSecondary }]}>
                        {booking.property?.name} • {booking.property?.city}
                      </Text>
                    </View>
                    <View style={[styles.roomType, { backgroundColor: colors.background }]}>
                      <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.roomName, { color: colors.text }]}>
                        {booking.room?.name}
                      </Text>
                    </View>
                  </View>

                  {/* Dates & Guest */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="moon-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        {booking.nights} night{booking.nights !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Employee & Amount */}
                  <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                    <View style={styles.employeeInfo}>
                      <View style={[styles.avatar, { backgroundColor: '#3b82f6' }]}>
                        <Text style={styles.avatarText}>
                          {booking.employee?.name?.charAt(0) || '?'}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.employeeName, { color: colors.text }]}>
                          {booking.employee?.name}
                        </Text>
                        <Text style={[styles.department, { color: colors.textSecondary }]}>
                          {booking.employee?.department}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.amountInfo}>
                      <Text style={[styles.amount, { color: colors.tint }]}>
                        {formatCurrency(booking.pricing?.totalAmount || 0)}
                      </Text>
                      <View style={[styles.paymentBadge, {
                        backgroundColor: booking.billing?.paymentStatus === 'paid' ? '#22c55e20' : '#f59e0b20'
                      }]}>
                        <Text style={[styles.paymentText, {
                          color: booking.billing?.paymentStatus === 'paid' ? '#22c55e' : '#f59e0b'
                        }]}>
                          {booking.billing?.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Approval Warning */}
                  {needsApproval && (
                    <View style={[styles.approvalBanner, { backgroundColor: '#f59e0b20' }]}>
                      <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
                      <Text style={styles.approvalText}>Awaiting approval</Text>
                      <TouchableOpacity
                        onPress={() => {
                          corpHotelsApi.approveBooking(booking._id);
                          Alert.alert('Approved', 'Booking has been approved');
                          fetchBookings();
                        }}
                      >
                        <Text style={styles.approveLink}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hotelName: {
    fontSize: 13,
  },
  roomType: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  roomName: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  employeeName: {
    fontSize: 13,
    fontWeight: '500',
  },
  department: {
    fontSize: 11,
  },
  amountInfo: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  paymentText: {
    fontSize: 10,
    fontWeight: '600',
  },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  approvalText: {
    flex: 1,
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  approveLink: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
});
