import { StyleSheet } from 'react-native';

/** Shared modal styles used across wallet-adj modals */
export const sharedModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 420, borderRadius: 16, padding: 20 },
  auditModal: { maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSub: { fontSize: 13, marginTop: 2, marginBottom: 16 },
  typePicker: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typePill: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  typePillText: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  helperText: { fontSize: 11, marginTop: -6, marginBottom: 10, paddingHorizontal: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  auditItem: { paddingVertical: 10, borderBottomWidth: 1 },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditAmount: { fontSize: 14, fontWeight: '700' },
  auditDesc: { fontSize: 12, marginTop: 4 },
  auditDate: { fontSize: 11, marginTop: 4 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 12 },
  pageInfo: { fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
