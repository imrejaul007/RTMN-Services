/**
 * Z Events - Event Detail Screen
 */

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const mockEvent = {
  id: 'EXH-001',
  name: 'Tech India Expo 2026',
  tagline: 'Where Innovation Meets Opportunity',
  description: 'India\'s largest technology exhibition bringing together the brightest minds in tech, AI, and innovation.',
  venue: 'Bombay Exhibition Centre',
  address: 'NESCO, Goregaon East, Mumbai',
  city: 'Mumbai',
  start_date: '2026-08-15',
  end_date: '2026-08-17',
  hours: '10:00 AM - 6:00 PM',
  ticket_price: 499,
  exhibitors: 250,
  visitors: '50K+',
  banner: '🎪',
  is_live: false,
};

const mockBooths = [
  { id: 'B001', name: 'TechCorp India', category: 'AI', visitors: 342 },
  { id: 'B002', name: 'CloudFirst', category: 'Cloud', visitors: 256 },
  { id: 'B003', name: 'DataWorks', category: 'Data', visitors: 198 },
];

const mockSessions = [
  { id: 'S001', title: 'Keynote: Future of AI', speaker: 'Dr. Sundar', time: '10:00 AM', room: 'Main Hall' },
  { id: 'S002', title: 'Startup Pitch', speaker: 'Various', time: '2:00 PM', room: 'Hall B' },
];

type TabType = 'overview' | 'booths' | 'sessions';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [registered, setRegistered] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        {mockEvent.is_live && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>🔴 LIVE</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['overview', 'booths', 'sessions'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <View style={styles.banner}>
              <Text style={styles.bannerEmoji}>{mockEvent.banner}</Text>
            </View>
            <Text style={styles.eventName}>{mockEvent.name}</Text>
            <Text style={styles.tagline}>{mockEvent.tagline}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaItem}>📍 {mockEvent.city}</Text>
              <Text style={styles.metaItem}>📅 {mockEvent.start_date}</Text>
            </View>

            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{mockEvent.description}</Text>

            <Text style={styles.sectionTitle}>Venue</Text>
            <View style={styles.venueCard}>
              <Text style={styles.venueName}>📍 {mockEvent.venue}</Text>
              <Text style={styles.venueAddress}>{mockEvent.address}</Text>
              <Text style={styles.venueHours}>🕐 {mockEvent.hours}</Text>
            </View>

            <Text style={styles.sectionTitle}>Highlights</Text>
            <View style={styles.highlights}>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>250+</Text>
                <Text style={styles.highlightLabel}>Exhibitors</Text>
              </View>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>50K+</Text>
                <Text style={styles.highlightLabel}>Visitors</Text>
              </View>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>15+</Text>
                <Text style={styles.highlightLabel}>Sessions</Text>
              </View>
            </View>

            {!registered ? (
              <TouchableOpacity style={styles.registerButton} onPress={() => setRegistered(true)}>
                <Text style={styles.registerText}>Register for ₹{mockEvent.ticket_price}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.registeredBanner}>
                <Text style={styles.registeredText}>✓ Registered - Show QR at entry</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'booths' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Featured Exhibitors</Text>
            {mockBooths.map((booth) => (
              <TouchableOpacity key={booth.id} style={styles.boothCard} onPress={() => router.push(`/booth/${booth.id}`)}>
                <View style={styles.boothIcon}>
                  <Text style={styles.boothEmoji}>🏢</Text>
                </View>
                <View style={styles.boothInfo}>
                  <Text style={styles.boothName}>{booth.name}</Text>
                  <Text style={styles.boothCategory}>{booth.category}</Text>
                </View>
                <View style={styles.boothStats}>
                  <Text style={styles.boothVisitors}>{booth.visitors}</Text>
                  <Text style={styles.visitorsLabel}>visitors</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'sessions' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Day 1 Sessions</Text>
            {mockSessions.map((session) => (
              <TouchableOpacity key={session.id} style={styles.sessionCard} onPress={() => router.push(`/session/${session.id}`)}>
                <View style={styles.sessionTime}>
                  <Text style={styles.timeText}>{session.time}</Text>
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionSpeaker}>by {session.speaker}</Text>
                  <Text style={styles.sessionRoom}>📍 {session.room}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { backgroundColor: '#1E293B', padding: 16, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between' },
  backButton: {},
  backText: { color: '#FFF', fontSize: 24 },
  liveBadge: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  liveText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', backgroundColor: '#1E293B' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366F1' },
  tabText: { color: '#64748B', fontSize: 14 },
  tabTextActive: { color: '#FFF', fontWeight: '600' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  banner: { height: 200, backgroundColor: '#1E293B', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  bannerEmoji: { fontSize: 80 },
  eventName: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  tagline: { color: '#94A3B8', fontSize: 16, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  metaItem: { color: '#64748B', fontSize: 14 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  description: { color: '#94A3B8', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  venueCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 16 },
  venueName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  venueAddress: { color: '#64748B', fontSize: 14, marginTop: 4 },
  venueHours: { color: '#6366F1', fontSize: 14, marginTop: 8 },
  highlights: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  highlightItem: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 16, alignItems: 'center' },
  highlightValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  highlightLabel: { color: '#64748B', fontSize: 12, marginTop: 4 },
  registerButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  registerText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  registeredBanner: { backgroundColor: '#22C55E', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  registeredText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  boothCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  boothIcon: { width: 50, height: 50, backgroundColor: '#334155', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  boothEmoji: { fontSize: 24 },
  boothInfo: { flex: 1 },
  boothName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  boothCategory: { color: '#64748B', fontSize: 12, marginTop: 2 },
  boothStats: { alignItems: 'center' },
  boothVisitors: { color: '#6366F1', fontSize: 18, fontWeight: 'bold' },
  visitorsLabel: { color: '#64748B', fontSize: 10 },
  sessionCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, flexDirection: 'row', marginBottom: 12 },
  sessionTime: { backgroundColor: '#334155', borderRadius: 8, padding: 12, marginRight: 12 },
  timeText: { color: '#6366F1', fontSize: 12, fontWeight: '600' },
  sessionInfo: { flex: 1 },
  sessionTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  sessionSpeaker: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  sessionRoom: { color: '#64748B', fontSize: 12, marginTop: 4 },
});
