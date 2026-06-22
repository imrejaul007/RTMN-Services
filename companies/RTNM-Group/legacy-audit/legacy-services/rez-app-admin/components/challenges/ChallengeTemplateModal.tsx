/**
 * ChallengeTemplateModal — template selection modal for the Challenges screen.
 * Extracted from challenges.tsx to keep the main screen under 500 lines.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showConfirm } from '../../utils/alert';
import type { ChallengeTemplate } from '../../services/api/challenges';

const TYPE_COLORS: Record<string, string> = {
  daily: Colors.light.info, weekly: Colors.light.purple, monthly: Colors.light.warning, special: Colors.light.error,
};
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: Colors.light.success, medium: Colors.light.warning, hard: Colors.light.error,
};

interface Props {
  visible: boolean;
  templates: ChallengeTemplate[];
  onClose: () => void;
  onCreateFromTemplate: (index: number) => void;
}

export function ChallengeTemplateModal({ visible, templates, onClose, onCreateFromTemplate }: Props) {
  const colors = Colors.light;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>Challenge Templates</Text>
          <View style={{ width: 60 }} />
        </View>
        <FlatList
          data={templates}
          keyExtractor={(_, index) => `template-${index}`}
          contentContainerStyle={s.listContent}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[s.templateCard, { backgroundColor: colors.card }]}
              onPress={() => showConfirm('Create Challenge', `Create "${item.title}" challenge from this template?`, () => onCreateFromTemplate(index), 'Create')}
            >
              <View style={s.templateHeader}>
                <Text style={s.templateIcon}>{item.icon}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.templateTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[s.templateDescription, { color: colors.icon }]} numberOfLines={2}>{item.description}</Text>
                </View>
              </View>
              <View style={s.templateMeta}>
                <View style={[s.typeBadge, { backgroundColor: `${TYPE_COLORS[item.type]}15` }]}><Text style={[s.typeBadgeText, { color: TYPE_COLORS[item.type] }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text></View>
                <View style={[s.diffBadge, { backgroundColor: `${DIFFICULTY_COLORS[item.difficulty]}15` }]}><Text style={[s.diffBadgeText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>{item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}</Text></View>
                <View style={s.metaChip}><Ionicons name="logo-bitcoin" size={12} color={colors.warning} /><Text style={[s.metaText, { color: colors.warning, fontWeight: '700' }]}>{item.rewards.coins}</Text></View>
                {item.durationDays && <View style={s.metaChip}><Ionicons name="time-outline" size={12} color={colors.icon} /><Text style={[s.metaText, { color: colors.icon }]}>{item.durationDays}d</Text></View>}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="copy-outline" size={56} color={colors.icon} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No templates</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  modalCloseBtn: { padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  listContent: { padding: 16 },
  templateCard: { borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  templateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  templateIcon: { fontSize: 32 },
  templateTitle: { fontSize: 16, fontWeight: '700' },
  templateDescription: { fontSize: 13, marginTop: 2 },
  templateMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  diffBadgeText: { fontSize: 11, fontWeight: '700' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
});
