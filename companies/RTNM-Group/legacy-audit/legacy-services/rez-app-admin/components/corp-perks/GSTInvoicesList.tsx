/**
 * CorpPerks GST Invoices Page
 *
 * View and manage GST invoices for corporate transactions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { Card, StatsCard, StatusBadge, Loading, EmptyState, TabSelector, formatCurrency, formatDate } from './index';
import { corpPerksApi, type GSTInvoice } from '../../services/api/corpPerks';
import { logger } from '../../utils/logger';

export default function GSTInvoicesPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [invoices, setInvoices] = useState<GSTInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const fetchInvoices = useCallback(async () => {
    try {
      const result = await corpPerksApi.getInvoices({ limit: 50 });
      setInvoices(result.data);
    } catch (error) {
      logger.error('Failed to fetch invoices:', error);
      setInvoices(MOCK_INVOICES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.recipient?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.recipient?.gstIn?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || inv.transaction?.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalITCClaimable = invoices.reduce((sum, inv) => sum + (inv.itc?.itcAmount || 0), 0);
  const totalTaxCollected = invoices.reduce((sum, inv) => sum + (inv.taxSummary?.totalTax || 0), 0);
  const totalInvoiceValue = invoices.reduce((sum, inv) => sum + (inv.taxSummary?.grandTotal || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dining':
        return 'restaurant-outline';
      case 'hotel':
        return 'bed-outline';
      case 'gifting':
        return 'gift-outline';
      case 'travel':
        return 'airplane-outline';
      default:
        return 'receipt-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dining':
        return '#f59e0b';
      case 'hotel':
        return '#3b82f6';
      case 'gifting':
        return '#ec4899';
      case 'travel':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'dining', label: 'Dining' },
    { key: 'hotel', label: 'Hotel' },
    { key: 'gifting', label: 'Gifting' },
  ];

  if (loading) {
    return <Loading message="Loading invoices..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>GST Invoices</Text>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.tint }]}
            onPress={async () => {
              try {
                const report = await corpPerksApi.generateGSTR1(
                  new Date().getMonth() + 1,
                  new Date().getFullYear()
                );
                Alert.alert('GSTR-1 Report', `Generated ${report.invoices.length} invoices for the period`);
              } catch (error) {
                Alert.alert('Export', 'Export GSTR-1 report');
              }
            }}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by invoice #, company, or GSTIN..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Invoice Value"
          value={formatCurrency(totalInvoiceValue)}
          icon="receipt-outline"
          iconColor="#3b82f6"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="ITC Claimable"
          value={formatCurrency(totalITCClaimable)}
          icon="checkmark-circle-outline"
          iconColor="#22c55e"
        />
      </View>

      <View style={styles.statsRow}>
        <StatsCard
          title="Tax Collected"
          value={formatCurrency(totalTaxCollected)}
          icon="cash-outline"
          iconColor="#f59e0b"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Total Invoices"
          value={invoices.length}
          icon="document-text-outline"
          iconColor="#8b5cf6"
        />
      </View>

      {/* Filter Tabs */}
      <TabSelector tabs={tabs} selected={filterType} onSelect={setFilterType} />

      {/* Invoice List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredInvoices.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No Invoices Found"
            message="GST invoices will appear here when corporate transactions are made"
          />
        ) : (
          filteredInvoices.map((invoice) => (
            <TouchableOpacity
              key={invoice._id}
              onPress={() => router.push(`/corp-invoices/${invoice.invoiceNumber}`)}
            >
              <Card>
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceInfo}>
                    <View style={styles.invoiceTitleRow}>
                      <Text style={[styles.invoiceNumber, { color: colors.text }]}>
                        {invoice.invoiceNumber}
                      </Text>
                      <StatusBadge
                        status={invoice.status === 'issued' ? 'active' : 'pending'}
                        label={invoice.status}
                      />
                    </View>
                    <Text style={[styles.invoiceDate, { color: colors.textSecondary }]}>
                      {formatDate(invoice.invoiceDate)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: getTypeColor(invoice.transaction?.type) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getTypeIcon(invoice.transaction?.type)}
                      size={20}
                      color={getTypeColor(invoice.transaction?.type)}
                    />
                  </View>
                </View>

                <View style={[styles.companyRow, { borderTopColor: colors.border }]}>
                  <View style={styles.companyInfo}>
                    <Text style={[styles.companyName, { color: colors.text }]}>
                      {invoice.recipient?.companyName || 'Unknown Company'}
                    </Text>
                    <Text style={[styles.gstIn, { color: colors.textSecondary }]}>
                      GSTIN: {invoice.recipient?.gstIn || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.itcBadge}>
                    <Ionicons
                      name={invoice.itc?.eligible ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={invoice.itc?.eligible ? '#22c55e' : '#ef4444'}
                    />
                    <Text
                      style={[
                        styles.itcText,
                        { color: invoice.itc?.eligible ? '#22c55e' : '#ef4444' },
                      ]}
                    >
                      ITC {invoice.itc?.eligible ? '✓' : '✗'}
                    </Text>
                  </View>
                </View>

                {/* Tax Breakdown */}
                <View style={[styles.taxSection, { borderTopColor: colors.border }]}>
                  <View style={styles.taxRow}>
                    <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                      Taxable Amount
                    </Text>
                    <Text style={[styles.taxValue, { color: colors.text }]}>
                      {formatCurrency(invoice.taxSummary?.taxableAmount || 0)}
                    </Text>
                  </View>
                  <View style={styles.taxRow}>
                    <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                      CGST + SGST
                    </Text>
                    <Text style={[styles.taxValue, { color: colors.text }]}>
                      {formatCurrency(
                        (invoice.taxSummary?.cgstAmount || 0) +
                          (invoice.taxSummary?.sgstAmount || 0)
                      )}
                    </Text>
                  </View>
                  <View style={[styles.taxRow, styles.totalRow]}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.totalValue, { color: colors.tint }]}>
                      {formatCurrency(invoice.taxSummary?.grandTotal || 0)}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.background }]}
                    onPress={() => Alert.alert('Download', `Download invoice ${invoice.invoiceNumber}`)}
                  >
                    <Ionicons name="download-outline" size={16} color={colors.text} />
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.background }]}
                    onPress={() => Alert.alert('Share', `Share invoice ${invoice.invoiceNumber}`)}
                  >
                    <Ionicons name="share-outline" size={16} color={colors.text} />
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>Share</Text>
                  </TouchableOpacity>
                  {invoice.itc?.eligible && (
                    <View style={[styles.actionButton, { backgroundColor: '#22c55e20' }]}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
                      <Text style={[styles.actionButtonText, { color: '#22c55e' }]}>
                        ITC {formatCurrency(invoice.itc?.itcAmount || 0)}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Mock data for demo
const MOCK_INVOICES: GSTInvoice[] = [
  {
    _id: '1',
    invoiceNumber: 'CP/DIN/2024-04/00001',
    invoiceDate: '2024-04-15T10:30:00Z',
    generatedAt: '2024-04-15T10:30:00Z',
    issuer: {
      name: 'CorpPerks Services',
      address: 'Mumbai, Maharashtra',
      gstIn: '27AABCC0000A1Z5',
      pan: 'AABCU9603R',
    },
    recipient: {
      companyName: 'Acme Technologies Pvt Ltd',
      gstIn: '27AABCU9603R1ZM',
    },
    transaction: {
      type: 'dining',
      description: 'Team Lunch - Engineering Department',
      invoiceType: 'tax_invoice',
      reverseCharge: false,
      placeOfSupply: 'Maharashtra',
      supplyDate: '2024-04-15',
    },
    lineItems: [
      {
        description: 'Team Lunch - Engineering Department',
        hsnCode: '9963',
        quantity: 1,
        unit: 'service',
        unitPrice: 3814,
        totalPrice: 3814,
        discount: 0,
        taxableValue: 3814,
      },
    ],
    taxSummary: {
      taxableAmount: 3814,
      cgstRate: 9,
      cgstAmount: 343,
      sgstRate: 9,
      sgstAmount: 343,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 686,
      grandTotal: 4500,
      amountInWords: 'Four Thousand Five Hundred Only',
    },
    itc: {
      eligible: true,
      itcAmount: 686,
    },
    status: 'issued',
  },
  {
    _id: '2',
    invoiceNumber: 'CP/HOT/2024-04/00002',
    invoiceDate: '2024-04-18T14:00:00Z',
    generatedAt: '2024-04-18T14:00:00Z',
    issuer: {
      name: 'CorpPerks Services',
      address: 'Mumbai, Maharashtra',
      gstIn: '27AABCC0000A1Z5',
      pan: 'AABCU9603R',
    },
    recipient: {
      companyName: 'Acme Technologies Pvt Ltd',
      gstIn: '27AABCU9603R1ZM',
    },
    transaction: {
      type: 'hotel',
      description: 'Hotel Stay - Client Visit Mumbai',
      invoiceType: 'tax_invoice',
      reverseCharge: false,
      placeOfSupply: 'Maharashtra',
      supplyDate: '2024-04-18',
    },
    lineItems: [
      {
        description: 'Hotel Stay - Client Visit Mumbai',
        hsnCode: '9963',
        quantity: 3,
        unit: 'nights',
        unitPrice: 3571,
        totalPrice: 10714,
        discount: 0,
        taxableValue: 10714,
      },
    ],
    itc: {
      eligible: true,
      itcAmount: 5358,
    },
    status: 'issued',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  invoiceDate: {
    fontSize: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 12,
  },
  companyInfo: {},
  companyName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  gstIn: {
    fontSize: 11,
  },
  itcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itcText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taxSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 12,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  taxLabel: {
    fontSize: 12,
  },
  taxValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 6,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
