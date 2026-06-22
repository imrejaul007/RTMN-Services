import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  // Hero card
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 14 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 13, color: Colors.light.warningLight, fontWeight: '500' },
  heroValue: { fontSize: 32, fontWeight: '800', color: Colors.light.card, marginTop: 4 },
  heroIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSubRow: { flexDirection: 'row', marginTop: 16, gap: 20 },
  heroSubItem: { flex: 1 },
  heroSubLabel: { fontSize: 11, color: Colors.light.warningLight },
  heroSubValue: { fontSize: 16, fontWeight: '700', color: Colors.light.card, marginTop: 2 },

  // Card grid
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  alertBannerText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Chart card (fraud bars)
  chartCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  chartTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  barLabel: { width: 28, fontSize: 10, textAlign: 'right', marginRight: 8 },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { width: 24, fontSize: 10, textAlign: 'center', marginLeft: 6 },

  // Fraud cards
  fraudCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  fraudHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fraudIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fraudInfo: { flex: 1 },
  fraudName: { fontSize: 14, fontWeight: '700' },
  fraudId: { fontSize: 11, marginTop: 2 },
  fraudMetrics: { flexDirection: 'row', marginTop: 12, gap: 20 },
  fraudMetricItem: { flex: 1 },
  fraudMetricLabel: { fontSize: 11 },
  fraudMetricValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },

  // No alerts
  noAlertsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  noAlertsText: { fontSize: 14, fontWeight: '500', flex: 1 },

  // Issuance card
  issuanceCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  issuanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  issuanceItem: { alignItems: 'center', flex: 1 },
  issuanceLabel: { fontSize: 11 },
  issuanceBigValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },

  // Sources card
  sourcesCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 4 },
  sourcesTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  sourceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  sourceRank: { fontSize: 12, fontWeight: '600', width: 24 },
  sourceName: { fontSize: 13, fontWeight: '500' },
  sourceStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceAmount: { fontSize: 14, fontWeight: '700' },
  sourceBadge: {
    backgroundColor: Colors.light.infoLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sourceBadgeText: { fontSize: 10, color: Colors.light.info, fontWeight: '600' },

  // Info row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 14, fontWeight: '700' },

  // Warning row
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 4,
  },
  warningText: { fontSize: 13, fontWeight: '500' },

  // Settlement table
  tableCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  tableTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  tableHeaderText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  tableCell: { fontSize: 13 },
  cycleBadge: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cycleBadgeText: { fontSize: 10, color: Colors.light.mutedDark, fontWeight: '600' },

  // Last updated
  lastUpdated: { alignItems: 'center', marginTop: 16 },
  lastUpdatedText: { fontSize: 11 },

  // Coin liability breakdown
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  coinBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  coinTypeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  coinTypeLabel: { flex: 1, fontSize: 13, color: '#374151' },
  coinTypeCoins: { fontSize: 12, color: '#6B7280', marginRight: 12 },
  coinTypeLiability: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a3a52',
    minWidth: 70,
    textAlign: 'right',
  },
  coinBreakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
  },
  coinTotalLabel: { fontSize: 14, fontWeight: '700', color: '#1a3a52' },
  coinTotalValue: { fontSize: 16, fontWeight: '800', color: '#DC2626' },
});
