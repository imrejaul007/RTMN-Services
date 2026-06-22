/**
 * app/(dashboard)/audit-log.tsx
 *
 * Admin Audit Log Screen
 * - Timeline of admin actions with icons by type
 * - Filter by action type
 * - Search by admin name or target
 * - Infinite scroll (load more)
 * - Export to CSV
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { isAllowedOpenUrl } from '../../utils/urlValidator';
import { s } from './styles/audit-log.styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
}

type ActionFilter =
  | 'all'
  | 'suspend'
  | 'approve'
  | 'reject'
  | 'broadcast'
  | 'clear'
  | 'coin_sync'
  | 'pms_sync'
  | 'ota_sync';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  suspend: 'ban',
  approve: 'checkmark-circle',
  reject: 'close-circle',
  broadcast: 'megaphone',
  clear: 'lock-open',
  coin_sync: 'wallet',
  pms_sync: 'sync',
  ota_sync: 'bed',
};

const ACTION_COLORS: Record<string, string> = {
  suspend: '#EF4444',
  approve: '#10B981',
  reject: '#F59E0B',
  broadcast: '#6366F1',
  clear: '#06B6D4',
  coin_sync: '#7C3AED',
  pms_sync: '#0891B2',
  ota_sync: '#0891B2',
};

const ACTION_EMOJI: Record<string, string> = {
  suspend: 'suspend',
  approve: 'approve',
  reject: 'reject',
  broadcast: 'broadcast',
  clear: 'clear',
};

function getActionKey(action: string): string {
  const lower = action.toLowerCase();
  for (const key of Object.keys(ACTION_ICONS)) {
    if (lower.includes(key)) return key;
  }
  return 'approve';
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffH = Math.floor(diffMins / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

const FILTER_OPTIONS: { key: ActionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'suspend', label: 'Suspend' },
  { key: 'approve', label: 'Approve' },
  { key: 'reject', label: 'Reject' },
  { key: 'broadcast', label: 'Broadcast' },
  { key: 'clear', label: 'Clear' },
  { key: 'coin_sync', label: 'Coin Sync' },
  { key: 'pms_sync', label: 'PMS Sync' },
  { key: 'ota_sync', label: 'OTA Sync' },
];

const PAGE_SIZE = 30;

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function AuditLogScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as keyof typeof Colors];

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ActionFilter>('all');
  const [exporting, setExporting] = useState(false);
  const isLoadingMore = useRef(false);

  // BUG-061 FIX: Replaced manual page/hasMore state with useInfiniteQuery.
  const {
    data: pages = [],
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['audit-log'],
    queryFn: ({ pageParam = 1 }) => {
      return apiClient.get<AuditEntry[]>(
        `admin/audit-log?page=${pageParam}&limit=${PAGE_SIZE}`
      );
    },
    getNextPageParam: (lastPage: unknown, allPages: unknown[]) => {
      const data = (lastPage as unknown as {data?: AuditEntry[]})?.data ?? (lastPage as unknown as AuditEntry[]) ?? [];
      return data.length === PAGE_SIZE ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const entries = useMemo(() => {
    const allEntries: AuditEntry[] = [];
    for (const page of pages as Array<{data?: AuditEntry[]}>) {
      const data = page?.data ?? (page as unknown as AuditEntry[]);
      if (Array.isArray(data)) allEntries.push(...data);
    }
    return allEntries;
  }, [pages]);

  const hasMore = hasNextPage ?? false;
  const loadingMore = isFetchingNextPage;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore.current || !hasNextPage) return;
    isLoadingMore.current = true;
    void fetchNextPage();
    isLoadingMore.current = false;
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Use apiClient to ensure auth token is sent with the export request
      const res = await apiClient.get<any>('admin/export/audit-log');
      if (res.success && res.data?.downloadUrl) {
        if (isAllowedOpenUrl(res.data.downloadUrl)) {
          await Linking.openURL(res.data.downloadUrl);
        } else {
          Alert.alert('Error', 'Invalid download URL');
        }
      } else {
        Alert.alert(
          'Export',
          res.message || 'Export request sent. Check your email for the download link.'
        );
      }
    } catch {
      Alert.alert('Export Failed', 'Unable to export audit log.');
    } finally {
      setExporting(false);
    }
  }, []);

  // Client-side filter + search
  const filteredEntries = entries.filter((e) => {
    const matchesFilter = filter === 'all' || e.action.toLowerCase().includes(filter);
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.adminName.toLowerCase().includes(q) ||
      e.targetId.toLowerCase().includes(q) ||
      e.detail.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const renderEntry = ({ item, index }: { item: AuditEntry; index: number }) => {
    const actionKey = getActionKey(item.action);
    const icon = ACTION_ICONS[actionKey] ?? 'ellipse';
    const iconColor = ACTION_COLORS[actionKey] ?? colors.icon;

    return (
      <View style={[s.entryRow, { borderLeftColor: iconColor }]}>
        {/* Timeline dot */}
        <View
          style={[
            s.timelineDot,
            { backgroundColor: `${iconColor}20`, borderColor: iconColor },
          ]}
        >
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <View style={s.entryContent}>
          <View style={s.entryHeader}>
            <Text style={[s.entryAdmin, { color: colors.text }]}>{item.adminName}</Text>
            <Text style={[s.entryTime, { color: colors.icon }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          <View style={s.entryActionRow}>
            <View style={[s.actionBadge, { backgroundColor: `${iconColor}15` }]}>
              <Text style={[s.actionBadgeText, { color: iconColor }]}>
                {item.action.replace(/_/g, ' ')}
              </Text>
            </View>
            <Text style={[s.entryTarget, { color: colors.icon }]}>
              {item.targetType}: {item.targetId}
            </Text>
          </View>
          {item.detail ? (
            <Text style={[s.entryDetail, { color: colors.secondaryText }]} numberOfLines={2}>
              {item.detail}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const ListHeader = (
    <>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.tint }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Audit Log</Text>
          <Text style={s.headerSub}>Admin action history</Text>
        </View>
        <TouchableOpacity
          style={[s.exportBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={14} color="#fff" />
              <Text style={s.exportBtnText}>Export</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={16} color={colors.icon} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search admin name or target..."
          placeholderTextColor={colors.icon}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              s.filterChip,
              {
                backgroundColor: filter === opt.key ? colors.tint : colors.card,
                borderColor: filter === opt.key ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setFilter(opt.key)}
          >
            <Text
              style={[s.filterChipText, { color: filter === opt.key ? '#fff' : colors.text }]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <Text style={[s.countText, { color: colors.icon }]}>
        {filteredEntries.length} entries
        {filter !== 'all' || search ? ' (filtered)' : ''}
      </Text>
    </>
  );

  const ListFooter = loadingMore ? (
    <View style={s.loadMoreIndicator}>
      <ActivityIndicator size="small" color={colors.tint} />
    </View>
  ) : !hasMore && entries.length > 0 ? (
    <Text style={[s.endText, { color: colors.icon }]}>End of audit log</Text>
  ) : null;

  if (isLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.icon }]}>Loading audit log...</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredEntries}
        keyExtractor={(item: AuditEntry, index: number) => `${item.adminId}-${item.createdAt}-${index}`}
        renderItem={renderEntry}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => (
          <View style={[s.separator, { backgroundColor: colors.border }]} />
        )}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>No audit entries found</Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

