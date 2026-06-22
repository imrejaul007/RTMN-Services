/**
 * Actions Page
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import ActionsScreen from '../src/screens/ActionsScreen';

export default function ActionsPage() {
  return (
    <View style={styles.container}>
      <ActionsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
