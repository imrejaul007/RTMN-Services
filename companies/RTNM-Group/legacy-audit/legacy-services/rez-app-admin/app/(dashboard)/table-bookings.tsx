import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { tableBookingAdminService, AdminTableBooking } from '../../services/api/tableBookings';
import { showAlert } from '../../utils/alert';
import { s } from './styles/table-bookings.styles';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF9C3', text: '#92400E' },
  confirmed: { bg: '#DCFCE7', text: '#166534' },
  completed: { bg: '#EFF6FF', text: '#1D4ED8' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  no_show: { bg: '#F3F4F6', text: '#374151' },
};

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

export default function TableBookingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [bookings, setBookings] = useState<AdminTableBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await tableBookingAdminService.getBookings(1, 50, {
        status: filter === 'all' ? undefined : filter,
      });
      setBookings(res.bookings || []);
    } catch {
      showAlert('Error', 'Failed to load table bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card }]}>
        <View style={s.headerRow}>
          <Ionicons name="restaurant" size={24} color={colors.tint} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Table Bookings</Text>
        </View>
        <Text style={[s.headerSubtitle, { color: colors.icon }]}>
          View and manage restaurant table reservations
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              s.filterChip,
              { borderColor: colors.border },
              filter === f && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                s.filterText,
                { color: colors.icon },
                filter === f && { color: colors.card },
              ]}
            >
              {f === 'no_show' ? 'No-Show' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.icon} />
              <Text style={[s.emptyText, { color: colors.icon }]}>
                No {filter === 'all' ? '' : filter} bookings
              </Text>
            </View>
          }
          renderItem={({ item: b }) => {
            const storeName = typeof b.storeId === 'object' ? b.storeId?.name : 'Store';
            const statusStyle = STATUS_COLORS[b.status] || STATUS_COLORS.pending;

            return (
              <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.cardHeader}>
                  <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {storeName} · Party of {b.partySize}
                  </Text>
                  <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[s.statusText, { color: statusStyle.text }]}>
                      {b.status.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={[s.cardDate, { color: colors.icon }]}>
                  {formatDate(b.bookingDate)} at {b.bookingTime}
                </Text>
                <Text style={[s.cardCustomer, { color: colors.icon }]}>
                  {b.customerName} · {b.customerPhone}
                </Text>
                {b.specialRequests ? (
                  <Text style={[s.cardNote, { color: colors.icon }]}>
                    "{b.specialRequests}"
                  </Text>
                ) : null}
                {b.preOrderId ? (
                  <View style={s.preOrderBadge}>
                    <Text style={s.preOrderText}>
                      Pre-order: {b.advancePaymentAmount?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

