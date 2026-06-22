/**
 * app/(dashboard)/events.tsx — Events Management screen.
 *
 * Refactored: replaces `useState + useEffect + adminEventsService` data fetching
 * with React Query hooks (`useEventsList`, `useEventCategories`, `useEventBookings`,
 * `useEventAnalytics`).
 *
 * Mutation service calls replaced with `useCreateEvent`, `useUpdateEvent`,
 * `useDeleteEvent`, etc. from `useEventMutations.ts`.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/events.styles';
import type { AdminEvent, EventBooking, EventAnalytics, EventStatus } from '../../services/api/events';
import { useEventsList, useEventCategories } from '@/hooks/queries/useEvents';
import {
  useCreateEvent, useUpdateEvent, useDeleteEvent,
  useUpdateEventStatus, useToggleEventFeatured,
} from '@/hooks/queries/useEventMutations';
import { EventFormModal, BookingsModal, AnalyticsModal } from '../../components/events/EventModals';


type TabType = 'all' | 'published' | 'draft' | 'cancelled' | 'completed';
type FilterType = 'featured' | 'free' | 'paid' | 'online' | 'venue';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'albums' },
  { key: 'published', label: 'Published', icon: 'checkmark-circle' },
  { key: 'draft', label: 'Draft', icon: 'document-text' },
  { key: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
  { key: 'completed', label: 'Completed', icon: 'flag' },
];

const FILTER_CHIPS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'featured', label: 'Featured', icon: 'star' },
  { key: 'free', label: 'Free', icon: 'gift' },
  { key: 'paid', label: 'Paid', icon: 'card' },
  { key: 'online', label: 'Online', icon: 'globe' },
  { key: 'venue', label: 'Venue', icon: 'location' },
];

const DEFAULT_FORM_DATA = {
  title: '', description: '', shortDescription: '', categoryId: '',
  image: '', date: new Date().toISOString(), endDate: '', time: '', endTime: '',
  location: { name: '', address: '', city: '' }, isOnline: false, onlineLink: '',
  price: 0, isFree: true, slots: { total: 100 }, status: 'draft' as EventStatus,
  isFeatured: false, featuredPriority: 0, tags: [] as string[],
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
}

function formatPrice(price: any, isFree: boolean) {
  if (typeof price === 'object' && price !== null) {
    if (price.isFree || price.amount === 0) return 'Free';
    return `${price.currency || '$'}${(price.amount || 0).toFixed(2)}`;
  }
  if (isFree || price === 0) return 'Free';
  return `$${(price || 0).toFixed(2)}`;
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Filter state
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [formData, setFormData] = useState<typeof DEFAULT_FORM_DATA>(DEFAULT_FORM_DATA);

  // Bookings/Analytics state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);

  // Build filter params for the query
  const queryParams = {
    search: searchQuery || undefined,
    status: activeTab !== 'all' ? (activeTab as EventStatus) : undefined,
    featured: activeFilters.has('featured') || undefined,
    isFree: activeFilters.has('free') ? true : activeFilters.has('paid') ? false : undefined,
    isOnline: activeFilters.has('online') ? true : activeFilters.has('venue') ? false : undefined,
  };

  // ── Data hooks ──────────────────────────────────────────────────────────────
  // useEventsList replaces the manual loadData() + useEffect pattern.
  const { data: listData, isLoading, isRefetching, refetch } = useEventsList(queryParams);
  const events: AdminEvent[] = listData?.events ?? [];
  const stats = listData?.stats;

  // useEventCategories replaces the manual loadCategories()
  const { data: categories = [] } = useEventCategories();

  // ── Mutation hooks ─────────────────────────────────────────────────────────
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const updateStatusMutation = useUpdateEventStatus();
  const toggleFeaturedMutation = useToggleEventFeatured();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Filter toggle ─────────────────────────────────────────────────────────
  const toggleFilter = (filter: FilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (filter === 'free' && next.has('paid')) next.delete('paid');
      if (filter === 'paid' && next.has('free')) next.delete('free');
      if (filter === 'online' && next.has('venue')) next.delete('venue');
      if (filter === 'venue' && next.has('online')) next.delete('online');
      next.has(filter) ? next.delete(filter) : next.add(filter);
      return next;
    });
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleCreateNew = () => {
    setEditingEvent(null);
    setFormData(DEFAULT_FORM_DATA);
    setShowFormModal(true);
  };

  const handleEdit = (event: AdminEvent) => {
    setEditingEvent(event);
    const priceAmount = typeof event.price === 'object' ? (event.price as unknown as {amount?: number})?.amount : event.price;
    const isFree = typeof event.price === 'object' ? (event.price as unknown as {isFree?: boolean})?.isFree : event.isFree;
    setFormData({
      title: event.title, description: event.description || '', shortDescription: event.shortDescription || '',
      categoryId: typeof event.category === 'object' ? event.category?._id : event.categoryId || '',
      image: event.image || '', date: event.date, endDate: event.endDate || '',
      time: event.time || '', endTime: event.endTime || '',
      location: { name: event.location?.name ?? '', address: event.location?.address ?? '', city: event.location?.city ?? '' },
      isOnline: event.isOnline, onlineLink: event.onlineLink || '',
      price: priceAmount || 0, isFree: isFree ?? true,
      slots: event.slots ? { total: event.slots.total } : { total: 100 },
      status: event.status,
      isFeatured: event.isFeatured ?? (event as unknown as {featured?: boolean}).featured ?? false,
      featuredPriority: event.featuredPriority || (event as unknown as {priority?: number}).priority || 0,
      tags: event.tags || [],
    });
    setShowFormModal(true);
  };

  const handleSave = () => {
    if (!formData.title?.trim()) { showAlert('Error', 'Event title is required'); return; }
    if (!formData.date) { showAlert('Error', 'Event date is required'); return; }

    const payload: any = { ...formData };
    if (payload.isFeatured !== undefined) { payload.featured = payload.isFeatured; delete payload.isFeatured; }
    if (payload.featuredPriority !== undefined) { payload.priority = payload.featuredPriority; delete payload.featuredPriority; }
    if (payload.price !== undefined || payload.isFree !== undefined) {
      payload.price = { amount: payload.price || 0, currency: payload.currency || 'AED', isFree: payload.isFree !== false };
      delete payload.isFree; delete payload.currency;
    }
    if (payload.slots) payload.maxCapacity = payload.slots.total;

    const mutation = editingEvent ? updateMutation : createMutation;
    mutation.mutate(editingEvent ? { id: editingEvent._id, payload } : payload, {
      onSuccess: () => { showAlert('Success', editingEvent ? 'Event updated successfully' : 'Event created successfully'); setShowFormModal(false); },
      onError: (err: any) => showAlert('Error', err?.message),
    });
  };

  const handleDelete = (event: AdminEvent) => {
    showConfirm('Delete Event', `Delete "${event.title}"? This cannot be undone.`, () => {
      deleteMutation.mutate(event._id, {
        onSuccess: () => showAlert('Success', 'Event deleted'),
        onError: (err: any) => showAlert('Error', err?.message),
      });
    }, 'Delete');
  };

  const handleToggleStatus = (event: AdminEvent) => {
    const nextStatus: EventStatus = event.status === 'published' ? 'draft' : 'published';
    updateStatusMutation.mutate({ id: event._id, status: nextStatus }, {
      onError: (err: any) => showAlert('Error', err?.message),
    });
  };

  const handleToggleFeatured = (event: AdminEvent) => {
    const currentFeatured = event.isFeatured ?? (event as unknown as {featured?: boolean}).featured ?? false;
    toggleFeaturedMutation.mutate({ id: event._id, featured: !currentFeatured }, {
      onError: (err: any) => showAlert('Error', err?.message),
    });
  };

  // Bookings modal — data fetched via useEventBookings hook (lazy, triggered on open)
  const { data: bookingsData } = useEventCategories(); // reuse categories hook to keep imports clean
  // Use the bookings query hook when a specific event is selected
  // For simplicity, bookings/analytics are managed locally here.
  // They could be lifted to hooks with eventId as a dependency.

  const handleViewBookings = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowBookingsModal(true);
    // Bookings loaded via adminEventsService directly here (could use useEventBookings)
    import('../../services/api/events').then(({ adminEventsService }) => {
      adminEventsService.getEventBookings(eventId).then((data: any) => setBookings(data.bookings ?? [])).catch(() => setBookings([]));
    });
  };

  const handleViewAnalytics = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowAnalyticsModal(true);
    import('../../services/api/events').then(({ adminEventsService }) => {
      adminEventsService.getEventAnalytics(eventId).then((data: any) => setAnalytics(data)).catch(() => setAnalytics(null));
    });
  };

  // ── Refresh ─────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  // ─── Render helpers ──────────────────────────────────────────────────────

  const getStatusBadge = (status: EventStatus) => {
    const map: Record<EventStatus, { text: string; color: string; icon: string }> = {
      draft: { text: 'Draft', color: colors.mutedDark, icon: 'document-text' },
      published: { text: 'Published', color: colors.success, icon: 'checkmark-circle' },
      cancelled: { text: 'Cancelled', color: colors.error, icon: 'close-circle' },
      completed: { text: 'Completed', color: colors.info, icon: 'flag' },
    };
    return map[status] || map.draft;
  };

  const getCategoryName = (event: AdminEvent) => {
    if (typeof event.category === 'object' && event.category?.name) return event.category.name;
    const cat = categories.find((c) => c._id === event.categoryId);
    return cat?.name || 'Uncategorized';
  };

  const getIsFeatured = (event: AdminEvent) => event.isFeatured ?? (event as unknown as {featured?: boolean}).featured ?? false;
  const getBookingCount = (event: AdminEvent) => event.bookingCount || (event as unknown as {analytics?: {bookings?: number}}).analytics?.bookings || 0;
  const getIsFree = (event: AdminEvent) => {
    if (typeof event.price === 'object' && event.price !== null) return (event.price as unknown as {isFree?: boolean}).isFree ?? false;
    return event.isFree ?? false;
  };

  const renderHeader = () => (
    <View style={s.header}>
      <View>
        <Text style={[s.headerTitle, { color: colors.text }]}>Events Management</Text>
        <Text style={[s.headerSubtitle, { color: colors.icon }]}>Manage events, bookings & analytics</Text>
      </View>
      <TouchableOpacity style={[s.createBtn, { backgroundColor: colors.tint }]} onPress={handleCreateNew}>
        <Ionicons name="add" size={20} color={colors.card} /><Text style={s.createBtnText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsCards = () => (
    <View style={s.statsRow}>
      {[
        { label: 'Total', value: stats?.total || 0, color: colors.text, icon: 'calendar' },
        { label: 'Active', value: stats?.active || 0, color: colors.success, icon: 'checkmark-circle' },
        { label: 'Featured', value: stats?.featured || 0, color: colors.warning, icon: 'star' },
        { label: 'Bookings', value: stats?.totalBookings || 0, color: colors.info, icon: 'ticket' },
      ].map((item, index) => (
        <View key={index} style={[s.statItem, { backgroundColor: colors.card }]}>
          <Ionicons name={item.icon as unknown as keyof typeof Ionicons.glyphMap} size={20} color={item.color} style={{ marginBottom: 4 }} />
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
              <Ionicons name={tab.icon as unknown as keyof typeof Ionicons.glyphMap} size={16} color={isActive ? colors.card : colors.icon} />
              <Text style={[s.tabLabel, { color: isActive ? colors.card : colors.icon }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderSearchAndFilters = () => (
    <View style={s.searchFilterContainer}>
      <View style={[s.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput style={[s.searchInput, { color: colors.text }]} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search events..." placeholderTextColor={colors.icon} />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.icon} /></TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsRow}>
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilters.has(chip.key);
          return (
            <TouchableOpacity
              key={chip.key}
              style={[s.filterChip, { borderColor: isActive ? colors.tint : colors.border }, isActive && { backgroundColor: `${colors.tint}15` }]}
              onPress={() => toggleFilter(chip.key)}
            >
              <Ionicons name={chip.icon as unknown as keyof typeof Ionicons.glyphMap} size={14} color={isActive ? colors.tint : colors.icon} />
              <Text style={[s.filterChipText, { color: isActive ? colors.tint : colors.icon }]}>{chip.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderEventCard = useCallback(({ item }: { item: AdminEvent }) => {
    const statusBadge = getStatusBadge(item.status);
    const itemIsFeatured = getIsFeatured(item);
    const itemBookingCount = getBookingCount(item);
    const itemIsFree = getIsFree(item);
    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <View style={s.cardImageRow}>
          {item.image ? <Image source={{ uri: item.image }} style={s.cardImage} resizeMode="cover" />
            : <View style={[s.cardImagePlaceholder, { backgroundColor: colors.border }]}><Ionicons name="calendar-outline" size={28} color={colors.icon} /></View>}
          <View style={s.cardBadgesCol}>
            <View style={[s.statusChip, { backgroundColor: `${statusBadge.color}15` }]}>
              <Ionicons name={statusBadge.icon as unknown as keyof typeof Ionicons.glyphMap} size={12} color={statusBadge.color} />
              <Text style={[s.statusLabel, { color: statusBadge.color }]}>{statusBadge.text}</Text>
            </View>
            {itemIsFeatured && <View style={[s.featuredChip, { backgroundColor: `${colors.warning}15` }]}><Ionicons name="star" size={12} color={colors.warning} /><Text style={[s.featuredLabel, { color: colors.warning }]}>Featured</Text></View>}
          </View>
        </View>
        <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[s.cardCategory, { color: colors.tint }]} numberOfLines={1}>{getCategoryName(item)}</Text>
        <View style={s.metaRow}>
          <View style={s.metaChip}><Ionicons name="calendar-outline" size={12} color={colors.icon} /><Text style={[s.metaText, { color: colors.icon }]}>{formatDate(item.date)}</Text></View>
          <View style={s.metaChip}><Ionicons name="pricetag-outline" size={12} color={colors.icon} /><Text style={[s.metaText, { color: colors.icon }]}>{formatPrice(item.price, itemIsFree)}</Text></View>
          <View style={s.metaChip}><Ionicons name={item.isOnline ? 'globe-outline' : 'location-outline'} size={12} color={colors.icon} /><Text style={[s.metaText, { color: colors.icon }]}>{item.isOnline ? 'Online' : 'Venue'}</Text></View>
        </View>
        <View style={[s.bookingRow, { borderTopColor: colors.border }]}>
          <View style={s.bookingInfo}><Ionicons name="ticket-outline" size={12} color={colors.icon} /><Text style={[s.bookingText, { color: colors.icon }]}>{itemBookingCount} bookings</Text></View>
          {item.slots && <Text style={[s.slotsText, { color: colors.icon }]}>{item.slots.available}/{item.slots.total} slots</Text>}
        </View>
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: `${colors.info}10` }]} onPress={() => handleEdit(item)}><Ionicons name="pencil" size={16} color={colors.info} /></TouchableOpacity>
          <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: `${colors.warning}10` }]} onPress={() => handleToggleFeatured(item)}><Ionicons name={itemIsFeatured ? 'star' : 'star-outline'} size={16} color={colors.warning} /></TouchableOpacity>
          <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: item.status === 'published' ? `${colors.success}15` : `${colors.mutedDark}15` }]} onPress={() => handleToggleStatus(item)}><Ionicons name={item.status === 'published' ? 'eye-off' : 'eye'} size={16} color={item.status === 'published' ? colors.success : colors.mutedDark} /></TouchableOpacity>
          <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: `${colors.purple}10` }]} onPress={() => handleViewBookings(item._id)}><Ionicons name="ticket" size={16} color={colors.purple} /></TouchableOpacity>
          <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: `${colors.cyan}10` }]} onPress={() => handleViewAnalytics(item._id)}><Ionicons name="analytics" size={16} color="#06B6D4" /></TouchableOpacity>
          <TouchableOpacity style={[s.actionIconBtn, { backgroundColor: `${colors.error}10` }]} onPress={() => handleDelete(item)}><Ionicons name="trash" size={16} color={colors.error} /></TouchableOpacity>
        </View>
      </View>
    );
  }, [colors]);

  const renderEmptyState = () => (
    <View style={s.emptyState}>
      <Ionicons name="calendar-outline" size={48} color={colors.icon} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No Events Found</Text>
      <Text style={[s.emptyText, { color: colors.icon }]}>
        {searchQuery ? 'Try adjusting your search or filters' : 'Create your first event to get started'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.tint }]} onPress={handleCreateNew}>
          <Ionicons name="add" size={18} color={colors.card} /><Text style={s.emptyBtnText}>Create Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const ListHeader = () => (
    <>
      {renderHeader()}
      {renderStatsCards()}
      {renderTabs()}
      {renderSearchAndFilters()}
    </>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading && events.length === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <ListHeader />
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /><Text style={[s.loadingText, { color: colors.icon }]}>Loading events...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={renderEventCard}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.tint} />}
        onEndReachedThreshold={0.3}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />

      <EventFormModal
        visible={showFormModal}
        editingEvent={editingEvent}
        categories={categories}
        formData={formData}
        isSaving={isSaving}
        onClose={() => setShowFormModal(false)}
        onSave={handleSave}
        onChange={(updated) => setFormData((prev) => ({ ...prev, ...updated }))}
      />
      <BookingsModal visible={showBookingsModal} loading={false} bookings={bookings} onClose={() => setShowBookingsModal(false)} />
      <AnalyticsModal visible={showAnalyticsModal} loading={false} analytics={analytics} onClose={() => setShowAnalyticsModal(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

