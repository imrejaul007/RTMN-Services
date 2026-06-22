/**
 * components/mall-admin/tabs/DashboardTab.tsx
 * ADM-005: Mall Dashboard tab — stat cards and quick actions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MallStats } from '../../../services/api/mall';
import { Colors } from '../../../constants/Colors';

type ColorsType = typeof Colors.light;

interface Props {
  colors: ColorsType;
  onNavigate: (tab: string) => void;
}

function StatCard({ colors, label, value, icon, color }: { colors: ColorsType; label: string; value: string | number; icon: string; color: string }) {
  return (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.statIconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
      </View>
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.icon }]}>{label}</Text>
    </View>
  );
}

function QuickAction({ colors, label, icon, color, onPress }: { colors: ColorsType; label: string; icon: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}>
      <View style={[s.actionIconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={color} />
      </View>
      <Text style={[s.actionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function DashboardTab({ colors, onNavigate }: Props) {
  const stats: Partial<MallStats> = {};

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <Text style={[s.sectionTitle, { color: colors.text }]}>Overview</Text>
      <View style={s.cardGrid}>
        <StatCard colors={colors} label="Total Brands" value={stats.totalBrands ?? '—'} icon="pricetag" color="#6366f1" />
        <StatCard colors={colors} label="Active Brands" value={stats.activeBrands ?? '—'} icon="checkmark-circle" color="#22c55e" />
        <StatCard colors={colors} label="Active Offers" value={stats.activeOffers ?? '—'} icon="gift" color="#f59e0b" />
        <StatCard colors={colors} label="Mall Stores" value={stats.totalMallStores ?? '—'} icon="business" color="#3b82f6" />
      </View>
      <Text style={[s.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      <View style={s.cardGrid}>
        <QuickAction colors={colors} label="Add Category" icon="apps" color="#8b5cf6" onPress={() => onNavigate('categories')} />
        <QuickAction colors={colors} label="Create Offer" icon="pricetag" color="#f59e0b" onPress={() => onNavigate('offers')} />
        <QuickAction colors={colors} label="Add Banner" icon="image" color="#3b82f6" onPress={() => onNavigate('banners')} />
        <QuickAction colors={colors} label="Review Requests" icon="document-text" color="#06b6d4" onPress={() => onNavigate('listing-requests')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, marginTop: 16 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  statIconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  quickAction: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  actionIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600' },
});
