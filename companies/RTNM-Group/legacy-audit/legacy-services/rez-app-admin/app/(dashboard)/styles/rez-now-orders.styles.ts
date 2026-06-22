import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Header
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    marginRight: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },

  // Filter bar
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 6,
    backgroundColor: 'transparent',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },

  // Table header
  listSection: {
    padding: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Order card
  orderCard: {
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  orderRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 6,
  },
  orderColMain: {
    flex: 2.2,
    paddingRight: 4,
  },
  orderColMid: {
    flex: 1.8,
    paddingRight: 4,
  },
  orderColRight: {
    flex: 1.6,
    alignItems: 'flex-end',
    gap: 4,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  orderStore: {
    fontSize: 12,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 11,
  },
  orderCustomer: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 3,
  },
  orderItemCount: {
    fontSize: 12,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  expandIcon: {
    marginLeft: 2,
  },

  // Status & payment badges
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 110,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Expanded panel
  expandedPanel: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  expandedLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandedValue: {
    fontSize: 12,
    flex: 1,
  },

  // Items
  itemsContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  itemsHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  itemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '600',
    width: 28,
  },
  itemName: {
    fontSize: 12,
    flex: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  itemTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemTotalValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  noItems: {
    fontSize: 12,
    padding: 10,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 13,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  footer: {
    height: 24,
  },
});
