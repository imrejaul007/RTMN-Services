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
import { specialProfilesService, SpecialProfile } from '../../services/api/specialProfiles';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/special-profiles.styles';

export default function SpecialProfilesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [profiles, setProfiles] = useState<SpecialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SpecialProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIcon, setFormIcon] = useState('shield');
  const [formIconColor, setFormIconColor] = useState(colors.successDark);
  const [formBgColor, setFormBgColor] = useState(colors.successLight);
  const [formDescription, setFormDescription] = useState('');
  const [formVerificationRequired, setFormVerificationRequired] = useState('');
  const [formVerificationTime, setFormVerificationTime] = useState('24-48 hours');
  const [formDiscountRange, setFormDiscountRange] = useState('');
  const [formPriority, setFormPriority] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchProfiles = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await specialProfilesService.getProfiles(params);
      if (response.success && response.data) setProfiles(response.data.profiles || []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormIcon('shield');
    setFormIconColor(colors.successDark);
    setFormBgColor(colors.successLight);
    setFormDescription('');
    setFormVerificationRequired('');
    setFormVerificationTime('24-48 hours');
    setFormDiscountRange('');
    setFormPriority('0');
    setFormIsActive(true);
    setEditingProfile(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };
  const openEdit = (p: SpecialProfile) => {
    setEditingProfile(p);
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormIcon(p.icon);
    setFormIconColor(p.iconColor);
    setFormBgColor(p.backgroundColor);
    setFormDescription(p.description || '');
    setFormVerificationRequired(p.verificationRequired);
    setFormVerificationTime(p.verificationTime);
    setFormDiscountRange(p.discountRange || '');
    setFormPriority(String(p.priority));
    setFormIsActive(p.isActive);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formSlug || !formVerificationRequired) {
      showAlert('Error', 'Name, slug, and verification info are required');
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
        verificationRequired: formVerificationRequired,
        verificationTime: formVerificationTime,
        discountRange: formDiscountRange || undefined,
        priority: parseInt(formPriority) || 0,
        isActive: formIsActive,
      };
      if (editingProfile) {
        // Spread existing profile first to preserve fields not in the form, then overlay form data
        const payload = { ...editingProfile, ...data };
        await specialProfilesService.updateProfile(editingProfile._id, payload);
      } else await specialProfilesService.createProfile(data);
      setShowModal(false);
      resetForm();
      fetchProfiles();
      showAlert('Success', editingProfile ? 'Profile updated' : 'Profile created');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: SpecialProfile) => {
    try {
      await specialProfilesService.toggleProfile(p._id);
      fetchProfiles();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleDelete = async (p: SpecialProfile) => {
    const confirmed = await showConfirm('Delete Profile', `Delete "${p.name}"?`);
    if (!confirmed) return;
    try {
      await specialProfilesService.deleteProfile(p._id);
      fetchProfiles();
      showAlert('Success', 'Profile deleted');
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const stats = {
    total: profiles.length,
    active: profiles.filter((p) => p.isActive).length,
    inactive: profiles.filter((p) => !p.isActive).length,
  };

  if (loading)
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchProfiles();
          }}
        />
      }
    >
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Special Profiles</Text>
          <Text style={[s.subtitle, { color: colors.icon }]}>
            Manage special access profiles
          </Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.tint }]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={[s.addBtnText, { color: colors.card }]}>Add Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: colors.info },
          { label: 'Active', value: stats.active, color: colors.success },
          { label: 'Inactive', value: stats.inactive, color: colors.error },
        ].map((item) => (
          <View
            key={item.label}
            style={[
              s.statCard,
              {
                backgroundColor: isDark ? colors.gray800 : colors.card,
                borderColor: isDark ? colors.gray700 : colors.gray200,
              },
            ]}
          >
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.filtersRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              s.filterChip,
              { backgroundColor: colors.gray200 },
              filter === f && { backgroundColor: colors.tint },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                s.filterText,
                { color: colors.mutedDark },
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
          {
            backgroundColor: isDark ? colors.gray800 : colors.backgroundSecondary,
            borderColor: isDark ? colors.gray700 : colors.gray200,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search profiles..."
          placeholderTextColor={colors.icon}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {profiles.map((p) => (
        <View
          key={p._id}
          style={[
            s.card,
            {
              backgroundColor: isDark ? colors.gray800 : colors.card,
              borderColor: isDark ? colors.gray700 : colors.gray200,
            },
          ]}
        >
          <View style={s.cardHeader}>
            <View style={[s.iconBadge, { backgroundColor: p.backgroundColor }]}>
              <Ionicons name={(p.icon || 'shield') as unknown as keyof typeof Ionicons.glyphMap} size={20} color={p.iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>{p.name}</Text>
              <Text style={[s.cardMeta, { color: colors.icon }]}>{p.slug}</Text>
            </View>
            <Switch value={p.isActive} onValueChange={() => handleToggle(p)} />
          </View>
          {p.description && (
            <Text style={[s.cardDesc, { color: colors.icon }]} numberOfLines={2}>
              {p.description}
            </Text>
          )}
          <View style={s.tagRow}>
            <Text style={[s.cardMeta, { color: colors.icon }]}>{p.offersCount} offers</Text>
            {p.discountRange && (
              <View style={[s.badge, { backgroundColor: `${colors.success}20` }]}>
                <Text style={[s.badgeText, { color: colors.success }]}>{p.discountRange}</Text>
              </View>
            )}
            <View style={[s.badge, { backgroundColor: `${colors.warning}20` }]}>
              <Text style={[s.badgeText, { color: colors.warning }]}>
                {p.verificationTime}
              </Text>
            </View>
          </View>
          <View style={s.cardActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(p)}>
              <Ionicons name="pencil" size={16} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(p)}>
              <Ionicons name="trash" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {profiles.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="ribbon-outline" size={48} color={colors.icon} />
          <Text style={[s.emptyText, { color: colors.icon }]}>No special profiles found</Text>
        </View>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View
            style={[
              s.modalContent,
              { backgroundColor: isDark ? colors.gray800 : colors.card },
            ]}
          >
            <ScrollView>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {editingProfile ? 'Edit Profile' : 'Create Profile'}
              </Text>
              {[
                { label: 'Name *', value: formName, setter: setFormName },
                { label: 'Slug *', value: formSlug, setter: setFormSlug },
                { label: 'Icon', value: formIcon, setter: setFormIcon },
                { label: 'Icon Color', value: formIconColor, setter: setFormIconColor },
                { label: 'Background Color', value: formBgColor, setter: setFormBgColor },
                { label: 'Description', value: formDescription, setter: setFormDescription },
                {
                  label: 'Verification Required *',
                  value: formVerificationRequired,
                  setter: setFormVerificationRequired,
                },
                {
                  label: 'Verification Time',
                  value: formVerificationTime,
                  setter: setFormVerificationTime,
                },
                { label: 'Discount Range', value: formDiscountRange, setter: setFormDiscountRange },
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
                        backgroundColor: isDark ? colors.gray700 : colors.backgroundSecondary,
                        borderColor: isDark ? colors.gray600 : colors.gray300,
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
                <Text style={[s.formLabel, { color: colors.text }]}>Active</Text>
                <Switch value={formIsActive} onValueChange={setFormIsActive} />
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.mutedDark }]}
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
                      {editingProfile ? 'Update' : 'Create'}
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

