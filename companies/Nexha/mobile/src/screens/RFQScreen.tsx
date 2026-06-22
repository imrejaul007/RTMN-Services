/**
 * RFQ Screen
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

interface RFQ {
  id: string;
  title: string;
  status: 'draft' | 'open' | 'quoted' | 'awarded' | 'closed';
  itemsCount: number;
  deadline: string;
}

const mockRFQs: RFQ[] = [
  {
    id: '1',
    title: 'QSR Packaging Materials',
    status: 'open',
    itemsCount: 5,
    deadline: 'May 25, 2026',
  },
  {
    id: '2',
    title: 'Restaurant Equipment',
    status: 'quoted',
    itemsCount: 12,
    deadline: 'May 20, 2026',
  },
  {
    id: '3',
    title: 'Cleaning Supplies',
    status: 'awarded',
    itemsCount: 8,
    deadline: 'May 15, 2026',
  },
];

const statusColors: Record<RFQ['status'], string> = {
  draft: '#6b7280',
  open: '#3b82f6',
  quoted: '#f59e0b',
  awarded: '#10b981',
  closed: '#6b7280',
};

const statusLabels: Record<RFQ['status'], string> = {
  draft: 'Draft',
  open: 'Open for Quotes',
  quoted: 'Quotes Received',
  awarded: 'Awarded',
  closed: 'Closed',
};

export function RFQScreen() {
  const renderRFQ = ({ item }: { item: RFQ }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.title}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColors[item.status] + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: statusColors[item.status] }]}
          >
            {statusLabels[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Items</Text>
          <Text style={styles.detailValue}>{item.itemsCount}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Deadline</Text>
          <Text style={styles.detailValue}>{item.deadline}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My RFQs</Text>
        <TouchableOpacity style={styles.createButton}>
          <Text style={styles.createButtonText}>+ Create RFQ</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={mockRFQs}
        keyExtractor={item => item.id}
        renderItem={renderRFQ}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No RFQs yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first request for quotation
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  createButton: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  details: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: '#a855f7',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
