/**
 * Personas Page
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import PersonasScreen from '../src/screens/PersonasScreen';

export default function PersonasPage() {
  return (
    <View style={styles.container}>
      <PersonasScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
