import { StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
export const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createBtnText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },

  // Global Config Card
  globalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  globalCardEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  globalEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  globalEmptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  globalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  globalCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  globalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  globalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rewardsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  rewardPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  rewardPreviewText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rewardPreviewCoins: {
    fontSize: 12,
    fontWeight: '700',
  },
  globalSummary: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 12,
    gap: 24,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  globalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  globalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  globalActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Config Card
  configCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  configEventName: {
    fontSize: 15,
    fontWeight: '600',
  },
  configMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
  },
  rewardsList: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
  },
  rewardListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardItemAction: {
    flex: 1,
    fontSize: 13,
  },
  rewardItemCoins: {
    fontSize: 13,
    fontWeight: '700',
  },
  rewardItemLimit: {
    fontSize: 11,
  },
  moreRewards: {
    fontSize: 11,
    marginTop: 4,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  validityText: {
    fontSize: 11,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
  },

  // Form
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  formSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  formSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
  },

  // Event Select
  eventSelectBtn: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  selectedEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedEventName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  eventSelectPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventSelectPlaceholderText: {
    fontSize: 14,
  },

  // Reward Form Items
  addRewardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addRewardBtnText: {
    color: Colors.light.card,
    fontSize: 12,
    fontWeight: '600',
  },
  rewardFormItem: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  rewardFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardFormIndex: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginRight: 6,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  switchRowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchRowHint: {
    fontSize: 11,
    marginTop: 2,
  },
  noRewardsBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noRewardsText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Event Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerContent: {
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerItemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  pickerEmpty: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  pickerEmptyText: {
    fontSize: 14,
  },
});
