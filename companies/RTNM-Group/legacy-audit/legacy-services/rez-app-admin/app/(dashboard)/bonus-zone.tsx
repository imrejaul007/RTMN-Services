import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
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
  bonusZoneService,
  BonusCampaignAdmin,
  BonusCampaignClaim,
  BonusFraudAlert,
  BonusCampaignStatus,
} from '../../services/api/bonusZone';
import { s } from './styles/bonus-zone.styles';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  CampaignCard,
  CampaignFormModal,
  AnalyticsModal,
  ClaimsTab,
  DashboardTab,
  RejectModal,
  FundModal,
} from '../../components/bonus-zone';

// ============================================
// TYPES
// ============================================

type TabType = 'campaigns' | 'analytics' | 'claims';
type CampaignStatusFilter =
  | 'all'
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'exhausted'
  | 'expired'
  | 'cancelled';
type CampaignTypeFilter =
  | 'all'
  | 'cashback_boost'
  | 'bank_offer'
  | 'bill_upload_bonus'
  | 'category_multiplier'
  | 'first_transaction_bonus'
  | 'festival_offer';

const STATUS_COLORS: Record<string, string> = {
  draft: Colors.light.slateMedium,
  scheduled: Colors.light.info,
  active: Colors.light.success,
  paused: Colors.light.warning,
  exhausted: Colors.light.error,
  expired: Colors.light.secondaryText,
  cancelled: Colors.light.errorDark,
};

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  cashback_boost: 'Cashback Boost',
  bank_offer: 'Bank Offer',
  bill_upload_bonus: 'Bill Upload',
  category_multiplier: 'Category Multiplier',
  first_transaction_bonus: 'First Transaction',
  festival_offer: 'Festival Offer',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  flat: 'Flat Coins',
  multiplier: 'Multiplier',
};

const PAYMENT_METHOD_OPTIONS = [
  { key: 'credit_card', label: 'Credit Card' },
  { key: 'debit_card', label: 'Debit Card' },
  { key: 'upi', label: 'UPI' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'net_banking', label: 'Net Banking' },
  { key: 'cod', label: 'COD' },
];

const MERCHANT_CATEGORY_OPTIONS = [
  { key: 'food-dining', label: 'Food & Dining' },
  { key: 'beauty-wellness', label: 'Beauty & Wellness' },
  { key: 'grocery-essentials', label: 'Grocery' },
  { key: 'fitness-sports', label: 'Fitness & Sports' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'education-learning', label: 'Education' },
  { key: 'home-services', label: 'Home Services' },
  { key: 'travel-experiences', label: 'Travel' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'financial-lifestyle', label: 'Financial' },
  { key: 'electronics', label: 'Electronics' },
];

const USER_SEGMENT_OPTIONS = [
  { key: 'new_user', label: 'New User' },
  { key: 'student', label: 'Student' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'prive', label: 'Prive' },
];

const FUNDING_SOURCE_OPTIONS = [
  { key: 'platform', label: 'Platform' },
  { key: 'branded', label: 'Branded' },
  { key: 'partner', label: 'Partner' },
];

const COIN_TYPE_OPTIONS = [
  { key: 'rez', label: 'Rez Coins' },
  { key: 'branded', label: 'Branded Coins' },
];

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

