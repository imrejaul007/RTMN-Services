/**
 * PersonasScreen - Personal & Organization Identity
 *
 * NOT "Settings" or "Preferences"
 * This is Hojai's identity layer
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PersonaType = 'personal' | 'founder' | 'sales' | 'support' | 'hr';

interface Persona {
  id: string;
  name: string;
  type: PersonaType;
  voice: 'professional' | 'casual' | 'friendly' | 'assertive';
  formality: number;
  isDefault: boolean;
  permissions: {
    canSendMessages: boolean;
    canCreateTasks: boolean;
  };
}

export default function PersonasScreen() {
  const [personas] = useState<Persona[]>([
    { id: '1', name: 'My Voice', type: 'personal', voice: 'professional', formality: 6, isDefault: true, permissions: { canSendMessages: true, canCreateTasks: true } },
    { id: '2', name: 'Founder Mode', type: 'founder', voice: 'assertive', formality: 8, isDefault: false, permissions: { canSendMessages: true, canCreateTasks: true } },
    { id: '3', name: 'Sales Mode', type: 'sales', voice: 'friendly', formality: 4, isDefault: false, permissions: { canSendMessages: true, canCreateTasks: false } },
  ]);

  const [activePersona, setActivePersona] = useState('1');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const getPersonaIcon = (type: PersonaType) => {
    switch (type) {
      case 'personal': return 'person';
      case 'founder': return 'star';
      case 'sales': return 'trending-up';
      case 'support': return 'headset';
      case 'hr': return 'people';
    }
  };

  const getPersonaColor = (type: PersonaType) => {
    switch (type) {
      case 'personal': return '#6366F1';
      case 'founder': return '#F59E0B';
      case 'sales': return '#10B981';
      case 'support': return '#8B5CF6';
      case 'hr': return '#EC4899';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Personas</Text>
        <Text style={styles.subtitle}>Your voice, your style</Text>
      </View>

      {/* Voice Toggle */}
      <View style={styles.voiceToggle}>
        <View style={styles.voiceInfo}>
          <Ionicons name="mic" size={24} color="#6366F1" />
          <View>
            <Text style={styles.voiceLabel}>Voice Output</Text>
            <Text style={styles.voiceDesc}>Hojai speaks back</Text>
          </View>
        </View>
        <Switch
          value={voiceEnabled}
          onValueChange={setVoiceEnabled}
          trackColor={{ false: '#333', true: '#6366F1' }}
          thumbColor="#FFF"
        />
      </View>

      {/* Active Persona */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Persona</Text>
        <View style={styles.activePersona}>
          <View style={[styles.personaIcon, { backgroundColor: getPersonaColor(personas.find(p => p.id === activePersona)?.type || 'personal') + '20' }]}>
            <Ionicons
              name={getPersonaIcon(personas.find(p => p.id === activePersona)?.type || 'personal') as any}
              size={24}
              color={getPersonaColor(personas.find(p => p.id === activePersona)?.type || 'personal')}
            />
          </View>
          <View style={styles.personaInfo}>
            <Text style={styles.personaName}>
              {personas.find(p => p.id === activePersona)?.name}
            </Text>
            <Text style={styles.personaType}>
              {personas.find(p => p.id === activePersona)?.type}
            </Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>
      </View>

      {/* All Personas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Personas</Text>
        {personas.map((persona) => (
          <TouchableOpacity
            key={persona.id}
            style={styles.personaCard}
            onPress={() => setActivePersona(persona.id)}
          >
            <View style={[
              styles.personaAvatar,
              { backgroundColor: getPersonaColor(persona.type) + '20' }
            ]}>
              <Ionicons
                name={getPersonaIcon(persona.type) as any}
                size={20}
                color={getPersonaColor(persona.type)}
              />
            </View>
            <View style={styles.personaDetails}>
              <View style={styles.personaHeader}>
                <Text style={styles.personaCardName}>{persona.name}</Text>
                {persona.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.personaVoice}>{persona.voice} voice • formality {persona.formality}/10</Text>
            </View>
            {activePersona === persona.id && (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Voice Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Settings</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Voice Style</Text>
            <View style={styles.voiceStyles}>
              {['professional', 'casual', 'friendly'].map((style) => (
                <TouchableOpacity key={style} style={styles.voiceOption}>
                  <Text style={styles.voiceOptionText}>{style}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Formality</Text>
            <Text style={styles.settingValue}>5/10</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Response Length</Text>
            <Text style={styles.settingValue}>Medium</Text>
          </View>
        </View>
      </View>

      {/* Writing Style */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Writing Style</Text>
        <View style={styles.stylePreview}>
          <Text style={styles.previewLabel}>Sample Output</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewText}>
              "I've reviewed your proposal and prepared a comprehensive analysis highlighting key insights."
            </Text>
          </View>
        </View>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <View style={styles.permissionCard}>
          <PermissionRow label="Send Messages" enabled />
          <PermissionRow label="Create Tasks" enabled />
          <PermissionRow label="Make Calls" enabled={false} />
          <PermissionRow label="Access Calendar" enabled />
          <PermissionRow label="Spend Budget" enabled={false} />
        </View>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

function PermissionRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={styles.permissionRow}>
      <Text style={styles.permissionLabel}>{label}</Text>
      <View style={[
        styles.permissionBadge,
        enabled ? styles.permissionEnabled : styles.permissionDisabled
      ]}>
        <Text style={[
          styles.permissionText,
          enabled ? styles.permissionTextEnabled : styles.permissionTextDisabled
        ]}>
          {enabled ? 'Allowed' : 'Not Allowed'}
        </Text>
      </View>
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
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  voiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  voiceDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  activePersona: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  personaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaInfo: {
    flex: 1,
  },
  personaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  personaType: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  activeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  personaAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaDetails: {
    flex: 1,
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personaCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  defaultBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 10,
    color: '#6366F1',
    fontWeight: '600',
  },
  personaVoice: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  settingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 15,
    color: '#FFF',
  },
  settingValue: {
    fontSize: 15,
    color: '#6366F1',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },
  voiceStyles: {
    flexDirection: 'row',
    gap: 8,
  },
  voiceOption: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  voiceOptionText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  stylePreview: {
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
  },
  previewText: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  permissionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  permissionLabel: {
    fontSize: 15,
    color: '#FFF',
  },
  permissionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionEnabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  permissionDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  permissionTextEnabled: {
    color: '#10B981',
  },
  permissionTextDisabled: {
    color: '#666',
  },
  bottomSpace: {
    height: 100,
  },
});
