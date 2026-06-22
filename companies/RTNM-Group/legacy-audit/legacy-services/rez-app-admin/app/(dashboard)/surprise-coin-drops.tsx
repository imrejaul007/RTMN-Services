import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  surpriseCoinDropsService,
  SurpriseCoinDrop,
  AnalyticsResponse,
} from '../../services/api/surpriseCoinDrops';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/surprise-coin-drops.styles';

type TabType = 'drops' | 'analytics';
type StatusFilter = 'all' | 'available' | 'claimed' | 'expired';
type ReasonFilter =
  | 'all'
  | 'random'
  | 'milestone'
  | 'promo'
  | 'special_event'
  | 'welcome'
  | 'comeback';

const STATUS_COLORS: Record<string, string> = {
  available: Colors.light.success,
  claimed: Colors.light.info,
  expired: Colors.light.error,
};

const STATUS_ICONS: Record<string, string> = {
  available: 'gift-outline',
  claimed: 'checkmark-circle',
  expired: 'close-circle',
};

const REASON_LABELS: Record<string, string> = {
  random: 'Random',
  milestone: 'Milestone',
  promo: 'Promo',
  special_event: 'Special Event',
  welcome: 'Welcome',
  comeback: 'Comeback',
};

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

function getUserDisplay(userId: SurpriseCoinDrop['userId']): string {
  if (typeof userId === 'object' && userId !== null) {
    return userId.fullName || userId.phoneNumber || String(userId._id).slice(0, 8);
  }
  return String(userId).slice(0, 8);
}

