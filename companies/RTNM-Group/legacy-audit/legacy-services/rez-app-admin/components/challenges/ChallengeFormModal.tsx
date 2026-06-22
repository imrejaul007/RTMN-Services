/**
 * ChallengeFormModal — standalone form modal for creating/editing challenges.
 * Extracted from challenges.tsx to keep the main screen under 500 lines.
 */
import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import type { ChallengeStatus, ChallengeVisibility, ChallengeTemplate } from '../../services/api/challenges';

const TYPE_COLORS: Record<string, string> = {
  daily: Colors.light.info, weekly: Colors.light.purple,
  monthly: Colors.light.warning, special: Colors.light.error,
};
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: Colors.light.success, medium: Colors.light.warning, hard: Colors.light.error,
};
const STATUS_COLORS: Record<string, string> = {
  draft: Colors.light.slateMedium, scheduled: Colors.light.info, active: Colors.light.success,
  paused: Colors.light.warning, completed: Colors.light.indigo,
  expired: Colors.light.error, disabled: Colors.light.mutedDark,
};
const VISIBILITY_COLORS: Record<string, string> = {
  play_and_earn: Colors.light.purple, missions: Colors.light.info, both: Colors.light.success,
};

const CHALLENGE_TYPES = ['daily', 'weekly', 'monthly', 'special'] as const;
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
const CHALLENGE_STATUSES: ChallengeStatus[] = ['draft', 'scheduled', 'active', 'paused', 'completed', 'expired', 'disabled'];
const VISIBILITY_OPTIONS: ChallengeVisibility[] = ['play_and_earn', 'missions', 'both'];
const ACTION_OPTIONS = [
  'visit_stores', 'upload_bills', 'refer_friends', 'spend_amount', 'order_count',
  'review_count', 'login_streak', 'share_deals', 'explore_categories', 'add_favorites',
] as const;

interface ChallengeFormData {
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  title: string; description: string; icon: string; action: string;
  target: number; coins: number; difficulty: 'easy' | 'medium' | 'hard';
  startDate: string; endDate: string; featured: boolean; active: boolean;
  status: ChallengeStatus; visibility: ChallengeVisibility; priority: number;
  scheduledPublishAt?: string; maxParticipants?: number;
}

interface Props {
  visible: boolean;
  isEditing: boolean;
  isSaving: boolean;
  form: ChallengeFormData;
  onClose: () => void;
  onSave: () => void;
  onChange: (updated: ChallengeFormData) => void;
}

