/**
 * Credit Screen - TradeFinance Integration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4340';

interface CreditLine {
  id: string;
  creditLimit: number;
  usedAmount: number;
  availableAmount: number;
  status: string;
}

export function CreditScreen() {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');

  const { data: creditLines } = useQuery<CreditLine[]>({
    queryKey: ['credit-lines'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/credits/business/user123`);
      return res.json().then((d) => d.data || []);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (data: { amount: number; purpose: string }) => {
      const res = await fetch(`${API_BASE}/api/credits/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setAmount('');
      setPurpose('');
      alert('Credit application submitted!');
    },
  });

  const credit = creditLines?.[0];
  const available = credit?.availableAmount || 0;
  const used = credit?.usedAmount || 0;
  const limit = credit?.creditLimit || 100000;
  const utilization = limit > 0 ? (used / limit) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Business Credit</Text>
          <Text style={styles.subtitle}>Manage your credit lines</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Available Credit</Text>
          <Text style={styles.amount}>₹{(available / 100000).toFixed(2)}L</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${utilization}%` }]} />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Used: ₹{(used / 100000).toFixed(2)}L</Text>
            <Text style={styles.metaText}>Limit: ₹{(limit / 100000).toFixed(2)}L</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Apply for Credit</Text>
          <TextInput
            style={styles.input}
            placeholder="Amount (₹)"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Purpose of credit..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            value={purpose}
            onChangeText={setPurpose}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (amount && purpose) {
                applyMutation.mutate({
                  amount: parseFloat(amount),
                  purpose,
                });
              }
            }}
          >
            <Text style={styles.buttonText}>Apply Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💳</Text>
              <Text style={styles.actionLabel}>BNPL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📄</Text>
              <Text style={styles.actionLabel}>Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💰</Text>
              <Text style={styles.actionLabel}>Loan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionLabel}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { color: '#64748b', marginTop: 4 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, margin: 20, marginTop: 0 },
  cardLabel: { color: '#64748b', fontSize: 14 },
  amount: { fontSize: 40, fontWeight: 'bold', color: '#22c55e', marginVertical: 8 },
  progressBar: { height: 8, backgroundColor: '#2a2a4e', borderRadius: 4, marginVertical: 12 },
  progress: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { color: '#64748b', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  input: { backgroundColor: '#0a0a0f', borderRadius: 12, padding: 14, color: '#fff', marginBottom: 12 },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { backgroundColor: '#0a0a0f', borderRadius: 12, padding: 16, alignItems: 'center', width: '23%' },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { color: '#64748b', fontSize: 12 },
});
