/**
 * MemoryScreen - Everything Hojai knows about you
 *
 * Features:
 * - View all memories by tier
 * - Add/Edit/Delete memories
 * - Search memories
 * - Clear memories
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFlowStore } from '../store/flowStore';
import { getMemory, storeMemory } from '../services/flowApi';
import type { MemoryEntry } from '../types';

const TIER_CONFIG = [
  { id: 'l1_working', label: 'Working', icon: 'flash', color: '#F59E0B', desc: 'Current conversation' },
  { id: 'l2_episodic', label: 'Recent', icon: 'time', color: '#3B82F6', desc: 'Last 24 hours' },
  { id: 'l3_procedural', label: 'How-tos', icon: 'book', color: '#10B981', desc: 'Instructions & habits' },
  { id: 'l4_semantic', label: 'Facts', icon: 'information-circle', color: '#8B5CF6', desc: 'Preferences & knowledge' },
  { id: 'l5_world', label: 'World', icon: 'globe', color: '#EC4899', desc: 'General knowledge' },
];

export default function MemoryScreen() {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { memories, setMemories, addMemory, removeMemory } = useFlowStore();

  // Load memories on mount
  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setIsRefreshing(true);
    try {
      const tiers = selectedTier ? [selectedTier] : undefined;
      const response = await getMemory({
        userId: 'current_user',
        tiers,
      });

      if (response.success) {
        setMemories(response.data);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddMemory = useCallback(async () => {
    Alert.prompt(
      'Add Memory',
      'What would you like Hojai to remember?',
      async (text) => {
        if (text?.trim()) {
          try {
            const response = await storeMemory({
              userId: 'current_user',
              content: text.trim(),
              tier: selectedTier || 'l4_semantic',
              importance: 5,
            });

            if (response.success) {
              addMemory(response.data);
            }
          } catch (error) {
            console.error('Failed to store memory:', error);
          }
        }
      },
      'plain-text'
    );
  }, [selectedTier, addMemory]);

  const handleDeleteMemory = useCallback((id: string) => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to forget this?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeMemory(id),
        },
      ]
    );
  }, [removeMemory]);

  // Filter memories by search
  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(search.toLowerCase())
  );

  // Group by tier
  const memoriesByTier = TIER_CONFIG.reduce((acc, tier) => {
    acc[tier.id] = filteredMemories.filter((m) => m.tier === tier.id);
    return acc;
  }, {} as Record<string, MemoryEntry[]>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Memory</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddMemory}>
          <Ionicons name="add" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search memories..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Tier Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tierFilter}
        contentContainerStyle={styles.tierFilterContent}
      >
        <TouchableOpacity
          style={[styles.tierChip, !selectedTier && styles.tierChipActive]}
          onPress={() => setSelectedTier(null)}
        >
          <Text style={[styles.tierChipText, !selectedTier && styles.tierChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {TIER_CONFIG.map((tier) => (
          <TouchableOpacity
            key={tier.id}
            style={[
              styles.tierChip,
              selectedTier === tier.id && styles.tierChipActive,
              { borderColor: tier.color },
            ]}
            onPress={() => setSelectedTier(tier.id)}
          >
            <Ionicons
              name={tier.icon as any}
              size={14}
              color={selectedTier === tier.id ? tier.color : '#666'}
            />
            <Text
              style={[
                styles.tierChipText,
                selectedTier === tier.id && { color: tier.color },
              ]}
            >
              {tier.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Memory List */}
      <ScrollView
        style={styles.memoryList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadMemories} />
        }
      >
        {selectedTier ? (
          // Show single tier
          <View style={styles.tierSection}>
            <View style={styles.tierHeader}>
              <View style={[styles.tierDot, { backgroundColor: TIER_CONFIG.find(t => t.id === selectedTier)?.color }]} />
              <Text style={styles.tierTitle}>
                {TIER_CONFIG.find(t => t.id === selectedTier)?.label}
              </Text>
              <Text style={styles.tierCount}>{memoriesByTier[selectedTier]?.length || 0}</Text>
            </View>
            {memoriesByTier[selectedTier]?.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onDelete={() => handleDeleteMemory(memory.id)}
              />
            ))}
          </View>
        ) : (
          // Show all tiers
          TIER_CONFIG.map((tier) => {
            const tierMemories = memoriesByTier[tier.id] || [];
            if (tierMemories.length === 0) return null;

            return (
              <View key={tier.id} style={styles.tierSection}>
                <View style={styles.tierHeader}>
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <Text style={styles.tierTitle}>{tier.label}</Text>
                  <Text style={styles.tierDesc}>{tier.desc}</Text>
                  <Text style={styles.tierCount}>{tierMemories.length}</Text>
                </View>
                {tierMemories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onDelete={() => handleDeleteMemory(memory.id)}
                  />
                ))}
              </View>
            );
          })
        )}

        {filteredMemories.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="brain" size={48} color="#333" />
            <Text style={styles.emptyText}>No memories yet</Text>
            <Text style={styles.emptySubtext}>
              Start talking to Hojai and I'll remember things for you
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MemoryCard({
  memory,
  onDelete,
}: {
  memory: MemoryEntry;
  onDelete: () => void;
}) {
  return (
    <View style={styles.memoryCard}>
      <Text style={styles.memoryContent}>{memory.content}</Text>
      <View style={styles.memoryMeta}>
        <Text style={styles.memoryDate}>
          {new Date(memory.createdAt).toLocaleDateString()}
        </Text>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={16} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
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
  tierFilter: {
    maxHeight: 44,
    marginBottom: 16,
  },
  tierFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  tierChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  tierChipText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  tierChipTextActive: {
    color: '#6366F1',
  },
  memoryList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tierSection: {
    marginBottom: 24,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  tierDesc: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  tierCount: {
    fontSize: 12,
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  memoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  memoryContent: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 22,
  },
  memoryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  memoryDate: {
    fontSize: 12,
    color: '#666',
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
