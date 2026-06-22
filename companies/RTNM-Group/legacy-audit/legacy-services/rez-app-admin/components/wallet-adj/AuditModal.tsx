import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sharedModalStyles } from './sharedStyles';
import type { UserWalletItem, AuditLogItem } from '../../services/api/userWallets';
import type { ThemeColors } from '../../constants/Colors';

interface Props {
  user: UserWalletItem | null;
  logs: AuditLogItem[];
  page: number; totalPages: number;
  loading: boolean;
  onLoad: (pg: number) => void;
  onClose: () => void;
  colors: ThemeColors;
}

export default function AuditModal({ user, logs, page, totalPages, loading, onLoad, onClose, colors }: Props) {
  const { overlay, modal, auditModal, modalTitle, modalSub, pagination, pageInfo, modalBtn } = sharedModalStyles;
  const s = StyleSheet.create({
    modal: { ...modal, ...auditModal, backgroundColor: colors.card },
    modalTitle: { ...modalTitle, color: colors.text },
    modalSub: { ...modalSub, color: colors.icon },
    pagination: { ...pagination },
    pageInfo: { ...pageInfo, color: colors.text },
    badge: { backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontSize: 10, fontWeight: '700', color: colors.successDeep },
    auditItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    auditAmount: { fontSize: 14, fontWeight: '700', color: colors.text },
    auditDesc: { fontSize: 12, marginTop: 4, color: colors.icon },
    auditDate: { fontSize: 11, marginTop: 4, color: colors.icon },
    emptyText: { textAlign: 'center', marginVertical: 24, color: colors.icon, fontSize: 14 },
  });
  return (
    <Modal visible={!!user} transparent animationType="fade" onRequestClose={onClose}>
      <View style={overlay}>
        <View style={s.modal}>
          <Text style={s.modalTitle}>Audit Trail</Text>
          <Text style={s.modalSub}>{user?.user.fullName || user?.user.phoneNumber}</Text>
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={colors.tint} />
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {logs.map((log) => {
                const opColor = log.operation === 'credit' ? colors.success : log.operation === 'debit' ? colors.error : colors.info;
                return (
                  <View key={log._id} style={s.auditItem}>
                    <View style={s.auditHeader}>
                      <View style={[s.badge, { backgroundColor: opColor + '20' }]}>
                        <Text style={[s.badgeText, { color: opColor }]}>{log.operation.toUpperCase()}</Text>
                      </View>
                      <Text style={s.auditAmount}>{log.amount ? `${log.amount.toFixed(2)} NC` : '—'}</Text>
                    </View>
                    <Text style={s.auditDesc} numberOfLines={2}>{log.reference?.description || log.operation}</Text>
                    <Text style={s.auditDate}>{new Date(log.createdAt).toLocaleString()}</Text>
                  </View>
                );
              })}
              {logs.length === 0 && <Text style={s.emptyText}>No audit entries</Text>}
            </ScrollView>
          )}
          {totalPages > 1 && (
            <View style={s.pagination}>
              <TouchableOpacity onPress={() => onLoad(page - 1)} disabled={page <= 1}>
                <Ionicons name="chevron-back" size={16} color={page <= 1 ? colors.icon : colors.tint} />
              </TouchableOpacity>
              <Text style={s.pageInfo}>{page} / {totalPages}</Text>
              <TouchableOpacity onPress={() => onLoad(page + 1)} disabled={page >= totalPages}>
                <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? colors.icon : colors.tint} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={modalBtn} onPress={onClose}>
            <Text style={{ color: colors.text }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
