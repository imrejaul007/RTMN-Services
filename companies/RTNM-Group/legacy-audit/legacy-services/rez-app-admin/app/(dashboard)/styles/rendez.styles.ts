import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { padding: 20, paddingTop: 48 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#e9d5ff' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
  },
  errorText: { color: '#ef4444', fontSize: 12, flex: 1 },

  section: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { borderRadius: 14, padding: 14, width: '47%', gap: 6 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },

  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  linkBtnText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
