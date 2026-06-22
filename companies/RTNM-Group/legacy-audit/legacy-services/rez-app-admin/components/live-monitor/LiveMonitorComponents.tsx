/**
 * LiveMonitorComponents — shared sub-components for the Live Monitor screen.
 * Extracted to keep the main screen file under 500 lines.
 */
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

// ─── Pulse Dot ────────────────────────────────────────────────────────────────

export function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }, { transform: [{ scale }] }]} />;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: `${color}20`, overflow: 'hidden', marginTop: 4 }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

// ─── Pill Badge ────────────────────────────────────────────────────────────────

export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: bg }]}>
      <Text style={[pillStyles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────

export function SectionCard({
  title, icon, iconColor, headerRight, children, collapsible = false,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View style={cardStyles.card}>
      <TouchableOpacity
        style={cardStyles.cardHeader}
        onPress={collapsible ? () => setCollapsed((v) => !v) : undefined}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <View style={cardStyles.cardHeaderLeft}>
          <View style={[cardStyles.cardIconBox, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
          <Text style={cardStyles.cardTitle}>{title}</Text>
        </View>
        <View style={cardStyles.cardHeaderRight}>
          {headerRight}
          {collapsible && (
            <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.light.muted} style={{ marginLeft: 8 }} />
          )}
        </View>
      </TouchableOpacity>
      {!collapsed && children}
    </View>
  );
}

// ─── Metric Row ───────────────────────────────────────────────────────────────

export function MetricRow({ label, value, valueColor, sublabel }: { label: string; value: string | number; valueColor?: string; sublabel?: string }) {
  return (
    <View style={cardStyles.metricRow}>
      <Text style={cardStyles.metricLabel}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[cardStyles.metricValue, { color: valueColor ?? Colors.light.text }]}>{value}</Text>
        {sublabel ? <Text style={cardStyles.metricSublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

export function KPICard({
  label, value, icon, iconColor, bg, sub, subColor,
}: {
  label: string; value: string | number;
  icon: keyof typeof Ionicons.glyphMap; iconColor: string; bg: string;
  sub?: string; subColor?: string;
}) {
  return (
    <View style={[cardStyles.kpiCard, { backgroundColor: bg }]}>
      <View style={[cardStyles.kpiIconBox, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={cardStyles.kpiValue}>{value}</Text>
      <Text style={cardStyles.kpiLabel}>{label}</Text>
      {sub && <Text style={[cardStyles.kpiSub, { color: subColor ?? Colors.light.muted }]}>{sub}</Text>}
    </View>
  );
}

// ─── Error Rate Card ───────────────────────────────────────────────────────────

export function ErrorRateCard({ label, count }: { label: string; count: number }) {
  const color = count === 0 ? Colors.light.success : count <= 5 ? Colors.light.warning : Colors.light.error;
  const bg = `${color}15`;
  return (
    <View style={[cardStyles.errorRateCard, { backgroundColor: bg }]}>
      <Text style={[cardStyles.errorRateCount, { color }]}>{count}</Text>
      <Text style={cardStyles.errorRateLabel}>{label}</Text>
    </View>
  );
}

// ─── Connection Card ───────────────────────────────────────────────────────────

export function ConnCard({ label, value, icon, color }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={[cardStyles.connCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={cardStyles.connLabel}>{label}</Text>
      <Text style={[cardStyles.connValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pillStyles = StyleSheet.create({
  pill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});

const cardStyles = StyleSheet.create({
  // Section card
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  cardIconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  // Metric
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border },
  metricLabel: { fontSize: 13, color: Colors.light.muted, fontWeight: '500' },
  metricValue: { fontSize: 13, fontWeight: '700', color: Colors.light.text },
  metricSublabel: { fontSize: 10, color: Colors.light.muted, marginTop: 1 },
  // KPI
  kpiCard: { width: '30.5%', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2, alignItems: 'flex-start', gap: 3 },
  kpiIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: Colors.light.text, lineHeight: 24 },
  kpiLabel: { fontSize: 11, fontWeight: '500', color: Colors.light.muted, lineHeight: 14 },
  kpiSub: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  // Error rate
  errorRateCard: { flex: 1, minWidth: '40%', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  errorRateCount: { fontSize: 26, fontWeight: '800' },
  errorRateLabel: { fontSize: 11, fontWeight: '500', color: Colors.light.muted, textAlign: 'center' },
  // Connection
  connCard: { flex: 1, minWidth: '44%', borderRadius: 10, padding: 10, backgroundColor: Colors.light.slate, gap: 3 },
  connLabel: { fontSize: 11, fontWeight: '600', color: Colors.light.muted, marginTop: 4 },
  connValue: { fontSize: 13, fontWeight: '700' },
});
