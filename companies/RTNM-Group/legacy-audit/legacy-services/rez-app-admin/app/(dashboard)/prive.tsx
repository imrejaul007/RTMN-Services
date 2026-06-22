/**
 * Prive Admin Page
 * 11-tab interface: Offers | Vouchers | Reputation | Analytics | Config | Habits | Smart Spend | Invites | Program | Missions | Concierge
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { s } from './styles/prive.styles';
import {
  OffersTab,
  VouchersTab,
  ReputationTab,
  AnalyticsTab,
  RedemptionConfigTab,
  HabitLoopsConfigTab,
  SmartSpendTab,
  InvitesTab,
  ProgramConfigTab,
  MissionsTab,
  ConciergeTab,
} from '@/components/prive';

type Tab =
  | 'offers'
  | 'vouchers'
  | 'reputation'
  | 'analytics'
  | 'config'
  | 'habits'
  | 'smart_spend'
  | 'invites'
  | 'program_config'
  | 'missions'
  | 'concierge';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'offers', label: 'Offers', icon: 'pricetag-outline' },
  { key: 'vouchers', label: 'Vouchers', icon: 'ticket-outline' },
  { key: 'reputation', label: 'Reputation', icon: 'shield-outline' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline' },
  { key: 'config', label: 'Config', icon: 'settings-outline' },
  { key: 'habits', label: 'Habits', icon: 'fitness-outline' },
  { key: 'smart_spend', label: 'Smart Spend', icon: 'storefront-outline' },
  { key: 'invites', label: 'Invites', icon: 'people-outline' },
  { key: 'program_config', label: 'Program', icon: 'options-outline' },
  { key: 'missions', label: 'Missions', icon: 'flag-outline' },
  { key: 'concierge', label: 'Concierge', icon: 'chatbubble-ellipses-outline' },
];

export default function PriveAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('offers');

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Prive Management</Text>
      </View>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={s.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as unknown as keyof typeof Ionicons.glyphMap}
              size={18}
              color={activeTab === tab.key ? colors.gold : colors.icon}
            />
            <Text
              style={[
                s.tabLabel,
                { color: activeTab === tab.key ? colors.gold : colors.secondaryText },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      {activeTab === 'offers' && <OffersTab colors={colors} />}
      {activeTab === 'vouchers' && <VouchersTab colors={colors} />}
      {activeTab === 'reputation' && <ReputationTab colors={colors} />}
      {activeTab === 'analytics' && <AnalyticsTab colors={colors} />}
      {activeTab === 'config' && <RedemptionConfigTab colors={colors} />}
      {activeTab === 'habits' && <HabitLoopsConfigTab colors={colors} />}
      {activeTab === 'smart_spend' && <SmartSpendTab colors={colors} />}
      {activeTab === 'invites' && <InvitesTab colors={colors} />}
      {activeTab === 'program_config' && <ProgramConfigTab colors={colors} />}
      {activeTab === 'missions' && <MissionsTab colors={colors} />}
      {activeTab === 'concierge' && <ConciergeTab colors={colors} />}
    </SafeAreaView>
  );
}

