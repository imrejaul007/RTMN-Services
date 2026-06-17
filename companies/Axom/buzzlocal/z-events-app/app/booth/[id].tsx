/**
 * Z Events - Booth Detail Screen
 */

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const mockBooth = {
  id: 'B001',
  name: 'TechCorp India',
  category: 'AI & Machine Learning',
  description: 'Leading AI solutions provider for enterprise businesses.',
  booth_number: 'A-12',
  zone: 'AI Zone',
  products: ['AI Platform', 'ML Services', 'Data Analytics'],
  visitors: 342,
  leads_captured: 45,
  offers: [{ title: '20% off AI Platform', valid: 'Limited time' }],
};

export default function BoothDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mockBooth.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>🏢</Text>
        </View>

        <View style={styles.boothInfo}>
          <Text style={styles.boothName}>{mockBooth.name}</Text>
          <Text style={styles.category}>{mockBooth.category}</Text>
          <View style={styles.location}>
            <Text style={styles.locationText}>📍 Booth {mockBooth.booth_number} • {mockBooth.zone}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{mockBooth.visitors}</Text>
            <Text style={styles.statLabel}>Visitors</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{mockBooth.leads_captured}</Text>
            <Text style={styles.statLabel}>Leads</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{mockBooth.description}</Text>

        <Text style={styles.sectionTitle}>Products</Text>
        {mockBooth.products.map((product, i) => (
          <View key={i} style={styles.productCard}>
            <Text style={styles.productName}>{product}</Text>
            <TouchableOpacity style={styles.inquireButton}>
              <Text style={styles.inquireText}>Inquire</Text>
            </TouchableOpacity>
          </View>
        ))}

        {mockBooth.offers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🎁 Special Offers</Text>
            {mockBooth.offers.map((offer, i) => (
              <View key={i} style={styles.offerCard}>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                <Text style={styles.offerValid}>{offer.valid}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>📱 Request Demo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>📅 Book Appointment</Text>
          </TouchableOpacity>
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
  banner: { height: 150, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  bannerEmoji: { fontSize: 60 },
  boothInfo: { padding: 16 },
  boothName: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  category: { color: '#6366F1', fontSize: 14, marginTop: 4 },
  location: { marginTop: 8 },
  locationText: { color: '#64748B', fontSize: 14 },
  stats: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statItem: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#64748B', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 16 },
  description: { color: '#94A3B8', fontSize: 14, paddingHorizontal: 16, marginBottom: 16, lineHeight: 22 },
  productCard: { backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  productName: { flex: 1, color: '#FFF', fontSize: 16 },
  inquireButton: { backgroundColor: '#334155', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  inquireText: { color: '#FFF', fontSize: 12 },
  offerCard: { backgroundColor: '#22C55E', marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 16 },
  offerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  offerValid: { color: '#FFF', fontSize: 12, opacity: 0.8, marginTop: 4 },
  actions: { padding: 16, gap: 12 },
  actionButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, alignItems: 'center' },
  actionText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, alignItems: 'center' },
  secondaryText: { color: '#FFF', fontSize: 16 },
});
