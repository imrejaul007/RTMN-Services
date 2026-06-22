import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.info,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    flexShrink: 0,
  },
  createBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },

  // Tab bar
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.light.info },
  tabText: { fontSize: 14, color: Colors.light.muted, fontWeight: '500' },
  tabTextActive: { color: Colors.light.info, fontWeight: '600' },
  countBadge: {
    backgroundColor: Colors.light.info,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeText: { color: Colors.light.card, fontSize: 10, fontWeight: '700' },

  // Filters
  filtersBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  filterChips: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.light.info },
  filterChipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  filterChipTextActive: { color: Colors.light.card, fontWeight: '600' },

  // Card
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, color: Colors.light.muted, marginTop: 2 },
  descText: { fontSize: 12, color: Colors.light.mutedDark, marginTop: 4, lineHeight: 18 },

  // Tier badge
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tierBadgeText: { color: Colors.light.card, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Pricing row
  pricingRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  priceBox: {
    flex: 1,
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  priceLabel: { fontSize: 10, color: Colors.light.muted, fontWeight: '500' },
  priceValue: { fontSize: 16, fontWeight: '700', color: Colors.light.gray900, marginTop: 2 },

  // Benefits
  benefitsSummary: { marginBottom: 10 },
  benefitsSummaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.mutedDark,
    marginBottom: 6,
  },
  benefitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  benefitChip: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  benefitChipText: { fontSize: 10, color: '#6B21A8', fontWeight: '500' },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '500' },

  // Actions
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundSecondary,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionText: { fontSize: 12, fontWeight: '500' },

  // Subscribers
  subscriberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subscriberDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  detailItem: { minWidth: '40%' },
  detailLabel: { fontSize: 11, color: Colors.light.muted },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.light.gray700 },

  // Distribution
  distributionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  distributionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distributionDot: { width: 8, height: 8, borderRadius: 4 },
  distributionText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.info,
  },
  pageBtnDisabled: { backgroundColor: Colors.light.gray300 },
  pageBtnText: { color: Colors.light.card, fontSize: 13, fontWeight: '600' },
  pageInfo: { fontSize: 13, color: Colors.light.mutedDark },

  // Modal / Form
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: Colors.light.info },
  formScroll: { paddingHorizontal: 20 },
  formSection: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.navy,
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
    paddingBottom: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.mutedDark,
    marginTop: 10,
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: { minHeight: 70, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numericInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    width: 80,
    textAlign: 'center',
  },
  benefitFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  featEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
  },
  featEditTitle: { fontSize: 13, fontWeight: '500' },
  addFeatBox: { marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  addFeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.success,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  addFeatBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 13 },

  // Empty
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.light.muted, marginTop: 12, fontWeight: '500' },
  emptySubText: { fontSize: 13, color: Colors.light.gray300, marginTop: 4 },
});
