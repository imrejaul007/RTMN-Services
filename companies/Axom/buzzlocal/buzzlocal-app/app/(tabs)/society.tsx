/**
 * BuzzLocal - Society Screen
 * Community/Society management
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SOCIETY_FEATURES } from '../../src/constants';

const MOCK_NOTICES = [
  { id: '1', title: 'Water Supply Interruption', type: 'maintenance', priority: 'high', timeAgo: '2 hours ago' },
  { id: '2', title: 'Summer Pool Timings', type: 'general', priority: 'low', timeAgo: '1 day ago' },
];

const MOCK_VISITORS = [
  { id: '1', name: 'Ravi (Delivery)', purpose: 'Delivery', time: 'Expected 3 PM' },
];

export default function SocietyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Society</Text>
            <Text style={styles.headerSubtitle}>Sunrise Apartments</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Notices</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Visitors</Text>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.featuresGrid}>
            {SOCIETY_FEATURES.map((feature) => (
              <TouchableOpacity key={feature.id} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.featureLabel}>{feature.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📢 Recent Notices</Text>
            <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
          </View>
          {MOCK_NOTICES.map((notice) => (
            <View key={notice.id} style={styles.noticeCard}>
              <View style={styles.noticeIcon}>
                <Ionicons name="megaphone" size={20} color={notice.priority === 'high' ? COLORS.error : COLORS.primary} />
              </View>
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeTime}>{notice.timeAgo}</Text>
              </View>
              {notice.priority === 'high' && (
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityText}>Urgent</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Visitors */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Expected Visitors</Text>
            <TouchableOpacity><Text style={styles.viewAll}>+ Add</Text></TouchableOpacity>
          </View>
          {MOCK_VISITORS.map((visitor) => (
            <View key={visitor.id} style={styles.visitorCard}>
              <View style={styles.visitorAvatar}>
                <Text style={styles.visitorInitial}>R</Text>
              </View>
              <View style={styles.visitorContent}>
                <Text style={styles.visitorName}>{visitor.name}</Text>
                <Text style={styles.visitorMeta}>{visitor.purpose} • {visitor.time}</Text>
              </View>
              <TouchableOpacity style={styles.approveButton}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🆘 Emergency Contacts</Text>
          <View style={styles.emergencyCard}>
            <TouchableOpacity style={styles.emergencyButton}>
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.emergencyText}>Security</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.emergencyButton, { backgroundColor: COLORS.error }]}>
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.emergencyText}>Society Office</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 14, color: COLORS.textSecondary },
  settingsButton: { width: 44, height: 44, backgroundColor: COLORS.card, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  viewAll: { fontSize: 14, color: COLORS.primary },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  featureCard: { width: '31%', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  featureIcon: { width: 48, height: 48, backgroundColor: COLORS.primary + '15', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  featureLabel: { fontSize: 12, color: COLORS.text, textAlign: 'center' },
  noticeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  noticeIcon: { width: 40, height: 40, backgroundColor: COLORS.primary + '15', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  noticeContent: { flex: 1, marginLeft: SPACING.md },
  noticeTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  noticeTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  priorityBadge: { backgroundColor: COLORS.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  priorityText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  visitorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  visitorAvatar: { width: 44, height: 44, backgroundColor: COLORS.accent + '30', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  visitorInitial: { fontSize: 18, fontWeight: '600', color: COLORS.accent },
  visitorContent: { flex: 1, marginLeft: SPACING.md },
  visitorName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  visitorMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  approveButton: { padding: 4 },
  emergencyCard: { flexDirection: 'row', gap: SPACING.sm },
  emergencyButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md },
  emergencyText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
