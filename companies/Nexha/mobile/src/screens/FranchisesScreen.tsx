/**
 * Franchises Screen
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

interface Franchise {
  id: string;
  brandName: string;
  investment: string;
  roi: string;
  category: string;
  verified: boolean;
}

const mockFranchises: Franchise[] = [
  {
    id: '1',
    brandName: 'BurgerBox',
    investment: '₹15-25 Lakhs',
    roi: '18-24 months',
    category: 'QSR',
    verified: true,
  },
  {
    id: '2',
    brandName: 'GlowSalon',
    investment: '₹8-15 Lakhs',
    roi: '12-18 months',
    category: 'Beauty',
    verified: true,
  },
  {
    id: '3',
    brandName: 'FitZone Pro',
    investment: '₹25-40 Lakhs',
    roi: '24-30 months',
    category: 'Fitness',
    verified: true,
  },
];

export function FranchisesScreen() {
  const renderFranchise = ({ item }: { item: Franchise }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>🏪</Text>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.brandName}</Text>
            {item.verified && <Text style={styles.verified}>✓ Verified</Text>}
          </View>
          <Text style={styles.category}>{item.category}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{item.investment}</Text>
          <Text style={styles.metricLabel}>Investment</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{item.roi}</Text>
          <Text style={styles.metricLabel}>ROI Period</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Get Details</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Invest in Proven Brands</Text>
        <Text style={styles.heroSubtitle}>
          Browse {mockFranchises.length} franchise opportunities
        </Text>
      </View>

      <FlatList
        data={mockFranchises}
        keyExtractor={item => item.id}
        renderItem={renderFranchise}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  hero: {
    backgroundColor: '#667eea',
    padding: 24,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 28,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  verified: {
    marginLeft: 8,
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  category: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  metrics: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metric: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#a855f7',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
