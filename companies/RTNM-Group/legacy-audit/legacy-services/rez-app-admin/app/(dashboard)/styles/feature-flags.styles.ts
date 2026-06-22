import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  errorTitle: { fontSize: 17, fontWeight: '700', marginTop: 10 },
  errorMsg: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  filterRow: { paddingVertical: 10, paddingHorizontal: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#333' },

  listContent: { padding: 14 },

  flagCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  flagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  flagInfo: { flex: 1, marginRight: 12 },
  flagKey: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', marginBottom: 3 },
  flagDesc: { fontSize: 12 },

  rolloutContainer: { padding: 10, borderRadius: 8, marginBottom: 10 },
  rolloutText: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  rolloutBar: { height: 6, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  rolloutFill: { height: '100%' },
  rolloutControls: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  rolloutButton: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  rolloutButtonText: { fontSize: 10, fontWeight: '600', color: '#666' },

  flagMeta: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  envBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  envBadgeText: { fontSize: 10, fontWeight: '600' },
  updated: { fontSize: 11 },

  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptySubText: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Merchant overrides tab
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsText: { fontSize: 12 },

  merchantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  merchantIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantId: { fontSize: 13, fontWeight: '700' },
  merchantSub: { fontSize: 12, marginTop: 2 },

  flagPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 4 },
  flagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
    maxWidth: 160,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '600' },

  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  pageBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f0f0f0' },
  pageLabel: { fontSize: 13 },
});
