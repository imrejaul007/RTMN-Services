import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  colors: any;
}

const FILTERS = [{ key: '', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }];

export function FilterBar({ activeFilter, onFilterChange, colors }: FilterBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.key}
          onPress={() => onFilterChange(f.key)}
          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: activeFilter === f.key ? colors.tint : 'transparent', borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ color: activeFilter === f.key ? '#fff' : colors.text, fontSize: 13, fontWeight: '500' }}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
