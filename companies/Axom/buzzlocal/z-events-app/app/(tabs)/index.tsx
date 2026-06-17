/**
 * Z Events - Home Screen with Real API
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { exhibitionAPI, Exhibition } from '../../src/services/exhibitionService';

const categories = ['All', 'Tech', 'Automotive', 'Healthcare', 'Retail', 'Food', 'Fashion', 'Sports'];

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [liveEvents, setLiveEvents] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExhibitions = useCallback(async () => {
    try {
      const response = await exhibitionAPI.getExhibitions({
        status: 'published',
        limit: 20,
      });
      setExhibitions(response.exhibitions || []);
      setLiveEvents(response.exhibitions.filter(e => e.status === 'live'));
    } catch (error) {
      console.error('Failed to load exhibitions:', error);
      // Use mock data as fallback
      setExhibitions(mockExhibitions);
      setLiveEvents(mockExhibitions.filter(e => e.is_live));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadExhibitions();
  }, [loadExhibitions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExhibitions();
  };

  const filteredExhibitions = exhibitions.filter((exhibition) => {
    const matchesSearch =
      exhibition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exhibition.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || exhibition.industry === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory && exhibition.status !== 'live';
  });

  const LiveEvent = ({ event }: { event: Exhibition }) => (
    <TouchableOpacity
      style={styles.liveCard}
      onPress={() => router.push(`/event/${event.exhibition_id || event.id}`)}
    >
      <View style={styles.liveBanner}>
        <Text style={styles.liveEmoji}>🎪</Text>
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

  const ExhibitionCard = ({ exhibition }: { exhibition: Exhibition }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => router.push(`/event/${exhibition.exhibition_id || exhibition.id}`)}
    >
      <View style={styles.eventBanner}>
        <Text style={styles.eventEmoji}>🎪</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventName}>{exhibition.name}</Text>
        <Text style={styles.eventTagline}>{exhibition.tagline || exhibition.description?.slice(0, 50)}</Text>
        <View style={styles.eventMeta}>
          <Text style={styles.metaText}>📍 {exhibition.city || 'TBD'}</Text>
          <Text style={styles.metaText}>🏢 {exhibition.exhibitor_count}+</Text>
        </View>
        <Text style={styles.eventDate}>📅 {exhibition.start_date}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
      }
    >
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
            keyExtractor={(item) => item.exhibition_id || item.id}
            renderItem={({ item }) => <LiveEvent event={item} />}
            contentContainerStyle={styles.liveList}
          />
        </View>
      )}

      {/* Upcoming Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {filteredExhibitions.map((exhibition) => (
          <ExhibitionCard key={exhibition.exhibition_id || exhibition.id} exhibition={exhibition} />
        ))}
        {filteredExhibitions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptyHint}>Try adjusting your search or filters</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// Mock data fallback
const mockExhibitions: Exhibition[] = [
  {
    id: 'EXH-001',
    exhibition_id: 'EXH-001',
    name: 'Tech India Expo 2026',
    tagline: 'Where Innovation Meets Opportunity',
    description: 'India\'s largest technology exhibition',
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
    tags: ['tech', 'ai', 'startup'],
  },
  {
    id: 'EXH-002',
    exhibition_id: 'EXH-002',
    name: 'AutoMobility India',
    tagline: 'The Future of Mobility',
    description: 'Leading automotive exhibition',
    industry: 'automotive',
    venue: 'India Expo Centre',
    city: 'Delhi NCR',
    start_date: '2026-09-01',
    end_date: '2026-09-03',
    ticket_price: 799,
    status: 'published',
    banner_image: '',
    exhibitor_count: 180,
    expected_visitors: 30000,
    tags: ['automotive', 'ev'],
  },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B', marginTop: 12, fontSize: 16 },
  searchContainer: { padding: 16 },
  searchInput: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 16 },
  categoriesContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  categoryChip: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryChipSelected: { backgroundColor: '#6366F1' },
  categoryText: { color: '#94A3B8', fontSize: 14 },
  categoryTextSelected: { color: '#FFF', fontWeight: '600' },
  section: { padding: 16 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  liveList: { gap: 12 },
  liveCard: { backgroundColor: '#1E293B', borderRadius: 16, overflow: 'hidden', width: 280, marginRight: 12, borderWidth: 2, borderColor: '#EF4444' },
  liveBanner: { height: 120, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  liveEmoji: { fontSize: 48 },
  liveBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  liveInfo: { padding: 12 },
  liveName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  liveVisitors: { color: '#22C55E', fontSize: 12, marginTop: 4 },
  eventCard: { backgroundColor: '#1E293B', borderRadius: 16, overflow: 'hidden', marginBottom: 16, flexDirection: 'row' },
  eventBanner: { width: 100, height: 100, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  eventEmoji: { fontSize: 40 },
  eventInfo: { flex: 1, padding: 12 },
  eventName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  eventTagline: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  eventMeta: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaText: { color: '#64748B', fontSize: 11 },
  eventDate: { color: '#6366F1', fontSize: 11, marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: '#64748B', fontSize: 14, marginTop: 8 },
});
