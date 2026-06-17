/**
 * BuzzLocal - Feed Screen
 * Local news, events, offers, alerts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, FEED_CATEGORIES } from '../../src/constants';

const MOCK_FEED = [
  {
    id: '1',
    type: 'offer',
    title: '50% Off on All Pizzas Today!',
    description: 'Celebrating our first week with amazing deals!',
    business: { name: 'Pizza Hub', rating: 4.5 },
    location: 'Koramangala',
    likes: 567,
    comments: 89,
    expiresIn: '5 hours',
  },
  {
    id: '2',
    type: 'alert',
    title: 'Heavy Traffic on MG Road',
    description: 'Expect 30 min delays due to road work.',
    severity: 'warning',
    location: 'MG Road',
    timeAgo: '15 min ago',
  },
  {
    id: '3',
    type: 'event',
    title: 'Weekend Jazz Night at UB City',
    description: 'Live jazz performance by local artists.',
    date: 'Sat, 7 PM',
    location: 'UB City',
    attendees: 234,
  },
  {
    id: '4',
    type: 'news',
    title: 'New Park Inaugurated in HSR Layout',
    description: 'A green oasis opens with jogging track and gym.',
    author: 'BBMP',
    location: 'HSR Layout',
    likes: 1234,
    timeAgo: '2 hours ago',
  },
  {
    id: '5',
    type: 'news',
    title: 'New Italian Restaurant Opens',
    description: 'Pasta Paradise brings authentic Italian cuisine.',
    author: 'Local Guide',
    location: 'Koramangala',
    likes: 234,
    timeAgo: '3 hours ago',
  },
];

export default function FeedScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      offer: 'pricetag',
      alert: 'warning',
      event: 'calendar',
      news: 'newspaper',
    };
    return icons[type] || 'newspaper';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      offer: COLORS.primary,
      alert: COLORS.warning,
      event: COLORS.accent,
      news: COLORS.info,
    };
    return colors[type] || COLORS.primary;
  };

  const renderFeedItem = (item: any) => (
    <TouchableOpacity key={item.id} style={styles.feedCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
          <Ionicons name={getTypeIcon(item.type) as any} size={14} color={getTypeColor(item.type)} />
          <Text style={[styles.typeLabel, { color: getTypeColor(item.type) }]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.location}>
          <Ionicons name="location" size={12} color={COLORS.textMuted} />
          {' '}{item.location}
        </Text>
      </View>

      {/* Content */}
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>

      {/* Meta */}
      {item.business && (
        <View style={styles.cardMeta}>
          <Ionicons name="storefront-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.business.name}</Text>
          <Ionicons name="star" size={12} color={COLORS.warning} />
          <Text style={styles.metaText}>{item.business.rating}</Text>
        </View>
      )}

      {item.attendees && (
        <View style={styles.cardMeta}>
          <Ionicons name="people" size={14} color={COLORS.accent} />
          <Text style={styles.metaText}>{item.attendees} going</Text>
          <Text style={styles.metaText}> • {item.date}</Text>
        </View>
      )}

      {item.expiresIn && (
        <View style={styles.cardMeta}>
          <Ionicons name="time" size={14} color={COLORS.primary} />
          <Text style={styles.metaText}>Expires in {item.expiresIn}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="bookmark-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>BuzzLocal</Text>
          <Text style={styles.headerSubtitle}>Koramangala, Bangalore</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categories}
      >
        {FEED_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={activeCategory === cat.id ? '#fff' : COLORS.textSecondary}
            />
            <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed */}
      <ScrollView
        contentContainerStyle={styles.feedList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {MOCK_FEED.map(renderFeedItem)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    maxHeight: 50,
  },
  categories: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  feedList: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  feedCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  location: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
