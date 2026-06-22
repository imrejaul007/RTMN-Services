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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/cashback-rules.styles';

// --- Types ---

interface GlobalCashbackSettings {
  defaultCashbackRate: number;
  maxCashbackPerTransaction: number;
  minOrderForCashback: number;
}

interface CategoryMultiplier {
  id: string;
  categoryName: string;
  multiplier: number;
}

interface CashbackCampaign {
  _id: string;
  name: string;
  multiplier: number;
  status: string;
  startDate: string;
  endDate: string;
}

type SectionKey = 'global' | 'categories' | 'campaigns';

const SECTIONS: {
  key: SectionKey;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'global', title: 'Global Cashback Settings', icon: 'cash', color: Colors.light.success },
  { key: 'categories', title: 'Category Multipliers', icon: 'grid', color: Colors.light.warning },
  {
    key: 'campaigns',
    title: 'Active Cashback Campaigns',
    icon: 'megaphone',
    color: Colors.light.purple,
  },
];

// --- Default data ---

const DEFAULT_GLOBAL: GlobalCashbackSettings = {
  defaultCashbackRate: 5,
  maxCashbackPerTransaction: 100,
  minOrderForCashback: 10,
};

const DEFAULT_CATEGORIES: CategoryMultiplier[] = [
  { id: '1', categoryName: 'Food & Dining', multiplier: 2 },
  { id: '2', categoryName: 'Shopping', multiplier: 1.5 },
  { id: '3', categoryName: 'Travel', multiplier: 1.5 },
  { id: '4', categoryName: 'Entertainment', multiplier: 1.2 },
  { id: '5', categoryName: 'Health & Wellness', multiplier: 1.3 },
];

let nextCategoryId = 6;

