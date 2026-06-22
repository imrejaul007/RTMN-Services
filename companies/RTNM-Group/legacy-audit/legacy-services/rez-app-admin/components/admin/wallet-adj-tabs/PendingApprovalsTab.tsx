import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { showAlert, showConfirm } from '../../../utils/alert';
import { useAuth } from '../../../contexts/AuthContext';
import { adminActionsService } from '../../../services/api/adminActions';
import { usePendingActions } from '../../../hooks/queries/useAdminActions';
import { RejectModal } from '../../../components/wallet-adj';
import type { AdminActionItem } from '../../../services/api/adminActions';

const ACTION_TYPE_LABELS: Record<string, string> = {
  manual_adjustment: 'Wallet Adjustment',
  cashback_reversal: 'Cashback Reversal',
  freeze_override: 'Freeze Override',
  bulk_credit: 'Bulk Credit',
  config_change: 'Config Change',
};

interface Props {
  colors: any;
}

export default function PendingApprovalsTab({ colors }: Props) {
  const { user: currentAdmin } = useAuth();
  const [rejectTarget, setRejectTarget] = useState<AdminActionItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: rawActions, isLoading, isFetching, refetch } = usePendingActions({ limit: 50 });

  const handleApprove = async (action: AdminActionItem) => {
    const confirmed = await showConfirm(
      'Approve Action',
      `Approve this ${ACTION_TYPE_LABELS[action.actionType] || action.actionType}?\n\nAmount: ${action.payload.amount || 0} NC\nReason: ${action.reason}`
    );
    if (!confirmed) return;
    setActionLoading(action._id);
    try {
      await adminActionsService.approveAction(action._id);
      showAlert('Success', 'Action approved and executed', 'success');
      refetch();
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(rejectTarget._id);
    try {
      await adminActionsService.rejectAction(rejectTarget._id, rejectReason.trim());
      showAlert('Success', 'Action rejected', 'success');
      setRejectTarget(null); setRejectReason('');
      refetch();
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setActionLoading(null); }
  };

  const renderAction = useCallback(({ item }: { item: AdminActionItem }) => {
    const isSelf = currentAdmin?._id === (typeof item.initiatorId === 'object' ? item.initiatorId._id : item.initiatorId);
    const initiatorName = typeof item.initiatorId === 'object'
      ? item.initiatorId.fullName || item.initiatorId.email || 'Unknown'
      : 'Unknown';
    const isActionLoading = actionLoading === item._id;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.actionHeader}>
          <View style={[styles.badge, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.badgeText, { color: colors.warningDeep }]}>
              {ACTION_TYPE_LABELS[item.actionType] || item.actionType}
            </Text>
          </View>
          <Text style={[styles.auditDate, { color: colors.icon }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.payload.type === 'credit' ? '+' : '-'}{item.payload.amount?.toFixed(2) || '0'} NC
          </Text>
          <Text style={[styles.userPhone, { color: colors.icon, marginTop: 4 }]}>Initiated by: {initiatorName}</Text>
          {item.payload.userId && (
            <Text style={[styles.userPhone, { color: colors.icon }]}>Target user: {item.payload.userId}</Text>
          )}
          <Text style={[styles.auditDesc, { color: colors.text, marginTop: 4 }]}>{item.reason}</Text>
        </View>
        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.successLight, opacity: isSelf ? 0.5 : 1 }]}
            onPress={() => handleApprove(item)}
            disabled={isSelf || isActionLoading}>
            {isActionLoading ? (
              <ActivityIndicator size="small" color={colors.successDeep} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.successDeep} />
                <Text style={[styles.actionText, { color: colors.successDeep }]}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.errorLight }]}
            onPress={() => setRejectTarget(item)}
            disabled={isActionLoading}>
            <Ionicons name="close-circle-outline" size={14} color={colors.errorDeep} />
            <Text style={[styles.actionText, { color: colors.errorDeep }]}>Reject</Text>
          </TouchableOpacity>
          {isSelf && (
            <Text style={[styles.helperText, { color: colors.warningDeep, marginBottom: 0 }]}>
              Cannot approve own action
            </Text>
          )}
        </View>
      </View>
    );
  }, [colors, currentAdmin, actionLoading]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={rawActions?.actions ?? []}
        keyExtractor={(item) => item._id}
        renderItem={renderAction}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.tint} />}
        ListFooterComponent={isLoading ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} />
        ) : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No pending approvals</Text>
          </View>
        ) : null}
      />
      <RejectModal
        action={rejectTarget}
        reason={rejectReason}
        setReason={setRejectReason}
        onSubmit={handleReject}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
        colors={colors}
        ACTION_TYPE_LABELS={ACTION_TYPE_LABELS}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '600' },
  userPhone: { fontSize: 12, marginTop: 2 },
  auditDesc: { fontSize: 12, marginTop: 4 },
  auditDate: { fontSize: 11, marginTop: 4 },
  actionRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
  helperText: { fontSize: 11, marginTop: 4, paddingHorizontal: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
});
