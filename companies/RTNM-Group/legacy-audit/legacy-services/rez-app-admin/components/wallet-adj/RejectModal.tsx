import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { sharedModalStyles } from './sharedStyles';
import type { AdminActionItem } from '../../services/api/adminActions';
import type { ThemeColors } from '../../constants/Colors';

interface Props {
  action: AdminActionItem | null;
  reason: string; setReason: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  colors: ThemeColors;
  ACTION_TYPE_LABELS: Record<string, string>;
}

export default function RejectModal({ action, reason, setReason, onSubmit, onClose, colors, ACTION_TYPE_LABELS }: Props) {
  const { overlay, modal, modalTitle, modalSub, input, textArea, modalActions, modalBtn } = sharedModalStyles;
  const s = StyleSheet.create({
    modal: { ...modal, backgroundColor: colors.card },
    modalTitle: { ...modalTitle, color: colors.text },
    modalSub: { ...modalSub, color: colors.icon },
    input: { ...input, color: colors.text, borderColor: colors.border },
    modalBtn: { ...modalBtn, borderColor: colors.border },
  });
  return (
    <Modal visible={!!action} transparent animationType="fade" onRequestClose={onClose}>
      <View style={overlay}>
        <View style={s.modal}>
          <Text style={s.modalTitle}>Reject Action</Text>
          <Text style={s.modalSub}>
            {ACTION_TYPE_LABELS[action?.actionType || ''] || action?.actionType} — {action?.payload?.amount?.toFixed(2) || '0'} NC
          </Text>
          <TextInput style={[input, s.input, textArea]} placeholder="Rejection reason (required)"
            placeholderTextColor={colors.icon} multiline value={reason} onChangeText={setReason} />
          <View style={modalActions}>
            <TouchableOpacity style={modalBtn} onPress={onClose}>
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalBtn, { backgroundColor: colors.error }]} onPress={onSubmit}
              disabled={!reason.trim()}>
              <Text style={{ color: colors.card, fontWeight: '600' }}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
