import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  dirtyIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FCD34D' },
  listContent: { padding: 16, paddingBottom: 100 },
  builderContent: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  centerText: { fontSize: 14, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },

  // List header
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  reorderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  reorderToggleText: { fontSize: 13, fontWeight: '600' },
  reorderActions: { flexDirection: 'row', gap: 8 },
  reorderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },

  // Create form
  createForm: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12, gap: 8 },
  createFormTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  createInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 4 },
  typeChipText: { fontSize: 12, fontWeight: '600' },
  reorderBtnText: { color: Colors.light.card, fontSize: 13, fontWeight: '600' },
});
