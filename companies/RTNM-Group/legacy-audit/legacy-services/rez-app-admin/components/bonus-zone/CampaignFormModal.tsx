import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BonusCampaignAdmin } from '../../services/api/bonusZone';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';

interface CampaignFormModalProps {
  visible: boolean;
  editingCampaign: BonusCampaignAdmin | null;
  colors: Record<string, string>;
  onClose: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  formData: Partial<BonusCampaignAdmin>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<BonusCampaignAdmin>>>;
  startDate: string;
  setStartDate: (v: string) => void;
  startTimeInput: string;
  setStartTimeInput: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  endTimeInput: string;
  setEndTimeInput: (v: string) => void;
  newTerm: string;
  setNewTerm: (v: string) => void;
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  cashback_boost: 'Cashback Boost',
  bank_offer: 'Bank Offer',
  bill_upload_bonus: 'Bill Upload',
  category_multiplier: 'Category Multiplier',
  first_transaction_bonus: 'First Transaction',
  festival_offer: 'Festival Offer',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  flat: 'Flat Coins',
  multiplier: 'Multiplier',
};

const FUNDING_SOURCE_OPTIONS = [
  { key: 'platform', label: 'Platform' },
  { key: 'branded', label: 'Branded' },
  { key: 'partner', label: 'Partner' },
];

const COIN_TYPE_OPTIONS = [
  { key: 'rez', label: 'Rez Coins' },
  { key: 'branded', label: 'Branded Coins' },
];

const PAYMENT_METHOD_OPTIONS = [
  { key: 'credit_card', label: 'Credit Card' },
  { key: 'debit_card', label: 'Debit Card' },
  { key: 'upi', label: 'UPI' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'net_banking', label: 'Net Banking' },
  { key: 'cod', label: 'COD' },
];

const MERCHANT_CATEGORY_OPTIONS = [
  { key: 'food-dining', label: 'Food & Dining' },
  { key: 'beauty-wellness', label: 'Beauty & Wellness' },
  { key: 'grocery-essentials', label: 'Grocery' },
  { key: 'fitness-sports', label: 'Fitness & Sports' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'education-learning', label: 'Education' },
  { key: 'home-services', label: 'Home Services' },
  { key: 'travel-experiences', label: 'Travel' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'financial-lifestyle', label: 'Financial' },
  { key: 'electronics', label: 'Electronics' },
];