export default function CashbackRulesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    global: false,
    categories: false,
    campaigns: false,
  });

  const [globalSettings, setGlobalSettings] = useState<GlobalCashbackSettings>({
    ...DEFAULT_GLOBAL,
  });
  const [categories, setCategories] = useState<CategoryMultiplier[]>(
    DEFAULT_CATEGORIES.map((c) => ({ ...c }))
  );
  const [campaigns, setCampaigns] = useState<CashbackCampaign[]>([]);

  // --- Fetch campaigns from existing endpoint ---

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaignsLoading(true);
      setCampaignsError(null);
      const response = await apiClient.get<any>('admin/double-campaigns');
      if (response.success && response.data) {
        const list = Array.isArray(response.data) ? response.data : response.data.campaigns || [];
        setCampaigns(
          list.map((c: any) => ({
            _id: c._id || c.id || '',
            name: c.name || c.title || 'Unnamed',
            multiplier: c.multiplier || c.cashbackMultiplier || 1,
            status: c.status || (c.isActive ? 'active' : 'inactive'),
            startDate: c.startTime || c.startDate || c.start || '',
            endDate: c.endTime || c.endDate || c.end || '',
          }))
        );
      } else {
        setCampaignsError(response.message || 'Failed to load campaigns');
      }
    } catch (err: any) {
      setCampaignsError(err.message || 'Failed to load campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // --- Load saved cashback config from backend ---

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const response = await apiClient.get<any>('admin/cashback-rules');
        if (response.success && response.data) {
          if (response.data.globalSettings) {
            setGlobalSettings(response.data.globalSettings);
          }
          if (response.data.categoryMultipliers) {
            setCategories(response.data.categoryMultipliers);
            nextCategoryId =
              Math.max(
                nextCategoryId,
                ...response.data.categoryMultipliers.map((c: any) => parseInt(c.id, 10) || 0)
              ) + 1;
          }
        }
      } catch {
        // Keep defaults on load error
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  // --- Handlers ---

  const toggleSection = (key: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await apiClient.get<any>('admin/cashback-rules');
      if (response.success && response.data) {
        if (response.data.globalSettings) setGlobalSettings(response.data.globalSettings);
        if (response.data.categoryMultipliers) {
          setCategories(response.data.categoryMultipliers);
          nextCategoryId =
            Math.max(
              nextCategoryId,
              ...response.data.categoryMultipliers.map((c: any) => parseInt(c.id, 10) || 0)
            ) + 1;
        }
        setDirty(false);
      }
    } catch {
      // Keep current state on error
    }
    await loadCampaigns();
    setRefreshing(false);
  }, [loadCampaigns]);

  const handleSave = async () => {
    // Validate
    if (globalSettings.defaultCashbackRate < 0 || globalSettings.defaultCashbackRate > 100) {
      showAlert('Validation Error', 'Cashback rate must be between 0 and 100');
      return;
    }
    if (globalSettings.maxCashbackPerTransaction <= 0) {
      showAlert('Validation Error', 'Max cashback per transaction must be positive');
      return;
    }
    if (categories.some((c) => !c.categoryName.trim())) {
      showAlert('Validation Error', 'All categories must have a name');
      return;
    }
    if (categories.some((c) => c.multiplier <= 0)) {
      showAlert('Validation Error', 'All multipliers must be greater than 0');
      return;
    }

    try {
      setSaving(true);
      const payload = { globalSettings, categoryMultipliers: categories };
      const response = await apiClient.post('admin/cashback-rules', payload);
      if (response.success) {
        showAlert('Success', 'Cashback rules saved successfully');
        setDirty(false);
      } else {
        showAlert('Error', response.message || 'Failed to save cashback rules');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save cashback rules');
    } finally {
      setSaving(false);
    }
  };

  // --- Global settings updaters ---

  const updateGlobal = (field: keyof GlobalCashbackSettings, value: string) => {
    setGlobalSettings((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
    setDirty(true);
  };

  // --- Category updaters ---

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      { id: String(nextCategoryId++), categoryName: '', multiplier: 1 },
    ]);
    setDirty(true);
  };

  const removeCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDirty(true);
  };

  const updateCategory = (id: string, field: keyof CategoryMultiplier, value: any) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    setDirty(true);
  };

  // --- Helpers ---

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return colors.success;
      case 'scheduled':
      case 'upcoming':
        return colors.info;
      case 'expired':
      case 'ended':
        return colors.error;
      case 'paused':
        return colors.warning;
      default:
        return colors.secondaryText;
    }
  };

  // --- Render helpers ---

  const renderInput = (
    label: string,
    value: number,
    onChange: (val: string) => void,
    suffix?: string
  ) => (
    <View style={s.fieldRow}>
      <Text style={[s.fieldLabel, { color: colors.text }]}>
        {label}
        {suffix ? ` (${suffix})` : ''}
      </Text>
      <TextInput
        style={[
          s.fieldInput,
          { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
        ]}
        value={String(value)}
        onChangeText={onChange}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );

  const renderSectionCard = (sectionKey: SectionKey, content: React.ReactNode) => {
    const sec = SECTIONS.find((s) => s.key === sectionKey)!;
    const isCollapsed = collapsed[sectionKey];
    return (
      <View
        key={sectionKey}
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <TouchableOpacity
          style={s.cardHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <Ionicons name={sec.icon} size={18} color={sec.color} />
          <Text style={[s.cardTitle, { color: colors.text }]}>{sec.title}</Text>
          {sectionKey === 'campaigns' && !campaignsLoading && campaigns.length > 0 && (
            <View style={[s.badge, { backgroundColor: `${sec.color}20` }]}>
              <Text style={[s.badgeText, { color: sec.color }]}>{campaigns.length}</Text>
            </View>
          )}
          <Ionicons
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={colors.secondaryText}
          />
        </TouchableOpacity>
        {!isCollapsed && (
          <View style={[s.cardBody, { borderTopColor: colors.border }]}>{content}</View>
        )}
      </View>
    );
  };

  // --- Main render ---

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Ionicons name="cash" size={22} color={colors.tint} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Cashback Rules</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={handleRefresh} style={s.iconBtn}>
            <Ionicons name="refresh" size={20} color={colors.tint} />
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

      {configLoading ? (
        <View style={s.configLoadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[s.configLoadingText, { color: colors.secondaryText }]}>
            Loading cashback configuration...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.tint]}
            />
          }
        >
          {/* Section 1: Global Cashback Settings */}
          {renderSectionCard(
            'global',
            <>
              <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
                Default cashback parameters applied across all transactions unless overridden by
                category multipliers or campaigns.
              </Text>
              {renderInput(
                'Default Cashback Rate',
                globalSettings.defaultCashbackRate,
                (v) => updateGlobal('defaultCashbackRate', v),
                '%'
              )}
              {renderInput(
                'Max Cashback / Transaction',
                globalSettings.maxCashbackPerTransaction,
                (v) => updateGlobal('maxCashbackPerTransaction', v),
                'coins'
              )}
              {renderInput(
                'Min Order for Cashback',
                globalSettings.minOrderForCashback,
                (v) => updateGlobal('minOrderForCashback', v),
                'order value'
              )}
            </>
          )}

          {/* Section 2: Category Multipliers */}
          {renderSectionCard(
            'categories',
            <>
              <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
                Set cashback multipliers per category. A 2x multiplier means double the default
                cashback rate for that category.
              </Text>
              {categories.length === 0 && (
                <Text style={[s.emptyText, { color: colors.secondaryText }]}>
                  No category multipliers configured.
                </Text>
              )}
              {categories.map((cat) => (
                <View key={cat.id} style={[s.categoryRow, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.listItemLabel, { color: colors.secondaryText }]}>
                      Category
                    </Text>
                    <TextInput
                      style={[
                        s.listInput,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      value={cat.categoryName}
                      onChangeText={(v) => updateCategory(cat.id, 'categoryName', v)}
                      placeholder="Category name"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                  <View style={{ width: 90 }}>
                    <Text style={[s.listItemLabel, { color: colors.secondaryText }]}>
                      Multiplier
                    </Text>
                    <View style={s.multiplierContainer}>
                      <TextInput
                        style={[
                          s.listInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.text,
                            textAlign: 'center',
                            flex: 1,
                          },
                        ]}
                        value={String(cat.multiplier)}
                        onChangeText={(v) =>
                          updateCategory(cat.id, 'multiplier', parseFloat(v) || 0)
                        }
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                      <Text style={[s.multiplierSuffix, { color: colors.secondaryText }]}>
                        x
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.removeBtn} onPress={() => removeCategory(cat.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[s.addBtn, { borderColor: colors.border }]}
                onPress={addCategory}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
                <Text style={[s.addBtnText, { color: colors.tint }]}>Add Category</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Section 3: Active Cashback Campaigns */}
          {renderSectionCard(
            'campaigns',
            <>
              <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
                Campaigns fetched from the double-campaigns endpoint. These override default
                cashback for their duration.
              </Text>
              {campaignsLoading ? (
                <View style={s.campaignLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.tint} />
                  <Text style={[s.campaignLoadingText, { color: colors.secondaryText }]}>
                    Loading campaigns...
                  </Text>
                </View>
              ) : campaignsError ? (
                <View style={s.campaignErrorContainer}>
                  <Ionicons name="alert-circle" size={24} color={colors.error} />
                  <Text style={[s.campaignErrorText, { color: colors.secondaryText }]}>
                    {campaignsError}
                  </Text>
                  <TouchableOpacity
                    style={[s.retryBtn, { borderColor: colors.border }]}
                    onPress={loadCampaigns}
                  >
                    <Text style={[s.retryBtnText, { color: colors.tint }]}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : campaigns.length === 0 ? (
                <Text style={[s.emptyText, { color: colors.secondaryText }]}>
                  No active cashback campaigns found.
                </Text>
              ) : (
                campaigns.map((campaign) => (
                  <View
                    key={campaign._id}
                    style={[s.campaignCard, { borderColor: colors.border }]}
                  >
                    <View style={s.campaignHeader}>
                      <Text style={[s.campaignName, { color: colors.text }]} numberOfLines={1}>
                        {campaign.name}
                      </Text>
                      <View
                        style={[
                          s.statusBadge,
                          { backgroundColor: `${getStatusColor(campaign.status)}18` },
                        ]}
                      >
                        <View
                          style={[
                            s.statusDot,
                            { backgroundColor: getStatusColor(campaign.status) },
                          ]}
                        />
                        <Text
                          style={[s.statusText, { color: getStatusColor(campaign.status) }]}
                        >
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={s.campaignDetails}>
                      <View style={s.campaignDetail}>
                        <Ionicons name="trending-up" size={14} color={colors.secondaryText} />
                        <Text style={[s.campaignDetailText, { color: colors.secondaryText }]}>
                          {campaign.multiplier}x multiplier
                        </Text>
                      </View>
                      <View style={s.campaignDetail}>
                        <Ionicons name="calendar-outline" size={14} color={colors.secondaryText} />
                        <Text style={[s.campaignDetailText, { color: colors.secondaryText }]}>
                          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* Bottom Save */}
          <TouchableOpacity
            style={[s.bottomSave, !dirty && { backgroundColor: colors.muted }]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.bottomSaveText}>{dirty ? 'Save All Changes' : 'No Changes'}</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

