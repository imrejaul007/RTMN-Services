import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13 },
  backBtn: { padding: 4 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, marginTop: 2, color: Colors.light.secondaryText },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 14, color: Colors.light.secondaryText },
  value: { fontSize: 14, fontWeight: '600' },
});
