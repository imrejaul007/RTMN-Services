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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { hotspotAreasService, HotspotArea } from '../../services/api/hotspotAreas';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/hotspot-areas.styles';

type FilterTab = 'all' | 'active' | 'inactive';

interface AreaFormData {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  lat: string;
  lng: string;
  radius: string;
  image: string;
  priority: string;
  isActive: boolean;
}

const DEFAULT_FORM: AreaFormData = {
  name: '',
  slug: '',
  city: '',
  state: '',
  country: '',
  lat: '',
  lng: '',
  radius: '',
  image: '',
  priority: '0',
  isActive: true,
};

export default function HotspotAreasScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data states
  const [areas, setAreas] = useState<HotspotArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & search states
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState<HotspotArea | null>(null);
  const [formData, setFormData] = useState<AreaFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // DATA LOADING
  // ==========================================

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const response = await hotspotAreasService.getAreas({ limit: 100 });
      const data = response.data?.areas || [];
      setAreas(data);
    } catch (error: any) {
      logger.error('Failed to load hotspot areas:', error);
      showAlert('Error', error.message || 'Failed to load hotspot areas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAreas();
    setRefreshing(false);
  }, []);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  const activeCount = areas.filter((a) => a.isActive).length;
  const inactiveCount = areas.filter((a) => !a.isActive).length;

  const filteredAreas = areas.filter((area) => {
    // Tab filter
    if (activeTab === 'active' && !area.isActive) return false;
    if (activeTab === 'inactive' && area.isActive) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        area.name.toLowerCase().includes(q) ||
        area.city?.toLowerCase().includes(q) ||
        area.slug?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // ==========================================
  // HELPERS
  // ==========================================

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreateNew = () => {
    setEditingArea(null);
    setFormData({ ...DEFAULT_FORM });
    setShowModal(true);
  };

  const handleEdit = (area: HotspotArea) => {
    setEditingArea(area);
    setFormData({
      name: area.name || '',
      slug: area.slug || '',
      city: area.city || '',
      state: area.state || '',
      country: area.country || '',
      lat: area.coordinates?.lat != null ? String(area.coordinates.lat) : '',
      lng: area.coordinates?.lng != null ? String(area.coordinates.lng) : '',
      radius: area.radius != null ? String(area.radius) : '',
      image: area.image || '',
      priority: area.priority != null ? String(area.priority) : '0',
      isActive: area.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('Error', 'Area name is required');
      return;
    }
    if (!formData.city.trim()) {
      showAlert('Error', 'City is required');
      return;
    }
    if (!formData.country.trim()) {
      showAlert('Error', 'Country is required');
      return;
    }
    if (!formData.lat.trim() || !formData.lng.trim()) {
      showAlert('Error', 'Coordinates (lat/lng) are required');
      return;
    }
    if (isNaN(parseFloat(formData.lat)) || isNaN(parseFloat(formData.lng))) {
      showAlert('Error', 'Coordinates must be valid numbers');
      return;
    }
    if (!formData.radius.trim() || isNaN(parseFloat(formData.radius))) {
      showAlert('Error', 'Radius must be a valid number');
      return;
    }

    const slug = formData.slug.trim() || generateSlug(formData.name);

    const payload: Partial<HotspotArea> = {
      name: formData.name.trim(),
      slug,
      city: formData.city.trim(),
      state: formData.state.trim() || undefined,
      country: formData.country.trim(),
      coordinates: {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      },
      radius: parseFloat(formData.radius),
      image: formData.image.trim() || undefined,
      priority: parseInt(formData.priority) || 0,
      isActive: formData.isActive,
    };

    setIsSaving(true);
    try {
      if (editingArea) {
        await hotspotAreasService.updateArea(editingArea._id, payload);
        showAlert('Success', 'Hotspot area updated successfully');
      } else {
        await hotspotAreasService.createArea(payload);
        showAlert('Success', 'Hotspot area created successfully');
      }
      setShowModal(false);
      await fetchAreas();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save hotspot area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (area: HotspotArea) => {
    try {
      await hotspotAreasService.toggleArea(area._id);
      await fetchAreas();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle area status');
    }
  };

  const handleDelete = (area: HotspotArea) => {
    showConfirm(
      'Delete Hotspot Area',
      `Are you sure you want to delete "${area.name}"? This action cannot be undone.`,
      async () => {
        try {
          await hotspotAreasService.deleteArea(area._id);
          showAlert('Success', 'Hotspot area deleted');
          await fetchAreas();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete area');
        }
      },
      'Delete'
    );
  };

  // ==========================================
  // RENDER: HEADER
  // ==========================================

  const renderHeader = () => (
    <View style={s.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Hotspot Areas</Text>
      </View>
      <TouchableOpacity
        style={[s.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={22} color={colors.card} />
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // RENDER: STATS ROW
  // ==========================================

  const renderStatsRow = () => (
    <View style={s.statsRow}>
      <View style={[s.statCard, { backgroundColor: colors.card }]}>
        <View style={[s.statIcon, { backgroundColor: `${colors.info}15` }]}>
          <Ionicons name="location" size={18} color={colors.info} />
        </View>
        <Text style={[s.statValue, { color: colors.text }]}>{areas.length}</Text>
        <Text style={[s.statLabel, { color: colors.secondaryText }]}>Total</Text>
      </View>
      <View style={[s.statCard, { backgroundColor: colors.card }]}>
        <View style={[s.statIcon, { backgroundColor: `${colors.success}15` }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        </View>
        <Text style={[s.statValue, { color: colors.text }]}>{activeCount}</Text>
        <Text style={[s.statLabel, { color: colors.secondaryText }]}>Active</Text>
      </View>
      <View style={[s.statCard, { backgroundColor: colors.card }]}>
        <View style={[s.statIcon, { backgroundColor: `${colors.error}15` }]}>
          <Ionicons name="close-circle" size={18} color={colors.error} />
        </View>
        <Text style={[s.statValue, { color: colors.text }]}>{inactiveCount}</Text>
        <Text style={[s.statLabel, { color: colors.secondaryText }]}>Inactive</Text>
      </View>
    </View>
  );

  // ==========================================
  // RENDER: FILTER TABS
  // ==========================================

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
  ];

  const renderFilterTabs = () => (
    <View style={s.tabsContainer}>
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              s.tab,
              {
                backgroundColor: isSelected ? colors.tint : colors.card,
                borderColor: isSelected ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[s.tabText, { color: isSelected ? colors.card : colors.secondaryText }]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ==========================================
  // RENDER: SEARCH BAR
  // ==========================================

  const renderSearchBar = () => (
    <View style={s.searchContainer}>
      <View
        style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name..."
          placeholderTextColor={colors.secondaryText}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ==========================================
  // RENDER: AREA CARD
  // ==========================================

  const renderAreaCard = (area: HotspotArea) => (
    <View key={area._id} style={[s.card, { backgroundColor: colors.card }]}>
      {/* Top section: name, slug, status toggle */}
      <View style={s.cardTopRow}>
        <View style={s.cardTitleSection}>
          <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
            {area.name}
          </Text>
          <Text style={[s.cardSlug, { color: colors.secondaryText }]} numberOfLines={1}>
            {area.slug}
          </Text>
        </View>
        <Switch
          value={area.isActive}
          onValueChange={() => handleToggleActive(area)}
          trackColor={{ false: colors.gray300, true: `${colors.success}90` }}
          thumbColor={area.isActive ? colors.success : colors.muted}
        />
      </View>

      {/* Location info */}
      <View style={s.cardInfoSection}>
        <View style={s.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.secondaryText} />
          <Text style={[s.infoText, { color: colors.secondaryText }]}>
            {[area.city, area.state, area.country].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={s.infoRow}>
          <Ionicons name="navigate-outline" size={14} color={colors.secondaryText} />
          <Text style={[s.infoText, { color: colors.secondaryText }]}>
            {area.coordinates?.lat?.toFixed(4)}, {area.coordinates?.lng?.toFixed(4)}
          </Text>
        </View>
      </View>

      {/* Metrics row */}
      <View style={s.metricsRow}>
        <View style={[s.metricChip, { backgroundColor: `${colors.info}10` }]}>
          <Ionicons name="resize-outline" size={13} color={colors.info} />
          <Text style={[s.metricText, { color: colors.info }]}>
            {area.radius != null ? `${area.radius} km` : '--'}
          </Text>
        </View>
        <View style={[s.metricChip, { backgroundColor: `${colors.warning}10` }]}>
          <Ionicons name="arrow-up-outline" size={13} color={colors.warning} />
          <Text style={[s.metricText, { color: colors.warning }]}>
            Priority: {area.priority ?? 0}
          </Text>
        </View>
        <View style={[s.metricChip, { backgroundColor: `${colors.success}10` }]}>
          <Ionicons name="pricetag-outline" size={13} color={colors.success} />
          <Text style={[s.metricText, { color: colors.success }]}>
            {area.totalDeals ?? 0} deals
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={[s.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: `${colors.info}10` }]}
          onPress={() => handleEdit(area)}
        >
          <Ionicons name="pencil" size={16} color={colors.info} />
          <Text style={[s.actionBtnText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: `${colors.error}10` }]}
          onPress={() => handleDelete(area)}
        >
          <Ionicons name="trash" size={16} color={colors.error} />
          <Text style={[s.actionBtnText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ==========================================
  // RENDER: EMPTY STATE
  // ==========================================

  const renderEmptyState = () => (
    <View style={s.emptyState}>
      <Ionicons name="location-outline" size={48} color={colors.secondaryText} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No Hotspot Areas</Text>
      <Text style={[s.emptyText, { color: colors.secondaryText }]}>
        {searchQuery.trim()
          ? 'No areas match your search. Try a different query.'
          : 'Create your first hotspot area to get started.'}
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity
          style={[s.emptyBtn, { backgroundColor: colors.tint }]}
          onPress={handleCreateNew}
        >
          <Ionicons name="add" size={18} color={colors.card} />
          <Text style={s.emptyBtnText}>Create Area</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ==========================================
  // RENDER: CREATE/EDIT MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowModal(false)} style={s.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {editingArea ? 'Edit Hotspot Area' : 'Create Hotspot Area'}
          </Text>
          <TouchableOpacity
            style={[s.modalSaveBtn, { backgroundColor: colors.tint }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.modalSaveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal Body */}
        <ScrollView
          style={s.modalBody}
          contentContainerStyle={s.modalBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Name *</Text>
            <TextInput
              style={[
                s.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.name}
              onChangeText={(text) => {
                setFormData((p) => ({
                  ...p,
                  name: text,
                  slug: editingArea ? p.slug : generateSlug(text),
                }));
              }}
              placeholder="e.g. Downtown Dubai"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* Slug */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Slug</Text>
            <TextInput
              style={[
                s.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.slug}
              onChangeText={(text) => setFormData((p) => ({ ...p, slug: text }))}
              placeholder="auto-generated-from-name"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* City */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>City *</Text>
            <TextInput
              style={[
                s.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.city}
              onChangeText={(text) => setFormData((p) => ({ ...p, city: text }))}
              placeholder="e.g. Dubai"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* State */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>State</Text>
            <TextInput
              style={[
                s.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.state}
              onChangeText={(text) => setFormData((p) => ({ ...p, state: text }))}
              placeholder="e.g. Dubai (optional)"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* Country */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Country *</Text>
            <TextInput
              style={[
                s.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.country}
              onChangeText={(text) => setFormData((p) => ({ ...p, country: text }))}
              placeholder="e.g. UAE"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* Coordinates */}
          <View style={s.formRow}>
            <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[s.formLabel, { color: colors.text }]}>Latitude *</Text>
              <TextInput
                style={[
                  s.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={formData.lat}
                onChangeText={(text) => setFormData((p) => ({ ...p, lat: text }))}
                placeholder="25.2048"
                placeholderTextColor={colors.secondaryText}
                keyboardType="numeric"
              />
            </View>
            <View style={[s.formGroup, { flex: 1 }]}>
              <Text style={[s.formLabel, { color: colors.text }]}>Longitude *</Text>
              <TextInput
                style={[
                  s.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={formData.lng}
                onChangeText={(text) => setFormData((p) => ({ ...p, lng: text }))}
                placeholder="55.2708"
                placeholderTextColor={colors.secondaryText}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Radius */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Radius (km) *</Text>
            <TextInput
              style={[
                s.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.radius}
              onChangeText={(text) => setFormData((p) => ({ ...p, radius: text }))}
              placeholder="e.g. 5"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
            />
          </View>

          {/* Image URL */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Image URL</Text>
            <TextInput
              style={[
                s.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.image}
              onChangeText={(text) => setFormData((p) => ({ ...p, image: text }))}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Priority */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Priority</Text>
            <TextInput
              style={[
                s.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.priority}
              onChangeText={(text) => setFormData((p) => ({ ...p, priority: text }))}
              placeholder="0"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
            />
          </View>

          {/* Active Toggle */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Active</Text>
            <View
              style={[
                s.switchBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[s.switchLabel, { color: colors.secondaryText }]}>
                {formData.isActive ? 'Yes' : 'No'}
              </Text>
              <Switch
                value={formData.isActive}
                onValueChange={(val) => setFormData((p) => ({ ...p, isActive: val }))}
                trackColor={{ false: colors.gray300, true: `${colors.success}90` }}
                thumbColor={formData.isActive ? colors.success : colors.muted}
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  if (loading && areas.length === 0) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[s.loadingText, { color: colors.secondaryText }]}>
            Loading hotspot areas...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={s.scrollContent}
      >
        {renderHeader()}
        {renderStatsRow()}
        {renderFilterTabs()}
        {renderSearchBar()}

        {filteredAreas.length === 0
          ? renderEmptyState()
          : filteredAreas.map((area) => renderAreaCard(area))}

        <View style={{ height: 20 }} />
      </ScrollView>

      {renderFormModal()}
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

