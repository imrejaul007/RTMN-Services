/**
 * components/mall-admin/tabs/MallTabBar.tsx
 * ADM-005: Tab bar for Mall Management screen.
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

type TabType = 'dashboard' | 'stores' | 'listing-requests' | 'categories' | 'offers' | 'banners' | 'collections' | 'alliance';

interface Props {
  colors: typeof Colors.light;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function MallTabBar({ colors, activeTab, onTabChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
      {([
        { key: 'dashboard' as TabType, label: 'Dashboard', icon: 'grid' as const },
        { key: 'stores' as TabType, label: 'Stores', icon: 'business' as const },
        { key: 'listing-requests' as TabType, label: 'Requests', icon: 'document-text' as const },
        { key: 'categories' as TabType, label: 'Categories', icon: 'apps' as const },
        { key: 'offers' as TabType, label: 'Offers', icon: 'pricetag' as const },
        { key: 'banners' as TabType, label: 'Banners', icon: 'image' as const },
        { key: 'collections' as TabType, label: 'Collections', icon: 'albums' as const },
        { key: 'alliance' as TabType, label: 'Alliance', icon: 'people' as const },
      ] as const).map((tab) => (
        <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.tint }]} onPress={() => onTabChange(tab.key)}>
          <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? colors.card : colors.icon} />
          <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.card : colors.icon }]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabBar: { paddingVertical: 10, maxHeight: 54 },
  tabBarContent: { paddingHorizontal: 16, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  tabText: { fontSize: 12, fontWeight: '600' },
});
