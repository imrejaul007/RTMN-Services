/**
 * Z Events - Profile Screen
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function ProfileScreen() {
  const user = { name: 'Rajesh Kumar', email: 'rajesh@example.com', tickets: 3, connections: 12 };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name[0]}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.tickets}</Text>
          <Text style={styles.statLabel}>Tickets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.connections}</Text>
          <Text style={styles.statLabel}>Connections</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>156</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {[
          { icon: '🎫', label: 'My Tickets' },
          { icon: '🔗', label: 'Connections' },
          { icon: '💰', label: 'Coin History' },
          { icon: '📋', label: 'My Exhibitions' },
          { icon: '⚙️', label: 'Settings' },
          { icon: '❓', label: 'Help & Support' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { alignItems: 'center', paddingVertical: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  name: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  email: { color: '#64748B', fontSize: 14, marginTop: 4 },
  stats: { flexDirection: 'row', backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 16, padding: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#64748B', fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#334155' },
  menu: { padding: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  menuIcon: { fontSize: 24, marginRight: 16 },
  menuLabel: { flex: 1, color: '#FFF', fontSize: 16 },
  menuArrow: { color: '#64748B', fontSize: 24 },
});
