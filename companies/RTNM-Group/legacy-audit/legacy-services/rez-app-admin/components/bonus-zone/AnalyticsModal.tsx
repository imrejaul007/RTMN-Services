import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface AnalyticsModalProps {
  visible: boolean;
  campaignId: string | null;
  analytics: any;
  analyticsLoading: boolean;
  colors: Record<string, string>;
  onClose: () => void;
}

export default function AnalyticsModal({
  visible,
  campaignId,
  analytics,
  analyticsLoading,
  colors,
  onClose,
}: AnalyticsModalProps) {
  if (!campaignId) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.analyticsOverlay}>
        <View style={[styles.analyticsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.analyticsHeader}>
            <Text style={[styles.analyticsTitle, { color: colors.text }]}>Campaign Analytics</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {analyticsLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.info}
              style={{ paddingVertical: 40 }}
            />
          ) : analytics ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.totalClaims}</Text>
                  <Text style={styles.analyticsCardLabel}>Total Claims</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.creditedClaims}</Text>
                  <Text style={styles.analyticsCardLabel}>Credited</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.pendingClaims}</Text>
                  <Text style={styles.analyticsCardLabel}>Pending</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.rejectedClaims}</Text>
                  <Text style={styles.analyticsCardLabel}>Rejected</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.uniqueUsers}</Text>
                  <Text style={styles.analyticsCardLabel}>Unique Users</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>
                    {analytics.totalCoinsDistributed?.toLocaleString()}
                  </Text>
                  <Text style={styles.analyticsCardLabel}>Coins Distributed</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.budgetUsedPercent}%</Text>
                  <Text style={styles.analyticsCardLabel}>Budget Used</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.avgRewardPerUser}</Text>
                  <Text style={styles.analyticsCardLabel}>Avg/User</Text>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  analyticsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  analyticsContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  analyticsTitle: { fontSize: 18, fontWeight: '700' },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  analyticsCard: {
    width: '47%',
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  analyticsCardValue: { fontSize: 22, fontWeight: '700', color: Colors.light.navy },
  analyticsCardLabel: {
    fontSize: 11,
    color: Colors.light.mutedDark,
    marginTop: 4,
    fontWeight: '500',
  },
});
