import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mallService, MallStats } from '../../services/api/mall';
import { Colors } from '../../constants/Colors';

interface Props {
  colors: any;
  onNavigate: (tab: string, action?: () => void) => void;
}

export default function MallDashboard({ colors, onNavigate }: Props) {
  const [stats, setStats] = useState<MallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStats = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);
      const data = await mallService.getStats();
      setStats(data);
    } catch (e: any) {
      logger.error('Failed to load mall stats:', e);
      setLoadError(e.message || 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.icon }]}>Loading stats...</Text>
      </View>
    );
  }

  if (loadError && !stats) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
        <Text style={[{ color: colors.text, fontSize: 16, fontWeight: '600' }]}>
          Failed to load
        </Text>
        <Text style={[{ color: colors.icon, textAlign: 'center', paddingHorizontal: 32 }]}>
          {loadError}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.tint }]}
          onPress={() => loadStats()}
        >
          <Ionicons name="refresh" size={16} color={colors.card} />
          <Text style={{ color: colors.card, fontWeight: '600', marginLeft: 6 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statCards = [
    {
      label: 'Mall Stores',
      value: stats?.totalMallStores ?? 0,
      icon: 'business' as const,
      color: colors.navy,
    },
    {
      label: 'Total Brands',
      value: stats?.totalBrands ?? 0,
      icon: 'storefront' as const,
      color: Colors.light.info,
    },
    {
      label: 'Active Brands',
      value: stats?.activeBrands ?? 0,
      icon: 'checkmark-circle' as const,
      color: Colors.light.success,
    },
    {
      label: 'Categories',
      value: stats?.totalCategories ?? 0,
      icon: 'apps' as const,
      color: colors.purple,
    },
    {
      label: 'Active Offers',
      value: `${stats?.activeOffers ?? 0}/${stats?.totalOffers ?? 0}`,
      icon: 'pricetag' as const,
      color: Colors.light.warning,
    },
    {
      label: 'Banners',
      value: `${stats?.activeBanners ?? 0}/${stats?.totalBanners ?? 0}`,
      icon: 'image' as const,
      color: colors.pink || '#EC4899',
    },
    {
      label: 'Collections',
      value: `${stats?.activeCollections ?? 0}/${stats?.totalCollections ?? 0}`,
      icon: 'albums' as const,
      color: colors.cyan || '#06B6D4',
    },
    {
      label: 'Active Categories',
      value: stats?.activeCategories ?? 0,
      icon: 'checkmark' as const,
      color: '#14B8A6',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadStats(true)}
          tintColor={colors.tint}
        />
      }
    >
      <Text style={[styles.sectionHeader, { color: colors.text }]}>Mall Overview</Text>
      <View style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${card.color}15` }]}>
              <Ionicons name={card.icon} size={22} color={card.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 24 }]}>
        Quick Actions
      </Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: `${colors.purple}20` }]}
          onPress={() => onNavigate('categories')}
        >
          <Ionicons name="add-circle" size={20} color={colors.purple} />
          <Text style={[styles.quickActionText, { color: colors.purple }]}>Add Category</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: Colors.light.warning + '20' }]}
          onPress={() => onNavigate('offers')}
        >
          <Ionicons name="add-circle" size={20} color={Colors.light.warning} />
          <Text style={[styles.quickActionText, { color: Colors.light.warning }]}>Add Offer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: (colors.pink || '#EC4899') + '20' }]}
          onPress={() => onNavigate('banners')}
        >
          <Ionicons name="add-circle" size={20} color={colors.pink || '#EC4899'} />
          <Text style={[styles.quickActionText, { color: colors.pink || '#EC4899' }]}>
            Add Banner
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: (colors.cyan || '#06B6D4') + '20' }]}
          onPress={() => onNavigate('collections')}
        >
          <Ionicons name="add-circle" size={20} color={colors.cyan || '#06B6D4'} />
          <Text style={[styles.quickActionText, { color: colors.cyan || '#06B6D4' }]}>
            Add Collection
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: Colors.light.info + '20' }]}
          onPress={() => onNavigate('alliance')}
        >
          <Ionicons name="add-circle" size={20} color={Colors.light.info} />
          <Text style={[styles.quickActionText, { color: Colors.light.info }]}>
            Alliance Stores
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', padding: 16, borderRadius: 14, alignItems: 'center', gap: 8 },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickActionText: { fontSize: 13, fontWeight: '600' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
});
