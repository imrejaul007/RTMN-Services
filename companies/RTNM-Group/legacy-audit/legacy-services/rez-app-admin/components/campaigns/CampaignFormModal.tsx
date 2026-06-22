import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Switch,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Campaign, CampaignDeal } from '../../services';

const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;

const CAMPAIGN_TYPES: { value: Campaign['type']; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'coins', label: 'Coins' },
  { value: 'bank', label: 'Bank Offer' },
  { value: 'bill', label: 'Bill Upload' },
  { value: 'drop', label: 'Coin Drop' },
  { value: 'new-user', label: 'New User' },
  { value: 'flash', label: 'Flash Sale' },
];

const REGIONS: { value: Campaign['region']; label: string }[] = [
  { value: 'all', label: 'All Regions' },
  { value: 'bangalore', label: 'India' },
  { value: 'dubai', label: 'Dubai' },
];

const EXCLUSIVE_PROGRAMS: {
  value: NonNullable<Campaign['exclusiveToProgramSlug']> | '';
  label: string;
}[] = [
  { value: '', label: 'None' },
  { value: 'student_zone', label: 'Student Zone' },
  { value: 'corporate_perks', label: 'Corporate Perks' },
  { value: 'rez_prive', label: 'Prive' },
];

const TARGET_SEGMENTS: { value: NonNullable<Campaign['targetSegment']>; label: string }[] = [
  { value: 'all', label: 'All Users' },
  { value: 'new_users', label: 'New Users' },
  { value: 'lapsed_users', label: 'Lapsed' },
  { value: 'high_value', label: 'High Value' },
];

const DEFAULT_GRADIENT_COLORS = ['#FF6B6B', '#FF8E53'];

interface Props {
  visible: boolean;
  editingCampaign: Campaign | null;
  formData: Partial<Campaign>;
  onFormDataChange: (data: Partial<Campaign>) => void;
  showStartDatePicker: boolean;
  setShowStartDatePicker: (v: boolean) => void;
  showStartTimePicker: boolean;
  setShowStartTimePicker: (v: boolean) => void;
  showEndDatePicker: boolean;
  setShowEndDatePicker: (v: boolean) => void;
  showEndTimePicker: boolean;
  setShowEndTimePicker: (v: boolean) => void;
  isUploading: boolean;
  uploadingField: string | null;
  isSaving: boolean;
  colors: any;
  onPickAndUploadImage: (field: 'bannerImage' | 'icon' | 'dealImage', imageType: 'banner' | 'icon' | 'deal') => Promise<void>;
  onSave: () => Promise<void>;
  onClose: () => void;
  // Deal-related handlers
  onAddDeal: () => void;
  onEditDeal: (deal: CampaignDeal, index: number) => void;
  onRemoveDeal: (index: number) => void;
  // Date picker handlers
  handleStartDateChange: (event: any, selectedDate?: Date) => void;
  handleStartTimeChange: (event: any, selectedTime?: Date) => void;
  handleEndDateChange: (event: any, selectedDate?: Date) => void;
  handleEndTimeChange: (event: any, selectedTime?: Date) => void;
}

