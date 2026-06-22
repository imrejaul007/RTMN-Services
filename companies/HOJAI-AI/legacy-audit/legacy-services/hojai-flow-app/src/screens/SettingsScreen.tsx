/**
 * SettingsScreen - Voice, Privacy, Style, Language
 *
 * Features:
 * - Voice settings
 * - Privacy controls
 * - Writing style
 * - Language
 * - Account
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFlowStore } from '../store/flowStore';
import { updatePreferences } from '../services/flowApi';

const VOICE_OPTIONS = [
  { id: 'default', label: 'Default', icon: 'mic' },
  { id: 'whisper', label: 'Whisper', icon: 'volume-low' },
  { id: 'fast', label: 'Fast', icon: 'speedometer' },
];

const STYLE_OPTIONS = [
  { id: 'professional', label: 'Professional', desc: 'Formal and business-appropriate' },
  { id: 'casual', label: 'Casual', desc: 'Relaxed and friendly' },
  { id: 'friendly', label: 'Friendly', desc: 'Warm and conversational' },
];

const LANGUAGE_OPTIONS = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी (Hindi)' },
  { id: 'ml', label: 'मलयalam (Malayalam)' },
];

export default function SettingsScreen() {
  const { preferences, updatePreferences: updateStorePreferences } = useFlowStore();

  const [voiceOption, setVoiceOption] = useState('default');
  const [style, setStyle] = useState(preferences.style);
  const [language, setLanguage] = useState(preferences.language);

  const handlePreferenceUpdate = useCallback(async (key: string, value: unknown) => {
    updateStorePreferences({ [key]: value });

    try {
      await updatePreferences('current_user', { [key]: value });
    } catch (error) {
      console.error('Failed to update preference:', error);
    }
  }, [updateStorePreferences]);

  const handlePrivacyUpdate = useCallback((key: keyof typeof preferences.privacy, value: boolean) => {
    const newPrivacy = { ...preferences.privacy, [key]: value };
    handlePreferenceUpdate('privacy', newPrivacy);
  }, [preferences.privacy, handlePreferenceUpdate]);

  const handleClearMemory = useCallback(() => {
    Alert.alert(
      'Clear Memory',
      'This will delete all your memories. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            // Call API to clear all memories
            Alert.alert('Success', 'All memories have been cleared');
          },
        },
      ]
    );
  }, []);

  const handleExportData = useCallback(() => {
    Alert.alert(
      'Export Data',
      'Download all your data from Hojai Flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // Call API to export data
            Alert.alert('Success', 'Data export has been initiated');
          },
        },
      ]
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Voice Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Voice Input</Text>
                <Text style={styles.settingDesc}>Enable voice commands</Text>
              </View>
              <Switch
                value={preferences.voiceEnabled}
                onValueChange={(value) => handlePreferenceUpdate('voiceEnabled', value)}
                trackColor={{ false: '#333', true: '#6366F1' }}
                thumbColor="#FFF"
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.subLabel}>Voice Style</Text>
            <View style={styles.optionGroup}>
              {VOICE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    voiceOption === option.id && styles.optionButtonActive,
                  ]}
                  onPress={() => setVoiceOption(option.id)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={voiceOption === option.id ? '#6366F1' : '#666'}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      voiceOption === option.id && styles.optionLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Writing Style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Writing Style</Text>

          <View style={styles.card}>
            {STYLE_OPTIONS.map((option, index) => (
              <React.Fragment key={option.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => {
                    setStyle(option.id as typeof style);
                    handlePreferenceUpdate('style', option.id);
                  }}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{option.label}</Text>
                    <Text style={styles.settingDesc}>{option.desc}</Text>
                  </View>
                  <Ionicons
                    name={style === option.id ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={style === option.id ? '#6366F1' : '#666'}
                  />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>

          <View style={styles.card}>
            {LANGUAGE_OPTIONS.map((option, index) => (
              <React.Fragment key={option.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => {
                    setLanguage(option.id);
                    handlePreferenceUpdate('language', option.id);
                  }}
                >
                  <Text style={styles.settingLabel}>{option.label}</Text>
                  <Ionicons
                    name={language === option.id ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={language === option.id ? '#6366F1' : '#666'}
                  />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Share Context</Text>
                <Text style={styles.settingDesc}>Allow context sharing with services</Text>
              </View>
              <Switch
                value={preferences.privacy.shareContext}
                onValueChange={(value) => handlePrivacyUpdate('shareContext', value)}
                trackColor={{ false: '#333', true: '#6366F1' }}
                thumbColor="#FFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Learn from Interactions</Text>
                <Text style={styles.settingDesc}>Improve responses over time</Text>
              </View>
              <Switch
                value={preferences.privacy.learnFromInteractions}
                onValueChange={(value) => handlePrivacyUpdate('learnFromInteractions', value)}
                trackColor={{ false: '#333', true: '#6366F1' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={handleExportData}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Export Data</Text>
                <Text style={styles.settingDesc}>Download all your data</Text>
              </View>
              <Ionicons name="download-outline" size={24} color="#666" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow} onPress={handleClearMemory}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: '#EF4444' }]}>
                  Clear Memory
                </Text>
                <Text style={styles.settingDesc}>Delete all stored memories</Text>
              </View>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Profile</Text>
                <Text style={styles.settingDesc}>Manage your account</Text>
              </View>
              <Ionicons name="person-outline" size={24} color="#666" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Help & Support</Text>
                <Text style={styles.settingDesc}>Get help with Hojai Flow</Text>
              </View>
              <Ionicons name="help-circle-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={styles.version}>Hojai Flow v1.0.0</Text>
          <Text style={styles.copyright}>© 2026 Hojai AI</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },
  settingDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 16,
  },
  subLabel: {
    fontSize: 14,
    color: '#999',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  optionGroup: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  optionButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  optionLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  optionLabelActive: {
    color: '#6366F1',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 50,
  },
  version: {
    fontSize: 14,
    color: '#666',
  },
  copyright: {
    fontSize: 12,
    color: '#444',
    marginTop: 4,
  },
});
