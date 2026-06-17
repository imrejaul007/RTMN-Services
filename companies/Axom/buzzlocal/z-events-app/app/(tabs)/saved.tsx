/**
 * Z Events - Saved Screen
 * Saved events, exhibitors, sessions
 */

import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const mockSaved = [
  { id: '1', type: 'event', name: 'Tech India Expo', date: 'Aug 15-17', savedAt: '2 days ago' },
  { id: '2', type: 'exhibitor', name: 'TechCorp India', booth: 'A-12', savedAt: '1 week ago' },
  { id: '3', type: 'session', name: 'Future of AI Panel', speaker: 'Dr. Smith', savedAt: '3 days ago' },
];

const getIcon = (type: string) => {
  switch (type) {
    case 'event': return '🎪';
    case 'exhibitor': return '🏢';
    case 'session': return '🎤';
    default: return '📌';
  }
};

export default function SavedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Saved</Text>
      <FlatList
        data={mockSaved}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.savedCard}>
            <Text style={styles.icon}>{getIcon(item.type)}</Text>
            <View style={styles.savedInfo}>
              <Text style={styles.savedName}>{item.name}</Text>
              <Text style={styles.savedMeta}>
                {item.date || item.booth || item.speaker}
              </Text>
            </View>
            <TouchableOpacity style={styles.unsaveButton}>
              <Text style={styles.unsaveText}>❤️</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>❤️</Text>
            <Text style={styles.emptyText}>Nothing saved yet</Text>
            <Text style={styles.emptyHint}>Tap the heart icon to save events, exhibitors, and sessions</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  header: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  list: { gap: 12 },
  savedCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 32, marginRight: 12 },
  savedInfo: { flex: 1 },
  savedName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  savedMeta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  unsaveButton: { padding: 8 },
  unsaveText: { fontSize: 20 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
