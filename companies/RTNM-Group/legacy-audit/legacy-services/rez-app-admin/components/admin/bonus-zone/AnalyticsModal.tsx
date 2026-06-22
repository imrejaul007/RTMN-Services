import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

interface AnalyticsModalProps {
  visible: boolean;
  analytics: {
    totalClaims: number;
    creditedClaims: number;
    pendingClaims: number;
    rejectedClaims: number;
    uniqueUsers: number;
    totalCoinsDistributed?: number;
    budgetUsedPercent: number;
    avgRewardPerUser: number;
  } | null;
  analyticsLoading: boolean;
  onClose: () => void;
}

export default function AnalyticsModal({ visible, analytics, analyticsLoading, onClose }: AnalyticsModalProps) {
  const colors = Colors.light;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Campaign Analytics</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {analyticsLoading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : analytics ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.grid}>
                {[
                  ['Total Claims', analytics.totalClaims],
                  ['Credited', analytics.creditedClaims],
                  ['Pending', analytics.pendingClaims],
                  ['Rejected', analytics.rejectedClaims],
                  ['Unique Users', analytics.uniqueUsers],
                  ['Coins Distributed', analytics.totalCoinsDistributed?.toLocaleString()],
                  ['Budget Used', `${analytics.budgetUsedPercent}%`],
                  ['Avg/User', analytics.avgRewardPerUser],
                ].map(([label, value]) => (
                  <View key={label} style={styles.card}>
                    <Text style={styles.cardValue}>{String(value)}</Text>
                    <Text style={styles.cardLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%',
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cardValue: { fontSize: 22, fontWeight: '700', color: Colors.light.navy },
  cardLabel: { fontSize: 11, color: Colors.light.mutedDark, marginTop: 4, fontWeight: '500' },
});

