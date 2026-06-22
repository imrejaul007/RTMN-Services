import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  center: { padding: 60, alignItems: 'center' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  section: { paddingHorizontal: 16 },

  // Cards
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1, borderRadius: 12, padding: 16, elevation: 1 },
  cardLabel: { fontSize: 12, marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: '700' },

  // Tables
  tableCard: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  tableTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.light.gray200,
  },
  tableCell: { flex: 1, fontSize: 13 },
  tableCellSmall: { width: 70, fontSize: 12, textAlign: 'right' },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // User cards
  userCard: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: Colors.light.card, fontWeight: '700', fontSize: 15 },
  userName: { fontSize: 14, fontWeight: '600' },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.gray300,
  },
  userStats: { flexDirection: 'row', marginTop: 10, gap: 4 },
  userStat: { flex: 1, alignItems: 'center' },
  userStatValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pageBtn: { paddingHorizontal: 12, paddingVertical: 6 },

  // Config
  configCard: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  configTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fieldLabel: { fontSize: 13, flex: 1 },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 80,
    textAlign: 'right',
    fontSize: 14,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  saveBtnText: { color: Colors.light.card, fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { width: '90%', maxWidth: 400, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.gray300,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalConfirm: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
