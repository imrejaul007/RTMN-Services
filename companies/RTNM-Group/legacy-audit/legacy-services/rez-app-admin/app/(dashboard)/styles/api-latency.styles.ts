import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12, textAlign: 'center' },
  emptySubText: { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  overallCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a3a52', marginBottom: 12 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCell: { alignItems: 'center', minWidth: 60 },
  metricValue: { fontSize: 18, fontWeight: '800' },
  metricLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  section: { marginHorizontal: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a3a52', marginBottom: 10 },
  endpointCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
  },
  endpointHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  methodText: { fontSize: 11, fontWeight: '700' },
  routeText: { flex: 1, fontSize: 12, color: '#374151', fontFamily: 'monospace' },
  p95Badge: { fontSize: 14, fontWeight: '800' },
  barTrack: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  endpointMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaText: { fontSize: 11, color: '#6B7280' },
});
