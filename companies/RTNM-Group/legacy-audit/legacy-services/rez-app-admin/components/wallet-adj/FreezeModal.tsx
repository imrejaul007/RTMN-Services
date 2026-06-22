import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { sharedModalStyles } from './sharedStyles';
import type { UserWalletItem } from '../../services/api/userWallets';
import type { ThemeColors } from '../../constants/Colors';

interface Props {
  user: UserWalletItem | null;
  reason: string; setReason: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onClose: () => void;
  colors: ThemeColors;
}

export default function FreezeModal({ user, reason, setReason, loading, onSubmit, onClose, colors }: Props) {
  const { overlay, modal, modalTitle, modalSub, input, textArea, modalActions, modalBtn } = sharedModalStyles;
  const s = StyleSheet.create({
    modal: { ...modal, backgroundColor: colors.card },
    modalTitle: { ...modalTitle, color: colors.text },
    modalSub: { ...modalSub, color: colors.icon },
    input: { ...input, color: colors.text, borderColor: colors.border },
    modalBtn: { ...modalBtn, borderColor: colors.border },
  });
  return (
    <Modal visible={!!user} transparent animationType="fade" onRequestClose={onClose}>
      <View style={overlay}>
        <View style={s.modal}>
          <Text style={s.modalTitle}>Freeze Wallet</Text>
          <Text style={s.modalSub}>{user?.user.fullName || user?.user.phoneNumber}</Text>
          <TextInput style={[input, s.input, textArea]} placeholder="Reason for freezing (required)"
            placeholderTextColor={colors.icon} multiline value={reason} onChangeText={setReason} />
          <View style={modalActions}>
            <TouchableOpacity style={modalBtn} onPress={onClose}>
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalBtn, { backgroundColor: colors.error }]} onPress={onSubmit}
              disabled={loading || !reason.trim()}>
              {loading ? <ActivityIndicator size="small" color={colors.card} /> :
                <Text style={{ color: colors.card, fontWeight: '600' }}>Freeze</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
