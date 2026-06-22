import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import {
  serviceAppointmentAdminService,
  AdminServiceAppointment,
} from '../../services/api/serviceAppointments';
import { showAlert } from '../../utils/alert';
import { s } from './styles/service-appointments.styles';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF9C3', text: '#92400E' },
  confirmed: { bg: '#DCFCE7', text: '#166534' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#D1FAE5', text: '#065F46' }, // distinct green — was identical to in_progress
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  no_show: { bg: '#F3F4F6', text: '#374151' },
};

const VALID_STATUSES = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

const FILTERS = ['all', ...VALID_STATUSES] as const;

export default function ServiceAppointmentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [appointments, setAppointments] = useState<AdminServiceAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Status change modal state
  const [statusModalAppt, setStatusModalAppt] = useState<AdminServiceAppointment | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const res = await serviceAppointmentAdminService.getAppointments(1, 50, {
          status: filter === 'all' ? undefined : filter,
        });
        setAppointments(res.appointments || []);
      } catch {
        showAlert('Error', 'Failed to load service appointments');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = useCallback(
    async (appt: AdminServiceAppointment, newStatus: ValidStatus) => {
      if (appt.status === newStatus) {
        setStatusModalAppt(null);
        return;
      }
      setUpdatingStatus(true);
      try {
        await serviceAppointmentAdminService.updateStatus(appt._id, newStatus);
        setAppointments((prev) =>
          prev.map((a) => (a._id === appt._id ? { ...a, status: newStatus } : a))
        );
        setStatusModalAppt(null);
      } catch {
        showAlert('Error', 'Failed to update status. Please try again.');
      } finally {
        setUpdatingStatus(false);
      }
    },
    []
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getUserName = (appt: AdminServiceAppointment) => {
    if (appt.customerName) return appt.customerName;
    const p = appt.user?.profile;
    if (p?.firstName || p?.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return 'Unknown';
  };

  const renderItem = ({ item }: { item: AdminServiceAppointment }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <View style={s.cardHeader}>
          <Text style={[s.appointmentNumber, { color: colors.tint }]}>
            {item.appointmentNumber}
          </Text>
          <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[s.statusText, { color: statusColor.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={[s.customerName, { color: colors.text }]}>{getUserName(item)}</Text>
        <Text style={[s.serviceType, { color: colors.tint }]}>{item.serviceType}</Text>

        <View style={s.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.icon} />
          <Text style={[s.detailText, { color: colors.icon }]}>
            {formatDate(item.appointmentDate)} at {item.appointmentTime}
          </Text>
        </View>

        <View style={s.detailRow}>
          <Ionicons name="time-outline" size={14} color={colors.icon} />
          <Text style={[s.detailText, { color: colors.icon }]}>{item.duration} min</Text>
        </View>

        {item.store?.name && (
          <View style={s.detailRow}>
            <Ionicons name="storefront-outline" size={14} color={colors.icon} />
            <Text style={[s.detailText, { color: colors.icon }]}>{item.store.name}</Text>
          </View>
        )}

        {item.customerPhone && (
          <View style={s.detailRow}>
            <Ionicons name="call-outline" size={14} color={colors.icon} />
            <Text style={[s.detailText, { color: colors.icon }]}>{item.customerPhone}</Text>
          </View>
        )}

        {item.specialInstructions && (
          <Text style={[s.notes, { color: colors.icon }]} numberOfLines={2}>
            {item.specialInstructions}
          </Text>
        )}

        {/* Status action — only show if not already in a terminal state */}
        {item.status !== 'cancelled' &&
          item.status !== 'completed' &&
          item.status !== 'no_show' && (
            <TouchableOpacity
              style={[s.actionBtn, { borderColor: colors.tint }]}
              onPress={() => setStatusModalAppt(item)}
            >
              <Ionicons name="swap-horizontal-outline" size={14} color={colors.tint} />
              <Text style={[s.actionBtnText, { color: colors.tint }]}>Change Status</Text>
            </TouchableOpacity>
          )}
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card }]}>
        <View style={s.headerRow}>
          <Ionicons name="calendar" size={24} color={colors.tint} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Service Appointments</Text>
        </View>
        <Text style={[s.headerSubtitle, { color: colors.icon }]}>
          Manage service appointments across all niches
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              s.filterChip,
              filter === f && { backgroundColor: colors.tint },
              filter !== f && {
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, { color: filter === f ? '#fff' : colors.text }]}>
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.tint}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={[s.emptyText, { color: colors.icon }]}>
                No service appointments found
              </Text>
            </View>
          }
        />
      )}

      {/* Status change modal */}
      <Modal
        visible={statusModalAppt !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalAppt(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Change Status</Text>
            {statusModalAppt && (
              <Text style={[s.modalSubtitle, { color: colors.icon }]}>
                {statusModalAppt.appointmentNumber} — {statusModalAppt.serviceType}
              </Text>
            )}

            {updatingStatus ? (
              <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: 24 }} />
            ) : (
              VALID_STATUSES.map((status) => {
                const sc = STATUS_COLORS[status];
                const isCurrent = statusModalAppt?.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      s.statusOption,
                      {
                        backgroundColor: sc.bg,
                        borderColor: isCurrent ? sc.text : 'transparent',
                        borderWidth: isCurrent ? 2 : 0,
                      },
                    ]}
                    onPress={() => statusModalAppt && handleStatusChange(statusModalAppt, status)}
                    disabled={isCurrent}
                  >
                    <Text style={[s.statusOptionText, { color: sc.text }]}>
                      {status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      {isCurrent ? ' (current)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={[s.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setStatusModalAppt(null)}
            >
              <Text style={[s.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

