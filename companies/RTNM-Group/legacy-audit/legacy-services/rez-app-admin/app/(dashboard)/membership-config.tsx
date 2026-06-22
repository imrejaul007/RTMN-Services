import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  membershipAdminService,
  SubscriptionTierConfig,
  SubscriptionTierBenefits,
  SubscriberInfo,
  SubscribersResponse,
} from '../../services/api/membership';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/membership-config.styles';

type ActiveTab = 'plans' | 'subscribers';
type ActiveFilter = 'all' | 'active' | 'inactive';

// Priority ordering for demotion checks (higher number = higher tier)
const TIER_PRIORITY: Record<string, number> = {
  vip: 3,
  premium: 2,
  free: 1,
};

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Benefit toggle definitions
const BENEFIT_TOGGLES: Array<{
  key: keyof SubscriptionTierBenefits;
  label: string;
  isNumeric?: boolean;
}> = [
  { key: 'cashbackMultiplier', label: 'Cashback Multiplier', isNumeric: true },
  { key: 'freeDeliveries', label: 'Free Deliveries/mo', isNumeric: true },
  { key: 'maxWishlists', label: 'Max Wishlists', isNumeric: true },
  { key: 'prioritySupport', label: 'Priority Support' },
  { key: 'exclusiveDeals', label: 'Exclusive Deals' },
  { key: 'earlyAccess', label: 'Early Access' },
  { key: 'freeDelivery', label: 'Free Delivery' },
  { key: 'unlimitedWishlists', label: 'Unlimited Wishlists' },
  { key: 'earlyFlashSaleAccess', label: 'Early Flash Sale Access' },
  { key: 'personalShopper', label: 'Personal Shopper' },
  { key: 'premiumEvents', label: 'Premium Events' },
  { key: 'conciergeService', label: 'Concierge Service' },
  { key: 'birthdayOffer', label: 'Birthday Offer' },
  { key: 'anniversaryOffer', label: 'Anniversary Offer' },
];

const DEFAULT_BENEFITS: SubscriptionTierBenefits = {
  cashbackMultiplier: 1,
  freeDeliveries: 0,
  maxWishlists: 5,
  prioritySupport: false,
  exclusiveDeals: false,
  earlyAccess: false,
  freeDelivery: false,
  unlimitedWishlists: false,
  earlyFlashSaleAccess: false,
  personalShopper: false,
  premiumEvents: false,
  conciergeService: false,
  birthdayOffer: false,
  anniversaryOffer: false,
};

interface TierFormData {
  tier: string;
  name: string;
  description: string;
  pricingMonthly: string;
  pricingYearly: string;
  pricingYearlyDiscount: string;
  benefits: SubscriptionTierBenefits;
  features: string[];
  isActive: boolean;
  sortOrder: string;
  trialDays: string;
}

const DEFAULT_FORM: TierFormData = {
  tier: '',
  name: '',
  description: '',
  pricingMonthly: '0',
  pricingYearly: '0',
  pricingYearlyDiscount: '0',
  benefits: { ...DEFAULT_BENEFITS },
  features: [],
  isActive: true,
  sortOrder: '0',
  trialDays: '0',
};

