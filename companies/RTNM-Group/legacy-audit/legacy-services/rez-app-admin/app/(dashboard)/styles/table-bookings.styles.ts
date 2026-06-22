import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginLeft: 34 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 120 },
  emptyContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500' },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', fontSize: 14, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardDate: { marginTop: 4, fontSize: 13 },
  cardCustomer: { fontSize: 12, marginTop: 2 },
  cardNote: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  preOrderBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  preOrderText: { fontSize: 12, color: '#166534', fontWeight: '600' },
});
