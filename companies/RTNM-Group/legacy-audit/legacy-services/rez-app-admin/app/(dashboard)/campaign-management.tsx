import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/campaign-management.styles';

interface Campaign {
  _id: string;
  title: string;
  subtitle: string;
  type: 'mission_sprint' | 'festival' | 'category_push';
  targetCity?: string;
  targetCategory?: string;
  startDate: string;
  endDate: string;
  targetTrialCount: number;
  participants: number;
  completions: number;
  status: 'active' | 'upcoming' | 'ended';
  rewardCoins: number;
  trialCoins: number;
}

type FilterType = 'all' | 'active' | 'upcoming' | 'ended';

export default function CampaignManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    type: 'mission_sprint' as 'mission_sprint' | 'festival' | 'category_push',
    targetCategory: '',
    targetCity: '',
    targetTrialCount: '10',
    rewardCoins: '100',
    trialCoins: '50',
    bonusBadgeName: '',
    startDate: '',
    endDate: '',
  });

  // Load campaigns from API
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/campaigns');
      setCampaigns((response.data as unknown as {campaigns?: Campaign[]})?.campaigns || (response.data as Campaign[]) || []);
    } catch (err: any) {
      logger.error('Failed to load campaigns:', err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCampaigns();
    } finally {
      setRefreshing(false);
    }
  }, [loadCampaigns]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const resetFormData = () => {
    setFormData({
      title: '',
      subtitle: '',
      type: 'mission_sprint',
      targetCategory: '',
      targetCity: '',
      targetTrialCount: '10',
      rewardCoins: '100',
      trialCoins: '50',
      bonusBadgeName: '',
      startDate: '',
      endDate: '',
    });
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      title: campaign.title,
      subtitle: campaign.subtitle,
      type: campaign.type,
      targetCategory: campaign.targetCategory || '',
      targetCity: campaign.targetCity || '',
      targetTrialCount: String(campaign.targetTrialCount),
      rewardCoins: String(campaign.rewardCoins),
      trialCoins: String(campaign.trialCoins),
      bonusBadgeName: '',
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    });
    setShowCreateModal(true);
  };

  const handleSaveCampaign = async () => {
    if (!formData.title.trim()) {
      showAlert('Validation Error', 'Please enter campaign title');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      showAlert('Validation Error', 'Please enter start and end dates');
      return;
    }

    setIsSubmitting(true);
    try {
      const campaignData = {
        title: formData.title,
        subtitle: formData.subtitle,
        type: formData.type,
        targetCity: formData.targetCity,
        targetCategory: formData.targetCategory,
        startDate: formData.startDate,
        endDate: formData.endDate,
        targetTrialCount: parseInt(formData.targetTrialCount) || 10,
        rewardCoins: parseInt(formData.rewardCoins) || 100,
        trialCoins: parseInt(formData.trialCoins) || 50,
        bonusBadgeName: formData.bonusBadgeName,
      };

      if (editingCampaign) {
        await apiClient.put(`/admin/campaigns/${editingCampaign._id}`, campaignData);
      } else {
        await apiClient.post('/admin/campaigns', campaignData);
      }

      await loadCampaigns();
      setShowCreateModal(false);
      setEditingCampaign(null);
      resetFormData();
      showAlert(
        'Success',
        editingCampaign ? 'Campaign updated successfully' : 'Campaign created successfully'
      );
    } catch (err: any) {
      showAlert(
        'Error',
        err.message || (editingCampaign ? 'Failed to update campaign' : 'Failed to create campaign')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'mission_sprint':
        return 'Mission Sprint';
      case 'festival':
        return 'Festival';
      case 'category_push':
        return 'Category Push';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status) {
      case 'active':
        return { bg: '#DCFCE7', text: '#16A34A' };
      case 'upcoming':
        return { bg: '#DBEAFE', text: '#2563EB' };
      case 'ended':
        return { bg: '#E5E7EB', text: '#6B7280' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const renderCampaign = ({ item }: { item: Campaign }) => {
    const completion =
      item.participants > 0 ? Math.round((item.completions / item.participants) * 100) : 0;
    const statusColor = getStatusColor(item.status);

    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <View style={s.cardHeader}>
          <View style={s.cardTitle}>
            <Text style={[s.title, { color: colors.text }]}>{item.title}</Text>
            <View
              style={[
                s.typeBadge,
                { backgroundColor: item.type === 'festival' ? '#FDF4FF' : '#F0FDF4' },
              ]}
            >
              <Text
                style={[
                  s.typeBadgeText,
                  { color: item.type === 'festival' ? '#8B5CF6' : '#16A34A' },
                ]}
              >
                {getTypeLabel(item.type)}
              </Text>
            </View>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[s.statusText, { color: statusColor.text }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <Text style={[s.subtitle, { color: colors.icon }]}>{item.subtitle}</Text>

        <View style={s.location}>
          <Ionicons name="location-outline" size={14} color={colors.icon} />
          <Text style={[s.locationText, { color: colors.icon }]}>
            {item.targetCity && item.targetCategory
              ? `${item.targetCity} • ${item.targetCategory}`
              : item.targetCity || item.targetCategory || 'All Cities'}
          </Text>
        </View>

        <Text style={[s.dateText, { color: colors.icon }]}>
          {item.startDate} – {item.endDate}
        </Text>

        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={[s.statLabel, { color: colors.icon }]}>Participants</Text>
            <Text style={[s.statValue, { color: colors.text }]}>{item.participants}</Text>
          </View>
          <View style={s.stat}>
            <Text style={[s.statLabel, { color: colors.icon }]}>Completions</Text>
            <Text style={[s.statValue, { color: colors.text }]}>{item.completions}</Text>
          </View>
          <View style={s.stat}>
            <Text style={[s.statLabel, { color: colors.icon }]}>Completion %</Text>
            <Text style={[s.statValue, { color: colors.text }]}>{completion}%</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.editButton, { borderColor: colors.tint }]}
          activeOpacity={0.6}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.tint} />
          <Text style={[s.editButtonText, { color: colors.tint }]}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={['#8B5CF6', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>Discovery Campaigns</Text>
          </View>
        </LinearGradient>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#A78BFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Discovery Campaigns</Text>
          <TouchableOpacity
            style={s.createButton}
            onPress={() => {
              setEditingCampaign(null);
              resetFormData();
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={[s.filterContainer, { borderBottomColor: colors.border }]}>
        {(['all', 'active', 'upcoming', 'ended'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              s.filterTab,
              filter === f && [s.filterTabActive, { borderBottomColor: '#8B5CF6' }],
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                s.filterTabText,
                filter === f && { color: '#8B5CF6', fontWeight: '600' },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="megaphone-outline" size={64} color={colors.icon} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No Campaigns</Text>
          <Text style={[s.emptySubtitle, { color: colors.icon }]}>
            {filter === 'all' ? 'Create your first campaign' : `No ${filter} campaigns found`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCampaigns}
          renderItem={renderCampaign}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Create Campaign Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setEditingCampaign(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalForm} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Title *</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Campaign title"
                  placeholderTextColor={colors.icon}
                  value={formData.title}
                  onChangeText={(v) => setFormData({ ...formData, title: v })}
                />
              </View>

              {/* Subtitle */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>
                  Subtitle (reward description)
                </Text>
                <TextInput
                  style={[
                    s.formInput,
                    s.textArea,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="e.g., Try 3 salons, win 500 coins"
                  placeholderTextColor={colors.icon}
                  value={formData.subtitle}
                  onChangeText={(v) => setFormData({ ...formData, subtitle: v })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Type */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Type *</Text>
                <View style={s.typeSelector}>
                  {(['mission_sprint', 'festival', 'category_push'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        s.typeOption,
                        formData.type === t && s.typeOptionActive,
                        { borderColor: formData.type === t ? '#8B5CF6' : colors.border },
                      ]}
                      onPress={() => setFormData({ ...formData, type: t })}
                    >
                      <Text
                        style={[
                          s.typeOptionText,
                          formData.type === t && { color: '#8B5CF6' },
                          { color: colors.text },
                        ]}
                      >
                        {getTypeLabel(t)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Target Category */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Target Category</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Salon & Spa"
                  placeholderTextColor={colors.icon}
                  value={formData.targetCategory}
                  onChangeText={(v) => setFormData({ ...formData, targetCategory: v })}
                />
              </View>

              {/* Target City */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Target City</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Mumbai"
                  placeholderTextColor={colors.icon}
                  value={formData.targetCity}
                  onChangeText={(v) => setFormData({ ...formData, targetCity: v })}
                />
              </View>

              {/* Target Trial Count */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Target Trial Count</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="10"
                  placeholderTextColor={colors.icon}
                  value={formData.targetTrialCount}
                  onChangeText={(v) => setFormData({ ...formData, targetTrialCount: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Reward Coins */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Reward ReZ Coins</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="100"
                  placeholderTextColor={colors.icon}
                  value={formData.rewardCoins}
                  onChangeText={(v) => setFormData({ ...formData, rewardCoins: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Trial Coins */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Reward Trial Coins</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="50"
                  placeholderTextColor={colors.icon}
                  value={formData.trialCoins}
                  onChangeText={(v) => setFormData({ ...formData, trialCoins: v })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Bonus Badge */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>
                  Bonus Badge Name (optional)
                </Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Beauty Expert"
                  placeholderTextColor={colors.icon}
                  value={formData.bonusBadgeName}
                  onChangeText={(v) => setFormData({ ...formData, bonusBadgeName: v })}
                />
              </View>

              {/* Start Date */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Start Date *</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.icon}
                  value={formData.startDate}
                  onChangeText={(v) => setFormData({ ...formData, startDate: v })}
                />
              </View>

              {/* End Date */}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>End Date *</Text>
                <TextInput
                  style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.icon}
                  value={formData.endDate}
                  onChangeText={(v) => setFormData({ ...formData, endDate: v })}
                />
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={[s.modalButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setEditingCampaign(null);
                }}
                disabled={isSubmitting}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, s.modalButtonPrimary]}
                onPress={handleSaveCampaign}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.modalButtonPrimaryText}>
                    {editingCampaign ? 'Save' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

