import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  TextInput,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { engagementConfigService, EngagementConfigItem } from '../../services/api/engagementConfig';
import { s } from './styles/engagement-config.styles';

const ACTION_DISPLAY: Record<string, { label: string; icon: string; iconColor: string }> = {
  share_store: { label: 'Share Store', icon: 'share-social', iconColor: Colors.light.info },
  share_offer: { label: 'Share Offer', icon: 'pricetag', iconColor: Colors.light.success },
  poll_vote: { label: 'Vote in Poll', icon: 'bar-chart', iconColor: Colors.light.indigo },
  offer_comment: {
    label: 'Comment on Offer',
    icon: 'chatbubble-ellipses',
    iconColor: Colors.light.warningDark,
  },
  photo_upload: { label: 'Upload Photos', icon: 'camera', iconColor: Colors.light.pink },
  ugc_reel: { label: 'Create Reel', icon: 'videocam', iconColor: Colors.light.error },
  event_rating: { label: 'Rate Event', icon: 'star', iconColor: Colors.light.warning },
};

export default function EngagementConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [configs, setConfigs] = useState<EngagementConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<EngagementConfigItem>>>({});

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await engagementConfigService.getAll();
      setConfigs(data);
      setEdits({});
    } catch {
      showAlert('Error', 'Failed to load engagement config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateEdit = (action: string, field: string, value: any) => {
    setEdits((prev) => ({ ...prev, [action]: { ...prev[action], [field]: value } }));
  };

  const getVal = (config: EngagementConfigItem, field: keyof EngagementConfigItem): any =>
    edits[config.action]?.[field] !== undefined ? edits[config.action]![field] : config[field];

  const saveAction = async (config: EngagementConfigItem) => {
    const patch = edits[config.action];
    if (!patch || Object.keys(patch).length === 0) return;
    setSaving(config.action);
    try {
      const updated = await engagementConfigService.update(config.action, patch);
      showAlert(
        'Saved',
        `${ACTION_DISPLAY[config.action]?.label ?? config.action} config updated.`
      );
      setEdits((prev) => {
        const n = { ...prev };
        delete n[config.action];
        return n;
      });
      setConfigs((prev) => prev.map((c) => (c.action === config.action ? updated : c)));
    } catch {
      showAlert('Error', 'Failed to save config');
    } finally {
      setSaving(null);
    }
  };

  // Summary stats from live data
  const totalActions = configs.length;
  const moderatedActions = configs.filter((c) => c.requiresModeration).length;
  const instantActions = totalActions - moderatedActions;
  const maxDailyCoins = configs
    .filter((c) => c.isEnabled)
    .reduce((sum, c) => sum + (c.baseCoins + c.bonusCoins) * c.dailyLimit, 0);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ color: colors.icon, marginTop: 12 }}>Loading engagement config...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card }]}>
        <Ionicons name="settings" size={24} color={colors.tint} />
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Engagement Config</Text>
          <Text style={[s.headerSubtitle, { color: colors.icon }]}>
            Control coin rewards for each engagement action
          </Text>
        </View>
      </View>

      {/* Summary stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: colors.card }]}>
          <Text style={[s.statValue, { color: colors.text }]}>{totalActions}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>Actions</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.card }]}>
          <Text style={[s.statValue, { color: colors.success }]}>{instantActions}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>Instant</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.card }]}>
          <Text style={[s.statValue, { color: colors.warning }]}>{moderatedActions}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>Moderated</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.card }]}>
          <Text style={[s.statValue, { color: colors.warningDark }]}>{maxDailyCoins}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>Max/Day</Text>
        </View>
      </View>

      {/* Action cards — live from API */}
      <View style={s.actionsList}>
        {configs.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="settings-outline" size={48} color={colors.icon} />
            <Text style={{ color: colors.icon, fontSize: 14, marginTop: 12 }}>
              No engagement actions configured yet.
            </Text>
          </View>
        )}
        {configs.map((config) => {
          const meta = ACTION_DISPLAY[config.action] ?? {
            label: config.action,
            icon: 'flash',
            iconColor: colors.icon,
          };
          const isExpanded = expandedKey === config.action;
          const isDirty = !!(edits[config.action] && Object.keys(edits[config.action]!).length > 0);
          const isSaving = saving === config.action;

          return (
            <View
              key={config.action}
              style={[
                s.actionCard,
                {
                  backgroundColor: colors.card,
                  borderWidth: isDirty ? 2 : 0,
                  borderColor: colors.tint,
                },
              ]}
            >
              <TouchableOpacity
                style={s.actionHeader}
                onPress={() => setExpandedKey(isExpanded ? null : config.action)}
                activeOpacity={0.7}
              >
                <View style={[s.actionIcon, { backgroundColor: `${meta.iconColor}20` }]}>
                  <Ionicons name={meta.icon as unknown as keyof typeof Ionicons.glyphMap} size={20} color={meta.iconColor} />
                </View>
                <View style={s.actionInfo}>
                  <Text style={[s.actionLabel, { color: colors.text }]}>{meta.label}</Text>
                  <Text style={[s.actionKey, { color: colors.icon }]}>{config.action}</Text>
                </View>
                <View style={[s.coinDisplay, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="sparkles" size={14} color={colors.warning} />
                  <Text style={[s.coinValue, { color: colors.warningDark }]}>
                    {getVal(config, 'baseCoins')}
                    {(getVal(config, 'bonusCoins') || 0) > 0
                      ? `+${getVal(config, 'bonusCoins')}`
                      : ''}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.icon}
                />
              </TouchableOpacity>

              {/* Badges */}
              <View style={s.badgeRow}>
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: getVal(config, 'requiresModeration')
                        ? colors.warningLight
                        : colors.successLight,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: getVal(config, 'requiresModeration')
                        ? colors.warningDark
                        : colors.successDark,
                    }}
                  >
                    {getVal(config, 'requiresModeration') ? 'MODERATED' : 'INSTANT'}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: colors.infoLight }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.indigo }}>
                    {getVal(config, 'dailyLimit')}/day
                  </Text>
                </View>
                {!getVal(config, 'isEnabled') && (
                  <View style={[s.badge, { backgroundColor: colors.errorLight }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.error }}>
                      DISABLED
                    </Text>
                  </View>
                )}
              </View>

              {/* Active multiplier badge */}
              {config.multiplier > 1 &&
                (!config.multiplierEndsAt || new Date(config.multiplierEndsAt) > new Date()) && (
                  <View
                    style={{
                      backgroundColor: colors.warningLight,
                      borderRadius: 8,
                      padding: 8,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.warningDeep, fontWeight: '700' }}>
                      Active Multiplier: {config.multiplier}x
                      {config.multiplierEndsAt
                        ? ` (ends ${new Date(config.multiplierEndsAt).toLocaleDateString()})`
                        : ''}
                    </Text>
                  </View>
                )}

              {/* Expanded: editable fields */}
              {isExpanded && (
                <View style={[s.expandedContent, { borderTopColor: colors.border }]}>
                  {/* Enable/Disable toggle */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                      Enabled
                    </Text>
                    <Switch
                      value={!!getVal(config, 'isEnabled')}
                      onValueChange={(v) => updateEdit(config.action, 'isEnabled', v)}
                      trackColor={{ true: colors.tint }}
                    />
                  </View>

                  {/* Coin inputs */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    {[
                      { label: 'Base Coins', field: 'baseCoins' as const },
                      { label: 'Bonus Coins', field: 'bonusCoins' as const },
                      { label: 'Daily Limit', field: 'dailyLimit' as const },
                    ].map(({ label, field }) => (
                      <View key={field} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: colors.icon, marginBottom: 4 }}>
                          {label}
                        </Text>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 8,
                            padding: 8,
                            color: colors.text,
                            backgroundColor: colors.background,
                            textAlign: 'center',
                            fontSize: 16,
                            fontWeight: '700',
                          }}
                          value={String(getVal(config, field))}
                          onChangeText={(v) =>
                            updateEdit(config.action, field, parseInt(v, 10) || 0)
                          }
                          keyboardType="numeric"
                        />
                      </View>
                    ))}
                  </View>

                  {/* Moderation toggle */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.text }}>Requires Moderation</Text>
                    <Switch
                      value={!!getVal(config, 'requiresModeration')}
                      onValueChange={(v) => updateEdit(config.action, 'requiresModeration', v)}
                      trackColor={{ true: colors.warning }}
                    />
                  </View>

                  {/* Save button */}
                  {isDirty && (
                    <TouchableOpacity
                      onPress={() => saveAction(config)}
                      disabled={isSaving}
                      style={{
                        backgroundColor: colors.tint,
                        borderRadius: 8,
                        padding: 12,
                        alignItems: 'center',
                        marginTop: 4,
                      }}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                          Save Changes
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

