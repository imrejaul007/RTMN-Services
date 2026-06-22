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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 13,
    color: Colors.light.successLight,
    fontWeight: '500',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.card,
    marginTop: 4,
  },
  heroIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSubRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 20,
  },
  heroSubItem: {
    flex: 1,
  },
  heroSubLabel: {
    fontSize: 11,
    color: Colors.light.successLight,
  },
  heroSubValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.card,
    marginTop: 2,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  netFlowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    gap: 12,
  },
  netFlowText: {
    flex: 1,
  },
  netFlowLabel: {
    fontSize: 12,
  },
  netFlowValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  totalSessionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  totalSessionsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  alertBannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  fraudCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  fraudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fraudIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fraudInfo: {
    flex: 1,
  },
  fraudName: {
    fontSize: 14,
    fontWeight: '700',
  },
  fraudId: {
    fontSize: 11,
    marginTop: 2,
  },
  fraudMetrics: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 20,
  },
  fraudMetricItem: {
    flex: 1,
  },
  fraudMetricLabel: {
    fontSize: 11,
  },
  fraudMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  noAlertsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  noAlertsText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
