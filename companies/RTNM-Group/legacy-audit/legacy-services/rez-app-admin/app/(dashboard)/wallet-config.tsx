import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { BRAND } from '../../constants/brand';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { s } from './styles/wallet-config.styles';

interface RechargeTier {
  minAmount: number;
  cashbackPercentage: number;
}

interface WalletConfigData {
  transferLimits: {
    dailyMax: number;
    perTransactionMax: number;
    minAmount: number;
    requireOtpAbove: number;
    maxRecipientsPerDay: number;
  };
  giftLimits: {
    dailyMax: number;
    perGiftMax: number;
    minAmount: number;
    requireOtpAbove: number;
    maxGiftsPerDay: number;
  };
  rechargeConfig: {
    isEnabled: boolean;
    tiers: RechargeTier[];
    maxCashback: number;
    minRecharge: number;
  };
  expiryConfig: {
    promoExpiryDays: number;
    alertDaysBefore: number;
    gracePeriodDays: number;
  };
  commissionRate: number;
  coinConversion: {
    rezToInr: number;
    promoToInr: number;
    brandedToInr: number;
  };
  fraudThresholds: {
    maxTransfersPerHour: number;
    maxGiftsPerDay: number;
    suspiciousAmountThreshold: number;
    autoFreezeMultiplier: number;
  };
  coinExpiryConfig?: {
    rez: { expiryDays: number; maxUsagePct: number };
    prive: { expiryDays: number; maxUsagePct: number };
    promo: { expiryDays: number; maxUsagePct: number };
    branded: { expiryDays: number; maxUsagePct: number };
  };
  rewardIssuanceEnabled?: boolean;
}

type SectionKey =
  | 'transfer'
  | 'gift'
  | 'recharge'
  | 'expiry'
  | 'coinExpiry'
  | 'commission'
  | 'fraud';

const SECTIONS: {
  key: SectionKey;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'transfer', title: 'Transfer Limits', icon: 'swap-horizontal', color: Colors.light.info },
  { key: 'gift', title: 'Gift Limits', icon: 'gift', color: Colors.light.purple },
  { key: 'recharge', title: 'Recharge Config', icon: 'card', color: Colors.light.success },
  { key: 'expiry', title: 'Expiry Config', icon: 'time', color: Colors.light.warning },
  {
    key: 'coinExpiry',
    title: 'Coin Expiry Rules',
    icon: 'hourglass',
    color: Colors.light.warningDark,
  },
  {
    key: 'commission',
    title: 'Commission & Conversion',
    icon: 'calculator',
    color: Colors.light.pink,
  },
  { key: 'fraud', title: 'Fraud Thresholds', icon: 'shield', color: Colors.light.error },
];

