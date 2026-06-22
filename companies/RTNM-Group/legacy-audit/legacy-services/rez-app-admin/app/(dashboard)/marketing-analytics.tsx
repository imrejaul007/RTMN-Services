/**
 * app/(dashboard)/marketing-analytics.tsx
 * Platform-wide marketing analytics across all merchants
 *
 * Displays:
 * - 4 KPI cards: Campaigns Sent, Messages Delivered, Avg Open Rate, Keyword Bids Active
 * - Top Channels breakdown with percentage bars
 * - Campaign Volume by Merchant — recent campaigns list
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/marketing-analytics.styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CampaignStatus = 'active' | 'completed' | 'draft';

interface ChannelBreakdown {
  name: string;
  percentage: number;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface CampaignRow {
  id: string;
  merchantName: string;
  channel: string;
  status: CampaignStatus;
  sentCount: number;
  campaignName: string;
  createdAt: string;
}

interface MarketingAnalyticsData {
  totalCampaignsSent: number;
  totalMessagesDelivered: number;
  averageOpenRate: number;
  totalKeywordBidsActive: number;
  channels: ChannelBreakdown[];
  recentCampaigns: CampaignRow[];
}

// Channel display config — maps backend channel key to icon + color
const CHANNEL_DISPLAY: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  push: { icon: 'notifications-outline', color: '#3B82F6' },
  sms: { icon: 'chatbubble-outline', color: '#10B981' },
  email: { icon: 'mail-outline', color: '#F59E0B' },
  whatsapp: { icon: 'logo-whatsapp', color: '#25D366' },
  'in-app': { icon: 'phone-portrait-outline', color: '#8B5CF6' },
};
const CHANNEL_DEFAULT = {
  icon: 'megaphone-outline' as keyof typeof Ionicons.glyphMap,
  color: '#6B7280',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  accentColor: string;
}

function KPICard({ label, value, subtext, icon, iconColor, accentColor }: KPICardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[s.kpiCard, { backgroundColor: colors.card, borderLeftColor: accentColor }]}>
      <View style={[s.kpiIconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={s.kpiContent}>
        <Text style={[s.kpiLabel, { color: colors.icon }]}>{label}</Text>
        <Text style={[s.kpiValue, { color: colors.text }]}>{value}</Text>
        {subtext ? (
          <Text style={[s.kpiSubtext, { color: colors.muted }]}>{subtext}</Text>
        ) : null}
      </View>
    </View>
  );
}

interface ChannelRowProps {
  channel: ChannelBreakdown;
}

function ChannelRow({ channel }: ChannelRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={s.channelRow}>
      <View style={s.channelLeft}>
        <View style={[s.channelIconWrap, { backgroundColor: `${channel.color}18` }]}>
          <Ionicons name={channel.icon} size={18} color={channel.color} />
        </View>
        <Text style={[s.channelName, { color: colors.text }]}>{channel.name}</Text>
      </View>
      <View style={s.channelBarArea}>
        <View style={[s.channelBarTrack, { backgroundColor: colors.gray200 }]}>
          <View
            style={[
              s.channelBarFill,
              { width: `${channel.percentage}%`, backgroundColor: channel.color },
            ]}
          />
        </View>
        <Text style={[s.channelPct, { color: colors.icon }]}>{channel.percentage}%</Text>
      </View>
      <Text style={[s.channelCount, { color: colors.muted }]}>
        {channel.count >= 1_000_000
          ? `${(channel.count / 1_000_000).toFixed(1)}M`
          : channel.count >= 1_000
            ? `${(channel.count / 1_000).toFixed(0)}K`
            : channel.count}
      </Text>
    </View>
  );
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: '#D1FAE5', text: '#065F46' },
  completed: { label: 'Completed', bg: '#DBEAFE', text: '#1E40AF' },
  draft: { label: 'Draft', bg: '#F3F4F6', text: '#374151' },
  sent: { label: 'Sent', bg: '#E0E7FF', text: '#3730A3' },
  scheduled: { label: 'Scheduled', bg: '#FEF3C7', text: '#92400E' },
  failed: { label: 'Failed', bg: '#FEE2E2', text: '#991B1B' },
};
const STATUS_DEFAULT = { label: 'Unknown', bg: '#F3F4F6', text: '#374151' };

interface CampaignCardProps {
  campaign: CampaignRow;
}

function CampaignCard({ campaign }: CampaignCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_DEFAULT;

  const CHANNEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    WhatsApp: 'logo-whatsapp',
    Push: 'notifications-outline',
    SMS: 'chatbubble-outline',
    Email: 'mail-outline',
    'In-App': 'phone-portrait-outline',
  };
  const channelIcon: keyof typeof Ionicons.glyphMap =
    CHANNEL_ICONS[campaign.channel] ?? 'megaphone-outline';

  return (
    <View
      style={[s.campaignCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={s.campaignTop}>
        <View style={s.campaignMerchantRow}>
          <Ionicons name="storefront-outline" size={14} color={colors.muted} />
          <Text style={[s.campaignMerchant, { color: colors.icon }]} numberOfLines={1}>
            {campaign.merchantName}
          </Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[s.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <Text style={[s.campaignName, { color: colors.text }]} numberOfLines={1}>
        {campaign.campaignName}
      </Text>

      <View style={s.campaignMeta}>
        <View style={s.metaItem}>
          <Ionicons name={channelIcon} size={13} color={colors.muted} />
          <Text style={[s.metaText, { color: colors.icon }]}>{campaign.channel}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="send-outline" size={13} color={colors.muted} />
          <Text style={[s.metaText, { color: colors.icon }]}>
            {campaign.sentCount > 0 ? campaign.sentCount.toLocaleString() : '—'} sent
          </Text>
        </View>
        <Text style={[s.metaDate, { color: colors.muted }]}>{campaign.createdAt}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MarketingAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [data, setData] = useState<MarketingAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/admin/marketing/analytics');
      if (!mountedRef.current) return;
      if (res.success && res.data) {
        const raw = res.data;

        // Transform channels: backend { channel, sent, delivered, campaigns }
        //                   → frontend { name, percentage, count, icon, color }
        const rawChannels: any[] = Array.isArray(raw.channels) ? raw.channels : [];
        const totalSent = rawChannels.reduce((s: number, c: any) => s + (c.sent || 0), 0) || 1;
        const channels: ChannelBreakdown[] = rawChannels.map((c: any) => {
          const key = (c.channel || 'unknown').toLowerCase();
          const display = CHANNEL_DISPLAY[key] || CHANNEL_DEFAULT;
          return {
            name:
              (c.channel || 'Unknown').charAt(0).toUpperCase() + (c.channel || 'unknown').slice(1),
            percentage: Math.round(((c.sent || 0) / totalSent) * 100),
            count: c.delivered || c.sent || 0,
            icon: display.icon,
            color: display.color,
          };
        });

        // Transform campaigns: backend { _id, name, channel, status, stats, createdAt }
        //                    → frontend { id, merchantName, channel, status, sentCount, campaignName, createdAt }
        const rawCampaigns: any[] = Array.isArray(raw.recentCampaigns) ? raw.recentCampaigns : [];
        const recentCampaigns: CampaignRow[] = rawCampaigns.map((c: any, idx: number) => ({
          id: c._id || c.id || `fallback-${Date.now().toString(36)}-${idx}`,
          merchantName: c.merchantName || c.merchant?.name || '—',
          channel:
            (c.channel || 'Unknown').charAt(0).toUpperCase() + (c.channel || 'unknown').slice(1),
          status: (c.status || 'draft') as CampaignStatus,
          sentCount: c.stats?.sent ?? c.sentCount ?? 0,
          campaignName: c.name || c.campaignName || 'Untitled Campaign',
          createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—',
        }));

        setData({
          totalCampaignsSent: raw.totalCampaignsSent ?? 0,
          totalMessagesDelivered: raw.totalMessagesDelivered ?? 0,
          averageOpenRate: raw.averageOpenRate ?? 0,
          totalKeywordBidsActive: raw.totalKeywordBidsActive ?? 0,
          channels,
          recentCampaigns,
        });
        setError(null);
      } else {
        setData(null);
        setError(res.message || 'Failed to load marketing analytics');
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      logger.warn('[MarketingAnalytics] API error:', err?.message);
      setData(null);
      setError(err?.message || 'Failed to load marketing analytics');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Loading state
  if (loading && !data) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>Loading analytics...</Text>
      </View>
    );
  }

  // Error state (should not normally be reached since we fall back to mock data)
  if (error && !data) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
        <Text style={[s.errorTitle, { color: colors.text }]}>Could not load data</Text>
        <Text style={[s.errorSubtext, { color: colors.icon }]}>{error}</Text>
        <TouchableOpacity
          style={[s.retryBtn, { backgroundColor: colors.tint }]}
          onPress={() => {
            setLoading(true);
            fetchData();
          }}
        >
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const analytics = data!;

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Marketing Analytics</Text>
          <Text style={[s.headerSubtitle, { color: colors.icon }]}>
            Platform-wide campaign intelligence
          </Text>
        </View>
        <View style={s.headerRight} />
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Cards                                                           */}
      {/* ------------------------------------------------------------------ */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: colors.icon }]}>OVERVIEW</Text>

        <View style={s.kpiGrid}>
          <KPICard
            label="Campaigns Sent"
            value={(analytics.totalCampaignsSent ?? 0).toLocaleString()}
            subtext="All time"
            icon="megaphone-outline"
            iconColor="#3B82F6"
            accentColor="#3B82F6"
          />
          <KPICard
            label="Messages Delivered"
            value={
              (analytics.totalMessagesDelivered ?? 0) >= 1_000_000
                ? `${((analytics.totalMessagesDelivered ?? 0) / 1_000_000).toFixed(2)}M`
                : `${((analytics.totalMessagesDelivered ?? 0) / 1_000).toFixed(0)}K`
            }
            subtext="Across all channels"
            icon="paper-plane-outline"
            iconColor="#10B981"
            accentColor="#10B981"
          />
        </View>

        <View style={[s.kpiGrid, { marginTop: 10 }]}>
          <KPICard
            label="Avg Open Rate"
            value={`${(analytics.averageOpenRate ?? 0).toFixed(1)}%`}
            subtext="Platform average"
            icon="eye-outline"
            iconColor="#F59E0B"
            accentColor="#F59E0B"
          />
          <KPICard
            label="Keyword Bids Active"
            value={(analytics.totalKeywordBidsActive ?? 0).toLocaleString()}
            subtext="Live right now"
            icon="pricetag-outline"
            iconColor="#8B5CF6"
            accentColor="#8B5CF6"
          />
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Top Channels                                                        */}
      {/* ------------------------------------------------------------------ */}
      <View style={[s.section, { borderTopWidth: 1, borderTopColor: colors.border }]}>
        <Text style={[s.sectionLabel, { color: colors.icon }]}>TOP CHANNELS</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {analytics.channels.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="analytics-outline" size={28} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
                No channel data yet
              </Text>
            </View>
          ) : (
            analytics.channels.map((ch, idx) => (
              <View key={ch.name}>
                <ChannelRow channel={ch} />
                {idx < analytics.channels.length - 1 && (
                  <View style={[s.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))
          )}
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Campaign Volume by Merchant                                         */}
      {/* ------------------------------------------------------------------ */}
      <View style={[s.section, { borderTopWidth: 1, borderTopColor: colors.border }]}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionLabel, { color: colors.icon }]}>
            CAMPAIGN VOLUME BY MERCHANT
          </Text>
          <Text style={[s.sectionCount, { color: colors.muted }]}>
            {analytics.recentCampaigns.length} campaigns
          </Text>
        </View>

        {analytics.recentCampaigns.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="megaphone-outline" size={28} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
              No campaigns yet
            </Text>
          </View>
        ) : (
          analytics.recentCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))
        )}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={[s.footerText, { color: colors.muted }]}>
          Pull to refresh · Data from /admin/marketing/analytics
        </Text>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

