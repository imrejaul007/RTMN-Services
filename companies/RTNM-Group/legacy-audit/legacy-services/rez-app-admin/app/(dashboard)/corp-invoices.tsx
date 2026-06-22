/**
 * CorpPerks GST Invoices Page
 * Route: /corp-invoices
 */

import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import GSTInvoicesList from '../../components/corp-perks/GSTInvoicesList';

export default function CorpInvoicesPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <GSTInvoicesList />
    </SafeAreaView>
  );
}
