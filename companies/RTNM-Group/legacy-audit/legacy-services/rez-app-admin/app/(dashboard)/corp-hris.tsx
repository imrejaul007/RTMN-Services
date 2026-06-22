/**
 * CorpPerks HRIS Integration Page
 * Route: /corp-hris
 * Configure HRIS sync settings
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatusBadge } from '@/components/corp-perks';
import { corpHRISApi, type HRISConfig, type SyncResult } from '@/services/api/corpHRIS';

const HRIS_PROVIDERS = [
  { value: 'greythr', label: 'GreytHR', icon: 'people-outline' },
  { value: 'zoho_people', label: 'Zoho People', icon: 'people-outline' },
  { value: 'bamboo_hr', label: 'BambooHR', icon: 'people-outline' },
  { value: 'workday', label: 'Workday', icon: 'briefcase-outline' },
  { value: 'sap_successfactors', label: 'SAP SuccessFactors', icon: 'briefcase-outline' },
  { value: 'custom', label: 'Custom API', icon: 'code-slash-outline' },
];

const SYNC_INTERVALS = [
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Once Daily' },
  { value: 'weekly', label: 'Once Weekly' },
];

const MOCK_CONFIG: HRISConfig = {
  _id: '1',
  companyId: 'C001',
  provider: 'greythr',
  status: 'active',
  lastSyncAt: '2024-04-29T10:30:00Z',
  lastSyncStatus: 'success',
  config: {
    apiKey: '••••••••••••••••',
    baseUrl: 'https://api.greythr.com/v1',
  },
  syncSettings: {
    autoSync: true,
    syncInterval: 'daily',
    syncFields: ['name', 'email', 'department', 'designation', 'status'],
    createOnSync: true,
    updateOnSync: true,
    deactivateOnSync: false,
  },
  errorLog: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-04-29',
};

export default function HRISPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [config, setConfig] = useState<HRISConfig | null>(MOCK_CONFIG);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await corpHRISApi.triggerSync();
      Alert.alert(
        'Sync Complete',
        `Created: ${result.stats.created}\nUpdated: ${result.stats.updated}\nErrors: ${result.stats.errors}`
      );
    } catch (error) {
      Alert.alert('Sync Failed', 'Unable to sync with HRIS system');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      // In real implementation, call API
      Alert.alert('Saved', 'HRIS configuration saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoSync = () => {
    if (!config) return;
    setConfig({
      ...config,
      syncSettings: {
        ...config.syncSettings,
        autoSync: !config.syncSettings.autoSync,
      },
    });
  };

  const updateProvider = (provider: HRISConfig['provider']) => {
    if (!config) return;
    setConfig({ ...config, provider });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>HRIS Integration</Text>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Sync employee data from your HRIS system
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sync Status */}
        {config && (
          <Card>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusDot, {
                  backgroundColor: config.status === 'active' ? '#22c55e' :
                    config.status === 'error' ? '#ef4444' : '#f59e0b'
                }]} />
                <View>
                  <Text style={[styles.statusLabel, { color: colors.text }]}>
                    {config.status === 'active' ? 'Connected' :
                      config.status === 'error' ? 'Error' : 'Inactive'}
                  </Text>
                  <Text style={[styles.statusMeta, { color: colors.textSecondary }]}>
                    Last sync: {formatDate(config.lastSyncAt)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: colors.tint }]}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sync-outline" size={18} color="#fff" />
                    <Text style={styles.syncButtonText}>Sync Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Provider Selection */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>HRIS Provider</Text>
          <View style={styles.providerGrid}>
            {HRIS_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.value}
                style={[
                  styles.providerButton,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  config?.provider === provider.value && {
                    borderColor: colors.tint,
                    backgroundColor: colors.tint + '15'
                  },
                ]}
                onPress={() => updateProvider(provider.value as HRISConfig['provider'])}
              >
                <Ionicons
                  name={provider.icon as any}
                  size={24}
                  color={config?.provider === provider.value ? colors.tint : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.providerLabel,
                    { color: config?.provider === provider.value ? colors.tint : colors.text },
                  ]}
                >
                  {provider.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* API Configuration */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>API Configuration</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>API Key</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }]}
              value={config?.config?.apiKey || ''}
              onChangeText={(v) => setConfig({
                ...config!,
                config: { ...config!.config, apiKey: v }
              })}
              placeholder="Enter your API key"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Base URL</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }]}
              value={config?.config?.baseUrl || ''}
              onChangeText={(v) => setConfig({
                ...config!,
                config: { ...config!.config, baseUrl: v }
              })}
              placeholder="https://api.example.com/v1"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <TouchableOpacity
            style={[styles.testButton, { borderColor: colors.tint }]}
            onPress={() => Alert.alert('Test Connection', 'Testing connection to HRIS...')}
          >
            <Ionicons name="link-outline" size={18} color={colors.tint} />
            <Text style={[styles.testButtonText, { color: colors.tint }]}>Test Connection</Text>
          </TouchableOpacity>
        </Card>

        {/* Sync Settings */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sync Settings</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Auto Sync</Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Automatically sync employee data
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggle,
                { backgroundColor: config?.syncSettings?.autoSync ? colors.tint : colors.border }
              ]}
              onPress={toggleAutoSync}
            >
              <View style={[
                styles.toggleKnob,
                { transform: [{ translateX: config?.syncSettings?.autoSync ? 20 : 0 }] }
              ]} />
            </TouchableOpacity>
          </View>

          {config?.syncSettings?.autoSync && (
            <View style={[styles.field, { marginTop: 16 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Sync Interval</Text>
              <View style={styles.intervalButtons}>
                {SYNC_INTERVALS.map((interval) => (
                  <TouchableOpacity
                    key={interval.value}
                    style={[
                      styles.intervalButton,
                      { backgroundColor: colors.background },
                      config?.syncSettings?.syncInterval === interval.value && {
                        backgroundColor: colors.tint
                      },
                    ]}
                    onPress={() => setConfig({
                      ...config!,
                      syncSettings: {
                        ...config!.syncSettings,
                        syncInterval: interval.value as any
                      }
                    })}
                  >
                    <Text
                      style={[
                        styles.intervalButtonText,
                        { color: config?.syncSettings?.syncInterval === interval.value ? '#fff' : colors.text }
                      ]}
                    >
                      {interval.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.field, { marginTop: 16 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sync Options</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionCheckbox,
                  { borderColor: colors.border },
                  config?.syncSettings?.createOnSync && { backgroundColor: colors.tint, borderColor: colors.tint }
                ]}
                onPress={() => setConfig({
                  ...config!,
                  syncSettings: { ...config!.syncSettings, createOnSync: !config!.syncSettings.createOnSync }
                })}
              >
                {config?.syncSettings?.createOnSync && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                Create new employees on sync
              </Text>
            </View>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionCheckbox,
                  { borderColor: colors.border },
                  config?.syncSettings?.updateOnSync && { backgroundColor: colors.tint, borderColor: colors.tint }
                ]}
                onPress={() => setConfig({
                  ...config!,
                  syncSettings: { ...config!.syncSettings, updateOnSync: !config!.syncSettings.updateOnSync }
                })}
              >
                {config?.syncSettings?.updateOnSync && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                Update existing employees
              </Text>
            </View>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionCheckbox,
                  { borderColor: colors.border },
                  config?.syncSettings?.deactivateOnSync && { backgroundColor: colors.tint, borderColor: colors.tint }
                ]}
                onPress={() => setConfig({
                  ...config!,
                  syncSettings: { ...config!.syncSettings, deactivateOnSync: !config!.syncSettings.deactivateOnSync }
                })}
              >
                {config?.syncSettings?.deactivateOnSync && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                Deactivate terminated employees
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerButton: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  providerLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  testButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  intervalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  intervalButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  optionCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 14,
  },
});
