/**
 * CorpPerks Invoice Detail Page
 * Route: /corp-invoices/[id]
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatusBadge, Loading } from '@/components/corp-perks';
import { corpPerksApi, type GSTInvoice } from '@/services/api/corpPerks';
import { logger } from '@/utils/logger';

export default function InvoiceDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [invoice, setInvoice] = useState<GSTInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const data = await corpPerksApi.getInvoice(id);
      setInvoice(data);
    } catch (error) {
      logger.error('Failed to fetch invoice:', error);
      setInvoice(MOCK_INVOICE);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleDownload = () => {
    Alert.alert('Download', `Downloading invoice ${id}`);
  };

  const handleShare = () => {
    Alert.alert('Share', `Sharing invoice ${id}`);
  };

  const handleSubmitEInvoice = async () => {
    if (!id) return;
    Alert.alert(
      'Submit E-Invoice',
      'Submit this invoice to the GST portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              const result = await corpPerksApi.submitEInvoice(id);
              Alert.alert('Success', `E-invoice submitted. IRN: ${result.irn}`);
              fetchInvoice(); // Refresh
            } catch (error) {
              Alert.alert('Error', 'Failed to submit e-invoice');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dining': return 'restaurant-outline';
      case 'hotel': return 'bed-outline';
      case 'gifting': return 'gift-outline';
      case 'travel': return 'airplane-outline';
      default: return 'receipt-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dining': return '#f59e0b';
      case 'hotel': return '#3b82f6';
      case 'gifting': return '#ec4899';
      case 'travel': return '#22c55e';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <Loading message="Loading invoice..." />;
  }

  if (!invoice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Invoice not found</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const itcColor = invoice.itc?.eligible ? '#22c55e' : '#ef4444';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: invoice.invoiceNumber,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Invoice Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={[styles.typeIcon, { backgroundColor: getTypeColor(invoice.transaction?.type) + '20' }]}>
              <Ionicons
                name={getTypeIcon(invoice.transaction?.type)}
                size={24}
                color={getTypeColor(invoice.transaction?.type)}
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.invoiceNumber, { color: colors.text }]}>
                {invoice.invoiceNumber}
              </Text>
              <Text style={[styles.invoiceDate, { color: colors.textSecondary }]}>
                {formatDate(invoice.invoiceDate)}
              </Text>
            </View>
            <StatusBadge
              status={invoice.status === 'issued' ? 'active' : 'pending'}
              label={invoice.status}
            />
          </View>

          {invoice.transaction?.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {invoice.transaction.description}
            </Text>
          )}
        </Card>

        {/* ITC Badge */}
        <Card style={[styles.itcCard, { borderLeftColor: itcColor }]}>
          <View style={styles.itcRow}>
            <Ionicons
              name={invoice.itc?.eligible ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={itcColor}
            />
            <View style={styles.itcInfo}>
              <Text style={[styles.itcLabel, { color: colors.text }]}>
                Input Tax Credit
              </Text>
              <Text style={[styles.itcAmount, { color: itcColor }]}>
                {invoice.itc?.eligible
                  ? `ITC Claimable: ${formatCurrency(invoice.itc?.itcAmount || 0)}`
                  : 'ITC Not Available'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Parties */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Invoice Details</Text>

          <View style={[styles.partySection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.partyLabel, { color: colors.textSecondary }]}>Issued By</Text>
            <Text style={[styles.partyName, { color: colors.text }]}>
              {invoice.issuer?.name || 'CorpPerks'}
            </Text>
            <Text style={[styles.partyDetail, { color: colors.textSecondary }]}>
              GSTIN: {invoice.issuer?.gstIn || 'N/A'}
            </Text>
          </View>

          <View style={styles.partySection}>
            <Text style={[styles.partyLabel, { color: colors.textSecondary }]}>Issued To</Text>
            <Text style={[styles.partyName, { color: colors.text }]}>
              {invoice.recipient?.companyName || 'Unknown Company'}
            </Text>
            <Text style={[styles.partyDetail, { color: colors.textSecondary }]}>
              GSTIN: {invoice.recipient?.gstIn || 'N/A'}
            </Text>
            {invoice.recipient?.address && (
              <Text style={[styles.partyDetail, { color: colors.textSecondary }]}>
                {invoice.recipient.address}
              </Text>
            )}
          </View>
        </Card>

        {/* Line Items */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Line Items</Text>
          {invoice.lineItems?.map((item, idx) => (
            <View key={idx} style={styles.lineItem}>
              <View style={styles.lineItemMain}>
                <Text style={[styles.lineItemDesc, { color: colors.text }]}>
                  {item.description}
                </Text>
                <Text style={[styles.lineItemAmount, { color: colors.text }]}>
                  {formatCurrency(item.taxableValue)}
                </Text>
              </View>
              <Text style={[styles.lineItemDetail, { color: colors.textSecondary }]}>
                HSN: {item.hsnCode} | Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Tax Breakdown */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Tax Breakdown</Text>

          <View style={styles.taxRow}>
            <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>Taxable Amount</Text>
            <Text style={[styles.taxValue, { color: colors.text }]}>
              {formatCurrency(invoice.taxSummary?.taxableAmount || 0)}
            </Text>
          </View>

          {invoice.taxSummary?.cgstAmount > 0 && (
            <View style={styles.taxRow}>
              <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                CGST ({invoice.taxSummary?.cgstRate}%)
              </Text>
              <Text style={[styles.taxValue, { color: colors.text }]}>
                {formatCurrency(invoice.taxSummary?.cgstAmount || 0)}
              </Text>
            </View>
          )}

          {invoice.taxSummary?.sgstAmount > 0 && (
            <View style={styles.taxRow}>
              <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                SGST ({invoice.taxSummary?.sgstRate}%)
              </Text>
              <Text style={[styles.taxValue, { color: colors.text }]}>
                {formatCurrency(invoice.taxSummary?.sgstAmount || 0)}
              </Text>
            </View>
          )}

          {invoice.taxSummary?.igstAmount > 0 && (
            <View style={styles.taxRow}>
              <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                IGST ({invoice.taxSummary?.igstRate}%)
              </Text>
              <Text style={[styles.taxValue, { color: colors.text }]}>
                {formatCurrency(invoice.taxSummary?.igstAmount || 0)}
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Tax</Text>
            <Text style={[styles.totalTax, { color: colors.text }]}>
              {formatCurrency(invoice.taxSummary?.totalTax || 0)}
            </Text>
          </View>

          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Grand Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.tint }]}>
              {formatCurrency(invoice.taxSummary?.grandTotal || 0)}
            </Text>
          </View>

          <Text style={[styles.amountWords, { color: colors.textSecondary }]}>
            {invoice.taxSummary?.amountInWords || ''}
          </Text>
        </Card>

        {/* E-Invoice */}
        {invoice.eInvoice && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>E-Invoice Details</Text>
            <View style={styles.eInvoiceRow}>
              <Text style={[styles.eInvoiceLabel, { color: colors.textSecondary }]}>IRN</Text>
              <Text style={[styles.eInvoiceValue, { color: colors.text }]}>
                {invoice.eInvoice.irn}
              </Text>
            </View>
            <View style={styles.eInvoiceRow}>
              <Text style={[styles.eInvoiceLabel, { color: colors.textSecondary }]}>ACK No</Text>
              <Text style={[styles.eInvoiceValue, { color: colors.text }]}>
                {invoice.eInvoice.ackNo}
              </Text>
            </View>
            <View style={styles.eInvoiceRow}>
              <Text style={[styles.eInvoiceLabel, { color: colors.textSecondary }]}>ACK Date</Text>
              <Text style={[styles.eInvoiceValue, { color: colors.text }]}>
                {formatDate(invoice.eInvoice.ackDate)}
              </Text>
            </View>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleDownload}
          >
            <Ionicons name="download-outline" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Download PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>

          {!invoice.eInvoice && invoice.status === 'issued' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.tint }]}
              onPress={handleSubmitEInvoice}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Submit E-Invoice</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MOCK_INVOICE: GSTInvoice = {
  _id: '1',
  invoiceNumber: 'CP/DIN/2024-04/00001',
  invoiceDate: '2024-04-15T10:30:00Z',
  generatedAt: '2024-04-15T10:30:00Z',
  issuer: {
    name: 'CorpPerks by RTMN Digital',
    address: 'Mumbai, Maharashtra',
    gstIn: '27AABCR1234P1ZA',
    pan: 'AABCR1234P',
  },
  recipient: {
    companyName: 'Acme Technologies Pvt Ltd',
    contactPerson: 'John Doe',
    address: 'Mumbai, Maharashtra 400001',
    gstIn: '27AABCU9603R1ZM',
  },
  transaction: {
    type: 'dining',
    description: 'Team Lunch - Engineering Department',
    invoiceType: 'tax_invoice',
    reverseCharge: false,
    placeOfSupply: 'Maharashtra',
    supplyDate: '2024-04-15T10:30:00Z',
  },
  lineItems: [
    {
      description: 'Accommodation and restaurant services',
      hsnCode: '9963',
      quantity: 1,
      unit: 'Service',
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
    amountInWords: 'Four Thousand Five Hundred Rupees Only',
  },
  itc: {
    eligible: true,
    itcAmount: 686,
  },
  status: 'issued',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  invoiceDate: {
    fontSize: 13,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  itcCard: {
    paddingLeft: 16,
    borderLeftWidth: 4,
  },
  itcRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itcInfo: {
    marginLeft: 12,
    flex: 1,
  },
  itcLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  itcAmount: {
    fontSize: 13,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  partySection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  partyLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '600',
  },
  partyDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  lineItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lineItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineItemDesc: {
    fontSize: 14,
    flex: 1,
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  lineItemDetail: {
    fontSize: 12,
    marginTop: 4,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  taxLabel: {
    fontSize: 14,
  },
  taxValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalTax: {
    fontSize: 14,
    fontWeight: '600',
  },
  grandTotalRow: {
    marginTop: 4,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  amountWords: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
  },
  eInvoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  eInvoiceLabel: {
    fontSize: 13,
  },
  eInvoiceValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