export default function SurpriseCoinDropsPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('drops');
  const [drops, setDrops] = useState<SurpriseCoinDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId: '',
    coins: '',
    reason: 'promo' as string,
    message: 'Surprise! You got bonus coins!',
    expiryHours: '24',
  });
  const [creating, setCreating] = useState(false);

  // Bulk create modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    userIds: '',
    coins: '',
    reason: 'promo' as string,
    message: 'Surprise! You got bonus coins!',
    expiryHours: '24',
  });
  const [bulkCreating, setBulkCreating] = useState(false);

  const fetchDrops = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const result = await surpriseCoinDropsService.getDrops({
          page: pageNum,
          limit: 20,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          reason: reasonFilter !== 'all' ? reasonFilter : undefined,
          search: searchQuery || undefined,
        });
        setDrops(result.drops);
        setPage(result.pagination.page);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to load drops');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, reasonFilter, searchQuery]
  );

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const result = await surpriseCoinDropsService.getAnalytics(30);
      setAnalytics(result);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'drops') fetchDrops(1);
    else fetchAnalytics();
  }, [activeTab, statusFilter, reasonFilter]);

  const handleSearch = () => {
    fetchDrops(1);
  };

  const handleCreateDrop = async () => {
    if (!createForm.userId.trim()) {
      showAlert('Error', 'User ID is required');
      return;
    }
    const coins = parseInt(createForm.coins);
    if (!coins || coins < 1 || coins > 10000) {
      showAlert('Error', 'Coins must be between 1 and 10000');
      return;
    }

    setCreating(true);
    try {
      await surpriseCoinDropsService.createDrop({
        userId: createForm.userId.trim(),
        coins,
        reason: createForm.reason,
        message: createForm.message,
        expiryHours: parseInt(createForm.expiryHours) || 24,
      });
      showAlert('Success', 'Surprise coin drop created');
      setShowCreateModal(false);
      setCreateForm({
        userId: '',
        coins: '',
        reason: 'promo',
        message: 'Surprise! You got bonus coins!',
        expiryHours: '24',
      });
      fetchDrops(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create drop');
    } finally {
      setCreating(false);
    }
  };

  const handleBulkCreate = async () => {
    const userIds = bulkForm.userIds
      .split(/[\n,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (userIds.length === 0) {
      showAlert('Error', 'At least one User ID is required');
      return;
    }
    const coins = parseInt(bulkForm.coins);
    if (!coins || coins < 1 || coins > 10000) {
      showAlert('Error', 'Coins must be between 1 and 10000');
      return;
    }

    setBulkCreating(true);
    try {
      const result = await surpriseCoinDropsService.bulkCreate({
        userIds,
        coins,
        reason: bulkForm.reason,
        message: bulkForm.message,
        expiryHours: parseInt(bulkForm.expiryHours) || 24,
      });
      showAlert(
        'Success',
        `Created ${result.created} drops. Skipped: ${result.skipped}. Invalid IDs: ${result.invalidIds}`
      );
      setShowBulkModal(false);
      setBulkForm({
        userIds: '',
        coins: '',
        reason: 'promo',
        message: 'Surprise! You got bonus coins!',
        expiryHours: '24',
      });
      fetchDrops(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to bulk create');
    } finally {
      setBulkCreating(false);
    }
  };

  const handleDeleteDrop = async (drop: SurpriseCoinDrop) => {
    if (drop.status === 'claimed') {
      showAlert('Error', 'Cannot delete a claimed drop');
      return;
    }
    const confirmed = await showConfirm(
      'Delete Drop',
      `Delete ${drop.coins} NC drop for ${getUserDisplay(drop.userId)}?`
    );
    if (!confirmed) return;

    try {
      await surpriseCoinDropsService.deleteDrop(drop._id);
      showAlert('Success', 'Drop deleted');
      fetchDrops(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to delete');
    }
  };

  const handleExpireOld = async () => {
    const confirmed = await showConfirm(
      'Expire Old Drops',
      'This will expire all unclaimed drops past their expiry date. Continue?'
    );
    if (!confirmed) return;

    try {
      const result = await surpriseCoinDropsService.expireOldDrops();
      showAlert('Success', `${result.expiredCount} drops expired`);
      fetchDrops(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to expire drops');
    }
  };

  const renderDropItem = ({ item }: { item: SurpriseCoinDrop }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.slateMedium;
    const statusIcon = STATUS_ICONS[item.status] || 'help-circle';

    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Ionicons name={statusIcon as unknown as keyof typeof Ionicons.glyphMap} size={18} color={statusColor} />
            <Text style={[s.statusBadge, { color: statusColor }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          <View style={[s.reasonBadge, { backgroundColor: colors.background }]}>
            <Text style={[s.reasonText, { color: colors.secondaryText }]}>
              {REASON_LABELS[item.reason] || item.reason}
            </Text>
          </View>
        </View>

        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <Text style={[s.cardLabel, { color: colors.secondaryText }]}>User</Text>
            <Text style={[s.cardValue, { color: colors.text }]}>
              {getUserDisplay(item.userId)}
            </Text>
          </View>
          <View style={s.cardRow}>
            <Text style={[s.cardLabel, { color: colors.secondaryText }]}>Coins</Text>
            <Text style={[s.coinsValue, { color: colors.warning }]}>{item.coins} NC</Text>
          </View>
          <View style={s.cardRow}>
            <Text style={[s.cardLabel, { color: colors.secondaryText }]}>Message</Text>
            <Text style={[s.cardValue, { color: colors.text }]} numberOfLines={1}>
              {item.message}
            </Text>
          </View>
          <View style={s.cardRow}>
            <Text style={[s.cardLabel, { color: colors.secondaryText }]}>Created</Text>
            <Text style={[s.cardValue, { color: colors.text }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <View style={s.cardRow}>
            <Text style={[s.cardLabel, { color: colors.secondaryText }]}>Expires</Text>
            <Text style={[s.cardValue, { color: colors.text }]}>
              {formatDate(item.expiresAt)}
            </Text>
          </View>
          {item.claimedAt && (
            <View style={s.cardRow}>
              <Text style={[s.cardLabel, { color: colors.secondaryText }]}>Claimed</Text>
              <Text style={[s.cardValue, { color: colors.success }]}>
                {formatDate(item.claimedAt)}
              </Text>
            </View>
          )}
        </View>

        {item.status !== 'claimed' && (
          <View style={s.cardActions}>
            <TouchableOpacity
              style={[s.actionButton, s.deleteButton]}
              onPress={() => handleDeleteDrop(item)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={s.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderAnalytics = () => {
    if (analyticsLoading) {
      return <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />;
    }
    if (!analytics) return null;

    const { summary, statusBreakdown, reasonBreakdown } = analytics;

    return (
      <ScrollView style={s.analyticsContainer} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={s.statsGrid}>
          {[
            {
              label: 'Total Drops',
              value: summary.totalDrops,
              icon: 'gift-outline',
              color: colors.info,
            },
            {
              label: 'Total Coins',
              value: summary.totalCoins.toLocaleString(),
              icon: 'wallet-outline',
              color: colors.warning,
            },
            {
              label: 'Avg Coins',
              value: summary.avgCoins,
              icon: 'analytics-outline',
              color: colors.purple,
            },
            {
              label: 'Unique Users',
              value: summary.uniqueUsers,
              icon: 'people-outline',
              color: colors.success,
            },
            {
              label: 'Claim Rate',
              value: `${summary.claimRate}%`,
              icon: 'checkmark-circle-outline',
              color: colors.cyan,
            },
            {
              label: 'Unclaimed',
              value: summary.unclaimed,
              icon: 'time-outline',
              color: colors.error,
            },
          ].map((stat, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name={stat.icon as unknown as keyof typeof Ionicons.glyphMap} size={24} color={stat.color} />
              <Text style={[s.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: colors.secondaryText }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Status Breakdown */}
        <View style={[s.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>By Status</Text>
          {statusBreakdown.map((item: any, i: number) => (
            <View key={i} style={s.breakdownRow}>
              <View style={s.breakdownLeft}>
                <View
                  style={[
                    s.dot,
                    { backgroundColor: STATUS_COLORS[item._id] || colors.slateMedium },
                  ]}
                />
                <Text style={[s.breakdownLabel, { color: colors.text }]}>{item._id}</Text>
              </View>
              <View style={s.breakdownRight}>
                <Text style={[s.breakdownCount, { color: colors.text }]}>{item.count}</Text>
                <Text style={[s.breakdownCoins, { color: colors.warning }]}>
                  {item.totalCoins} NC
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Reason Breakdown */}
        <View
          style={[
            s.sectionCard,
            { backgroundColor: isDark ? colors.slateDark : colors.card, marginBottom: 40 },
          ]}
        >
          <Text style={[s.sectionTitle, { color: colors.text }]}>By Reason</Text>
          {reasonBreakdown.map((item: any, i: number) => (
            <View key={i} style={s.breakdownRow}>
              <Text style={[s.breakdownLabel, { color: colors.text }]}>
                {REASON_LABELS[item._id] || item._id}
              </Text>
              <View style={s.breakdownRight}>
                <Text style={[s.breakdownCount, { color: colors.text }]}>{item.count}</Text>
                <Text style={[s.breakdownCoins, { color: colors.warning }]}>
                  {item.totalCoins} NC
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderCreateModal = () => (
    <Modal visible={showCreateModal} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: colors.card }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Create Surprise Drop</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody}>
            <Text style={[s.fieldLabel, { color: colors.text }]}>User ID *</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: colors.background, color: colors.text }]}
              value={createForm.userId}
              onChangeText={(t) => setCreateForm((p) => ({ ...p, userId: t }))}
              placeholder="Paste user ObjectId"
              placeholderTextColor={colors.icon}
            />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Coins *</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: colors.background, color: colors.text }]}
              value={createForm.coins}
              onChangeText={(t) =>
                setCreateForm((p) => ({ ...p, coins: t.replace(/[^0-9]/g, '') }))
              }
              keyboardType="number-pad"
              placeholder="1 - 10000"
              placeholderTextColor={colors.icon}
            />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Reason</Text>
            <View style={s.reasonOptions}>
              {Object.entries(REASON_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.reasonChip,
                    {
                      backgroundColor:
                        createForm.reason === key
                          ? colors.info
                          : isDark
                            ? Colors.dark.border
                            : colors.slate,
                    },
                  ]}
                  onPress={() => setCreateForm((p) => ({ ...p, reason: key }))}
                >
                  <Text
                    style={{
                      color: createForm.reason === key ? colors.card : colors.secondaryText,
                      fontSize: 13,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.fieldLabel, { color: colors.text }]}>Message</Text>
            <TextInput
              style={[
                s.textInput,
                s.multilineInput,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              value={createForm.message}
              onChangeText={(t) => setCreateForm((p) => ({ ...p, message: t }))}
              multiline
              maxLength={200}
              placeholderTextColor={colors.icon}
            />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Expiry (hours)</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: colors.background, color: colors.text }]}
              value={createForm.expiryHours}
              onChangeText={(t) =>
                setCreateForm((p) => ({ ...p, expiryHours: t.replace(/[^0-9]/g, '') }))
              }
              keyboardType="number-pad"
              placeholder="24"
              placeholderTextColor={colors.icon}
            />
          </ScrollView>

          <TouchableOpacity
            style={[s.submitButton, creating && s.submitButtonDisabled]}
            onPress={handleCreateDrop}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={colors.card} size="small" />
            ) : (
              <Text style={s.submitButtonText}>Create Drop</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderBulkModal = () => (
    <Modal visible={showBulkModal} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: colors.card }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Bulk Create Drops</Text>
            <TouchableOpacity onPress={() => setShowBulkModal(false)}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody}>
            <Text style={[s.fieldLabel, { color: colors.text }]}>
              User IDs * (one per line or comma-separated)
            </Text>
            <TextInput
              style={[
                s.textInput,
                s.multilineInput,
                {
                  height: 120,
                  backgroundColor: isDark ? Colors.dark.background : colors.backgroundTertiary,
                  color: isDark ? colors.slate : colors.gray800,
                },
              ]}
              value={bulkForm.userIds}
              onChangeText={(t) => setBulkForm((p) => ({ ...p, userIds: t }))}
              multiline
              placeholder="6abc123...\n6def456..."
              placeholderTextColor={colors.icon}
            />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Coins per user *</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: colors.background, color: colors.text }]}
              value={bulkForm.coins}
              onChangeText={(t) => setBulkForm((p) => ({ ...p, coins: t.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              placeholder="1 - 10000"
              placeholderTextColor={colors.icon}
            />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Reason</Text>
            <View style={s.reasonOptions}>
              {Object.entries(REASON_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.reasonChip,
                    {
                      backgroundColor:
                        bulkForm.reason === key
                          ? colors.info
                          : isDark
                            ? Colors.dark.border
                            : colors.slate,
                    },
                  ]}
                  onPress={() => setBulkForm((p) => ({ ...p, reason: key }))}
                >
                  <Text
                    style={{
                      color: bulkForm.reason === key ? colors.card : colors.secondaryText,
                      fontSize: 13,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.fieldLabel, { color: colors.text }]}>Message</Text>
            <TextInput
              style={[
                s.textInput,
                s.multilineInput,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              value={bulkForm.message}
              onChangeText={(t) => setBulkForm((p) => ({ ...p, message: t }))}
              multiline
              maxLength={200}
              placeholderTextColor={colors.icon}
            />

            <Text style={[s.fieldLabel, { color: colors.text }]}>Expiry (hours)</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: colors.background, color: colors.text }]}
              value={bulkForm.expiryHours}
              onChangeText={(t) =>
                setBulkForm((p) => ({ ...p, expiryHours: t.replace(/[^0-9]/g, '') }))
              }
              keyboardType="number-pad"
              placeholder="24"
              placeholderTextColor={colors.icon}
            />
          </ScrollView>

          <TouchableOpacity
            style={[s.submitButton, bulkCreating && s.submitButtonDisabled]}
            onPress={handleBulkCreate}
            disabled={bulkCreating}
          >
            {bulkCreating ? (
              <ActivityIndicator color={colors.card} size="small" />
            ) : (
              <Text style={s.submitButtonText}>Bulk Create</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Surprise Coin Drops</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerButton} onPress={handleExpireOld}>
            <Ionicons name="timer-outline" size={18} color={colors.error} />
            <Text style={s.headerButtonExpireText}>Expire Old</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.headerButton} onPress={() => setShowBulkModal(true)}>
            <Ionicons name="people" size={18} color={colors.info} />
            <Text style={s.headerButtonBulkText}>Bulk</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color={colors.card} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[s.tabs, { backgroundColor: colors.card }]}>
        {(['drops', 'analytics'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'drops' ? `Drops (${total})` : 'Analytics'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'drops' ? (
        <>
          {/* Filters */}
          <View style={s.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersRow}>
              {(['all', 'available', 'claimed', 'expired'] as StatusFilter[]).map((sf) => (
                <TouchableOpacity
                  key={sf}
                  style={[
                    s.filterChip,
                    { backgroundColor: statusFilter === sf ? colors.info : colors.border },
                  ]}
                  onPress={() => setStatusFilter(sf)}
                >
                  <Text
                    style={{
                      color: statusFilter === sf ? colors.card : colors.secondaryText,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {sf === 'all' ? 'All Status' : sf.charAt(0).toUpperCase() + sf.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersRow}>
              {(['all', ...Object.keys(REASON_LABELS)] as ReasonFilter[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    s.filterChip,
                    { backgroundColor: reasonFilter === r ? colors.purple : colors.border },
                  ]}
                  onPress={() => setReasonFilter(r)}
                >
                  <Text
                    style={{
                      color: reasonFilter === r ? colors.card : colors.secondaryText,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {r === 'all' ? 'All Reasons' : REASON_LABELS[r] || r}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Search */}
            <View style={[s.searchBar, { backgroundColor: colors.card }]}>
              <Ionicons name="search" size={18} color={colors.icon} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholder="Search by phone number..."
                placeholderTextColor={colors.icon}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    fetchDrops(1);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.icon} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* List */}
          <FlatList
            data={drops}
            keyExtractor={(item) => item._id}
            renderItem={renderDropItem}
            contentContainerStyle={s.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchDrops(1, true)} />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={s.emptyState}>
                  <Ionicons name="gift-outline" size={48} color={colors.icon} />
                  <Text style={[s.emptyText, { color: colors.secondaryText }]}>
                    No surprise coin drops found
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              loading ? (
                <ActivityIndicator color={colors.tint} style={{ marginVertical: 20 }} />
              ) : totalPages > 1 ? (
                <View style={s.pagination}>
                  <TouchableOpacity
                    style={[s.pageButton, page <= 1 && s.pageButtonDisabled]}
                    onPress={() => page > 1 && fetchDrops(page - 1)}
                    disabled={page <= 1}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={page <= 1 ? colors.slateMedium : colors.info}
                    />
                  </TouchableOpacity>
                  <Text style={[s.pageText, { color: colors.secondaryText }]}>
                    Page {page} of {totalPages}
                  </Text>
                  <TouchableOpacity
                    style={[s.pageButton, page >= totalPages && s.pageButtonDisabled]}
                    onPress={() => page < totalPages && fetchDrops(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={page >= totalPages ? colors.slateMedium : colors.info}
                    />
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </>
      ) : (
        renderAnalytics()
      )}

      {renderCreateModal()}
      {renderBulkModal()}
    </SafeAreaView>
  );
}

