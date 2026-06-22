/**
 * Create Invoice Page
 * Route: /corp-invoices/create
 */

import React from 'react';
import { SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card } from '@/components/corp-perks';
import GSTCalculator from '../../components/corp-perks/GSTCalculator';

export default function CreateInvoicePage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleInvoiceCreate = () => {
    // Navigate back or show success
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <GSTCalculator onInvoiceCreate={handleInvoiceCreate} />
      </ScrollView>
    </SafeAreaView>
  );
}
