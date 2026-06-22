import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';

export interface AchievementModalProps {
  visible: boolean;
  editingAchievement: any;
  form: any;
  setForm: (form: any) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AchievementModal({ visible, editingAchievement, form, setForm, isSaving, onClose, onSave }: AchievementModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>{editingAchievement ? 'Edit' : 'Create'} Achievement</Text>
          <TouchableOpacity onPress={onSave} disabled={isSaving}><Text>{isSaving ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 16 }}>
          <TextInput placeholder="Title" value={form?.title || ''} onChangeText={(t) => setForm({ ...form, title: t })} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 }} />
          <TextInput placeholder="Description" value={form?.description || ''} onChangeText={(t) => setForm({ ...form, description: t })} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }} multiline />
        </ScrollView>
      </View>
    </Modal>
  );
}
