/**
 * app/(dashboard)/karma-admin.tsx — NGO Karma Admin Dashboard
 *
 * Complete karma management dashboard for NGO operations including:
 * - Events: Create, publish, and manage karma events
 * - Bookings: Approve/reject volunteer bookings with verification signals
 * - Leaderboard: View karma rankings by scope and period
 * - Badges: View earned badges by level
 * - CSR: Manage corporate partner relationships and credits
 * - Communities: View cause communities and their engagement
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/karma-admin.styles';
import {
  karmaAdminService,
  KarmaEvent,
  KarmaBooking,
  KarmaEventStatus,
  KarmaBookingStatus,
  LeaderboardEntry,
  KarmaBadge,
  CSRPartner,
  KarmaCommunity,
  KarmaStats,
  LeaderboardScope,
  LeaderboardPeriod,
  BadgeLevel,
  KarmaEventRequest,
  CSRPartnerRequest,
} from '../../services/api/karma-admin';
import { logger } from '../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'events' | 'bookings' | 'leaderboard' | 'badges' | 'csr' | 'communities';

// Tab configuration
const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'events', label: 'Events', icon: 'heart' },
  { key: 'bookings', label: 'Bookings', icon: 'ticket' },
  { key: 'leaderboard', label: 'Rankings', icon: 'trophy' },
  { key: 'badges', label: 'Badges', icon: 'medal' },
  { key: 'csr', label: 'CSR', icon: 'business' },
  { key: 'communities', label: 'Communities', icon: 'people' },
];

// Difficulty colors
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#EF4444',
};

// Tier colors
const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#9CA3AF',
  gold: '#F59E0B',
  platinum: '#8B5CF6',
  diamond: '#06B6D4',
};

// Badge level colors
const BADGE_LEVEL_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#9CA3AF',
  gold: '#F59E0B',
  platinum: '#8B5CF6',
  diamond: '#06B6D4',
};

// Event status configuration
const EVENT_STATUS_CONFIG: Record<KarmaEventStatus, { text: string; color: string; icon: string }> = {
  draft: { text: 'Draft', color: '#9CA3AF', icon: 'document-text' },
  published: { text: 'Published', color: '#10B981', icon: 'checkmark-circle' },
  ongoing: { text: 'Ongoing', color: '#3B82F6', icon: 'play-circle' },
  completed: { text: 'Completed', color: '#8B5CF6', icon: 'flag' },
  cancelled: { text: 'Cancelled', color: '#EF4444', icon: 'close-circle' },
};

// Booking status configuration
const BOOKING_STATUS_CONFIG: Record<KarmaBookingStatus, { text: string; color: string; icon: string }> = {
  pending: { text: 'Pending', color: '#F59E0B', icon: 'time' },
  approved: { text: 'Approved', color: '#10B981', icon: 'checkmark-circle' },
  rejected: { text: 'Rejected', color: '#EF4444', icon: 'close-circle' },
  completed: { text: 'Completed', color: '#8B5CF6', icon: 'flag' },
  cancelled: { text: 'Cancelled', color: '#9CA3AF', icon: 'close' },
};

// Leaderboard scopes
const SCOPE_OPTIONS: { key: LeaderboardScope; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'city', label: 'City' },
  { key: 'cause', label: 'Cause' },
];

// Leaderboard periods
const PERIOD_OPTIONS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all-time', label: 'All Time' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'daily', label: 'Today' },
];

// Badge levels for filter
const BADGE_LEVEL_OPTIONS: { key: BadgeLevel | 'all'; label: string }[] = [
  { key: 'all', label: 'All Levels' },
  { key: 'bronze', label: 'Bronze' },
  { key: 'silver', label: 'Silver' },
  { key: 'gold', label: 'Gold' },
  { key: 'platinum', label: 'Platinum' },
  { key: 'diamond', label: 'Diamond' },
];

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function truncateUserId(userId: string): string {
  if (!userId) return 'Unknown';
  if (userId.length <= 8) return userId;
  return userId.substring(0, 4) + '...' + userId.substring(userId.length - 4);
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getConfidenceColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function KarmaAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // ── Tab State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [refreshing, setRefreshing] = useState(false);

  // ── Events State ──────────────────────────────────────────────────────────
  const [events, setEvents] = useState<KarmaEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<KarmaEventStatus | 'all'>('all');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<KarmaEvent | null>(null);
  const [eventFormData, setEventFormData] = useState<KarmaEventRequest>({
    title: '',
    description: '',
    category: '',
    maxVolunteers: 10,
    startDate: new Date().toISOString(),
    status: 'draft',
  });

  // ── Bookings State ─────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<KarmaBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<KarmaBookingStatus | 'all'>('pending');
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  // ── Leaderboard State ──────────────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>('global');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('all-time');

  // ── Badges State ───────────────────────────────────────────────────────────
  const [badges, setBadges] = useState<KarmaBadge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [badgeLevelFilter, setBadgeLevelFilter] = useState<BadgeLevel | 'all'>('all');

  // ── CSR State ──────────────────────────────────────────────────────────────
  const [partners, setPartners] = useState<CSRPartner[]>([]);
  const [csrLoading, setCsrLoading] = useState(true);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<CSRPartner | null>(null);
  const [partnerFormData, setPartnerFormData] = useState<CSRPartnerRequest>({
    companyName: '',
    email: '',
    phone: '',
    budget: 0,
  });

  // ── Communities State ──────────────────────────────────────────────────────
  const [communities, setCommunities] = useState<KarmaCommunity[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);

  // ── Stats State ────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<KarmaStats>({
    totalEvents: 0,
    activeEvents: 0,
    totalVolunteers: 0,
    totalKarmaDistributed: 0,
    totalBadgesAwarded: 0,
    pendingBookings: 0,
    totalCommunities: 0,
    topCauses: [],
  });

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadEvents = useCallback(async () => {
    try {
      const result = await karmaAdminService.getEvents({
        status: eventStatusFilter !== 'all' ? eventStatusFilter : undefined,
        search: eventSearch || undefined,
      });
      setEvents(result.events);
      if (result.stats) {
        setStats((prev) => ({ ...prev, ...result.stats }));
      }
    } catch (error) {
      logger.error('Error loading events:', error);
    } finally {
      setEventsLoading(false);
    }
  }, [eventStatusFilter, eventSearch]);

  const loadBookings = useCallback(async () => {
    try {
      const result = await karmaAdminService.getBookings({
        status: bookingStatusFilter !== 'all' ? bookingStatusFilter : undefined,
      });
      setBookings(result.bookings);
      setStats((prev) => ({
        ...prev,
        pendingBookings: result.stats.pending,
      }));
    } catch (error) {
      logger.error('Error loading bookings:', error);
    } finally {
      setBookingsLoading(false);
    }
  }, [bookingStatusFilter]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const result = await karmaAdminService.getLeaderboard({
        scope: leaderboardScope,
        period: leaderboardPeriod,
        limit: 50,
      });
      setLeaderboard(result.entries);
    } catch (error) {
      logger.error('Error loading leaderboard:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [leaderboardScope, leaderboardPeriod]);

  const loadBadges = useCallback(async () => {
    try {
      const result = await karmaAdminService.getBadges({
        level: badgeLevelFilter !== 'all' ? badgeLevelFilter : undefined,
      });
      setBadges(result.badges);
    } catch (error) {
      logger.error('Error loading badges:', error);
    } finally {
      setBadgesLoading(false);
    }
  }, [badgeLevelFilter]);

  const loadCSRPartners = useCallback(async () => {
    try {
      const result = await karmaAdminService.getCSRPartners();
      setPartners(result.partners);
    } catch (error) {
      logger.error('Error loading CSR partners:', error);
    } finally {
      setCsrLoading(false);
    }
  }, []);

  const loadCommunities = useCallback(async () => {
    try {
      const result = await karmaAdminService.getCommunities();
      setCommunities(result.communities);
      setStats((prev) => ({
        ...prev,
        totalCommunities: result.communities.length,
      }));
    } catch (error) {
      logger.error('Error loading communities:', error);
    } finally {
      setCommunitiesLoading(false);
    }
  }, []);

  // ── Initial Load & Refresh ──────────────────────────────────────────────────

  useEffect(() => {
    setEventsLoading(true);
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      setBookingsLoading(true);
      loadBookings();
    }
  }, [activeTab, loadBookings]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      setLeaderboardLoading(true);
      loadLeaderboard();
    }
  }, [activeTab, loadLeaderboard]);

  useEffect(() => {
    if (activeTab === 'badges') {
      setBadgesLoading(true);
      loadBadges();
    }
  }, [activeTab, loadBadges]);

  useEffect(() => {
    if (activeTab === 'csr') {
      setCsrLoading(true);
      loadCSRPartners();
    }
  }, [activeTab, loadCSRPartners]);

  useEffect(() => {
    if (activeTab === 'communities') {
      setCommunitiesLoading(true);
      loadCommunities();
    }
  }, [activeTab, loadCommunities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    switch (activeTab) {
      case 'events':
        await loadEvents();
        break;
      case 'bookings':
        await loadBookings();
        break;
      case 'leaderboard':
        await loadLeaderboard();
        break;
      case 'badges':
        await loadBadges();
        break;
      case 'csr':
        await loadCSRPartners();
        break;
      case 'communities':
        await loadCommunities();
        break;
    }
    setRefreshing(false);
  }, [activeTab, loadEvents, loadBookings, loadLeaderboard, loadBadges, loadCSRPartners, loadCommunities]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventFormData({
      title: '',
      description: '',
      category: '',
      maxVolunteers: 10,
      startDate: new Date().toISOString(),
      status: 'draft',
    });
    setShowEventModal(true);
  };

  const handleEditEvent = (event: KarmaEvent) => {
    setEditingEvent(event);
    setEventFormData({
      title: event.title,
      description: event.description || '',
      category: event.category,
      difficulty: event.difficulty,
      baseKarma: event.baseKarma,
      karmaPerHour: event.karmaPerHour,
      maxVolunteers: event.maxVolunteers,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      verificationMethods: event.verificationMethods,
      image: event.image,
      status: event.status,
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!eventFormData.title?.trim()) {
      showAlert('Error', 'Event title is required');
      return;
    }
    if (!eventFormData.category?.trim()) {
      showAlert('Error', 'Event category is required');
      return;
    }

    try {
      if (editingEvent) {
        await karmaAdminService.updateEvent(editingEvent._id, eventFormData);
        showAlert('Success', 'Event updated successfully');
      } else {
        await karmaAdminService.createEvent(eventFormData);
        showAlert('Success', 'Event created successfully');
      }
      setShowEventModal(false);
      loadEvents();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save event');
    }
  };

  const handlePublishEvent = (event: KarmaEvent) => {
    showConfirm(
      'Publish Event',
      `Publish "${event.title}"? It will be visible to volunteers.`,
      async () => {
        try {
          await karmaAdminService.publishEvent(event._id);
          showAlert('Success', 'Event published successfully');
          loadEvents();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to publish event');
        }
      }
    );
  };

  const handleDeleteEvent = (event: KarmaEvent) => {
    showConfirm(
      'Delete Event',
      `Delete "${event.title}"? This cannot be undone.`,
      async () => {
        try {
          await karmaAdminService.deleteEvent(event._id);
          showAlert('Success', 'Event deleted');
          loadEvents();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete event');
        }
      }
    );
  };

  // ============================================================================
  // BOOKING HANDLERS
  // ============================================================================

  const handleApproveBooking = (booking: KarmaBooking) => {
    showConfirm(
      'Approve Booking',
      `Approve booking from ${booking.userId.displayName || 'this user'} for "${booking.event.title}"?`,
      async () => {
        setProcessingBookingId(booking._id);
        try {
          await karmaAdminService.approveBooking(booking._id);
          showAlert('Success', 'Booking approved');
          loadBookings();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to approve booking');
        } finally {
          setProcessingBookingId(null);
        }
      }
    );
  };

  const handleRejectBooking = (booking: KarmaBooking) => {
    showConfirm(
      'Reject Booking',
      `Reject booking from ${booking.userId.displayName || 'this user'}?`,
      async () => {
        setProcessingBookingId(booking._id);
        try {
          await karmaAdminService.rejectBooking(booking._id);
          showAlert('Success', 'Booking rejected');
          loadBookings();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to reject booking');
        } finally {
          setProcessingBookingId(null);
        }
      }
    );
  };

  // ============================================================================
  // CSR PARTNER HANDLERS
  // ============================================================================

  const handleAddPartner = () => {
    setEditingPartner(null);
    setPartnerFormData({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      budget: 0,
      tier: 'bronze',
    });
    setShowPartnerModal(true);
  };

  const handleEditPartner = (partner: CSRPartner) => {
    setEditingPartner(partner);
    setPartnerFormData({
      companyName: partner.companyName,
      contactPerson: partner.contactPerson,
      email: partner.email,
      phone: partner.phone,
      budget: partner.budget,
      tier: partner.tier,
    });
    setShowPartnerModal(true);
  };

  const handleSavePartner = async () => {
    if (!partnerFormData.companyName?.trim()) {
      showAlert('Error', 'Company name is required');
      return;
    }
    if (!partnerFormData.budget || partnerFormData.budget <= 0) {
      showAlert('Error', 'Valid budget is required');
      return;
    }

    try {
      if (editingPartner) {
        await karmaAdminService.updateCSRPartner(editingPartner._id, partnerFormData);
        showAlert('Success', 'Partner updated successfully');
      } else {
        await karmaAdminService.addCSRPartner(partnerFormData);
        showAlert('Success', 'Partner added successfully');
      }
      setShowPartnerModal(false);
      loadCSRPartners();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save partner');
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderHeader = () => (
    <View style={s.header}>
      <View>
        <Text style={[s.headerTitle, { color: colors.text }]}>Karma Admin</Text>
        <Text style={[s.headerSubtitle, { color: colors.icon }]}>
          NGO Impact Dashboard
        </Text>
      </View>
      {activeTab === 'events' && (
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: colors.tint }]}
          onPress={handleCreateEvent}
        >
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={s.createBtnText}>New Event</Text>
        </TouchableOpacity>
      )}
      {activeTab === 'csr' && (
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: colors.tint }]}
          onPress={handleAddPartner}
        >
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={s.createBtnText}>Add Partner</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStatsCards = () => (
    <View style={s.statsRow}>
      {[
        {
          label: 'Events',
          value: stats.totalEvents,
          color: colors.tint,
          icon: 'heart',
        },
        {
          label: 'Volunteers',
          value: stats.totalVolunteers,
          color: colors.success,
          icon: 'people',
        },
        {
          label: 'Pending',
          value: stats.pendingBookings,
          color: colors.warning,
          icon: 'ticket',
        },
        {
          label: 'Karma',
          value: formatNumber(stats.totalKarmaDistributed),
          color: colors.purple,
          icon: 'star',
        },
      ].map((item, index) => (
        <View key={index} style={[s.statItem, { backgroundColor: colors.card }]}>
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={item.color}
            style={{ marginBottom: 4 }}
          />
          <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[s.statLabel, { color: colors.icon }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderTabs = () => (
    <View style={s.tabsWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContent}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabItem, { backgroundColor: isActive ? colors.tint : colors.card }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={isActive ? colors.card : colors.icon}
              />
              <Text style={[s.tabLabel, { color: isActive ? colors.card : colors.icon }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Events Tab ──────────────────────────────────────────────────────────────

  const renderEventFilters = () => (
    <View style={s.searchFilterContainer}>
      <View style={[s.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          value={eventSearch}
          onChangeText={setEventSearch}
          placeholder="Search events..."
          placeholderTextColor={colors.icon}
        />
        {eventSearch.length > 0 && (
          <TouchableOpacity onPress={() => setEventSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsRow}>
        {['all', 'draft', 'published', 'ongoing', 'completed'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              s.filterChip,
              { borderColor: eventStatusFilter === status ? colors.tint : colors.border },
              eventStatusFilter === status && { backgroundColor: `${colors.tint}15` },
            ]}
            onPress={() => setEventStatusFilter(status as KarmaEventStatus | 'all')}
          >
            <Text
              style={[
                s.filterChipText,
                { color: eventStatusFilter === status ? colors.tint : colors.icon },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEventCard = useCallback(
    ({ item }: { item: KarmaEvent }) => {
      const statusConfig = EVENT_STATUS_CONFIG[item.status];
      return (
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <View style={s.cardImageRow}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={s.cardImage} resizeMode="cover" />
            ) : (
              <View style={[s.cardImagePlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="heart-outline" size={28} color={colors.icon} />
              </View>
            )}
            <View style={s.cardBadgesCol}>
              <View style={[s.statusChip, { backgroundColor: `${statusConfig.color}15` }]}>
                <Ionicons
                  name={statusConfig.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={statusConfig.color}
                />
                <Text style={[s.statusLabel, { color: statusConfig.color }]}>{statusConfig.text}</Text>
              </View>
              <View style={[s.difficultyBadge, { backgroundColor: `${DIFFICULTY_COLORS[item.difficulty]}15` }]}>
                <Text style={[s.difficultyLabel, { color: DIFFICULTY_COLORS[item.difficulty] }]}>
                  {item.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[s.cardSubtitle, { color: colors.icon }]} numberOfLines={1}>
            {item.category}
          </Text>

          <View style={s.metaRow}>
            <View style={s.metaChip}>
              <Ionicons name="calendar-outline" size={12} color={colors.icon} />
              <Text style={[s.metaText, { color: colors.icon }]}>{formatDate(item.startDate)}</Text>
            </View>
            <View style={s.metaChip}>
              <Ionicons name="star" size={12} color={colors.warning} />
              <Text style={[s.karmaValue, { color: colors.warning }]}>
                {item.baseKarma} karma
              </Text>
            </View>
            <View style={s.metaChip}>
              <Ionicons name="people-outline" size={12} color={colors.icon} />
              <Text style={[s.metaText, { color: colors.icon }]}>
                {item.confirmedCount}/{item.maxVolunteers}
              </Text>
            </View>
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionIconBtn, { backgroundColor: `${colors.info}10` }]}
              onPress={() => handleEditEvent(item)}
            >
              <Ionicons name="pencil" size={16} color={colors.info} />
            </TouchableOpacity>
            {item.status === 'draft' && (
              <TouchableOpacity
                style={[s.actionIconBtn, { backgroundColor: `${colors.success}10` }]}
                onPress={() => handlePublishEvent(item)}
              >
                <Ionicons name="cloud-upload" size={16} color={colors.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.actionIconBtn, { backgroundColor: `${colors.error}10` }]}
              onPress={() => handleDeleteEvent(item)}
            >
              <Ionicons name="trash" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [colors]
  );

  // ── Bookings Tab ────────────────────────────────────────────────────────────

  const renderBookingFilters = () => (
    <View style={s.searchFilterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsRow}>
        {['all', 'pending', 'approved', 'rejected', 'completed'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              s.filterChip,
              { borderColor: bookingStatusFilter === status ? colors.tint : colors.border },
              bookingStatusFilter === status && { backgroundColor: `${colors.tint}15` },
            ]}
            onPress={() => setBookingStatusFilter(status as KarmaBookingStatus | 'all')}
          >
            <Text
              style={[
                s.filterChipText,
                { color: bookingStatusFilter === status ? colors.tint : colors.icon },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderBookingCard = useCallback(
    ({ item }: { item: KarmaBooking }) => {
      const statusConfig = BOOKING_STATUS_CONFIG[item.status];
      const isProcessing = processingBookingId === item._id;

      return (
        <View style={[s.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.bookingCardHeader}>
            <View>
              <Text style={[s.bookingUserName, { color: colors.text }]}>
                {item.userId.displayName || `${item.userId.firstName || ''} ${item.userId.lastName || ''}`.trim() || 'Unknown'}
              </Text>
              {item.userId.phone && (
                <Text style={[s.bookingUserPhone, { color: colors.icon }]}>{item.userId.phone}</Text>
              )}
            </View>
            <View style={[s.bookingStatusChip, { backgroundColor: `${statusConfig.color}15` }]}>
              <Text style={[s.bookingStatusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
            </View>
          </View>

          <Text style={[s.bookingRef, { color: colors.icon }]}>
            <Ionicons name="ticket-outline" size={12} color={colors.icon} /> {item.bookingRef}
          </Text>

          <Text style={[s.cardSubtitle, { color: colors.tint, marginBottom: 8 }]}>
            {item.event.title}
          </Text>

          {item.confidenceScore !== undefined && (
            <View style={s.confidenceBar}>
              <View
                style={[
                  s.confidenceFill,
                  {
                    width: `${item.confidenceScore}%`,
                    backgroundColor: getConfidenceColor(item.confidenceScore),
                  },
                ]}
              />
            </View>
          )}

          <View style={s.verificationRow}>
            {item.verificationSignals?.qrIn && (
              <View style={[s.verificationChip, { backgroundColor: `${colors.success}15` }]}>
                <Ionicons name="qr-code" size={12} color={colors.success} />
                <Text style={[s.verificationText, { color: colors.success }]}>QR In</Text>
              </View>
            )}
            {item.verificationSignals?.qrOut && (
              <View style={[s.verificationChip, { backgroundColor: `${colors.success}15` }]}>
                <Ionicons name="qr-code" size={12} color={colors.success} />
                <Text style={[s.verificationText, { color: colors.success }]}>QR Out</Text>
              </View>
            )}
            {item.verificationSignals?.gpsMatch && (
              <View style={[s.verificationChip, { backgroundColor: `${colors.info}15` }]}>
                <Ionicons name="location" size={12} color={colors.info} />
                <Text style={[s.verificationText, { color: colors.info }]}>GPS Match</Text>
              </View>
            )}
            {item.verificationSignals?.ngoApproved && (
              <View style={[s.verificationChip, { backgroundColor: `${colors.purple}15` }]}>
                <Ionicons name="shield-checkmark" size={12} color={colors.purple} />
                <Text style={[s.verificationText, { color: colors.purple }]}>NGO Approved</Text>
              </View>
            )}
          </View>

          <View style={[s.bookingCardMeta, { borderTopColor: colors.border }]}>
            <View style={s.bookingMetaItem}>
              <Ionicons name="time-outline" size={14} color={colors.icon} />
              <Text style={[s.bookingMetaText, { color: colors.icon }]}>
                {formatDate(item.appliedAt)}
              </Text>
            </View>
            {item.karmaEarned !== undefined && (
              <View style={s.bookingMetaItem}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={[s.bookingMetaText, { color: colors.warning }]}>
                  {item.karmaEarned} earned
                </Text>
              </View>
            )}
          </View>

          {item.status === 'pending' && (
            <View style={[s.actionRow, { marginTop: 12 }]}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.success, flex: 1 }]}
                onPress={() => handleApproveBooking(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={colors.card} />
                    <Text style={[s.actionBtnText, { color: colors.card }]}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.error, flex: 1 }]}
                onPress={() => handleRejectBooking(item)}
                disabled={isProcessing}
              >
                <Ionicons name="close" size={16} color={colors.card} />
                <Text style={[s.actionBtnText, { color: colors.card }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [colors, processingBookingId]
  );

  // ── Leaderboard Tab ────────────────────────────────────────────────────────

  const renderLeaderboard = () => (
    <>
      <View style={s.subTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subTabsContent}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PERIOD_OPTIONS.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  s.subTabItem,
                  { backgroundColor: leaderboardPeriod === period.key ? colors.tint : colors.card },
                ]}
                onPress={() => setLeaderboardPeriod(period.key)}
              >
                <Text
                  style={[
                    s.subTabLabel,
                    { color: leaderboardPeriod === period.key ? colors.card : colors.icon },
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={s.subTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subTabsContent}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SCOPE_OPTIONS.map((scope) => (
              <TouchableOpacity
                key={scope.key}
                style={[
                  s.subTabItem,
                  { backgroundColor: leaderboardScope === scope.key ? colors.purple : colors.card },
                ]}
                onPress={() => setLeaderboardScope(scope.key)}
              >
                <Text
                  style={[
                    s.subTabLabel,
                    { color: leaderboardScope === scope.key ? colors.card : colors.icon },
                  ]}
                >
                  {scope.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  );

  const renderLeaderboardCard = useCallback(
    ({ item, index }: { item: LeaderboardEntry; index: number }) => {
      const rank = item.rank || index + 1;
      const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
      const rankColor = rank <= 3 ? rankColors[rank - 1] : colors.icon;

      return (
        <View style={[s.leaderboardCard, { backgroundColor: colors.card }]}>
          <View style={[s.rankNumber, { backgroundColor: rank <= 3 ? `${rankColor}20` : colors.backgroundSecondary }]}>
            <Text style={[s.rankText, { color: rankColor }]}>#{rank}</Text>
          </View>

          <View style={[s.userAvatar, { backgroundColor: colors.tint }]}>
            {item.userId.avatar ? (
              <Image source={{ uri: item.userId.avatar }} style={s.userAvatar} />
            ) : (
              <Text style={[s.userAvatarText, { color: colors.card }]}>
                {getInitials(item.userId.displayName)}
              </Text>
            )}
          </View>

          <View style={s.leaderboardInfo}>
            <Text style={[s.leaderboardName, { color: colors.text }]}>
              {item.userId.displayName}
            </Text>
            <View style={s.leaderboardMeta}>
              {item.band && (
                <Text style={[s.metaText, { color: colors.tint }]}>Lv.{item.level} {item.band}</Text>
              )}
              {item.streak && (
                <Text style={[s.metaText, { color: colors.warning }]}>
                  {item.streak} day streak
                </Text>
              )}
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.leaderboardKarma, { color: colors.warning }]}>
              {formatNumber(item.karma)}
            </Text>
            <Text style={[s.metaText, { color: colors.icon }]}>karma</Text>
          </View>
        </View>
      );
    },
    [colors]
  );

  // ── Badges Tab ─────────────────────────────────────────────────────────────

  const renderBadgeFilters = () => (
    <View style={s.searchFilterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsRow}>
        {BADGE_LEVEL_OPTIONS.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[
              s.filterChip,
              { borderColor: badgeLevelFilter === level.key ? colors.tint : colors.border },
              badgeLevelFilter === level.key && { backgroundColor: `${colors.tint}15` },
            ]}
            onPress={() => setBadgeLevelFilter(level.key)}
          >
            <Text
              style={[
                s.filterChipText,
                { color: badgeLevelFilter === level.key ? colors.tint : colors.icon },
              ]}
            >
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderBadgeCard = useCallback(
    ({ item }: { item: KarmaBadge }) => {
      const levelColor = BADGE_LEVEL_COLORS[item.level] || colors.icon;

      return (
        <View style={[s.badgeCard, { backgroundColor: colors.card }]}>
          <View style={[s.badgeIcon, { backgroundColor: `${levelColor}20` }]}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap || 'ribbon'} size={28} color={levelColor} />
          </View>
          <Text style={[s.badgeName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[s.badgeCount, { color: colors.icon }]}>
            {item.earnedCount.toLocaleString()} earned
          </Text>
          <View style={[s.badgeLevel, { backgroundColor: `${levelColor}20` }]}>
            <Text style={[s.badgeLevel, { color: levelColor }]}>
              {item.level.toUpperCase()}
            </Text>
          </View>
        </View>
      );
    },
    [colors]
  );

  // ── CSR Tab ────────────────────────────────────────────────────────────────

  const renderPartnerCard = useCallback(
    ({ item }: { item: CSRPartner }) => {
      const tierColor = TIER_COLORS[item.tier] || colors.icon;
      const creditPercent = item.budget > 0 ? (item.creditsUsed / item.budget) * 100 : 0;

      return (
        <TouchableOpacity
          style={[s.partnerCard, { backgroundColor: colors.card }]}
          onPress={() => handleEditPartner(item)}
        >
          <View style={s.partnerHeader}>
            <View style={[s.partnerLogo, { backgroundColor: `${tierColor}20` }]}>
              <Text style={[s.partnerLogoText, { color: tierColor }]}>
                {item.companyName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={s.partnerInfo}>
              <Text style={[s.partnerName, { color: colors.text }]}>{item.companyName}</Text>
              {item.contactPerson && (
                <Text style={[s.partnerContact, { color: colors.icon }]}>{item.contactPerson}</Text>
              )}
            </View>
            <View style={[s.tierBadge, { backgroundColor: `${tierColor}20` }]}>
              <Text style={[s.tierLabel, { color: tierColor }]}>{item.tier}</Text>
            </View>
          </View>

          <View style={[s.creditBar, { backgroundColor: colors.backgroundSecondary }]}>
            <View
              style={[
                s.creditBarFill,
                { width: `${Math.min(creditPercent, 100)}%`, backgroundColor: tierColor },
              ]}
            />
          </View>
          <View style={s.creditLabels}>
            <Text style={[s.creditText, { color: colors.icon }]}>
              Used: {item.creditsUsed.toLocaleString()}
            </Text>
            <Text style={[s.creditText, { color: colors.text }]}>
              Budget: {item.budget.toLocaleString()}
            </Text>
          </View>

          <View style={s.metaRow}>
            <View style={s.metaChip}>
              <Ionicons name="calendar-outline" size={12} color={colors.icon} />
              <Text style={[s.metaText, { color: colors.icon }]}>
                Since {formatDate(item.activeSince)}
              </Text>
            </View>
            <View style={s.metaChip}>
              <Ionicons name="heart-outline" size={12} color={colors.icon} />
              <Text style={[s.metaText, { color: colors.icon }]}>
                {item.totalEventsSponsored} events
              </Text>
            </View>
            <View style={s.metaChip}>
              <Ionicons name="people-outline" size={12} color={colors.icon} />
              <Text style={[s.metaText, { color: colors.icon }]}>
                {item.totalVolunteersEngaged} volunteers
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors]
  );

  // ── Communities Tab ────────────────────────────────────────────────────────

  const renderCommunityCard = useCallback(
    ({ item }: { item: KarmaCommunity }) => (
      <View style={[s.communityCard, { backgroundColor: colors.card }]}>
        <View style={s.communityHeader}>
          <View style={[s.communityIcon, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap || 'people'} size={24} color={item.color} />
          </View>
          <View style={s.communityInfo}>
            <Text style={[s.communityName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[s.cardSubtitle, { color: colors.icon }]} numberOfLines={1}>
              {item.description}
            </Text>
          </View>
        </View>

        <View style={s.communityStats}>
          <View style={s.communityStat}>
            <Ionicons name="people" size={14} color={colors.icon} />
            <Text style={[s.communityStatText, { color: colors.text }]}>
              {item.memberCount.toLocaleString()} members
            </Text>
          </View>
          <View style={s.communityStat}>
            <Ionicons name="heart" size={14} color={colors.icon} />
            <Text style={[s.communityStatText, { color: colors.text }]}>
              {item.eventCount} events
            </Text>
          </View>
          {item.recentPostCount !== undefined && (
            <View style={s.communityStat}>
              <Ionicons name="chatbubbles" size={14} color={colors.icon} />
              <Text style={[s.communityStatText, { color: colors.text }]}>
                {item.recentPostCount} posts
              </Text>
            </View>
          )}
        </View>
      </View>
    ),
    [colors]
  );

  // ── Empty States ───────────────────────────────────────────────────────────

  const renderEmptyState = (message: string, icon: string) => (
    <View style={s.emptyState}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={48} color={colors.icon} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No Data Found</Text>
      <Text style={[s.emptyText, { color: colors.icon }]}>{message}</Text>
    </View>
  );

  // ── Loading State ─────────────────────────────────────────────────────────

  const renderLoading = () => (
    <View style={s.loadingContainer}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={[s.loadingText, { color: colors.icon }]}>Loading...</Text>
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const renderContent = () => {
    switch (activeTab) {
      case 'events':
        return (
          <>
            {renderEventFilters()}
            {eventsLoading ? (
              renderLoading()
            ) : events.length === 0 ? (
              renderEmptyState('No events found', 'heart-outline')
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item._id}
                renderItem={renderEventCard}
                scrollEnabled={false}
                contentContainerStyle={s.listContent}
              />
            )}
          </>
        );

      case 'bookings':
        return (
          <>
            {renderBookingFilters()}
            {bookingsLoading ? (
              renderLoading()
            ) : bookings.length === 0 ? (
              renderEmptyState('No bookings found', 'ticket-outline')
            ) : (
              <FlatList
                data={bookings}
                keyExtractor={(item) => item._id}
                renderItem={renderBookingCard}
                scrollEnabled={false}
                contentContainerStyle={s.listContent}
              />
            )}
          </>
        );

      case 'leaderboard':
        return (
          <>
            {renderLeaderboard()}
            {leaderboardLoading ? (
              renderLoading()
            ) : leaderboard.length === 0 ? (
              renderEmptyState('No rankings available', 'trophy-outline')
            ) : (
              <FlatList
                data={leaderboard}
                keyExtractor={(item, index) => item.userId._id || index.toString()}
                renderItem={renderLeaderboardCard}
                scrollEnabled={false}
                contentContainerStyle={s.listContent}
              />
            )}
          </>
        );

      case 'badges':
        return (
          <>
            {renderBadgeFilters()}
            {badgesLoading ? (
              renderLoading()
            ) : badges.length === 0 ? (
              renderEmptyState('No badges found', 'medal-outline')
            ) : (
              <View style={s.badgeGrid}>
                {badges.map((badge) => (
                  <View key={badge._id} style={{ width: '48%' }}>
                    {renderBadgeCard({ item: badge })}
                  </View>
                ))}
              </View>
            )}
          </>
        );

      case 'csr':
        return (
          <>
            {csrLoading ? (
              renderLoading()
            ) : partners.length === 0 ? (
              renderEmptyState('No CSR partners found', 'business-outline')
            ) : (
              <FlatList
                data={partners}
                keyExtractor={(item) => item._id}
                renderItem={renderPartnerCard}
                scrollEnabled={false}
                contentContainerStyle={s.listContent}
              />
            )}
          </>
        );

      case 'communities':
        return (
          <>
            {communitiesLoading ? (
              renderLoading()
            ) : communities.length === 0 ? (
              renderEmptyState('No communities found', 'people-outline')
            ) : (
              <FlatList
                data={communities}
                keyExtractor={(item) => item._id}
                renderItem={renderCommunityCard}
                scrollEnabled={false}
                contentContainerStyle={s.listContent}
              />
            )}
          </>
        );

      default:
        return null;
    }
  };

  const ListHeader = () => (
    <>
      {renderHeader()}
      {renderStatsCards()}
      {renderTabs()}
    </>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={activeTab === 'badges' ? badges : activeTab === 'leaderboard' ? leaderboard : []}
        keyExtractor={(item, index) => (item as any)._id || (item as any).userId?._id || index.toString()}
        renderItem={
          activeTab === 'badges'
            ? (renderBadgeCard as any)
            : activeTab === 'leaderboard'
            ? (renderLeaderboardCard as any)
            : undefined
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !eventsLoading &&
          !bookingsLoading &&
          !leaderboardLoading &&
          !badgesLoading &&
          !csrLoading &&
          !communitiesLoading
            ? () => renderEmptyState('Pull to refresh', 'refresh-outline')
            : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Event Form Modal */}
      <Modal visible={showEventModal} animationType="slide" transparent>
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowEventModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {editingEvent ? 'Edit Event' : 'New Karma Event'}
            </Text>
            <TouchableOpacity
              style={[s.modalSaveBtn, { backgroundColor: colors.tint }]}
              onPress={handleSaveEvent}
            >
              <Text style={s.modalSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent}>
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Event Title *</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={eventFormData.title}
                onChangeText={(text) => setEventFormData({ ...eventFormData, title: text })}
                placeholder="Enter event title"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Category *</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={eventFormData.category}
                onChangeText={(text) => setEventFormData({ ...eventFormData, category: text })}
                placeholder="e.g., Education, Environment"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={s.formRow}>
              <View style={s.formHalf}>
                <Text style={[s.formLabel, { color: colors.text }]}>Difficulty</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['easy', 'medium', 'hard'].map((diff) => (
                    <TouchableOpacity
                      key={diff}
                      style={[
                        s.filterChip,
                        {
                          backgroundColor:
                            eventFormData.difficulty === diff
                              ? `${DIFFICULTY_COLORS[diff]}20`
                              : colors.card,
                          borderColor:
                            eventFormData.difficulty === diff ? DIFFICULTY_COLORS[diff] : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setEventFormData({
                          ...eventFormData,
                          difficulty: diff as 'easy' | 'medium' | 'hard',
                        })
                      }
                    >
                      <Text
                        style={[
                          s.filterChipText,
                          {
                            color:
                              eventFormData.difficulty === diff
                                ? DIFFICULTY_COLORS[diff]
                                : colors.icon,
                          },
                        ]}
                      >
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={s.formRow}>
              <View style={s.formHalf}>
                <Text style={[s.formLabel, { color: colors.text }]}>Base Karma</Text>
                <TextInput
                  style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={eventFormData.baseKarma?.toString() || ''}
                  onChangeText={(text) =>
                    setEventFormData({ ...eventFormData, baseKarma: parseInt(text) || 0 })
                  }
                  placeholder="100"
                  placeholderTextColor={colors.icon}
                  keyboardType="number-pad"
                />
              </View>
              <View style={s.formHalf}>
                <Text style={[s.formLabel, { color: colors.text }]}>Karma/Hour</Text>
                <TextInput
                  style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={eventFormData.karmaPerHour?.toString() || ''}
                  onChangeText={(text) =>
                    setEventFormData({ ...eventFormData, karmaPerHour: parseInt(text) || 0 })
                  }
                  placeholder="50"
                  placeholderTextColor={colors.icon}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Max Volunteers</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={eventFormData.maxVolunteers.toString()}
                onChangeText={(text) =>
                  setEventFormData({ ...eventFormData, maxVolunteers: parseInt(text) || 10 })
                }
                placeholder="10"
                placeholderTextColor={colors.icon}
                keyboardType="number-pad"
              />
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Start Date</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={eventFormData.startDate?.split('T')[0] || ''}
                onChangeText={(text) =>
                  setEventFormData({ ...eventFormData, startDate: new Date(text).toISOString() })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[
                  s.formInput,
                  s.multilineInput,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                value={eventFormData.description}
                onChangeText={(text) => setEventFormData({ ...eventFormData, description: text })}
                placeholder="Describe the event..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Partner Form Modal */}
      <Modal visible={showPartnerModal} animationType="slide" transparent>
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowPartnerModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {editingPartner ? 'Edit Partner' : 'Add CSR Partner'}
            </Text>
            <TouchableOpacity
              style={[s.modalSaveBtn, { backgroundColor: colors.tint }]}
              onPress={handleSavePartner}
            >
              <Text style={s.modalSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent}>
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Company Name *</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={partnerFormData.companyName}
                onChangeText={(text) => setPartnerFormData({ ...partnerFormData, companyName: text })}
                placeholder="Enter company name"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Contact Person</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={partnerFormData.contactPerson}
                onChangeText={(text) => setPartnerFormData({ ...partnerFormData, contactPerson: text })}
                placeholder="Enter contact name"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={partnerFormData.email}
                onChangeText={(text) => setPartnerFormData({ ...partnerFormData, email: text })}
                placeholder="partner@company.com"
                placeholderTextColor={colors.icon}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Phone</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={partnerFormData.phone}
                onChangeText={(text) => setPartnerFormData({ ...partnerFormData, phone: text })}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.icon}
                keyboardType="phone-pad"
              />
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Budget (Credits) *</Text>
              <TextInput
                style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={partnerFormData.budget.toString()}
                onChangeText={(text) =>
                  setPartnerFormData({ ...partnerFormData, budget: parseInt(text) || 0 })
                }
                placeholder="10000"
                placeholderTextColor={colors.icon}
                keyboardType="number-pad"
              />
            </View>

            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Partner Tier</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const).map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    style={[
                      s.filterChip,
                      {
                        backgroundColor:
                          partnerFormData.tier === tier ? `${TIER_COLORS[tier]}20` : colors.card,
                        borderColor: partnerFormData.tier === tier ? TIER_COLORS[tier] : colors.border,
                      },
                    ]}
                    onPress={() => setPartnerFormData({ ...partnerFormData, tier })}
                  >
                    <Text
                      style={[
                        s.filterChipText,
                        { color: partnerFormData.tier === tier ? TIER_COLORS[tier] : colors.icon },
                      ]}
                    >
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
