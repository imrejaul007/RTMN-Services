import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { showAlert, showConfirm } from '../../../utils/alert';
import { bonusZoneService } from '../../../services/api/bonusZone';
import type { BonusCampaignAdmin, BonusCampaignStatus } from '../../../services/api/bonusZone';

type CampaignFilter = 'all' | 'active' | 'paused';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: Colors.light.successLight, text: Colors.light.successDeep },
  paused: { bg: Colors.light.warningLight, text: Colors.light.warningDeep },
  draft: { bg: Colors.light.gray200, text: Colors.light.gray700 },
};

interface Props {
  colors: any;
}

export default function WalletCampaignsSection({ colors }: Props) {
  const [campaigns, setCampaigns] = useState<BonusCampaignAdmin[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CampaignFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadCampaigns = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const query: any = { page: pageNum, limit: 20 };
      if (filter !== 'all') query.status = filter;
      if (search) query.search = search;
      const result = await bonusZoneService.getCampaigns(query);
      setCampaigns((prev) => (append ? [...prev, ...result.campaigns] : result.campaigns));
      setPage(pageNum);
      setHasMore(pageNum < ((result.pagination as unknown as {totalPages?: number})?.totalPages || result.pagination?.pages || 1));
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setIsLoading(false); }
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(() => loadCampaigns(1), 500);
    return () => clearTimeout(timer);
  }, [search, filter]);

  const handleToggleStatus = async (campaign: BonusCampaignAdmin) => {
    const newStatus: BonusCampaignStatus = campaign.status === 'active' ? 'paused' : 'active';
    const action = newStatus === 'paused' ? 'Freeze' : 'Resume';
    const confirmed = await showConfirm(`${action} Campaign`, `${action} "${campaign.title}"?`);
    if (!confirmed) return;
    try {
      await bonusZoneService.updateStatus(campaign._id, newStatus);
      showAlert('Success', `Campaign ${newStatus === 'paused' ? 'frozen' : 'resumed'}`, 'success');
      loadCampaigns(1);
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
  };

  const renderCampaign = useCallback(({ item }: { item: BonusCampaignAdmin }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
    const budgetPct = item.reward?.totalBudget
      ? Math.min(100, ((item.reward.consumedBudget || 0) / item.reward.totalBudget) * 100)
      : 0;
    const canToggle = item.status === 'active' || item.status === 'paused';
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.campaignHeader}>
          <Text style={[styles.userName, { color: colors.text, flex: 1 }]} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.campaignMeta}>
          <View style={[styles.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.badgeText, { color: colors.gray700 }]}>{item.campaignType?.replace(/_/g, ' ')}</Text>
          </View>
          {item.fundingSource?.type !== 'platform' && item.fundingSource?.partnerName && (
            <Text style={[styles.userPhone, { color: colors.icon }]}>by {item.fundingSource.partnerName}</Text>
          )}
        </View>
        {item.reward?.totalBudget > 0 && (
          <View style={styles.budgetRow}>
            <View style={[styles.budgetBar, { backgroundColor: colors.border }]}>
              <View style={[styles.budgetFill, {
                width: `${budgetPct}%`,
                backgroundColor: budgetPct > 90 ? colors.error : colors.success,
              }]} />
            </View>
            <Text style={[styles.budgetText, { color: colors.icon }]}>
              {(item.reward.consumedBudget || 0).toFixed(0)} / {(item.reward?.totalBudget || 0).toFixed(0)} NC
            </Text>
          </View>
        )}
        {canToggle && (
          <TouchableOpacity
            style={[styles.actionBtn, {
              backgroundColor: item.status === 'active' ? colors.warningLight : colors.successLight,
              alignSelf: 'flex-start', marginTop: 8,
            }]}
            onPress={() => handleToggleStatus(item)}>
            <Ionicons
              name={item.status === 'active' ? 'pause-outline' : 'play-outline'} size={14}
              color={item.status === 'active' ? colors.warningDeep : colors.successDeep}
            />
            <Text style={[styles.actionText, { color: item.status === 'active' ? colors.warningDeep : colors.successDeep }]}>
              {item.status === 'active' ? 'Freeze' : 'Resume'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [colors]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['all', 'active', 'paused'] as CampaignFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && { backgroundColor: colors.tint }]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, { color: filter === f ? colors.card : colors.text }]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search campaigns..."
          placeholderTextColor={colors.icon}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item._id}
        renderItem={renderCampaign}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        onEndReached={() => { if (!isLoading && hasMore) loadCampaigns(page + 1, true); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No campaigns found</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '500' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  campaignHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 15, fontWeight: '600' },
  campaignMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  userPhone: { fontSize: 12, marginTop: 2 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  budgetBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: 6, borderRadius: 3 },
  budgetText: { fontSize: 11 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
});
