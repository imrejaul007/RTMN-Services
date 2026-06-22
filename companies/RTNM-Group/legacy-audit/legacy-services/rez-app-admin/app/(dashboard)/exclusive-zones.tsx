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
import { exclusiveZonesService, ExclusiveZone } from '../../services/api/exclusiveZones';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/exclusive-zones.styles';

const ELIGIBILITY_TYPES = [
  'corporate_email',
  'gender',
  'birthday_month',
  'student',
  'age',
  'verification',
  'profession',
  'disability',
];

export default function ExclusiveZonesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [zones, setZones] = useState<ExclusiveZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ExclusiveZone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIcon, setFormIcon] = useState('gift');
  const [formIconColor, setFormIconColor] = useState(colors.emerald);
  const [formBgColor, setFormBgColor] = useState(colors.successLight);
  const [formDescription, setFormDescription] = useState('');
  const [formEligibilityType, setFormEligibilityType] = useState('student');
  const [formEligibilityDetails, setFormEligibilityDetails] = useState('');
  const [formVerificationRequired, setFormVerificationRequired] = useState(false);
  const [formPriority, setFormPriority] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchZones = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await exclusiveZonesService.getZones(params);
      if (response.success && response.data) {
        setZones(response.data.zones || []);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load zones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormIcon('gift');
    setFormIconColor(colors.emerald);
    setFormBgColor(colors.successLight);
    setFormDescription('');
    setFormEligibilityType('student');
    setFormEligibilityDetails('');
    setFormVerificationRequired(false);
    setFormPriority('0');
    setFormIsActive(true);
    setEditingZone(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (zone: ExclusiveZone) => {
    setEditingZone(zone);
    setFormName(zone.name);
    setFormSlug(zone.slug);
    setFormIcon(zone.icon);
    setFormIconColor(zone.iconColor);
    setFormBgColor(zone.backgroundColor);
    setFormDescription(zone.description || '');
    setFormEligibilityType(zone.eligibilityType);
    setFormEligibilityDetails(zone.eligibilityDetails || '');
    setFormVerificationRequired(zone.verificationRequired);
    setFormPriority(String(zone.priority));
    setFormIsActive(zone.isActive);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formSlug || !formEligibilityType) {
      showAlert('Error', 'Name, slug, and eligibility type are required');
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        name: formName,
        slug: formSlug,
        icon: formIcon,
        iconColor: formIconColor,
        backgroundColor: formBgColor,
        description: formDescription || undefined,
        eligibilityType: formEligibilityType,
        eligibilityDetails: formEligibilityDetails || undefined,
        verificationRequired: formVerificationRequired,
        priority: parseInt(formPriority) || 0,
        isActive: formIsActive,
      };
      if (editingZone) {
        // Spread existing zone first to preserve fields not in the form, then overlay form data
        const payload = { ...editingZone, ...data };
        await exclusiveZonesService.updateZone(editingZone._id, payload);
      } else await exclusiveZonesService.createZone(data);
      setShowModal(false);
      resetForm();
      fetchZones();
      showAlert('Success', editingZone ? 'Zone updated' : 'Zone created');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (zone: ExclusiveZone) => {
    try {
      await exclusiveZonesService.toggleZone(zone._id);
      fetchZones();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleDelete = async (zone: ExclusiveZone) => {
    const confirmed = await showConfirm('Delete Zone', `Delete "${zone.name}"?`);
    if (!confirmed) return;
    try {
      await exclusiveZonesService.deleteZone(zone._id);
      fetchZones();
      showAlert('Success', 'Zone deleted');
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const stats = {
    total: zones.length,
    active: zones.filter((z) => z.isActive).length,
    inactive: zones.filter((z) => !z.isActive).length,
  };

  const getEligibilityColor = (type: string) => {
    const map: Record<string, string> = {
      student: colors.info,
      corporate_email: colors.purple,
      gender: colors.pink,
      birthday_month: colors.warning,
      age: colors.success,
      verification: colors.indigo,
    };
    return map[type] || colors.mutedDark;
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchZones();
          }}
        />
      }
    >
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
              Exclusive Zones
            </Text>
            <Text style={[s.subtitle, { color: colors.icon }]}>
              Manage exclusive access zones
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
          <TouchableOpacity
            style={[
              s.addBtn,
              { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.tint },
            ]}
            onPress={() => router.push('/institutions')}
          >
            <Ionicons name="business" size={16} color={colors.tint} />
            <Text style={[s.addBtnText, { color: colors.tint }]}>Institutions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.tint }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={20} color={colors.card} />
            <Text style={[s.addBtnText, { color: colors.card }]}>Add Zone</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: colors.info },
          { label: 'Active', value: stats.active, color: colors.success },
          { label: 'Inactive', value: stats.inactive, color: colors.error },
        ].map((stat) => (
          <View
            key={stat.label}
            style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.filtersRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              s.filterChip,
              { backgroundColor: colors.border },
              filter === f && { backgroundColor: colors.tint },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                s.filterText,
                { color: colors.secondaryText },
                filter === f && { color: colors.card },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={[
          s.searchBar,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search zones..."
          placeholderTextColor={colors.icon}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {zones.map((zone) => (
        <View
          key={zone._id}
          style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={s.cardHeader}>
            <View style={[s.iconBadge, { backgroundColor: zone.backgroundColor }]}>
              <Ionicons name={(zone.icon || 'gift') as unknown as keyof typeof Ionicons.glyphMap} size={20} color={zone.iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>{zone.name}</Text>
              <Text style={[s.cardMeta, { color: colors.icon }]}>{zone.slug}</Text>
            </View>
            <Switch value={zone.isActive} onValueChange={() => handleToggle(zone)} />
          </View>
          {zone.description ? (
            <Text style={[s.cardDesc, { color: colors.icon }]} numberOfLines={2}>
              {zone.description}
            </Text>
          ) : null}
          <View style={s.tagRow}>
            <View
              style={[
                s.badge,
                { backgroundColor: getEligibilityColor(zone.eligibilityType) + '20' },
              ]}
            >
              <Text
                style={[s.badgeText, { color: getEligibilityColor(zone.eligibilityType) }]}
              >
                {zone.eligibilityType.replace('_', ' ')}
              </Text>
            </View>
            <Text style={[s.cardMeta, { color: colors.icon }]}>{zone.offersCount} offers</Text>
            {zone.verificationRequired && (
              <View style={[s.badge, { backgroundColor: `${colors.warning}20` }]}>
                <Text style={[s.badgeText, { color: colors.warning }]}>
                  Verification Required
                </Text>
              </View>
            )}
          </View>
          <View style={s.cardActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(zone)}>
              <Ionicons name="pencil" size={16} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(zone)}>
              <Ionicons name="trash" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {zones.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.icon} />
          <Text style={[s.emptyText, { color: colors.icon }]}>No exclusive zones found</Text>
        </View>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <ScrollView>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {editingZone ? 'Edit Zone' : 'Create Zone'}
              </Text>
              {[
                { label: 'Name *', value: formName, setter: setFormName },
                { label: 'Slug *', value: formSlug, setter: setFormSlug },
                { label: 'Icon', value: formIcon, setter: setFormIcon },
                { label: 'Icon Color', value: formIconColor, setter: setFormIconColor },
                { label: 'Background Color', value: formBgColor, setter: setFormBgColor },
                { label: 'Description', value: formDescription, setter: setFormDescription },
                {
                  label: 'Eligibility Details',
                  value: formEligibilityDetails,
                  setter: setFormEligibilityDetails,
                },
                {
                  label: 'Priority',
                  value: formPriority,
                  setter: setFormPriority,
                  keyboard: 'number-pad' as const,
                },
              ].map((field) => (
                <View key={field.label} style={s.formField}>
                  <Text style={[s.formLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[
                      s.formInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    value={field.value}
                    onChangeText={field.setter}
                    placeholderTextColor={colors.icon}
                    keyboardType={field.keyboard}
                  />
                </View>
              ))}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Eligibility Type *</Text>
                <View style={s.typeRow}>
                  {ELIGIBILITY_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        s.typeChip,
                        { backgroundColor: colors.border },
                        formEligibilityType === t && { backgroundColor: colors.tint },
                      ]}
                      onPress={() => setFormEligibilityType(t)}
                    >
                      <Text
                        style={[
                          s.typeChipText,
                          { color: colors.secondaryText },
                          formEligibilityType === t && { color: colors.card },
                        ]}
                      >
                        {t.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>
                  Verification Required
                </Text>
                <Switch
                  value={formVerificationRequired}
                  onValueChange={setFormVerificationRequired}
                />
              </View>
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Active</Text>
                <Switch value={formIsActive} onValueChange={setFormIsActive} />
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.secondaryText }]}
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Text style={[s.modalBtnText, { color: colors.card }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.tint }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.card} size="small" />
                  ) : (
                    <Text style={[s.modalBtnText, { color: colors.card }]}>
                      {editingZone ? 'Update' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

