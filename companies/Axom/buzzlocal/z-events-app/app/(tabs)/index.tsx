/**
 * Z Events - Home Screen
 * Browse and discover events
 */

import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

// Mock data - in production, use ExhibitionOSClient
const upcomingEvents = [
  {
    id: 'EXH-001',
    name: 'Tech India Expo 2026',
    tagline: 'Where Innovation Meets Opportunity',
    city: 'Mumbai',
    start_date: '2026-08-15',
    banner: '🎪',
    exhibitors: 250,
    category: 'Tech',
    is_live: false,
  },
  {
    id: 'EXH-002',
    name: 'AutoMobility India',
    tagline: 'The Future of Mobility',
    city: 'Delhi NCR',
    start_date: '2026-09-01',
    banner: '🚗',
    exhibitors: 180,
    category: 'Automotive',
    is_live: true,
  },
  {
    id: 'EXH-003',
    name: 'HealthTech Summit',
    tagline: 'Revolutionizing Healthcare',
    city: 'Mumbai',
    start_date: '2026-10-10',
    banner: '🏥',
    exhibitors: 120,
    category: 'Healthcare',
    is_live: false,
  },
];

const categories = ['All', 'Tech', 'Automotive', 'Healthcare', 'Retail', 'Food', 'Fashion', 'Sports'];

const LiveEvent = ({ event }: { event: typeof upcomingEvents[0] }) => (
  <TouchableOpacity style={styles.liveCard}>
    <View style={styles.liveBanner}>
      <Text style={styles.liveEmoji}>{event.banner}</Text>
      <View style={styles.liveBadge}>
        <Text style={styles.liveText}>🔴 LIVE</Text>
      </View>
    </View>
    <View style={styles.liveInfo}>
      <Text style={styles.liveName}>{event.name}</Text>
      <Text style={styles.liveVisitors}>2,340 visitors inside</Text>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const liveEvents = upcomingEvents.filter(e => e.is_live);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipSelected,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextSelected,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Live Events */}
      {liveEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔴 Live Now</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={liveEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <LiveEvent event={item} />}
            contentContainerStyle={styles.liveList}
          />
        </View>
      )}

      {/* Upcoming Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {upcomingEvents
          .filter(e => !e.is_live)
          .map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              <View style={styles.eventBanner}>
                <Text style={styles.eventEmoji}>{event.banner}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventTagline}>{event.tagline}</Text>
                <View style={styles.eventMeta}>
                  <Text style={styles.metaText}>📍 {event.city}</Text>
                  <Text style={styles.metaText}>🏢 {event.exhibitors}+</Text>
                </View>
                <Text style={styles.eventDate}>📅 {event.start_date}</Text>
              </View>
            </TouchableOpacity>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#6366F1',
  },
  categoryText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  categoryTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  liveList: {
    gap: 12,
  },
  liveCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    width: 280,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  liveBanner: {
    height: 120,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  liveEmoji: {
    fontSize: 48,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveInfo: {
    padding: 12,
  },
  liveName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveVisitors: {
    color: '#22C55E',
    fontSize: 12,
    marginTop: 4,
  },
  eventCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    flexDirection: 'row',
  },
  eventBanner: {
    width: 100,
    height: 100,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventEmoji: {
    fontSize: 40,
  },
  eventInfo: {
    flex: 1,
    padding: 12,
  },
  eventName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventTagline: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaText: {
    color: '#64748B',
    fontSize: 11,
  },
  eventDate: {
    color: '#6366F1',
    fontSize: 11,
    marginTop: 4,
  },
});
