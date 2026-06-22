import React from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsScreen from '../src/screens/SettingsScreen';

export default function SettingsPage() {
  return (
    <View style={styles.container}>
      <SettingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
