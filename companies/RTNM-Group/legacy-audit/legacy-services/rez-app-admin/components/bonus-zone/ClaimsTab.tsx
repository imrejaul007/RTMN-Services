import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BonusCampaignAdmin, BonusCampaignClaim } from '../../services/api/bonusZone';
import { Colors } from '../../constants/Colors';
import FraudAlertRow from './FraudAlertRow';

interface ClaimsTabProps {
  campaigns: BonusCampaignAdmin[];
  claimsCampaignId: string | null;
  setClaimsCampaignId: (id: string | null) => void;
  claims: BonusCampaignClaim[];
  claimsLoading: boolean;
  claimsPage: number;
  claimsTotalPages: number;
  claimsStatusFilter: string;
  setClaimsStatusFilter: (s: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  loadClaimsForCampaign: (campaignId: string, pageNum: number) => void;
  openRejectModal: (claimId: string) => void;
  fraudAlerts: any[];
  fraudAlertsLoading: boolean;
  loadFraudAlerts: () => void;
  colors: Record<string, string>;
}

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export default function ClaimsTab({
  campaigns,
  claimsCampaignId,
  setClaimsCampaignId,
  claims,
  claimsLoading,
  claimsPage,
  claimsTotalPages,
  claimsStatusFilter,
  setClaimsStatusFilter,
  refreshing,
  onRefresh,
  loadClaimsForCampaign,
  openRejectModal,
  fraudAlerts,
  fraudAlertsLoading,
  loadFraudAlerts,
  colors,
}: ClaimsTabProps) {
  const CLAIM_STATUS_COLORS: Record<string, string> = {
    pending: colors.warning,
    verified: colors.info,
    credited: colors.success,
    rejected: colors.error,
    expired: colors.secondaryText,
    failed: colors.errorDark,
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Campaign Selector */}
      <Text style={[styles.sectionCardTitle, { color: colors.text, marginBottom: 8 }]}>
        Select Campaign
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {campaigns.map((c) => (
          <TouchableOpacity
            key={c._id}
            style={[
              styles.filterChip,
              claimsCampaignId === c._id && styles.filterChipActive,
              { marginRight: 8 },
            ]}
            onPress={() => {
              setClaimsCampaignId(c._id);
              loadClaimsForCampaign(c._id, 1);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                claimsCampaignId === c._id && styles.filterChipTextActive,
              ]}
              numberOfLines={1}
            >
              {c.display?.icon || ''} {c.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status filter */}
      {claimsCampaignId && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['all', 'pending', 'verified', 'credited', 'rejected', 'expired'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterChip,
                claimsStatusFilter === s && styles.filterChipActive,
                { marginRight: 8 },
              ]}
              onPress={() => {
                setClaimsStatusFilter(s);
                if (claimsCampaignId) {
                  setTimeout(() => loadClaimsForCampaign(claimsCampaignId, 1), 0);
                }
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  claimsStatusFilter === s && styles.filterChipTextActive,
                ]}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Claims List */}
      {claimsCampaignId ? (
        claimsLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.info}
            style={{ paddingVertical: 40 }}
          />
        ) : claims.length > 0 ? (
          <>
            {claims.map((claim) => {
              const statusColor = CLAIM_STATUS_COLORS[claim.status] || colors.slateMedium;
              return (
                <View
                  key={claim._id}
                  style={[styles.claimRow, { backgroundColor: colors.card }]}
                >
                  <View style={styles.claimInfo}>
                    <Text style={[styles.claimUser, { color: colors.text }]} numberOfLines={1}>
                      {(typeof claim.userId === 'object'
                        ? claim.userId?.name || claim.userId?.phoneNumber
                        : null) ||
                        (typeof claim.userId === 'string' ? claim.userId : 'Unknown')}
                    </Text>
                    <Text style={styles.claimAmount}>{claim.rewardAmount} coins</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${statusColor}20` },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.claimDate}>
                      {formatDate((claim.claimedAt || claim.createdAt) ?? '')}
                    </Text>
                  </View>
                  {claim.status !== 'rejected' && claim.status !== 'expired' && (
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => openRejectModal(claim._id)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {claimsTotalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, claimsPage <= 1 && styles.pageBtnDisabled]}
                  onPress={() =>
                    claimsPage > 1 && loadClaimsForCampaign(claimsCampaignId, claimsPage - 1)
                  }
                  disabled={claimsPage <= 1}
                >
                  <Text style={styles.pageBtnText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  Page {claimsPage} of {claimsTotalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, claimsPage >= claimsTotalPages && styles.pageBtnDisabled]}
                  onPress={() =>
                    claimsPage < claimsTotalPages &&
                    loadClaimsForCampaign(claimsCampaignId, claimsPage + 1)
                  }
                  disabled={claimsPage >= claimsTotalPages}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.gray300} />
            <Text style={styles.emptyText}>No claims found for this campaign</Text>
          </View>
        )
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="arrow-up-outline" size={48} color={colors.gray300} />
          <Text style={styles.emptyText}>Select a campaign above to view claims</Text>
        </View>
      )}

      {/* Fraud Alerts Section */}
      <View style={{ marginTop: 24 }}>
        <View style={styles.fraudAlertsHeader}>
          <Ionicons name="warning-outline" size={20} color={colors.error} />
          <Text
            style={[
              styles.sectionCardTitle,
              { color: colors.text, marginBottom: 0, marginLeft: 6 },
            ]}
          >
            Fraud Alerts
          </Text>
          <TouchableOpacity onPress={loadFraudAlerts} style={{ marginLeft: 'auto' }}>
            <Ionicons name="refresh-outline" size={18} color={colors.mutedDark} />
          </TouchableOpacity>
        </View>
        {fraudAlertsLoading ? (
          <ActivityIndicator
            size="small"
            color={colors.error}
            style={{ paddingVertical: 20 }}
          />
        ) : fraudAlerts.length > 0 ? (
          fraudAlerts.map((alert: any) => (
            <FraudAlertRow key={alert._id} alert={alert} colors={colors} />
          ))
        ) : (
          <View style={[styles.emptyContainer, { paddingVertical: 20 }]}>
            <Ionicons name="shield-checkmark-outline" size={36} color={colors.success} />
            <Text style={[styles.emptyText, { color: colors.success }]}>
              No fraud alerts detected
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionCardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.light.info },
  filterChipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  filterChipTextActive: { color: Colors.light.card, fontWeight: '600' },
  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    marginBottom: 8,
  },
  claimInfo: { flex: 1, gap: 4 },
  claimUser: { fontSize: 14, fontWeight: '600' },
  claimAmount: { fontSize: 13, fontWeight: '600', color: Colors.light.success },
  claimDate: { fontSize: 11, color: Colors.light.muted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.light.errorLight,
    borderRadius: 8,
    marginLeft: 8,
  },
  rejectBtnText: { fontSize: 12, fontWeight: '600', color: Colors.light.error },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.info,
    borderRadius: 8,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: Colors.light.card, fontWeight: '500', fontSize: 13 },
  pageInfo: { fontSize: 13, color: Colors.light.mutedDark },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.light.muted, marginTop: 10 },
  fraudAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
});
