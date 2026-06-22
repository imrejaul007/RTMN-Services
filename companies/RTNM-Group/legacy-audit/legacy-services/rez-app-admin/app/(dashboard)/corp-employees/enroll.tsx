/**
 * Enroll Employee Page
 * Route: /corp-employees/enroll
 */

import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EmployeeForm from '../../components/corp-perks/EmployeeForm';

export default function EnrollEmployeePage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <EmployeeForm />
    </SafeAreaView>
  );
}
