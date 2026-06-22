import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
export const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.light.card },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: { fontSize: 13, fontWeight: '600' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '500' },

  userCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: Colors.light.card, fontSize: 14, fontWeight: '700' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 15, fontWeight: '600' },
  userPhone: { fontSize: 12, marginTop: 2 },
  walletBalance: { fontSize: 14, fontWeight: '700', marginTop: 4 },

  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray200,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: { fontSize: 12, fontWeight: '600' },

  campaignHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campaignMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  budgetBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: 6, borderRadius: 3 },
  budgetText: { fontSize: 11 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: { width: '90%', maxWidth: 420, borderRadius: 16, padding: 20 },
  auditModal: { maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSub: { fontSize: 13, marginTop: 2, marginBottom: 16 },

  typePicker: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  typePillText: { fontSize: 13, fontWeight: '600', color: Colors.light.mutedDark },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  helperText: { fontSize: 11, marginTop: -6, marginBottom: 10, paddingHorizontal: 4 },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  auditItem: { paddingVertical: 10, borderBottomWidth: 1 },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditAmount: { fontSize: 14, fontWeight: '700' },
  auditDesc: { fontSize: 12, marginTop: 4 },
  auditDate: { fontSize: 11, marginTop: 4 },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  pageInfo: { fontSize: 13 },
});
