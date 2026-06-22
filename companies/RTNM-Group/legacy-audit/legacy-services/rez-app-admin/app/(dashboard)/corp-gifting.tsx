/**
 * CorpPerks Gifting Page
 * Route: /corp-gifting
 * Manage corporate gift campaigns
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatsCard, StatusBadge, Loading, EmptyState } from '@/components/corp-perks';
import { corpGiftingApi, type GiftCampaign } from '@/services/api/corpGifting';
import { logger } from '@/utils/logger';

const MOCK_CAMPAIGNS: GiftCampaign[] = [
  {
    _id: '1',
    campaignId: 'GC001',
    name: 'Diwali 2024',
    description: 'Annual Diwali gift distribution',
    type: 'festival',
    status: 'completed',
    budget: 750000,
    spent: 712500,
    recipientCount: 150,
    recipientCriteria: {},
    giftSelection: { giftIds: [], allowChoice: false, giftValueMin: 0, giftValueMax: 0 },
    schedule: { sendDate: '2024-10-25', deadline: '2024-10-30', timezone: 'IST' },
    branding: { includeCompanyLogo: true, customMessage: true },
    fulfillment: { type: 'bulk', deliveryMethod: 'office' },
    analytics: { sent: 150, delivered: 148, opened: 140, redeemed: 120 },
    createdBy: { userId: 'u1', name: 'Admin', role: 'corp_admin' },
    createdAt: '2024-10-01',
    updatedAt: '2024-10-30',
  },
  {
    _id: '2',
    campaignId: 'GC002',
    name: 'Employee Anniversaries Q4',
    description: 'Work anniversary gifts for Q4',
    type: 'milestone',
    status: 'active',
    budget: 225000,
    spent: 90000,
    recipientCount: 45,
    recipientCriteria: {},
    giftSelection: { giftIds: [], allowChoice: true, giftValueMin: 1000, giftValueMax: 5000 },
    schedule: { sendDate: '2024-12-15', deadline: '2024-12-31', timezone: 'IST' },
    branding: { includeCompanyLogo: true, customMessage: true },
    fulfillment: { type: 'direct', deliveryMethod: 'home' },
    analytics: { sent: 30, delivered: 28, opened: 25, redeemed: 20 },
    createdBy: { userId: 'u1', name: 'HR Admin', role: 'corp_hr' },
    createdAt: '2024-11-01',
    updatedAt: '2024-12-01',
  },
  {
    _id: '3',
    campaignId: 'GC003',
    name: 'Top Clients Thank You',
    description: 'Thank you gifts for top clients',
    type: 'client',
    status: 'draft',
    budget: 125000,
    spent: 0,
    recipientCount: 25,
    recipientCriteria: {},
    giftSelection: { giftIds: [], allowChoice: false, giftValueMin: 0, giftValueMax: 0 },
    schedule: { sendDate: '2024-12-20', deadline: '2024-12-31', timezone: 'IST' },
    branding: { includeCompanyLogo: true, customMessage: true },
    fulfillment: { type: 'bulk', deliveryMethod: 'office' },
    analytics: { sent: 0, delivered: 0, opened: 0, redeemed: 0 },
    createdBy: { userId: 'u1', name: 'Sales Admin', role: 'corp_manager' },
    createdAt: '2024-11-15',
    updatedAt: '2024-11-15',
  },
];

export default function CorpGiftingPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [campaigns, setCampaigns] = useState<GiftCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const result = await corpGiftingApi.getCampaigns({ limit: 50 });
      setCampaigns(result.data);
    } catch (error) {
      logger.error('Failed to fetch campaigns:', error);
      setCampaigns(MOCK_CAMPAIGNS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCampaigns();
  }, [fetchCampaigns]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'festival':
        return 'flame-outline';
      case 'milestone':
        return 'trophy-outline';
      case 'client':
        return 'handshake-outline';
      case 'thank_you':
        return 'heart-outline';
      default:
        return 'gift-outline';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <StatusBadge status="active" />;
      case 'completed':
        return <StatusBadge status="approved" label="Completed" />;
      case 'draft':
        return <StatusBadge status="pending" />;
      case 'cancelled':
        return <StatusBadge status="rejected" />;
      default:
        return null;
    }
  };

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const totalRecipients = campaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);

  if (loading) {
    return <Loading message="Loading campaigns..." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Corporate Gifting</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => Alert.alert('Create Campaign', 'Form to create new gift campaign')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>New Campaign</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search campaigns..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Active Campaigns"
          value={activeCampaigns.length}
          icon="megaphone-outline"
          iconColor="#3b82f6"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Total Recipients"
          value={totalRecipients}
          icon="people-outline"
          iconColor="#22c55e"
        />
      </View>
      <View style={styles.statsRow}>
        <StatsCard
          title="Total Budget"
          value={formatCurrency(totalBudget)}
          icon="wallet-outline"
          iconColor="#f59e0b"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Campaigns Created"
          value={campaigns.length}
          icon="gift-outline"
          iconColor="#ec4899"
        />
      </View>

      {/* Campaigns List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {campaigns.length === 0 ? (
          <EmptyState
            icon="gift-outline"
            title="No Campaigns"
            message="Create your first gift campaign to get started"
            actionLabel="Create Campaign"
            onAction={() => Alert.alert('Create Campaign', 'Form would open here')}
          />
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign._id}>
              <View style={styles.campaignHeader}>
                <View style={styles.campaignInfo}>
                  <View style={styles.campaignTitleRow}>
                    <View style={[styles.typeIcon, { backgroundColor: colors.tint + '20' }]}>
                      <Ionicons
                        name={getTypeIcon(campaign.type)}
                        size={18}
                        color={colors.tint}
                      />
                    </View>
                    <Text style={[styles.campaignName, { color: colors.text }]}>
                      {campaign.name}
                    </Text>
                  </View>
                  <Text style={[styles.campaignType, { color: colors.textSecondary }]}>
                    {campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)} Campaign
                  </Text>
                </View>
                {getStatusBadge(campaign.status)}
              </View>

              <View style={styles.campaignStats}>
                <View style={styles.campaignStat}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.campaignStatText, { color: colors.textSecondary }]}>
                    {campaign.recipientCount || 0} recipients
                  </Text>
                </View>
                <View style={styles.campaignStat}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.campaignStatText, { color: colors.textSecondary }]}>
                    {new Date(campaign.sendDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* Budget Progress */}
              <View style={styles.budgetSection}>
                <View style={styles.budgetHeader}>
                  <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>
                    Budget Utilization
                  </Text>
                  <Text style={[styles.budgetValue, { color: colors.text }]}>
                    {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                  </Text>
                </View>
                <View style={[styles.budgetBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.budgetFill,
                      {
                        backgroundColor: colors.tint,
                        width: `${(campaign.spent / campaign.budget) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
  },
  campaignType: {
    fontSize: 12,
    marginLeft: 40,
  },
  campaignStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  campaignStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  campaignStatText: {
    fontSize: 12,
  },
  budgetSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: 11,
  },
  budgetValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  budgetBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 3,
  },
});
