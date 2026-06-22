import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitleBlock: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  scroll: { flex: 1 },
  scrollContent: { padding: 14 },

  // Slug card
  slugCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  slugIcon: { marginBottom: 12 },
  slugHeading: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  slugHint: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  slugInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  loadBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  changeStoreRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  goBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  presetRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  presetBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetBtnText: { fontSize: 11, fontWeight: '600' },

  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  dateField: { flex: 1 },
  dateFieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  dateArrow: { marginTop: 16 },

  dateRangeLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },

  centered: { paddingVertical: 48, alignItems: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  errorMsg: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 16 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // 2×2 stat grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { width: '47.5%', padding: 14, borderRadius: 12, borderWidth: 1 },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },

  // Generic section card
  section: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },

  // Bar chart
  barChartScroll: { gap: 6, paddingBottom: 4, alignItems: 'flex-end' },
  barWrapper: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  barRevenueLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center', height: 12 },
  barFill: { width: 20, borderRadius: 4, minHeight: 3 },
  barDateLabel: { fontSize: 9, textAlign: 'center', marginTop: 2 },
  barOrdersLabel: { fontSize: 8, textAlign: 'center', height: 12 },
  barChartNote: { fontSize: 10, marginTop: 8, textAlign: 'center' },

  // Payment methods
  pmBar: {
    flexDirection: 'row',
    height: 28,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  pmSegment: { height: '100%' },
  pmLegend: { gap: 6 },
  pmLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pmDot: { width: 10, height: 10, borderRadius: 5 },
  pmLegendText: { fontSize: 13, fontWeight: '500' },

  // Top items table
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  tableHeader: { marginBottom: 2 },
  tableCell: { fontSize: 13 },
  tableCellRank: { width: 32, alignItems: 'center' },
  tableCellName: { flex: 1, paddingHorizontal: 4 },
  tableCellNum: { width: 72, textAlign: 'right' },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { fontSize: 10, fontWeight: '800' },

  emptyNote: { fontSize: 14, marginTop: 12, textAlign: 'center' },

  bottomPad: { height: 24 },
});
