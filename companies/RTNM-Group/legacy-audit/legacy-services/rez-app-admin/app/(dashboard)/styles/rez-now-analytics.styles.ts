import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
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

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 14 },

  // Slug input card
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

  // Inline store change bar
  changeStoreRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  goBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Period selector
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodBtnText: { fontSize: 12, fontWeight: '600' },

  // Loading / error
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  errorMsg: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 16 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // 2×2 stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: '47.5%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
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
  section: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  peakBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Status pills
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillLabel: { fontSize: 12, fontWeight: '600' },
  pillCount: { fontSize: 12, fontWeight: '700' },

  // Top items
  topItemsScroll: { paddingRight: 4, gap: 10 },
  itemCard: {
    width: 120,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  itemRankBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 4,
  },
  itemRankText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  itemName: { fontSize: 13, fontWeight: '600', lineHeight: 17 },
  itemCount: { fontSize: 11, marginTop: 2 },
  itemRevenue: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  // Hour chart
  hourChartScroll: { gap: 4, paddingBottom: 2 },
  hourBarWrapper: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 128,
    gap: 2,
  },
  hourBarCount: { fontSize: 8, fontWeight: '700', height: 12, textAlign: 'center' },
  hourBar: { width: 14, borderRadius: 3, minHeight: 2 },
  hourLabel: { fontSize: 8, textAlign: 'center' },

  // New vs returning
  nvrBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  nvrSegment: { height: '100%' },
  nvrLegend: { gap: 6 },
  nvrLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nvrDot: { width: 10, height: 10, borderRadius: 5 },
  nvrLegendText: { fontSize: 13, fontWeight: '500' },

  emptyNote: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },

  bottomPad: { height: 24 },
});
