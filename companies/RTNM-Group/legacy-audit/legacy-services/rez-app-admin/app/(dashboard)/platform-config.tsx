/**
 * Platform Control Center
 *
 * Single screen to view and update every external/configurable value
 * across the REZ platform. Replaces the need to SSH into the server
 * or edit environment variables.
 *
 * Sections:
 *   1. Quick Access — cards linking to specialised config screens
 *   2. System Config — live editable rows from /api/admin/system-config
 *      (grouped: Operations · Limits · Notifications · Integrations)
 *   3. Merchant Plans — subscription plan limits + broadcast quotas
 *   4. Add Config — create a new system config key on the fly
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/platform-config.styles';

// ─── Types ─────────────────────────────────────────────────────────────────

type ConfigType = 'string' | 'number' | 'boolean';
type ConfigCategory = 'operations' | 'notifications' | 'limits' | 'integrations';

interface SystemConfigItem {
  _id: string;
  key: string;
  value: string | number | boolean;
  type: ConfigType;
  description: string;
  category: ConfigCategory;
  updatedAt: string;
}

interface PlanLimit {
  plan: 'starter' | 'growth' | 'pro';
  maxProducts: number;
  maxStores: number;
  smsPerMonth: number;
  whatsappPerMonth: number;
  pushPerMonth: number;
  analyticsRetentionDays: number;
  monthlyPrice: number;
}

interface NewConfigForm {
  key: string;
  value: string;
  type: ConfigType;
  category: ConfigCategory;
  description: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_META: Record<ConfigCategory, { label: string; icon: string; color: string }> = {
  operations: { label: 'Operations', icon: 'settings', color: '#7C3AED' },
  limits: { label: 'Limits', icon: 'speedometer', color: '#DC2626' },
  notifications: { label: 'Notifications', icon: 'notifications', color: '#2563EB' },
  integrations: { label: 'Integrations', icon: 'git-network', color: '#059669' },
};

const QUICK_LINKS = [
  { label: 'Feature Flags', icon: 'flag', route: '/(dashboard)/feature-flags', color: '#7C3AED' },
  { label: 'Wallet Config', icon: 'wallet', route: '/(dashboard)/wallet-config', color: '#059669' },
  { label: 'Engagement', icon: 'star', route: '/(dashboard)/engagement-config', color: '#D97706' },
  { label: 'Coin Rewards', icon: 'sparkles', route: '/(dashboard)/coin-rewards', color: '#DB2777' },
  {
    label: 'Game Config',
    icon: 'game-controller',
    route: '/(dashboard)/game-config',
    color: '#2563EB',
  },
  { label: 'BBPS Config', icon: 'card', route: '/(dashboard)/bbps-config', color: '#0891B2' },
  {
    label: 'Daily Check-In',
    icon: 'calendar',
    route: '/(dashboard)/daily-checkin-config',
    color: '#7C3AED',
  },
  {
    label: 'Notifications Mgr',
    icon: 'megaphone',
    route: '/(dashboard)/notification-management',
    color: '#DC2626',
  },
  {
    label: 'Support Config',
    icon: 'headset',
    route: '/(dashboard)/support-config',
    color: '#6B7280',
  },
  { label: 'System Health', icon: 'pulse', route: '/(dashboard)/system-health', color: '#059669' },
  { label: 'Job Monitor', icon: 'timer', route: '/(dashboard)/job-monitor', color: '#EA580C' },
  {
    label: 'Reconciliation',
    icon: 'git-compare',
    route: '/(dashboard)/reconciliation',
    color: '#374151',
  },
];

// BUG-052 NOTE: These are UI fallback defaults shown when the /admin/merchant-plans
// endpoint is unavailable. They are NOT authoritative — the backend is the source
// of truth. Real plan limits and pricing must be managed via the API (edit rows
// inline on this screen, which calls PATCH /admin/merchant-plans/:plan).
// Do NOT change pricing here and expect it to take effect in production.
const DEFAULT_PLANS: PlanLimit[] = [
  {
    plan: 'starter',
    maxProducts: 50,
    maxStores: 1,
    smsPerMonth: 0,
    whatsappPerMonth: 0,
    pushPerMonth: 500,
    analyticsRetentionDays: 7,
    monthlyPrice: 0, // configurable via API
  },
  {
    plan: 'growth',
    maxProducts: 500,
    maxStores: 3,
    smsPerMonth: 500,
    whatsappPerMonth: 200,
    pushPerMonth: 5000,
    analyticsRetentionDays: 30,
    monthlyPrice: 1999, // configurable via API
  },
  {
    plan: 'pro',
    maxProducts: 9999,
    maxStores: 10,
    smsPerMonth: 5000,
    whatsappPerMonth: 2000,
    pushPerMonth: 50000,
    analyticsRetentionDays: 90,
    monthlyPrice: 4999, // configurable via API
  },
];

const PLAN_COLORS: Record<string, string> = {
  starter: '#6B7280',
  growth: '#2563EB',
  pro: '#7C3AED',
};

const ACTIVE_SECTIONS = [
  'all',
  'operations',
  'limits',
  'notifications',
  'integrations',
  'plans',
] as const;
type ActiveSection = (typeof ACTIVE_SECTIONS)[number];

// ─── Component ──────────────────────────────────────────────────────────────

export default function PlatformConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // ── State ──────────────────────────────────────────────────────────────
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // key being saved
  const [drafts, setDrafts] = useState<Record<string, any>>({}); // unsaved edits
  const [activeSection, setActiveSection] = useState<ActiveSection>('all');
  const [plans, setPlans] = useState<PlanLimit[]>(DEFAULT_PLANS);
  const [planDrafts, setPlanDrafts] = useState<Record<string, PlanLimit>>({});
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConfig, setNewConfig] = useState<NewConfigForm>({
    key: '',
    value: '',
    type: 'string',
    category: 'operations',
    description: '',
  });
  const [addingSaving, setAddingSaving] = useState(false);
  const [search, setSearch] = useState('');

  // ── Load system configs ────────────────────────────────────────────────
  const loadConfigs = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await apiClient.get('/admin/system-config');
      // FIX-BUG-CRIT-001: Backend returns { success: true, data: { configs } }
      // so res.data = { configs }, not res.data = { data: { configs } }
      setConfigs((res.data as unknown as {configs?: SystemConfigItem[]})?.configs ?? []);
      setDrafts({});
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to load system config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Load merchant plan limits ──────────────────────────────────────────
  const loadPlans = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/merchant-plans');
      // FIX-BUG-CRIT-002: Backend returns { success: true, data: { plans } }
      // so res.data = { plans }, not res.data = { data: { plans } }
      if ((res.data as unknown as {plans?: unknown})?.plans) setPlans((res.data as unknown as {plans?: PlanLimit[]}).plans as PlanLimit[]);
    } catch {
      // Fallback to defaults — endpoint may not exist yet
    }
  }, []);

  // BUG-003: Include loadConfigs and loadPlans in the dependency array to avoid stale closures.
  useEffect(() => {
    loadConfigs();
    loadPlans();
  }, [loadConfigs, loadPlans]);

  // BUG-036 FIX: wrap in useCallback so the function reference is stable and
  // doesn't re-create on every render.
  const onRefresh = useCallback(() => loadConfigs(true), [loadConfigs]);

  // ── Save a system config value ─────────────────────────────────────────
  // BUG-036 FIX: wrap in useCallback.
  const saveConfig = useCallback(
    async (item: SystemConfigItem) => {
      const draft = drafts[item.key];
      if (draft === undefined) return;

      let finalValue: any = draft;
      if (item.type === 'number') {
        finalValue = parseFloat(draft);
        if (isNaN(finalValue)) {
          showAlert('Invalid', 'Please enter a valid number');
          return;
        }
      }

      setSaving(item.key);
      try {
        await apiClient.patch(`/admin/system-config/${item.key}`, { value: finalValue });
        setConfigs((prev) =>
          prev.map((c) =>
            c.key === item.key
              ? { ...c, value: finalValue, updatedAt: new Date().toISOString() }
              : c
          )
        );
        setDrafts((prev) => {
          const n = { ...prev };
          delete n[item.key];
          return n;
        });
      } catch (err: any) {
        showAlert('Save Failed', err?.message ?? 'Could not update config');
      } finally {
        setSaving(null);
      }
    },
    [drafts]
  );

  // ── Reset a draft ──────────────────────────────────────────────────────
  // BUG-036 FIX: wrap in useCallback.
  const discardDraft = useCallback((key: string) => {
    setDrafts((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  }, []);

  // ── Save a merchant plan ───────────────────────────────────────────────
  // BUG-037 FIX: wrap in useCallback.
  const savePlan = useCallback(
    async (planName: string) => {
      const draft = planDrafts[planName];
      if (!draft) return;
      setSavingPlan(planName);
      try {
        await apiClient.patch(`/admin/merchant-plans/${planName}`, draft);
        setPlans((prev) => prev.map((p) => (p.plan === planName ? draft : p)));
        setPlanDrafts((prev) => {
          const n = { ...prev };
          delete n[planName];
          return n;
        });
      } catch (err: any) {
        showAlert('Save Failed', err?.message ?? 'Could not update plan');
      } finally {
        setSavingPlan(null);
      }
    },
    [planDrafts]
  );

  // ── Add new config ─────────────────────────────────────────────────────
  // BUG-037 FIX: wrap in useCallback.
  const addConfig = useCallback(async () => {
    if (!newConfig.key.trim() || !newConfig.value.trim()) {
      showAlert('Required', 'Key and value are required');
      return;
    }
    setAddingSaving(true);
    try {
      let parsedValue: any = newConfig.value;
      if (newConfig.type === 'number') parsedValue = parseFloat(newConfig.value);
      if (newConfig.type === 'boolean') parsedValue = newConfig.value === 'true';

      const res = await apiClient.post('/admin/system-config', {
        key: newConfig.key.trim(),
        value: parsedValue,
        type: newConfig.type,
        category: newConfig.category,
        description: newConfig.description,
      });
      // FIX-BUG-CRIT-003: Backend returns { success: true, data: { config } }
      // so res.data = { config }, not res.data = { data: { config } }
      if ((res.data as unknown as {config?: SystemConfigItem})?.config) {
        setConfigs((prev) => [...prev, (res.data as unknown as {config?: SystemConfigItem}).config as SystemConfigItem]);
      }
      setNewConfig({ key: '', value: '', type: 'string', category: 'operations', description: '' });
      setShowAddModal(false);
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to create config');
    } finally {
      setAddingSaving(false);
    }
  }, [newConfig]);

  // ── Filtered configs ───────────────────────────────────────────────────
  const filteredConfigs = configs.filter((c) => {
    const matchSection = activeSection === 'all' || c.category === activeSection;
    const matchSearch =
      !search ||
      c.key.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    return matchSection && matchSearch;
  });

  const groupedConfigs: Record<ConfigCategory, SystemConfigItem[]> = {
    operations: filteredConfigs.filter((c) => c.category === 'operations'),
    limits: filteredConfigs.filter((c) => c.category === 'limits'),
    notifications: filteredConfigs.filter((c) => c.category === 'notifications'),
    integrations: filteredConfigs.filter((c) => c.category === 'integrations'),
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  const renderConfigRow = (item: SystemConfigItem) => {
    const isDirty = item.key in drafts;
    const displayValue = isDirty ? drafts[item.key] : item.value;
    const isSavingThis = saving === item.key;

    return (
      <View key={item.key} style={[s.configRow, isDirty && s.configRowDirty]}>
        <View style={s.configLeft}>
          <Text style={[s.configKey, { color: isDark ? '#E5E7EB' : '#111827' }]}>
            {item.key}
          </Text>
          {item.description ? (
            <Text
              style={[s.configDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          <Text style={[s.configMeta, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
            Updated{' '}
            {new Date(item.updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={s.configRight}>
          {item.type === 'boolean' ? (
            <Switch
              value={Boolean(displayValue)}
              onValueChange={(v) => setDrafts((prev) => ({ ...prev, [item.key]: v }))}
              trackColor={{ false: '#D1D5DB', true: '#7C3AED' }}
              thumbColor="white"
            />
          ) : (
            <TextInput
              style={[
                s.configInput,
                {
                  color: isDark ? '#F3F4F6' : '#111827',
                  borderColor: isDirty ? '#7C3AED' : isDark ? '#374151' : '#E5E7EB',
                  backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                },
              ]}
              value={String(displayValue)}
              onChangeText={(v) => setDrafts((prev) => ({ ...prev, [item.key]: v }))}
              keyboardType={item.type === 'number' ? 'decimal-pad' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          {isDirty && (
            <View style={s.configActions}>
              <TouchableOpacity
                style={s.saveBtn}
                onPress={() => saveConfig(item)}
                disabled={isSavingThis}
              >
                {isSavingThis ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={s.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.discardBtn} onPress={() => discardDraft(item.key)}>
                <Ionicons name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderCategorySection = (category: ConfigCategory) => {
    const items = groupedConfigs[category];
    if (!items?.length) return null;
    const meta = CATEGORY_META[category];

    return (
      <View key={category} style={s.categorySection}>
        <View style={s.categoryHeader}>
          <View style={[s.categoryIconBg, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon as unknown as keyof typeof Ionicons.glyphMap} size={16} color={meta.color} />
          </View>
          <Text style={[s.categoryTitle, { color: isDark ? '#E5E7EB' : '#111827' }]}>
            {meta.label}
          </Text>
          <View style={[s.countBadge, { backgroundColor: meta.color + '18' }]}>
            <Text style={[s.countText, { color: meta.color }]}>{items.length}</Text>
          </View>
        </View>
        {items.map(renderConfigRow)}
      </View>
    );
  };

  const renderPlanCard = (plan: PlanLimit) => {
    const draft = planDrafts[plan.plan] ?? plan;
    const isDirty = plan.plan in planDrafts;
    const color = PLAN_COLORS[plan.plan];

    const updateDraft = (field: keyof PlanLimit, val: any) => {
      setPlanDrafts((prev) => ({
        ...prev,
        [plan.plan]: { ...(prev[plan.plan] ?? plan), [field]: val },
      }));
    };

    const fields: Array<{ key: keyof PlanLimit; label: string; numeric?: boolean }> = [
      { key: 'monthlyPrice', label: 'Monthly Price (₹)', numeric: true },
      { key: 'maxProducts', label: 'Max Products', numeric: true },
      { key: 'maxStores', label: 'Max Stores', numeric: true },
      { key: 'smsPerMonth', label: 'SMS / month', numeric: true },
      { key: 'whatsappPerMonth', label: 'WhatsApp / month', numeric: true },
      { key: 'pushPerMonth', label: 'Push / month', numeric: true },
      { key: 'analyticsRetentionDays', label: 'Analytics Retention (days)', numeric: true },
    ];

    return (
      <View key={plan.plan} style={[s.planCard, isDirty && s.planCardDirty]}>
        <View style={[s.planBadge, { backgroundColor: color }]}>
          <Text style={s.planBadgeText}>{plan.plan.toUpperCase()}</Text>
        </View>

        {fields.map((f) => (
          <View key={f.key} style={s.planRow}>
            <Text style={[s.planLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {f.label}
            </Text>
            <TextInput
              style={[
                s.planInput,
                {
                  color: isDark ? '#F3F4F6' : '#111827',
                  borderColor: isDirty ? color : isDark ? '#374151' : '#E5E7EB',
                  backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                },
              ]}
              value={String(draft[f.key])}
              onChangeText={(v) => updateDraft(f.key, f.numeric ? parseFloat(v) || 0 : v)}
              keyboardType="decimal-pad"
            />
          </View>
        ))}

        {isDirty && (
          <View style={s.planActions}>
            <TouchableOpacity
              style={[s.planSaveBtn, { backgroundColor: color }]}
              onPress={() => savePlan(plan.plan)}
              disabled={savingPlan === plan.plan}
            >
              {savingPlan === plan.plan ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={s.saveBtnText}>Save {plan.plan} plan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.discardBtn}
              onPress={() =>
                setPlanDrafts((prev) => {
                  const n = { ...prev };
                  delete n[plan.plan];
                  return n;
                })
              }
            >
              <Text style={[s.configDesc, { color: '#6B7280' }]}>Discard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: isDark ? '#111827' : '#F3F4F6' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: isDark ? '#1F2937' : 'white' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#E5E7EB' : '#111827'} />
        </TouchableOpacity>
        <View>
          <Text style={[s.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Platform Control Center
          </Text>
          <Text style={[s.headerSub, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {configs.length} config keys · Live edits
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* ── Section tabs ────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.tabBar, { backgroundColor: isDark ? '#1F2937' : 'white' }]}
        contentContainerStyle={s.tabBarContent}
      >
        {ACTIVE_SECTIONS.map((sec) => {
          const isActive = sec === activeSection;
          const label = sec === 'all' ? 'All' : sec.charAt(0).toUpperCase() + sec.slice(1);
          const meta = sec !== 'all' && sec !== 'plans' ? CATEGORY_META[sec as ConfigCategory] : null;
          return (
            <TouchableOpacity
              key={sec}
              style={[s.tab, isActive && { borderBottomColor: meta?.color ?? '#7C3AED' }]}
              onPress={() => setActiveSection(sec)}
            >
              {meta && (
                <Ionicons
                  name={meta.icon as unknown as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={isActive ? meta.color : '#9CA3AF'}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[
                  s.tabText,
                  isActive && { color: meta?.color ?? '#7C3AED', fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      {activeSection !== 'plans' && (
        <View style={[s.searchBar, { backgroundColor: isDark ? '#1F2937' : 'white' }]}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={[s.searchInput, { color: isDark ? '#F3F4F6' : '#111827' }]}
            placeholder="Search config keys…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={[s.configDesc, { color: '#6B7280', marginTop: 12 }]}>
            Loading platform config…
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.body}
          contentContainerStyle={s.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Quick Access ──────────────────────────────────────────── */}
          {activeSection === 'all' && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                Quick Access
              </Text>
              <View style={s.quickGrid}>
                {QUICK_LINKS.map((link) => (
                  <TouchableOpacity
                    key={link.route}
                    style={[s.quickCard, { backgroundColor: isDark ? '#1F2937' : 'white' }]}
                    onPress={() => router.push(link.route)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.quickIcon, { backgroundColor: link.color + '18' }]}>
                      <Ionicons name={link.icon as unknown as keyof typeof Ionicons.glyphMap} size={20} color={link.color} />
                    </View>
                    <Text
                      style={[s.quickLabel, { color: isDark ? '#E5E7EB' : '#374151' }]}
                      numberOfLines={2}
                    >
                      {link.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── System Config sections ───────────────────────────────── */}
          {activeSection !== 'plans' && (
            <View style={s.section}>
              <View style={s.sectionTitleRow}>
                <Text style={[s.sectionTitle, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                  System Config
                </Text>
                <Text style={[s.configDesc, { color: '#9CA3AF' }]}>
                  {filteredConfigs.length} keys
                </Text>
              </View>

              {filteredConfigs.length === 0 ? (
                <View style={s.emptyBox}>
                  <Ionicons name="search" size={32} color="#9CA3AF" />
                  <Text style={[s.configDesc, { color: '#9CA3AF', marginTop: 8 }]}>
                    No config keys match your search
                  </Text>
                </View>
              ) : (
                (activeSection === 'all'
                  ? (['operations', 'limits', 'notifications', 'integrations'] as ConfigCategory[])
                  : [activeSection as ConfigCategory]
                ).map((cat) => renderCategorySection(cat))
              )}
            </View>
          )}

          {/* ── Merchant Plans ───────────────────────────────────────── */}
          {(activeSection === 'all' || activeSection === 'plans') && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: isDark ? '#E5E7EB' : '#111827' }]}>
                Merchant Plan Limits
              </Text>
              <Text style={[s.configDesc, { color: '#9CA3AF', marginBottom: 16 }]}>
                Adjust subscription tier limits, pricing, and broadcast quotas per plan.
              </Text>
              {plans.map(renderPlanCard)}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Add Config Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[s.modalRoot, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
          <View style={[s.modalHeader, { backgroundColor: isDark ? '#1F2937' : 'white' }]}>
            <Text style={[s.modalTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              Add Config Key
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#374151'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            {/* Key */}
            <Text style={[s.modalLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Key *
            </Text>
            <TextInput
              style={[
                s.modalInput,
                {
                  color: isDark ? '#F3F4F6' : '#111827',
                  borderColor: isDark ? '#374151' : '#D1D5DB',
                  backgroundColor: isDark ? '#1F2937' : 'white',
                },
              ]}
              placeholder="e.g. max_broadcast_sms_daily"
              placeholderTextColor="#9CA3AF"
              value={newConfig.key}
              onChangeText={(v) => setNewConfig((p) => ({ ...p, key: v }))}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Type */}
            <Text style={[s.modalLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Type *
            </Text>
            <View style={s.typeRow}>
              {(['string', 'number', 'boolean'] as ConfigType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeChip, newConfig.type === t && s.typeChipActive]}
                  onPress={() =>
                    setNewConfig((p) => ({ ...p, type: t, value: t === 'boolean' ? 'false' : '' }))
                  }
                >
                  <Text
                    style={[s.typeChipText, newConfig.type === t && s.typeChipTextActive]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Value */}
            <Text style={[s.modalLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Value *
            </Text>
            {newConfig.type === 'boolean' ? (
              <View style={s.boolRow}>
                {['true', 'false'].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[s.typeChip, newConfig.value === v && s.typeChipActive]}
                    onPress={() => setNewConfig((p) => ({ ...p, value: v }))}
                  >
                    <Text
                      style={[
                        s.typeChipText,
                        newConfig.value === v && s.typeChipTextActive,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={[
                  s.modalInput,
                  {
                    color: isDark ? '#F3F4F6' : '#111827',
                    borderColor: isDark ? '#374151' : '#D1D5DB',
                    backgroundColor: isDark ? '#1F2937' : 'white',
                  },
                ]}
                placeholder={newConfig.type === 'number' ? '0' : 'value'}
                placeholderTextColor="#9CA3AF"
                value={newConfig.value}
                onChangeText={(v) => setNewConfig((p) => ({ ...p, value: v }))}
                keyboardType={newConfig.type === 'number' ? 'decimal-pad' : 'default'}
                autoCapitalize="none"
              />
            )}

            {/* Category */}
            <Text style={[s.modalLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Category *
            </Text>
            <View style={s.typeRow}>
              {(['operations', 'limits', 'notifications', 'integrations'] as ConfigCategory[]).map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      s.typeChip,
                      newConfig.category === cat && {
                        ...s.typeChipActive,
                        borderColor: CATEGORY_META[cat].color,
                        backgroundColor: CATEGORY_META[cat].color + '18',
                      },
                    ]}
                    onPress={() => setNewConfig((p) => ({ ...p, category: cat }))}
                  >
                    <Text
                      style={[
                        s.typeChipText,
                        newConfig.category === cat && {
                          color: CATEGORY_META[cat].color,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Description */}
            <Text style={[s.modalLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Description
            </Text>
            <TextInput
              style={[
                s.modalInput,
                {
                  color: isDark ? '#F3F4F6' : '#111827',
                  borderColor: isDark ? '#374151' : '#D1D5DB',
                  backgroundColor: isDark ? '#1F2937' : 'white',
                  height: 80,
                  textAlignVertical: 'top',
                },
              ]}
              placeholder="What does this config do?"
              placeholderTextColor="#9CA3AF"
              value={newConfig.description}
              onChangeText={(v) => setNewConfig((p) => ({ ...p, description: v }))}
              multiline
            />

            <TouchableOpacity
              style={[s.modalSaveBtn, addingSaving && s.modalSaveBtnDisabled]}
              onPress={addConfig}
              disabled={addingSaving}
            >
              {addingSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={s.saveBtnText}>Create Config Key</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

