/**
 * KarmaScore Admin Dashboard
 * Overview of KarmaScore distribution, top performers, and band analytics.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BAND_COLORS: Record<string, string> = {
  starter:   '#9CA3AF',
  active:    '#10B981',
  performer:  '#3B82F6',
  leader:    '#8B5CF6',
  elite:     '#F59E0B',
  pinnacle:  '#EF4444',
};

const BAND_ORDER = ['starter', 'active', 'performer', 'leader', 'elite', 'pinnacle'];

// Mock data — replace with API calls to karma service
const MOCK_BAND_DISTRIBUTION = [
  { band: 'starter',   count: 2847, pct: 57.2 },
  { band: 'active',   count: 1203, pct: 24.2 },
  { band: 'performer',count:  532, pct: 10.7 },
  { band: 'leader',   count:  231, pct:  4.6 },
  { band: 'elite',    count:   82, pct:  1.6 },
  { band: 'pinnacle', count:   28, pct:  0.6 },
];

const MOCK_TOP_PERFORMERS = [
  { userId: 'user_001', displayName: 'Priya S.', score: 887, band: 'pinnacle', karma: 15420 },
  { userId: 'user_002', displayName: 'Rahul K.', score: 872, band: 'elite', karma: 12300 },
  { userId: 'user_003', displayName: 'Anita M.', score: 854, band: 'elite', karma: 9800 },
  { userId: 'user_004', displayName: 'Vikram R.', score: 791, band: 'leader', karma: 8200 },
  { userId: 'user_005', displayName: 'Sunita L.', score: 745, band: 'leader', karma: 7600 },
];

export default function KarmaScoreDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBand, setSelectedBand] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredPerformers = MOCK_TOP_PERFORMERS.filter(p =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.userId.includes(searchQuery),
  );

  const renderBandRow = ({ item }: { item: typeof MOCK_BAND_DISTRIBUTION[0] }) => (
    <TouchableOpacity
      style={[styles.bandRow, selectedBand === item.band && styles.bandRowSelected]}
      onPress={() => setSelectedBand(selectedBand === item.band ? null : item.band)}
    >
      <View style={[styles.bandDot, { backgroundColor: BAND_COLORS[item.band] }]} />
      <Text style={styles.bandName}>{item.band.toUpperCase()}</Text>
      <Text style={styles.bandCount}>{item.count.toLocaleString()}</Text>
      <Text style={styles.bandPct}>{item.pct}%</Text>
      <View style={styles.bandBarBg}>
        <View style={[styles.bandBarFill, { width: `${item.pct}%`, backgroundColor: BAND_COLORS[item.band] }]} />
      </View>
    </TouchableOpacity>
  );

  const renderPerformer = ({ item, index }: { item: typeof MOCK_TOP_PERFORMERS[0]; index: number }) => (
    <View style={styles.performerRow}>
      <Text style={styles.performerRank}>#{index + 1}</Text>
      <View style={[styles.rankBadge, { backgroundColor: BAND_COLORS[item.band] + '22' }]}>
        <Text style={[styles.rankBadgeText, { color: BAND_COLORS[item.band] }]}>{item.band}</Text>
      </View>
      <View style={styles.performerInfo}>
        <Text style={styles.performerName}>{item.displayName}</Text>
        <Text style={styles.performerKarma}>{item.karma.toLocaleString()} karma</Text>
      </View>
      <Text style={styles.performerScore}>{item.score}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>KarmaScore</Text>
          <Text style={styles.subtitle}>Impact score analytics</Text>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>4,923</Text>
            <Text style={styles.summaryLabel}>Active Users</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>892</Text>
            <Text style={styles.summaryLabel}>Avg Score</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>28</Text>
            <Text style={styles.summaryLabel}>Pinnacle</Text>
          </View>
        </View>

        {/* Band distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Band Distribution</Text>
          <FlatList
            data={MOCK_BAND_DISTRIBUTION}
            renderItem={renderBandRow}
            keyExtractor={item => item.band}
            scrollEnabled={false}
          />
        </View>

        {/* Top performers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
            <Ionicons name="trophy" size={18} color="#F59E0B" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {filteredPerformers.map((item, i) => renderPerformer({ item, index: i }))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flex: 1 },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#F8FAFC' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  summaryCard: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#F8FAFC' },
  summaryLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginBottom: 12 },
  bandRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 6, gap: 10 },
  bandRowSelected: { borderWidth: 1, borderColor: '#3B82F6' },
  bandDot: { width: 10, height: 10, borderRadius: 5 },
  bandName: { fontSize: 12, fontWeight: '700', color: '#F8FAFC', width: 70 },
  bandCount: { fontSize: 13, color: '#94A3B8', flex: 1 },
  bandPct: { fontSize: 13, fontWeight: '600', color: '#F8FAFC', width: 40, textAlign: 'right' },
  bandBarBg: { width: 60, height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  bandBarFill: { height: 6, borderRadius: 3 },
  searchInput: { backgroundColor: '#1E293B', borderRadius: 10, padding: 12, color: '#F8FAFC', marginBottom: 12, fontSize: 14 },
  performerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 6, gap: 10 },
  performerRank: { fontSize: 13, fontWeight: '700', color: '#94A3B8', width: 24 },
  rankBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rankBadgeText: { fontSize: 10, fontWeight: '700' },
  performerInfo: { flex: 1 },
  performerName: { fontSize: 14, fontWeight: '600', color: '#F8FAFC' },
  performerKarma: { fontSize: 12, color: '#94A3B8' },
  performerScore: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
});
