/**
 * Cosmic OS - Insights Screen
 * AI Council insights and analysis
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cosmicAPI } from '../../src/services/api';
import { COLORS, SPACING, RADIUS, AGENTS } from '../../src/constants';
import type { CouncilResponse, Insight } from '../../src/types';

export default function InsightsScreen() {
  const router = useRouter();
  const [response, setResponse] = useState<CouncilResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    const data = await cosmicAPI.getCouncilResponse('user-1', 'neutral', 60);
    setResponse(data);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const getAgentColor = (agent: string) => {
    const found = AGENTS.find((a) => a.id === agent);
    return found?.color || COLORS.cosmic;
  };

  const getAgentEmoji = (agent: string) => {
    const found = AGENTS.find((a) => a.id === agent);
    return found?.emoji || '✨';
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
          <Text style={styles.title}>AI Council Insights</Text>
          <Text style={styles.subtitle}>Your personalized guidance from the cosmic council</Text>
        </View>

        {/* Consensus */}
        {response?.consensus && (
          <View style={styles.consensusCard}>
            <View style={styles.consensusHeader}>
              <Ionicons name="star" size={20} color={COLORS.cosmic} />
              <Text style={styles.consensusTitle}>Council Consensus</Text>
            </View>
            <Text style={styles.consensusTheme}>{response.consensus.theme}</Text>
            <Text style={styles.consensusSummary}>{response.consensus.summary}</Text>
            <View style={styles.consensusAction}>
              <Ionicons name="arrow-forward-circle" size={16} color={COLORS.healer} />
              <Text style={styles.consensusActionText}>{response.consensus.suggestedAction}</Text>
            </View>
          </View>
        )}

        {/* Insights from each agent */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights from Your Council</Text>
          {response?.insights.map((insight, index) => (
            <TouchableOpacity
              key={index}
              style={styles.insightCard}
              onPress={() => setSelectedInsight(selectedInsight === insight ? null : insight)}
            >
              <View style={styles.insightHeader}>
                <View style={[styles.agentBadge, { backgroundColor: getAgentColor(insight.agent) + '20' }]}>
                  <Text style={styles.agentEmoji}>{getAgentEmoji(insight.agent)}</Text>
                </View>
                <View style={styles.insightTitleContainer}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={[styles.insightCategory, { color: getAgentColor(insight.agent) }]}>
                    {insight.category}
                  </Text>
                </View>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>{Math.round(insight.confidence * 100)}%</Text>
                </View>
              </View>

              <Text style={styles.insightInterpretation}>{insight.interpretation}</Text>

              {selectedInsight === insight && (
                <View style={styles.expandedContent}>
                  <View style={styles.expandedSection}>
                    <Text style={styles.expandedLabel}>✨ Symbolic</Text>
                    <Text style={styles.expandedText}>{insight.symbolic}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={styles.expandedLabel}>🎯 Practical</Text>
                    <Text style={styles.expandedText}>{insight.practical}</Text>
                  </View>
                  {insight.timing && (
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedLabel}>⏰ Timing</Text>
                      <Text style={styles.expandedText}>{insight.timing}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Caution */}
        {response?.caution && (
          <View style={styles.cautionCard}>
            <View style={styles.cautionHeader}>
              <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
              <Text style={styles.cautionTitle}>Gentle Caution</Text>
            </View>
            <Text style={styles.cautionText}>{response.caution}</Text>
          </View>
        )}

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
  consensusCard: {
    backgroundColor: COLORS.cosmic + '20',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cosmic + '40',
  },
  consensusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  consensusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.cosmic,
  },
  consensusTheme: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  consensusSummary: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  consensusAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cosmic + '20',
  },
  consensusActionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
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
  insightCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentEmoji: {
    fontSize: 22,
  },
  insightTitleContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  insightCategory: {
    fontSize: 12,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  insightInterpretation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    lineHeight: 20,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  expandedSection: {
    marginBottom: SPACING.md,
  },
  expandedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.cosmic,
    marginBottom: 4,
  },
  expandedText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  cautionCard: {
    backgroundColor: COLORS.warning + '15',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  cautionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cautionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  cautionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});