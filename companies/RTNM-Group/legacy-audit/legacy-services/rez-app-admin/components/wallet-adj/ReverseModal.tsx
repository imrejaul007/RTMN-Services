import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { sharedModalStyles } from './sharedStyles';
import type { UserWalletItem } from '../../services/api/userWallets';
import type { ThemeColors } from '../../constants/Colors';

interface Props {
  user: UserWalletItem | null;
  amount: string; setAmount: (v: string) => void;
  txId: string; setTxId: (v: string) => void;
  reason: string; setReason: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onClose: () => void;
  colors: ThemeColors;
}

export default function ReverseModal({ user, amount, setAmount, txId, setTxId, reason, setReason, loading, onSubmit, onClose, colors }: Props) {
  const { overlay, modal, modalTitle, modalSub, input, textArea, helperText, modalActions, modalBtn } = sharedModalStyles;
  const s = StyleSheet.create({
    modal: { ...modal, backgroundColor: colors.card },
    modalTitle: { ...modalTitle, color: colors.text },
    modalSub: { ...modalSub, color: colors.icon },
    input: { ...input, color: colors.text, borderColor: colors.border },
    helperText: { ...helperText, color: colors.icon },
    modalBtn: { ...modalBtn, borderColor: colors.border },
  });
  return (
    <Modal visible={!!user} transparent animationType="fade" onRequestClose={onClose}>
      <View style={overlay}>
        <View style={s.modal}>
          <Text style={s.modalTitle}>Reverse Cashback</Text>
          <Text style={s.modalSub}>{user?.user.fullName || user?.user.phoneNumber}</Text>
          <TextInput style={s.input} placeholder="Amount (NC)" placeholderTextColor={colors.icon}
            keyboardType="numeric" value={amount} onChangeText={setAmount} />
          <TextInput style={s.input} placeholder="Original Transaction ID (optional)"
            placeholderTextColor={colors.icon} value={txId} onChangeText={setTxId} />
          <Text style={s.helperText}>Provide for exact reversal. Leave blank for manual clawback.</Text>
          <TextInput style={[input, s.input, textArea]} placeholder="Reason (required)"
            placeholderTextColor={colors.icon} multiline value={reason} onChangeText={setReason} />
          <View style={modalActions}>
            <TouchableOpacity style={modalBtn} onPress={onClose}>
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalBtn, { backgroundColor: colors.warning }]} onPress={onSubmit}
              disabled={loading || !amount || !reason.trim()}>
              {loading ? <ActivityIndicator size="small" color={colors.card} /> :
                <Text style={{ color: colors.card, fontWeight: '600' }}>Reverse</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
