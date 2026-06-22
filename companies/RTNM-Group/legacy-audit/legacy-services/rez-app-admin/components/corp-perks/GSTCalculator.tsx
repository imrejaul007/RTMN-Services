/**
 * CorpPerks GST Calculator
 *
 * Calculate GST for corporate transactions with ITC tracking
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { Card } from './index';
import { corpPerksApi, type GSTCalculation } from '../../services/api/corpPerks';
import { logger } from '../../utils/logger';

interface GSTCalculatorProps {
  onCalculationComplete?: (calc: GSTCalculation) => void;
  onInvoiceCreate?: () => void;
}

const SERVICE_TYPES = [
  { value: 'dining', label: 'Dining', icon: 'restaurant-outline' },
  { value: 'hotel', label: 'Hotel', icon: 'bed-outline' },
  { value: 'gifting', label: 'Gifting', icon: 'gift-outline' },
  { value: 'travel', label: 'Travel', icon: 'airplane-outline' },
];

const STATE_CODES: Record<string, string> = {
  'Maharashtra': '27',
  'Delhi': '07',
  'Karnataka': '29',
  'Tamil Nadu': '33',
  'Gujarat': '24',
  'Uttar Pradesh': '09',
  'West Bengal': '19',
  'Rajasthan': '08',
  'Telangana': '36',
  'Andhra Pradesh': '37',
  'Kerala': '32',
  'Punjab': '03',
  'Haryana': '06',
  'Madhya Pradesh': '23',
  ' Bihar': '10',
  'Odisha': '21',
  'Assam': '18',
  'Jharkhand': '20',
  'Chhattisgarh': '22',
  ' Uttarakhand': '05',
  'Himachal Pradesh': '02',
  'Jammu & Kashmir': '01',
  'Goa': '30',
  'Puducherry': '34',
  'Chandigarh': '04',
  'Andaman & Nicobar': '35',
  'Ladakh': '38',
  'Other': '00',
};

export default function GSTCalculator({ onCalculationComplete, onInvoiceCreate }: GSTCalculatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [serviceType, setServiceType] = useState<string>('dining');
  const [amount, setAmount] = useState('');
  const [companyGSTIN, setCompanyGSTIN] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<GSTCalculation | null>(null);
  const [itcCheck, setItcCheck] = useState<{ eligible: boolean; itcAmount: number; reason?: string } | null>(null);

  const handleCalculate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    setCalculating(true);
    try {
      // Calculate GST
      const calc = await corpPerksApi.calculateGST({
        amount: parseFloat(amount),
        serviceType: serviceType as any,
        companyGSTIN,
        placeOfSupply: state,
        description,
      });
      setResult(calc);
      onCalculationComplete?.(calc);

      // Check ITC eligibility
      const itc = await corpPerksApi.checkITCeligibility({
        serviceType: serviceType as any,
        amount: parseFloat(amount),
        companyType: 'regular',
      });
      setItcCheck(itc);
    } catch (error) {
      logger.error('GST calculation failed:', error);
      // Use mock calculation
      const mockCalc = calculateMockGST(parseFloat(amount), state);
      setResult(mockCalc);
      setItcCheck({ eligible: true, itcAmount: mockCalc.totalTax });
    } finally {
      setCalculating(false);
    }
  };

  const calculateMockGST = (amount: number, supplyState: string): GSTCalculation => {
    const isInterState = supplyState !== 'Maharashtra';
    const taxableAmount = amount / 1.18; // Remove 18% GST
    const taxRate = isInterState ? 18 : 18;
    const totalTax = taxableAmount * (taxRate / 100);
    const cgst = isInterState ? 0 : totalTax / 2;
    const sgst = isInterState ? 0 : totalTax / 2;
    const igst = isInterState ? totalTax : 0;

    return {
      hsnCode: serviceType === 'dining' ? '9963' : serviceType === 'hotel' ? '9963' : '9993',
      description: description || `${serviceType} services`,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      cgstRate: isInterState ? 0 : 9,
      cgstAmount: Math.round(cgst * 100) / 100,
      sgstRate: isInterState ? 0 : 9,
      sgstAmount: Math.round(sgst * 100) / 100,
      igstRate: isInterState ? 18 : 0,
      igstAmount: Math.round(igst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round(amount * 100) / 100,
      itcEligible: true,
      itcAmount: Math.round(totalTax * 100) / 100,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card>
      <Text style={[styles.title, { color: colors.text }]}>GST Calculator</Text>

      {/* Service Type */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Service Type</Text>
        <View style={styles.typeGrid}>
          {SERVICE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                { backgroundColor: colors.background, borderColor: colors.border },
                serviceType === type.value && { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
              ]}
              onPress={() => setServiceType(type.value)}
            >
              <Ionicons
                name={type.icon as any}
                size={20}
                color={serviceType === type.value ? colors.tint : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeLabel,
                  { color: serviceType === type.value ? colors.tint : colors.text },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (₹) *</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.currencySymbol, { color: colors.text }]}>₹</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* GSTIN */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Company GSTIN</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={companyGSTIN}
          onChangeText={setDescription}
          placeholder="27AABCU9603R1ZM"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
        />
      </View>

      {/* State */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Place of Supply</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.stateRow}>
            {Object.keys(STATE_CODES).slice(0, 10).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.stateChip,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  state === s && { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
                ]}
                onPress={() => setState(s)}
              >
                <Text
                  style={[
                    styles.stateChipText,
                    { color: state === s ? colors.tint : colors.text },
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Team lunch at restaurant"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Calculate Button */}
      <TouchableOpacity
        style={[styles.calculateButton, { backgroundColor: colors.tint }]}
        onPress={handleCalculate}
        disabled={calculating || !amount}
      >
        {calculating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="calculator-outline" size={20} color="#fff" />
            <Text style={styles.calculateButtonText}>Calculate GST</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Results */}
      {result && (
        <View style={[styles.results, { borderTopColor: colors.border }]}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Calculation Result</Text>
            {itcCheck && (
              <View style={[styles.itcBadge, { backgroundColor: itcCheck.eligible ? '#22c55e20' : '#ef444420' }]}>
                <Ionicons
                  name={itcCheck.eligible ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={itcCheck.eligible ? '#22c55e' : '#ef4444'}
                />
                <Text style={[styles.itcText, { color: itcCheck.eligible ? '#22c55e' : '#ef4444' }]}>
                  ITC {itcCheck.eligible ? '✓' : '✗'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.taxRow}>
            <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>Taxable Amount</Text>
            <Text style={[styles.taxValue, { color: colors.text }]}>
              {formatCurrency(result.taxableAmount)}
            </Text>
          </View>

          {result.cgstAmount > 0 && (
            <View style={styles.taxRow}>
              <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                CGST ({result.cgstRate}%)
              </Text>
              <Text style={[styles.taxValue, { color: colors.text }]}>
                {formatCurrency(result.cgstAmount)}
              </Text>
            </View>
          )}

          {result.sgstAmount > 0 && (
            <View style={styles.taxRow}>
              <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                SGST ({result.sgstRate}%)
              </Text>
              <Text style={[styles.taxValue, { color: colors.text }]}>
                {formatCurrency(result.sgstAmount)}
              </Text>
            </View>
          )}

          {result.igstAmount > 0 && (
            <View style={styles.taxRow}>
              <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>
                IGST ({result.igstRate}%)
              </Text>
              <Text style={[styles.taxValue, { color: colors.text }]}>
                {formatCurrency(result.igstAmount)}
              </Text>
            </View>
          )}

          <View style={[styles.taxRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Tax</Text>
            <Text style={[styles.totalTax, { color: colors.text }]}>
              {formatCurrency(result.totalTax)}
            </Text>
          </View>

          <View style={[styles.taxRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Grand Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.tint }]}>
              {formatCurrency(result.grandTotal)}
            </Text>
          </View>

          {itcCheck?.eligible && (
            <View style={[styles.itcRow, { backgroundColor: '#22c55e15' }]}>
              <Ionicons name="swap-horizontal" size={16} color="#22c55e" />
              <Text style={[styles.itcRowText, { color: '#22c55e' }]}>
                ITC Claimable: {formatCurrency(itcCheck.itcAmount)}
              </Text>
            </View>
          )}

          {/* Create Invoice Button */}
          <TouchableOpacity
            style={[styles.invoiceButton, { backgroundColor: colors.tint }]}
            onPress={onInvoiceCreate}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.invoiceButtonText}>Create Invoice</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  stateRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  stateChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  results: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  itcText: {
    fontSize: 11,
    fontWeight: '600',
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
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 12,
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
    borderTopWidth: 1,
    marginTop: 8,
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
  itcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  itcRowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  invoiceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
