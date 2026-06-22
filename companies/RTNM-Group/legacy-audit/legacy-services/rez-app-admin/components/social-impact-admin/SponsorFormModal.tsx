import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sharedModalStyles } from './sharedModalStyles';
import Colors from '../../constants/Colors';
import { INDUSTRIES } from '../../services/api/socialImpact';

interface SponsorFormData {
  name: string; logo: string; description: string;
  brandCoinName: string; brandCoinLogo: string;
  contactPerson: { name: string; email: string; phone: string };
  website: string; industry: string;
}

interface Props {
  visible: boolean;
  editing: boolean;
  form: SponsorFormData;
  setForm: React.Dispatch<React.SetStateAction<SponsorFormData>>;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  colors: any;
}

const INDUSTRY_COLORS: Record<string, string> = {
  technology: Colors.light.info, healthcare: Colors.light.success, finance: Colors.light.purple,
  retail: Colors.light.warning, manufacturing: Colors.light.indigo, fmcg: Colors.light.pink,
  energy: '#14B8A6', education: Colors.light.orange, hospitality: Colors.light.cyan,
  other: Colors.light.mutedDark,
};

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function SponsorFormModal({ visible, editing, form, setForm, onClose, onSave, isSaving, colors }: Props) {
  const fieldRows = [
    { label: 'Sponsor Name *', key: 'name', placeholder: 'Enter sponsor name', type: 'default' },
    { label: 'Logo URL *', key: 'logo', placeholder: 'https://example.com/logo.png', type: 'url' },
    { label: 'Brand Coin Name *', key: 'brandCoinName', placeholder: 'e.g. TechCoins', type: 'default' },
    { label: 'Brand Coin Logo URL', key: 'brandCoinLogo', placeholder: 'https://example.com/coin-logo.png', type: 'url' },
    { label: 'Website', key: 'website', placeholder: 'https://www.example.com', type: 'url' },
  ];
  const contactFields = [
    { label: 'Name *', key: 'name', type: 'default' },
    { label: 'Email *', key: 'email', type: 'email-address' },
    { label: 'Phone', key: 'phone', type: 'phone-pad' },
  ];
  const { modalContainer, modalHeader, modalCloseBtn, modalTitle, modalSaveBtn, modalSaveBtnText, formScroll, formContent, formGroup, formLabel, formInput, textArea, formSeparator, formSectionTitle, selectRow, selectChip, selectChipText } = sharedModalStyles;
  const s = StyleSheet.create({
    formInput: { ...formInput, backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
    textArea: { ...textArea, backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
    modalHeader: { ...modalHeader, borderBottomColor: colors.border },
    modalTitle: { ...modalTitle, color: colors.text },
    modalSaveBtn: { ...modalSaveBtn, backgroundColor: colors.tint, opacity: isSaving ? 0.6 : 1 },
    modalSaveBtnText: { ...modalSaveBtnText, color: colors.card },
    formLabel: { ...formLabel, color: colors.text },
    formGroup: { ...formGroup },
    formSeparator: { ...formSeparator, backgroundColor: colors.border },
    formSectionTitle: { ...formSectionTitle, color: colors.text },
  });

  return (
    <View style={modalContainer}>
      <View style={[s.modalHeader, { backgroundColor: colors.background }]}>
        <View style={modalCloseBtn} />
        <Text style={s.modalTitle}>{editing ? 'Edit Sponsor' : 'New Sponsor'}</Text>
        <TouchableOpacity onPress={onSave} disabled={isSaving} style={s.modalSaveBtn}>
          {isSaving ? <ActivityIndicator size="small" color={colors.card} /> : <Text style={s.modalSaveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView style={formScroll} contentContainerStyle={formContent} keyboardShouldPersistTaps="handled">
        {fieldRows.map(({ label, key, placeholder, type }) => (
          <View key={key} style={s.formGroup}>
            <Text style={s.formLabel}>{label}</Text>
            <TextInput style={key === 'description' || key === 'brandCoinLogo' ? [s.formInput, s.textArea] : s.formInput}
              value={form[key as keyof SponsorFormData] as string}
              onChangeText={(text) => setForm((p) => ({ ...p, [key]: text }))}
              placeholder={placeholder} placeholderTextColor={colors.icon}
              autoCapitalize={type === 'url' ? 'none' : 'sentences'} keyboardType={type === 'url' ? 'url' : 'default'} />
          </View>
        ))}
        <View style={s.formSeparator} />
        <Text style={s.formSectionTitle}>Contact Person</Text>
        {contactFields.map(({ label, key, type }) => (
          <View key={key} style={s.formGroup}>
            <Text style={s.formLabel}>{label}</Text>
            <TextInput style={s.formInput}
              value={(form.contactPerson as any)[key]}
              onChangeText={(text) => setForm((p) => ({ ...p, contactPerson: { ...p.contactPerson, [key]: text } }))}
              placeholder={label} placeholderTextColor={colors.icon}
              autoCapitalize={type === 'email-address' ? 'none' : 'sentences'} keyboardType={type as any} />
          </View>
        ))}
        <View style={s.formSeparator} />
        <View style={s.formGroup}>
          <Text style={s.formLabel}>Industry</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={selectRow}>
              {INDUSTRIES.map((industry) => {
                const isSelected = form.industry === industry;
                const indColor = INDUSTRY_COLORS[industry] || colors.mutedDark;
                return (
                  <TouchableOpacity key={industry}
                    style={[selectChip, { backgroundColor: isSelected ? `${indColor}20` : colors.background, borderColor: isSelected ? indColor : colors.border }]}
                    onPress={() => setForm((p) => ({ ...p, industry: isSelected ? '' : industry }))}>
                    <Text style={[selectChipText, { color: isSelected ? indColor : colors.icon }]}>{capitalizeFirst(industry)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
