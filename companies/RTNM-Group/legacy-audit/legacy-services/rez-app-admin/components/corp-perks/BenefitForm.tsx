/**
 * CorpPerks Benefit Form
 *
 * Create/Edit benefit package form
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { Card, BenefitBadge } from './index';
import { corpPerksApi, type CreateBenefitRequest, type Benefit } from '../../services/api/corpPerks';

interface BenefitFormProps {
  benefit?: Benefit;
  onSuccess?: (benefit: Benefit) => void;
  onCancel?: () => void;
}

const BENEFIT_TYPES: Array<{ value: Benefit['benefitType']; label: string; icon: string }> = [
  { value: 'meal', label: 'Meal', icon: 'restaurant-outline' },
  { value: 'travel', label: 'Travel', icon: 'airplane-outline' },
  { value: 'gift', label: 'Gift', icon: 'gift-outline' },
  { value: 'wellness', label: 'Wellness', icon: 'fitness-outline' },
  { value: 'flex', label: 'Flex', icon: 'options-outline' },
  { value: 'learning', label: 'Learning', icon: 'school-outline' },
];

const PERIOD_TYPES: Array<{ value: Benefit['periodType']; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function BenefitForm({ benefit, onSuccess, onCancel }: BenefitFormProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateBenefitRequest>({
    name: benefit?.name || '',
    description: benefit?.description || '',
    benefitType: benefit?.benefitType || 'meal',
    amount: benefit?.amount || 0,
    periodType: benefit?.periodType || 'monthly',
    startDate: benefit?.startDate || new Date().toISOString(),
    rules: {
      requiresApproval: benefit?.rules?.requiresApproval || false,
      autoApprovalLimit: benefit?.rules?.autoApprovalLimit || 5000,
      rolloverEnabled: benefit?.rules?.rolloverEnabled || false,
    },
  });

  const updateField = <K extends keyof CreateBenefitRequest>(
    field: K,
    value: CreateBenefitRequest[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateRule = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      rules: { ...prev.rules!, [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a benefit name');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      let result: Benefit;
      if (benefit) {
        result = await corpPerksApi.updateBenefit(benefit._id, formData);
      } else {
        result = await corpPerksApi.createBenefit(formData);
      }
      Alert.alert('Success', `Benefit ${benefit ? 'updated' : 'created'} successfully`);
      onSuccess?.(result);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save benefit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={onCancel || (() => router.back())}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {benefit ? 'Edit Benefit' : 'New Benefit'}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Benefit Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.name}
                onChangeText={(v) => updateField('name', v)}
                placeholder="e.g., Monthly Meal Allowance"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.description}
                onChangeText={(v) => updateField('description', v)}
                placeholder="Describe this benefit..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Benefit Type */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Benefit Type *</Text>
              <View style={styles.typeGrid}>
                {BENEFIT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      formData.benefitType === type.value && { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
                    ]}
                    onPress={() => updateField('benefitType', type.value)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={formData.benefitType === type.value ? colors.tint : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: formData.benefitType === type.value ? colors.tint : colors.text },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>

          {/* Amount & Period */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Allocation</Text>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (₹) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.amount ? String(formData.amount) : ''}
                  onChangeText={(v) => updateField('amount', parseFloat(v) || 0)}
                  placeholder="2000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Period</Text>
                <View style={styles.periodButtons}>
                  {PERIOD_TYPES.map((period) => (
                    <TouchableOpacity
                      key={period.value}
                      style={[
                        styles.periodButton,
                        { backgroundColor: colors.background },
                        formData.periodType === period.value && { backgroundColor: colors.tint },
                      ]}
                      onPress={() => updateField('periodType', period.value)}
                    >
                      <Text
                        style={[
                          styles.periodLabel,
                          { color: formData.periodType === period.value ? '#fff' : colors.text },
                        ]}
                      >
                        {period.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Card>

          {/* Rules */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Rules</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Requires Approval</Text>
                <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                  Claims need manager approval
                </Text>
              </View>
              <Switch
                value={formData.rules?.requiresApproval || false}
                onValueChange={(v) => updateRule('requiresApproval', v)}
                trackColor={{ true: colors.tint }}
              />
            </View>

            {formData.rules?.requiresApproval && (
              <View style={[styles.field, { marginTop: 12 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Auto-Approve Limit (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.rules?.autoApprovalLimit ? String(formData.rules.autoApprovalLimit) : ''}
                  onChangeText={(v) => updateRule('autoApprovalLimit', parseFloat(v) || 0)}
                  placeholder="5000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={[styles.switchRow, { marginTop: 12 }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Enable Rollover</Text>
                <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                  Unused amount carries to next period
                </Text>
              </View>
              <Switch
                value={formData.rules?.rolloverEnabled || false}
                onValueChange={(v) => updateRule('rolloverEnabled', v)}
                trackColor={{ true: colors.tint }}
              />
            </View>
          </Card>

          {/* Preview */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preview</Text>
            <View style={styles.preview}>
              <View style={styles.previewRow}>
                <BenefitBadge type={formData.benefitType} />
                <Text style={[styles.previewAmount, { color: colors.tint }]}>
                  ₹{formData.amount?.toLocaleString() || '0'}
                </Text>
                <Text style={[styles.previewPeriod, { color: colors.textSecondary }]}>
                  / {formData.periodType}
                </Text>
              </View>
              <Text style={[styles.previewName, { color: colors.text }]}>
                {formData.name || 'Benefit Name'}
              </Text>
            </View>
          </Card>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  preview: {
    alignItems: 'center',
    padding: 20,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  previewPeriod: {
    fontSize: 14,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
