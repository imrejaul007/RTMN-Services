import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { userWalletsService } from '../../services/api/userWallets';
import { bonusZoneService } from '../../services/api/bonusZone';
import { adminActionsService } from '../../services/api/adminActions';
import { authService } from '../../services/api/auth';
import {
  usePendingActions,
  useActionHistory,
  useApprovalThreshold,
} from '@/hooks/queries/useAdminActions';
import {
  AdjustModal,
  ReverseModal,
  FreezeModal,
  AuditModal,
  RejectModal,
} from '../../components/wallet-adj';
import type { UserWalletItem, AuditLogItem } from '../../services/api/userWallets';
import type { BonusCampaignAdmin, BonusCampaignStatus } from '../../services/api/bonusZone';
import type { AdminActionItem, AdminActionStatus } from '../../services/api/adminActions';
import { s } from './styles/wallet-adjustment.styles';
import { enableScreenProtection, disableScreenProtection } from '../../utils/screenshotProtection';

type TabType = 'operations' | 'pending' | 'history';
type AdjustType = 'credit' | 'debit';
type CampaignFilter = 'all' | 'active' | 'paused';
type HistoryFilter = 'all' | 'pending_approval' | 'approved' | 'rejected' | 'executed';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_approval: { bg: Colors.light.warningLight, text: Colors.light.warningDeep },
  approved: { bg: Colors.light.infoLighter, text: Colors.light.infoDark },
  rejected: { bg: Colors.light.errorLight, text: Colors.light.errorDeep },
  executed: { bg: Colors.light.successLight, text: Colors.light.successDeep },
  active: { bg: Colors.light.successLight, text: Colors.light.successDeep },
  paused: { bg: Colors.light.warningLight, text: Colors.light.warningDeep },
  draft: { bg: Colors.light.gray200, text: Colors.light.gray700 },
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  manual_adjustment: 'Wallet Adjustment',
  cashback_reversal: 'Cashback Reversal',
  freeze_override: 'Freeze Override',
  bulk_credit: 'Bulk Credit',
  config_change: 'Config Change',
};

// ═══════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════

