import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BonusCampaignAdmin, BonusCampaignClaim, BonusFraudAlert } from '../../../services/api/bonusZone';
import { Colors } from '../../../constants/Colors';
import { format } from 'date-fns';
import { showAlert } from '../../../utils/alert';
import { useBonusCampaignClaims, useBonusFraudAlerts, useRejectBonusClaim } from '../../../hooks/queries/useBonusZone';
import { queryKeys } from '../../../hooks/queries/queryKeys';
import { queryClient } from '../../../config/reactQuery';

interface ClaimsContentProps {
  campaigns: BonusCampaignAdmin[];
}

export default function ClaimsContent({ campaigns }: ClaimsContentProps) {
  const colors = Colors.light;
  const [claimsCampaignId, setClaimsCampaignId] = useState<string | null>(null);
  const [claimsStatusFilter, setClaimsStatusFilter] = useState<string>('all');
  const [claimsPage, setClaimsPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: claimsResult, isLoading: claimsLoading } = useBonusCampaignClaims(
    claimsCampaignId ?? '',
    { page: claimsPage, limit: 20, status: claimsStatusFilter !== 'all' ? claimsStatusFilter : undefined }
  );
  const { data: fraudAlerts, isLoading: fraudAlertsLoading } = useBonusFraudAlerts(50);
  const rejectClaimMutation = useRejectBonusClaim();

  const claims = claimsResult?.claims ?? [];
  const claimsTotalPages = claimsResult?.pagination?.pages ?? 1;

  const CLAIM_STATUS_COLORS: Record<string, string> = {
    pending: colors.warning,
    verified: colors.info,
    credited: colors.success,
    rejected: colors.error,
    expired: colors.secondaryText,
    failed: colors.errorDark,
  };

  const handleReject = async () => {
    if (!rejectingClaimId) return;
    try {
      await rejectClaimMutation.mutateAsync({ claimId: rejectingClaimId, reason: rejectReason || 'Rejected by admin' });
      showAlert('Success', 'Claim rejected successfully');
      setShowRejectModal(false);
      setRejectingClaimId(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.all });
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reject claim');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />
      }
    >
      <Text style={styles.sectionTitle}>Select Campaign</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {campaigns.map((c) => (
          <TouchableOpacity
            key={c._id}
            style={[styles.chip, claimsCampaignId === c._id && styles.chipActive, { marginRight: 8 }]}
            onPress={() => { setClaimsCampaignId(c._id); setClaimsPage(1); }}
          >
            <Text style={[styles.chipText, claimsCampaignId === c._id && styles.chipTextActive]} numberOfLines={1}>
              {c.display?.icon || ''} {c.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {claimsCampaignId && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['all', 'pending', 'verified', 'credited', 'rejected', 'expired'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, claimsStatusFilter === s && styles.chipActive, { marginRight: 8 }]}
              onPress={() => { setClaimsStatusFilter(s); setClaimsPage(1); }}
            >
              <Text style={[styles.chipText, claimsStatusFilter === s && styles.chipTextActive]}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {claimsCampaignId ? (
        claimsLoading ? (
          <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
        ) : claims.length > 0 ? (
          <>
            {claims.map((claim: BonusCampaignClaim) => (
              <View key={claim._id} style={[styles.claimRow, { backgroundColor: colors.card }]}>
                <View style={styles.claimInfo}>
                  <Text style={[styles.claimUser, { color: colors.text }]} numberOfLines={1}>
                    {(typeof claim.userId === 'object'
                      ? claim.userId?.name || claim.userId?.phoneNumber
                      : null) || (typeof claim.userId === 'string' ? claim.userId : 'Unknown')}
                  </Text>
                  <Text style={styles.claimAmount}>{claim.rewardAmount} coins</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${CLAIM_STATUS_COLORS[claim.status] || colors.slateMedium}20` }]}>
                    <View style={[styles.statusDot, { backgroundColor: CLAIM_STATUS_COLORS[claim.status] || colors.slateMedium }]} />
                    <Text style={[styles.statusText, { color: CLAIM_STATUS_COLORS[claim.status] || colors.slateMedium }]}>
                      {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.claimDate}>
                    {formatDate(claim.claimedAt ?? claim.createdAt ?? '')}
                  </Text>
                </View>
                {claim.status !== 'rejected' && claim.status !== 'expired' && (
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => { setRejectingClaimId(claim._id); setShowRejectModal(true); }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {claimsTotalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, claimsPage <= 1 && styles.pageBtnDisabled]}
                  onPress={() => claimsPage > 1 && setClaimsPage(claimsPage - 1)}
                  disabled={claimsPage <= 1}
                >
                  <Text style={styles.pageBtnText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>Page {claimsPage} of {claimsTotalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, claimsPage >= claimsTotalPages && styles.pageBtnDisabled]}
                  onPress={() => claimsPage < claimsTotalPages && setClaimsPage(claimsPage + 1)}
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

      <View style={{ marginTop: 24 }}>
        <View style={styles.fraudAlertsHeader}>
          <Ionicons name="warning-outline" size={20} color={colors.error} />
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: 6 }]}>
            Fraud Alerts
          </Text>
          <TouchableOpacity
            onPress={() => queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.fraudAlerts() })}
            style={{ marginLeft: 'auto' }}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.mutedDark} />
          </TouchableOpacity>
        </View>
        {fraudAlertsLoading ? (
          <ActivityIndicator size="small" color={colors.error} style={{ paddingVertical: 20 }} />
        ) : (fraudAlerts?.length ?? 0) > 0 ? (
          (fraudAlerts ?? []).map((alert: BonusFraudAlert) => {
            const severityColors: Record<string, string> = {
              low: colors.secondaryText,
              medium: colors.warning,
              high: colors.error,
              critical: colors.errorDark,
            };
            return (
              <View
                key={alert._id}
                style={[
                  styles.fraudAlertRow,
                  { backgroundColor: colors.card, borderLeftColor: severityColors[alert.severity] || colors.secondaryText },
                ]}
              >
                <View style={styles.fraudAlertHeader}>
                  <View style={[styles.severityBadge, { backgroundColor: `${severityColors[alert.severity] || colors.secondaryText}20` }]}>
                    <Text style={[styles.severityText, { color: severityColors[alert.severity] || colors.secondaryText }]}>
                      {alert.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.fraudAlertDate}>{formatDate(alert.detectedAt)}</Text>
                </View>
                <Text style={[styles.fraudAlertType, { color: colors.text }]}>{alert.alertType}</Text>
                <Text style={styles.fraudAlertDesc} numberOfLines={2}>{alert.description}</Text>
                {alert.userName && <Text style={styles.fraudAlertUser}>User: {alert.userName}</Text>}
                {alert.campaignTitle && <Text style={styles.fraudAlertCampaign}>Campaign: {alert.campaignTitle}</Text>}
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyContainer, { paddingVertical: 20 }]}>
            <Ionicons name="shield-checkmark-outline" size={36} color={colors.success} />
            <Text style={[styles.emptyText, { color: colors.success }]}>No fraud alerts detected</Text>
          </View>
        )}
      </View>

      <Modal visible={showRejectModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.rejectModalContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.analyticsTitle, { color: colors.text, marginBottom: 12 }]}>Reject Claim</Text>
            <Text style={[styles.formLabel, { marginTop: 0 }]}>Reason for rejection</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea, { color: colors.text, borderColor: colors.border, marginBottom: 16 }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter reason for rejection..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.pageBtn, { flex: 1, backgroundColor: colors.mutedDark, alignItems: 'center' }]}
                onPress={() => { setShowRejectModal(false); setRejectingClaimId(null); }}
              >
                <Text style={styles.pageBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageBtn, { flex: 1, backgroundColor: colors.error, alignItems: 'center' }]}
                onPress={handleReject}
              >
                <Text style={styles.pageBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function formatDate(dateString: string): string {
  try { return format(new Date(dateString), 'MMM dd, yyyy HH:mm'); } catch { return dateString; }
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.backgroundSecondary, marginRight: 8 },
  chipActive: { backgroundColor: Colors.light.info },
  chipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  chipTextActive: { color: Colors.light.card, fontWeight: '600' },
  claimRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.light.gray200, marginBottom: 8 },
  claimInfo: { flex: 1, gap: 4 },
  claimUser: { fontSize: 14, fontWeight: '600' },
  claimAmount: { fontSize: 13, fontWeight: '600', color: Colors.light.success },
  claimDate: { fontSize: 11, color: Colors.light.muted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.light.errorLight, borderRadius: 8, marginLeft: 8 },
  rejectBtnText: { fontSize: 12, fontWeight: '600', color: Colors.light.error },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.light.info, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: Colors.light.card, fontWeight: '500', fontSize: 13 },
  pageInfo: { fontSize: 13, color: Colors.light.mutedDark },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.light.muted, marginTop: 10 },
  fraudAlertsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  fraudAlertRow: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.light.gray200, borderLeftWidth: 4, marginBottom: 8 },
  fraudAlertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  fraudAlertDate: { fontSize: 11, color: Colors.light.muted },
  fraudAlertType: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  fraudAlertDesc: { fontSize: 12, color: Colors.light.mutedDark, marginBottom: 4 },
  fraudAlertUser: { fontSize: 11, color: Colors.light.muted },
  fraudAlertCampaign: { fontSize: 11, color: Colors.light.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  rejectModalContainer: { width: '90%', maxWidth: 400, alignSelf: 'center', borderRadius: 16, padding: 20 },
  analyticsTitle: { fontSize: 18, fontWeight: '700' },
  formLabel: { fontSize: 13, fontWeight: '500', color: Colors.light.mutedDark, marginTop: 10, marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  formTextArea: { minHeight: 80, textAlignVertical: 'top' },
});
