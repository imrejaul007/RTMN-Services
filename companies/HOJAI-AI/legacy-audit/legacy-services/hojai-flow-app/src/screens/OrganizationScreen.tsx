/**
 * OrganizationScreen - Organization Knowledge Management
 *
 * For businesses to add policies, products, scripts, objection handling
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Section = 'policies' | 'products' | 'scripts' | 'objections';

interface Policy {
  id: string;
  title: string;
  content: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  pricing: string;
}

export default function OrganizationScreen() {
  const [activeSection, setActiveSection] = useState<Section>('policies');
  const [orgName] = useState('REZ Corp');

  const [policies] = useState<Policy[]>([
    { id: '1', title: 'Refund Policy', content: 'Full refund within 7 days' },
    { id: '2', title: 'Shipping Policy', content: 'Free shipping above ₹499' },
  ]);

  const [products] = useState<Product[]>([
    { id: '1', name: 'Premium Plan', description: 'Unlimited access', pricing: '₹999/mo' },
  ]);

  const handleAdd = () => {
    Alert.alert('Add Knowledge', 'Select type', [
      { text: 'Policy', onPress: () => Alert.alert('Add Policy') },
      { text: 'Product', onPress: () => Alert.alert('Add Product') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{orgName}</Text>
        <Text style={styles.subtitle}>Organization Knowledge</Text>
      </View>

      {/* Section Tabs */}
      <View style={styles.tabs}>
        <Tab
          label="Policies"
          count={policies.length}
          active={activeSection === 'policies'}
          onPress={() => setActiveSection('policies')}
          icon="shield-checkmark"
        />
        <Tab
          label="Products"
          count={products.length}
          active={activeSection === 'products'}
          onPress={() => setActiveSection('products')}
          icon="cube"
        />
        <Tab
          label="Scripts"
          count={0}
          active={activeSection === 'scripts'}
          onPress={() => setActiveSection('scripts')}
          icon="document-text"
        />
        <Tab
          label="Objections"
          count={0}
          active={activeSection === 'objections'}
          onPress={() => setActiveSection('objections')}
          icon="chatbubbles"
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeSection === 'policies' && (
          <View>
            <Text style={styles.sectionTitle}>Policies</Text>
            {policies.map((p) => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.cardTitle}>{p.title}</Text>
                <Text style={styles.cardDesc}>{p.content}</Text>
              </View>
            ))}
          </View>
        )}

        {activeSection === 'products' && (
          <View>
            <Text style={styles.sectionTitle}>Products</Text>
            {products.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{p.name}</Text>
                  <Text style={styles.price}>{p.pricing}</Text>
                </View>
                <Text style={styles.cardDesc}>{p.description}</Text>
              </View>
            ))}
          </View>
        )}

        {activeSection === 'scripts' && (
          <View style={styles.empty}>
            <Ionicons name="document-text" size={48} color="#333" />
            <Text style={styles.emptyText}>Scripts coming soon</Text>
          </View>
        )}

        {activeSection === 'objections' && (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles" size={48} color="#333" />
            <Text style={styles.emptyText}>Objections coming soon</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

function Tab({
  label,
  count,
  active,
  onPress,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  icon: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={active ? '#6366F1' : '#666'}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  tabLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#6366F1',
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  price: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
