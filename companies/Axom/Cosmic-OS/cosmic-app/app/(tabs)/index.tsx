/**
 * Cosmic OS - Home Screen
 * Daily reading, mood check-in, cosmic state
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cosmicAPI } from '../../src/services/api';
import { COLORS, SPACING, RADIUS, MOODS, DOMAINS } from '../../src/constants';
import type { DailyReading, Mood } from '../../src/types';

export default function HomeScreen() {
  const router = useRouter();
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<{ mood: Mood; energy: number } | null>(null);

  useEffect(() => {
    loadDailyReading();
  }, []);

  const loadDailyReading = async () => {
    const data = await cosmicAPI.getDailyReading('user-1');
    setReading(data);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDailyReading();
    setRefreshing(false);
  };

  const handleMoodCheckIn = () => {
    router.push('/mood-checkin');
  };

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'high':
        return COLORS.highEnergy;
      case 'medium':
        return COLORS.mediumEnergy;
      default:
        return COLORS.lowEnergy;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.cosmic} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={32} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Daily Affirmation Card */}
        {reading && (
          <LinearGradient
            colors={[COLORS.cosmic, COLORS.mystic]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.affirmationCard}
          >
            <Text style={styles.affirmationLabel}>✨ Daily Affirmation</Text>
            <Text style={styles.affirmationText}>"{reading.affirmation}"</Text>
            <View style={styles.affirmationMeta}>
              <Text style={styles.affirmationTheme}>Theme: {reading.theme}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Mood Check-In CTA */}
        <TouchableOpacity style={styles.checkInCTA} onPress={handleMoodCheckIn}>
          <LinearGradient
            colors={[COLORS.cosmicLight + '40', COLORS.cosmic + '40']}
            style={styles.checkInGradient}
          >
            <View style={styles.checkInContent}>
              <View style={styles.checkInIcon}>
                <Ionicons name="sunny" size={28} color={COLORS.cosmic} />
              </View>
              <View style={styles.checkInText}>
                <Text style={styles.checkInTitle}>How are you feeling?</Text>
                <Text style={styles.checkInSubtitle}>Check in to get personalized insights</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.cosmic} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Cosmic State */}
        {reading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Cosmic State</Text>
            <View style={styles.cosmicStateCard}>
              <View style={styles.stateHeader}>
                <Text style={[styles.energyLevel, { color: getEnergyColor(reading.cosmicState.energyLevel) }]}>
                  {reading.cosmicState.energyLevel.toUpperCase()} ENERGY
                </Text>
                <Text style={styles.emotionalTone}>{reading.cosmicState.emotionalTone}</Text>
              </View>

              <View style={styles.energyBars}>
                <EnergyBar label="Social" value={reading.cosmicState.socialEnergy} color={COLORS.connector} />
                <EnergyBar label="Focus" value={reading.cosmicState.focusScore} color={COLORS.strategist} />
                <EnergyBar label="Relationship" value={reading.cosmicState.relationshipEnergy} color={COLORS.healer} />
                <EnergyBar label="Growth" value={reading.cosmicState.growthEnergy} color={COLORS.explorer} />
              </View>
            </View>
          </View>
        )}

        {/* Lucky Elements */}
        {reading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Cosmic Highlights</Text>
            <View style={styles.luckyRow}>
              <View style={styles.luckyItem}>
                <Text style={styles.luckyEmoji}>🌙</Text>
                <Text style={styles.luckyLabel}>Moon</Text>
                <Text style={styles.luckyValue}>{reading.moonPhase}</Text>
              </View>
              <View style={styles.luckyItem}>
                <Text style={styles.luckyEmoji}>🎨</Text>
                <Text style={styles.luckyLabel}>Lucky Color</Text>
                <Text style={styles.luckyValue}>{reading.luckyColor}</Text>
              </View>
              <View style={styles.luckyItem}>
                <Text style={styles.luckyEmoji}>🔢</Text>
                <Text style={styles.luckyLabel}>Lucky Number</Text>
                <Text style={styles.luckyValue}>{reading.luckyNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Suggested Actions */}
        {reading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💫 Suggested Actions</Text>
            {reading.suggestedActions.map((action, index) => (
              <View key={index} style={styles.actionItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.healer} />
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Domain Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔮 Life Domains</Text>
          <View style={styles.domainsGrid}>
            {DOMAINS.map((domain) => (
              <TouchableOpacity
                key={domain.id}
                style={styles.domainCard}
                onPress={() => router.push(`/domain/${domain.id}`)}
              >
                <Text style={styles.domainEmoji}>{domain.emoji}</Text>
                <Text style={styles.domainName}>{domain.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Energy Bar Component
function EnergyBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.energyBar}>
      <View style={styles.energyBarHeader}>
        <Text style={styles.energyBarLabel}>{label}</Text>
        <Text style={[styles.energyBarValue, { color }]}>{value}%</Text>
      </View>
      <View style={styles.energyBarTrack}>
        <View style={[styles.energyBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affirmationCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  affirmationLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.sm,
  },
  affirmationText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 28,
  },
  affirmationMeta: {
    marginTop: SPACING.md,
  },
  affirmationTheme: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  checkInCTA: {
    marginBottom: SPACING.lg,
  },
  checkInGradient: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.cosmic + '40',
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  checkInIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.background + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInText: {},
  checkInTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  checkInSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  cosmicStateCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  stateHeader: {
    marginBottom: SPACING.lg,
  },
  energyLevel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  emotionalTone: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  energyBars: {
    gap: SPACING.md,
  },
  energyBar: {},
  energyBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  energyBarLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  energyBarValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  energyBarTrack: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
  },
  energyBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  luckyRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  luckyItem: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  luckyEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  luckyLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  luckyValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
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
  actionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  domainsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  domainCard: {
    width: '23%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  domainEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  domainName: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});