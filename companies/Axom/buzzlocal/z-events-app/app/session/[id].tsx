/**
 * Z Events - Session Detail Screen
 */

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const mockSession = {
  id: 'S001',
  title: 'Keynote: Future of AI in Enterprise',
  description: 'Join us for an insightful keynote on how AI is transforming enterprise businesses.',
  speaker: 'Dr. Priya Sharma',
  speakerTitle: 'Chief AI Officer, TechCorp',
  speakerBio: 'Leading expert in enterprise AI with 15+ years experience.',
  room: 'Main Hall',
  date: '2026-08-15',
  start_time: '10:00 AM',
  end_time: '11:00 AM',
  capacity: 500,
  registered: 342,
  is_registered: false,
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [registered, setRegistered] = useState(mockSession.is_registered);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{mockSession.title}</Text>
          <View style={styles.sessionMeta}>
            <Text style={styles.metaItem}>📅 {mockSession.date}</Text>
            <Text style={styles.metaItem}>🕐 {mockSession.start_time} - {mockSession.end_time}</Text>
            <Text style={styles.metaItem}>📍 {mockSession.room}</Text>
          </View>
        </View>

        <View style={styles.capacity}>
          <View style={styles.capacityBar}>
            <View style={[styles.capacityFill, { width: `${(mockSession.registered / mockSession.capacity) * 100}%` }]} />
          </View>
          <Text style={styles.capacityText}>{mockSession.registered}/{mockSession.capacity} registered</Text>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{mockSession.description}</Text>

        <Text style={styles.sectionTitle}>Speaker</Text>
        <View style={styles.speakerCard}>
          <View style={styles.speakerAvatar}>
            <Text style={styles.speakerInitial}>{mockSession.speaker[0]}</Text>
          </View>
          <View style={styles.speakerInfo}>
            <Text style={styles.speakerName}>{mockSession.speaker}</Text>
            <Text style={styles.speakerTitle}>{mockSession.speakerTitle}</Text>
            <Text style={styles.speakerBio}>{mockSession.speakerBio}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {!registered ? (
            <TouchableOpacity style={styles.registerButton} onPress={() => setRegistered(true)}>
              <Text style={styles.registerText}>Register for Session</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.registeredBanner}>
              <Text style={styles.registeredText}>✓ You're registered</Text>
              <Text style={styles.registeredSubtext}>Add to calendar</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { backgroundColor: '#1E293B', padding: 16, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 24 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1 },
  sessionInfo: { padding: 16 },
  sessionTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  sessionMeta: { gap: 8 },
  metaItem: { color: '#64748B', fontSize: 14 },
  capacity: { paddingHorizontal: 16, marginBottom: 20 },
  capacityBar: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden' },
  capacityFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
  capacityText: { color: '#94A3B8', fontSize: 12, marginTop: 8 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  description: { color: '#94A3B8', fontSize: 14, paddingHorizontal: 16, lineHeight: 22, marginBottom: 16 },
  speakerCard: { backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 12, padding: 16, flexDirection: 'row', marginBottom: 20 },
  speakerAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  speakerInitial: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  speakerInfo: { flex: 1 },
  speakerName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  speakerTitle: { color: '#6366F1', fontSize: 12, marginTop: 2 },
  speakerBio: { color: '#64748B', fontSize: 12, marginTop: 8 },
  actions: { padding: 16 },
  registerButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, alignItems: 'center' },
  registerText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  registeredBanner: { backgroundColor: '#22C55E', borderRadius: 12, padding: 16, alignItems: 'center' },
  registeredText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  registeredSubtext: { color: '#FFF', fontSize: 12, marginTop: 4, opacity: 0.8 },
});
