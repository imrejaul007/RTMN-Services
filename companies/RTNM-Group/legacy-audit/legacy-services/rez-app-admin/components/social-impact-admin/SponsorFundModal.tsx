import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sharedModalStyles } from './sharedModalStyles';
import Colors from '../../constants/Colors';
import { useSponsorBudget, useSponsorLedger } from '../../hooks/queries/useSocialImpact';
import type { Sponsor } from '../../services/api/socialImpact';

const LOGO_COLORS = [
  Colors.light.info, Colors.light.success, Colors.light.purple, Colors.light.warning,
  Colors.light.error, Colors.light.pink, '#14B8A6', Colors.light.orange, Colors.light.indigo, Colors.light.cyan,
];

function getLogoColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}

function formatCurrency(num: number): string {
  return num.toLocaleString('en-IN');
}

function formatDateShort(dateString: string): string {
  try {
    const d = new Date(dateString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return dateString; }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface Props {
  sponsor: Sponsor;
  fundAmount: string; setFundAmount: (v: string) => void;
  fundDescription: string; setFundDescription: (v: string) => void;
  isFunding: boolean;
  onClose: () => void;
  onFund: () => void;
  colors: any;
}

export default function SponsorFundModal({ sponsor, fundAmount, setFundAmount, fundDescription, setFundDescription, isFunding, onClose, onFund, colors }: Props) {
  const budgetQuery = useSponsorBudget(sponsor._id);
  const ledgerQuery = useSponsorLedger(sponsor._id, { limit: 5 });
  const budget = budgetQuery.data as any;
  const ledgerEntries = (ledgerQuery.data as any)?.entries ?? (ledgerQuery.data as any)?.ledger ?? [];
  const logoColor = getLogoColor(sponsor.name);

  const { modalContainer, modalHeader, modalCloseBtn, modalTitle, formScroll, formContent,
    fundSponsorInfo, fundSponsorDetails, fundSponsorName, fundSponsorCoin,
    budgetLoadingContainer, budgetLoadingText, budgetSummary, budgetSummaryTitle,
    budgetGrid, budgetGridItem, budgetGridLabel, budgetGridValue,
    fundFormContainer, fundFormTitle, formGroup, formLabel, formInput,
    fundNowBtn, fundNowBtnText, ledgerContainer, ledgerTitle,
    ledgerEntry, ledgerEntryLeft, ledgerIcon, ledgerEntryInfo,
    ledgerEntryType, ledgerEntryDesc, ledgerEntryDate, ledgerEntryAmount } = sharedModalStyles;

  const s = StyleSheet.create({
    modalHeader: { ...modalHeader, borderBottomColor: colors.border },
    modalTitle: { ...modalTitle, color: colors.text },
    modalScroll: { flex: 1 },
    modalContent: { padding: 16, paddingBottom: 40 },
    fundSponsorInfo: { ...fundSponsorInfo, backgroundColor: colors.card, borderColor: colors.border },
    fundSponsorDetails: { ...fundSponsorDetails },
    fundSponsorName: { ...fundSponsorName, color: colors.text },
    fundSponsorCoin: { ...fundSponsorCoin, color: colors.secondaryText },
    budgetLoadingContainer: { ...budgetLoadingContainer },
    budgetLoadingText: { ...budgetLoadingText, color: colors.secondaryText },
    budgetSummary: { ...budgetSummary, backgroundColor: colors.card, borderColor: colors.border },
    budgetSummaryTitle: { ...budgetSummaryTitle, color: colors.text },
    budgetGridLabel: { ...budgetGridLabel, color: colors.secondaryText },
    fundFormContainer: { ...fundFormContainer, backgroundColor: colors.card, borderColor: colors.border },
    fundFormTitle: { ...fundFormTitle, color: colors.text },
    formLabel: { ...formLabel, color: colors.text },
    formInput: { ...formInput, backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
    fundNowBtn: { ...fundNowBtn, backgroundColor: colors.success, opacity: isFunding ? 0.6 : 1 },
    fundNowBtnText: { ...fundNowBtnText, color: colors.card },
    ledgerContainer: { ...ledgerContainer, backgroundColor: colors.card, borderColor: colors.border },
    ledgerTitle: { ...ledgerTitle, color: colors.text },
    ledgerEntryLeft: { ...ledgerEntryLeft },
    ledgerEntryType: { ...ledgerEntryType, color: colors.text },
    ledgerEntryDesc: { ...ledgerEntryDesc, color: colors.secondaryText },
    ledgerEntryDate: { ...ledgerEntryDate, color: colors.secondaryText },
  });

  return (
    <View style={modalContainer}>
      <View style={[s.modalHeader, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={onClose} style={{ width: 60, alignItems: 'flex-start' }}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.modalTitle}>Fund Sponsor</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView style={s.modalScroll} contentContainerStyle={formContent} keyboardShouldPersistTaps="handled">
        <View style={s.fundSponsorInfo}>
          <View style={[styles.logoCircle, { backgroundColor: `${logoColor}20` }]}>
            <Text style={[styles.logoLetter, { color: logoColor }]}>{sponsor.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.fundSponsorDetails}>
            <Text style={s.fundSponsorName}>{sponsor.name}</Text>
            <Text style={s.fundSponsorCoin}>{sponsor.brandCoinName}</Text>
          </View>
        </View>

        {budgetQuery.isLoading ? (
          <View style={s.budgetLoadingContainer}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={s.budgetLoadingText}>Loading budget...</Text>
          </View>
        ) : budget ? (
          <View style={s.budgetSummary}>
            <Text style={s.budgetSummaryTitle}>Budget Summary</Text>
            <View style={budgetGrid}>
              {[
                { label: 'Total Funded', value: budget.totalFunded || 0, color: colors.info },
                { label: 'Current Balance', value: budget.currentBalance || 0, color: (budget.currentBalance || 0) > 0 ? colors.success : colors.error },
                { label: 'Allocated', value: budget.totalAllocated || 0, color: colors.warning },
                { label: 'Disbursed', value: budget.totalDisbursed || 0, color: colors.secondaryText },
              ].map(({ label, value, color }) => (
                <View key={label} style={budgetGridItem}>
                  <Text style={s.budgetGridLabel}>{label}</Text>
                  <Text style={[budgetGridValue, budgetGridValue, { color }]}>{formatCurrency(value)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={s.fundFormContainer}>
          <Text style={s.fundFormTitle}>Add Funds</Text>
          <View style={formGroup}>
            <Text style={s.formLabel}>Amount *</Text>
            <TextInput style={s.formInput} value={fundAmount} onChangeText={setFundAmount}
              placeholder="Enter amount" placeholderTextColor={colors.icon} keyboardType="numeric" />
          </View>
          <View style={formGroup}>
            <Text style={s.formLabel}>Description</Text>
            <TextInput style={s.formInput} value={fundDescription} onChangeText={setFundDescription}
              placeholder="e.g. Q1 2026 CSR budget allocation" placeholderTextColor={colors.icon} />
          </View>
          <TouchableOpacity style={s.fundNowBtn} onPress={onFund} disabled={isFunding}>
            {isFunding ? <ActivityIndicator size="small" color={colors.card} /> : (
              <><Ionicons name="wallet-outline" size={18} color={colors.card} /><Text style={s.fundNowBtnText}>Fund Now</Text></>
            )}
          </TouchableOpacity>
        </View>

        {ledgerEntries.length > 0 && (
          <View style={s.ledgerContainer}>
            <Text style={s.ledgerTitle}>Recent Transactions</Text>
            {ledgerEntries.map((entry: any, index: number) => {
              const isCredit = entry.type === 'credit' || entry.type === 'fund' || entry.amount > 0;
              return (
                <View key={entry._id || `ledger-${index}`}
                  style={[ledgerEntry, index < ledgerEntries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={s.ledgerEntryLeft}>
                    <View style={[ledgerIcon, { backgroundColor: isCredit ? `${colors.success}15` : `${colors.error}15` }]}>
                      <Ionicons name={isCredit ? 'arrow-down' : 'arrow-up'} size={14} color={isCredit ? colors.success : colors.error} />
                    </View>
                    <View style={ledgerEntryInfo}>
                      <Text style={s.ledgerEntryType}>{capitalizeFirst(entry.type || 'transaction')}</Text>
                      {entry.description && <Text style={s.ledgerEntryDesc} numberOfLines={1}>{entry.description}</Text>}
                      <Text style={s.ledgerEntryDate}>{formatDateShort(entry.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={[ledgerEntryAmount, { color: isCredit ? colors.success : colors.error }]}>
                    {isCredit ? '+' : '-'}{formatCurrency(Math.abs(entry.amount))}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logoCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  logoLetter: { fontSize: 20, fontWeight: '700' },
});
