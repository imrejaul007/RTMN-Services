/**
 * CorpPerks Campaign Management Page
 * Route: /corp-campaigns
 *
 * Manage corporate gifting campaigns, karma challenges, and rewards
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatsCard, StatusBadge, Loading, EmptyState, TabSelector } from '@/components/corp-perks';
import { logger } from '@/utils/logger';

interface Campaign {
  id: string;
  name: string;
  type: 'gift' | 'karma' | 'reward';
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  target: number;
  participants: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  createdBy: string;
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Diwali Gift Campaign 2024',
    type: 'gift',
    description: 'Corporate Diwali gift distribution for all employees',
    status: 'active',
    target: 500,
    participants: 425,
    budget: 500000,
    spent: 425000,
    startDate: '2024-10-15',
    endDate: '2024-11-05',
    createdBy: 'Admin',
  },
  {
    id: '2',
    name: 'Plant 1000 Trees',
    type: 'karma',
    description: 'Environmental CSR campaign for Earth Day',
    status: 'active',
    target: 1000,
    participants: 156,
    budget: 100000,
    spent: 45000,
    startDate: '2024-04-01',
    endDate: '2024-04-30',
    createdBy: 'HR Team',
  },
  {
    id: '3',
    name: 'Top Performer Rewards',
    type: 'reward',
    description: 'Q1 performance bonus in ReZ Coins',
    status: 'completed',
    target: 50,
    participants: 50,
    budget: 250000,
    spent: 250000,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    createdBy: 'HR Team',
  },
  {
    id: '4',
    name: 'Summer Wellness Challenge',
    type: 'karma',
    description: '30-day fitness challenge with karma rewards',
    status: 'draft',
    target: 200,
    participants: 0,
    budget: 75000,
    spent: 0,
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    createdBy: 'Admin',
  },
];

const CAMPAIGN_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'gift', label: 'Gifts' },
  { key: 'karma', label: 'Karma' },
  { key: 'reward', label: 'Rewards' },
];

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  draft: { color: '#6b7280', bg: '#f3f4f6' },
  active: { color: '#22c55e', bg: '#dcfce7' },
  paused: { color: '#f59e0b', bg: '#fef3c7' },
  completed: { color: '#3b82f6', bg: '#dbeafe' },
};

export default function CorpCampaignsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCampaigns = useCallback(async () => {
    try {
      // In production, fetch from API
      setCampaigns(MOCK_CAMPAIGNS);
    } catch (error) {
      logger.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampaigns();
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesType = filterType === 'all' || campaign.type === filterType;
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
    totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'gift': return 'gift';
      case 'karma': return 'leaf';
      case 'reward': return 'trophy';
      default: return 'star';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'gift': return '#ec4899';
      case 'karma': return '#22c55e';
      case 'reward': return '#f59e0b';
      default: return '#8b5cf6';
    }
  };

  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return <Loading message="Loading campaigns..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Campaigns</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Manage gifting, karma & reward campaigns
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowCreateModal(true)}
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
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Active"
          value={stats.active}
          icon="flash-outline"
          iconColor="#22c55e"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Total Budget"
          value={formatCurrency(stats.totalBudget)}
          icon="wallet-outline"
          iconColor="#3b82f6"
        />
      </View>

      {/* Type Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {CAMPAIGN_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: filterType === type.key ? colors.tint : colors.card },
                ]}
                onPress={() => setFilterType(type.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: filterType === type.key ? '#fff' : colors.text },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Status Filter */}
      <View style={styles.statusFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status.key}
                style={[
                  styles.statusChip,
                  { backgroundColor: filterStatus === status.key ? colors.tint : 'transparent' },
                ]}
                onPress={() => setFilterStatus(status.key)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: filterStatus === status.key ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Campaigns List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredCampaigns.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="No Campaigns Found"
            message="Create your first campaign to get started"
            actionLabel="Create Campaign"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          filteredCampaigns.map((campaign) => {
            const typeColor = getTypeColor(campaign.type);
            const statusConfig = STATUS_COLORS[campaign.status];
            const progress = (campaign.participants / campaign.target) * 100;
            const budgetProgress = (campaign.spent / campaign.budget) * 100;

            return (
              <Card key={campaign.id}>
                {/* Header */}
                <View style={styles.campaignHeader}>
                  <View style={styles.campaignHeaderLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: typeColor + '20' }]}>
                      <Ionicons
                        name={getTypeIcon(campaign.type)}
                        size={20}
                        color={typeColor}
                      />
                    </View>
                    <View style={styles.campaignInfo}>
                      <Text style={[styles.campaignName, { color: colors.text }]}>
                        {campaign.name}
                      </Text>
                      <Text style={[styles.campaignDesc, { color: colors.textSecondary }]}>
                        {campaign.description}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressRow}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                      Participants
                    </Text>
                    <Text style={[styles.progressValue, { color: colors.text }]}>
                      {campaign.participants} / {campaign.target}
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(progress, 100)}%`, backgroundColor: typeColor },
                      ]}
                    />
                  </View>
                </View>

                {/* Budget */}
                <View style={styles.budgetSection}>
                  <View style={styles.progressRow}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                      Budget
                    </Text>
                    <Text style={[styles.progressValue, { color: colors.text }]}>
                      {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(budgetProgress, 100)}%`, backgroundColor: '#3b82f6' },
                      ]}
                    />
                  </View>
                </View>

                {/* Footer */}
                <View style={[styles.campaignFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.footerInfo}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                      {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                    </Text>
                  </View>
                  <View style={styles.footerActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: colors.tint }]}
                      onPress={() => Alert.alert('Edit', 'Edit campaign: ' + campaign.name)}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.tint} />
                      <Text style={[styles.actionBtnText, { color: colors.tint }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#ef4444' }]}
                      onPress={() => Alert.alert('Delete', 'Delete campaign: ' + campaign.name)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Campaign Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Campaign</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Campaign Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Diwali Gift Campaign"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.formLabel, { color: colors.text }]}>Type</Text>
            <View style={styles.typeSelector}>
              {CAMPAIGN_TYPES.slice(1).map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeOption, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name={getTypeIcon(type.key)}
                    size={20}
                    color={getTypeColor(type.key)}
                  />
                  <Text style={[styles.typeOptionText, { color: colors.text }]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Campaign description..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.formLabel, { color: colors.text }]}>Budget</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Budget in INR"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />

            <Text style={[styles.formLabel, { color: colors.text }]}>Start Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.formLabel, { color: colors.text }]}>End Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.tint }]}
              onPress={() => {
                Alert.alert('Success', 'Campaign created successfully!');
                setShowCreateModal(false);
              }}
            >
              <Text style={styles.createBtnText}>Create Campaign</Text>
            </TouchableOpacity>

            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 60 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginVertical: 12 },
  filterContainer: { paddingHorizontal: 16, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  statusFilter: { paddingHorizontal: 16, marginBottom: 12 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusChipText: { fontSize: 12, fontWeight: '500' },
  list: { flex: 1, paddingHorizontal: 16 },
  campaignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  campaignHeaderLeft: { flexDirection: 'row', flex: 1 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  campaignInfo: { flex: 1 },
  campaignName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  campaignDesc: { fontSize: 12, lineHeight: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  progressSection: { marginBottom: 12 },
  budgetSection: { marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12 },
  progressValue: { fontSize: 12, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },
  campaignFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12 },
  footerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '500' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContent: { padding: 16 },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, borderWidth: 1, gap: 6 },
  typeOptionText: { fontSize: 14, fontWeight: '500' },
  createBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
