import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleBtn: {
    padding: 6,
  },
  statsBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  statsBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 22,
  },
  targetBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  deleteBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
});
