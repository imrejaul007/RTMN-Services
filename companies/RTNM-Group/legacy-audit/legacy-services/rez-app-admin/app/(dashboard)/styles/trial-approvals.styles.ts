import { StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
export const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Tab Bar
  tabBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.secondaryText,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Lists & Cards
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.secondaryText,
    marginTop: 16,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 12,
    color: Colors.light.secondaryText,
    fontWeight: '500',
    marginBottom: 6,
  },
  imageContainer: {
    height: 140,
  },
  trialImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: Colors.light.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  detailChip: {
    flex: 1,
    backgroundColor: Colors.light.backgroundTertiary,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.light.secondaryText,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnLg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectBtnStyle: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 12,
  },
  approveBtnStyle: {
    borderColor: '#DCFCE7',
    backgroundColor: '#F0FDF4',
  },
  approveBtnText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 12,
  },

  // Fraud
  fraudHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  signalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  signalBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  signalText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  dateText: {
    fontSize: 11,
    color: Colors.light.secondaryText,
  },
  dateRow: {
    marginTop: 4,
  },

  // Breakage
  statCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.light.secondaryText,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  statRowLabel: {
    fontSize: 13,
    color: Colors.light.secondaryText,
  },
  statRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },

  // Governor
  governorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  governorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Campaigns
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#F0FDF4',
  },
  inactiveBadge: {
    backgroundColor: '#F9FAFB',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: '#10B981',
  },
  inactiveText: {
    color: '#94A3B8',
  },

  // Bundles
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  passBadge: {
    backgroundColor: '#EFF6FF',
  },
  packBadge: {
    backgroundColor: '#FDF4FF',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  strikePrice: {
    fontSize: 12,
    color: Colors.light.success,
    fontWeight: '600',
    marginBottom: 8,
  },
  togglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 12,
    color: Colors.light.secondaryText,
    fontWeight: '500',
  },
  purchaseCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  detailImage: {
    width: '100%',
    height: 200,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.light.secondaryText,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  termsText: {
    fontSize: 12,
    color: Colors.light.secondaryText,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },

  // Reject Modal
  rejectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  rejectModalContent: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  rejectModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  rejectInput: {
    backgroundColor: Colors.light.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    color: Colors.light.text,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  rejectFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  rejectCancelText: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 14,
  },
  rejectConfirm: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
