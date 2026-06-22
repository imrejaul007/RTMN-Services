/**
 * Approvals Page
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import ApprovalCenterScreen from '../src/screens/ApprovalCenterScreen';

export default function ApprovalsPage() {
  return (
    <View style={styles.container}>
      <ApprovalCenterScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