function ChipSelector({ label, options, selected, onSelect, colorMap }: {
  label: string; options: readonly string[]; selected: string; onSelect: (v: string) => void; colorMap?: Record<string, string>;
}) {
  const colors = Colors.light;
  return (
    <View style={s.formGroup}>
      <Text style={[s.formLabel, { color: colors.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.selectRow}>
          {options.map((opt) => {
            const isActive = selected === opt;
            const optColor = colorMap?.[opt] || colors.tint;
            return (
              <TouchableOpacity
                key={opt}
                style={[s.selectChip, { backgroundColor: isActive ? `${optColor}20` : colors.background, borderColor: isActive ? optColor : colors.border }]}
                onPress={() => onSelect(opt)}
              >
                <Text style={[s.selectChipText, { color: isActive ? optColor : colors.icon }]}>
                  {opt.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function ChallengeFormModal({ visible, isEditing, isSaving, form, onClose, onSave, onChange }: Props) {
  const colors = Colors.light;
  const set = (patch: Partial<ChallengeFormData>) => onChange({ ...form, ...patch });

  const durationHint = (() => {
    if (!form.startDate || !form.endDate) return null;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'End date must be after start date';
    if (diffDays === 0) return 'Runs for less than a day';
    if (diffDays === 1) return 'Runs for 1 day';
    return `Runs for ${diffDays} days`;
  })();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>{isEditing ? 'Edit Challenge' : 'New Challenge'}</Text>
          <TouchableOpacity onPress={onSave} disabled={isSaving} style={[s.modalSaveBtn, { backgroundColor: colors.tint }]}>
            {isSaving ? <ActivityIndicator size="small" color={colors.card} /> : <Text style={s.modalSaveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={s.formScroll} contentContainerStyle={s.formContent} showsVerticalScrollIndicator={false}>
          <ChipSelector label="Type *" options={CHALLENGE_TYPES} selected={form.type} onSelect={(v) => set({ type: v as any })} colorMap={TYPE_COLORS} />

          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Title *</Text>
            <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.title} onChangeText={(t) => set({ title: t })} placeholder="Challenge title" placeholderTextColor={colors.icon} />
          </View>

          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Description *</Text>
            <TextInput style={[s.formInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.description} onChangeText={(t) => set({ description: t })} placeholder="Challenge description" placeholderTextColor={colors.icon} multiline numberOfLines={3} />
          </View>

          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Icon *</Text>
            <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.icon} onChangeText={(t) => set({ icon: t })} placeholder="Emoji icon (e.g. 💰)" placeholderTextColor={colors.icon} />
          </View>

          <ChipSelector label="Action *" options={ACTION_OPTIONS} selected={form.action} onSelect={(v) => set({ action: v })} />

          <View style={s.formRow}>
            <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[s.formLabel, { color: colors.text }]}>Target *</Text>
              <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.target ? String(form.target) : ''} onChangeText={(t) => set({ target: parseInt(t) || 0 })} placeholder="e.g. 3" placeholderTextColor={colors.icon} keyboardType="numeric" />
            </View>
            <View style={[s.formGroup, { flex: 1 }]}>
              <Text style={[s.formLabel, { color: colors.text }]}>Coins Reward *</Text>
              <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.coins !== undefined ? String(form.coins) : ''} onChangeText={(t) => set({ coins: parseInt(t) || 0 })} placeholder="e.g. 100" placeholderTextColor={colors.icon} keyboardType="numeric" />
            </View>
          </View>

          <ChipSelector label="Difficulty *" options={DIFFICULTY_LEVELS} selected={form.difficulty} onSelect={(v) => set({ difficulty: v as any })} colorMap={DIFFICULTY_COLORS} />

          <View style={[s.dateRangeSection, { borderColor: colors.border }]}>
            <View style={s.dateRangeTitleRow}>
              <Ionicons name="calendar" size={18} color={colors.tint} />
              <Text style={[s.dateRangeTitle, { color: colors.text }]}>Duration</Text>
            </View>
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Start Date *</Text>
              <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.startDate ? format(new Date(form.startDate), 'yyyy-MM-dd HH:mm') : ''} onChangeText={(t) => { const d = new Date(t.replace(' ', 'T')); if (!isNaN(d.getTime())) set({ startDate: d.toISOString() }); }} placeholder="YYYY-MM-DD HH:mm" placeholderTextColor={colors.icon} />
            </View>
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>End Date *</Text>
              <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.endDate ? format(new Date(form.endDate), 'yyyy-MM-dd HH:mm') : ''} onChangeText={(t) => { const d = new Date(t.replace(' ', 'T')); if (!isNaN(d.getTime())) set({ endDate: d.toISOString() }); }} placeholder="YYYY-MM-DD HH:mm" placeholderTextColor={colors.icon} />
            </View>
            {durationHint && (
              <View style={[s.durationHint, { backgroundColor: `${colors.tint}15` }]}>
                <Ionicons name="information-circle" size={16} color={colors.tint} />
                <Text style={[s.durationHintText, { color: colors.tint }]}>{durationHint}</Text>
              </View>
            )}
          </View>

          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Max Participants (optional)</Text>
            <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.maxParticipants ? String(form.maxParticipants) : ''} onChangeText={(t) => set({ maxParticipants: t ? parseInt(t) : undefined })} placeholder="Leave empty for unlimited" placeholderTextColor={colors.icon} keyboardType="numeric" />
          </View>

          <ChipSelector label="Status *" options={CHALLENGE_STATUSES as unknown as readonly string[]} selected={form.status} onSelect={(v) => set({ status: v as ChallengeStatus })} colorMap={STATUS_COLORS} />

          {form.status === 'scheduled' && (
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Scheduled Publish At *</Text>
              <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={form.scheduledPublishAt ? format(new Date(form.scheduledPublishAt), 'yyyy-MM-dd HH:mm') : ''} onChangeText={(t) => { const d = new Date(t.replace(' ', 'T')); if (!isNaN(d.getTime())) set({ scheduledPublishAt: d.toISOString() }); }} placeholder="YYYY-MM-DD HH:mm" placeholderTextColor={colors.icon} />
            </View>
          )}

          <ChipSelector label="Visibility *" options={VISIBILITY_OPTIONS as unknown as readonly string[]} selected={form.visibility} onSelect={(v) => set({ visibility: v as ChallengeVisibility })} colorMap={VISIBILITY_COLORS} />

          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Priority (0-100)</Text>
            <TextInput style={[s.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={String(form.priority ?? 0)} onChangeText={(t) => { const v = parseInt(t) || 0; set({ priority: Math.max(0, Math.min(100, v)) }); }} placeholder="0" placeholderTextColor={colors.icon} keyboardType="numeric" />
            <Text style={[s.formHint, { color: colors.icon }]}>Higher priority challenges appear first. 0 = default.</Text>
          </View>

          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Featured</Text>
            <View style={[s.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[s.switchLabel, { color: colors.icon }]}>{form.featured ? 'Yes' : 'No'}</Text>
              <Switch value={form.featured} onValueChange={(v) => set({ featured: v })} trackColor={{ true: colors.tint }} />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  modalCloseBtn: { padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  modalSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalSaveBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },
  formScroll: { flex: 1 },
  formContent: { padding: 16, paddingBottom: 40 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  formRow: { flexDirection: 'row', marginBottom: 0 },
  selectRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  selectChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  selectChipText: { fontSize: 12, fontWeight: '600' },
  dateRangeSection: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  dateRangeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dateRangeTitle: { fontSize: 15, fontWeight: '600' },
  durationHint: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, gap: 8 },
  durationHintText: { fontSize: 13, fontWeight: '500' },
  formHint: { fontSize: 11, marginTop: 4 },
  switchBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  switchLabel: { fontSize: 14, fontWeight: '500' },
});

const styles = StyleSheet.create({
  textArea: { minHeight: 80, textAlignVertical: 'top' },
});
