/**
 * Z Events - Event Detail Screen with Real API
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { exhibitionAPI, Exhibition, Booth, Session } from '../../src/services/exhibitionService';
import { sutARPayment } from '../../src/services/paymentService';
import { corpIDAuth } from '../../src/services/authService';

type TabType = 'overview' | 'booths' | 'sessions';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    loadEventData();
  }, [id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const eventId = id as string;

      // Load event details
      const event = await exhibitionAPI.getExhibition(eventId);
      setExhibition(event);

      // Load booths
      const boothsData = await exhibitionAPI.getBooths(eventId);
      setBooths(boothsData.slice(0, 5)); // Featured booths

      // Load sessions
      const sessionsData = await exhibitionAPI.getSessions(eventId);
      setSessions(sessionsData.slice(0, 5)); // Upcoming sessions

    } catch (error) {
      console.error('Failed to load event:', error);
      // Use mock data
      setExhibition(mockEvent);
      setBooths(mockBooths);
      setSessions(mockSessions);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!corpIDAuth.isAuthenticated()) {
      Alert.alert('Login Required', 'Please login to register for this event.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    try {
      setRegistering(true);

      // Get user profile
      const user = await corpIDAuth.getProfile();

      // Create payment intent
      const payment = await sutARPayment.createPaymentIntent({
        exhibition_id: exhibition!.exhibition_id || exhibition!.id,
        ticket_type: 'general',
        amount: exhibition!.ticket_price,
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: user.phone,
      });

      // Simulate payment completion (in production, redirect to payment gateway)
      Alert.alert(
        'Payment Required',
        `₹${exhibition!.ticket_price} - Complete payment to register`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Simulate Payment',
            onPress: async () => {
              // Confirm payment
              await exhibitionAPI.confirmPayment(payment.payment_id, {
                gateway_txn_id: `SIM-${Date.now()}`,
                payment_method: 'upi',
              });
              setRegistered(true);
            },
          },
        ]
      );

    } catch (error) {
      console.error('Registration failed:', error);
      Alert.alert('Error', 'Failed to process registration. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading || !exhibition) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        {exhibition.status === 'live' && (
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
              <Text style={styles.bannerEmoji}>🎪</Text>
            </View>
            <Text style={styles.eventName}>{exhibition.name}</Text>
            <Text style={styles.tagline}>{exhibition.tagline}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaItem}>📍 {exhibition.city || 'TBD'}</Text>
              <Text style={styles.metaItem}>📅 {exhibition.start_date}</Text>
            </View>

            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{exhibition.description}</Text>

            <Text style={styles.sectionTitle}>Venue</Text>
            <View style={styles.venueCard}>
              <Text style={styles.venueName}>📍 {exhibition.venue}</Text>
              <Text style={styles.venueHours}>🕐 10:00 AM - 6:00 PM</Text>
            </View>

            <Text style={styles.sectionTitle}>Highlights</Text>
            <View style={styles.highlights}>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>{exhibition.exhibitor_count}+</Text>
                <Text style={styles.highlightLabel}>Exhibitors</Text>
              </View>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>{exhibition.expected_visitors?.toString().replace(/000/, 'K') || '50K'}+</Text>
                <Text style={styles.highlightLabel}>Visitors</Text>
              </View>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightValue}>{booths.length}+</Text>
                <Text style={styles.highlightLabel}>Booths</Text>
              </View>
            </View>

            {!registered ? (
              <TouchableOpacity
                style={[styles.registerButton, registering && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.registerText}>
                    Register for ₹{exhibition.ticket_price}
                  </Text>
                )}
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
            {booths.map((booth) => (
              <TouchableOpacity
                key={booth.exhibitor_id}
                style={styles.boothCard}
                onPress={() => router.push(`/booth/${booth.exhibitor_id}`)}
              >
                <View style={styles.boothIcon}>
                  <Text style={styles.boothEmoji}>🏢</Text>
                </View>
                <View style={styles.boothInfo}>
                  <Text style={styles.boothName}>{booth.exhibitor_name}</Text>
                  <Text style={styles.boothCategory}>{booth.category} • Booth {booth.booth_number}</Text>
                </View>
                <View style={styles.boothStats}>
                  <Text style={styles.boothVisitors}>{booth.live_metrics?.visitors_count || 0}</Text>
                  <Text style={styles.visitorsLabel}>visitors</Text>
                </View>
              </TouchableOpacity>
            ))}
            {booths.length === 0 && (
              <Text style={styles.emptyText}>No exhibitors yet</Text>
            )}
          </View>
        )}

        {activeTab === 'sessions' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            {sessions.map((session) => (
              <TouchableOpacity
                key={session.session_id || session.id}
                style={styles.sessionCard}
                onPress={() => router.push(`/session/${session.session_id || session.id}`)}
              >
                <View style={styles.sessionTime}>
                  <Text style={styles.timeText}>{session.start_time}</Text>
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionSpeaker}>by {session.speaker_name}</Text>
                  <Text style={styles.sessionRoom}>📍 {session.room}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {sessions.length === 0 && (
              <Text style={styles.emptyText}>No sessions scheduled yet</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Mock data fallback
const mockEvent: Exhibition = {
  id: 'EXH-001',
  exhibition_id: 'EXH-001',
  name: 'Tech India Expo 2026',
  tagline: 'Where Innovation Meets Opportunity',
  description: 'India\'s largest technology exhibition bringing together the brightest minds in tech, AI, and innovation.',
  industry: 'tech',
  venue: 'Bombay Exhibition Centre',
  city: 'Mumbai',
  start_date: '2026-08-15',
  end_date: '2026-08-17',
  ticket_price: 499,
  status: 'published',
  banner_image: '',
  exhibitor_count: 250,
  expected_visitors: 50000,
  tags: ['tech', 'ai'],
};

const mockBooths: Booth[] = [
  { id: 'B001', exhibitor_id: 'B001', exhibitor_name: 'TechCorp India', booth_number: 'A-12', zone_name: 'AI Zone', category: 'AI', description: '', logo_url: '', banner_url: '', products: [], offers: [], live_metrics: { visitors_count: 342, leads_captured: 45, avg_dwell_time: 180 } },
  { id: 'B002', exhibitor_id: 'B002', exhibitor_name: 'CloudFirst', booth_number: 'A-15', zone_name: 'Cloud Zone', category: 'Cloud', description: '', logo_url: '', banner_url: '', products: [], offers: [], live_metrics: { visitors_count: 256, leads_captured: 32, avg_dwell_time: 150 } },
  { id: 'B003', exhibitor_id: 'B003', exhibitor_name: 'DataWorks', booth_number: 'B-08', zone_name: 'Data Zone', category: 'Data', description: '', logo_url: '', banner_url: '', products: [], offers: [], live_metrics: { visitors_count: 198, leads_captured: 28, avg_dwell_time: 120 } },
];

const mockSessions: Session[] = [
  { id: 'S001', session_id: 'S001', title: 'Keynote: Future of AI', description: '', type: 'keynote', speaker_name: 'Dr. Sundar', speaker_company: 'TechCorp', room: 'Main Hall', start_time: '10:00 AM', end_time: '11:00 AM', capacity: 500, registered_count: 342, is_registered: false },
  { id: 'S002', session_id: 'S002', title: 'Startup Pitch Competition', description: '', type: 'panel', speaker_name: 'Various', speaker_company: '', room: 'Hall B', start_time: '2:00 PM', end_time: '4:00 PM', capacity: 200, registered_count: 156, is_registered: false },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B', marginTop: 12, fontSize: 16 },
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
  venueHours: { color: '#6366F1', fontSize: 14, marginTop: 8 },
  highlights: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  highlightItem: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 16, alignItems: 'center' },
  highlightValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  highlightLabel: { color: '#64748B', fontSize: 12, marginTop: 4 },
  registerButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  registerButtonDisabled: { opacity: 0.6 },
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
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
