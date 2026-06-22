import React, { useState, useEffect, useCallback } from 'react';
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
import {
  storeCollectionsService,
  StoreCollectionConfig,
} from '../../services/api/storeCollections';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/store-collections.styles';

interface EditFormData {
  displayName: string;
  description: string;
  icon: string;
  color: string;
  badgeText: string;
  imageUrl: string;
  sortOrder: string;
  regions: string;
  tags: string;
}

const DEFAULT_FORM: EditFormData = {
  displayName: '',
  description: '',
  icon: '',
  color: '#7B61FF',
  badgeText: '',
  imageUrl: '',
  sortOrder: '0',
  regions: '',
  tags: '',
};

export default function StoreCollectionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [configs, setConfigs] = useState<StoreCollectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StoreCollectionConfig | null>(null);
  const [formData, setFormData] = useState<EditFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await storeCollectionsService.getAll();
      if (response.success && response.data) {
        setConfigs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      showAlert('Error', 'Failed to load store collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConfigs();
  }, [fetchConfigs]);

  const handleSeed = useCallback(async () => {
    const confirmed = await showConfirm(
      'Seed Defaults',
      "This will create default category configurations if they don't exist. Continue?"
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await storeCollectionsService.seed();
      showAlert('Success', 'Default configurations seeded');
      await fetchConfigs();
    } catch {
      showAlert('Error', 'Failed to seed configurations');
    } finally {
      setLoading(false);
    }
  }, [fetchConfigs]);

  const handleToggleEnabled = useCallback(async (config: StoreCollectionConfig) => {
    const action = config.isEnabled ? 'Disable' : 'Enable';
    const confirmed = await showConfirm(
      `${action} Collection?`,
      `${action} "${config.displayName}"?`
    );
    if (!confirmed) return;

    const previousEnabled = config.isEnabled;
    // Optimistic update
    setConfigs((prev) =>
      prev.map((c) =>
        c.categoryKey === config.categoryKey ? { ...c, isEnabled: !c.isEnabled } : c
      )
    );
    try {
      await storeCollectionsService.update(config.categoryKey, {
        isEnabled: !previousEnabled,
      });
    } catch {
      // Rollback on failure
      setConfigs((prev) =>
        prev.map((c) =>
          c.categoryKey === config.categoryKey ? { ...c, isEnabled: previousEnabled } : c
        )
      );
      showAlert('Error', 'Failed to toggle category');
    }
  }, []);

  const handleEdit = useCallback((config: StoreCollectionConfig) => {
    setEditingConfig(config);
    setFormData({
      displayName: config.displayName,
      description: config.description,
      icon: config.icon,
      color: config.color,
      badgeText: config.badgeText || '',
      imageUrl: config.imageUrl || '',
      sortOrder: String(config.sortOrder),
      regions: (config.regions || []).join(', '),
      tags: (config.tags || []).join(', '),
    });
    setEditModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingConfig) return;

    setSaving(true);
    try {
      await storeCollectionsService.update(editingConfig.categoryKey, {
        displayName: formData.displayName,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        badgeText: formData.badgeText,
        imageUrl: formData.imageUrl,
        sortOrder: parseInt(formData.sortOrder, 10) || 0,
        regions: formData.regions
          ? formData.regions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      });
      showAlert('Success', 'Category updated');
      setEditModalVisible(false);
      await fetchConfigs();
    } catch {
      showAlert('Error', 'Failed to update category');
    } finally {
      setSaving(false);
    }
  }, [editingConfig, formData, fetchConfigs]);

  if (loading && configs.length === 0) {
    return (
      <View style={[s.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.text }]}>
          Loading store collections...
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerTitleContainer}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Store Collections
          </Text>
          <Text style={[s.headerSubtitle, { color: colors.textSecondary }]}>
            Manage delivery category display on the Store page
          </Text>
        </View>
        <TouchableOpacity
          style={[s.seedButton, { backgroundColor: colors.success }]}
          onPress={handleSeed}
        >
          <Ionicons name="flash" size={16} color={colors.card} />
          <Text style={s.seedButtonText}>Seed Defaults</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }
      >
        {configs.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="grid-outline" size={48} color={colors.textSecondary} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              No store collections configured. Tap "Seed Defaults" to create them.
            </Text>
          </View>
        ) : (
          configs.map((config) => (
            <View
              key={config.categoryKey}
              style={[
                s.configCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={s.cardHeader}>
                <View style={[s.colorDot, { backgroundColor: config.color }]} />
                <View style={s.cardInfo}>
                  <Text style={[s.cardTitle, { color: colors.text }]}>
                    {config.displayName}
                  </Text>
                  <Text style={[s.cardKey, { color: colors.textSecondary }]}>
                    {config.categoryKey}
                  </Text>
                </View>
                <View style={s.cardActions}>
                  <Text style={[s.sortOrderText, { color: colors.textSecondary }]}>
                    #{config.sortOrder}
                  </Text>
                  <Switch
                    value={config.isEnabled}
                    onValueChange={() => handleToggleEnabled(config)}
                    trackColor={{ false: colors.gray300, true: '#86EFAC' }}
                    thumbColor={config.isEnabled ? colors.success : colors.icon}
                  />
                  <TouchableOpacity style={s.editButton} onPress={() => handleEdit(config)}>
                    <Ionicons name="create-outline" size={18} color={colors.tint} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text
                style={[s.cardDescription, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {config.description}
              </Text>
              <View style={s.cardMeta}>
                <Text style={[s.metaText, { color: colors.textSecondary }]}>
                  Icon: {config.icon || 'none'}
                </Text>
                {config.badgeText ? (
                  <View style={[s.badgeChip, { backgroundColor: config.color + '20' }]}>
                    <Text style={[s.badgeChipText, { color: config.color }]}>
                      {config.badgeText}
                    </Text>
                  </View>
                ) : null}
                {config.regions && config.regions.length > 0 && (
                  <Text style={[s.metaText, { color: colors.textSecondary }]}>
                    Regions: {config.regions.join(', ')}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={[s.modalCancel, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              Edit {editingConfig?.categoryKey}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={[s.modalSave, { color: colors.tint }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={s.formContainer}>
            {(
              [
                { key: 'displayName', label: 'Display Name', placeholder: 'e.g. 30 min delivery' },
                {
                  key: 'description',
                  label: 'Description',
                  placeholder: 'Category description',
                  multiline: true,
                },
                { key: 'icon', label: 'Icon (emoji)', placeholder: 'e.g. \ud83d\ude80' },
                { key: 'color', label: 'Color (hex)', placeholder: '#7B61FF' },
                { key: 'badgeText', label: 'Badge Text', placeholder: 'e.g. 30 min' },
                { key: 'imageUrl', label: 'Image URL (optional CDN)', placeholder: 'https://...' },
                {
                  key: 'sortOrder',
                  label: 'Sort Order',
                  placeholder: '1',
                  keyboardType: 'numeric',
                },
                { key: 'regions', label: 'Regions (comma-separated)', placeholder: 'dubai, india' },
                { key: 'tags', label: 'Tags (comma-separated)', placeholder: 'fast, popular' },
              ] as const
            ).map((field) => (
              <View key={field.key} style={s.formField}>
                <Text style={[s.fieldLabel, { color: colors.text }]}>{field.label}</Text>
                <TextInput
                  style={[
                    s.fieldInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                    (field as unknown as {multiline?: boolean}).multiline && s.multilineInput,
                  ]}
                  value={formData[field.key as keyof EditFormData]}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, [field.key]: text }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  multiline={(field as unknown as {multiline?: boolean}).multiline}
                  keyboardType={(field as unknown as {keyboardType?: string}).keyboardType || 'default'}
                />
              </View>
            ))}
            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