export default function WalletConfigScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { hasRole } = useAuth();

  // Only super admins can modify wallet configuration
  if (!hasRole(ADMIN_ROLES.SUPER_ADMIN)) {
    return (
      <View style={[s.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed" size={48} color={colors.error} />
        <Text style={[s.errorText, { color: colors.text }]}>
          Access Denied — Super Admin role required
        </Text>
        <TouchableOpacity style={s.retryButton} onPress={() => router.back()}>
          <Text style={s.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    transfer: false,
    gift: true,
    recharge: true,
    expiry: true,
    coinExpiry: true,
    commission: true,
    fraud: true,
  });
  const [config, setConfig] = useState<WalletConfigData | null>(null);
  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);

  const loadConfig = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await apiClient.get<WalletConfigData>('admin/wallet-config');
      if (response.success && response.data) {
        setConfig(response.data);
        setDirty(false);
      } else {
        setError(response.message || 'Failed to load config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    const confirmed = await showConfirm(
      'Save Configuration',
      'This will update wallet configuration for the entire platform. Are you sure?'
    );
    if (!confirmed) return;
    try {
      setSaving(true);
      const response = await apiClient.put('admin/wallet-config', config);
      if (response.success) {
        showAlert('Success', 'Wallet configuration saved successfully');
        setDirty(false);
        // TODO: Implement cache invalidation event when admin config changes
      } else {
        showAlert('Error', response.message || 'Failed to save config');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path: string, value: number | boolean) => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj: any = updated;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
    setDirty(true);
  };

  const toggleSection = (key: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleKillSwitch = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const newEnabled = !(config.rewardIssuanceEnabled ?? true);
      await apiClient.patch<any>('admin/wallet-config', { rewardIssuanceEnabled: newEnabled });
      const newConfig = {
        ...config,
        rewardIssuanceEnabled: newEnabled,
      };
      setConfig(newConfig);
      setDirty(false);
      showAlert('Success', `Coin issuance ${newEnabled ? 'resumed' : 'paused'}`);
      setShowKillSwitchModal(false);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to toggle kill switch');
    } finally {
      setSaving(false);
    }
  };

  // --- Render helpers ---

  const renderInput = (label: string, path: string, value: number, suffix?: string) => (
    <View style={s.fieldRow} key={path}>
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
        onChangeText={(t) => updateField(path, parseFloat(t) || 0)}
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
          <Ionicons
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={colors.text}
          />
        </TouchableOpacity>
        {!isCollapsed && (
          <View style={[s.cardBody, { borderTopColor: colors.border }]}>{content}</View>
        )}
      </View>
    );
  };

  // --- Recharge tiers helpers ---

  const addTier = () => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      updated.rechargeConfig.tiers.push({ minAmount: 0, cashbackPercentage: 0 });
      return updated;
    });
    setDirty(true);
  };

  const removeTier = (index: number) => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      updated.rechargeConfig.tiers.splice(index, 1);
      return updated;
    });
    setDirty(true);
  };

  const updateTier = (index: number, field: keyof RechargeTier, value: string) => {
    if (!config) return;
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      updated.rechargeConfig.tiers[index][field] = parseFloat(value) || 0;
      return updated;
    });
    setDirty(true);
  };

  // --- Loading / Error states ---

  if (loading) {
    return (
      <View style={[s.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.text }]}>Loading config...</Text>
      </View>
    );
  }

  if (error || !config) {
    return (
      <View style={[s.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[s.errorText, { color: colors.text }]}>{error || 'Unknown error'}</Text>
        <TouchableOpacity style={s.retryButton} onPress={() => loadConfig()}>
          <Text style={s.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          <Ionicons name="wallet" size={22} color={colors.tint} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Wallet Configuration</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={() => loadConfig(true)} style={s.iconBtn}>
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

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadConfig(true)}
            colors={[colors.tint]}
          />
        }
      >
        {/* Kill Switch Card */}
        <View
          style={[
            s.killSwitchCard,
            { borderColor: (config?.rewardIssuanceEnabled ?? true) ? '#22c55e' : '#ef4444' },
          ]}
        >
          <View style={s.killSwitchHeader}>
            <Text style={s.killSwitchTitle}>⚡ Coin Issuance Kill Switch</Text>
            <View
              style={[
                s.killSwitchBadge,
                {
                  backgroundColor: (config?.rewardIssuanceEnabled ?? true) ? '#dcfce7' : '#fee2e2',
                },
              ]}
            >
              <Text
                style={[
                  s.killSwitchBadgeText,
                  { color: (config?.rewardIssuanceEnabled ?? true) ? '#16a34a' : '#dc2626' },
                ]}
              >
                {(config?.rewardIssuanceEnabled ?? true) ? '🟢 ACTIVE' : '🔴 PAUSED'}
              </Text>
            </View>
          </View>
          <Text style={s.killSwitchDesc}>
            {(config?.rewardIssuanceEnabled ?? true)
              ? 'Coins are issuing normally across all flows'
              : 'ALL coin issuance is paused — no rewards being given'}
          </Text>
          <TouchableOpacity
            style={[
              s.killSwitchButton,
              { backgroundColor: (config?.rewardIssuanceEnabled ?? true) ? '#ef4444' : '#22c55e' },
            ]}
            onPress={() => setShowKillSwitchModal(true)}
          >
            <Text style={s.killSwitchButtonText}>
              {(config?.rewardIssuanceEnabled ?? true)
                ? 'Pause All Coin Issuance'
                : 'Resume Coin Issuance'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transfer Limits */}
        {renderSectionCard(
          'transfer',
          <>
            {renderInput('Daily Max', 'transferLimits.dailyMax', config.transferLimits.dailyMax)}
            {renderInput(
              'Per Transaction Max',
              'transferLimits.perTransactionMax',
              config.transferLimits.perTransactionMax
            )}
            {renderInput('Min Amount', 'transferLimits.minAmount', config.transferLimits.minAmount)}
            {renderInput(
              'Require OTP Above',
              'transferLimits.requireOtpAbove',
              config.transferLimits.requireOtpAbove
            )}
            {renderInput(
              'Max Recipients/Day',
              'transferLimits.maxRecipientsPerDay',
              config.transferLimits.maxRecipientsPerDay
            )}
          </>
        )}

        {/* Gift Limits */}
        {renderSectionCard(
          'gift',
          <>
            {renderInput('Daily Max', 'giftLimits.dailyMax', config.giftLimits.dailyMax)}
            {renderInput('Per Gift Max', 'giftLimits.perGiftMax', config.giftLimits.perGiftMax)}
            {renderInput('Min Amount', 'giftLimits.minAmount', config.giftLimits.minAmount)}
            {renderInput(
              'Require OTP Above',
              'giftLimits.requireOtpAbove',
              config.giftLimits.requireOtpAbove
            )}
            {renderInput(
              'Max Gifts/Day',
              'giftLimits.maxGiftsPerDay',
              config.giftLimits.maxGiftsPerDay
            )}
          </>
        )}

        {/* Recharge Config */}
        {renderSectionCard(
          'recharge',
          <>
            <View style={s.fieldRow}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Enabled</Text>
              <Switch
                value={config.rechargeConfig.isEnabled}
                onValueChange={(v) => updateField('rechargeConfig.isEnabled', v)}
                trackColor={{ false: colors.border, true: `${colors.tint}60` }}
                thumbColor={config.rechargeConfig.isEnabled ? colors.tint : '#f4f3f4'}
              />
            </View>
            {renderInput(
              'Max Cashback',
              'rechargeConfig.maxCashback',
              config.rechargeConfig.maxCashback
            )}
            {renderInput(
              'Min Recharge',
              'rechargeConfig.minRecharge',
              config.rechargeConfig.minRecharge
            )}
            <Text style={[s.subHeading, { color: colors.text }]}>Cashback Tiers</Text>
            {config.rechargeConfig.tiers.map((tier, i) => (
              <View key={i} style={[s.tierRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tierLabel, { color: colors.text }]}>Min Amount</Text>
                  <TextInput
                    style={[
                      s.fieldInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={String(tier.minAmount)}
                    onChangeText={(v) => updateTier(i, 'minAmount', v)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tierLabel, { color: colors.text }]}>Cashback %</Text>
                  <TextInput
                    style={[
                      s.fieldInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={String(tier.cashbackPercentage)}
                    onChangeText={(v) => updateTier(i, 'cashbackPercentage', v)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
                <TouchableOpacity style={s.removeTierBtn} onPress={() => removeTier(i)}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[s.addTierBtn, { borderColor: colors.border }]}
              onPress={addTier}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
              <Text style={[s.addTierText, { color: colors.tint }]}>Add Tier</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Expiry Config */}
        {renderSectionCard(
          'expiry',
          <>
            {renderInput(
              'Promo Expiry Days',
              'expiryConfig.promoExpiryDays',
              config.expiryConfig.promoExpiryDays
            )}
            {renderInput(
              'Alert Days Before',
              'expiryConfig.alertDaysBefore',
              config.expiryConfig.alertDaysBefore
            )}
            {renderInput(
              'Grace Period Days',
              'expiryConfig.gracePeriodDays',
              config.expiryConfig.gracePeriodDays
            )}
          </>
        )}

        {/* Coin Expiry Rules */}
        {renderSectionCard(
          'coinExpiry',
          <>
            <Text style={[s.subHeading, { color: colors.text }]}>
              Per-Coin-Type Expiry & Usage Rules
            </Text>

            {/* Info box */}
            <View
              style={{ backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, marginBottom: 12 }}
            >
              <Text style={{ fontSize: 12, color: '#5D4037', fontWeight: '600' }}>
                Expiry Rules
              </Text>
              <Text style={{ fontSize: 12, color: '#795548', marginTop: 4, lineHeight: 18 }}>
                expiryDays: 0 = coins never expire{'\n'}
                maxUsagePct: max % of any bill payable with this coin type{'\n'}
                Changes take effect for all new coin issuances. Existing coins retain their original
                expiry.
              </Text>
            </View>

            {(
              [
                {
                  key: 'rez',
                  label: 'REZ Coins (Universal)',
                  hint: '0 = never expires. Main reward coins, usable everywhere.',
                  maxHint: '100 = no cap on bill payment (recommended)',
                },
                {
                  key: 'prive',
                  label: 'Prive Coins (Premium tier)',
                  hint: '365 = 1 year default. Only Prive members earn these.',
                  maxHint: '100 = no cap (recommended for Prive members)',
                },
                {
                  key: 'promo',
                  label: 'Promo Coins (Campaign-based)',
                  hint: '0 = per-campaign expiry. Leave 0 to let campaign control it.',
                  maxHint: '20 = max 20% of any bill. Prevents abuse of promotional coins.',
                },
                {
                  key: 'branded',
                  label: 'Branded Coins (Merchant-specific)',
                  hint: '0 = never expires. Issued by merchants, only usable at their store.',
                  maxHint: '100 = no cap at issuing merchant store',
                },
              ] as const
            ).map(({ key: coinType, label, hint, maxHint }) => {
              const cfg = config.coinExpiryConfig?.[coinType] || {
                expiryDays: 0,
                maxUsagePct: 100,
              };
              const neverExpires = cfg.expiryDays === 0;
              return (
                <View
                  key={coinType}
                  style={{
                    marginBottom: 16,
                    backgroundColor: '#F9F9F9',
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{ fontWeight: '700', fontSize: 14, marginBottom: 6, color: '#1a3a52' }}
                  >
                    {label}
                  </Text>

                  <View style={{ marginBottom: 8 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#555' }}>
                        Expiry Days
                      </Text>
                      {neverExpires && (
                        <View
                          style={{
                            backgroundColor: '#E8F5E9',
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ fontSize: 10, color: '#2e7d32', fontWeight: '700' }}>
                            NEVER EXPIRES
                          </Text>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={[
                        s.fieldInput,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                          marginTop: 4,
                        },
                      ]}
                      value={String(cfg.expiryDays)}
                      onChangeText={(v) =>
                        updateField(`coinExpiryConfig.${coinType}.expiryDays`, parseInt(v, 10) || 0)
                      }
                      keyboardType="numeric"
                      selectTextOnFocus
                      placeholder="0"
                    />
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{hint}</Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#555' }}>
                      Max Usage % per Bill
                    </Text>
                    <TextInput
                      style={[
                        s.fieldInput,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                          marginTop: 4,
                        },
                      ]}
                      value={String(cfg.maxUsagePct)}
                      onChangeText={(v) =>
                        updateField(
                          `coinExpiryConfig.${coinType}.maxUsagePct`,
                          parseInt(v, 10) || 0
                        )
                      }
                      keyboardType="numeric"
                      selectTextOnFocus
                      placeholder="100"
                    />
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{maxHint}</Text>
                  </View>
                </View>
              );
            })}

            {/* Save warning */}
            <View
              style={{ backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10, marginTop: 8 }}
            >
              <Text style={{ fontSize: 12, color: '#E65100' }}>
                Changing expiry affects all coins issued from this point onward. Coins already in
                user wallets keep their original expiry. maxUsagePct changes are immediate.
              </Text>
            </View>
          </>
        )}

        {/* Commission & Conversion */}
        {renderSectionCard(
          'commission',
          <>
            {renderInput('Commission Rate', 'commissionRate', config.commissionRate, '0-1')}
            {renderInput(
              `${BRAND.COIN_SHORT} to INR`,
              'coinConversion.rezToInr',
              config.coinConversion.rezToInr
            )}
            {renderInput(
              'Promo to INR',
              'coinConversion.promoToInr',
              config.coinConversion.promoToInr
            )}
            {renderInput(
              'Branded to INR',
              'coinConversion.brandedToInr',
              config.coinConversion.brandedToInr
            )}
          </>
        )}

        {/* Fraud Thresholds */}
        {renderSectionCard(
          'fraud',
          <>
            {renderInput(
              'Max Transfers/Hour',
              'fraudThresholds.maxTransfersPerHour',
              config.fraudThresholds.maxTransfersPerHour
            )}
            {renderInput(
              'Max Gifts/Day',
              'fraudThresholds.maxGiftsPerDay',
              config.fraudThresholds.maxGiftsPerDay
            )}
            {renderInput(
              'Suspicious Amount',
              'fraudThresholds.suspiciousAmountThreshold',
              config.fraudThresholds.suspiciousAmountThreshold
            )}
            {renderInput(
              'Auto Freeze Multiplier',
              'fraudThresholds.autoFreezeMultiplier',
              config.fraudThresholds.autoFreezeMultiplier
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
      </ScrollView>

      {/* Kill Switch Confirmation Modal */}
      <Modal visible={showKillSwitchModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View style={s.confirmIcon}>
              <Ionicons name="warning" size={48} color={colors.error} />
            </View>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {(config?.rewardIssuanceEnabled ?? true)
                ? 'Pause Coin Issuance?'
                : 'Resume Coin Issuance?'}
            </Text>
            <Text style={[s.modalMessage, { color: colors.icon }]}>
              {(config?.rewardIssuanceEnabled ?? true)
                ? 'This will pause ALL coin issuance across all flows. Users will not earn any rewards.'
                : 'This will resume coin issuance across all flows. Users will start earning rewards again.'}
            </Text>
            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => setShowKillSwitchModal(false)}
                style={[s.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleKillSwitch}
                disabled={saving}
                style={[s.modalButton, { backgroundColor: colors.error }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalButtonText, { color: '#fff' }]}>
                    {(config?.rewardIssuanceEnabled ?? true) ? 'Pause' : 'Resume'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

