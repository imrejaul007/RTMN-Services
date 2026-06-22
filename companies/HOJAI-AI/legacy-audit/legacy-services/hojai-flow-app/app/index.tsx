/**
 * Main Tab Screen - Shows Overlay
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import OverlayScreen from '../src/screens/OverlayScreen';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <OverlayScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
