import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { healthToDot } from './helpers';

export const NAVY = '#1a3a52';

export function StatusDot({ status }: { status: 'green' | 'amber' | 'red' | 'gray' }) {
  const colorMap = { green: '#10B981', amber: '#F59E0B', red: '#EF4444', gray: '#9CA3AF' };
  return <View style={[s.dot, { backgroundColor: colorMap[status] }]} />;
}

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  icon,
  title,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={18} color={NAVY} />
      <Text style={s.sectionTitle}>{title}</Text>
      {badge}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function KPICard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={s.kpiCard}>
      <View style={[s.kpiIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

export function InfoRow({
  label,
  value,
  dot,
}: {
  label: string;
  value: string | number;
  dot?: 'green' | 'amber' | 'red' | 'gray';
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoRowLeft}>
        {dot && <StatusDot status={dot} />}
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: NAVY },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: NAVY },
  kpiLabel: { fontSize: 11, color: '#64748B', textAlign: 'center' },
  kpiSub: { fontSize: 10, color: '#94A3B8' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '600', color: NAVY },
  subHeading: { fontSize: 12, fontWeight: '700', color: NAVY, marginTop: 8, marginBottom: 2 },
  sectionBody: { marginTop: 10, gap: 6 },
});
