/**
 * Suppliers Screen - NextaBizz Integration
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
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4320';

interface Supplier {
  id: string;
  businessName: string;
  category: string;
  city: string;
  rating: number;
  verified: boolean;
}

export function SuppliersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers', category],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/suppliers?category=${category}`);
      const json = await res.json();
      return json.data || [];
    },
  });

  const filteredSuppliers = suppliers?.filter(
    (s) =>
      s.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'food', label: 'Food & Beverages' },
    { id: 'packaging', label: 'Packaging' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'cleaning', label: 'Cleaning' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Suppliers</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or city..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.categoryFilter}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                category === item.id && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(item.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === item.id && styles.categoryChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredSuppliers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.supplierCard}>
              <View style={styles.supplierHeader}>
                <Text style={styles.supplierName}>{item.businessName}</Text>
                {item.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                )}
              </View>
              <View style={styles.supplierMeta}>
                <Text style={styles.metaText}>{item.category}</Text>
                <Text style={styles.metaText}>📍 {item.city}</Text>
              </View>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Rating:</Text>
                <Text style={styles.ratingValue}>
                  {'★'.repeat(Math.floor(item.rating))}
                  {'☆'.repeat(5 - Math.floor(item.rating))}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No suppliers found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  searchInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  categoryFilter: { paddingHorizontal: 20, marginBottom: 10 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    marginRight: 10,
  },
  categoryChipActive: { backgroundColor: '#6366f1' },
  categoryChipText: { color: '#64748b', fontSize: 14 },
  categoryChipTextActive: { color: '#fff' },
  loader: { marginTop: 50 },
  list: { padding: 20 },
  supplierCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  supplierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supplierName: { fontSize: 18, fontWeight: '600', color: '#fff' },
  verifiedBadge: { backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  supplierMeta: { flexDirection: 'row', marginTop: 8, gap: 16 },
  metaText: { color: '#64748b', fontSize: 14 },
  ratingRow: { flexDirection: 'row', marginTop: 8, alignItems: 'center' },
  ratingLabel: { color: '#64748b', marginRight: 8 },
  ratingValue: { color: '#f59e0b', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 50 },
});
