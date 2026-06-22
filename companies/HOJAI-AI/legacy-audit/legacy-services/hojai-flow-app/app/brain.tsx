/**
 * Brain Page
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import BrainScreen from '../src/screens/BrainScreen';

export default function BrainPage() {
  return (
    <View style={styles.container}>
      <BrainScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
