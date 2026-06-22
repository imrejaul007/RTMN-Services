import React from 'react';
import { View, StyleSheet } from 'react-native';
import DictionaryScreen from '../src/screens/DictionaryScreen';

export default function DictionaryPage() {
  return (
    <View style={styles.container}>
      <DictionaryScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
