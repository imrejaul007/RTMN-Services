import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { dailyCheckinConfigService, DailyCheckinConfig, MilestoneReward } from '../../services/api/dailyCheckinConfig';
import { s } from './styles/daily-checkin-config.styles';

export default function DailyCheckinConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Config state
  const [isEnabled, setIsEnabled] = useState(true);
  const [dayRewards, setDayRewards] = useState<number[]>([10, 15, 20, 25, 30, 40, 100]);
  const [milestones, setMilestones] = useState<MilestoneReward[]>([
    { day: 7, coins: 200 },
    { day: 30, coins: 2000 },
    { day: 100, coins: 10000 },
  ]);
  const [proTips, setProTips] = useState<string[]>([]);
  const [affiliateTip, setAffiliateTip] = useState('');
  const [reviewTimeframe, setReviewTimeframe] = useState('');

  const loadConfig = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await dailyCheckinConfigService.getConfig();
      if (response.success && response.data) {
        const cfg = response.data;
        setIsEnabled(cfg.isEnabled);
        setDayRewards(cfg.dayRewards);
        setMilestones(cfg.milestoneRewards);
        setProTips(cfg.proTips);
        setAffiliateTip(cfg.affiliateTip);
        setReviewTimeframe(cfg.reviewTimeframe);
        setDirty(false);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    // Validate
    if (dayRewards.length !== 7 || dayRewards.some(n => !n || n <= 0)) {
      showAlert('Validation Error', 'All 7 day rewards must be positive numbers');
      return;
    }
    if (milestones.some(m => !m.day || !m.coins || m.day <= 0 || m.coins <= 0)) {
      showAlert('Validation Error', 'All milestones must have positive day and coin values');
      return;
    }
    if (proTips.some(t => !t.trim())) {
      showAlert('Validation Error', 'Pro tips cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const response = await dailyCheckinConfigService.updateConfig({
        isEnabled,
        dayRewards,
        milestoneRewards: milestones,
        proTips: proTips.filter(t => t.trim()),
        affiliateTip,
        reviewTimeframe,
      });
      if (response.success) {
        showAlert('Success', 'Daily check-in config saved successfully');
        setDirty(false);
      } else {
        showAlert('Error', 'Failed to save config');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    showConfirm(
      'Reset to Defaults',
      'This will reset all daily check-in configuration to default values. This cannot be undone.',
      async () => {
        try {
          setSaving(true);
          const response = await dailyCheckinConfigService.resetConfig();
          if (response.success && response.data) {
            const cfg = response.data;
            setIsEnabled(cfg.isEnabled);
            setDayRewards(cfg.dayRewards);
            setMilestones(cfg.milestoneRewards);
            setProTips(cfg.proTips);
            setAffiliateTip(cfg.affiliateTip);
            setReviewTimeframe(cfg.reviewTimeframe);
            setDirty(false);
            showAlert('Success', 'Config reset to defaults');
          }
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to reset config');
        } finally {
          setSaving(false);
        }
      },
      'Reset'
    );
  };

  const updateDayReward = (index: number, value: string) => {
    const num = parseInt(value) || 0;
    setDayRewards(prev => {
      const updated = [...prev];
      updated[index] = num;
      return updated;
    });
    setDirty(true);
  };

  const updateMilestone = (index: number, field: 'day' | 'coins' | 'badge', value: string) => {
    setMilestones(prev => {
      const updated = [...prev];
      if (field === 'badge') {
        updated[index] = { ...updated[index], badge: value || undefined };
      } else {
        updated[index] = { ...updated[index], [field]: parseInt(value) || 0 };
      }
      return updated;
    });
    setDirty(true);
  };

  const addMilestone = () => {
    setMilestones(prev => [...prev, { day: 0, coins: 0 }]);
    setDirty(true);
  };

  const removeMilestone = (index: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const updateProTip = (index: number, value: string) => {
    setProTips(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    setDirty(true);
  };

  const addProTip = () => {
    setProTips(prev => [...prev, '']);
    setDirty(true);
  };

  const removeProTip = (index: number) => {
    setProTips(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.secondaryText }]}>Loading config...</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={s.headerLeft}>
          <Ionicons name="calendar" size={22} color={colors.tint} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Daily Check-In Config</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.resetButton} onPress={handleReset} disabled={saving}>
            <Ionicons name="refresh" size={16} color={colors.warning} />
            <Text style={[s.resetButtonText, { color: colors.warning }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveButton, !dirty && s.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="save" size={16} color={colors.card} />
                <Text style={s.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadConfig(true)} colors={[colors.tint]} />
        }
      >
        {/* Enable/Disable Toggle */}
        <View style={[s.section, { backgroundColor: colors.card }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="power" size={18} color={colors.success} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Feature Status</Text>
          </View>
          <View style={s.toggleRow}>
            <Text style={[s.toggleLabel, { color: colors.text }]}>Daily Check-In Enabled</Text>
            <Switch
              value={isEnabled}
              onValueChange={(v) => { setIsEnabled(v); setDirty(true); }}
              trackColor={{ false: colors.border, true: `${colors.success}60` }}
              thumbColor={isEnabled ? colors.success : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Day Rewards */}
        <View style={[s.section, { backgroundColor: colors.card }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="gift" size={18} color={colors.warning} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Day Rewards (7-day cycle)</Text>
          </View>
          <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
            Coins earned for each day in the weekly cycle. Repeats every 7 days.
          </Text>
          <View style={s.dayRewardsGrid}>
            {dayRewards.map((reward, index) => (
              <View key={index} style={[s.dayRewardItem, { borderColor: colors.border }]}>
                <Text style={[s.dayRewardLabel, { color: colors.secondaryText }]}>Day {index + 1}</Text>
                <TextInput
                  style={[s.dayRewardInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={String(reward)}
                  onChangeText={(v) => updateDayReward(index, v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            ))}
          </View>
          <View style={[s.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[s.totalLabel, { color: colors.secondaryText }]}>Weekly Total:</Text>
            <Text style={[s.totalValue, { color: colors.tint }]}>
              {dayRewards.reduce((a, b) => a + b, 0)} coins
            </Text>
          </View>
        </View>

        {/* Milestone Rewards */}
        <View style={[s.section, { backgroundColor: colors.card }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="trophy" size={18} color={colors.purple} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Streak Milestone Rewards</Text>
          </View>
          <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
            Bonus coins awarded when users reach streak milestones. Claimed once per milestone.
          </Text>
          {milestones.map((milestone, index) => (
            <View key={index} style={[s.milestoneRow, { borderColor: colors.border }]}>
              <View style={s.milestoneField}>
                <Text style={[s.fieldLabel, { color: colors.secondaryText }]}>Day</Text>
                <TextInput
                  style={[s.milestoneInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={String(milestone.day)}
                  onChangeText={(v) => updateMilestone(index, 'day', v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <View style={s.milestoneField}>
                <Text style={[s.fieldLabel, { color: colors.secondaryText }]}>Coins</Text>
                <TextInput
                  style={[s.milestoneInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={String(milestone.coins)}
                  onChangeText={(v) => updateMilestone(index, 'coins', v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <View style={s.milestoneField}>
                <Text style={[s.fieldLabel, { color: colors.secondaryText }]}>Badge</Text>
                <TextInput
                  style={[s.milestoneInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={milestone.badge || ''}
                  onChangeText={(v) => updateMilestone(index, 'badge', v)}
                  placeholder="optional"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <TouchableOpacity style={s.removeButton} onPress={() => removeMilestone(index)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[s.addButton, { borderColor: colors.border }]} onPress={addMilestone}>
            <Ionicons name="add-circle-outline" size={18} color={colors.info} />
            <Text style={[s.addButtonText, { color: colors.info }]}>Add Milestone</Text>
          </TouchableOpacity>
        </View>

        {/* Pro Tips */}
        <View style={[s.section, { backgroundColor: colors.card }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="bulb" size={18} color={colors.warning} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Pro Tips</Text>
          </View>
          <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
            Tips shown to users on the daily check-in page.
          </Text>
          {proTips.map((tip, index) => (
            <View key={index} style={[s.tipRow, { borderColor: colors.border }]}>
              <TextInput
                style={[s.tipInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={tip}
                onChangeText={(v) => updateProTip(index, v)}
                placeholder="Enter a pro tip..."
                placeholderTextColor={colors.icon}
                multiline
              />
              <TouchableOpacity style={s.removeButton} onPress={() => removeProTip(index)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[s.addButton, { borderColor: colors.border }]} onPress={addProTip}>
            <Ionicons name="add-circle-outline" size={18} color={colors.info} />
            <Text style={[s.addButtonText, { color: colors.info }]}>Add Pro Tip</Text>
          </TouchableOpacity>
        </View>

        {/* Affiliate & Review Settings */}
        <View style={[s.section, { backgroundColor: colors.card }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="share-social" size={18} color={colors.info} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Affiliate & Review Settings</Text>
          </View>
          <View style={s.textFieldContainer}>
            <Text style={[s.fieldLabel, { color: colors.secondaryText }]}>Affiliate Tip Text</Text>
            <TextInput
              style={[s.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={affiliateTip}
              onChangeText={(v) => { setAffiliateTip(v); setDirty(true); }}
              placeholder="How the affiliate program works..."
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={s.textFieldContainer}>
            <Text style={[s.fieldLabel, { color: colors.secondaryText }]}>Review Timeframe</Text>
            <TextInput
              style={[s.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={reviewTimeframe}
              onChangeText={(v) => { setReviewTimeframe(v); setDirty(true); }}
              placeholder="e.g. within 24 hours"
              placeholderTextColor={colors.icon}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

