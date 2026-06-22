/**
 * Distributors Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = 'http://localhost:4300/api';

interface Distributor {
  id: string;
  businessName: string;
  city: string;
  state: string;
  type: string;
  rating: number;
  verified: boolean;
}

// Mock data for demo
const mockDistributors: Distributor[] = [
  {
    id: '1',
    businessName: 'Metro Foods Distribution',
    city: 'Mumbai',
    state: 'Maharashtra',
    type: 'distributor',
    rating: 4.8,
    verified: true,
  },
  {
    id: '2',
    businessName: 'Western Pharma Distributors',
    city: 'Ahmedabad',
    state: 'Gujarat',
    type: 'distributor',
    rating: 4.6,
    verified: true,
  },
  {
    id: '3',
    businessName: 'South India Grocery Hub',
    city: 'Chennai',
    state: 'Tamil Nadu',
    type: 'wholesaler',
    rating: 4.5,
    verified: true,
  },
];

export function DistributorsScreen() {
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const { data: distributors = mockDistributors, isLoading } = useQuery({
    queryKey: ['distributors', selectedCity],
    queryFn: async () => {
      try {
        const response = await axios.get(`${API_URL}/distributors`, {
          params: { city: selectedCity },
        });
        return response.data.data?.distributors || mockDistributors;
      } catch {
        return mockDistributors;
      }
    },
  });

  const filteredDistributors = distributors.filter(
    d =>
      d.businessName.toLowerCase().includes(search.toLowerCase()) ||
      d.city.toLowerCase().includes(search.toLowerCase())
  );

  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'];

  const renderDistributor = ({ item }: { item: Distributor }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>🚚</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{item.businessName}</Text>
            {item.verified && <Text style={styles.verified}>✓</Text>}
          </View>
          <Text style={styles.cardSubtitle}>
            {item.city}, {item.state}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.type}>{item.type}</Text>
        <Text style={styles.rating}>⭐ {item.rating}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search distributors..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={cities}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCity === item && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCity(selectedCity === item ? null : item)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCity === item && styles.filterTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredDistributors}
        keyExtractor={item => item.id}
        renderItem={renderDistributor}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No distributors found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#a855f7',
    borderColor: '#a855f7',
  },
  filterText: {
    color: '#6b7280',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  verified: {
    marginLeft: 4,
    color: '#10b981',
    fontSize: 14,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  type: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 32,
  },
});