export default function MembershipConfigScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('plans');

  // Plans state
  const [plans, setPlans] = useState<SubscriptionTierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionTierConfig | null>(null);
  const [formData, setFormData] = useState<TierFormData>(DEFAULT_FORM);
  const [newFeature, setNewFeature] = useState('');

  // Subscribers state
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([]);
  const [subscribersData, setSubscribersData] = useState<SubscribersResponse | null>(null);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscribersPage, setSubscribersPage] = useState(1);
  const [tierFilter, setTierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // ====== PLANS ======

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const isActiveParam = activeFilter === 'all' ? undefined : activeFilter === 'active';
      const data = await membershipAdminService.listPlans(isActiveParam);
      setPlans([...data].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlans();
  }, [loadPlans]);

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({ ...DEFAULT_FORM, benefits: { ...DEFAULT_BENEFITS } });
    setNewFeature('');
    setShowFormModal(true);
  };

  const handleEdit = (plan: SubscriptionTierConfig) => {
    setEditingPlan(plan);
    setFormData({
      tier: plan.tier,
      name: plan.name,
      description: plan.description || '',
      pricingMonthly: String(plan.pricing?.monthly || 0),
      pricingYearly: String(plan.pricing?.yearly || 0),
      pricingYearlyDiscount: String(plan.pricing?.yearlyDiscount || 0),
      benefits: { ...DEFAULT_BENEFITS, ...plan.benefits },
      features: plan.features ? [...plan.features] : [],
      isActive: plan.isActive,
      sortOrder: String(plan.sortOrder || 0),
      trialDays: String(plan.trialDays || 0),
    });
    setNewFeature('');
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('Error', 'Plan name is required');
      return;
    }
    if (!formData.tier.trim()) {
      showAlert('Error', 'Tier identifier is required');
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        tier: formData.tier.trim().toLowerCase(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        pricing: {
          monthly: Number(formData.pricingMonthly) || 0,
          yearly: Number(formData.pricingYearly) || 0,
          yearlyDiscount: Number(formData.pricingYearlyDiscount) || 0,
        },
        benefits: formData.benefits,
        features: formData.features,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0,
        trialDays: Number(formData.trialDays) || 0,
      };
      if (editingPlan) {
        await membershipAdminService.updatePlan(editingPlan._id, payload);
        showAlert('Success', 'Tier updated');
      } else {
        await membershipAdminService.createPlan(payload);
        showAlert('Success', 'Tier created');
      }
      setShowFormModal(false);
      loadPlans();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save tier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionTierConfig) => {
    try {
      await membershipAdminService.updatePlan(plan._id, { isActive: !plan.isActive });
      loadPlans();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle status');
    }
  };

  const handleDelete = (plan: SubscriptionTierConfig) => {
    showConfirm(
      'Deactivate Tier',
      `Deactivate "${plan.name}"? Active subscribers will prevent deactivation.`,
      async () => {
        try {
          await membershipAdminService.deletePlan(plan._id);
          showAlert('Success', 'Tier deactivated');
          loadPlans();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to deactivate');
        }
      }
    );
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setFormData((p) => ({ ...p, features: [...p.features, newFeature.trim()] }));
    setNewFeature('');
  };

  const removeFeature = (i: number) => {
    setFormData((p) => ({ ...p, features: p.features.filter((_, idx) => idx !== i) }));
  };

  const updateBenefit = (key: keyof SubscriptionTierBenefits, value: boolean | number) => {
    setFormData((p) => ({ ...p, benefits: { ...p.benefits, [key]: value } }));
  };

  // ====== SUBSCRIBERS ======

  const loadSubscribers = useCallback(async () => {
    try {
      setSubscribersLoading(true);
      const data = await membershipAdminService.getSubscribers({
        tier: tierFilter || undefined,
        status: statusFilter || undefined,
        page: subscribersPage,
        limit: 20,
      });
      setSubscribersData(data);
      setSubscribers(data.subscribers);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load subscribers');
    } finally {
      setSubscribersLoading(false);
    }
  }, [tierFilter, statusFilter, subscribersPage]);

  useEffect(() => {
    if (activeTab === 'subscribers') loadSubscribers();
  }, [activeTab, loadSubscribers]);

  const handleOverride = (subscriber: SubscriberInfo) => {
    const userId = subscriber.user?._id;
    if (!userId) return;

    // Determine the next tier in the cycle
    const nextTier =
      subscriber.tier === 'free' ? 'premium' : subscriber.tier === 'premium' ? 'vip' : 'free';

    const currentPriority = TIER_PRIORITY[subscriber.tier?.toLowerCase()] ?? 1;
    const nextPriority = TIER_PRIORITY[nextTier.toLowerCase()] ?? 1;
    const isDemotion = nextPriority < currentPriority;

    if (isDemotion) {
      // Demotion — require explicit confirmation with clear warning
      showConfirm(
        'Demote Member?',
        `You are about to demote ${subscriber.user?.fullName || 'this user'} from ${capitalize(subscriber.tier ?? '')} to ${capitalize(nextTier)}. This will remove ${capitalize(subscriber.tier ?? '')} benefits immediately.`,
        async () => {
          try {
            await membershipAdminService.overrideSubscriberTier(
              userId,
              nextTier,
              `Admin demotion from dashboard: ${subscriber.tier} -> ${nextTier}`
            );
            showAlert('Success', `Demoted from ${capitalize(subscriber.tier ?? '')} to ${capitalize(nextTier)}`);
            loadSubscribers();
          } catch (error: any) {
            showAlert('Error', error.message || 'Failed to demote tier');
          }
        }
      );
      return;
    }

    // Upgrade or lateral move — standard confirmation
    showConfirm(
      'Override Tier',
      `Change ${subscriber.user?.fullName || 'User'}'s tier from ${capitalize(subscriber.tier ?? '')} to ${capitalize(nextTier)}? This action will be audited.`,
      async () => {
        try {
          await membershipAdminService.overrideSubscriberTier(
            userId,
            nextTier,
            `Admin override from dashboard: ${subscriber.tier} -> ${nextTier}`
          );
          showAlert('Success', `Tier changed to ${capitalize(nextTier)}`);
          loadSubscribers();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to override tier');
        }
      }
    );
  };

  // ====== RENDER PLAN CARD ======

  const renderPlanCard = ({ item }: { item: SubscriptionTierConfig }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[s.tierBadge, { backgroundColor: tierBadgeColor(item.tier) }]}>
              <Text style={s.tierBadgeText}>{item.tier.toUpperCase()}</Text>
            </View>
          </View>
          {item.description ? (
            <Text style={s.descText} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor={colors.card}
        />
      </View>

      {/* Pricing */}
      <View style={s.pricingRow}>
        <View style={s.priceBox}>
          <Text style={s.priceLabel}>Monthly</Text>
          <Text style={s.priceValue}>{item.pricing?.monthly || 0}</Text>
        </View>
        <View style={s.priceBox}>
          <Text style={s.priceLabel}>Yearly</Text>
          <Text style={s.priceValue}>{item.pricing?.yearly || 0}</Text>
        </View>
        <View style={s.priceBox}>
          <Text style={s.priceLabel}>Discount</Text>
          <Text style={s.priceValue}>{item.pricing?.yearlyDiscount || 0}%</Text>
        </View>
      </View>

      {/* Benefits summary */}
      <View style={s.benefitsSummary}>
        <Text style={s.benefitsSummaryTitle}>
          Benefits: {item.benefits?.cashbackMultiplier || 1}x cashback
        </Text>
        <View style={s.benefitChips}>
          {item.benefits?.freeDelivery && (
            <View style={s.benefitChip}>
              <Text style={s.benefitChipText}>Free Delivery</Text>
            </View>
          )}
          {item.benefits?.prioritySupport && (
            <View style={s.benefitChip}>
              <Text style={s.benefitChipText}>Priority Support</Text>
            </View>
          )}
          {item.benefits?.exclusiveDeals && (
            <View style={s.benefitChip}>
              <Text style={s.benefitChipText}>Exclusive Deals</Text>
            </View>
          )}
          {item.benefits?.personalShopper && (
            <View style={s.benefitChip}>
              <Text style={s.benefitChipText}>Personal Shopper</Text>
            </View>
          )}
          {item.benefits?.premiumEvents && (
            <View style={s.benefitChip}>
              <Text style={s.benefitChipText}>Premium Events</Text>
            </View>
          )}
          {item.benefits?.conciergeService && (
            <View style={s.benefitChip}>
              <Text style={s.benefitChipText}>Concierge</Text>
            </View>
          )}
        </View>
      </View>

      {/* Meta badges */}
      <View style={s.badgeRow}>
        <View
          style={[
            s.badge,
            { backgroundColor: item.isActive ? colors.successLight : colors.errorLight },
          ]}
        >
          <Text
            style={[s.badgeText, { color: item.isActive ? colors.successDeep : colors.errorDeep }]}
          >
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        {item.trialDays > 0 && (
          <View style={[s.badge, { backgroundColor: colors.infoLighter }]}>
            <Text style={[s.badgeText, { color: colors.infoDark }]}>{item.trialDays}d trial</Text>
          </View>
        )}
        <View style={[s.badge, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[s.badgeText, { color: colors.gray700 }]}>Order: {item.sortOrder}</Text>
        </View>
        {item.features?.length > 0 && (
          <View style={[s.badge, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[s.badgeText, { color: '#6B21A8' }]}>{item.features.length} features</Text>
          </View>
        )}
      </View>

      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[s.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[s.actionText, { color: colors.error }]}>Deactivate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ====== RENDER SUBSCRIBER CARD ======

  const renderSubscriberCard = ({ item }: { item: SubscriberInfo }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.subscriberHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: colors.text }]}>
            {item.user?.fullName || 'Unknown User'}
          </Text>
          <Text style={s.cardSubtitle}>
            {item.user?.phoneNumber || item.user?.email || 'No contact'}
          </Text>
        </View>
        <View style={[s.tierBadge, { backgroundColor: tierBadgeColor(item.tier) }]}>
          <Text style={s.tierBadgeText}>{item.tier?.toUpperCase()}</Text>
        </View>
      </View>
      <View style={s.subscriberDetails}>
        <View style={s.detailItem}>
          <Text style={s.detailLabel}>Status</Text>
          <Text
            style={[
              s.detailValue,
              { color: item.status === 'active' ? colors.success : colors.warning },
            ]}
          >
            {item.status}
          </Text>
        </View>
        <View style={s.detailItem}>
          <Text style={s.detailLabel}>Cycle</Text>
          <Text style={s.detailValue}>{item.billingCycle || '-'}</Text>
        </View>
        <View style={s.detailItem}>
          <Text style={s.detailLabel}>Price</Text>
          <Text style={s.detailValue}>{item.price || 0}</Text>
        </View>
        <View style={s.detailItem}>
          <Text style={s.detailLabel}>Auto-Renew</Text>
          <Text style={s.detailValue}>{item.autoRenew ? 'Yes' : 'No'}</Text>
        </View>
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleOverride(item)}>
          <Ionicons name="swap-horizontal-outline" size={18} color={colors.purple} />
          <Text style={[s.actionText, { color: colors.purple }]}>Override Tier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ====== FORM MODAL ======

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {editingPlan ? 'Edit Tier' : 'Create Tier'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={s.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={s.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Basic Info */}
          <Text style={s.formSection}>Basic Info</Text>
          <Text style={s.formLabel}>Tier Identifier</Text>
          <TextInput
            style={[
              s.formInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: editingPlan ? colors.backgroundSecondary : undefined,
              },
            ]}
            value={formData.tier}
            onChangeText={(v) =>
              setFormData((p) => ({ ...p, tier: v.toLowerCase().replace(/[^a-z0-9_]/g, '') }))
            }
            placeholder="e.g. premium, vip"
            placeholderTextColor={colors.muted}
            editable={!editingPlan}
          />
          <Text style={s.formLabel}>Display Name</Text>
          <TextInput
            style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.name}
            onChangeText={(v) => setFormData((p) => ({ ...p, name: v }))}
            placeholder="Premium Plan"
            placeholderTextColor={colors.muted}
          />
          <Text style={s.formLabel}>Description</Text>
          <TextInput
            style={[
              s.formInput,
              s.formTextArea,
              { color: colors.text, borderColor: colors.border },
            ]}
            value={formData.description}
            onChangeText={(v) => setFormData((p) => ({ ...p, description: v }))}
            placeholder="Plan description..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
          />

          {/* Pricing */}
          <Text style={s.formSection}>Pricing</Text>
          <View style={s.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Monthly</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.pricingMonthly}
                onChangeText={(v) =>
                  setFormData((p) => ({ ...p, pricingMonthly: v.replace(/[^0-9.]/g, '') }))
                }
                placeholder="99"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Yearly</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.pricingYearly}
                onChangeText={(v) =>
                  setFormData((p) => ({ ...p, pricingYearly: v.replace(/[^0-9.]/g, '') }))
                }
                placeholder="999"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Discount %</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.pricingYearlyDiscount}
                onChangeText={(v) =>
                  setFormData((p) => ({ ...p, pricingYearlyDiscount: v.replace(/[^0-9]/g, '') }))
                }
                placeholder="17"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Benefits */}
          <Text style={s.formSection}>Benefits</Text>
          {BENEFIT_TOGGLES.map(({ key, label, isNumeric }) => {
            const k = key as keyof SubscriptionTierBenefits;
            return (
            <View key={key} style={s.benefitFormRow}>
              <Text style={s.formLabel}>{label}</Text>
              {isNumeric ? (
                <TextInput
                  style={[s.numericInput, { color: colors.text, borderColor: colors.border }]}
                  value={String((formData.benefits as unknown as Record<string, number | boolean>)[k] || 0)}
                  onChangeText={(v) => updateBenefit(k, Number(v.replace(/[^0-9.]/g, '')) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor={colors.muted}
                />
              ) : (
                <Switch
                  value={!!(formData.benefits as unknown as Record<string, number | boolean>)[k]}
                  onValueChange={(v) => updateBenefit(k, v)}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={colors.card}
                />
              )}
            </View>
          );
          })}

          {/* Features */}
          <Text style={s.formSection}>Features ({formData.features.length})</Text>
          {formData.features.map((f, i) => (
            <View key={i} style={s.featEditRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[s.featEditTitle, { color: colors.text, flex: 1 }]}>{f}</Text>
              <TouchableOpacity onPress={() => removeFeature(i)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={s.addFeatBox}>
            <TextInput
              style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
              value={newFeature}
              onChangeText={setNewFeature}
              placeholder="Type a feature and press Add"
              placeholderTextColor={colors.muted}
              onSubmitEditing={addFeature}
            />
            <TouchableOpacity style={s.addFeatBtn} onPress={addFeature}>
              <Ionicons name="add" size={16} color={colors.card} />
              <Text style={s.addFeatBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <Text style={s.formSection}>Settings</Text>
          <View style={s.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Trial Days</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.trialDays}
                onChangeText={(v) =>
                  setFormData((p) => ({ ...p, trialDays: v.replace(/[^0-9]/g, '') }))
                }
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Sort Order</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.sortOrder}
                onChangeText={(v) =>
                  setFormData((p) => ({ ...p, sortOrder: v.replace(/[^0-9]/g, '') }))
                }
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={[s.switchRow, { marginTop: 14 }]}>
            <Text style={s.formLabel}>Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.card}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ====== MAIN RENDER ======

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            Subscription Management
          </Text>
        </View>
        {activeTab === 'plans' && (
          <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
            <Ionicons name="add" size={20} color={colors.card} />
            <Text style={s.createBtnText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      <View style={[s.tabBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'plans' && s.tabActive]}
          onPress={() => setActiveTab('plans')}
        >
          <Ionicons
            name="pricetag-outline"
            size={18}
            color={activeTab === 'plans' ? colors.info : colors.muted}
          />
          <Text style={[s.tabText, activeTab === 'plans' && s.tabTextActive]}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'subscribers' && s.tabActive]}
          onPress={() => setActiveTab('subscribers')}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'subscribers' ? colors.info : colors.muted}
          />
          <Text style={[s.tabText, activeTab === 'subscribers' && s.tabTextActive]}>
            Subscribers
          </Text>
          {subscribersData?.total ? (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{subscribersData.total}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <>
          <View style={[s.filtersBar, { backgroundColor: colors.card }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterChips}>
              {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterChip, activeFilter === f && s.filterChipActive]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text style={[s.filterChipText, activeFilter === f && s.filterChipTextActive]}>
                    {f === 'all' ? 'All Tiers' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <FlatList
            data={plans}
            renderItem={renderPlanCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator
                  size="large"
                  color={colors.info}
                  style={{ paddingVertical: 40 }}
                />
              ) : (
                <View style={s.emptyContainer}>
                  <Ionicons name="card-outline" size={48} color={colors.gray300} />
                  <Text style={s.emptyText}>No subscription tiers found</Text>
                  <Text style={s.emptySubText}>Create your first tier to get started</Text>
                </View>
              )
            }
          />
        </>
      )}

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <>
          <View style={[s.filtersBar, { backgroundColor: colors.card }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterChips}>
              {['', 'free', 'premium', 'vip'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.filterChip, tierFilter === t && s.filterChipActive]}
                  onPress={() => {
                    setTierFilter(t);
                    setSubscribersPage(1);
                  }}
                >
                  <Text style={[s.filterChipText, tierFilter === t && s.filterChipTextActive]}>
                    {t === '' ? 'All Tiers' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 8 }} />
              {['', 'active', 'cancelled', 'expired'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterChip, statusFilter === f && s.filterChipActive]}
                  onPress={() => {
                    setStatusFilter(f);
                    setSubscribersPage(1);
                  }}
                >
                  <Text style={[s.filterChipText, statusFilter === f && s.filterChipTextActive]}>
                    {f === '' ? 'All Status' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tier Distribution */}
          {subscribersData?.tierDistribution && subscribersData.tierDistribution.length > 0 && (
            <View style={s.distributionBar}>
              {subscribersData.tierDistribution.map((d) => (
                <View key={d._id} style={s.distributionItem}>
                  <View style={[s.distributionDot, { backgroundColor: tierBadgeColor(d._id) }]} />
                  <Text style={s.distributionText}>
                    {d._id}: {d.count}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <FlatList
            data={subscribers}
            renderItem={renderSubscriberCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl refreshing={subscribersLoading} onRefresh={loadSubscribers} />
            }
            ListEmptyComponent={
              subscribersLoading ? (
                <ActivityIndicator
                  size="large"
                  color={colors.info}
                  style={{ paddingVertical: 40 }}
                />
              ) : (
                <View style={s.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={colors.gray300} />
                  <Text style={s.emptyText}>No subscribers found</Text>
                </View>
              )
            }
            ListFooterComponent={
              subscribersData && subscribersData.totalPages > 1 ? (
                <View style={s.pagination}>
                  <TouchableOpacity
                    style={[s.pageBtn, subscribersPage <= 1 && s.pageBtnDisabled]}
                    disabled={subscribersPage <= 1}
                    onPress={() => setSubscribersPage((p) => p - 1)}
                  >
                    <Text style={s.pageBtnText}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={s.pageInfo}>
                    Page {subscribersPage} of {subscribersData.totalPages}
                  </Text>
                  <TouchableOpacity
                    style={[
                      s.pageBtn,
                      subscribersPage >= subscribersData.totalPages && s.pageBtnDisabled,
                    ]}
                    disabled={subscribersPage >= subscribersData.totalPages}
                    onPress={() => setSubscribersPage((p) => p + 1)}
                  >
                    <Text style={s.pageBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </>
      )}

      {renderFormModal()}
    </View>
  );
}

// Helper
function tierBadgeColor(tier: string): string {
  switch (tier) {
    case 'vip':
      return Colors.light.warning;
    case 'premium':
      return Colors.light.purple;
    case 'free':
      return Colors.light.mutedDark;
    default:
      return Colors.light.info;
  }
}

