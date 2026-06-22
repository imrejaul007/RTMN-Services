import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface AchievementCardProps {
  item: any;
  colors: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onToggle: (item: any) => void;
}

export function AchievementCard({ item, colors, onEdit, onDelete, onToggle }: AchievementCardProps) {
  return (
    <View style={{ padding: 16, backgroundColor: colors.card, marginBottom: 12, borderRadius: 12 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.title}</Text>
      <Text style={{ color: colors.icon, fontSize: 13, marginTop: 4 }}>{item.description}</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <TouchableOpacity onPress={() => onEdit(item)}><Text style={{ color: colors.tint }}>Edit</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item)}><Text style={{ color: colors.error }}>Delete</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onToggle(item)}><Text style={{ color: colors.success }}>{item.isActive ? 'Deactivate' : 'Activate'}</Text></TouchableOpacity>
      </View>
    </View>
  );
}
