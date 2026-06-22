import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { logger } from '../../utils/logger';
import { s } from './styles/rendez.styles';

// Rendez backend URL — set EXPO_PUBLIC_RENDEZ_API_URL in env vars
const RENDEZ_API = process.env.EXPO_PUBLIC_RENDEZ_API_URL || '';
const RENDEZ_ADMIN_KEY = process.env.EXPO_PUBLIC_RENDEZ_ADMIN_KEY || '';

// VER-BUG-005 FIX: validate URL scheme before opening. Reject javascript:, tel:,
// and other non-HTTP(S) schemes to prevent unexpected behavior.
const openHttpUrl = async (url: string): Promise<void> => {
  if (typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    logger.warn('[rendez] Rejected non-HTTP(S) URL:', url);
    return;
  }
  try {
    await Linking.openURL(url);
  } catch (err) {
    logger.error('[rendez] Failed to open URL:', err);
  }
};

interface RendezStats {
  totalProfiles: number;
  totalMatches: number;
  totalGifts: number;
  pendingReports: number;
  validatedMeetups: number;
  fraudFlags: number;
  giftValueAcceptedPaise: number;
}

interface RendezPlanStats {
  totalPlans: number;
  openPlans: number;
  filledPlans: number;
  completedPlans: number;
  cancelledPlans: number;
  totalApplications: number;
  totalConfirmations: number;
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View style={[s.statCard, { backgroundColor: colors.card }]}>
      <View style={[s.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as unknown as keyof typeof Ionicons.glyphMap} size={22} color={color} />
      </View>
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.icon }]}>{label}</Text>
    </View>
  );
}

export default function RendezDashboard() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [stats, setStats] = useState<RendezStats | null>(null);
  const [planStats, setPlanStats] = useState<RendezPlanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    Authorization: `Bearer ${RENDEZ_ADMIN_KEY}`,
    'Content-Type': 'application/json',
  };

  const loadData = useCallback(async () => {
    if (!RENDEZ_ADMIN_KEY) {
      setError(
        'EXPO_PUBLIC_RENDEZ_ADMIN_KEY is not configured. Set this environment variable to enable Rendez admin access.'
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [statsRes, planStatsRes] = await Promise.all([
        fetch(`${RENDEZ_API}/admin/stats`, { headers }),
        fetch(`${RENDEZ_API}/admin/plans/stats`, { headers }),
      ]);
      if (!statsRes.ok) throw new Error('Failed to load Rendez stats');
      setStats(await statsRes.json());
      if (planStatsRes.ok) setPlanStats(await planStatsRes.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not connect to Rendez');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!RENDEZ_ADMIN_KEY) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Rendez Configuration Required
        </Text>
        <Text
          style={{
            color: colors.icon,
            fontSize: 13,
            marginTop: 8,
            textAlign: 'center',
            paddingHorizontal: 32,
          }}
        >
          Set EXPO_PUBLIC_RENDEZ_ADMIN_KEY in your environment to enable this tab.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
      }
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: '#7c3aed' }]}>
        <Text style={s.headerTitle}>💜 Rendez</Text>
        <Text style={s.headerSub}>Social dating partner platform — real-time stats</Text>
        {error && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Core stats */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Platform Overview</Text>
        <View style={s.grid}>
          <StatCard
            label="Active Users"
            value={stats?.totalProfiles ?? '—'}
            icon="people"
            color="#7c3aed"
          />
          <StatCard
            label="Matches"
            value={stats?.totalMatches ?? '—'}
            icon="heart"
            color="#ec4899"
          />
          <StatCard
            label="Meetups"
            value={stats?.validatedMeetups ?? '—'}
            icon="checkmark-circle"
            color="#059669"
          />
          <StatCard
            label="Gifts Sent"
            value={stats?.totalGifts ?? '—'}
            icon="gift"
            color="#f59e0b"
          />
          <StatCard
            label="Gift Value"
            value={
              stats
                ? `₹${Math.round(stats.giftValueAcceptedPaise / 100).toLocaleString('en-IN')}`
                : '—'
            }
            icon="cash"
            color="#2563eb"
          />
          <StatCard
            label="Fraud Flags"
            value={stats?.fraudFlags ?? '—'}
            icon="warning"
            color="#ef4444"
          />
          <StatCard
            label="Pending Reports"
            value={stats?.pendingReports ?? '—'}
            icon="flag"
            color="#d97706"
          />
        </View>
      </View>

      {/* Plans stats */}
      {planStats && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Plans (Social Invites)</Text>
          <View style={s.grid}>
            <StatCard
              label="Total Plans"
              value={planStats.totalPlans}
              icon="calendar"
              color="#7c3aed"
            />
            <StatCard label="Open" value={planStats.openPlans} icon="time" color="#059669" />
            <StatCard
              label="Filled"
              value={planStats.filledPlans}
              icon="people-circle"
              color="#2563eb"
            />
            <StatCard
              label="Completed"
              value={planStats.completedPlans}
              icon="checkmark-done"
              color="#059669"
            />
            <StatCard
              label="Applications"
              value={planStats.totalApplications}
              icon="person-add"
              color="#f59e0b"
            />
            <StatCard
              label="Confirmations"
              value={planStats.totalConfirmations}
              icon="thumbs-up"
              color="#7c3aed"
            />
          </View>
        </View>
      )}

      {/* Quick links */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={{ gap: 10 }}>
          {[
            {
              label: 'View Rendez Admin Panel',
              url: 'https://rendez-admin.vercel.app/dashboard',
              icon: 'open-outline',
            },
            { label: 'Rendez API Health', url: `${RENDEZ_API}/health`, icon: 'pulse-outline' },
            {
              label: 'Pending Reports',
              url: 'https://rendez-admin.vercel.app/moderation',
              icon: 'flag-outline',
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.url}
              style={[s.linkBtn, { backgroundColor: colors.card }]}
              onPress={() => openHttpUrl(item.url)}
            >
              <Ionicons name={item.icon as unknown as keyof typeof Ionicons.glyphMap} size={18} color="#7c3aed" />
              <Text style={[s.linkBtnText, { color: colors.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.icon} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

