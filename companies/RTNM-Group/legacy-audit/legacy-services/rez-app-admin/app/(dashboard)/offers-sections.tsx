import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offersSectionsService, OffersSectionConfig } from '../../services/api/offersSections';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/offers-sections.styles';

type TabFilter = 'all' | 'offers' | 'cashback' | 'exclusive';

const TAB_FILTERS: { key: TabFilter; label: string; icon: string; color: string }[] = [
  { key: 'all', label: 'All', icon: 'albums', color: Colors.light.indigo },
  { key: 'offers', label: 'Offers', icon: 'pricetag', color: Colors.light.success },
  { key: 'cashback', label: 'Cashback', icon: 'cash', color: Colors.light.warning },
  { key: 'exclusive', label: 'Exclusive', icon: 'lock-closed', color: Colors.light.purple },
];

const SECTION_ICONS: Record<string, string> = {
  lightningDeals: 'flash',
  discountBuckets: 'pricetags',
  nearbyOffers: 'location',
  saleOffers: 'cart',
  bogoOffers: 'gift',
  freeDeliveryOffers: 'car',
  todaysOffers: 'today',
  trendingOffers: 'trending-up',
  aiRecommendedOffers: 'sparkles',
  friendsRedeemed: 'people',
  hotspots: 'flame',
  lastChanceOffers: 'alarm',
  newTodayOffers: 'star',
  doubleCashback: 'cash',
  coinDrops: 'logo-bitcoin',
  superCashbackStores: 'storefront',
  uploadBillStores: 'document-text',
  bankOffers: 'card',
  exclusiveZones: 'shield-checkmark',
  specialProfiles: 'ribbon',
  loyaltyMilestones: 'trophy',
};

