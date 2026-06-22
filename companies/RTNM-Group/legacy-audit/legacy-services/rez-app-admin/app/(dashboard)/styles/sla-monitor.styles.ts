import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },

  refreshBtn: { padding: 8, borderRadius: 8 },

  banner: {
    margin: 16,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700' },
  bannerSub: { fontSize: 12, marginTop: 2 },
  socketDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  socketLabel: { fontSize: 11, marginLeft: 4 },

  loadingBox: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 10, fontSize: 14 },

  section: { marginHorizontal: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearBtn: { fontSize: 13, fontWeight: '600' },

  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  cardDetail: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  cardReason: { fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  cardChecked: { fontSize: 11 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  chipText: { fontSize: 11, fontWeight: '700' },

  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, fontWeight: '600', marginTop: 10 },
  emptySubText: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  breachItem: { borderLeftWidth: 3, borderRadius: 8, padding: 10 },
  breachHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  breachMetric: { fontSize: 11, fontWeight: '700', flex: 1 },
  breachTime: { fontSize: 11 },
  breachValue: { fontSize: 13 },

  refCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  refLabel: { fontSize: 13, fontWeight: '600' },
  refBreachVal: { fontSize: 12 },
  refWarnVal: { fontSize: 11 },

  footer: { textAlign: 'center', fontSize: 11, marginTop: 8, marginBottom: 16 },
});
