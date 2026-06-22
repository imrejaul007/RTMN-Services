import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export type CampaignType = 'mission_sprint' | 'festival' | 'category_push';

export interface CampaignFormData {
  title: string;
  subtitle: string;
  type: CampaignType;
  targetCategory: string;
  targetCity: string;
  targetTrialCount: string;
  rewardCoins: string;
  trialCoins: string;
  bonusBadgeName: string;
  startDate: string;
  endDate: string;
}

export const DEFAULT_FORM_DATA: CampaignFormData = {
  title: '',
  subtitle: '',
  type: 'mission_sprint',
  targetCategory: '',
  targetCity: '',
  targetTrialCount: '10',
  rewardCoins: '100',
  trialCoins: '50',
  bonusBadgeName: '',
  startDate: '',
  endDate: '',
};

interface CreateCampaignModalProps {
  visible: boolean;
  editingCampaign?: {
    _id: string;
    title: string;
    subtitle: string;
    type: CampaignType;
    targetCity?: string;
    targetCategory?: string;
    startDate: string;
    endDate: string;
    targetTrialCount: number;
    rewardCoins: number;
    trialCoins: number;
  } | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (data: CampaignFormData, editingId?: string) => void;
}

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'mission_sprint':
      return 'Mission Sprint';
    case 'festival':
      return 'Festival';
    case 'category_push':
      return 'Category Push';
    default:
      return type;
  }
};

export default function CreateCampaignModal({
  visible,
  editingCampaign,
  isSubmitting,
  onClose,
  onSave,
}: CreateCampaignModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [formData, setFormData] = useState<CampaignFormData>(DEFAULT_FORM_DATA);

  useEffect(() => {
    if (editingCampaign) {
      setFormData({
        title: editingCampaign.title,
        subtitle: editingCampaign.subtitle,
        type: editingCampaign.type,
        targetCategory: editingCampaign.targetCategory || '',
        targetCity: editingCampaign.targetCity || '',
        targetTrialCount: String(editingCampaign.targetTrialCount),
        rewardCoins: String(editingCampaign.rewardCoins),
        trialCoins: String(editingCampaign.trialCoins),
        bonusBadgeName: '',
        startDate: editingCampaign.startDate,
        endDate: editingCampaign.endDate,
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [editingCampaign, visible]);

  const handleSave = () => {
    onSave(formData, editingCampaign?._id);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Campaign title"
                placeholderTextColor={colors.icon}
                value={formData.title}
                onChangeText={(v) => setFormData({ ...formData, title: v })}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Subtitle</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Try 3 salons, win 500 coins"
                placeholderTextColor={colors.icon}
                value={formData.subtitle}
                onChangeText={(v) => setFormData({ ...formData, subtitle: v })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Type *</Text>
              <View style={styles.typeSelector}>
                {(['mission_sprint', 'festival', 'category_push'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeOption,
                      formData.type === t && styles.typeOptionActive,
                      { borderColor: formData.type === t ? '#8B5CF6' : colors.border },
                    ]}
                    onPress={() => setFormData({ ...formData, type: t })}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        { color: formData.type === t ? '#8B5CF6' : colors.text },
                      ]}
                    >
                      {getTypeLabel(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Target Category</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Salon & Spa"
                placeholderTextColor={colors.icon}
                value={formData.targetCategory}
                onChangeText={(v) => setFormData({ ...formData, targetCategory: v })}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Target City</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Mumbai"
                placeholderTextColor={colors.icon}
                value={formData.targetCity}
                onChangeText={(v) => setFormData({ ...formData, targetCity: v })}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Target Trial Count</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="10"
                placeholderTextColor={colors.icon}
                value={formData.targetTrialCount}
                onChangeText={(v) => setFormData({ ...formData, targetTrialCount: v })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Reward ReZ Coins</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="100"
                placeholderTextColor={colors.icon}
                value={formData.rewardCoins}
                onChangeText={(v) => setFormData({ ...formData, rewardCoins: v })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Reward Trial Coins</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="50"
                placeholderTextColor={colors.icon}
                value={formData.trialCoins}
                onChangeText={(v) => setFormData({ ...formData, trialCoins: v })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Bonus Badge Name</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Beauty Expert"
                placeholderTextColor={colors.icon}
                value={formData.bonusBadgeName}
                onChangeText={(v) => setFormData({ ...formData, bonusBadgeName: v })}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Start Date *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.icon}
                value={formData.startDate}
                onChangeText={(v) => setFormData({ ...formData, startDate: v })}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>End Date *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.icon}
                value={formData.endDate}
                onChangeText={(v) => setFormData({ ...formData, endDate: v })}
              />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {editingCampaign ? 'Save' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '90%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  form: { flex: 1, paddingHorizontal: 16, paddingVertical: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  typeOptionActive: { backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  typeOptionText: { fontSize: 12, fontWeight: '500' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  btnText: { fontWeight: '600', fontSize: 14 },
  btnPrimary: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
