import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a3a52',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  summaryRow: { flexDirection: 'row', gap: 10, padding: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    elevation: 1,
    alignItems: 'center',
  },
  summaryNum: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  section: { paddingHorizontal: 16 },
  billerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  billerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  billerName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1a3a52' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  billerMeta: { flexDirection: 'row', justifyContent: 'space-around' },
  metaItem: { alignItems: 'center' },
  metaValue: { fontSize: 16, fontWeight: '800', color: '#1a3a52' },
  metaLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
