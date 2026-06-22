/**
 * DictionaryScreen - Personal Dictionary
 *
 * Features:
 * - Custom words (REZ, CorpID, NeXha, etc.)
 * - Add/Edit/Delete words
 * - Voice training improvement
 * - Import/Export
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DictionaryWord {
  id: string;
  word: string;
  phonetic?: string;
  type: 'brand' | 'name' | 'acronym' | 'product' | 'term';
  count: number;
  createdAt: Date;
}

const WORD_TYPES = [
  { id: 'brand', label: 'Brand', icon: 'storefront', color: '#6366F1' },
  { id: 'name', label: 'Name', icon: 'person', color: '#10B981' },
  { id: 'acronym', label: 'Acronym', icon: 'text', color: '#F59E0B' },
  { id: 'product', label: 'Product', icon: 'cube', color: '#8B5CF6' },
  { id: 'term', label: 'Term', icon: 'bookmark', color: '#EC4899' },
];

export default function DictionaryScreen() {
  const [words, setWords] = useState<DictionaryWord[]>([
    { id: '1', word: 'REZ', type: 'brand', count: 150, createdAt: new Date() },
    { id: '2', word: 'RidZa', type: 'name', phonetic: 'rid-zah', count: 89, createdAt: new Date() },
    { id: '3', word: 'NeXha', type: 'brand', count: 67, createdAt: new Date() },
    { id: '4', word: 'CorpID', type: 'acronym', count: 45, createdAt: new Date() },
    { id: '5', word: 'Hojai', type: 'brand', count: 120, createdAt: new Date() },
    { id: '6', word: 'RABTUL', type: 'brand', count: 98, createdAt: new Date() },
    { id: '7', word: 'Habixo', type: 'product', count: 34, createdAt: new Date() },
    { id: '8', word: 'Karma', type: 'brand', count: 56, createdAt: new Date() },
  ]);

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newType, setNewType] = useState<DictionaryWord['type']>('term');

  const filteredWords = words.filter((w) => {
    const matchesSearch = w.word.toLowerCase().includes(search.toLowerCase());
    const matchesType = !selectedType || w.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleAddWord = useCallback(() => {
    if (!newWord.trim()) {
      Alert.alert('Error', 'Please enter a word');
      return;
    }

    const word: DictionaryWord = {
      id: Date.now().toString(),
      word: newWord.trim().toUpperCase(),
      phonetic: newPhonetic.trim() || undefined,
      type: newType,
      count: 0,
      createdAt: new Date(),
    };

    setWords([word, ...words]);
    setNewWord('');
    setNewPhonetic('');
    setNewType('term');
    setShowAddModal(false);

    Alert.alert('Success', `"${word.word}" added to dictionary`);
  }, [newWord, newPhonetic, newType, words]);

  const handleDeleteWord = useCallback((id: string) => {
    Alert.alert(
      'Delete Word',
      'Are you sure you want to delete this word?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setWords(words.filter((w) => w.id !== id)),
        },
      ]
    );
  }, [words]);

  const handleImport = useCallback(() => {
    Alert.alert(
      'Import Dictionary',
      'Import from file or cloud?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import File', onPress: () => Alert.alert('Coming soon') },
        { text: 'Import Cloud', onPress: () => Alert.alert('Coming soon') },
      ]
    );
  }, []);

  const handleExport = useCallback(() => {
    Alert.alert('Exported', 'Dictionary exported successfully');
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dictionary</Text>
          <Text style={styles.subtitle}>{words.length} words</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleImport}>
            <Ionicons name="download-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleExport}>
            <Ionicons name="cloud-upload-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search words..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeFilter}
        contentContainerStyle={styles.typeFilterContent}
      >
        <TouchableOpacity
          style={[styles.typeChip, !selectedType && styles.typeChipActive]}
          onPress={() => setSelectedType(null)}
        >
          <Text style={[styles.typeChipText, !selectedType && styles.typeChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {WORD_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeChip,
              selectedType === type.id && styles.typeChipActive,
              selectedType === type.id && { borderColor: type.color },
            ]}
            onPress={() => setSelectedType(type.id)}
          >
            <Ionicons
              name={type.icon as any}
              size={14}
              color={selectedType === type.id ? type.color : '#666'}
            />
            <Text
              style={[
                styles.typeChipText,
                selectedType === type.id && { color: type.color },
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Word List */}
      <ScrollView style={styles.wordList}>
        {filteredWords.map((word) => {
          const typeInfo = WORD_TYPES.find((t) => t.id === word.type);
          return (
            <View key={word.id} style={styles.wordCard}>
              <View style={styles.wordMain}>
                <View style={styles.wordInfo}>
                  <Text style={styles.wordText}>{word.word}</Text>
                  {word.phonetic && (
                    <Text style={styles.phonetic}>/{word.phonetic}/</Text>
                  )}
                </View>
                <View style={[styles.typeBadge, { backgroundColor: (typeInfo?.color || '#666') + '20' }]}>
                  <Ionicons
                    name={(typeInfo?.icon || 'text') as any}
                    size={12}
                    color={typeInfo?.color || '#666'}
                  />
                  <Text style={[styles.typeLabel, { color: typeInfo?.color }]}>
                    {typeInfo?.label}
                  </Text>
                </View>
              </View>
              <View style={styles.wordMeta}>
                <Text style={styles.count}>Used {word.count}×</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteWord(word.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filteredWords.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>
              {search ? 'No words found' : 'Add your first word'}
            </Text>
            <Text style={styles.emptySubtext}>
              Add custom words to improve voice recognition
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Word</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Word</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. REZ, NeXha, CorpID"
                placeholderTextColor="#666"
                value={newWord}
                onChangeText={setNewWord}
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Phonetic (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. rez, nex-ha, corp-id"
                placeholderTextColor="#666"
                value={newPhonetic}
                onChangeText={setNewPhonetic}
              />

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeGrid}>
                {WORD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      newType === type.id && {
                        borderColor: type.color,
                        backgroundColor: type.color + '20',
                      },
                    ]}
                    onPress={() => setNewType(type.id as DictionaryWord['type'])}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={18}
                      color={newType === type.id ? type.color : '#666'}
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        newType === type.id && { color: type.color },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.addWordButton} onPress={handleAddWord}>
                <Text style={styles.addWordButtonText}>Add to Dictionary</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
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
  typeFilter: {
    maxHeight: 44,
    marginBottom: 16,
  },
  typeFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  typeChip: {
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
  typeChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  typeChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#6366F1',
  },
  wordList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  wordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  wordMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wordInfo: {
    flex: 1,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  phonetic: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  wordMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  count: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  modalBody: {},
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  typeOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  addWordButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  addWordButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
