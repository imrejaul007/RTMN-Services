/**
 * BuzzLocal - Nearby Businesses Screen
 * Local business discovery and offers
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../src/constants';

const MOCK_BUSINESSES = [
  { id: '1', name: 'Pizza Hub', type: 'Restaurant', rating: 4.5, reviews: 234, distance: '0.3 km', image: '🍕', offers: '2', open: true },
  { id: '2', name: 'Cafe Coffee Day', type: 'Cafe', rating: 4.2, reviews: 567, distance: '0.5 km', image: '☕', offers: '1', open: true },
  { id: '3', name: 'FitZone Gym', type: 'Gym', rating: 4.7, reviews: 123, distance: '0.8 km', image: '💪', offers: '0', open: true },
  { id: '4', name: 'Spice Garden', type: 'Restaurant', rating: 4.4, reviews: 456, distance: '1.2 km', image: '🍛', offers: '3', open: false },
];

const CATEGORIES = ['All', 'Restaurant', 'Cafe', 'Gym', 'Salon', 'Shopping'];

export default function BusinessScreen() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nearby</Text>
          <Text style={styles.headerSubtitle}>Discover local businesses</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants, cafes..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          <View style={styles.categories}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Offers Banner */}
        <View style={styles.offerBanner}>
          <View style={styles.offerContent}>
            <Text style={styles.offerTitle}>🎉 Local Offers</Text>
            <Text style={styles.offerSubtitle}>15 offers nearby</Text>
          </View>
          <TouchableOpacity style={styles.offerButton}>
            <Text style={styles.offerButtonText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Business List */}
        <View style={styles.businessList}>
          {MOCK_BUSINESSES.map((biz) => (
            <TouchableOpacity key={biz.id} style={styles.businessCard}>
              <View style={styles.businessImage}>
                <Text style={styles.businessEmoji}>{biz.image}</Text>
              </View>
              <View style={styles.businessContent}>
                <View style={styles.businessHeader}>
                  <Text style={styles.businessName}>{biz.name}</Text>
                  {biz.offers !== '0' && (
                    <View style={styles.offerBadge}>
                      <Text style={styles.offerBadgeText}>{biz.offers} offers</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.businessType}>{biz.type}</Text>
                <View style={styles.businessMeta}>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={14} color={COLORS.warning} />
                    <Text style={styles.ratingText}>{biz.rating}</Text>
                    <Text style={styles.reviewsText}>({biz.reviews})</Text>
                  </View>
                  <Text style={styles.distance}>
                    <Ionicons name="location" size={12} color={COLORS.textMuted} /> {biz.distance}
                  </Text>
                </View>
              </View>
              <View style={[styles.openBadge, { backgroundColor: biz.open ? COLORS.success + '20' : COLORS.error + '20' }]}>
                <Text style={[styles.openText, { color: biz.open ? COLORS.success : COLORS.error }]}>
                  {biz.open ? 'Open' : 'Closed'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  searchContainer: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, gap: 10 },
  searchInput: { flex: 1, paddingVertical: SPACING.md, fontSize: 16, color: COLORS.text },
  categoriesScroll: { marginBottom: SPACING.md },
  categories: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  categoryChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.card, borderRadius: RADIUS.full },
  categoryChipActive: { backgroundColor: COLORS.primary },
  categoryText: { fontSize: 14, color: COLORS.textSecondary },
  categoryTextActive: { color: '#fff', fontWeight: '600' },
  offerBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '15', marginHorizontal: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  offerContent: { flex: 1 },
  offerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  offerSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  offerButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  offerButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  businessList: { paddingHorizontal: SPACING.md },
  businessCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  businessImage: { width: 80, height: 80, borderRadius: RADIUS.md, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  businessEmoji: { fontSize: 36 },
  businessContent: { flex: 1, marginLeft: SPACING.md },
  businessHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  businessName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  offerBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  offerBadgeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  businessType: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  businessMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  reviewsText: { fontSize: 12, color: COLORS.textMuted },
  distance: { marginLeft: 12, fontSize: 12, color: COLORS.textMuted },
  openBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
  openText: { fontSize: 11, fontWeight: '600' },
});
