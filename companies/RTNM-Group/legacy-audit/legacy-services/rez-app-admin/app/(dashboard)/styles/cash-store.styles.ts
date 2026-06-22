import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
export const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  tabContent: { flex: 1, padding: 16 },
  card: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, marginTop: 2, color: Colors.light.secondaryText },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: { fontSize: 14, color: Colors.light.secondaryText },
  value: { fontSize: 14, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.light.secondaryText, textAlign: 'center' },
});
