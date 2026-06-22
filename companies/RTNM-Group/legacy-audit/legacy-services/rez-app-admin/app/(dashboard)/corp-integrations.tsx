/**
 * CorpPerks Integrations Dashboard
 * Route: /corp-integrations
 *
 * Manage all CorpPerks integrations:
 * - Hotel OTA (Makcorps)
 * - NextaBizz (Gifting)
 * - RTMN Finance (Wallet/BNPL)
 * - HRIS Systems
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatusBadge } from '@/components/corp-perks';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  category: 'ota' | 'procurement' | 'finance' | 'hris';
  status: 'connected' | 'disconnected' | 'pending';
  features: string[];
  docsUrl?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'makcorps',
    name: 'Makcorps',
    description: 'Hotel booking API for corporate hotel reservations',
    icon: 'bed-outline',
    color: '#3b82f6',
    category: 'ota',
    status: 'connected',
    features: [
      'Hotel search & booking',
      'Corporate rates',
      'GST-ready invoices',
      'Real-time availability',
      'Multi-city support',
    ],
    docsUrl: 'https://docs.makcorps.com',
  },
  {
    id: 'nextabizz',
    name: 'NextaBizz',
    description: 'Corporate gifting procurement and bulk orders',
    icon: 'gift-outline',
    color: '#ec4899',
    category: 'procurement',
    status: 'connected',
    features: [
      'Gift catalog',
      'Bulk ordering',
      'Branded merchandise',
      'Multi-vendor sourcing',
      'GST invoices',
    ],
    docsUrl: 'https://docs.nextabizz.com',
  },
  {
    id: 'rtmn-finance',
    name: 'RTMN Finance',
    description: 'Corporate wallet, BNPL, and expense management',
    icon: 'wallet-outline',
    color: '#22c55e',
    category: 'finance',
    status: 'connected',
    features: [
      'Corporate wallet',
      'Expense cards',
      'BNPL plans',
      'GST optimization',
      'Payroll integration',
    ],
    docsUrl: 'https://docs.rtmn.finance',
  },
  {
    id: 'greythr',
    name: 'GreytHR',
    description: 'HRIS integration for employee sync',
    icon: 'people-outline',
    color: '#f59e0b',
    category: 'hris',
    status: 'connected',
    features: [
      'Auto employee sync',
      'Department mapping',
      'Status updates',
      'Bulk import',
    ],
    docsUrl: 'https://docs.greythr.com',
  },
  {
    id: 'zoho-people',
    name: 'Zoho People',
    description: 'HRIS integration for employee management',
    icon: 'people-circle-outline',
    color: '#ef4444',
    category: 'hris',
    status: 'disconnected',
    features: [
      'Employee sync',
      'Department import',
      'Role mapping',
    ],
    docsUrl: 'https://www.zoho.com/people/help',
  },
  {
    id: 'workday',
    name: 'Workday',
    description: 'Enterprise HRIS integration',
    icon: 'briefcase-outline',
    color: '#8b5cf6',
    category: 'hris',
    status: 'pending',
    features: [
      'Enterprise sync',
      'Custom fields',
      'Advanced mapping',
    ],
    docsUrl: 'https://docs.workday.com',
  },
];

export default function CorpIntegrationsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredIntegrations = integrations.filter(
    (i) => filterCategory === 'all' || i.category === filterCategory
  );

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const totalCount = integrations.length;

  const getStatusConfig = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return { color: '#22c55e', label: 'Connected', icon: 'checkmark-circle' as const };
      case 'disconnected':
        return { color: '#6b7280', label: 'Not Connected', icon: 'close-circle' as const };
      case 'pending':
        return { color: '#f59e0b', label: 'Setup Pending', icon: 'time' as const };
    }
  };

  const handleConnect = (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    Alert.alert(
      `Connect ${integration?.name}`,
      'This would open the OAuth/API key configuration flow for this integration.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Configure', onPress: () => Alert.alert('Demo', 'Configuration modal would open') },
      ]
    );
  };

  const handleDisconnect = (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    Alert.alert(
      `Disconnect ${integration?.name}`,
      'Are you sure you want to disconnect this integration? This may affect existing bookings and orders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setIntegrations((prev) =>
              prev.map((i) => (i.id === id ? { ...i, status: 'disconnected' } : i))
            );
            Alert.alert('Disconnected', `${integration?.name} has been disconnected.`);
          },
        },
      ]
    );
  };

  const openDocs = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const categories = [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'ota', label: 'Hotel OTA', icon: 'bed-outline' },
    { key: 'procurement', label: 'Procurement', icon: 'gift-outline' },
    { key: 'finance', label: 'Finance', icon: 'wallet-outline' },
    { key: 'hris', label: 'HRIS', icon: 'people-outline' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Integrations</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Connect external services to CorpPerks
        </Text>
      </View>

      {/* Status Summary */}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          </View>
          <View>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{connectedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Connected</Text>
          </View>
        </Card>
        <Card style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="extension-puzzle-outline" size={24} color="#3b82f6" />
          </View>
          <View>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{totalCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Available</Text>
          </View>
        </Card>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.card },
                filterCategory === cat.key && { backgroundColor: colors.tint },
              ]}
              onPress={() => setFilterCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={filterCategory === cat.key ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  { color: filterCategory === cat.key ? '#fff' : colors.text },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Integrations List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredIntegrations.map((integration) => {
          const statusConfig = getStatusConfig(integration.status);
          const isConnected = integration.status === 'connected';

          return (
            <Card key={integration.id}>
              <View style={styles.integrationHeader}>
                <View style={[styles.integrationIcon, { backgroundColor: integration.color + '20' }]}>
                  <Ionicons
                    name={integration.icon}
                    size={28}
                    color={integration.color}
                  />
                </View>
                <View style={styles.integrationInfo}>
                  <Text style={[styles.integrationName, { color: colors.text }]}>
                    {integration.name}
                  </Text>
                  <Text style={[styles.integrationDesc, { color: colors.textSecondary }]}>
                    {integration.description}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                  <Ionicons
                    name={statusConfig.icon}
                    size={14}
                    color={statusConfig.color}
                  />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {integration.features.map((feature, idx) => (
                  <View key={idx} style={[styles.featureChip, { backgroundColor: colors.background }]}>
                    <Ionicons name="checkmark" size={12} color={colors.textSecondary} />
                    <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Actions */}
              <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.docsButton}
                  onPress={() => openDocs(integration.docsUrl)}
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.docsButtonText, { color: colors.textSecondary }]}>
                    Docs
                  </Text>
                </TouchableOpacity>

                {isConnected ? (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: '#ef4444' }]}
                    onPress={() => handleDisconnect(integration.id)}
                  >
                    <Ionicons name="link-outline" size={16} color="#ef4444" />
                    <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                      Disconnect
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.tint }]}
                    onPress={() => handleConnect(integration.id)}
                  >
                    <Ionicons name="link-outline" size={16} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                      {integration.status === 'pending' ? 'Complete Setup' : 'Connect'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        })}

        {/* Add New Integration */}
        <TouchableOpacity
          style={[styles.addCard, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => Alert.alert('Request Integration', 'API to request new integrations would open')}
        >
          <View style={[styles.addIcon, { backgroundColor: colors.background }]}>
            <Ionicons name="add" size={24} color={colors.textSecondary} />
          </View>
          <Text style={[styles.addText, { color: colors.textSecondary }]}>
            Request New Integration
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  integrationIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  integrationDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  featureText: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  docsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  docsButtonText: {
    fontSize: 13,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 12,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
