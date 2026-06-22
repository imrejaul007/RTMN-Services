/**
 * Create Benefit Page
 * Route: /corp-benefits/create
 */

import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import BenefitForm from '../../../components/corp-perks/BenefitForm';

export default function CreateBenefitPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <BenefitForm />
    </SafeAreaView>
  );
}
