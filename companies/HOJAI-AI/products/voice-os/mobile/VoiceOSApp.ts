/**
 * HOJAI VoiceOS Mobile App
 * React Native + Expo - Voice intelligence with memory
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const API = 'http://localhost:4898'; // Change to your server IP

export default function VoiceOSApp() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [memory, setMemory] = useState<Record<string, string>>({});
  const [presence, setPresence] = useState({ state: 'idle', energy: 'medium' });

  // Start voice recognition
  async function startListening() {
    setListening(true);
    setTranscript('Listening...');

    try {
      const { recording } = await Audio.requestPermissionsAsync();
      if (!recording.granted) {
        Alert.alert('Permission needed', 'Microphone access required');
        return;
      }

      // Use expo-speech for TTS output
      Speech.speak('Listening', { language: 'en' });

      // Simulate STT (use expo-speech recognition in production)
      setTimeout(() => {
        setListening(false);
        setTranscript('Say something...');
      }, 2000);
    } catch (e) {
      setListening(false);
      Alert.alert('Error', 'Voice not available');
    }
  }

  // Call VoiceOS pipeline
  async function speak(text: string) {
    try {
      const res = await fetch(`${API}/api/voice/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'mobile', input: text })
      });
      const data = await res.json();
      setResponse(data.response || 'Processing...');

      // TTS output
      Speech.speak(data.response || 'Done', { language: 'en' });
      setTranscript(text);
    } catch {
      Speech.speak('Services offline. Start VoiceOS first.', { language: 'en' });
    }
  }

  // Memory functions
  async function remember(key: string, value: string) {
    await fetch(`${API.replace('4898', '4703')}/api/memory/remember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'mobile', key, value })
    });
    setMemory(prev => ({ ...prev, [key]: value }));
  }

  async function recall(key: string) {
    try {
      const res = await fetch(`${API.replace('4898', '4703')}/api/memory/mobile/${key}`);
      const data = await res.json();
      Speech.speak(data.value || 'Not found', { language: 'en' });
    } catch {
      Speech.speak('Memory unavailable', { language: 'en' });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🎤 VoiceOS</Text>
        <Text style={styles.status}>{presence.state} • {presence.energy}</Text>
      </View>

      {/* Voice Button */}
      <TouchableOpacity
        style={[styles.micButton, listening && styles.micActive]}
        onPress={startListening}
      >
        <Text style={styles.micIcon}>🎙️</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        {listening ? 'Listening...' : 'Tap to speak'}
      </Text>

      {/* Transcript */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>You</Text>
        <Text style={styles.cardText}>{transcript || '...'}</Text>
      </View>

      {/* Response */}
      <View style={[styles.card, styles.responseCard]}>
        <Text style={styles.cardTitle}>Genie</Text>
        <Text style={styles.cardText}>{response || 'Ready'}</Text>
      </View>

      {/* Memory */}
      <ScrollView horizontal style={styles.memoryBar}>
        {Object.entries(memory).map(([k, v]) => (
          <TouchableOpacity key={k} style={styles.memoryChip} onPress={() => recall(k)}>
            <Text style={styles.memoryChipText}>{k}: {v}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={() => speak('Order my usual')}>
          <Text>🍕 Food</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => speak('Book meeting')}>
          <Text>📅 Meeting</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => speak('Remind me')}>
          <Text>⏰ Reminder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => speak('Search')}>
          <Text>🔍 Search</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  logo: { fontSize: 24, color: '#8b5cf6', fontWeight: 'bold' },
  status: { color: '#64748b', fontSize: 12 },
  micButton: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#8b5cf6',
    alignSelf: 'center', marginVertical: 32, justifyContent: 'center', alignItems: 'center'
  },
  micActive: { backgroundColor: '#ec4899' },
  micIcon: { fontSize: 40 },
  hint: { textAlign: 'center', color: '#64748b', marginBottom: 24 },
  card: { backgroundColor: '#1a1a2e', margin: 16, padding: 16, borderRadius: 12 },
  responseCard: { backgroundColor: '#1e1e3f', borderLeftWidth: 4, borderColor: '#8b5cf6' },
  cardTitle: { color: '#8b5cf6', fontSize: 12, marginBottom: 8 },
  cardText: { color: '#e2e8f0', fontSize: 16 },
  memoryBar: { maxHeight: 40, paddingHorizontal: 16 },
  memoryChip: { backgroundColor: '#2d2d4d', padding: 8, borderRadius: 16, marginRight: 8 },
  memoryChipText: { color: '#a78bfa', fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, position: 'absolute', bottom: 32, left: 16, right: 16 },
  action: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 12 }
});
