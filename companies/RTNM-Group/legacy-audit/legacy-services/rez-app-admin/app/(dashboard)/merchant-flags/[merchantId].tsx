import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  useColorScheme,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../../utils/alert';
import { merchantFlagsService, MerchantFeatureFlags } from '../../../services/api/merchantFlags';

const FLAG_CATEGORIES = {
  reward: {
    label: 'REWARD FEATURES',
    icon: 'star',
    flags: {
      coinIssuance: 'Coin Issuance',
      cashbackEnabled: 'Cashback Enabled',
      firstVisitBonus: 'First Visit Bonus',
      extraRewardThreshold: 'Extra Reward Threshold',
    },
  },
  prive: {
    label: 'PRIVE FEATURES',
    icon: 'diamond',
    flags: {
      priveCampaigns: 'Prive Campaigns',
      coinDropCampaigns: 'Coin Drop Campaigns',
    },
  },
  billing: {
    label: 'BILLING FEATURES',
    icon: 'card',
    flags: {
      bbpsBillPayment: 'BBPS Bill Payment',
      upiQrPOS: 'UPI QR POS',
    },
  },
};

type FlagValue = 'global' | 'enabled' | 'disabled';

export default function MerchantFlagsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { merchantId, merchantName } = useLocalSearchParams();

  const [flags, setFlags] = useState<MerchantFeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [flagValues, setFlagValues] = useState<Record<string, FlagValue>>({});
  const [showResetModal, setShowResetModal] = useState(false);
  // M19 FIX: Custom flag state
  const [customFlagKeys, setCustomFlagKeys] = useState<string[]>([]);
  const [showAddFlagModal, setShowAddFlagModal] = useState(false);
  const [newFlagKey, setNewFlagKey] = useState('');
  const [newFlagValue, setNewFlagValue] = useState<FlagValue>('global');

  useEffect(() => {
    loadFlags();
  }, [merchantId]);

  const loadFlags = useCallback(async () => {
    if (!merchantId) return;
    try {
      setLoading(true);
      const data = await merchantFlagsService.getFlags(merchantId as string);
      setFlags(data);

      // Initialize flag values (null = global, true = enabled, false = disabled)
      const values: Record<string, FlagValue> = {};
      const knownKeys = new Set(
        Object.values(FLAG_CATEGORIES).flatMap((cat) => Object.keys(cat.flags))
      );

      // Known category flags
      Object.values(FLAG_CATEGORIES).forEach((category) => {
        Object.keys(category.flags).forEach((flagName) => {
          const flagValue = data.flags[flagName as keyof typeof data.flags];
          values[flagName] =
            flagValue === null || flagValue === undefined
              ? 'global'
              : flagValue
                ? 'enabled'
                : 'disabled';
        });
      });

      // M19 FIX: Detect extra flags from server not in FLAG_CATEGORIES
      const extraKeys: string[] = [];
      Object.keys(data.flags).forEach((flagName) => {
        if (!knownKeys.has(flagName)) {
          const flagValue = data.flags[flagName as keyof typeof data.flags];
          values[flagName] =
            flagValue === null || flagValue === undefined
              ? 'global'
              : flagValue
                ? 'enabled'
                : 'disabled';
          extraKeys.push(flagName);
        }
      });
      setCustomFlagKeys(extraKeys);
      setFlagValues(values);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  const handleFlagChange = (flagName: string, value: FlagValue) => {
    setFlagValues((prev) => ({
      ...prev,
      [flagName]: value,
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!merchantId || !dirty) return;

    try {
      setSaving(true);
      const flagsToUpdate: Record<string, boolean | null> = {};

      Object.keys(flagValues).forEach((flagName) => {
        const value = flagValues[flagName];
        if (value === 'global') {
          flagsToUpdate[flagName] = null;
        } else if (value === 'enabled') {
          flagsToUpdate[flagName] = true;
        } else {
          flagsToUpdate[flagName] = false;
        }
      });

      await merchantFlagsService.updateFlags(merchantId as string, flagsToUpdate);
      showAlert('Success', 'Feature flags saved successfully');
      setDirty(false);
      await loadFlags();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save flags');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!merchantId) return;
    try {
      setSaving(true);
      await merchantFlagsService.resetToGlobal(merchantId as string);
      showAlert('Success', 'Flags reset to global defaults');
      setShowResetModal(false);
      setDirty(false);
      await loadFlags();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reset flags');
    } finally {
      setSaving(false);
    }
  };

  // M19 FIX: Add a new custom flag key to the local list
  const handleAddFlag = () => {
    const key = newFlagKey.trim();
    if (!key) return;
    if (flagValues[key] !== undefined) {
      showAlert('Duplicate', `Flag "${key}" already exists.`);
      return;
    }
    setCustomFlagKeys((prev) => [...prev, key]);
    setFlagValues((prev) => ({ ...prev, [key]: newFlagValue }));
    setDirty(true);
    setNewFlagKey('');
    setNewFlagValue('global');
    setShowAddFlagModal(false);
  };

  const renderFlagToggle = (flagName: string, label: string) => {
    const value = flagValues[flagName] || 'global';

    return (
      <View key={flagName} style={[styles.flagRow, { borderBottomColor: colors.border }]}>
        <View style={styles.flagLabel}>
          <Text style={[styles.flagText, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.flagHint, { color: colors.icon }]}>
            {value === 'global'
              ? 'Global Default'
              : value === 'enabled'
                ? 'Override: ON'
                : 'Override: OFF'}
          </Text>
        </View>
        <View style={styles.flagToggle}>
          <TouchableOpacity
            onPress={() => handleFlagChange(flagName, 'global')}
            style={[
              styles.toggleButton,
              value === 'global' && { backgroundColor: colors.tint },
              !value && { borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text
              style={[
                styles.toggleButtonText,
                value === 'global' && { color: '#fff' },
                value !== 'global' && { color: colors.text },
              ]}
            >
              Global
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleFlagChange(flagName, 'enabled')}
            style={[
              styles.toggleButton,
              value === 'enabled' && { backgroundColor: colors.success },
              value !== 'enabled' && { borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text
              style={[
                styles.toggleButtonText,
                value === 'enabled' && { color: '#fff' },
                value !== 'enabled' && { color: colors.text },
              ]}
            >
              ON
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleFlagChange(flagName, 'disabled')}
            style={[
              styles.toggleButton,
              value === 'disabled' && { backgroundColor: colors.error },
              value !== 'disabled' && { borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text
              style={[
                styles.toggleButtonText,
                value === 'disabled' && { color: '#fff' },
                value !== 'disabled' && { color: colors.text },
              ]}
            >
              OFF
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Feature Flags</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Feature Flags</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            {merchantName ? `Merchant: ${merchantName}` : `ID: ${merchantId}`}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {Object.entries(FLAG_CATEGORIES).map(([categoryKey, category]) => (
          <View key={categoryKey} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons name={category.icon as unknown as keyof typeof Ionicons.glyphMap} size={20} color={colors.tint} />
              <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.label}</Text>
            </View>

            <View
              style={[
                styles.categoryContent,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {Object.entries(category.flags).map(([flagName, label]) =>
                renderFlagToggle(flagName, label)
              )}
            </View>
          </View>
        ))}

        {/* M19 FIX: Custom Overrides Section */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Ionicons name="code-slash" size={20} color={colors.tint} />
            <Text style={[styles.categoryTitle, { color: colors.text }]}>CUSTOM OVERRIDES</Text>
          </View>
          {customFlagKeys.length > 0 && (
            <View
              style={[
                styles.categoryContent,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {customFlagKeys.map((flagName) => renderFlagToggle(flagName, flagName))}
            </View>
          )}
          <TouchableOpacity
            onPress={() => setShowAddFlagModal(true)}
            style={[styles.addFlagButton, { borderColor: colors.tint }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.tint} />
            <Text style={[styles.addFlagText, { color: colors.tint }]}>Add Custom Flag</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View
          style={[
            styles.infoSection,
            { backgroundColor: colors.info + '10', borderColor: colors.info },
          ]}
        >
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Global: Uses merchant's default feature flags from global settings. ON: Feature always
            enabled for this merchant. OFF: Feature always disabled for this merchant.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View
        style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}
      >
        <TouchableOpacity
          onPress={() => setShowResetModal(true)}
          disabled={saving}
          style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Reset to Global</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !dirty}
          style={[styles.button, { backgroundColor: dirty ? colors.tint : colors.border }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.buttonText, { color: '#fff' }]}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* M19 FIX: Add Custom Flag Modal */}
      <Modal visible={showAddFlagModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Flag</Text>
            <TextInput
              value={newFlagKey}
              onChangeText={setNewFlagKey}
              placeholder="Flag key (e.g. referralEnabled)"
              placeholderTextColor={colors.icon}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.flagKeyInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            <View style={[styles.flagToggle, { marginBottom: 20 }]}>
              {(['global', 'enabled', 'disabled'] as FlagValue[]).map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setNewFlagValue(val)}
                  style={[
                    styles.toggleButton,
                    newFlagValue === val && {
                      backgroundColor:
                        val === 'global'
                          ? colors.tint
                          : val === 'enabled'
                            ? colors.success
                            : colors.error,
                    },
                    newFlagValue !== val && { borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      { color: newFlagValue === val ? '#fff' : colors.text },
                    ]}
                  >
                    {val === 'global' ? 'Global' : val === 'enabled' ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddFlagModal(false);
                  setNewFlagKey('');
                  setNewFlagValue('global');
                }}
                style={[styles.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddFlag}
                disabled={!newFlagKey.trim()}
                style={[
                  styles.modalButton,
                  { backgroundColor: newFlagKey.trim() ? colors.tint : colors.border },
                ]}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.confirmIcon}>
              <Ionicons name="help-circle-outline" size={48} color={colors.warning} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reset to Global?</Text>
            <Text style={[styles.modalMessage, { color: colors.icon }]}>
              All feature flag overrides for this merchant will be removed. They will use the global
              defaults.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowResetModal(false)}
                style={[styles.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReset}
                disabled={saving}
                style={[styles.modalButton, { backgroundColor: colors.error }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Reset</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  categoryContent: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  flagLabel: {
    flex: 1,
    marginRight: 12,
  },
  flagText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  flagHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  flagToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoSection: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
    marginBottom: 80,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  confirmIcon: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  addFlagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  addFlagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  flagKeyInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
});
