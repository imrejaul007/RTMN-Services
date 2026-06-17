/**
 * Cosmic OS - Mood Check-In Modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cosmicAPI } from '../src/services/api';
import { COLORS, SPACING, RADIUS, MOODS } from '../src/constants';
import type { Mood, CouncilResponse } from '../src/types';

export default function MoodCheckInScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'mood' | 'energy' | 'context' | 'result'>('mood');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState(50);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CouncilResponse | null>(null);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
  };

  const handleNext = async () => {
    if (step === 'mood' && selectedMood) {
      setStep('energy');
    } else if (step === 'energy') {
      setStep('context');
    } else if (step === 'context') {
      setStep('result');
      await submitCheckIn();
    }
  };

  const submitCheckIn = async () => {
    setLoading(true);
    try {
      const result = await cosmicAPI.checkInMood('user-1', selectedMood!, energy, { note });
      setResponse(result);
    } catch (error) {
      console.error('Check-in failed:', error);
    }
    setLoading(false);
  };

  const handleClose = () => {
    router.back();
  };

  const getMoodColor = (mood: Mood) => {
    const found = MOODS.find((m) => m.value === mood);
    return found?.color || COLORS.cosmic;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mood Check-In</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        {['mood', 'energy', 'context'].map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressStep,
              (step === s || (step === 'result' && i < 2)) && styles.progressStepActive,
            ]}
          />
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.cosmic} />
          <Text style={styles.loadingText}>Consulting the council...</Text>
        </View>
      ) : step === 'result' && response ? (
        <ScrollView style={styles.resultContent}>
          {/* Cosmic State */}
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Your Cosmic State</Text>
            <LinearGradient
              colors={[getMoodColor(selectedMood!) + '40', COLORS.card]}
              style={styles.cosmicStateCard}
            >
              <Text style={[styles.energyLabel, { color: getMoodColor(selectedMood!) }]}>
                {response.cosmicState.energyLevel.toUpperCase()} ENERGY
              </Text>
              <Text style={styles.tone}>{response.cosmicState.emotionalTone}</Text>
            </LinearGradient>
          </View>

          {/* Affirmation */}
          {response.dailyAffirmation && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>Daily Affirmation</Text>
              <View style={styles.affirmationCard}>
                <Text style={styles.affirmationText}>"{response.dailyAffirmation}"</Text>
              </View>
            </View>
          )}

          {/* Insights Preview */}
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Council Insights</Text>
            {response.insights.slice(0, 3).map((insight, i) => (
              <View key={i} style={styles.insightPreview}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightText}>{insight.practical}</Text>
              </View>
            ))}
          </View>

          {/* Caution */}
          {response.caution && (
            <View style={styles.cautionCard}>
              <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
              <Text style={styles.cautionText}>{response.caution}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView style={styles.stepContent}>
          {step === 'mood' && (
            <>
              <Text style={styles.stepTitle}>How are you feeling?</Text>
              <Text style={styles.stepSubtitle}>Select the mood that best describes you right now</Text>
              <View style={styles.moodsGrid}>
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    style={[
                      styles.moodItem,
                      selectedMood === mood.value && { backgroundColor: mood.color + '30', borderColor: mood.color },
                    ]}
                    onPress={() => handleMoodSelect(mood.value)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={[styles.moodLabel, selectedMood === mood.value && { color: mood.color }]}>
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 'energy' && (
            <>
              <Text style={styles.stepTitle}>Energy Level</Text>
              <Text style={styles.stepSubtitle}>Slide to set your current energy (0-100)</Text>
              <View style={styles.energyContainer}>
                <Text style={styles.energyValue}>{energy}%</Text>
                <View style={styles.energySlider}>
                  <View style={[styles.energyTrack, { width: `${energy}%`, backgroundColor: COLORS.cosmic }]} />
                  <View style={[styles.energyKnob, { left: `${energy}%` }]} />
                </View>
                <View style={styles.energyLabels}>
                  <Text style={styles.energyLabelText}>Low</Text>
                  <Text style={styles.energyLabelText}>High</Text>
                </View>
              </View>
              <View style={styles.energyButtons}>
                {[25, 50, 75, 100].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.energyQuickButton, energy === val && styles.energyQuickButtonActive]}
                    onPress={() => setEnergy(val)}
                  >
                    <Text style={[styles.energyQuickText, energy === val && styles.energyQuickTextActive]}>
                      {val}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 'context' && (
            <>
              <Text style={styles.stepTitle}>Add Context (Optional)</Text>
              <Text style={styles.stepSubtitle}>Any notes about what's affecting your mood?</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g., Had a great meeting at work..."
                placeholderTextColor={COLORS.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
              />
            </>
          )}
        </ScrollView>
      )}

      {/* Next Button */}
      {step !== 'result' && !loading && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, !selectedMood && step === 'mood' && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!selectedMood && step === 'mood'}
          >
            <Text style={styles.nextButtonText}>
              {step === 'context' ? 'Get My Insights' : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  progress: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.card,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: COLORS.cosmic,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  stepContent: {
    flex: 1,
    padding: SPACING.md,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  moodItem: {
    width: '31%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  energyContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  energyValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.cosmic,
    marginBottom: SPACING.lg,
  },
  energySlider: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.card,
    borderRadius: 4,
    position: 'relative',
  },
  energyTrack: {
    height: '100%',
    borderRadius: 4,
  },
  energyKnob: {
    position: 'absolute',
    top: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cosmic,
    marginLeft: -16,
  },
  energyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.md,
  },
  energyLabelText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  energyButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  energyQuickButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  energyQuickButtonActive: {
    backgroundColor: COLORS.cosmic + '30',
  },
  energyQuickText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  energyQuickTextActive: {
    color: COLORS.cosmic,
  },
  noteInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  footer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.cosmic,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  resultContent: {
    flex: 1,
    padding: SPACING.md,
  },
  resultSection: {
    marginBottom: SPACING.lg,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  cosmicStateCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  energyLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tone: {
    fontSize: 18,
    color: COLORS.text,
    marginTop: 4,
  },
  affirmationCard: {
    backgroundColor: COLORS.cosmic + '20',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.cosmic,
  },
  affirmationText: {
    fontSize: 16,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  insightPreview: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  insightText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  cautionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.warning + '15',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  cautionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  doneButton: {
    backgroundColor: COLORS.cosmic,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});