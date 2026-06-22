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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  // Card
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Table
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tableHeader: {
    marginHorizontal: -8,
    marginTop: -8,
    marginBottom: 0,
    paddingHorizontal: 16,
  },
  tableCell: {
    fontSize: 13,
  },
  planCol: {
    flex: 1.2,
  },
  numCol: {
    flex: 0.8,
    textAlign: 'center',
  },
  mrrCol: {
    flex: 1,
    textAlign: 'right',
  },
  percentCol: {
    flex: 0.7,
    textAlign: 'right',
  },

  // Funnel
  funnelContainer: {
    gap: 12,
  },
  funnelLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  funnelBox: {
    height: 40,
    borderRadius: 8,
    minWidth: 40,
  },
  funnelLabel: {
    flex: 1,
  },
  funnelLevelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  funnelCount: {
    fontSize: 12,
    marginTop: 2,
  },

  // Chart
  chartContainer: {
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  emptyChart: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 13,
    textAlign: 'center',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingVertical: 12,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barsGroup: {
    width: '100%',
    height: '100%',
    flexDirection: 'column-reverse',
    gap: 2,
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Merchants list
  merchantList: {
    gap: 0,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  merchantDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  planName: {
    fontSize: 11,
  },
  merchantMrr: {
    fontSize: 13,
  },

  // Trend CTA
  trendCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  trendCtaText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // Actions
  actionsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 11,
  },
});
