import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 12,
  },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiContent: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  kpiSubtext: {
    fontSize: 12,
    color: '#999',
  },
  healthBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  healthValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  healthIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  healthDetail: {
    fontSize: 12,
    marginTop: -4,
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
