/**
 * Cosmic OS - Domain Guidance Screen
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cosmicAPI } from '../../src/services/api';
import { COLORS, SPACING, RADIUS, DOMAINS } from '../../src/constants';
import type { DomainGuidance } from '../../src/types';

export default function DomainScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [guidance, setGuidance] = useState<DomainGuidance | null>(null);
  const [loading, setLoading] = useState(true);

  const domain = DOMAINS.find((d) => d.id === id) || {
    id: id as Domain,
    name: 'Unknown',
    emoji: '✨',
  };

  useEffect(() => {
    loadGuidance();
  }, [id]);

  const loadGuidance = async () => {
    const data = await cosmicAPI.getDomainGuidance(id as Domain);
    setGuidance(data);
    setLoading(false);
  };

  const getDomainColor = () => {
    const colors: Record<string, string> = {
      emotional: COLORS.healer,
      relationship: COLORS.connector,
      career: COLORS.strategist,
      financial: COLORS.wealth,
      health: COLORS.explorer,
      spiritual: COLORS.cosmic,
      social: COLORS.oracle,
    };
    return colors[id] || COLORS.cosmic;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.cosmic} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: getDomainColor() + '20' }]}>
          <Text style={styles.domainEmoji}>{domain.emoji}</Text>
          <Text style={styles.domainName}>{domain.name}</Text>
          <Text style={styles.domainGuidance}>{guidance?.guidance}</Text>
        </View>

        {/* Action Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💫 Recommended Actions</Text>
          {guidance?.actionItems.map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <View style={[styles.actionNumber, { backgroundColor: getDomainColor() + '20' }]}>
                <Text style={[styles.actionNumberText, { color: getDomainColor() }]}>{index + 1}</Text>
              </View>
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>

        {/* Affirmations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Daily Affirmations</Text>
          <View style={styles.affirmationsCard}>
            {guidance?.affirmations.map((affirmation, index) => (
              <View key={index} style={styles.affirmationItem}>
                <Ionicons name="sparkles" size={16} color={COLORS.cosmic} />
                <Text style={styles.affirmationText}>{affirmation}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Warnings */}
        {guidance?.warnings && guidance.warnings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Gentle Reminders</Text>
            <View style={styles.warningsCard}>
              {guidance.warnings.map((warning, index) => (
                <View key={index} style={styles.warningItem}>
                  <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.warningText}>{warning}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Consult Council CTA */}
        <TouchableOpacity style={styles.consultButton}>
          <Ionicons name="people" size={20} color={COLORS.text} />
          <Text style={styles.consultButtonText}>Consult Full Council for {domain.name}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  domainEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  domainName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  domainGuidance: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  actionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  affirmationsCard: {
    backgroundColor: COLORS.cosmic + '15',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cosmic + '30',
  },
  affirmationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  affirmationText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  warningsCard: {
    backgroundColor: COLORS.warning + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.cosmic,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  consultButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});