import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sharedModalStyles } from './sharedStyles';
import type { UserWalletItem } from '../../services/api/userWallets';
import type { ThemeColors } from '../../constants/Colors';

type AdjustType = 'credit' | 'debit';

interface Props {
  user: UserWalletItem | null;
  adjustType: AdjustType;
  setAdjustType: (t: AdjustType) => void;
  amount: string; setAmount: (v: string) => void;
  reason: string; setReason: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onClose: () => void;
  colors: ThemeColors;
  threshold: number;
}

export default function AdjustModal({ user, adjustType, setAdjustType, amount, setAmount, reason, setReason, loading, onSubmit, onClose, colors, threshold }: Props) {
  const { overlay, modal, modalTitle, modalSub, typePicker, typePill, typePillText, input, textArea, helperText, modalActions, modalBtn } = sharedModalStyles;
  const s = StyleSheet.create({
    modal: { ...modal, backgroundColor: colors.card },
    modalTitle: { ...modalTitle, color: colors.text },
    modalSub: { ...modalSub, color: colors.icon },
    typePill: { ...typePill, borderColor: colors.gray200 },
    typePillText: { ...typePillText, color: colors.mutedDark },
    input: { ...input, color: colors.text, borderColor: colors.border },
    helperText: { ...helperText, color: colors.icon },
    modalBtn: { ...modalBtn, borderColor: colors.border },
  });
  return (
    <Modal visible={!!user} transparent animationType="fade" onRequestClose={onClose}>
      <View style={overlay}>
        <View style={s.modal}>
          <Text style={s.modalTitle}>{adjustType === 'credit' ? 'Credit' : 'Debit'} Wallet</Text>
          <Text style={s.modalSub}>{user?.user.fullName || user?.user.phoneNumber}</Text>
          <View style={typePicker}>
            {(['credit', 'debit'] as AdjustType[]).map((t) => (
              <TouchableOpacity key={t}
                style={[typePill, s.typePill, adjustType === t && { backgroundColor: t === 'credit' ? colors.success : colors.error }]}
                onPress={() => setAdjustType(t)}>
                <Text style={[typePillText, s.typePillText, adjustType === t && { color: colors.card }]}>
                  {t === 'credit' ? 'Credit' : 'Debit'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={s.input} placeholder="Amount (NC)" placeholderTextColor={colors.icon}
            keyboardType="numeric" value={amount} onChangeText={setAmount} />
          <Text style={s.helperText}>Amounts above {threshold.toLocaleString()} NC require another admin to approve.</Text>
          <TextInput style={[input, s.input, textArea]} placeholder="Reason (required)"
            placeholderTextColor={colors.icon} multiline value={reason} onChangeText={setReason} />
          <View style={modalActions}>
            <TouchableOpacity style={modalBtn} onPress={onClose}>
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalBtn, { backgroundColor: adjustType === 'credit' ? colors.success : colors.error }]}
              onPress={onSubmit} disabled={loading || !amount || !reason.trim()}>
              {loading ? <ActivityIndicator size="small" color={colors.card} /> :
                <Text style={{ color: colors.card, fontWeight: '600' }}>{adjustType === 'credit' ? 'Credit' : 'Debit'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
