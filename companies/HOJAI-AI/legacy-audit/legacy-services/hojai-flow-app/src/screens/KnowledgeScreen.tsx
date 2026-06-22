/**
 * KnowledgeScreen - Documents, Policies, Company Knowledge
 *
 * Features:
 * - Search knowledge base
 * - Browse by category
 * - View documents
 * - Add knowledge
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchKnowledge } from '../services/flowApi';
import type { KnowledgeItem } from '../types';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'library' },
  { id: 'document', label: 'Documents', icon: 'document-text' },
  { id: 'policy', label: 'Policies', icon: 'shield-checkmark' },
  { id: 'contact', label: 'Contacts', icon: 'person' },
  { id: 'company', label: 'Companies', icon: 'business' },
  { id: 'product', label: 'Products', icon: 'cube' },
];

export default function KnowledgeScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchKnowledge({
        userId: 'current_user',
        query: search.trim(),
      });

      if (response.success) {
        setResults(response.data.map((item, index) => ({
          id: `result_${index}`,
          title: item.title,
          content: item.content,
          type: 'document' as const,
          relevance: item.relevance,
          lastUpdated: new Date(),
        })));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [search]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Knowledge</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search knowledge..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={selectedCategory === cat.id ? '#6366F1' : '#666'}
            />
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat.id && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      <ScrollView style={styles.resultsContainer}>
        {isSearching ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : results.length > 0 ? (
          results.map((item) => (
            <KnowledgeCard key={item.id} item={item} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="library" size={48} color="#333" />
            <Text style={styles.emptyText}>
              {search ? 'No results found' : 'Search for anything'}
            </Text>
            <Text style={styles.emptySubtext}>
              {search
                ? 'Try different keywords'
                : 'Documents, policies, contacts, and more'}
            </Text>
          </View>
        )}

        {/* Quick Access */}
        {!search && (
          <View style={styles.quickAccess}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickGrid}>
              <QuickAccessCard
                icon="shield-checkmark"
                title="Refund Policy"
                subtitle="Last updated 2 days ago"
              />
              <QuickAccessCard
                icon="document-text"
                title="Onboarding Guide"
                subtitle="Last updated 1 week ago"
              />
              <QuickAccessCard
                icon="people"
                title="Team Directory"
                subtitle="25 contacts"
              />
              <QuickAccessCard
                icon="cube"
                title="Product Catalog"
                subtitle="150 products"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  return (
    <View style={styles.knowledgeCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.relevance && (
          <View style={styles.relevanceBadge}>
            <Text style={styles.relevanceText}>
              {Math.round(item.relevance * 100)}% match
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.cardContent} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.typeBadge}>
          <Ionicons name="tag" size={12} color="#6366F1" />
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function QuickAccessCard({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <TouchableOpacity style={styles.quickCard}>
      <Ionicons name={icon as any} size={24} color="#6366F1" />
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 12,
    marginLeft: 8,
  },
  categoryScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  categoryLabel: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#6366F1',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
    marginTop: 8,
  },
  quickAccess: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 8,
  },
  quickSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  knowledgeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  relevanceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  relevanceText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  cardContent: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#6366F1',
    textTransform: 'capitalize',
  },
});
