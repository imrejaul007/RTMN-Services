import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
export const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statsCard: {
    minWidth: 90,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  statsLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  // Category filter
  categoryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  // Sort
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // User list
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.warning,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  coinAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.warningDark,
  },
  userMiniStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    justifyContent: 'space-between',
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatText: {
    fontSize: 11,
  },
  // Detail modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingTop: 12,
  },
  detailModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.slateLight,
    alignSelf: 'center',
    marginBottom: 8,
  },
  detailCloseButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
  },
  detailScrollView: {
    paddingHorizontal: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    marginTop: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailStatBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  detailStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  detailStatSmallValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  detailStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  // Brand rows
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '600',
  },
  brandPurchases: {
    fontSize: 12,
    marginTop: 2,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Missions
  missionRow: {
    marginBottom: 12,
  },
  missionInfo: {
    marginBottom: 6,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  missionProgress: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  // Category coins grid - responsive layout
  catCoinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  catCoinCard: {
    minWidth: '22%',
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCoinAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  catCoinLabel: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  // Detail actions
  detailActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  detailActionText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 12,
  },
  // Add coins modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  coinCategoryScroll: {
    marginBottom: 16,
    maxHeight: 40,
  },
  coinCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  coinCategoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
  },
  // Empty
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
});
