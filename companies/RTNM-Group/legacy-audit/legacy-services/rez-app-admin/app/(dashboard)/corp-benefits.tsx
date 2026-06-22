/**
 * CorpPerks Benefits Page
 * Route: /corp-benefits
 */

import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import CorpBenefitsList from '../../components/corp-perks/BenefitsList';

export default function CorpBenefitsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <CorpBenefitsList />
    </SafeAreaView>
  );
}
