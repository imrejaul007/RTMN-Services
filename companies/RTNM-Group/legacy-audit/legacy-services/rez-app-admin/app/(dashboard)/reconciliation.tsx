import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  StyleSheet,
} from 'react-native';
import { showAlert, showConfirm } from '../../utils/alert';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { apiCall } from '../../utils/api';
import { useRouter } from 'expo-router';

type IssueStatus = 'open' | 'investigating' | 'resolved' | 'ignored';

interface ReconciliationIssue {
  _id: string;
  type: string;
  userId?: { _id: string; name: string; phone: string };
  detail: string;
  status: IssueStatus;
  detectedAt: string;
}

interface ReconciliationStats {
  stats: {
    open: number;
    investigating: number;
    resolved: number;
    total: number;
  };
  latestRun?: string;
}

export default function ReconciliationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<IssueStatus>('open');
  const [issues, setIssues] = useState<ReconciliationIssue[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningReconciliation, setRunningReconciliation] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchIssues = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const response = await apiCall(
          `admin/system/reconciliation/issues?status=${activeTab}&page=${pageNum}`,
          { method: 'GET' }
        );

        if (response.success) {
          const newIssues = response.data?.issues ?? [];
          if (append) {
            setIssues((prev) => [...prev, ...newIssues]);
          } else {
            setIssues(newIssues);
          }
          setPage(pageNum);
          setHasMore(newIssues.length >= 20);
        }
      } catch (error) {
        showAlert('Error', 'Failed to fetch reconciliation issues');
        logger.error('[Reconciliation] Fetch error', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [activeTab]
  );

  const [statsError, setStatsError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setStatsError(false);
      const response = await apiCall(`admin/system/reconciliation/stats`, { method: 'GET' });

      if (response.success) {
        setStats(response.data);
      } else {
        setStatsError(true);
      }
    } catch (error) {
      setStatsError(true);
      logger.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchIssues(1);
    fetchStats();
  }, [activeTab, fetchIssues, fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchIssues(1);
    fetchStats();
  };

  const handleRunNow = async () => {
    const confirmed = await showConfirm(
      'Run Reconciliation',
      'This will run the reconciliation job immediately. Continue?'
    );
    if (!confirmed) return;
    setRunningReconciliation(true);
    try {
      const response = await apiCall(`admin/system/reconciliation/run`, { method: 'POST' });

      if (response.success) {
        showAlert(
          'Reconciliation Complete',
          `Found ${response.data?.result?.discrepancies ?? 0} discrepancies\nCritical: ${response.data?.result?.criticalCount ?? 0}\nHigh: ${response.data?.result?.highCount ?? 0}\nDuration: ${response.data?.result?.duration ?? 0}ms`
        );
        handleRefresh();
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to run reconciliation');
    } finally {
      setRunningReconciliation(false);
    }
  };

  const handleUpdateIssue = async (issueId: string, newStatus: IssueStatus) => {
    try {
      const response = await apiCall(`admin/system/reconciliation/issues/${issueId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      });

      if (response.success) {
        showAlert('Success', `Issue updated to ${newStatus}`);
        handleRefresh();
      } else {
        showAlert('Error', response.message || `Failed to update issue to ${newStatus}`);
      }
    } catch (error) {
      showAlert('Error', 'Failed to update issue');
      logger.error('[Reconciliation] Update issue error', error);
    }
  };

  const renderIssueCard = ({ item }: { item: ReconciliationIssue }) => (
    <View
      style={[
        styles.issueCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.issueHeader}>
        <View style={styles.issueTypeBadge}>
          <Text
            style={[
              styles.issueTypeText,
              {
                color: item.type.includes('critical')
                  ? '#FF3B30'
                  : item.type.includes('high')
                    ? '#FF9500'
                    : '#34C759',
              },
            ]}
          >
            {item.type}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 12 }}>
          {item.detectedAt ? new Date(item.detectedAt).toLocaleString() : '—'}
        </Text>
      </View>

      {item.userId && (
        <View style={styles.userInfo}>
          <Ionicons name="person" size={14} color={colors.tint} />
          <Text style={{ color: colors.text, marginLeft: 6 }}>
            {item.userId.name || 'Unknown'} ({item.userId.phone})
          </Text>
        </View>
      )}

      <Text style={[styles.issueDetail, { color: colors.text }]}>{item.detail}</Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint }]}
          onPress={() => handleUpdateIssue(item._id, 'investigating')}
        >
          <Ionicons name="search" size={16} color="#FFF" />
          <Text style={styles.actionButtonText}>Investigate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint }]}
          onPress={() => handleUpdateIssue(item._id, 'resolved')}
        >
          <Ionicons name="checkmark" size={16} color="#FFF" />
          <Text style={styles.actionButtonText}>Resolve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.border }]}
          onPress={() => handleUpdateIssue(item._id, 'ignored')}
        >
          <Ionicons name="close" size={16} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Ignore</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const statsDisplay = stats?.stats || { open: 0, investigating: 0, resolved: 0, total: 0 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginBottom: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Financial Reconciliation</Text>
        <Text style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}>
          LedgerMind: Transaction State Integrity
        </Text>
      </View>

      {/* Stats Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
      >
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              borderColor: '#FF3B30',
            },
          ]}
        >
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Open Issues</Text>
          <Text
            style={[
              styles.statValue,
              {
                color: '#FF3B30',
              },
            ]}
          >
            {statsDisplay.open}
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              borderColor: '#FF9500',
            },
          ]}
        >
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Investigating</Text>
          <Text
            style={[
              styles.statValue,
              {
                color: '#FF9500',
              },
            ]}
          >
            {statsDisplay.investigating}
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              borderColor: '#34C759',
            },
          ]}
        >
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Resolved</Text>
          <Text
            style={[
              styles.statValue,
              {
                color: '#34C759',
              },
            ]}
          >
            {statsDisplay.resolved}
          </Text>
        </View>
      </ScrollView>

      {/* Run Now Button */}
      <TouchableOpacity
        style={[styles.runButton, { backgroundColor: colors.tint }]}
        onPress={handleRunNow}
        disabled={runningReconciliation}
      >
        {runningReconciliation ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="play" size={18} color="#FFF" />
            <Text style={styles.runButtonText}>Run Reconciliation Now</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Tab Selector */}
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {(['open', 'investigating', 'resolved'] as IssueStatus[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && {
                borderBottomColor: colors.tint,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === tab ? colors.tint : colors.tabIconDefault,
                  fontWeight: activeTab === tab ? '600' : '400',
                },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Issues List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : issues.length === 0 ? (
        <View style={styles.emptyContainer}>
          {statsError ? (
            <>
              <Ionicons name="cloud-offline" size={48} color="#FF3B30" />
              <Text style={[styles.emptyText, { color: colors.text }]}>Failed to load</Text>
              <Text style={[styles.emptySubtext, { color: colors.tabIconDefault }]}>
                Pull down to retry
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={48} color={colors.tabIconDefault} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No {activeTab} issues</Text>
              <Text style={[styles.emptySubtext, { color: colors.tabIconDefault }]}>
                Everything looks good!
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={issues}
          renderItem={renderIssueCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: colors.tint }]}
                onPress={() => fetchIssues(page + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    marginVertical: 8,
  },
  statCard: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    minWidth: 120,
    justifyContent: 'flex-end',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  runButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  runButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  issueCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueTypeBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  issueTypeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueDetail: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  loadMoreButton: {
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
