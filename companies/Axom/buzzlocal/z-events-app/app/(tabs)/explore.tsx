/**
 * Z Events - Explore Screen
 * Search and discover events
 */

import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

const mockSearchResults = [
  { id: '1', name: 'Tech India Expo', city: 'Mumbai', category: 'Tech' },
  { id: '2', name: 'Startup Summit', city: 'Bangalore', category: 'Business' },
  { id: '3', name: 'Auto Expo', city: 'Delhi', category: 'Automotive' },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events, exhibitors, topics..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filters}>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>📍 Near Me</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>📅 This Week</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>🔥 Trending</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Popular Topics</Text>
      <View style={styles.topicsGrid}>
        {['AI', 'Cloud', 'IoT', 'Blockchain', '5G', 'EV', 'Healthcare', 'EdTech'].map((topic) => (
          <TouchableOpacity key={topic} style={styles.topicChip}>
            <Text style={styles.topicText}>#{topic}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Searches</Text>
      {['Tech Expo 2026', 'Startup Pitch', 'AI Conference'].map((search, i) => (
        <TouchableOpacity key={i} style={styles.recentItem}>
          <Text style={styles.recentText}>🔍 {search}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  searchContainer: { marginBottom: 16 },
  searchInput: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 16 },
  filters: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  filterChip: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  filterText: { color: '#FFF', fontSize: 14 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  topicChip: { backgroundColor: '#334155', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  topicText: { color: '#6366F1', fontSize: 14 },
  recentItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  recentText: { color: '#94A3B8', fontSize: 14 },
});
