/**
 * CorpPerks Employees Page
 * Route: /corp-employees
 */

import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import CorpEmployeesList from '../../components/corp-perks/EmployeesList';

export default function CorpEmployeesPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <CorpEmployeesList />
    </SafeAreaView>
  );
}
