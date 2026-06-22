import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface StatsBarProps { stats: any; colors: any; }

export function StatsBar({ stats, colors }: StatsBarProps) {
  if (!stats) return null;
  return (
    <View style={[styles.row, { backgroundColor: colors.card, marginHorizontal: 16, marginVertical: 12, padding: 16, borderRadius: 12 }]}>
      <View style={styles.stat}><Text style={[styles.num, { color: colors.text }]}>{stats.total ?? 0}</Text><Text style={[styles.lbl, { color: colors.icon }]}>Total</Text></View>
      <View style={styles.stat}><Text style={[styles.num, { color: colors.success }]}>{stats.active ?? 0}</Text><Text style={[styles.lbl, { color: colors.icon }]}>Active</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  num: { fontSize: 20, fontWeight: '700' },
  lbl: { fontSize: 11, marginTop: 2 },
});
