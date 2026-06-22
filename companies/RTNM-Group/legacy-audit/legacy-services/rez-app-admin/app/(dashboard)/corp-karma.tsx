/**
 * CorpPerks Karma/CSR Dashboard
 * Route: /corp-karma
 *
 * Manage corporate social impact campaigns and karma rewards
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatsCard, StatusBadge, Loading, EmptyState, TabSelector, formatDate } from '@/components/corp-perks';
import { corpKarmaApi, type KarmaCampaign, type KarmaActivity } from '@/services/api/corpKarma';
import { logger } from '@/utils/logger';

const MOCK_CAMPAIGNS: KarmaCampaign[] = [
  {
    _id: '1',
    campaignId: 'KC001',
    name: 'Plant 1000 Trees',
    description: 'Join us in making the planet greener by planting trees',
    category: 'environment',
    status: 'active',
    company: { companyId: 'C001', name: 'Acme Technologies' },
    impactGoal: { metric: 'Trees Planted', target: 1000, current: 650 },
    rewards: { karmaPointsPerAction: 50, bonusPointsOnCompletion: 500 },
    actions: [
      {
        _id: 'a1',
        actionId: 'plant',
        name: 'Plant a Tree',
        description: 'Plant a tree and submit photo evidence',
        type: ' volunteering',
        karmaPoints: 50,
        evidenceRequired: true,
        evidenceTypes: ['photo', 'location'],
      },
    ],
    timeline: { startDate: '2024-03-01', endDate: '2024-06-30' },
    participation: { totalParticipants: 120, completedParticipants: 65, totalActions: 650 },
    createdBy: { userId: 'u1', name: 'Admin' },
    createdAt: '2024-02-15',
    updatedAt: '2024-04-20',
  },
  {
    _id: '2',
    campaignId: 'KC002',
    name: 'Teach a Child',
    description: 'Volunteer to teach underprivileged children',
    category: 'education',
    status: 'active',
    company: { companyId: 'C001', name: 'Acme Technologies' },
    impactGoal: { metric: 'Hours Volunteered', target: 500, current: 320 },
    rewards: { karmaPointsPerAction: 100, bonusPointsOnCompletion: 1000 },
    actions: [
      {
        _id: 'a2',
        actionId: 'teach',
        name: 'Teaching Session',
        description: '1 hour of teaching',
        type: ' volunteering',
        karmaPoints: 100,
        maxPerParticipant: 10,
        evidenceRequired: true,
        evidenceTypes: ['photo', 'selfie'],
      },
    ],
    timeline: { startDate: '2024-04-01', endDate: '2024-09-30' },
    participation: { totalParticipants: 45, completedParticipants: 32, totalActions: 160 },
    createdBy: { userId: 'u1', name: 'HR Admin' },
    createdAt: '2024-03-15',
    updatedAt: '2024-04-20',
  },
  {
    _id: '3',
    campaignId: 'KC003',
    name: 'Beach Cleanup Drive',
    description: 'Help clean up our local beaches',
    category: 'environment',
    status: 'completed',
    company: { companyId: 'C001', name: 'Acme Technologies' },
    impactGoal: { metric: 'Kg Waste Collected', target: 200, current: 250 },
    rewards: { karmaPointsPerAction: 75, bonusPointsOnCompletion: 300 },
    actions: [],
    timeline: { startDate: '2024-01-15', endDate: '2024-02-28' },
    participation: { totalParticipants: 85, completedParticipants: 85, totalActions: 250 },
    createdBy: { userId: 'u1', name: 'Admin' },
    createdAt: '2024-01-01',
    updatedAt: '2024-03-01',
  },
];

export default function CorpKarmaPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [campaigns, setCampaigns] = useState<KarmaCampaign[]>([]);
  const [activities, setActivities] = useState<KarmaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [campaignsResult, activitiesResult] = await Promise.all([
        corpKarmaApi.getCampaigns({ limit: 50 }),
        corpKarmaApi.getActivities({ status: 'pending', limit: 20 }),
      ]);
      setCampaigns(campaignsResult.data);
      setActivities(activitiesResult.data);
    } catch (error) {
      logger.error('Failed to fetch karma data:', error);
      setCampaigns(MOCK_CAMPAIGNS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleVerifyActivity = async (activityId: string, approved: boolean) => {
    try {
      await corpKarmaApi.verifyActivity(activityId, approved);
      setActivities(activities.filter((a) => a.activityId !== activityId));
      Alert.alert('Success', `Activity ${approved ? 'approved' : 'rejected'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to verify activity');
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const totalParticipants = campaigns.reduce((sum, c) => sum + c.participation.totalParticipants, 0);
  const pendingVerifications = activities.filter((a) => a.status === 'pending').length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'environment': return 'leaf-outline';
      case 'education': return 'school-outline';
      case 'health': return 'heart-outline';
      case 'community': return 'people-outline';
      case 'disaster_relief': return 'alert-circle-outline';
      default: return 'star-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'environment': return '#22c55e';
      case 'education': return '#3b82f6';
      case 'health': return '#ef4444';
      case 'community': return '#f59e0b';
      case 'disaster_relief': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'draft', label: 'Draft' },
  ];

  if (loading) {
    return <Loading message="Loading karma campaigns..." />;
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Karma / CSR</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => Alert.alert('New Campaign', 'Campaign creation form would open')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search campaigns..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Active Campaigns"
          value={activeCampaigns.length}
          icon="megaphone-outline"
          iconColor="#22c55e"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Participants"
          value={totalParticipants}
          icon="people-outline"
          iconColor="#3b82f6"
        />
      </View>

      <View style={styles.statsRow}>
        <StatsCard
          title="Pending Verify"
          value={pendingVerifications}
          icon="checkmark-circle-outline"
          iconColor="#f59e0b"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Total Campaigns"
          value={campaigns.length}
          icon="trophy-outline"
          iconColor="#8b5cf6"
        />
      </View>

      {/* Filter Tabs */}
      <TabSelector tabs={tabs} selected={filterStatus} onSelect={setFilterStatus} />

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Pending Verifications */}
        {pendingVerifications > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pending Verifications ({pendingVerifications})
            </Text>
            {activities.slice(0, 3).map((activity) => (
              <Card key={activity.activityId}>
                <View style={styles.activityHeader}>
                  <View style={[styles.avatar, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.avatarText}>
                      {activity.employee?.name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityName, { color: colors.text }]}>
                      {activity.employee?.name}
                    </Text>
                    <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>
                      {activity.action?.name} • {activity.campaign?.name}
                    </Text>
                  </View>
                  <Text style={[styles.karmaPoints, { color: colors.tint }]}>
                    +{activity.karmaEarned}
                  </Text>
                </View>
                <View style={styles.activityActions}>
                  <TouchableOpacity
                    style={[styles.rejectButton, { borderColor: '#ef4444' }]}
                    onPress={() => handleVerifyActivity(activity.activityId, false)}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveButton, { backgroundColor: '#22c55e' }]}
                    onPress={() => handleVerifyActivity(activity.activityId, true)}
                  >
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Campaigns */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Campaigns</Text>

          {filteredCampaigns.length === 0 ? (
            <EmptyState
              icon="trophy-outline"
              title="No Campaigns"
              message="Create your first karma campaign to get started"
              actionLabel="Create Campaign"
              onAction={() => Alert.alert('New Campaign', 'Form would open')}
            />
          ) : (
            filteredCampaigns.map((campaign) => (
              <Card key={campaign._id}>
                <View style={styles.campaignHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(campaign.category) + '20' }]}>
                    <Ionicons
                      name={getCategoryIcon(campaign.category) as any}
                      size={20}
                      color={getCategoryColor(campaign.category)}
                    />
                  </View>
                  <View style={styles.campaignInfo}>
                    <Text style={[styles.campaignName, { color: colors.text }]}>{campaign.name}</Text>
                    <View style={styles.campaignMeta}>
                      <StatusBadge
                        status={campaign.status === 'active' ? 'active' : campaign.status === 'completed' ? 'completed' : 'pending'}
                      />
                      <Text style={[styles.campaignDate, { color: colors.textSecondary }]}>
                        {formatDate(campaign.timeline.startDate)} - {formatDate(campaign.timeline.endDate)}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.campaignDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {campaign.description}
                </Text>

                {/* Impact Progress */}
                <View style={styles.impactSection}>
                  <View style={styles.impactHeader}>
                    <Text style={[styles.impactLabel, { color: colors.text }]}>
                      {campaign.impactGoal.metric}
                    </Text>
                    <Text style={[styles.impactValue, { color: colors.text }]}>
                      {campaign.impactGoal.current} / {campaign.impactGoal.target}
                    </Text>
                  </View>
                  <View style={[styles.impactBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.impactFill,
                        {
                          backgroundColor: getCategoryColor(campaign.category),
                          width: `${Math.min((campaign.impactGoal.current / campaign.impactGoal.target) * 100, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.campaignStats}>
                  <View style={styles.campaignStat}>
                    <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.campaignStatText, { color: colors.textSecondary }]}>
                      {campaign.participation.totalParticipants} joined
                    </Text>
                  </View>
                  <View style={styles.campaignStat}>
                    <Ionicons name="star-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.campaignStatText, { color: colors.textSecondary }]}>
                      +{campaign.rewards.karmaPointsPerAction} karma/action
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

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
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
  },
  activityMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  karmaPoints: {
    fontSize: 16,
    fontWeight: '700',
  },
  activityActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 13,
  },
  approveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  campaignDate: {
    fontSize: 12,
  },
  campaignDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  impactSection: {
    marginBottom: 12,
  },
  impactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  impactLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  impactValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  impactBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  impactFill: {
    height: '100%',
    borderRadius: 3,
  },
  campaignStats: {
    flexDirection: 'row',
    gap: 16,
  },
  campaignStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  campaignStatText: {
    fontSize: 12,
  },
});
