/**
 * BuzzLocal - Safety Screen
 * SOS, alerts, crowd reports, trusted circles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SAFETY_TYPES } from '../../src/constants';

const MOCK_ALERTS = [
  { id: '1', type: 'traffic', title: 'Heavy Traffic', location: 'MG Road', severity: 'warning', timeAgo: '10 min' },
  { id: '2', type: 'accident', title: 'Minor Accident', location: 'Indiranagar', severity: 'warning', timeAgo: '25 min' },
  { id: '3', type: 'power', title: 'Power Cut Scheduled', location: 'HSR Layout', severity: 'info', timeAgo: '1 hour' },
];

const MOCK_TRENDING = [
  { place: 'Pizza Hub', type: 'Moderate crowd', count: 12 },
  { place: 'Forum Mall', type: 'Light crowd', count: 8 },
  { place: 'UB City', type: 'Heavy crowd', count: 45 },
];

export default function SafetyScreen() {
  const [isSOSActive, setIsSOSActive] = useState(false);

  const triggerSOS = () => {
    Alert.alert(
      '🚨 Emergency SOS',
      'This will alert your trusted contacts with your location. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: () => {
            setIsSOSActive(true);
            Alert.alert('SOS Sent', 'Your contacts have been notified');
            setTimeout(() => setIsSOSActive(false), 30000);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Safety Map</Text>
          <Text style={styles.headerSubtitle}>Stay informed, stay safe</Text>
        </View>

        {/* SOS Button */}
        <TouchableOpacity
          style={[styles.sosButton, isSOSActive && styles.sosButtonActive]}
          onLongPress={triggerSOS}
        >
          <View style={styles.sosInner}>
            <Ionicons name={isSOSActive ? 'checkmark' : 'alert-circle'} size={32} color="#fff" />
            <Text style={styles.sosText}>
              {isSOSActive ? 'SOS Active' : 'SOS Emergency'}
            </Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.sosHint}>Hold for 3 seconds to trigger</Text>

        {/* Quick Report */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Issue</Text>
          <View style={styles.reportGrid}>
            {SAFETY_TYPES.map((type) => (
              <TouchableOpacity key={type.id} style={styles.reportCard}>
                <View style={[styles.reportIcon, { backgroundColor: type.color + '20' }]}>
                  <Ionicons name={type.icon as any} size={24} color={type.color} />
                </View>
                <Text style={styles.reportLabel}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nearby Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Alerts</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {MOCK_ALERTS.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={[styles.alertIcon, { backgroundColor: alert.severity === 'warning' ? COLORS.warning + '20' : COLORS.info + '20' }]}>
                <Ionicons name="warning" size={20} color={alert.severity === 'warning' ? COLORS.warning : COLORS.info} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertLocation}>
                  <Ionicons name="location" size={12} color={COLORS.textMuted} /> {alert.location}
                </Text>
              </View>
              <Text style={styles.alertTime}>{alert.timeAgo}</Text>
            </View>
          ))}
        </View>

        {/* Crowd Map */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🧠 Crowd Intelligence</Text>
          </View>
          {MOCK_TRENDING.map((item, i) => (
            <View key={i} style={styles.crowdCard}>
              <View style={styles.crowdLeft}>
                <Text style={styles.crowdPlace}>{item.place}</Text>
                <Text style={styles.crowdType}>{item.type}</Text>
              </View>
              <View style={styles.crowdRight}>
                <Text style={styles.crowdCount}>{item.count}</Text>
                <Text style={styles.crowdLabel}>reports</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Trusted Circles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔗 Trusted Circles</Text>
          </View>
          <TouchableOpacity style={styles.circleCard}>
            <View style={styles.circleIcon}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.circleContent}>
              <Text style={styles.circleName}>Family</Text>
              <Text style={styles.circleMembers}>5 members</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleCard}>
            <View style={[styles.circleIcon, { backgroundColor: COLORS.accent + '20' }]}>
              <Ionicons name="home" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.circleContent}>
              <Text style={styles.circleName}>Apartment</Text>
              <Text style={styles.circleMembers}>12 members</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  header: { marginBottom: SPACING.lg },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  sosButton: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.danger,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  sosButtonActive: { backgroundColor: COLORS.success },
  sosInner: { alignItems: 'center', gap: 8 },
  sosText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sosHint: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 12, marginBottom: 24 },
  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  viewAll: { fontSize: 14, color: COLORS.primary },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  reportCard: { width: '31%', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  reportIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  reportLabel: { fontSize: 12, color: COLORS.text, textAlign: 'center' },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  alertIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  alertContent: { flex: 1, marginLeft: SPACING.md },
  alertTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  alertLocation: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  alertTime: { fontSize: 12, color: COLORS.textMuted },
  crowdCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  crowdLeft: { flex: 1 },
  crowdPlace: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  crowdType: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  crowdRight: { alignItems: 'center' },
  crowdCount: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  crowdLabel: { fontSize: 11, color: COLORS.textMuted },
  circleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  circleIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  circleContent: { flex: 1, marginLeft: SPACING.md },
  circleName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  circleMembers: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
