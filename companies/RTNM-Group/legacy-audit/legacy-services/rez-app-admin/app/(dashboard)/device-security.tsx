import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/device-security.styles';

// ── Types ──

interface DeviceUser {
  userId: { _id: string; fullName?: string; phoneNumber?: string } | string;
  firstSeen: string;
  lastSeen: string;
  isActive: boolean;
}

interface MerchantAccess {
  merchantId: string;
  merchantName: string;
  firstAccess: string;
  lastAccess: string;
  accessCount: number;
  transactionCount: number;
}

interface DeviceFlag {
  type: string;
  reason: string;
  flaggedAt: string;
  flaggedBy: string;
  resolved: boolean;
  resolvedAt?: string;
}

interface DeviceItem {
  _id: string;
  deviceHash: string;
  osVersion: string;
  deviceModel: string;
  platform: string;
  trustScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  isBlocked: boolean;
  blockedReason?: string;
  users: DeviceUser[];
  merchantsAccessed: MerchantAccess[];
  flags: DeviceFlag[];
  locations: Array<{ ip: string; country: string; city: string; seenAt: string }>;
  createdAt: string;
  updatedAt: string;
}

// ── Component ──

export default function DeviceSecurityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail modal
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Block modal
  const [blockDevice, setBlockDevice] = useState<DeviceItem | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, blocked: 0, highRisk: 0, flagged: 0 });

  // ── Debounce search ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setDevices([]);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // ── Fetch devices ──
  const fetchDevices = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (!append) setIsLoading(true);
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: '20',
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (riskFilter) params.set('riskLevel', riskFilter);

        const res = await apiClient.get<any>(`/admin/devices?${params.toString()}`);
        if (res.success && res.data) {
          const list = res.data.devices || [];
          setDevices((prev) => (append ? [...prev, ...list] : list));
          setHasMore(res.data.hasNextPage ?? false);

          // Update stats from total
          if (!append && !debouncedSearch && !riskFilter) {
            setStats({
              total: res.data.totalItems || 0,
              blocked: 0,
              highRisk: 0,
              flagged: 0,
            });
          }
        }
      } catch (err) {
        showAlert('Error', 'Failed to fetch devices');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, riskFilter]
  );

  useEffect(() => {
    fetchDevices(1);
  }, [fetchDevices]);

  useEffect(() => {
    if (page > 1) fetchDevices(page, true);
  }, [page]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setDevices([]);
    fetchDevices(1);
  }, [fetchDevices]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) setPage((p) => p + 1);
  }, [hasMore, isLoading]);

  // ── Block / Unblock ──
  const handleBlock = useCallback(async () => {
    if (!blockDevice || !blockReason.trim()) {
      showAlert('Error', 'Please provide a reason');
      return;
    }
    try {
      const res = await apiClient.post(`/admin/devices/${blockDevice.deviceHash}/block`, {
        reason: blockReason.trim(),
      });
      if (res.success) {
        showAlert('Success', 'Device blocked');
        setBlockDevice(null);
        setBlockReason('');
        onRefresh();
      } else {
        showAlert('Error', res.message || 'Failed to block device');
      }
    } catch {
      showAlert('Error', 'Failed to block device');
    }
  }, [blockDevice, blockReason, onRefresh]);

  const handleUnblock = useCallback(
    async (hash: string) => {
      const confirmed = await showConfirm(
        'Unblock Device',
        'Are you sure you want to unblock this device? All flags will be resolved.'
      );
      if (!confirmed) return;
      try {
        const res = await apiClient.post(`/admin/devices/${hash}/unblock`, {});
        if (res.success) {
          showAlert('Success', 'Device unblocked');
          onRefresh();
          if (selectedDevice?.deviceHash === hash) setSelectedDevice(null);
        } else {
          showAlert('Error', res.message || 'Failed to unblock');
        }
      } catch {
        showAlert('Error', 'Failed to unblock device');
      }
    },
    [onRefresh, selectedDevice]
  );

  // ── View detail ──
  const viewDetail = useCallback(async (hash: string) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get<any>(`/admin/devices/${hash}`);
      if (res.success && res.data?.device) {
        setSelectedDevice(res.data.device);
      } else {
        showAlert('Error', 'Device not found');
      }
    } catch {
      showAlert('Error', 'Failed to fetch device details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Risk badge ──
  const RiskBadge = ({ level }: { level: string }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      low: { bg: '#DCFCE7', text: '#166534', label: 'Low' },
      medium: { bg: '#FEF3C7', text: '#92400E', label: 'Medium' },
      high: { bg: '#FEE2E2', text: '#991B1B', label: 'High' },
      blocked: { bg: '#1F2937', text: '#FFFFFF', label: 'Blocked' },
    };
    const c = config[level] || config.low;
    return (
      <View style={[s.badge, { backgroundColor: c.bg }]}>
        <Text style={[s.badgeText, { color: c.text }]}>{c.label}</Text>
      </View>
    );
  };

  // ── Render device row ──
  const renderDevice = useCallback(
    ({ item }: { item: DeviceItem }) => {
      const unresolvedFlags = item.flags?.filter((f) => !f.resolved).length || 0;
      const userName = item.users?.[0]
        ? typeof item.users[0].userId === 'object'
          ? item.users[0].userId.fullName || item.users[0].userId.phoneNumber || 'Unknown'
          : 'User'
        : 'No users';

      return (
        <TouchableOpacity
          style={[
            s.card,
            {
              backgroundColor: colors.background,
              borderColor: item.isBlocked ? '#EF4444' : colors.border,
            },
          ]}
          onPress={() => viewDetail(item.deviceHash)}
          activeOpacity={0.7}
        >
          <View style={s.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.deviceHash, { color: colors.text }]} numberOfLines={1}>
                {item.deviceModel || item.deviceHash.substring(0, 16) + '...'}
              </Text>
              <Text style={[s.subtitle, { color: colors.textSecondary }]}>
                {item.platform?.toUpperCase()} {item.osVersion ? `• ${item.osVersion}` : ''}
              </Text>
            </View>
            <RiskBadge level={item.riskLevel} />
          </View>

          <View style={s.cardBody}>
            <View style={s.statRow}>
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
              <Text style={[s.statText, { color: colors.textSecondary }]}>
                {item.users?.length || 0} user(s) • {userName}
              </Text>
            </View>
            <View style={s.statRow}>
              <Ionicons name="shield-outline" size={14} color={colors.textSecondary} />
              <Text style={[s.statText, { color: colors.textSecondary }]}>
                Trust: {item.trustScore}/100
                {unresolvedFlags > 0 ? ` • ${unresolvedFlags} flag(s)` : ''}
              </Text>
            </View>
            <View style={s.statRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[s.statText, { color: colors.textSecondary }]}>
                Updated: {new Date(item.updatedAt).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={s.cardActions}>
            {item.isBlocked ? (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleUnblock(item.deviceHash)}
              >
                <Ionicons name="lock-open-outline" size={14} color="#fff" />
                <Text style={s.actionBtnText}>Unblock</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => {
                  setBlockDevice(item);
                  setBlockReason('');
                }}
              >
                <Ionicons name="ban-outline" size={14} color="#fff" />
                <Text style={s.actionBtnText}>Block</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [colors, viewDetail, handleUnblock]
  );

  // ── Filter chips ──
  const filters = [
    { key: '', label: 'All' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'high', label: 'High Risk' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Device Security</Text>
        <Text style={[s.headerSubtitle, { color: colors.textSecondary }]}>
          {stats.total} device(s) tracked
        </Text>
      </View>

      {/* Search */}
      <View
        style={[
          s.searchContainer,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search by hash or model..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, riskFilter === f.key && s.filterChipActive]}
            onPress={() => {
              setRiskFilter(f.key);
              setPage(1);
              setDevices([]);
            }}
          >
            <Text
              style={[s.filterChipText, riskFilter === f.key && s.filterChipTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Device List */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item._id || item.deviceHash}
        renderItem={renderDevice}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyContainer}>
              <Ionicons name="hardware-chip-outline" size={48} color={colors.textSecondary} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                No devices found
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={colors.tint} />
          ) : null
        }
      />

      {/* Block Modal */}
      <Modal visible={!!blockDevice} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Block Device</Text>
            <Text style={[s.modalSubtitle, { color: colors.textSecondary }]}>
              Hash: {blockDevice?.deviceHash?.substring(0, 20)}...
            </Text>
            <TextInput
              style={[s.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Reason for blocking..."
              placeholderTextColor={colors.textSecondary}
              value={blockReason}
              onChangeText={setBlockReason}
              multiline
              numberOfLines={3}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setBlockDevice(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleBlock}
              >
                <Text style={s.confirmBtnText}>Block Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedDevice} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.detailModal, { backgroundColor: colors.background }]}>
            <View style={s.detailHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Device Details</Text>
              <TouchableOpacity onPress={() => setSelectedDevice(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={colors.tint} />
            ) : selectedDevice ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Basic Info */}
                <View style={[s.detailSection, { borderColor: colors.border }]}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Device Info</Text>
                  <DetailRow label="Hash" value={selectedDevice.deviceHash} colors={colors} />
                  <DetailRow
                    label="Platform"
                    value={selectedDevice.platform?.toUpperCase()}
                    colors={colors}
                  />
                  <DetailRow label="OS" value={selectedDevice.osVersion} colors={colors} />
                  <DetailRow label="Model" value={selectedDevice.deviceModel} colors={colors} />
                  <DetailRow
                    label="Trust Score"
                    value={`${selectedDevice.trustScore}/100`}
                    colors={colors}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={[s.detailLabel, { color: colors.textSecondary }]}>
                      Risk Level:
                    </Text>
                    <RiskBadge level={selectedDevice.riskLevel} />
                  </View>
                  {selectedDevice.isBlocked && (
                    <DetailRow
                      label="Block Reason"
                      value={selectedDevice.blockedReason || 'N/A'}
                      colors={colors}
                    />
                  )}
                </View>

                {/* Users */}
                <View style={[s.detailSection, { borderColor: colors.border }]}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>
                    Users ({selectedDevice.users?.length || 0})
                  </Text>
                  {selectedDevice.users?.map((u, i) => {
                    const name =
                      typeof u.userId === 'object'
                        ? u.userId.fullName || u.userId.phoneNumber || u.userId._id
                        : u.userId;
                    return (
                      <View key={i} style={s.listItem}>
                        <Ionicons
                          name={u.isActive ? 'person' : 'person-outline'}
                          size={14}
                          color={u.isActive ? '#10B981' : colors.textSecondary}
                        />
                        <Text style={[s.listItemText, { color: colors.text }]}>{name}</Text>
                        <Text style={[s.listItemSub, { color: colors.textSecondary }]}>
                          Last: {new Date(u.lastSeen).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Flags */}
                {selectedDevice.flags?.length > 0 && (
                  <View style={[s.detailSection, { borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      Flags ({selectedDevice.flags.length})
                    </Text>
                    {selectedDevice.flags.map((f, i) => (
                      <View
                        key={i}
                        style={[
                          s.flagItem,
                          { borderColor: f.resolved ? '#D1FAE5' : '#FEE2E2' },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons
                            name={f.resolved ? 'checkmark-circle' : 'warning'}
                            size={14}
                            color={f.resolved ? '#10B981' : '#EF4444'}
                          />
                          <Text style={[s.flagType, { color: colors.text }]}>
                            {f.type.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <Text style={[s.flagReason, { color: colors.textSecondary }]}>
                          {f.reason}
                        </Text>
                        <Text style={[s.flagDate, { color: colors.textSecondary }]}>
                          {new Date(f.flaggedAt).toLocaleString('en-IN')}
                          {f.resolved
                            ? ` • Resolved ${new Date(f.resolvedAt!).toLocaleDateString('en-IN')}`
                            : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Merchants Accessed */}
                {selectedDevice.merchantsAccessed?.length > 0 && (
                  <View style={[s.detailSection, { borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      Merchants ({selectedDevice.merchantsAccessed.length})
                    </Text>
                    {selectedDevice.merchantsAccessed.slice(0, 20).map((m, i) => (
                      <View key={i} style={s.listItem}>
                        <Ionicons
                          name="storefront-outline"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text style={[s.listItemText, { color: colors.text }]}>
                          {m.merchantName}
                        </Text>
                        <Text style={[s.listItemSub, { color: colors.textSecondary }]}>
                          {m.accessCount} visits • {m.transactionCount} txns
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recent Locations */}
                {selectedDevice.locations?.length > 0 && (
                  <View style={[s.detailSection, { borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      Recent Locations ({selectedDevice.locations.length})
                    </Text>
                    {selectedDevice.locations
                      .slice(-10)
                      .reverse()
                      .map((l, i) => (
                        <View key={i} style={s.listItem}>
                          <Ionicons
                            name="location-outline"
                            size={14}
                            color={colors.textSecondary}
                          />
                          <Text style={[s.listItemText, { color: colors.text }]}>
                            {l.city || 'Unknown'}, {l.country || 'Unknown'}
                          </Text>
                          <Text style={[s.listItemSub, { color: colors.textSecondary }]}>
                            {l.ip} • {new Date(l.seenAt).toLocaleDateString('en-IN')}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}

                {/* Actions */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                  {selectedDevice.isBlocked ? (
                    <TouchableOpacity
                      style={[s.fullBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => handleUnblock(selectedDevice.deviceHash)}
                    >
                      <Ionicons name="lock-open-outline" size={16} color="#fff" />
                      <Text style={s.fullBtnText}>Unblock Device</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.fullBtn, { backgroundColor: '#EF4444' }]}
                      onPress={() => {
                        setSelectedDevice(null);
                        setBlockDevice(selectedDevice);
                        setBlockReason('');
                      }}
                    >
                      <Ionicons name="ban-outline" size={16} color="#fff" />
                      <Text style={s.fullBtnText}>Block Device</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Detail Row Helper ──

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 4 }}>
      <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{label}:</Text>
      <Text style={[s.detailValue, { color: colors.text }]} numberOfLines={1}>
        {value || 'N/A'}
      </Text>
    </View>
  );
}

// ── Styles ──