export default function OffersSectionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [sections, setSections] = useState<OffersSectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [editingMaxItems, setEditingMaxItems] = useState<string | null>(null);
  const [tempMaxItems, setTempMaxItems] = useState('');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    try {
      const data = await offersSectionsService.getSections();
      setSections(data);
    } catch (error: any) {
      logger.error('Failed to fetch sections:', error);
      showAlert('Error', error.message || 'Failed to load section configs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSections();
  };

  const handleSeed = async () => {
    showConfirm(
      'Seed Defaults',
      'This will create default configurations for any missing sections. Existing configs will not be modified.',
      async () => {
        try {
          setLoading(true);
          const results = await offersSectionsService.seedDefaults();
          const created = results.filter((r) => r.action === 'created').length;
          const existed = results.filter((r) => r.action === 'exists').length;
          showAlert('Seeded', `Created: ${created}, Already existed: ${existed}`);
          fetchSections();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to seed');
          setLoading(false);
        }
      }
    );
  };

  const handleToggle = async (section: OffersSectionConfig) => {
    try {
      setUpdatingKey(section.sectionKey);
      const updated = await offersSectionsService.toggleSection(
        section.sectionKey,
        !section.isEnabled
      );
      setSections((prev) => prev.map((s) => (s.sectionKey === section.sectionKey ? updated : s)));
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle section');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleMoveUp = async (section: OffersSectionConfig) => {
    const tabSections = sections
      .filter((s) => s.tab === section.tab)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = tabSections.findIndex((s) => s.sectionKey === section.sectionKey);
    if (idx <= 0) return;

    const prev = tabSections[idx - 1];
    try {
      setUpdatingKey(section.sectionKey);
      await Promise.all([
        offersSectionsService.updateSortOrder(section.sectionKey, prev.sortOrder),
        offersSectionsService.updateSortOrder(prev.sectionKey, section.sortOrder),
      ]);
      fetchSections();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reorder');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleMoveDown = async (section: OffersSectionConfig) => {
    const tabSections = sections
      .filter((s) => s.tab === section.tab)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = tabSections.findIndex((s) => s.sectionKey === section.sectionKey);
    if (idx >= tabSections.length - 1) return;

    const next = tabSections[idx + 1];
    try {
      setUpdatingKey(section.sectionKey);
      await Promise.all([
        offersSectionsService.updateSortOrder(section.sectionKey, next.sortOrder),
        offersSectionsService.updateSortOrder(next.sectionKey, section.sortOrder),
      ]);
      fetchSections();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reorder');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleMaxItemsSave = async (sectionKey: string) => {
    const val = parseInt(tempMaxItems);
    if (isNaN(val) || val < 1 || val > 100) {
      showAlert('Invalid', 'Max items must be between 1 and 100');
      return;
    }
    try {
      setUpdatingKey(sectionKey);
      const updated = await offersSectionsService.updateMaxItems(sectionKey, val);
      setSections((prev) => prev.map((s) => (s.sectionKey === sectionKey ? updated : s)));
      setEditingMaxItems(null);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update');
    } finally {
      setUpdatingKey(null);
    }
  };

  const filteredSections = sections
    .filter((s) => activeTab === 'all' || s.tab === activeTab)
    .sort((a, b) => {
      if (a.tab !== b.tab) return a.tab.localeCompare(b.tab);
      return a.sortOrder - b.sortOrder;
    });

  const enabledCount = sections.filter((s) => s.isEnabled).length;
  const disabledCount = sections.filter((s) => !s.isEnabled).length;

  if (loading && sections.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>Loading section configs...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Offers Page Sections</Text>
          <Text style={[s.subtitle, { color: colors.icon }]}>
            Manage visibility, ordering & limits for all 21 sections
          </Text>
        </View>
        <TouchableOpacity
          style={[s.seedButton, { backgroundColor: colors.tint }]}
          onPress={handleSeed}
        >
          <Ionicons name="sparkles" size={16} color={colors.card} />
          <Text style={s.seedButtonText}>Seed Defaults</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={s.statsRow}>
        <View
          style={[
            s.statCard,
            { backgroundColor: isDark ? colors.slateDark : colors.successLighter },
          ]}
        >
          <Text style={[s.statValue, { color: colors.success }]}>{enabledCount}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>Enabled</Text>
        </View>
        <View
          style={[
            s.statCard,
            { backgroundColor: isDark ? colors.slateDark : colors.errorLight },
          ]}
        >
          <Text style={[s.statValue, { color: colors.error }]}>{disabledCount}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>Disabled</Text>
        </View>
        <View
          style={[
            s.statCard,
            { backgroundColor: isDark ? colors.slateDark : colors.infoLight },
          ]}
        >
          <Text style={[s.statValue, { color: colors.info }]}>{sections.length}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>Total</Text>
        </View>
      </View>

      {/* Tab Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {TAB_FILTERS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              s.tabChip,
              {
                backgroundColor:
                  activeTab === tab.key ? tab.color : isDark ? colors.slateDark : colors.slate,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as unknown as keyof typeof Ionicons.glyphMap}
              size={14}
              color={activeTab === tab.key ? colors.card : colors.icon}
            />
            <Text
              style={[
                s.tabChipText,
                { color: activeTab === tab.key ? colors.card : colors.text },
              ]}
            >
              {tab.label} (
              {activeTab === 'all'
                ? tab.key === 'all'
                  ? sections.length
                  : sections.filter((s) => s.tab === tab.key).length
                : sections.filter((s) => s.tab === tab.key).length}
              )
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section List */}
      {filteredSections.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="layers-outline" size={48} color={colors.icon} />
          <Text style={[s.emptyText, { color: colors.icon }]}>No section configs found.</Text>
          <TouchableOpacity
            style={[
              s.seedButton,
              {
                backgroundColor: colors.tint,
                marginTop: 16,
                paddingHorizontal: 20,
                paddingVertical: 12,
              },
            ]}
            onPress={handleSeed}
          >
            <Ionicons name="sparkles" size={18} color={colors.card} />
            <Text style={[s.seedButtonText, { fontSize: 15 }]}>Seed Defaults</Text>
          </TouchableOpacity>
          <Text style={[{ color: colors.icon, fontSize: 12, marginTop: 8, textAlign: 'center' }]}>
            Creates default configs for all 21 offer sections
          </Text>
        </View>
      ) : (
        filteredSections.map((section, index) => {
          const isUpdating = updatingKey === section.sectionKey;
          const tabSections = filteredSections.filter((s) => s.tab === section.tab);
          const tabIndex = tabSections.findIndex((s) => s.sectionKey === section.sectionKey);
          const isFirst = tabIndex === 0;
          const isLast = tabIndex === tabSections.length - 1;
          const showTabHeader =
            activeTab === 'all' && (index === 0 || filteredSections[index - 1].tab !== section.tab);

          return (
            <React.Fragment key={section.sectionKey}>
              {showTabHeader && (
                <View style={s.tabDivider}>
                  <Text style={[s.tabDividerText, { color: colors.tint }]}>
                    {section.tab.toUpperCase()} TAB
                  </Text>
                </View>
              )}
              <View
                style={[
                  s.sectionCard,
                  {
                    backgroundColor: isDark ? colors.slateDark : colors.card,
                    borderColor: isDark ? Colors.dark.border : colors.border,
                    opacity: section.isEnabled ? 1 : 0.6,
                  },
                ]}
              >
                <View style={s.sectionHeader}>
                  <View style={s.sectionInfo}>
                    <View
                      style={[
                        s.iconCircle,
                        { backgroundColor: section.isEnabled ? colors.infoLighter : colors.slate },
                      ]}
                    >
                      <Ionicons
                        name={(SECTION_ICONS[section.sectionKey] || 'list') as unknown as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={section.isEnabled ? colors.info : colors.slateMedium}
                      />
                    </View>
                    <View style={s.sectionText}>
                      <Text style={[s.sectionName, { color: colors.text }]}>
                        {section.displayName}
                      </Text>
                      <Text style={[s.sectionKey, { color: colors.icon }]}>
                        {section.sectionKey} | Order: {section.sortOrder}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={section.isEnabled}
                    onValueChange={() => handleToggle(section)}
                    disabled={isUpdating}
                    trackColor={{ false: colors.slateLight, true: '#86EFAC' }}
                    thumbColor={section.isEnabled ? colors.success : colors.slateMedium}
                  />
                </View>

                <View style={s.sectionActions}>
                  {/* Max Items */}
                  <View style={s.maxItemsRow}>
                    <Text style={[s.actionLabel, { color: colors.icon }]}>Max Items:</Text>
                    {editingMaxItems === section.sectionKey ? (
                      <View style={s.maxItemsEdit}>
                        <TextInput
                          style={[
                            s.maxItemsInput,
                            { color: colors.text, borderColor: colors.tint },
                          ]}
                          value={tempMaxItems}
                          onChangeText={setTempMaxItems}
                          keyboardType="number-pad"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => handleMaxItemsSave(section.sectionKey)}
                          disabled={isUpdating}
                        >
                          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingMaxItems(null)}>
                          <Ionicons name="close-circle" size={22} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.maxItemsDisplay}
                        onPress={() => {
                          setEditingMaxItems(section.sectionKey);
                          setTempMaxItems(String(section.maxItems));
                        }}
                      >
                        <Text style={[s.maxItemsValue, { color: colors.text }]}>
                          {section.maxItems}
                        </Text>
                        <Ionicons name="pencil" size={12} color={colors.icon} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Reorder Buttons */}
                  <View style={s.reorderButtons}>
                    <TouchableOpacity
                      style={[s.reorderBtn, isFirst && s.reorderBtnDisabled]}
                      onPress={() => handleMoveUp(section)}
                      disabled={isFirst || isUpdating}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={isFirst ? colors.slateLight : colors.tint}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.reorderBtn, isLast && s.reorderBtnDisabled]}
                      onPress={() => handleMoveDown(section)}
                      disabled={isLast || isUpdating}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={isLast ? colors.slateLight : colors.tint}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {isUpdating && (
                  <View style={s.updatingOverlay}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                )}
              </View>
            </React.Fragment>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