export default function CampaignFormModal({
  visible,
  editingCampaign,
  formData,
  onFormDataChange,
  showStartDatePicker,
  setShowStartDatePicker,
  showStartTimePicker,
  setShowStartTimePicker,
  showEndDatePicker,
  setShowEndDatePicker,
  showEndTimePicker,
  setShowEndTimePicker,
  isUploading,
  uploadingField,
  isSaving,
  colors,
  onPickAndUploadImage,
  onSave,
  onClose,
  onAddDeal,
  onEditDeal,
  onRemoveDeal,
  handleStartDateChange,
  handleStartTimeChange,
  handleEndDateChange,
  handleEndTimeChange,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
          </Text>
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
          {!editingCampaign && (
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Campaign ID *</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={formData.campaignId || ''}
                onChangeText={(text: string) =>
                  onFormDataChange({
                    ...formData,
                    campaignId: text.toLowerCase().replace(/\s+/g, '-'),
                  })
                }
                placeholder="e.g., summer-sale-2024"
                placeholderTextColor={colors.icon}
              />
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.title || ''}
              onChangeText={(text: string) => onFormDataChange({ ...formData, title: text })}
              placeholder="Campaign title"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Subtitle *</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.subtitle || ''}
              onChangeText={(text: string) => onFormDataChange({ ...formData, subtitle: text })}
              placeholder="Campaign subtitle"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Badge Text *</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.badge || ''}
              onChangeText={(text: string) => onFormDataChange({ ...formData, badge: text })}
              placeholder="e.g., 50% OFF"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[
                styles.formInput,
                styles.textArea,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              value={formData.description || ''}
              onChangeText={(text: string) => onFormDataChange({ ...formData, description: text })}
              placeholder="Campaign description"
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Date Range Section */}
          <View style={[styles.dateRangeSection, { borderColor: colors.border }]}>
            <View style={styles.dateRangeTitleRow}>
              <Ionicons name="calendar" size={18} color={colors.tint} />
              <Text style={[styles.dateRangeTitle, { color: colors.text }]}>Campaign Duration</Text>
            </View>

            {/* Start Date/Time */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Start Date & Time *</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[
                    styles.datePickerBtn,
                    { backgroundColor: colors.card, borderColor: colors.border, flex: 1.2 },
                  ]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.tint} />
                  <Text style={[styles.datePickerText, { color: colors.text }]}>
                    {formData.startTime
                      ? format(new Date(formData.startTime), 'MMM dd, yyyy')
                      : 'Select date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.datePickerBtn,
                    { backgroundColor: colors.card, borderColor: colors.border, flex: 0.8 },
                  ]}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={colors.tint} />
                  <Text style={[styles.datePickerText, { color: colors.text }]}>
                    {formData.startTime
                      ? format(new Date(formData.startTime), 'hh:mm a')
                      : 'Select time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* End Date/Time */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>End Date & Time *</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[
                    styles.datePickerBtn,
                    { backgroundColor: colors.card, borderColor: colors.border, flex: 1.2 },
                  ]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.tint} />
                  <Text style={[styles.datePickerText, { color: colors.text }]}>
                    {formData.endTime
                      ? format(new Date(formData.endTime), 'MMM dd, yyyy')
                      : 'Select date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.datePickerBtn,
                    { backgroundColor: colors.card, borderColor: colors.border, flex: 0.8 },
                  ]}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={colors.tint} />
                  <Text style={[styles.datePickerText, { color: colors.text }]}>
                    {formData.endTime
                      ? format(new Date(formData.endTime), 'hh:mm a')
                      : 'Select time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Duration hint */}
            {formData.startTime && formData.endTime && (
              <View style={[styles.durationHint, { backgroundColor: `${colors.tint}15` }]}>
                <Ionicons name="information-circle" size={16} color={colors.tint} />
                <Text style={[styles.durationHintText, { color: colors.tint }]}>
                  {(() => {
                    const start = new Date(formData.startTime);
                    const end = new Date(formData.endTime);
                    const diffMs = end.getTime() - start.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) return 'End date must be after start date';
                    if (diffDays === 0) return 'Campaign runs for less than a day';
                    if (diffDays === 1) return 'Campaign runs for 1 day';
                    return `Campaign runs for ${diffDays} days`;
                  })()}
                </Text>
              </View>
            )}
          </View>

          {/* Date Pickers - Web compatible - Inline inputs */}
          {Platform.OS === 'web' &&
            (showStartDatePicker ||
              showStartTimePicker ||
              showEndDatePicker ||
              showEndTimePicker) && (
              <View
                style={[
                  styles.webInlineDatePicker,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.webDatePickerHeader}>
                  <Ionicons name="calendar" size={20} color={colors.tint} />
                  <Text style={[styles.webDatePickerHeaderText, { color: colors.text }]}>
                    {showStartDatePicker
                      ? 'Start Date'
                      : showStartTimePicker
                        ? 'Start Time'
                        : showEndDatePicker
                          ? 'End Date'
                          : 'End Time'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowStartDatePicker(false);
                      setShowStartTimePicker(false);
                      setShowEndDatePicker(false);
                      setShowEndTimePicker(false);
                    }}
                    style={styles.webDatePickerClose}
                  >
                    <Ionicons name="close" size={20} color={colors.icon} />
                  </TouchableOpacity>
                </View>

                {showStartDatePicker && (
                  <input
                    type="date"
                    value={
                      formData.startTime
                        ? new Date(formData.startTime).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e: any) => {
                      const selectedDate = new Date(e.target.value);
                      const currentDate = formData.startTime
                        ? new Date(formData.startTime)
                        : new Date();
                      selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                      onFormDataChange({ ...formData, startTime: selectedDate.toISOString() });
                      setShowStartDatePicker(false);
                    }}
                    style={{
                      padding: 14,
                      fontSize: 16,
                      borderRadius: 10,
                      border: `2px solid ${colors.tint}`,
                      width: '100%',
                      outline: 'none',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  />
                )}
                {showStartTimePicker && (
                  <input
                    type="time"
                    value={formData.startTime ? format(new Date(formData.startTime), 'HH:mm') : ''}
                    onChange={(e: any) => {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const currentDate = formData.startTime
                        ? new Date(formData.startTime)
                        : new Date();
                      currentDate.setHours(hours, minutes);
                      onFormDataChange({ ...formData, startTime: currentDate.toISOString() });
                      setShowStartTimePicker(false);
                    }}
                    style={{
                      padding: 14,
                      fontSize: 16,
                      borderRadius: 10,
                      border: `2px solid ${colors.tint}`,
                      width: '100%',
                      outline: 'none',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  />
                )}
                {showEndDatePicker && (
                  <input
                    type="date"
                    value={
                      formData.endTime ? new Date(formData.endTime).toISOString().split('T')[0] : ''
                    }
                    onChange={(e: any) => {
                      const selectedDate = new Date(e.target.value);
                      const currentDate = formData.endTime
                        ? new Date(formData.endTime)
                        : new Date();
                      selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                      onFormDataChange({ ...formData, endTime: selectedDate.toISOString() });
                      setShowEndDatePicker(false);
                    }}
                    style={{
                      padding: 14,
                      fontSize: 16,
                      borderRadius: 10,
                      border: `2px solid ${colors.tint}`,
                      width: '100%',
                      outline: 'none',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  />
                )}
                {showEndTimePicker && (
                  <input
                    type="time"
                    value={formData.endTime ? format(new Date(formData.endTime), 'HH:mm') : ''}
                    onChange={(e: any) => {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const currentDate = formData.endTime
                        ? new Date(formData.endTime)
                        : new Date();
                      currentDate.setHours(hours, minutes);
                      onFormDataChange({ ...formData, endTime: currentDate.toISOString() });
                      setShowEndTimePicker(false);
                    }}
                    style={{
                      padding: 14,
                      fontSize: 16,
                      borderRadius: 10,
                      border: `2px solid ${colors.tint}`,
                      width: '100%',
                      outline: 'none',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  />
                )}
              </View>
            )}

          {/* Native Date Pickers for iOS/Android */}
          {Platform.OS !== 'web' && (
            <>
              {showStartDatePicker && DateTimePicker && (
                <DateTimePicker
                  value={formData.startTime ? new Date(formData.startTime) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                />
              )}
              {showStartTimePicker && DateTimePicker && (
                <DateTimePicker
                  value={formData.startTime ? new Date(formData.startTime) : new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartTimeChange}
                />
              )}
              {showEndDatePicker && DateTimePicker && (
                <DateTimePicker
                  value={formData.endTime ? new Date(formData.endTime) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                />
              )}
              {showEndTimePicker && DateTimePicker && (
                <DateTimePicker
                  value={formData.endTime ? new Date(formData.endTime) : new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndTimeChange}
                />
              )}
            </>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CAMPAIGN_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.chipOption,
                    { borderColor: colors.border },
                    formData.type === type.value && {
                      backgroundColor: colors.tint,
                      borderColor: colors.tint,
                    },
                  ]}
                  onPress={() => onFormDataChange({ ...formData, type: type.value })}
                >
                  <Text
                    style={[
                      styles.chipOptionText,
                      { color: formData.type === type.value ? colors.card : colors.text },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Region</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {REGIONS.map((region) => (
                <TouchableOpacity
                  key={region.value}
                  style={[
                    styles.chipOption,
                    { borderColor: colors.border },
                    formData.region === region.value && {
                      backgroundColor: colors.tint,
                      borderColor: colors.tint,
                    },
                  ]}
                  onPress={() => onFormDataChange({ ...formData, region: region.value })}
                >
                  <Text
                    style={[
                      styles.chipOptionText,
                      { color: formData.region === region.value ? colors.card : colors.text },
                    ]}
                  >
                    {region.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Exclusive Program</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {EXCLUSIVE_PROGRAMS.map((prog) => (
                <TouchableOpacity
                  key={prog.value}
                  style={[
                    styles.chipOption,
                    { borderColor: colors.border },
                    (formData.exclusiveToProgramSlug || '') === prog.value && {
                      backgroundColor: colors.tint,
                      borderColor: colors.tint,
                    },
                  ]}
                  onPress={() =>
                    onFormDataChange({
                      ...formData,
                      exclusiveToProgramSlug: (prog.value || undefined) as Campaign['exclusiveToProgramSlug'],
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipOptionText,
                      {
                        color:
                          (formData.exclusiveToProgramSlug || '') === prog.value
                            ? colors.card
                            : colors.text,
                      },
                    ]}
                  >
                    {prog.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Target Segment</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {TARGET_SEGMENTS.map((seg) => (
                <TouchableOpacity
                  key={seg.value}
                  style={[
                    styles.chipOption,
                    { borderColor: colors.border },
                    (formData.targetSegment || 'all') === seg.value && {
                      backgroundColor: colors.tint,
                      borderColor: colors.tint,
                    },
                  ]}
                  onPress={() =>
                    onFormDataChange({
                      ...formData,
                      targetSegment: seg.value as Campaign['targetSegment'],
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipOptionText,
                      {
                        color:
                          (formData.targetSegment || 'all') === seg.value
                            ? colors.card
                            : colors.text,
                      },
                    ]}
                  >
                    {seg.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Priority (0-100)</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={String(formData.priority || 50)}
                onChangeText={(text: string) =>
                  onFormDataChange({ ...formData, priority: parseInt(text) || 50 })
                }
                keyboardType="numeric"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
              <View
                style={[
                  styles.switchBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.switchLabel, { color: colors.icon }]}>
                  {formData.isActive !== false ? 'Yes' : 'No'}
                </Text>
                <Switch
                  value={formData.isActive !== false}
                  onValueChange={(val: boolean) => onFormDataChange({ ...formData, isActive: val })}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Badge BG</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={formData.badgeBg || colors.card}
                onChangeText={(text: string) => onFormDataChange({ ...formData, badgeBg: text })}
                placeholder={colors.card}
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Badge Color</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={formData.badgeColor || colors.navyDark}
                onChangeText={(text: string) => onFormDataChange({ ...formData, badgeColor: text })}
                placeholder={colors.navyDark}
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Gradient Start</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={(formData.gradientColors || DEFAULT_GRADIENT_COLORS)[0] || '#FF6B6B'}
                onChangeText={(text: string) => {
                  const current = formData.gradientColors || [...DEFAULT_GRADIENT_COLORS];
                  onFormDataChange({ ...formData, gradientColors: [text, current[1] || '#FF8E53'] });
                }}
                placeholder="#FF6B6B"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Gradient End</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={(formData.gradientColors || DEFAULT_GRADIENT_COLORS)[1] || '#FF8E53'}
                onChangeText={(text: string) => {
                  const current = formData.gradientColors || [...DEFAULT_GRADIENT_COLORS];
                  onFormDataChange({ ...formData, gradientColors: [current[0] || '#FF6B6B', text] });
                }}
                placeholder="#FF8E53"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          {/* Campaign Images Section */}
          <View style={[styles.imagesSection, { borderColor: colors.border }]}>
            <View style={styles.imagesSectionHeader}>
              <Ionicons name="images" size={18} color={colors.tint} />
              <Text style={[styles.imagesSectionTitle, { color: colors.text }]}>
                Campaign Images
              </Text>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelWithUpload}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>
                  Banner Image
                </Text>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.tint }]}
                  onPress={() => onPickAndUploadImage('bannerImage', 'banner')}
                  disabled={isUploading}
                >
                  {isUploading && uploadingField === 'bannerImage' ? (
                    <ActivityIndicator size="small" color={colors.card} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={14} color={colors.card} />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {formData.bannerImage ? (
                <View style={styles.campaignImagePreview}>
                  <Image
                    source={{ uri: formData.bannerImage }}
                    style={styles.bannerPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => onFormDataChange({ ...formData, bannerImage: '' })}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={formData.bannerImage || ''}
                onChangeText={(text: string) => onFormDataChange({ ...formData, bannerImage: text })}
                placeholder="https://... or upload above"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelWithUpload}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>
                  Icon Image
                </Text>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.tint }]}
                  onPress={() => onPickAndUploadImage('icon', 'icon')}
                  disabled={isUploading}
                >
                  {isUploading && uploadingField === 'icon' ? (
                    <ActivityIndicator size="small" color={colors.card} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={14} color={colors.card} />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {formData.icon ? (
                <View style={styles.campaignImagePreview}>
                  <Image
                    source={{ uri: formData.icon }}
                    style={styles.iconPreview}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => onFormDataChange({ ...formData, icon: '' })}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={formData.icon || ''}
                onChangeText={(text: string) => onFormDataChange({ ...formData, icon: text })}
                placeholder="https://... or upload above"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          {/* Offer Details Section */}
          <View style={[styles.offerDetailsSection, { borderColor: colors.border }]}>
            <View style={styles.offerDetailsTitleRow}>
              <Ionicons name="gift" size={18} color={colors.tint} />
              <Text style={[styles.offerDetailsTitle, { color: colors.text }]}>Offer Details</Text>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Min Order Value</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={formData.minOrderValue ? String(formData.minOrderValue) : ''}
                  onChangeText={(text: string) =>
                    onFormDataChange({
                      ...formData,
                      minOrderValue: text ? parseInt(text) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="e.g., 500"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Max Benefit</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={formData.maxBenefit ? String(formData.maxBenefit) : ''}
                  onChangeText={(text: string) =>
                    onFormDataChange({
                      ...formData,
                      maxBenefit: text ? parseInt(text) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="e.g., 200"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Eligible Categories (comma separated)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={(formData.eligibleCategories || []).join(', ')}
                onChangeText={(text: string) =>
                  onFormDataChange({
                    ...formData,
                    eligibleCategories: text
                      ? text
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [],
                  })
                }
                placeholder="e.g., Food, Fashion, Electronics"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Terms & Conditions (one per line)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.multilineInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={(formData.terms || []).join('\n')}
                onChangeText={(text: string) =>
                  onFormDataChange({
                    ...formData,
                    terms: text ? text.split('\n').filter(Boolean) : [],
                  })
                }
                placeholder="Enter each term on a new line..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Deals Section */}
          {editingCampaign && (
            <View style={[styles.dealsSection, { borderTopColor: colors.border }]}>
              <View style={styles.dealsSectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Deals ({formData.deals?.length || 0})
                </Text>
                <TouchableOpacity
                  style={[styles.addDealBtn, { backgroundColor: colors.tint }]}
                  onPress={onAddDeal}
                >
                  <Ionicons name="add" size={18} color={colors.card} />
                  <Text style={styles.addDealBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {formData.deals?.map((deal, index) => (
                <View
                  key={index}
                  style={[
                    styles.dealItem,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {deal.image ? (
                    <Image
                      source={{ uri: deal.image }}
                      style={styles.dealItemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[styles.dealItemImagePlaceholder, { backgroundColor: colors.border }]}
                    >
                      <Ionicons name="image-outline" size={20} color={colors.icon} />
                    </View>
                  )}

                  <View style={styles.dealItemInfo}>
                    <Text style={[styles.dealItemStore, { color: colors.text }]} numberOfLines={1}>
                      {deal.store || 'No store name'}
                    </Text>
                    <View style={styles.dealItemBenefits}>
                      {deal.cashback && (
                        <Text style={styles.dealItemBenefit}>CB: {deal.cashback}</Text>
                      )}
                      {deal.coins && (
                        <Text style={styles.dealItemBenefit}>Coins: {deal.coins}</Text>
                      )}
                      {deal.discount && (
                        <Text style={styles.dealItemBenefit}>Disc: {deal.discount}</Text>
                      )}
                      {deal.bonus && (
                        <Text style={styles.dealItemBenefit}>Bonus: {deal.bonus}</Text>
                      )}
                      {deal.drop && <Text style={styles.dealItemBenefit}>Drop: {deal.drop}</Text>}
                    </View>
                    {deal.endsIn && (
                      <Text style={[styles.dealEndsIn, { color: colors.icon }]}>
                        Ends: {deal.endsIn}
                      </Text>
                    )}
                    {deal.storeId ? (
                      <View style={styles.dealLinkedStore}>
                        <Ionicons name="link" size={10} color={colors.success} />
                        <Text style={styles.dealLinkedStoreText}>Store linked</Text>
                      </View>
                    ) : (
                      <View style={styles.dealUnlinkedStore}>
                        <Ionicons name="warning" size={10} color={colors.warning} />
                        <Text style={styles.dealUnlinkedStoreText}>No store linked</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.dealItemActions}>
                    <TouchableOpacity
                      style={[styles.dealActionBtn, { backgroundColor: `${colors.info}15` }]}
                      onPress={() => onEditDeal(deal, index)}
                    >
                      <Ionicons name="pencil" size={16} color={colors.info} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dealActionBtn, { backgroundColor: `${colors.error}15` }]}
                      onPress={() => onRemoveDeal(index)}
                    >
                      <Ionicons name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
  },
  dateRangeSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  dateRangeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dateRangeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  durationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  durationHintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipScroll: {
    marginTop: 4,
  },
  chipOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  chipOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  switchLabel: {
    fontSize: 14,
  },
  dealsSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  dealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  addDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addDealBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  dealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  dealItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  dealItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealItemInfo: {
    flex: 1,
  },
  dealItemStore: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  dealItemBenefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dealItemBenefit: {
    fontSize: 10,
    color: '#8E8E93',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealEndsIn: {
    fontSize: 10,
    marginTop: 4,
  },
  dealItemActions: {
    flexDirection: 'column',
    gap: 6,
  },
  dealActionBtn: {
    padding: 8,
    borderRadius: 6,
  },
  removeDealBtn: {
    padding: 4,
  },
  offerDetailsSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  offerDetailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  offerDetailsTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  imagesSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  imagesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  imagesSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelWithUpload: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  campaignImagePreview: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerPreview: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  iconPreview: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  webInlineDatePicker: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  webDatePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  webDatePickerHeaderText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  webDatePickerClose: {
    padding: 4,
  },
  dealLinkedStore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dealLinkedStoreText: {
    fontSize: 9,
    color: '#34C759',
    fontWeight: '500',
  },
  dealUnlinkedStore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dealUnlinkedStoreText: {
    fontSize: 9,
    color: '#FF9500',
    fontWeight: '500',
  },
});