function formatBudget(consumed: number, total: number): string {
  const percent = total > 0 ? Math.round((consumed / total) * 100) : 0;
  return `${consumed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;
}

// Date/time split helpers
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function splitIsoToDateAndTime(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
  } catch {
    return { date: '', time: '' };
  }
}

function combineDateAndTime(date: string, time: string): string | null {
  if (!DATE_REGEX.test(date)) return null;
  const t = TIME_REGEX.test(time) ? time : '00:00';
  const d = new Date(`${date}T${t}:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isValidDate(date: string): boolean {
  if (!date) return true; // empty is ok (not yet filled)
  return DATE_REGEX.test(date) && !isNaN(new Date(date).getTime());
}

function isValidTime(time: string): boolean {
  if (!time) return true;
  if (!TIME_REGEX.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function formatDatePreview(date: string, time: string): string | null {
  if (!DATE_REGEX.test(date)) return null;
  const t = TIME_REGEX.test(time) ? time : '00:00';
  try {
    const d = new Date(`${date}T${t}:00`);
    if (isNaN(d.getTime())) return null;
    return format(d, "MMM dd, yyyy 'at' h:mm a");
  } catch {
    return null;
  }
}

// ============================================
// DEFAULT FORM
// ============================================

const DEFAULT_FORM: Partial<BonusCampaignAdmin> = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  campaignType: 'cashback_boost',
  fundingSource: { type: 'platform', partnerName: '' },
  eligibility: {
    regions: ['all'],
    paymentMethods: [],
    bankCodes: [],
    binPrefixes: [],
    merchantCategories: [],
    userSegments: [],
    minSpend: 0,
    firstTransactionOnly: false,
  },
  reward: {
    type: 'percentage',
    value: 10,
    capPerUser: 100,
    capPerTransaction: 50,
    totalBudget: 10000,
    consumedBudget: 0,
    coinType: 'rez',
  },
  limits: {
    maxClaimsPerUser: 1,
    maxClaimsPerUserPerDay: 0,
    totalGlobalClaims: 0,
    currentGlobalClaims: 0,
  },
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  display: {
    icon: '🎁',
    featured: false,
    priority: 50,
    backgroundColor: Colors.light.warningLight,
  },
  deepLink: { screen: '/cash-store' },
  terms: [],
  status: 'draft',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function BonusZoneScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('campaigns');

  // Campaign list state
  const [campaigns, setCampaigns] = useState<BonusCampaignAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<CampaignTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<BonusCampaignAdmin | null>(null);
  const [formData, setFormData] = useState<Partial<BonusCampaignAdmin>>(DEFAULT_FORM);
  const [newTerm, setNewTerm] = useState('');

  // Split date/time state for schedule inputs
  const [startDate, setStartDate] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');

  // Analytics state
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Claims tab state
  const [claimsCampaignId, setClaimsCampaignId] = useState<string | null>(null);
  const [claims, setClaims] = useState<BonusCampaignClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);
  const [claimsStatusFilter, setClaimsStatusFilter] = useState<string>('all');
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Fund modal state
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundCampaignId, setFundCampaignId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('5000');

  // Fraud alerts state
  const [fraudAlerts, setFraudAlerts] = useState<BonusFraudAlert[]>([]);
  const [fraudAlertsLoading, setFraudAlertsLoading] = useState(false);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadCampaigns = useCallback(
    async (pageNum: number = 1) => {
      try {
        if (pageNum === 1) setLoading(true);
        const query: any = { page: pageNum, limit: 20 };
        if (statusFilter !== 'all') query.status = statusFilter;
        if (typeFilter !== 'all') query.campaignType = typeFilter;
        if (searchQuery.trim()) query.search = searchQuery.trim();

        const data = await bonusZoneService.getCampaigns(query);
        setCampaigns(data.campaigns);
        setTotalPages(data.pagination.pages);
        setPage(pageNum);
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to load campaigns');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, typeFilter, searchQuery]
  );

  const loadDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);
      const data = await bonusZoneService.getDashboard();
      setDashboardStats(data);
    } catch (error: any) {
      logger.error('Dashboard error:', error);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (campaignId: string) => {
    try {
      setAnalyticsLoading(true);
      setSelectedCampaignId(campaignId);
      const data = await bonusZoneService.getCampaignAnalytics(campaignId);
      setAnalytics(data);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadClaimsForCampaign = useCallback(
    async (campaignId: string, pageNum: number = 1) => {
      try {
        setClaimsLoading(true);
        const query: any = { page: pageNum, limit: 20 };
        if (claimsStatusFilter !== 'all') query.status = claimsStatusFilter;

        const data = await bonusZoneService.getCampaignClaims(campaignId, query);
        setClaims(data.claims);
        setClaimsTotalPages(data.pagination.pages);
        setClaimsPage(pageNum);
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to load claims');
      } finally {
        setClaimsLoading(false);
      }
    },
    [claimsStatusFilter]
  );

  const loadFraudAlerts = useCallback(async () => {
    try {
      setFraudAlertsLoading(true);
      const alerts = await bonusZoneService.getFraudAlerts(50);
      setFraudAlerts(alerts);
    } catch (error: any) {
      logger.error('Fraud alerts error:', error);
    } finally {
      setFraudAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      loadCampaigns(1);
    } else if (activeTab === 'analytics') {
      loadDashboard();
    } else if (activeTab === 'claims') {
      // Load campaigns list for claim selection, and fraud alerts
      loadCampaigns(1);
      loadFraudAlerts();
    }
  }, [activeTab, statusFilter, typeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'campaigns') {
      loadCampaigns(1);
    } else if (activeTab === 'analytics') {
      loadDashboard();
    } else if (activeTab === 'claims') {
      if (claimsCampaignId) loadClaimsForCampaign(claimsCampaignId, 1);
      loadFraudAlerts();
      setRefreshing(false);
    }
  }, [
    activeTab,
    loadCampaigns,
    loadDashboard,
    claimsCampaignId,
    loadClaimsForCampaign,
    loadFraudAlerts,
  ]);

  // ==========================================
  // CAMPAIGN ACTIONS
  // ==========================================

  const handleCreate = () => {
    setEditingCampaign(null);
    const form = { ...DEFAULT_FORM };
    setFormData(form);
    const s = splitIsoToDateAndTime(form.startTime || '');
    const e = splitIsoToDateAndTime(form.endTime || '');
    setStartDate(s.date);
    setStartTimeInput(s.time);
    setEndDate(e.date);
    setEndTimeInput(e.time);
    setShowFormModal(true);
  };

  const handleEdit = (campaign: BonusCampaignAdmin) => {
    setEditingCampaign(campaign);
    setFormData({
      ...campaign,
      fundingSource: {
        partnerName: '',
        ...campaign.fundingSource,
        type: campaign.fundingSource?.type ?? 'platform',
      },
      eligibility: {
        regions: ['all'],
        paymentMethods: [],
        bankCodes: [],
        binPrefixes: [],
        merchantCategories: [],
        userSegments: [],
        minSpend: 0,
        firstTransactionOnly: false,
        ...campaign.eligibility,
      },
      reward: {
        ...DEFAULT_FORM.reward!,
        ...campaign.reward,
      },
    });
    const s = splitIsoToDateAndTime(campaign.startTime || '');
    const e = splitIsoToDateAndTime(campaign.endTime || '');
    setStartDate(s.date);
    setStartTimeInput(s.time);
    setEndDate(e.date);
    setEndTimeInput(e.time);
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title || !formData.subtitle) {
      showAlert('Error', 'Slug, title, and subtitle are required');
      return;
    }
    if (!formData.reward?.totalBudget || formData.reward.totalBudget <= 0) {
      showAlert('Error', 'Total budget must be greater than zero');
      return;
    }
    if (!formData.reward?.value || formData.reward.value <= 0) {
      showAlert('Error', 'Reward value must be greater than zero');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCampaign) {
        await bonusZoneService.updateCampaign(editingCampaign._id, formData);
        showAlert('Success', 'Campaign updated successfully');
      } else {
        await bonusZoneService.createCampaign(formData);
        showAlert('Success', 'Campaign created successfully');
      }
      setShowFormModal(false);
      loadCampaigns(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save campaign');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (campaign: BonusCampaignAdmin) => {
    if (!['draft', 'cancelled'].includes(campaign.status)) {
      showAlert('Error', 'Only draft or cancelled campaigns can be deleted');
      return;
    }

    showConfirm(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.title}"?`,
      async () => {
        try {
          await bonusZoneService.deleteCampaign(campaign._id);
          showAlert('Success', 'Campaign deleted');
          loadCampaigns(page);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  const handleStatusChange = async (campaign: BonusCampaignAdmin, newStatus: string) => {
    try {
      await bonusZoneService.updateStatus(campaign._id, newStatus as BonusCampaignStatus);
      showAlert('Success', `Campaign status changed to ${newStatus}`);
      loadCampaigns(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update status');
    }
  };

  const handleDuplicate = async (campaign: BonusCampaignAdmin) => {
    try {
      await bonusZoneService.duplicateCampaign(campaign._id);
      showAlert('Success', 'Campaign duplicated');
      loadCampaigns(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to duplicate');
    }
  };

  const handleRejectClaim = async () => {
    if (!rejectingClaimId) return;
    try {
      await bonusZoneService.rejectClaim(rejectingClaimId, rejectReason || 'Rejected by admin');
      showAlert('Success', 'Claim rejected successfully');
      setShowRejectModal(false);
      setRejectingClaimId(null);
      setRejectReason('');
      if (claimsCampaignId) loadClaimsForCampaign(claimsCampaignId, claimsPage);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reject claim');
    }
  };

  const openRejectModal = (claimId: string) => {
    setRejectingClaimId(claimId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleFund = (campaign: BonusCampaignAdmin) => {
    setFundCampaignId(campaign._id);
    setFundAmount('5000');
    setShowFundModal(true);
  };

  const handleFundConfirm = async () => {
    if (!fundCampaignId) return;
    const amount = parseInt(fundAmount, 10);
    if (!amount || amount <= 0) {
      showAlert('Error', 'Please enter a valid positive amount');
      return;
    }
    try {
      await bonusZoneService.fundCampaign(fundCampaignId, amount);
      showAlert('Success', `Added ${amount.toLocaleString()} coins to campaign budget`);
      setShowFundModal(false);
      setFundCampaignId(null);
      loadCampaigns(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to fund');
    }
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bonus Zone</Text>
        {activeTab === 'campaigns' && (
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Ionicons name="add" size={20} color={colors.card} />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View
        style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        {(['campaigns', 'analytics', 'claims'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters (campaigns tab only) */}
      {activeTab === 'campaigns' && (
        <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => loadCampaigns(1)}
            placeholder="Search campaigns..."
            placeholderTextColor={colors.muted}
            returnKeyType="search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
            {(
              [
                'all',
                'active',
                'draft',
                'scheduled',
                'paused',
                'exhausted',
                'expired',
              ] as CampaignStatusFilter[]
            ).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                onPress={() => setStatusFilter(s)}
              >
                <Text
                  style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {activeTab === 'campaigns' ? (
        <FlatList
          data={campaigns}
          renderItem={({ item }) => (
            <CampaignCard
              item={item}
              colors={colors}
              onEdit={handleEdit}
              onLoadAnalytics={loadAnalytics}
              onDuplicate={handleDuplicate}
              onStatusChange={handleStatusChange}
              onFund={handleFund}
              onDelete={handleDelete}
            />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="gift-outline" size={48} color={colors.gray300} />
                <Text style={styles.emptyText}>No campaigns found</Text>
              </View>
            )
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  onPress={() => page > 1 && loadCampaigns(page - 1)}
                  disabled={page <= 1}
                >
                  <Text style={styles.pageBtnText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  Page {page} of {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  onPress={() => page < totalPages && loadCampaigns(page + 1)}
                  disabled={page >= totalPages}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      ) : activeTab === 'claims' ? (
        <ClaimsTab
          campaigns={campaigns}
          claimsCampaignId={claimsCampaignId}
          setClaimsCampaignId={setClaimsCampaignId}
          claims={claims}
          claimsLoading={claimsLoading}
          claimsPage={claimsPage}
          claimsTotalPages={claimsTotalPages}
          claimsStatusFilter={claimsStatusFilter}
          setClaimsStatusFilter={setClaimsStatusFilter}
          refreshing={refreshing}
          onRefresh={onRefresh}
          loadClaimsForCampaign={loadClaimsForCampaign}
          openRejectModal={openRejectModal}
          fraudAlerts={fraudAlerts}
          fraudAlertsLoading={fraudAlertsLoading}
          loadFraudAlerts={loadFraudAlerts}
          colors={colors}
        />
      ) : (
        <DashboardTab
          dashboardStats={dashboardStats}
          dashboardLoading={dashboardLoading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={colors}
        />
      )}

      {/* Modals */}
      <CampaignFormModal
        visible={showFormModal}
        editingCampaign={editingCampaign}
        colors={colors}
        onClose={() => {
          setShowFormModal(false);
          setEditingCampaign(null);
          setFormData(DEFAULT_FORM);
          setStartDate('');
          setStartTimeInput('');
          setEndDate('');
          setEndTimeInput('');
          setNewTerm('');
        }}
        onSave={handleSave}
        isSaving={isSaving}
        formData={formData}
        setFormData={setFormData}
        startDate={startDate}
        setStartDate={setStartDate}
        startTimeInput={startTimeInput}
        setStartTimeInput={setStartTimeInput}
        endDate={endDate}
        setEndDate={setEndDate}
        endTimeInput={endTimeInput}
        setEndTimeInput={setEndTimeInput}
        newTerm={newTerm}
        setNewTerm={setNewTerm}
      />
      <AnalyticsModal
        visible={!!selectedCampaignId}
        campaignId={selectedCampaignId}
        analytics={analytics}
        analyticsLoading={analyticsLoading}
        colors={colors}
        onClose={() => {
          setSelectedCampaignId(null);
          setAnalytics(null);
        }}
      />
      <RejectModal
        visible={showRejectModal}
        reason={rejectReason}
        colors={colors}
        onChangeReason={setRejectReason}
        onCancel={() => {
          setShowRejectModal(false);
          setRejectingClaimId(null);
          setRejectReason('');
        }}
        onConfirm={handleRejectClaim}
      />
      <FundModal
        visible={showFundModal}
        amount={fundAmount}
        colors={colors}
        onChangeAmount={setFundAmount}
        onCancel={() => {
          setShowFundModal(false);
          setFundCampaignId(null);
        }}
        onConfirm={handleFundConfirm}
      />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.info,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.light.info },
  tabText: { fontSize: 14, color: Colors.light.mutedDark, fontWeight: '500' },
  tabTextActive: { color: Colors.light.info, fontWeight: '600' },

  // Filters
  filtersBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  filterChips: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.light.info },
  filterChipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  filterChipTextActive: { color: Colors.light.card, fontWeight: '600' },

  // Campaign Card
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSlug: { fontSize: 11, color: Colors.light.muted, marginTop: 1 },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  infoChipText: { fontSize: 11, fontWeight: '500', color: Colors.light.gray700 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  budgetLabel: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  budgetValue: { fontSize: 12, color: Colors.light.gray700, fontWeight: '600' },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.light.gray200,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: { height: 4, borderRadius: 2 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  scheduleText: { fontSize: 11, color: Colors.light.mutedDark },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statsText: { fontSize: 11, color: Colors.light.muted },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundSecondary,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionText: { fontSize: 12, fontWeight: '500' },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Form Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: Colors.light.info },
  formScroll: { paddingHorizontal: 20 },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.navy,
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
    paddingBottom: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.mutedDark,
    marginTop: 10,
    marginBottom: 4,
  },
  formHint: { fontSize: 12, color: Colors.light.muted, fontStyle: 'italic', marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 12 },
  formRowItem: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  chipSelected: { backgroundColor: Colors.light.info },
  chipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  chipTextSelected: { color: Colors.light.card, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 8,
    marginBottom: 4,
    gap: 8,
  },
  termText: { flex: 1, fontSize: 13, color: Colors.light.gray700 },
  addTermRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  addTermBtn: { paddingTop: 4 },

  // Analytics Modal
  analyticsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  analyticsContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  analyticsTitle: { fontSize: 18, fontWeight: '700' },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  analyticsCard: {
    width: '47%',
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  analyticsCardValue: { fontSize: 22, fontWeight: '700', color: Colors.light.navy },
  analyticsCardLabel: {
    fontSize: 11,
    color: Colors.light.mutedDark,
    marginTop: 4,
    fontWeight: '500',
  },

  // Dashboard
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  dashboardCard: { width: '47%', borderRadius: 12, padding: 16, alignItems: 'center' },
  dashboardValue: { fontSize: 24, fontWeight: '700' },
  dashboardLabel: { fontSize: 12, color: Colors.light.mutedDark, marginTop: 4, fontWeight: '500' },
  sectionCard: { borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.light.gray200 },
  sectionCardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  statusRowLabel: { flex: 1, fontSize: 13, textTransform: 'capitalize' },
  statusRowCount: { fontSize: 14, fontWeight: '600', color: Colors.light.gray700 },

  // Empty & Pagination
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.light.muted, marginTop: 10 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.info,
    borderRadius: 8,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: Colors.light.card, fontWeight: '500', fontSize: 13 },
  pageInfo: { fontSize: 13, color: Colors.light.mutedDark },

  // Claims Tab
  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    marginBottom: 8,
  },
  claimInfo: { flex: 1, gap: 4 },
  claimUser: { fontSize: 14, fontWeight: '600' },
  claimAmount: { fontSize: 13, fontWeight: '600', color: Colors.light.success },
  claimDate: { fontSize: 11, color: Colors.light.muted },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.light.errorLight,
    borderRadius: 8,
    marginLeft: 8,
  },
  rejectBtnText: { fontSize: 12, fontWeight: '600', color: Colors.light.error },

  // Reject Modal
  rejectModalContainer: {
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
  },

  // Fraud Alerts
  fraudAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  fraudAlertRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  fraudAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  fraudAlertDate: { fontSize: 11, color: Colors.light.muted },
  fraudAlertType: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  fraudAlertDesc: { fontSize: 12, color: Colors.light.mutedDark, marginBottom: 4 },
  fraudAlertUser: { fontSize: 11, color: Colors.light.muted },
  fraudAlertCampaign: { fontSize: 11, color: Colors.light.muted },

  // Date/time input helpers
  formInputError: { borderColor: Colors.light.error, borderWidth: 2 },
  formInputHint: { fontSize: 11, color: Colors.light.muted, marginTop: 2 },
  datePreview: {
    fontSize: 13,
    color: Colors.light.success,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
    paddingLeft: 2,
  },

  // Image URL previews
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  imagePreviewSmall: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },

  // Campaign preview card
  previewContainer: {
    marginTop: 4,
    marginBottom: 20,
  },
  previewCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  previewIcon: {
    fontSize: 32,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.navy,
  },
  previewSubtitle: {
    fontSize: 13,
    color: Colors.light.gray600,
    marginTop: 2,
  },
  previewRewardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  previewRewardBadge: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewRewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.card,
  },
  previewTypeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.info,
  },
  previewFeaturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  previewFeaturedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.warningDark,
  },
  previewScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  previewScheduleText: {
    fontSize: 11,
    color: Colors.light.mutedDark,
  },
  previewLabel: {
    fontSize: 11,
    color: Colors.light.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
