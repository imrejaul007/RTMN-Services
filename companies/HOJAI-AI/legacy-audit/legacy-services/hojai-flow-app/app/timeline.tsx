import React from 'react';
import { View, StyleSheet } from 'react-native';
import TimelineScreen from '../src/screens/TimelineScreen';

export default function TimelinePage() {
  return (
    <View style={styles.container}>
      <TimelineScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
