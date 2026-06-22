import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, useColorScheme, RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import {
  instituteReferralsService,
  InstituteReferral,
  ReferralStatus,
} from '../../services/api/instituteReferrals';
import { showAlert, showConfirm } from '../../utils/alert';
import { format } from 'date-fns';
import { s } from './styles/institute-referrals.styles';

const STATUS_TABS: { label: string; value: ReferralStatus | 'all' }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Onboarded', value: 'onboarded' },
  { label: 'Declined', value: 'declined' },
];

export default function InstituteReferralsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [referrals, setReferrals] = useState<InstituteReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ReferralStatus>('pending');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await instituteReferralsService.getReferrals({
        status: activeTab,
        page: 1,
        limit: 50,
      });
      setReferrals(result.referrals);
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (id: string, status: ReferralStatus) => {
    try {
      await instituteReferralsService.updateStatus(id, status);
      showAlert('Updated', `Status changed to ${status}`);
      loadData();
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const handleOnboard = async (referral: InstituteReferral) => {
    const confirmed = await showConfirm(
      'Mark Onboarded',
      `This will:\n1. Credit coins to the referrer\n2. Send notification\n\nContinue?`
    );
    if (!confirmed) return;

    try {
      const result = await instituteReferralsService.markOnboarded(referral._id);
      showAlert(
        'Onboarded',
        `${result.instituteName} marked as onboarded. Go to Institutions screen to add email domains for auto-verify.`
      );
      loadData();
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const renderItem = useCallback(({ item }: { item: InstituteReferral }) => {
    const referrerName = item.submittedBy?.profile
      ? `${item.submittedBy.profile.firstName || ''} ${item.submittedBy.profile.lastName || ''}`.trim()
      : item.submittedBy?.phoneNumber || 'Unknown';

    return (
      <View style={[s.card, { backgroundColor: colors.background }]}>
        <View style={s.cardHeader}>
          <Text style={[s.cardName, { color: colors.text }]}>
            {item.instituteName}
          </Text>
          <View style={[s.typeBadge]}>
            <Text style={s.typeBadgeText}>
              {item.instituteType.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: colors.text + '99', marginBottom: 2 }}>
          Referred by: {referrerName}
        </Text>
        {item.adminContactEmail && (
          <Text style={{ fontSize: 13, color: colors.tint, marginBottom: 2 }}>
            Admin: {item.adminContactEmail}
          </Text>
        )}
        <Text style={{ fontSize: 12, color: colors.text + '66', marginBottom: 8 }}>
          {item.city} · {format(new Date(item.createdAt), 'dd MMM yyyy')}
        </Text>

        <View style={s.cardActions}>
          {item.status === 'pending' && (
            <TouchableOpacity
              onPress={() => handleStatusUpdate(item._id, 'contacted')}
              style={[s.actionBtn, { backgroundColor: colors.tint + '15' }]}
            >
              <Text style={{ fontSize: 13, color: colors.tint, fontWeight: '600' }}>
                Mark Contacted
              </Text>
            </TouchableOpacity>
          )}
          {(item.status === 'pending' || item.status === 'contacted') && (
            <TouchableOpacity
              onPress={() => handleOnboard(item)}
              style={[s.actionBtn, { backgroundColor: '#dcfce7' }]}
            >
              <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '600' }}>
                Mark Onboarded
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [colors]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Text style={[s.headerTitle, { color: colors.text }]}>
        Institute Referral Leads
      </Text>

      {/* Status Tabs */}
      <View style={s.tabRow}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[
              s.tab,
              activeTab === tab.value && { backgroundColor: colors.tint },
            ]}
            onPress={() => setActiveTab(tab.value as ReferralStatus)}
          >
            <Text
              style={[
                s.tabText,
                activeTab === tab.value && { color: '#fff' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={referrals}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
          ) : (
            <Text style={[s.emptyText, { color: colors.text + '66' }]}>
              No {activeTab} referrals
            </Text>
          )
        }
      />
    </View>
  );
}