export default function WalletAdjustmentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<TabType>('operations');
  const { hasRole } = useAuth();

  // SECURITY FIX: Enable screenshot protection for this sensitive screen
  useEffect(() => {
    enableScreenProtection();
    return () => {
      disableScreenProtection();
    };
  }, []);

  if (!hasRole(ADMIN_ROLES.SUPER_ADMIN)) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.secondaryText} />
        <Text style={[s.headerTitle, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>Access Denied</Text>
        <Text style={{ color: colors.secondaryText, textAlign: 'center', paddingHorizontal: 32, marginTop: 8 }}>
          You need Super Admin privileges to access Wallet Adjustment.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={[s.header, { backgroundColor: colors.tint }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginBottom: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Wallet Adjustment</Text>
          <Text style={s.headerSubtitle}>Dispute resolution with maker-checker approvals</Text>
        </View>
        <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {[
            { key: 'operations' as TabType, label: 'Operations', icon: 'wallet-outline' as const },
            { key: 'pending' as TabType, label: 'Pending', icon: 'hourglass-outline' as const },
            { key: 'history' as TabType, label: 'History', icon: 'time-outline' as const },
          ].map((tab) => (
            <TouchableOpacity key={tab.key}
              style={[s.tab, activeTab === tab.key && { backgroundColor: colors.tint }]}
              onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? colors.card : colors.text} />
              <Text style={[s.tabText, { color: activeTab === tab.key ? colors.card : colors.text }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {activeTab === 'operations' && <OperationsTab colors={colors} />}
        {activeTab === 'pending' && <PendingApprovalsTab colors={colors} />}
        {activeTab === 'history' && <ActionHistoryTab colors={colors} />}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════
// TAB 1: OPERATIONS
// ═══════════════════════════════════════════════

function OperationsTab({ colors }: { colors: any }) {
  const [subTab, setSubTab] = useState<'wallet' | 'campaigns'>('wallet');
  return (
    <View style={{ flex: 1 }}>
      <View style={[s.subTabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[s.subTab, subTab === 'wallet' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setSubTab('wallet')}>
          <Text style={[s.subTabText, { color: subTab === 'wallet' ? colors.tint : colors.icon }]}>Wallet Ops</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.subTab, subTab === 'campaigns' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setSubTab('campaigns')}>
          <Text style={[s.subTabText, { color: subTab === 'campaigns' ? colors.tint : colors.icon }]}>Campaigns</Text>
        </TouchableOpacity>
      </View>
      {subTab === 'wallet' ? <WalletOpsSection colors={colors} /> : <CampaignsSection colors={colors} />}
    </View>
  );
}

function WalletOpsSection({ colors }: { colors: any }) {
  const [users, setUsers] = useState<UserWalletItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWalletItem | null>(null);
  const [approvalThreshold, setApprovalThreshold] = useState<number>(50000);

  const [adjustUser, setAdjustUser] = useState<UserWalletItem | null>(null);
  const [adjustType, setAdjustType] = useState<AdjustType>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [reverseUser, setReverseUser] = useState<UserWalletItem | null>(null);
  const [reverseAmount, setReverseAmount] = useState('');
  const [reverseTxId, setReverseTxId] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);
  const [freezeUser, setFreezeUser] = useState<UserWalletItem | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [auditUser, setAuditUser] = useState<UserWalletItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  // ── Load approval threshold via React Query hook ───────────────────────────────
  const thresholdQuery = useApprovalThreshold();
  useEffect(() => {
    if (thresholdQuery.data !== undefined) {
      setApprovalThreshold(thresholdQuery.data);
    }
  }, [thresholdQuery.data]);

  const loadUsers = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const result = await userWalletsService.searchUsers(search || undefined, pageNum, 20);
      setUsers((prev) => (append ? [...prev, ...result.users] : result.users));
      setPage(pageNum);
      setHasMore(pageNum < result.pagination.totalPages);
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => { setSelectedUser(null); loadUsers(1); }, 500);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  // SECURITY FIX: Add maximum amount validation to prevent excessive transactions
  const MAX_ADJUSTMENT_AMOUNT = 1000000; // 1 million NC maximum per adjustment
  // Threshold for requiring biometric authentication
  const BIOMETRIC_REQUIRED_AMOUNT = 50000; // 50k NC and above requires biometric

  const handleAdjust = async () => {
    if (!adjustUser || !adjustAmount || !adjustReason.trim()) { showAlert('Validation Error', 'Please fill in all required fields'); return; }
    const amt = parseFloat(adjustAmount);
    if (!amt || amt <= 0 || !Number.isFinite(amt)) return;
    if (amt > MAX_ADJUSTMENT_AMOUNT) {
      showAlert('Validation Error', `Maximum adjustment amount is ${MAX_ADJUSTMENT_AMOUNT.toLocaleString()} NC. Contact finance for larger adjustments.`);
      return;
    }
    // SECURITY FIX: Require biometric authentication for high-value operations
    if (amt >= BIOMETRIC_REQUIRED_AMOUNT) {
      const biometricSuccess = await authService.authenticateWithBiometrics(
        `Authenticate to ${adjustType === 'credit' ? 'credit' : 'debit'} ${amt.toLocaleString()} NC`
      );
      if (!biometricSuccess) {
        showAlert('Authentication Required', 'Biometric authentication is required for high-value transactions.', 'warning');
        return;
      }
    }
    const confirmed = await showConfirm(
      `${adjustType === 'credit' ? 'Credit' : 'Debit'} Wallet`,
      `${adjustType === 'credit' ? 'Add' : 'Remove'} ${amt} NC ${adjustType === 'credit' ? 'to' : 'from'} ${adjustUser.user.fullName || adjustUser.user.phoneNumber}?`
    );
    if (!confirmed) return;
    setAdjustLoading(true);
    try {
      await userWalletsService.adjustBalance(adjustUser.user._id, { amount: amt, type: adjustType, reason: adjustReason.trim() });
      showAlert('Success', `${adjustType === 'credit' ? 'Credited' : 'Debited'} ${amt} NC`, 'success');
      setAdjustUser(null); setAdjustAmount(''); setAdjustReason('');
      loadUsers(1);
    } catch (err: any) {
      if (err.status === 202 || err.message?.includes('Pending approval') || err.message?.includes('threshold')) {
        showAlert('Pending Approval', err.message || 'This adjustment is pending admin approval', 'info');
        setAdjustUser(null); setAdjustAmount(''); setAdjustReason('');
      } else { showAlert('Error', err.message, 'error'); }
    } finally { setAdjustLoading(false); }
  };

  const handleReverseCashback = async () => {
    if (!reverseUser || !reverseAmount || !reverseReason.trim()) return;
    const amt = parseFloat(reverseAmount);
    if (!amt || amt <= 0 || !Number.isFinite(amt)) return;
    if (amt > MAX_ADJUSTMENT_AMOUNT) {
      showAlert('Validation Error', `Maximum reversal amount is ${MAX_ADJUSTMENT_AMOUNT.toLocaleString()} NC.`);
      return;
    }
    // SECURITY FIX: Require biometric authentication for high-value reversals
    if (amt >= BIOMETRIC_REQUIRED_AMOUNT) {
      const biometricSuccess = await authService.authenticateWithBiometrics(
        `Authenticate to reverse ${amt.toLocaleString()} NC cashback`
      );
      if (!biometricSuccess) {
        showAlert('Authentication Required', 'Biometric authentication is required for high-value reversals.', 'warning');
        return;
      }
    }
    const confirmed = await showConfirm('Reverse Cashback', `Reverse ${amt} NC from ${reverseUser.user.fullName || reverseUser.user.phoneNumber}?`);
    if (!confirmed) return;
    setReverseLoading(true);
    try {
      await userWalletsService.reverseCashback(reverseUser.user._id, { amount: amt, originalTransactionId: reverseTxId.trim() || undefined, reason: reverseReason.trim() });
      showAlert('Success', `Reversed ${amt} NC cashback`, 'success');
      setReverseUser(null); setReverseAmount(''); setReverseTxId(''); setReverseReason('');
      loadUsers(1);
    } catch (err: any) {
      if (err.status === 202 || err.message?.includes('Pending approval') || err.message?.includes('threshold')) {
        showAlert('Pending Approval', err.message || 'This reversal is pending admin approval', 'info');
        setReverseUser(null); setReverseAmount(''); setReverseTxId(''); setReverseReason('');
      } else { showAlert('Error', err.message, 'error'); }
    } finally { setReverseLoading(false); }
  };

  const handleFreeze = async () => {
    if (!freezeUser || !freezeReason.trim()) return;
    setFreezeLoading(true);
    try {
      await userWalletsService.freezeWallet(freezeUser.user._id, freezeReason.trim());
      showAlert('Success', 'Wallet frozen', 'success');
      setFreezeUser(null); setFreezeReason('');
      loadUsers(1);
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setFreezeLoading(false); }
  };

  const handleUnfreeze = async (user: UserWalletItem) => {
    const confirmed = await showConfirm('Unfreeze Wallet', `Unfreeze wallet for ${user.user.fullName || user.user.phoneNumber}?`);
    if (!confirmed) return;
    try {
      await userWalletsService.unfreezeWallet(user.user._id);
      showAlert('Success', 'Wallet unfrozen', 'success');
      loadUsers(1);
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
  };

  const loadAudit = async (userId: string, pg: number = 1) => {
    setAuditLoading(true);
    try {
      const result = await userWalletsService.getAuditTrail(userId, pg, 15);
      setAuditLogs(result.auditLogs);
      setAuditPage(pg);
      setAuditTotalPages(result.pagination.totalPages);
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setAuditLoading(false); }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const renderUser = useCallback(({ item }: { item: UserWalletItem }) => {
    const isSelected = selectedUser?.user._id === item.user._id;
    const isFrozen = item.wallet?.isFrozen;
    const balance = item.wallet?.balance?.available ?? 0;
    return (
      <TouchableOpacity style={[s.card, { backgroundColor: colors.card, borderColor: isSelected ? colors.tint : colors.border }]}
        onPress={() => setSelectedUser(isSelected ? null : item)} activeOpacity={0.7}>
        <View style={s.userRow}>
          <View style={[s.avatar, { backgroundColor: isFrozen ? colors.error : colors.tint }]}>
            <Text style={s.avatarText}>{getInitials(item.user.fullName)}</Text>
          </View>
          <View style={s.userInfo}>
            <View style={s.nameRow}>
              <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>{item.user.fullName || 'Unknown'}</Text>
              {isFrozen && <View style={[s.badge, { backgroundColor: colors.errorLight }]}><Text style={[s.badgeText, { color: colors.errorDeep }]}>FROZEN</Text></View>}
            </View>
            <Text style={[s.userPhone, { color: colors.icon }]}>{item.user.phoneNumber || item.user.email}</Text>
            <Text style={[s.walletBalance, { color: colors.text }]}>{balance.toFixed(2)} NC</Text>
          </View>
        </View>
        {isSelected && (
          <View style={s.actionRow}>
            {[
              { label: 'Credit', icon: 'add-circle-outline' as const, color: '#065F46', bg: colors.successLight, fn: () => { setAdjustType('credit'); setAdjustUser(item); } },
              { label: 'Debit', icon: 'remove-circle-outline' as const, color: colors.errorDeep, bg: colors.errorLight, fn: () => { setAdjustType('debit'); setAdjustUser(item); } },
              { label: 'Reverse', icon: 'arrow-undo-outline' as const, color: colors.warningDeep, bg: colors.warningLight, fn: () => setReverseUser(item) },
              { label: isFrozen ? 'Unfreeze' : 'Freeze', icon: isFrozen ? 'lock-open-outline' as const : 'snow-outline' as const, color: isFrozen ? colors.successDeep : colors.errorDeep, bg: isFrozen ? colors.successLight : colors.errorLight, fn: () => isFrozen ? handleUnfreeze(item) : setFreezeUser(item) },
              { label: 'Audit', icon: 'list-outline' as const, color: '#1E40AF', bg: colors.infoLighter, fn: () => { setAuditUser(item); loadAudit(item.user._id, 1); } },
            ].map(({ label, icon, color, bg, fn }) => (
              <TouchableOpacity key={label} style={[s.actionBtn, { backgroundColor: bg }]} onPress={fn}>
                <Ionicons name={icon} size={14} color={color} />
                <Text style={[s.actionText, { color }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedUser, colors]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search by name, phone, or email..."
          placeholderTextColor={colors.icon} value={search} onChangeText={setSearch} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.icon} /></TouchableOpacity>
        )}
      </View>
      <FlatList data={users} keyExtractor={(item) => item.user._id} renderItem={renderUser}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        onEndReached={() => { if (!isLoading && hasMore) loadUsers(page + 1, true); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? <View style={s.emptyState}><Ionicons name="person-outline" size={48} color={colors.icon} /><Text style={[s.emptyText, { color: colors.icon }]}>Search for a user to begin</Text></View> : null} />

      {/* Extracted modals */}
      <AdjustModal
        user={adjustUser}
        adjustType={adjustType}
        setAdjustType={setAdjustType}
        amount={adjustAmount}
        setAmount={setAdjustAmount}
        reason={adjustReason}
        setReason={setAdjustReason}
        loading={adjustLoading}
        onSubmit={handleAdjust}
        onClose={() => { setAdjustUser(null); setAdjustAmount(''); setAdjustReason(''); }}
        colors={colors}
        threshold={approvalThreshold}
      />
      <ReverseModal
        user={reverseUser}
        amount={reverseAmount}
        setAmount={setReverseAmount}
        txId={reverseTxId}
        setTxId={setReverseTxId}
        reason={reverseReason}
        setReason={setReverseReason}
        loading={reverseLoading}
        onSubmit={handleReverseCashback}
        onClose={() => { setReverseUser(null); setReverseAmount(''); setReverseTxId(''); setReverseReason(''); }}
        colors={colors}
      />
      <FreezeModal
        user={freezeUser}
        reason={freezeReason}
        setReason={setFreezeReason}
        loading={freezeLoading}
        onSubmit={handleFreeze}
        onClose={() => { setFreezeUser(null); setFreezeReason(''); }}
        colors={colors}
      />
      <AuditModal
        user={auditUser}
        logs={auditLogs}
        page={auditPage}
        totalPages={auditTotalPages}
        loading={auditLoading}
        onLoad={(pg) => auditUser && loadAudit(auditUser.user._id, pg)}
        onClose={() => setAuditUser(null)}
        colors={colors}
      />
    </View>
  );
}

function CampaignsSection({ colors }: { colors: any }) {
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
    const budgetPct = item.reward?.totalBudget ? Math.min(100, ((item.reward.consumedBudget || 0) / item.reward.totalBudget) * 100) : 0;
    const canToggle = item.status === 'active' || item.status === 'paused';
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.campaignHeader}>
          <Text style={[s.userName, { color: colors.text, flex: 1 }]} numberOfLines={1}>{item.title}</Text>
          <View style={[s.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[s.badgeText, { color: statusColor.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.campaignMeta}>
          <View style={[s.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[s.badgeText, { color: colors.gray700 }]}>{item.campaignType?.replace(/_/g, ' ')}</Text>
          </View>
          {item.fundingSource?.type !== 'platform' && item.fundingSource?.partnerName && (
            <Text style={[s.userPhone, { color: colors.icon }]}>by {item.fundingSource.partnerName}</Text>
          )}
        </View>
        {item.reward?.totalBudget > 0 && (
          <View style={s.budgetRow}>
            <View style={[s.budgetBar, { backgroundColor: colors.border }]}>
              <View style={[s.budgetFill, { width: `${budgetPct}%`, backgroundColor: budgetPct > 90 ? colors.error : colors.success }]} />
            </View>
            <Text style={[s.budgetText, { color: colors.icon }]}>{(item.reward.consumedBudget || 0).toFixed(0)} / {(item.reward?.totalBudget || 0).toFixed(0)} NC</Text>
          </View>
        )}
        {canToggle && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: item.status === 'active' ? colors.warningLight : colors.successLight, alignSelf: 'flex-start', marginTop: 8 }]}
            onPress={() => handleToggleStatus(item)}>
            <Ionicons name={item.status === 'active' ? 'pause-outline' : 'play-outline'} size={14}
              color={item.status === 'active' ? colors.warningDeep : colors.successDeep} />
            <Text style={[s.actionText, { color: item.status === 'active' ? colors.warningDeep : colors.successDeep }]}>
              {item.status === 'active' ? 'Freeze' : 'Resume'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [colors]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['all', 'active', 'paused'] as CampaignFilter[]).map((f) => (
          <TouchableOpacity key={f} style={[s.filterPill, filter === f && { backgroundColor: colors.tint }]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, { color: filter === f ? colors.card : colors.text }]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[s.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search campaigns..."
          placeholderTextColor={colors.icon} value={search} onChangeText={setSearch} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.icon} /></TouchableOpacity>
        )}
      </View>
      <FlatList data={campaigns} keyExtractor={(item) => item._id} renderItem={renderCampaign}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        onEndReached={() => { if (!isLoading && hasMore) loadCampaigns(page + 1, true); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? <View style={s.emptyState}><Ionicons name="megaphone-outline" size={48} color={colors.icon} /><Text style={[s.emptyText, { color: colors.icon }]}>No campaigns found</Text></View> : null} />
    </View>
  );
}

// ═══════════════════════════════════════════════
// TAB 2: PENDING APPROVALS — uses usePendingActions hook
// ═══════════════════════════════════════════════

function PendingApprovalsTab({ colors }: { colors: any }) {
  const { user: currentAdmin } = useAuth();
  const [rejectTarget, setRejectTarget] = useState<AdminActionItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: rawActions, isLoading, isFetching, refetch } = usePendingActions({ limit: 50 });

  const handleApprove = async (action: AdminActionItem) => {
    // SECURITY FIX: Programmatic self-approval prevention, not just visual disable.
    // Check if the current admin is the initiator of this action.
    const isSelf = currentAdmin?._id === (typeof action.initiatorId === 'object' ? action.initiatorId._id : action.initiatorId);
    if (isSelf) {
      showAlert('Self-Approval Blocked', 'You cannot approve your own action. Another admin must approve this request.', 'warning');
      return;
    }
    // SECURITY FIX: Require biometric authentication for high-value approval amounts
    const actionAmount = action.payload.amount || 0;
    if (actionAmount >= 50000) { // 50k NC threshold
      const biometricSuccess = await authService.authenticateWithBiometrics(
        `Authenticate to approve ${actionAmount.toLocaleString()} NC transaction`
      );
      if (!biometricSuccess) {
        showAlert('Authentication Required', 'Biometric authentication is required to approve high-value transactions.', 'warning');
        return;
      }
    }

    const confirmed = await showConfirm(
      'Approve Action',
      `Approve this ${ACTION_TYPE_LABELS[action.actionType] || action.actionType}?\n\nAmount: ${action.payload.amount || 0} NC\nReason: ${action.reason}`
    );
    if (!confirmed) return;
    setActionLoading(action._id);
    try {
      await adminActionsService.approveAction(action._id);
      showAlert('Success', 'Action approved and executed', 'success');
      refetch();
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(rejectTarget._id);
    try {
      await adminActionsService.rejectAction(rejectTarget._id, rejectReason.trim());
      showAlert('Success', 'Action rejected', 'success');
      setRejectTarget(null); setRejectReason('');
      refetch();
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setActionLoading(null); }
  };

  const renderAction = useCallback(({ item }: { item: AdminActionItem }) => {
    const isSelf = currentAdmin?._id === (typeof item.initiatorId === 'object' ? item.initiatorId._id : item.initiatorId);
    const initiatorName = typeof item.initiatorId === 'object' ? item.initiatorId.fullName || item.initiatorId.email || 'Unknown' : 'Unknown';
    const isActionLoading = actionLoading === item._id;
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.campaignHeader}>
          <View style={[s.badge, { backgroundColor: colors.warningLight }]}>
            <Text style={[s.badgeText, { color: colors.warningDeep }]}>{ACTION_TYPE_LABELS[item.actionType] || item.actionType}</Text>
          </View>
          <Text style={[s.auditDate, { color: colors.icon }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={[s.userName, { color: colors.text }]}>
            {item.payload.type === 'credit' ? '+' : '-'}{item.payload.amount?.toFixed(2) || '0'} NC
          </Text>
          <Text style={[s.userPhone, { color: colors.icon, marginTop: 4 }]}>Initiated by: {initiatorName}</Text>
          {item.payload.userId && <Text style={[s.userPhone, { color: colors.icon }]}>Target user: {item.payload.userId}</Text>}
          <Text style={[s.auditDesc, { color: colors.text, marginTop: 4 }]}>{item.reason}</Text>
        </View>
        <View style={[s.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.successLight, opacity: isSelf ? 0.5 : 1 }]}
            onPress={() => handleApprove(item)} disabled={isSelf || isActionLoading}>
            {isActionLoading ? <ActivityIndicator size="small" color={colors.successDeep} /> : (
              <><Ionicons name="checkmark-circle-outline" size={14} color={colors.successDeep} /><Text style={[s.actionText, { color: colors.successDeep }]}>Approve</Text></>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.errorLight }]}
            onPress={() => setRejectTarget(item)} disabled={isActionLoading}>
            <Ionicons name="close-circle-outline" size={14} color={colors.errorDeep} />
            <Text style={[s.actionText, { color: colors.errorDeep }]}>Reject</Text>
          </TouchableOpacity>
          {isSelf && <Text style={[s.helperText, { color: colors.warningDeep, marginBottom: 0 }]}>Cannot approve own action</Text>}
        </View>
      </View>
    );
  }, [colors, currentAdmin, actionLoading]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={rawActions?.actions ?? []} keyExtractor={(item) => item._id} renderItem={renderAction}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.tint} />}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? <View style={s.emptyState}><Ionicons name="checkmark-done-circle-outline" size={48} color={colors.icon} /><Text style={[s.emptyText, { color: colors.icon }]}>No pending approvals</Text></View> : null} />

      {/* Extracted RejectModal */}
      <RejectModal
        action={rejectTarget}
        reason={rejectReason}
        setReason={setRejectReason}
        onSubmit={handleReject}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
        colors={colors}
        ACTION_TYPE_LABELS={ACTION_TYPE_LABELS}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════
// TAB 3: ACTION HISTORY — uses useActionHistory hook
// ═══════════════════════════════════════════════

function ActionHistoryTab({ colors }: { colors: any }) {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const { data: rawHistory, isLoading, isFetching, refetch } = useActionHistory({
    status: filter === 'all' ? undefined : (filter as AdminActionStatus),
    limit: 50,
  });

  const renderHistoryItem = useCallback(({ item }: { item: AdminActionItem }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending_approval;
    const initiatorName = typeof item.initiatorId === 'object' ? item.initiatorId.fullName || item.initiatorId.email || 'Unknown' : 'Unknown';
    const approverName = item.approverId && typeof item.approverId === 'object' ? item.approverId.fullName || item.approverId.email : null;
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.campaignHeader}>
          <View style={[s.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[s.badgeText, { color: statusColor.text }]}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[s.badgeText, { color: colors.gray700 }]}>{ACTION_TYPE_LABELS[item.actionType] || item.actionType}</Text>
          </View>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={[s.userName, { color: colors.text }]}>
            {item.payload.type === 'credit' ? '+' : '-'}{item.payload.amount?.toFixed(2) || '0'} NC
          </Text>
          <Text style={[s.userPhone, { color: colors.icon, marginTop: 2 }]}>By: {initiatorName}</Text>
          {approverName && <Text style={[s.userPhone, { color: colors.icon }]}>
            {item.status === 'rejected' ? 'Rejected by' : 'Approved by'}: {approverName}
          </Text>}
          <Text style={[s.auditDesc, { color: colors.text, marginTop: 4 }]} numberOfLines={2}>{item.reason}</Text>
          {item.rejectionReason && <Text style={[s.auditDesc, { color: colors.error, marginTop: 2 }]} numberOfLines={2}>Rejection: {item.rejectionReason}</Text>}
          <Text style={[s.auditDate, { color: colors.icon, marginTop: 4 }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </View>
    );
  }, [colors]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[s.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {(['all', 'pending_approval', 'executed', 'approved', 'rejected'] as HistoryFilter[]).map((f) => (
          <TouchableOpacity key={f} style={[s.filterPill, filter === f && { backgroundColor: colors.tint }]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, { color: filter === f ? colors.card : colors.text }]}>
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList data={rawHistory?.actions ?? []} keyExtractor={(item) => item._id} renderItem={renderHistoryItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.tint} />}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? <View style={s.emptyState}><Ionicons name="document-text-outline" size={48} color={colors.icon} /><Text style={[s.emptyText, { color: colors.icon }]}>No action history</Text></View> : null} />
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════

