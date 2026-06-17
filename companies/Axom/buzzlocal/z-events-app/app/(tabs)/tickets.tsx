/**
 * Z Events - Tickets Screen
 * View purchased tickets
 */

import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const mockTickets = [
  { id: 'T001', eventName: 'Tech India Expo 2026', date: 'Aug 15-17, 2026', type: 'VIP', status: 'upcoming', qrCode: 'QR-001' },
  { id: 'T002', eventName: 'Startup Summit', date: 'Jul 20, 2026', type: 'General', status: 'used', qrCode: 'QR-002' },
];

export default function TicketsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Tickets</Text>
      <FlatList
        data={mockTickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.ticketCard}>
            <View style={[styles.ticketStatus, { backgroundColor: item.status === 'upcoming' ? '#22C55E' : '#64748B' }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.eventName}>{item.eventName}</Text>
            <Text style={styles.ticketDate}>📅 {item.date}</Text>
            <View style={styles.ticketFooter}>
              <Text style={styles.ticketType}>{item.type}</Text>
              {item.status === 'upcoming' && (
                <TouchableOpacity style={styles.viewQRButton}>
                  <Text style={styles.viewQRText}>View QR</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎫</Text>
            <Text style={styles.emptyText}>No tickets yet</Text>
            <TouchableOpacity style={styles.browseButton}>
              <Text style={styles.browseText}>Browse Events</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  header: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  list: { gap: 16 },
  ticketCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12 },
  ticketStatus: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  eventName: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  ticketDate: { color: '#94A3B8', fontSize: 14 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  ticketType: { color: '#6366F1', fontSize: 14, fontWeight: '600' },
  viewQRButton: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  viewQRText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: '#64748B', fontSize: 16, marginBottom: 20 },
  browseButton: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  browseText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
