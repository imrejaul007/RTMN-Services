import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
export const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 14, marginBottom: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.light.secondaryText },
});
