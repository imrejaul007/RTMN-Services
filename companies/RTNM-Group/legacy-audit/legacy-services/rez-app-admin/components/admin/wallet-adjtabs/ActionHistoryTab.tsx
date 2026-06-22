import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { useActionHistory } from '../../../hooks/queries/useAdminActions';
import type { AdminActionItem, AdminActionStatus } from '../../../services/api/adminActions';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_approval: { bg: Colors.light.warningLight, text: Colors.light.warningDeep },
  approved: { bg: Colors.light.infoLighter, text: Colors.light.infoDark },
  rejected: { bg: Colors.light.errorLight, text: Colors.light.errorDeep },
  executed: { bg: Colors.light.successLight, text: Colors.light.successDeep },
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  manual_adjustment: 'Wallet Adjustment',
  cashback_reversal: 'Cashback Reversal',
  freeze_override: 'Freeze Override',
  bulk_credit: 'Bulk Credit',
  config_change: 'Config Change',
};

type HistoryFilter = 'all' | 'pending_approval' | 'approved' | 'rejected' | 'executed';

interface Props {
  colors: any;
}

export default function ActionHistoryTab({ colors }: Props) {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const { data: rawActions, isLoading, isFetching, refetch } = useActionHistory({
    status: filter === 'all' ? undefined : (filter as AdminActionStatus),
    limit: 50,
  });

  const renderHistoryItem = useCallback(({ item }: { item: AdminActionItem }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending_approval;
    const initiatorName = typeof item.initiatorId === 'object'
      ? item.initiatorId.fullName || item.initiatorId.email || 'Unknown'
      : 'Unknown';
    const approverName = item.approverId && typeof item.approverId === 'object'
      ? item.approverId.fullName || item.approverId.email
      : null;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.historyHeader}>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>
              {item.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.badgeText, { color: colors.gray700 }]}>
              {ACTION_TYPE_LABELS[item.actionType] || item.actionType}
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.payload.type === 'credit' ? '+' : '-'}{item.payload.amount?.toFixed(2) || '0'} NC
          </Text>
          <Text style={[styles.userPhone, { color: colors.icon, marginTop: 2 }]}>By: {initiatorName}</Text>
          {approverName && (
            <Text style={[styles.userPhone, { color: colors.icon }]}>
              {item.status === 'rejected' ? 'Rejected by' : 'Approved by'}: {approverName}
            </Text>
          )}
          <Text style={[styles.auditDesc, { color: colors.text, marginTop: 4 }]} numberOfLines={2}>{item.reason}</Text>
          {item.rejectionReason && (
            <Text style={[styles.auditDesc, { color: colors.error, marginTop: 2 }]} numberOfLines={2}>
              Rejection: {item.rejectionReason}
            </Text>
          )}
          <Text style={[styles.auditDate, { color: colors.icon, marginTop: 4 }]}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  }, [colors]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {(['all', 'pending_approval', 'executed', 'approved', 'rejected'] as HistoryFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && { backgroundColor: colors.tint }]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, { color: filter === f ? colors.card : colors.text }]}>
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList
        data={rawActions?.actions ?? []}
        keyExtractor={(item) => item._id}
        renderItem={renderHistoryItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.tint} />}
        ListFooterComponent={isLoading ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} />
        ) : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No action history</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '500' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '600' },
  userPhone: { fontSize: 12, marginTop: 2 },
  auditDesc: { fontSize: 12, marginTop: 4 },
  auditDate: { fontSize: 11, marginTop: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
});
