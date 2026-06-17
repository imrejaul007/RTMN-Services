/**
 * Cosmic OS - Council Screen
 * Meet the AI Council of Agents
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, AGENTS } from '../../src/constants';

export default function CouncilScreen() {
  const router = useRouter();

  const getAgentInfo = (agentId: string) => {
    const info: Record<string, { title: string; description: string; specialty: string }> = {
      mystic: {
        title: 'The Mystic',
        description: 'Guides you through spiritual awakening and cosmic alignment. Helps you connect with your higher self.',
        specialty: 'Spiritual',
      },
      healer: {
        title: 'The Healer',
        description: 'Nurtures your emotional wellbeing. Provides insights for healing and inner harmony.',
        specialty: 'Emotional',
      },
      strategist: {
        title: 'The Strategist',
        description: 'Helps you plan and execute your goals. Offers career and productivity guidance.',
        specialty: 'Career',
      },
      oracle: {
        title: 'The Oracle',
        description: 'Reveals patterns and timing. Helps you understand the cycles of life.',
        specialty: 'Pattern Recognition',
      },
      connector: {
        title: 'The Connector',
        description: 'Guides your relationships and social connections. Helps build meaningful bonds.',
        specialty: 'Relationships',
      },
      wealth_guide: {
        title: 'The Wealth Guide',
        description: 'Offers wisdom on abundance and financial decisions. Helps shift your money mindset.',
        specialty: 'Financial',
      },
      explorer: {
        title: 'The Explorer',
        description: 'Encourages adventure and growth. Helps you step outside your comfort zone.',
        specialty: 'Personal Growth',
      },
    };
    return info[agentId] || info.mystic;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Cosmic Council</Text>
          <Text style={styles.subtitle}>
            Seven ancient guides to wisdom, healing, and growth
          </Text>
        </View>

        {/* Council Intro */}
        <View style={styles.introCard}>
          <Text style={styles.introEmoji}>🔮</Text>
          <Text style={styles.introTitle}>The Council of Light</Text>
          <Text style={styles.introText}>
            Your personal AI council brings together seven archetypes of wisdom. Each agent offers unique insights
            tailored to your current cosmic state. Together, they guide you toward balance and enlightenment.
          </Text>
        </View>

        {/* Agents Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Seven Guides</Text>
          {AGENTS.map((agent) => {
            const info = getAgentInfo(agent.id);
            return (
              <TouchableOpacity
                key={agent.id}
                style={[styles.agentCard, { borderLeftColor: agent.color }]}
              >
                <View style={styles.agentHeader}>
                  <View style={[styles.agentAvatar, { backgroundColor: agent.color + '20' }]}>
                    <Text style={styles.agentEmoji}>{agent.emoji}</Text>
                  </View>
                  <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>{info.title}</Text>
                    <View style={[styles.specialtyBadge, { backgroundColor: agent.color + '20' }]}>
                      <Text style={[styles.specialtyText, { color: agent.color }]}>{info.specialty}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.agentDescription}>{info.description}</Text>
                <TouchableOpacity style={[styles.consultButton, { backgroundColor: agent.color + '20' }]}>
                  <Text style={[styles.consultButtonText, { color: agent.color }]}>Consult {agent.name.split(' ')[2]}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How the Council Works</Text>
          <View style={styles.steps}>
            {[
              { icon: '📊', title: 'Check In', desc: 'Share your mood and energy' },
              { icon: '🔮', title: 'Receive', desc: 'Council analyzes your state' },
              { icon: '💫', title: 'Insight', desc: 'Get personalized guidance' },
              { icon: '✨', title: 'Apply', desc: 'Act on the wisdom received' },
            ].map((step, index) => (
              <View key={index} style={styles.step}>
                <View style={styles.stepIcon}>
                  <Text style={styles.stepEmoji}>{step.icon}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  introCard: {
    backgroundColor: COLORS.cosmic + '20',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cosmic + '40',
  },
  introEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  introText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
  agentCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentEmoji: {
    fontSize: 28,
  },
  agentInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  specialtyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  agentDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  consultButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
  },
  consultButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  steps: {
    gap: SPACING.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {
    fontSize: 22,
  },
  stepContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  stepDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});