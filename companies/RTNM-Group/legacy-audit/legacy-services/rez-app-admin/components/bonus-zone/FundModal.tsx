import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Colors } from '../../constants/Colors';

interface FundModalProps {
  visible: boolean;
  amount: string;
  colors: Record<string, string>;
  onChangeAmount: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function FundModal({
  visible,
  amount,
  colors,
  onChangeAmount,
  onCancel,
  onConfirm,
}: FundModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text, marginBottom: 12 }]}>
            Fund Campaign
          </Text>
          <Text style={[styles.label, { marginTop: 0 }]}>Amount (coins)</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, marginBottom: 16 }]}
            value={amount}
            onChangeText={onChangeAmount}
            placeholder="Enter amount"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[
                styles.btn,
                { flex: 1, backgroundColor: colors.mutedDark, alignItems: 'center' },
              ]}
              onPress={onCancel}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                { flex: 1, backgroundColor: colors.success, alignItems: 'center' },
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.btnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  container: {
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '700' },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.mutedDark,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});
