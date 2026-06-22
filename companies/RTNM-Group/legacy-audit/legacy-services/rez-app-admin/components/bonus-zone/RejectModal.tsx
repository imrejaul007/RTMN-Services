import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Colors } from '../../constants/Colors';

interface RejectModalProps {
  visible: boolean;
  reason: string;
  colors: Record<string, string>;
  onChangeReason: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RejectModal({
  visible,
  reason,
  colors,
  onChangeReason,
  onCancel,
  onConfirm,
}: RejectModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text, marginBottom: 12 }]}>
            Reject Claim
          </Text>
          <Text style={[styles.label, { marginTop: 0 }]}>Reason for rejection</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, marginBottom: 16 },
            ]}
            value={reason}
            onChangeText={onChangeReason}
            placeholder="Enter reason for rejection..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
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
                { flex: 1, backgroundColor: colors.error, alignItems: 'center' },
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.btnText}>Reject</Text>
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
    minHeight: 80,
    textAlignVertical: 'top',
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
