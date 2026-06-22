import { Platform, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveText: { fontSize: 12, color: '#7C2D12', fontWeight: '600' },
  newBadge: {
    marginLeft: 'auto',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeContainer: {
    backgroundColor: '#FCA5A5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filterContainer: {
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  filterTabActive: {
    backgroundColor: '#DC2626',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.secondaryText,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.secondaryText,
    marginTop: 8,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  userBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  userDetails: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  merchantName: {
    fontSize: 11,
    color: Colors.light.secondaryText,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.light.secondaryText,
  },
  signalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  signalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  signalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  viewButton: {
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
  },
  viewButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 12,
  },
  suspendButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  suspendButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 12,
  },
});
