import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import {
  SocialImpactEvent,
  EVENT_TYPES,
  EVENT_STATUSES,
} from '@/services/api/socialImpact';

export interface EventFormData {
  name: string;
  description: string;
  eventType: string;
  eventStatus: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  organizerName: string;
  organizerLogo: string;
  locationAddress: string;
  locationCity: string;
  eventDate: string;
  eventTimeStart: string;
  eventTimeEnd: string;
  rewardsRezCoins: number;
  rewardsBrandCoins: number;
  capacityGoal: number;
  impactDescription: string;
  impactMetric: string;
  impactTargetValue: number;
  contactPhone: string;
  contactEmail: string;
  isCsrActivity: boolean;
  featured: boolean;
  image: string;
}

interface EventFormModalProps {
  visible: boolean;
  editingEvent: SocialImpactEvent | null;
  form: EventFormData;
  colors: Record<string, string>;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: EventFormData) => void;
}

function SelectOptions({
  label,
  options,
  selectedValue,
  onSelect,
  colors,
}: {
  label: string;
  options: Array<{ value: string; label: string; emoji?: string; color?: string }>;
  selectedValue: string;
  onSelect: (value: string) => void;
  colors: Record<string, string>;
}) {
  return (
    <View style={styles.formGroup}>
      <Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.selectRow}>
          {options.map((option) => {
            const isSelected = selectedValue === option.value;
            const optColor = option.color || colors.tint;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectChip,
                  {
                    backgroundColor: isSelected ? `${optColor}20` : colors.background,
                    borderColor: isSelected ? optColor : colors.border,
                  },
                ]}
                onPress={() => onSelect(option.value)}
              >
                {option.emoji && <Text style={{ fontSize: 14, marginRight: 4 }}>{option.emoji}</Text>}
                <Text style={[styles.selectChipText, { color: isSelected ? optColor : colors.icon }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function EventFormModal({
  visible,
  editingEvent,
  form,
  colors,
  isSaving,
  onClose,
  onSave,
  onFormChange,
}: EventFormModalProps) {
  const isEditing = !!editingEvent;
  const modalTitle = isEditing ? 'Edit Event' : 'New Event';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>
          <TouchableOpacity
            onPress={onSave}
            disabled={isSaving}
            style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.modalSaveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Event Name *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={form.name}
              onChangeText={(text) => onFormChange({ ...form, name: text })}
              placeholder="Event name"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={form.description}
              onChangeText={(text) => onFormChange({ ...form, description: text })}
              placeholder="Event description"
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={4}
            />
          </View>

          <SelectOptions
            label="Event Type *"
            options={EVENT_TYPES.map((t: { value: string; label: string; emoji: string }) => ({ value: t.value, label: t.label, emoji: t.emoji }))}
            selectedValue={form.eventType}
            onSelect={(val) => onFormChange({ ...form, eventType: val })}
            colors={colors}
          />

          <SelectOptions
            label="Status *"
            options={EVENT_STATUSES}
            selectedValue={form.eventStatus}
            onSelect={(val) => onFormChange({ ...form, eventStatus: val as EventFormData['eventStatus'] })}
            colors={colors}
          />

          {/* Organizer Section */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionTitleRow}>
              <Ionicons name="business" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Organizer</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Name</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.organizerName}
                onChangeText={(text) => onFormChange({ ...form, organizerName: text })}
                placeholder="Organizer name"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Logo URL</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.organizerLogo}
                onChangeText={(text) => onFormChange({ ...form, organizerLogo: text })}
                placeholder="https://..."
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Location Section */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionTitleRow}>
              <Ionicons name="location" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Location</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Address</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.locationAddress}
                onChangeText={(text) => onFormChange({ ...form, locationAddress: text })}
                placeholder="Street address"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>City *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.locationCity}
                onChangeText={(text) => onFormChange({ ...form, locationCity: text })}
                placeholder="City name"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          {/* Date & Time Section */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionTitleRow}>
              <Ionicons name="calendar" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Date & Time</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Event Date *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.eventDate}
                onChangeText={(text) => onFormChange({ ...form, eventDate: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Start Time</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.eventTimeStart}
                  onChangeText={(text) => onFormChange({ ...form, eventTimeStart: text })}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>End Time</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.eventTimeEnd}
                  onChangeText={(text) => onFormChange({ ...form, eventTimeEnd: text })}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>
          </View>

          {/* Rewards Section */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionTitleRow}>
              <Ionicons name="gift" size={18} color={colors.warning} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Rewards</Text>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>{BRAND.COIN_NAME}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.rewardsRezCoins !== undefined ? String(form.rewardsRezCoins) : ''}
                  onChangeText={(text) => onFormChange({ ...form, rewardsRezCoins: parseInt(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Brand Coins</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.rewardsBrandCoins !== undefined ? String(form.rewardsBrandCoins) : ''}
                  onChangeText={(text) => onFormChange({ ...form, rewardsBrandCoins: parseInt(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Capacity Goal *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={form.capacityGoal ? String(form.capacityGoal) : ''}
              onChangeText={(text) => onFormChange({ ...form, capacityGoal: parseInt(text) || 0 })}
              placeholder="e.g. 50"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
            />
          </View>

          {/* Impact Section */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionTitleRow}>
              <Ionicons name="trending-up" size={18} color={colors.success} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Impact</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.impactDescription}
                onChangeText={(text) => onFormChange({ ...form, impactDescription: text })}
                placeholder="Impact description"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Metric</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.impactMetric}
                  onChangeText={(text) => onFormChange({ ...form, impactMetric: text })}
                  placeholder="e.g. trees planted"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Target Value</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.impactTargetValue ? String(form.impactTargetValue) : ''}
                  onChangeText={(text) => onFormChange({ ...form, impactTargetValue: parseInt(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Contact Section */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionTitleRow}>
              <Ionicons name="call" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Contact</Text>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Phone</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.contactPhone}
                  onChangeText={(text) => onFormChange({ ...form, contactPhone: text })}
                  placeholder="+91..."
                  placeholderTextColor={colors.icon}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.contactEmail}
                  onChangeText={(text) => onFormChange({ ...form, contactEmail: text })}
                  placeholder="email@example.com"
                  placeholderTextColor={colors.icon}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>CSR Activity</Text>
            <View style={[styles.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.icon }]}>
                {form.isCsrActivity ? 'Yes - This is a CSR activity' : 'No'}
              </Text>
              <Switch
                value={form.isCsrActivity}
                onValueChange={(val) => onFormChange({ ...form, isCsrActivity: val })}
                trackColor={{ true: colors.tint }}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Featured</Text>
            <View style={[styles.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.icon }]}>
                {form.featured ? 'Yes - Show in featured section' : 'No'}
              </Text>
              <Switch
                value={form.featured}
                onValueChange={(val) => onFormChange({ ...form, featured: val })}
                trackColor={{ true: colors.tint }}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Image URL</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={form.image}
              onChangeText={(text) => onFormChange({ ...form, image: text })}
              placeholder="https://..."
              placeholderTextColor={colors.icon}
              autoCapitalize="none"
            />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseBtn: { padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  modalSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalSaveBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  formScroll: { flex: 1 },
  formContent: { padding: 16, paddingBottom: 40 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', marginBottom: 0 },
  formSection: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  formSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  formSectionTitle: { fontSize: 15, fontWeight: '600' },
  selectRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectChipText: { fontSize: 12, fontWeight: '600' },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchLabel: { fontSize: 14, fontWeight: '500' },
});
