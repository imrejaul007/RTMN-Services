import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';

interface DashboardTabProps {
  dashboardStats: any;
  dashboardLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  colors: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: Colors.light.slateMedium,
  scheduled: Colors.light.info,
  active: Colors.light.success,
  paused: Colors.light.warning,
  exhausted: Colors.light.error,
  expired: Colors.light.secondaryText,
  cancelled: Colors.light.errorDark,
};

export default function DashboardTab({
  dashboardStats,
  dashboardLoading,
  refreshing,
  onRefresh,
  colors,
}: DashboardTabProps) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {dashboardLoading ? (
        <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
      ) : dashboardStats ? (
        <>
          <View style={styles.dashboardGrid}>
            <View style={[styles.dashboardCard, { backgroundColor: colors.infoLight }]}>
              <Text style={[styles.dashboardValue, { color: '#1D4ED8' }]}>
                {dashboardStats.activeCampaigns}
              </Text>
              <Text style={styles.dashboardLabel}>Active Campaigns</Text>
            </View>
            <View style={[styles.dashboardCard, { backgroundColor: colors.successLighter }]}>
              <Text style={[styles.dashboardValue, { color: colors.greenDark }]}>
                {dashboardStats.totalBudgetAllocated?.toLocaleString()}
              </Text>
              <Text style={styles.dashboardLabel}>Total Budget</Text>
            </View>
            <View style={[styles.dashboardCard, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.dashboardValue, { color: colors.warningDark }]}>
                {dashboardStats.totalBudgetConsumed?.toLocaleString()}
              </Text>
              <Text style={styles.dashboardLabel}>Budget Consumed</Text>
            </View>
            <View style={[styles.dashboardCard, { backgroundColor: '#FDF2F8' }]}>
              <Text style={[styles.dashboardValue, { color: '#DB2777' }]}>
                {dashboardStats.totalClaimsLast30d}
              </Text>
              <Text style={styles.dashboardLabel}>Claims (30d)</Text>
            </View>
          </View>

          {dashboardStats.campaignsByStatus && (
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionCardTitle, { color: colors.text }]}>
                Campaigns by Status
              </Text>
              {Object.entries(dashboardStats.campaignsByStatus).map(([status, count]) => (
                <View key={status} style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: STATUS_COLORS[status] || colors.slateMedium },
                    ]}
                  />
                  <Text style={[styles.statusRowLabel, { color: colors.text }]}>
                    {status}
                  </Text>
                  <Text style={styles.statusRowCount}>{count as number}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>No data available</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  dashboardCard: { width: '47%', borderRadius: 12, padding: 16, alignItems: 'center' },
  dashboardValue: { fontSize: 24, fontWeight: '700' },
  dashboardLabel: {
    fontSize: 12,
    color: Colors.light.mutedDark,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  sectionCardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusRowLabel: { flex: 1, fontSize: 13, textTransform: 'capitalize' },
  statusRowCount: { fontSize: 14, fontWeight: '600', color: Colors.light.gray700 },
  emptyText: { fontSize: 14, color: Colors.light.muted, textAlign: 'center', paddingVertical: 40 },
});
