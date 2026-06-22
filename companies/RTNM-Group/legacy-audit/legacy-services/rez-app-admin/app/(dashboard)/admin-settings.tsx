/**
 * app/(dashboard)/admin-settings.tsx
 *
 * Admin Settings Screen
 * - Platform Settings: cashback multiplier, maintenance mode, max coins/day
 * - Admin Users: list + add admin (email + role)
 * - Save with confirmation
 */

import React, { useState, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { showAlert, showConfirm } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { s } from './styles/admin-settings.styles';
import {
  useSavePlatformSettings,
  useAddAdminUser,
  type PlatformSettings,
  type AdminUser,
} from '@/hooks/queries/useAdminSettingsMutations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
// PlatformSettings and AdminUser are now imported from useAdminSettingsMutations
// to avoid duplication and ensure type consistency.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function AdminSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, hasRole } = useAuth();

  // Platform settings state
  const [settings, setSettings] = useState<PlatformSettings>({
    cashbackMultiplier: 1,
    maintenanceMode: false,
    maxCoinsPerDay: 500,
  });
  const [maxCoinsInput, setMaxCoinsInput] = useState('500');
  const [settingsDirty, setSettingsDirty] = useState(false);

  // Admin users state
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add admin modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');

  // NEW-A-M1 FIX: All mutations now go through React Query via useAdminMutation.
  // This gives us: automatic error handling, retry on failure, and isPending loading state.
  const saveSettings = useSavePlatformSettings();
  const addAdminUser = useAddAdminUser();

  const fetchAll = useCallback(async () => {
    try {
      const [settingsRes, adminsRes] = await Promise.allSettled([
        apiClient.get<PlatformSettings>('admin/settings'),
        apiClient.get<AdminUser[]>('admin/admin-users'),
      ]);

      if (
        settingsRes.status === 'fulfilled' &&
        settingsRes.value.success &&
        settingsRes.value.data
      ) {
        const s = settingsRes.value.data;
        setSettings(s);
        setMaxCoinsInput(String(s.maxCoinsPerDay));
      }
      if (adminsRes.status === 'fulfilled' && adminsRes.value.success && adminsRes.value.data) {
        setAdmins(adminsRes.value.data);
      } else {
        setAdmins([]);
      }
    } catch (err: any) {
      logger.error('Admin settings fetch error:', err.message);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoadingAdmins(true);
      fetchAll();
    }, [fetchAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // A10-H10 FIX: Platform settings (cashback multiplier, maintenance mode, max coins)
  // are financial and operational levers. Only super_admin can change them.
  // NEW-A-M1 FIX: Now uses React Query mutation (useSavePlatformSettings) instead of
  // raw apiClient.patch — errors flow through React Query's onError, retries are automatic.
  const handleSave = useCallback(async () => {
    if (!hasRole(ADMIN_ROLES.SUPER_ADMIN)) {
      showAlert('Access Denied', 'Only super admins can modify platform settings.');
      return;
    }

    const confirmed = await showConfirm(
      'Save Settings',
      'Apply platform settings changes? This may affect all users.'
    );
    if (!confirmed) return;

    const payload: PlatformSettings = {
      cashbackMultiplier: settings.cashbackMultiplier,
      maintenanceMode: settings.maintenanceMode,
      maxCoinsPerDay: parseInt(maxCoinsInput, 10) || settings.maxCoinsPerDay,
    };

    try {
      const result = await saveSettings.mutateAsync(payload);
      if (result.success && result.data) {
        setSettings(result.data);
        setMaxCoinsInput(String(result.data.maxCoinsPerDay));
        setSettingsDirty(false);
        showAlert('Saved', 'Platform settings updated successfully.');
      } else {
        showAlert('Error', result.message || 'Failed to save settings.');
      }
    } catch (err: any) {
      // React Query catches the error; this block only runs for unexpected errors.
      showAlert('Error', err.message || 'Failed to save settings.');
    }
  }, [settings, maxCoinsInput, hasRole, saveSettings]);

  // NEW-A-M1 FIX: Uses React Query mutation (useAddAdminUser) instead of raw apiClient.post.
  const handleAddAdmin = useCallback(async () => {
    if (!newAdminEmail.trim()) {
      showAlert('Validation', 'Please enter an email address.');
      return;
    }
    try {
      const result = await addAdminUser.mutateAsync({
        email: newAdminEmail.trim(),
        role: newAdminRole,
      });
      if (result.success && result.data) {
        setAdmins((prev) => [result.data!, ...prev]);
        setAddModalVisible(false);
        setNewAdminEmail('');
        setNewAdminRole('admin');
        showAlert('Admin Added', `${newAdminEmail} has been added as ${newAdminRole}.`);
      } else {
        showAlert('Error', result.message || 'Failed to add admin.');
      }
    } catch (err: any) {
      // React Query catches the error; this block only runs for unexpected errors.
      showAlert('Error', err.message || 'Failed to add admin.');
    }
  }, [newAdminEmail, newAdminRole, addAdminUser]);

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSettingsDirty(true);
  };

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={s.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.tint }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Admin Settings</Text>
          <Text style={s.headerSub}>Platform configuration</Text>
        </View>
        {settingsDirty && (
          <TouchableOpacity
            style={[s.saveBtn, saveSettings.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Platform Settings */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Platform Settings</Text>

        <View style={[s.card, { backgroundColor: colors.card }]}>
          {/* Cashback Multiplier */}
          <View style={[s.settingRow, { borderBottomColor: colors.border }]}>
            <View style={[s.settingIcon, { backgroundColor: '#F59E0B18' }]}>
              <Ionicons name="flash" size={18} color="#F59E0B" />
            </View>
            <View style={s.settingText}>
              <Text style={[s.settingLabel, { color: colors.text }]}>Cashback Multiplier</Text>
              <Text style={[s.settingSubtitle, { color: colors.icon }]}>
                {settings.cashbackMultiplier === 2
                  ? 'Double cashback active (2x)'
                  : 'Standard cashback (1x)'}
              </Text>
            </View>
            <View style={s.multiplierToggle}>
              <TouchableOpacity
                style={[
                  s.multiplierBtn,
                  settings.cashbackMultiplier === 1 && { backgroundColor: colors.tint },
                ]}
                onPress={() => updateSetting('cashbackMultiplier', 1)}
              >
                <Text
                  style={[
                    s.multiplierBtnText,
                    { color: settings.cashbackMultiplier === 1 ? '#fff' : colors.icon },
                  ]}
                >
                  1x
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.multiplierBtn,
                  settings.cashbackMultiplier === 2 && { backgroundColor: colors.tint },
                ]}
                onPress={() => updateSetting('cashbackMultiplier', 2)}
              >
                <Text
                  style={[
                    s.multiplierBtnText,
                    { color: settings.cashbackMultiplier === 2 ? '#fff' : colors.icon },
                  ]}
                >
                  2x
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Maintenance Mode */}
          <View style={[s.settingRow, { borderBottomColor: colors.border }]}>
            <View style={[s.settingIcon, { backgroundColor: '#EF444418' }]}>
              <Ionicons name="construct" size={18} color="#EF4444" />
            </View>
            <View style={s.settingText}>
              <Text style={[s.settingLabel, { color: colors.text }]}>Maintenance Mode</Text>
              <Text style={[s.settingSubtitle, { color: colors.icon }]}>
                Shows maintenance banner in consumer app
              </Text>
            </View>
            <Switch
              value={settings.maintenanceMode}
              onValueChange={(v) => updateSetting('maintenanceMode', v)}
              trackColor={{ true: '#EF4444', false: colors.border }}
              thumbColor={colors.card}
            />
          </View>

          {/* Max Coins Per Day */}
          <View style={[s.settingRow, s.settingRowLast]}>
            <View style={[s.settingIcon, { backgroundColor: '#6366F118' }]}>
              <Ionicons name="star" size={18} color="#6366F1" />
            </View>
            <View style={s.settingText}>
              <Text style={[s.settingLabel, { color: colors.text }]}>Max Coins Per Day</Text>
              <Text style={[s.settingSubtitle, { color: colors.icon }]}>
                Per-user daily coin earning limit
              </Text>
            </View>
            <TextInput
              style={[
                s.numberInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={maxCoinsInput}
              onChangeText={(v) => {
                setMaxCoinsInput(v);
                setSettingsDirty(true);
              }}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
        </View>

        {settingsDirty && (
          <TouchableOpacity
            style={[
              s.saveLargeBtn,
              { backgroundColor: colors.tint },
              saveSettings.status === 'pending' && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saveSettings.status === 'pending'}
          >
            {saveSettings.status === 'pending' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.saveLargeBtnText}>Save Platform Settings</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Admin Users */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Admin Users</Text>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.tint }]}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="person-add" size={14} color="#fff" />
            <Text style={s.addBtnText}>Add Admin</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: colors.card }]}>
          {loadingAdmins ? (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color={colors.tint} />
              <Text style={[s.loadingText, { color: colors.icon }]}>Loading admins...</Text>
            </View>
          ) : admins.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={32} color={colors.icon} />
              <Text style={[s.emptyText, { color: colors.icon }]}>No admin users found</Text>
            </View>
          ) : (
            admins.map((admin, idx) => (
              <View
                key={admin._id}
                style={[
                  s.adminRow,
                  idx < admins.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={[s.adminAvatar, { backgroundColor: `${colors.tint}18` }]}>
                  <Text style={[s.adminAvatarText, { color: colors.tint }]}>
                    {admin.name?.charAt(0)?.toUpperCase() ||
                      admin.email?.charAt(0)?.toUpperCase() ||
                      '?'}
                  </Text>
                </View>
                <View style={s.adminInfo}>
                  <Text style={[s.adminName, { color: colors.text }]}>
                    {admin.name || admin.email}
                  </Text>
                  <Text style={[s.adminEmail, { color: colors.icon }]}>{admin.email}</Text>
                </View>
                <View style={[s.roleBadge, { backgroundColor: `${colors.indigo}15` }]}>
                  <Text style={[s.roleText, { color: colors.indigo }]}>{admin.role}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={{ height: 32 }} />

      {/* Add Admin Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Add Admin</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <Text style={[s.modalLabel, { color: colors.icon }]}>Email Address</Text>
            <TextInput
              style={[
                s.modalInput,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="admin@rezapp.com"
              placeholderTextColor={colors.icon}
              value={newAdminEmail}
              onChangeText={setNewAdminEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[s.modalLabel, { color: colors.icon }]}>Role</Text>
            <View style={s.roleRow}>
              {['admin', 'super_admin', 'viewer'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    s.roleChip,
                    {
                      backgroundColor: newAdminRole === role ? colors.tint : colors.background,
                      borderColor: newAdminRole === role ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => setNewAdminRole(role)}
                >
                  <Text
                    style={[
                      s.roleChipText,
                      { color: newAdminRole === role ? '#fff' : colors.text },
                    ]}
                  >
                    {role.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                s.modalSaveBtn,
                { backgroundColor: colors.tint },
                addAdminUser.status === 'pending' && { opacity: 0.6 },
              ]}
              onPress={handleAddAdmin}
              disabled={addAdminUser.status === 'pending'}
            >
              {addAdminUser.status === 'pending' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.modalSaveBtnText}>Add Admin</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