const USER_SEGMENT_OPTIONS = [
  { key: 'new_user', label: 'New User' },
  { key: 'student', label: 'Student' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'prive', label: 'Prive' },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function isValidDate(date: string): boolean {
  if (!date) return true;
  return DATE_REGEX.test(date) && !isNaN(new Date(date).getTime());
}

function isValidTime(time: string): boolean {
  if (!time) return true;
  if (!TIME_REGEX.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function combineDateAndTime(date: string, time: string): string | null {
  if (!DATE_REGEX.test(date)) return null;
  const t = TIME_REGEX.test(time) ? time : '00:00';
  const d = new Date(`${date}T${t}:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDatePreview(date: string, time: string): string | null {
  if (!DATE_REGEX.test(date)) return null;
  const t = TIME_REGEX.test(time) ? time : '00:00';
  try {
    const d = new Date(`${date}T${t}:00`);
    if (isNaN(d.getTime())) return null;
    return format(d, "MMM dd, yyyy 'at' h:mm a");
  } catch {
    return null;
  }
}

export default function CampaignFormModal({
  visible,
  editingCampaign,
  colors,
  onClose,
  onSave,
  isSaving,
  formData,
  setFormData,
  startDate,
  setStartDate,
  startTimeInput,
  setStartTimeInput,
  endDate,
  setEndDate,
  endTimeInput,
  setEndTimeInput,
  newTerm,
  setNewTerm,
}: CampaignFormModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
          </Text>
          <TouchableOpacity onPress={onSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.formSectionTitle}>Basic Info</Text>

          <Text style={styles.formLabel}>Slug (unique identifier)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.slug || ''}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              }))
            }
            placeholder="super-cashback-feb26"
            placeholderTextColor={colors.muted}
            editable={!editingCampaign}
          />

          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.title || ''}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, title: v }))}
            placeholder="Super Cashback Weekend"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Subtitle</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.subtitle || ''}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, subtitle: v }))}
            placeholder="Up to 50% cashback on all stores"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={[
              styles.formInput,
              styles.formTextArea,
              { color: colors.text, borderColor: colors.border },
            ]}
            value={formData.description || ''}
            onChangeText={(v) => setFormData((prev) => ({ ...prev, description: v }))}
            multiline
            numberOfLines={3}
            placeholder="Detailed campaign description..."
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Campaign Type</Text>
          <View style={styles.chipRow}>
            {Object.entries(CAMPAIGN_TYPE_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.campaignType === key && styles.chipSelected]}
                onPress={() => setFormData((prev) => ({ ...prev, campaignType: key as any }))}
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.campaignType === key && styles.chipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Status</Text>
          <View style={styles.chipRow}>
            {['draft', 'scheduled', 'active'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, formData.status === s && styles.chipSelected]}
                onPress={() => setFormData((prev) => ({ ...prev, status: s as any }))}
              >
                <Text style={[styles.chipText, formData.status === s && styles.chipTextSelected]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reward */}
          <Text style={styles.formSectionTitle}>Reward</Text>

          <Text style={styles.formLabel}>Reward Type</Text>
          <View style={styles.chipRow}>
            {Object.entries(REWARD_TYPE_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.reward?.type === key && styles.chipSelected]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    reward: { ...prev.reward!, type: key as any },
                  }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.reward?.type === key && styles.chipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Value</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.reward?.value || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    reward: { ...prev.reward!, value: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Total Budget</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.reward?.totalBudget || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    reward: { ...prev.reward!, totalBudget: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="10000"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Cap/User</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.reward?.capPerUser || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    reward: { ...prev.reward!, capPerUser: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Cap/Transaction</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.reward?.capPerTransaction || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    reward: { ...prev.reward!, capPerTransaction: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Limits */}
          <Text style={styles.formSectionTitle}>Usage Limits</Text>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Max Claims/User</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.limits?.maxClaimsPerUser || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    limits: { ...prev.limits!, maxClaimsPerUser: Number(v) || 1 },
                  }))
                }
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Max Claims/User/Day</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.limits?.maxClaimsPerUserPerDay || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    limits: { ...prev.limits!, maxClaimsPerUserPerDay: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="0 = unlimited"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Schedule */}
          <Text style={styles.formSectionTitle}>Schedule</Text>

          <Text style={styles.formLabel}>Start Date & Time</Text>
          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border },
                  startDate !== '' && !isValidDate(startDate) && styles.formInputError,
                ]}
                value={startDate}
                onChangeText={(v) => {
                  setStartDate(v);
                  const iso = combineDateAndTime(v, startTimeInput);
                  if (iso) setFormData((prev) => ({ ...prev, startTime: iso }));
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                maxLength={10}
              />
              <Text style={styles.formInputHint}>Date</Text>
            </View>
            <View style={styles.formRowItem}>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border },
                  startTimeInput !== '' && !isValidTime(startTimeInput) && styles.formInputError,
                ]}
                value={startTimeInput}
                onChangeText={(v) => {
                  setStartTimeInput(v);
                  const iso = combineDateAndTime(startDate, v);
                  if (iso) setFormData((prev) => ({ ...prev, startTime: iso }));
                }}
                placeholder="HH:MM"
                placeholderTextColor={colors.muted}
                maxLength={5}
              />
              <Text style={styles.formInputHint}>Time (24h)</Text>
            </View>
          </View>
          {formatDatePreview(startDate, startTimeInput) && (
            <Text style={styles.datePreview}>{formatDatePreview(startDate, startTimeInput)}</Text>
          )}

          <Text style={[styles.formLabel, { marginTop: 14 }]}>End Date & Time</Text>
          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border },
                  endDate !== '' && !isValidDate(endDate) && styles.formInputError,
                ]}
                value={endDate}
                onChangeText={(v) => {
                  setEndDate(v);
                  const iso = combineDateAndTime(v, endTimeInput);
                  if (iso) setFormData((prev) => ({ ...prev, endTime: iso }));
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                maxLength={10}
              />
              <Text style={styles.formInputHint}>Date</Text>
            </View>
            <View style={styles.formRowItem}>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border },
                  endTimeInput !== '' && !isValidTime(endTimeInput) && styles.formInputError,
                ]}
                value={endTimeInput}
                onChangeText={(v) => {
                  setEndTimeInput(v);
                  const iso = combineDateAndTime(endDate, v);
                  if (iso) setFormData((prev) => ({ ...prev, endTime: iso }));
                }}
                placeholder="HH:MM"
                placeholderTextColor={colors.muted}
                maxLength={5}
              />
              <Text style={styles.formInputHint}>Time (24h)</Text>
            </View>
          </View>
          {formatDatePreview(endDate, endTimeInput) && (
            <Text style={styles.datePreview}>{formatDatePreview(endDate, endTimeInput)}</Text>
          )}

          {/* Funding Source & Coin Type */}
          <Text style={styles.formSectionTitle}>Funding & Coin Type</Text>

          <Text style={styles.formLabel}>Funding Source</Text>
          <View style={styles.chipRow}>
            {FUNDING_SOURCE_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.fundingSource?.type === key && styles.chipSelected]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    fundingSource: {
                      ...prev.fundingSource!,
                      type: key as any,
                      ...(key === 'platform' ? { partnerName: '' } : {}),
                    },
                  }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.fundingSource?.type === key && styles.chipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.fundingSource?.type && formData.fundingSource.type !== 'platform' && (
            <>
              <Text style={styles.formLabel}>Partner Name</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.fundingSource?.partnerName || ''}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    fundingSource: { ...prev.fundingSource!, partnerName: v },
                  }))
                }
                placeholder="e.g. HDFC Bank, Swiggy"
                placeholderTextColor={colors.muted}
              />
            </>
          )}

          <Text style={styles.formLabel}>Coin Type</Text>
          <View style={styles.chipRow}>
            {COIN_TYPE_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.reward?.coinType === key && styles.chipSelected]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    reward: { ...prev.reward!, coinType: key as any },
                  }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    formData.reward?.coinType === key && styles.chipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Eligibility Rules */}
          <Text style={styles.formSectionTitle}>Eligibility Rules</Text>
          <Text style={styles.formHint}>
            Leave fields empty to apply no restriction (all allowed).
          </Text>

          <Text style={styles.formLabel}>Regions (comma-separated)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={(formData.eligibility?.regions || []).join(',')}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                eligibility: {
                  ...prev.eligibility!,
                  regions: v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [],
                },
              }))
            }
            placeholder="all"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Payment Methods</Text>
          <View style={styles.chipRow}>
            {PAYMENT_METHOD_OPTIONS.map(({ key, label }) => {
              const selected = (formData.eligibility?.paymentMethods || []).includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() =>
                    setFormData((prev) => {
                      const current = prev.eligibility?.paymentMethods || [];
                      const updated = selected
                        ? current.filter((m) => m !== key)
                        : [...current, key];
                      return {
                        ...prev,
                        eligibility: { ...prev.eligibility!, paymentMethods: updated },
                      };
                    })
                  }
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Bank Codes (comma-separated)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={(formData.eligibility?.bankCodes || []).join(',')}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                eligibility: {
                  ...prev.eligibility!,
                  bankCodes: v
                    ? v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
                    : [],
                },
              }))
            }
            placeholder="HDFC,ICICI,SBI"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
          />

          <Text style={styles.formLabel}>BIN Prefixes (comma-separated)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={(formData.eligibility?.binPrefixes || []).join(',')}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                eligibility: {
                  ...prev.eligibility!,
                  binPrefixes: v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [],
                },
              }))
            }
            placeholder="411111,523456"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
          />

          <Text style={styles.formLabel}>Merchant Categories</Text>
          <View style={styles.chipRow}>
            {MERCHANT_CATEGORY_OPTIONS.map(({ key, label }) => {
              const selected = (formData.eligibility?.merchantCategories || []).includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() =>
                    setFormData((prev) => {
                      const current = prev.eligibility?.merchantCategories || [];
                      const updated = selected
                        ? current.filter((m) => m !== key)
                        : [...current, key];
                      return {
                        ...prev,
                        eligibility: { ...prev.eligibility!, merchantCategories: updated },
                      };
                    })
                  }
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>User Segments</Text>
          <View style={styles.chipRow}>
            {USER_SEGMENT_OPTIONS.map(({ key, label }) => {
              const selected = (formData.eligibility?.userSegments || []).includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() =>
                    setFormData((prev) => {
                      const current = prev.eligibility?.userSegments || [];
                      const updated = selected
                        ? current.filter((m) => m !== key)
                        : [...current, key];
                      return {
                        ...prev,
                        eligibility: { ...prev.eligibility!, userSegments: updated },
                      };
                    })
                  }
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Minimum Spend</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={String(formData.eligibility?.minSpend || '')}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                eligibility: { ...prev.eligibility!, minSpend: Number(v) || 0 },
              }))
            }
            keyboardType="numeric"
            placeholder="0 = no minimum"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>First Transaction Only</Text>
            <Switch
              value={formData.eligibility?.firstTransactionOnly || false}
              onValueChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  eligibility: { ...prev.eligibility!, firstTransactionOnly: v },
                }))
              }
            />
          </View>

          {/* Display */}
          <Text style={styles.formSectionTitle}>Display</Text>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Icon (emoji)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.display?.icon || ''}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    display: { ...prev.display!, icon: v },
                  }))
                }
                placeholder="🎁"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Priority (0-100)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.display?.priority || '')}
                onChangeText={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    display: { ...prev.display!, priority: Number(v) || 0 },
                  }))
                }
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Featured</Text>
            <Switch
              value={formData.display?.featured || false}
              onValueChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  display: { ...prev.display!, featured: v },
                }))
              }
            />
          </View>

          <Text style={styles.formLabel}>Badge Text</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.display?.badgeText || ''}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                display: { ...prev.display!, badgeText: v },
              }))
            }
            placeholder="50% OFF"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Banner Image URL</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.display?.bannerImage || ''}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                display: { ...prev.display!, bannerImage: v },
              }))
            }
            placeholder="https://example.com/banner.jpg"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!formData.display?.bannerImage && (
            <Image
              source={{ uri: formData.display.bannerImage }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          )}

          <Text style={styles.formLabel}>Partner Logo URL</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.display?.partnerLogo || ''}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                display: { ...prev.display!, partnerLogo: v },
              }))
            }
            placeholder="https://example.com/logo.png"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!(formData.display as any)?.partnerLogo && (
            <Image
              source={{ uri: (formData.display as any).partnerLogo }}
              style={styles.imagePreviewSmall}
              resizeMode="contain"
            />
          )}

          {/* Deep Link */}
          <Text style={styles.formSectionTitle}>Deep Link</Text>

          <Text style={styles.formLabel}>Screen Path</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.deepLink?.screen || ''}
            onChangeText={(v) =>
              setFormData((prev) => ({
                ...prev,
                deepLink: { ...prev.deepLink!, screen: v },
              }))
            }
            placeholder="/cash-store"
            placeholderTextColor={colors.muted}
          />

          {/* Terms */}
          <Text style={styles.formSectionTitle}>Terms & Conditions</Text>
          {(formData.terms || []).map((term, i) => (
            <View key={i} style={styles.termRow}>
              <Text style={styles.termText} numberOfLines={2}>
                {term}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setFormData((prev) => ({
                    ...prev,
                    terms: (prev.terms || []).filter((_, idx) => idx !== i),
                  }));
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addTermRow}>
            <TextInput
              style={[
                styles.formInput,
                { flex: 1, color: colors.text, borderColor: colors.border },
              ]}
              value={newTerm}
              onChangeText={setNewTerm}
              placeholder="Add a term..."
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              style={styles.addTermBtn}
              onPress={() => {
                if (newTerm.trim()) {
                  setFormData((prev) => ({
                    ...prev,
                    terms: [...(prev.terms || []), newTerm.trim()],
                  }));
                  setNewTerm('');
                }
              }}
            >
              <Ionicons name="add-circle" size={28} color={colors.info} />
            </TouchableOpacity>
          </View>

          {/* Card Preview */}
          <Text style={styles.formSectionTitle}>Card Preview</Text>
          <View style={styles.previewContainer}>
            <View
              style={[
                styles.previewCard,
                { backgroundColor: formData.display?.backgroundColor || colors.warningLight },
              ]}
            >
              <View style={styles.previewHeader}>
                <Text style={styles.previewIcon}>{formData.display?.icon || '🎁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {formData.title || 'Campaign Title'}
                  </Text>
                  <Text style={styles.previewSubtitle} numberOfLines={2}>
                    {formData.subtitle || 'Campaign subtitle will appear here'}
                  </Text>
                </View>
              </View>

              <View style={styles.previewRewardRow}>
                <View style={styles.previewRewardBadge}>
                  <Text style={styles.previewRewardText}>
                    {formData.reward?.type === 'percentage'
                      ? `${formData.reward?.value || 0}% Cashback`
                      : formData.reward?.type === 'multiplier'
                        ? `${formData.reward?.value || 0}x Multiplier`
                        : `${formData.reward?.value || 0} Coins`}
                  </Text>
                </View>
                <View style={styles.previewTypeBadge}>
                  <Text style={styles.previewTypeText}>
                    {CAMPAIGN_TYPE_LABELS[formData.campaignType || ''] ||
                      formData.campaignType ||
                      'Type'}
                  </Text>
                </View>
              </View>

              {formData.display?.featured && (
                <View style={styles.previewFeaturedBadge}>
                  <Ionicons name="star" size={10} color={colors.warningDark} />
                  <Text style={styles.previewFeaturedText}>Featured</Text>
                </View>
              )}

              {formatDatePreview(startDate, startTimeInput) && (
                <View style={styles.previewScheduleRow}>
                  <Ionicons name="calendar-outline" size={12} color={colors.mutedDark} />
                  <Text style={styles.previewScheduleText} numberOfLines={1}>
                    {formatDatePreview(startDate, startTimeInput)}
                    {formatDatePreview(endDate, endTimeInput)
                      ? ` - ${formatDatePreview(endDate, endTimeInput)}`
                      : ''}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.previewLabel}>
              This is how the campaign card will appear to users
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: Colors.light.info },
  formScroll: { paddingHorizontal: 20 },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.navy,
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
    paddingBottom: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.mutedDark,
    marginTop: 10,
    marginBottom: 4,
  },
  formHint: { fontSize: 12, color: Colors.light.muted, fontStyle: 'italic', marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 12 },
  formRowItem: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  chipSelected: { backgroundColor: Colors.light.info },
  chipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  chipTextSelected: { color: Colors.light.card, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 8,
    marginBottom: 4,
    gap: 8,
  },
  termText: { flex: 1, fontSize: 13, color: Colors.light.gray700 },
  addTermRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  addTermBtn: { paddingTop: 4 },
  formInputError: { borderColor: Colors.light.error, borderWidth: 2 },
  formInputHint: { fontSize: 11, color: Colors.light.muted, marginTop: 2 },
  datePreview: {
    fontSize: 13,
    color: Colors.light.success,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
    paddingLeft: 2,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  imagePreviewSmall: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  previewContainer: { marginTop: 4, marginBottom: 20 },
  previewCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  previewIcon: { fontSize: 32 },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.navy,
  },
  previewSubtitle: {
    fontSize: 13,
    color: Colors.light.gray600,
    marginTop: 2,
  },
  previewRewardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  previewRewardBadge: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewRewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.card,
  },
  previewTypeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.info,
  },
  previewFeaturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  previewFeaturedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.warningDark,
  },
  previewScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  previewScheduleText: {
    fontSize: 11,
    color: Colors.light.mutedDark,
  },
  previewLabel: {
    fontSize: 11,
    color: Colors.light.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
