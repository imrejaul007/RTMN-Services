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
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { merchantsService, Merchant, MerchantWallet } from '../../services/api/merchants';
import { Colors } from '@/constants/Colors';
import { socketService } from '../../services/socket';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { useDebouncedCallback } from '../../utils/debounce';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { withErrorBoundary } from '../../components/ErrorBoundary';

type StatusFilter = 'all' | 'pending' | 'approved' | 'suspended';

function MerchantsScreenInner() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { hasRole } = useAuth();

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingMerchant, setProcessingMerchant] = useState<string | null>(null);
  const [liveMerchants, setLiveMerchants] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // H10 FIX: Debounce search to avoid firing API on every keystroke
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
  }, 300);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailMerchant, setDetailMerchant] = useState<Merchant | null>(null);
  const [merchantWallet, setMerchantWallet] = useState<MerchantWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Suspend modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendMerchantId, setSuspendMerchantId] = useState<string | null>(null);

  // Create merchant modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: '',
  });
  const [creatingMerchant, setCreatingMerchant] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);

  // REZ Program toggle state (storeId -> isProgramMerchant)
  const [storeProgramState, setStoreProgramState] = useState<
    Record<string, { isProgramMerchant: boolean; cashback: number; waitMins: number }>
  >({});
  const [togglingStore, setTogglingStore] = useState<string | null>(null);
  const [savingWaitStore, setSavingWaitStore] = useState<string | null>(null);

  const loadData = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!append) setIsLoading(true);
      try {
        setError(null);
        const data = await merchantsService.getMerchants(
          pageNum,
          20,
          statusFilter === 'all' ? undefined : statusFilter,
          searchQuery || undefined
        );

        const merchantList = data?.merchants ?? [];
        if (append) {
          setMerchants((prev) => [...prev, ...merchantList]);
        } else {
          setMerchants(merchantList);
        }

        setHasMore((data?.pagination?.page ?? 1) < (data?.pagination?.totalPages ?? 1));
        setPage(pageNum);
      } catch (error: any) {
        logger.error('Failed to load merchants:', error);
        setError(error?.message || 'Failed to load merchants');
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, searchQuery]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // NOTE: The 'merchant:live' socket event is not emitted by the backend yet.
  // The liveMerchants state remains available for when the backend emitter is
  // implemented. Until then, POS online/offline status must be checked via REST.
  // useEffect(() => {
  //   const unsubscribe = socketService.onMerchantLive((data) => {
  //     setLiveMerchants((prev) => {
  //       const next = new Set(prev);
  //       if (data.event === 'pos_opened') next.add(data.merchantId);
  //       else next.delete(data.merchantId);
  //       return next;
  //     });
  //   });
  //   return unsubscribe;
  // }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, [loadData]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  }, [isLoading, hasMore, page, loadData]);

  const handleApprove = async (merchantId: string) => {
    showConfirm(
      'Approve Merchant',
      'Are you sure you want to approve this merchant?',
      async () => {
        try {
          setProcessingMerchant(merchantId);
          await merchantsService.approveMerchant(merchantId);
          showAlert('Success', 'Merchant approved successfully');
          await loadData(page);
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingMerchant(null);
        }
      },
      'Approve'
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !selectedMerchant) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }
    try {
      setProcessingMerchant(selectedMerchant);
      await merchantsService.rejectMerchant(selectedMerchant, rejectReason);
      showAlert('Success', 'Merchant rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedMerchant(null);
      await loadData(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingMerchant(null);
    }
  };

  const handleViewDetails = async (merchant: Merchant) => {
    setDetailMerchant(merchant);
    setShowDetailModal(true);
    setLoadingWallet(true);
    setMerchantWallet(null);
    setWalletError(null);

    // Initialize per-store program state from merchant data
    const initialProgramState: Record<
      string,
      { isProgramMerchant: boolean; cashback: number; waitMins: number }
    > = {};
    merchant.stores?.forEach((store) => {
      initialProgramState[store._id] = {
        isProgramMerchant: store.isProgramMerchant ?? false,
        cashback: store.baseCashbackPercent ?? 0,
        waitMins: store.estimatedPrepMinutes ?? 0,
      };
    });
    setStoreProgramState(initialProgramState);

    try {
      const wallet = await merchantsService.getMerchantWallet(merchant._id);
      setMerchantWallet(wallet);
    } catch (err: any) {
      logger.error('Failed to load merchant wallet:', err);
      setWalletError(err?.message || 'Failed to load wallet');
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleToggleStoreProgram = async (storeId: string) => {
    const current = storeProgramState[storeId];
    const newEnabled = !current?.isProgramMerchant;
    const cashback = newEnabled ? (current?.cashback > 0 ? current.cashback : 5) : 0;

    setTogglingStore(storeId);
    try {
      await merchantsService.toggleStoreProgram(storeId, newEnabled, cashback);
      setStoreProgramState((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], isProgramMerchant: newEnabled, cashback },
      }));
      showAlert(
        'Success',
        newEnabled
          ? `Store enrolled in REZ Program (${cashback}% cashback)`
          : 'Store removed from REZ Program'
      );
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update program status');
    } finally {
      setTogglingStore(null);
    }
  };

  const handleSaveWaitTime = async (storeId: string, mins: number) => {
    setSavingWaitStore(storeId);
    try {
      await merchantsService.updateStoreSettings(storeId, { estimatedPrepMinutes: mins });
      setStoreProgramState((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], waitMins: mins },
      }));
      showAlert('Success', mins > 0 ? `Wait time set to ${mins} mins` : 'Wait time cleared');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save wait time');
    } finally {
      setSavingWaitStore(null);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount ?? 0);
  };

  const safeFormatDate = (dateStr: string | undefined, pattern: string = 'MMM d, yyyy') => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), pattern);
    } catch {
      return '—';
    }
  };

  const handleSuspend = (merchantId: string) => {
    setSuspendMerchantId(merchantId);
    setSuspendReason('');
    setShowSuspendModal(true);
  };

  const handleSuspendConfirm = async () => {
    if (!suspendReason.trim() || !suspendMerchantId) {
      showAlert('Error', 'Please provide a suspension reason');
      return;
    }
    try {
      setProcessingMerchant(suspendMerchantId);
      await merchantsService.suspendMerchant(suspendMerchantId, suspendReason);
      showAlert('Success', 'Merchant suspended');
      setShowSuspendModal(false);
      setSuspendReason('');
      setSuspendMerchantId(null);
      await loadData(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingMerchant(null);
    }
  };

  // H12 FIX: Add reactivate handler for suspended merchants
  const handleReactivate = async (merchantId: string) => {
    showConfirm(
      'Reactivate Merchant',
      'Are you sure you want to reactivate this merchant?',
      async () => {
        try {
          setProcessingMerchant(merchantId);
          await merchantsService.reactivateMerchant(merchantId);
          showAlert('Success', 'Merchant reactivated successfully');
          await loadData(page);
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingMerchant(null);
        }
      },
      'Reactivate'
    );
  };

  const handleCreateMerchant = async () => {
    const { name, email, phone, businessName } = createForm;
    if (!name.trim() || !email.trim() || !phone.trim() || !businessName.trim()) {
      showAlert('Error', 'Name, email, phone, and business name are required');
      return;
    }
    try {
      setCreatingMerchant(true);
      const result = await merchantsService.createMerchant({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        businessName: businessName.trim(),
        businessType: createForm.businessType.trim() || undefined,
      });
      setCreatedTempPassword(result.tempPassword);
      await loadData(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create merchant');
    } finally {
      setCreatingMerchant(false);
    }
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreatedTempPassword(null);
    setCreateForm({ name: '', email: '', phone: '', businessName: '', businessType: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'rejected':
        return colors.error;
      case 'suspended':
        return colors.mutedDark;
      default:
        return colors.icon;
    }
  };

  const renderFilters = useCallback(
    () => (
      <View style={styles.filtersContainer}>
        {hasRole(ADMIN_ROLES.ADMIN) && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              setCreatedTempPassword(null);
              setCreateForm({ name: '', email: '', phone: '', businessName: '', businessType: '' });
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add" size={20} color={colors.card} />
            <Text style={[styles.createButtonText, { color: colors.card }]}>Create Merchant</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.icon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, email or phone..."
            placeholderTextColor={colors.icon}
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              debouncedSearch(text);
            }}
          />
          {inputText ? (
            <TouchableOpacity
              onPress={() => {
                setInputText('');
                setSearchQuery('');
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.icon} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.statusFilters}>
          {(['all', 'pending', 'approved', 'suspended'] as StatusFilter[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                { backgroundColor: statusFilter === status ? colors.tint : colors.card },
              ]}
              onPress={() => {
                setStatusFilter(status);
                setIsLoading(true);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === status ? colors.card : colors.text },
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ),
    [
      colors,
      inputText,
      statusFilter,
      debouncedSearch,
      setInputText,
      setSearchQuery,
      setStatusFilter,
      setIsLoading,
      hasRole,
    ]
  );

  const renderMerchantItem = useCallback(
    ({ item }: { item: Merchant }) => (
      <View style={[styles.merchantCard, { backgroundColor: colors.card }]}>
        <View style={styles.merchantHeader}>
          <View style={styles.merchantAvatar}>
            <Ionicons name="storefront" size={24} color={colors.tint} />
          </View>
          <View style={styles.merchantInfo}>
            <Text style={[styles.businessName, { color: colors.text }]}>{item.businessName}</Text>
            <Text style={[styles.businessType, { color: colors.icon }]}>{item.businessType}</Text>
          </View>
          <View style={{ gap: 8 }}>
            <View
              style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.statusText, { color: getStatusColor(item.status) }]}
              >
                {item.status}
              </Text>
            </View>
            {liveMerchants.has(item._id) && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>POS LIVE</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.merchantDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>{item.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>{item.phoneNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="storefront-outline" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>
              {item.stores?.length || 0} stores
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>
              Joined {safeFormatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => handleApprove(item._id)}
              disabled={processingMerchant === item._id}
            >
              {processingMerchant === item._id ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color={colors.card} />
                  <Text style={styles.actionButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={colors.card} />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => {
                setSelectedMerchant(item._id);
                setShowRejectModal(true);
              }}
              disabled={processingMerchant === item._id}
            >
              <Ionicons name="close" size={18} color={colors.card} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'approved' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.info }]}
              onPress={() => handleViewDetails(item)}
            >
              <Ionicons name="eye" size={18} color={colors.card} />
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.mutedDark }]}
              onPress={() => handleSuspend(item._id)}
              disabled={processingMerchant === item._id}
            >
              <Ionicons name="ban" size={18} color={colors.card} />
              <Text style={styles.actionButtonText}>Suspend</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'rejected' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.info }]}
              onPress={() => handleViewDetails(item)}
            >
              <Ionicons name="eye" size={18} color={colors.card} />
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* H12 FIX: Reactivate button for suspended merchants */}
        {item.status === 'suspended' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => handleReactivate(item._id)}
              disabled={processingMerchant === item._id}
            >
              {processingMerchant === item._id ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color={colors.card} />
                  <Text style={styles.actionButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color={colors.card} />
                  <Text style={styles.actionButtonText}>Reactivate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [
      colors,
      processingMerchant,
      liveMerchants,
      getStatusColor,
      handleApprove,
      handleViewDetails,
      handleSuspend,
      handleReactivate,
    ]
  );

  // Require admin role
  if (!hasRole(ADMIN_ROLES.ADMIN)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.icon} />
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: '700',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Access Denied
        </Text>
        <Text
          style={{ color: colors.icon, textAlign: 'center', paddingHorizontal: 32, marginTop: 8 }}
        >
          You need Admin privileges to manage Merchants.
        </Text>
      </View>
    );
  }

  if (isLoading && merchants.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderFilters()}

      {error && merchants.length === 0 && (
        <View
          style={{ padding: 16, backgroundColor: colors.errorLight, margin: 8, borderRadius: 8 }}
        >
          <Text style={{ color: colors.errorDeep, marginBottom: 8 }}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setIsLoading(true);
              loadData(1);
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text style={{ color: colors.errorDeep, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={merchants}
        renderItem={renderMerchantItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={{ padding: 16 }} color={colors.tint} />
          ) : !hasMore ? (
            <Text style={{ textAlign: 'center', padding: 16, color: colors.muted, fontSize: 13 }}>
              No more results
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No merchants found</Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Merchant</Text>
            <TextInput
              style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.icon}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedMerchant(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={handleReject}
              >
                <Text style={[styles.modalButtonText, { color: colors.card }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Suspend Modal */}
      <Modal visible={showSuspendModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.suspendModalHeader}>
              <Ionicons name="warning" size={24} color={colors.warningDark} />
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                Suspend Merchant
              </Text>
            </View>
            <TextInput
              style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter suspension reason..."
              placeholderTextColor={colors.icon}
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowSuspendModal(false);
                  setSuspendReason('');
                  setSuspendMerchantId(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.mutedDark }]}
                onPress={handleSuspendConfirm}
              >
                <Text style={[styles.modalButtonText, { color: colors.card }]}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Merchant Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.detailModalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                Create Merchant
              </Text>
              <TouchableOpacity onPress={resetCreateModal}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {createdTempPassword ? (
              /* Success state — show temp password */
              <View style={{ paddingTop: 8 }}>
                <View
                  style={[
                    styles.infoCard,
                    { backgroundColor: `${colors.success}15`, marginBottom: 16 },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.success}
                    style={{ alignSelf: 'center', marginBottom: 8 }}
                  />
                  <Text
                    style={{
                      color: colors.success,
                      fontWeight: '700',
                      textAlign: 'center',
                      marginBottom: 4,
                    }}
                  >
                    Merchant Created
                  </Text>
                  <Text
                    style={{
                      color: colors.icon,
                      textAlign: 'center',
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    Share this temporary password with the merchant. It will not be shown again.
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.icon, fontSize: 11, marginBottom: 4 }}>
                      TEMPORARY PASSWORD
                    </Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 18,
                        fontWeight: '700',
                        letterSpacing: 2,
                      }}
                      selectable
                    >
                      {createdTempPassword}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.tint, width: '100%' }]}
                  onPress={resetCreateModal}
                >
                  <Text style={[styles.modalButtonText, { color: colors.card }]}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Form state */
              <>
                <ScrollView
                  style={{ maxHeight: 400 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {(
                    [
                      { key: 'name', label: 'Owner Name', placeholder: 'e.g. Raj Sharma' },
                      { key: 'email', label: 'Email', placeholder: 'merchant@example.com' },
                      { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                      {
                        key: 'businessName',
                        label: 'Business Name',
                        placeholder: 'e.g. Sharma Sweets',
                      },
                      {
                        key: 'businessType',
                        label: 'Business Type (optional)',
                        placeholder: 'e.g. restaurant, retail',
                      },
                    ] as Array<{ key: keyof typeof createForm; label: string; placeholder: string }>
                  ).map(({ key, label, placeholder }) => (
                    <View key={key} style={{ marginBottom: 12 }}>
                      <Text style={{ color: colors.icon, fontSize: 12, marginBottom: 4 }}>
                        {label}
                      </Text>
                      <TextInput
                        style={[
                          styles.reasonInput,
                          {
                            color: colors.text,
                            borderColor: colors.border,
                            height: 44,
                            paddingVertical: 0,
                            textAlignVertical: 'center',
                          },
                        ]}
                        placeholder={placeholder}
                        placeholderTextColor={colors.icon}
                        value={createForm[key]}
                        onChangeText={(val) => setCreateForm((prev) => ({ ...prev, [key]: val }))}
                        autoCapitalize={key === 'email' ? 'none' : 'words'}
                        keyboardType={
                          key === 'email'
                            ? 'email-address'
                            : key === 'phone'
                              ? 'phone-pad'
                              : 'default'
                        }
                      />
                    </View>
                  ))}
                </ScrollView>

                <View style={[styles.modalButtons, { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                    onPress={resetCreateModal}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.tint }]}
                    onPress={handleCreateMerchant}
                    disabled={creatingMerchant}
                  >
                    {creatingMerchant ? (
                      <ActivityIndicator size="small" color={colors.card} />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: colors.card }]}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Merchant Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.detailModalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                Merchant Details
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {detailMerchant && (
              <ScrollView style={styles.detailModalBody} showsVerticalScrollIndicator={false}>
                {/* Merchant Info */}
                <View style={styles.detailSection}>
                  <View style={styles.detailMerchantHeader}>
                    <View style={[styles.detailAvatar, { backgroundColor: colors.errorLight }]}>
                      <Ionicons name="storefront" size={32} color={colors.tint} />
                    </View>
                    <View style={styles.detailMerchantInfo}>
                      <Text style={[styles.detailMerchantName, { color: colors.text }]}>
                        {detailMerchant.businessName}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${getStatusColor(detailMerchant.status)}20`,
                            alignSelf: 'flex-start',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(detailMerchant.status) },
                          ]}
                        >
                          {detailMerchant.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                    <View style={styles.infoRow}>
                      <Ionicons name="briefcase-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>
                          Business Type
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {detailMerchant.businessType}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Email</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {detailMerchant.email}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Phone</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {detailMerchant.phoneNumber}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Joined</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {safeFormatDate(detailMerchant.createdAt, 'MMMM d, yyyy')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="storefront-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Stores</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {detailMerchant.stores?.length || 0} stores
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Stores List */}
                {detailMerchant.stores && detailMerchant.stores.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Stores</Text>
                    {detailMerchant.stores.map((store, index) => {
                      const prog = storeProgramState[store._id];
                      const isProgram = prog?.isProgramMerchant ?? false;
                      const cashback = prog?.cashback ?? 0;
                      const waitMins = prog?.waitMins ?? 0;
                      const isToggling = togglingStore === store._id;
                      const isSavingWait = savingWaitStore === store._id;
                      return (
                        <View
                          key={store._id || index}
                          style={[
                            styles.storeItem,
                            {
                              backgroundColor: colors.background,
                              flexDirection: 'column',
                              alignItems: 'stretch',
                              gap: 10,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Ionicons name="storefront-outline" size={18} color={colors.tint} />
                            <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
                              <Text style={[styles.storeName, { color: colors.text }]}>
                                {store.name}
                              </Text>
                              <Text
                                style={[
                                  styles.storeStatus,
                                  { color: getStatusColor(store.status) },
                                ]}
                              >
                                {store.status}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleToggleStoreProgram(store._id)}
                              disabled={isToggling}
                              style={[
                                styles.programBadge,
                                {
                                  backgroundColor: isProgram
                                    ? `${colors.tint}20`
                                    : `${colors.icon}15`,
                                },
                              ]}
                            >
                              {isToggling ? (
                                <ActivityIndicator size="small" color={colors.tint} />
                              ) : (
                                <>
                                  <Ionicons
                                    name={isProgram ? 'star' : 'star-outline'}
                                    size={14}
                                    color={isProgram ? colors.tint : colors.icon}
                                  />
                                  <Text
                                    style={[
                                      styles.programBadgeText,
                                      { color: isProgram ? colors.tint : colors.icon },
                                    ]}
                                  >
                                    {isProgram ? `REZ Program · ${cashback}%` : 'Free Plan'}
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                          {/* Wait time row */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              paddingLeft: 28,
                            }}
                          >
                            <Ionicons name="time-outline" size={14} color={colors.icon} />
                            <Text style={{ fontSize: 12, color: colors.icon, flex: 1 }}>
                              Prep time (mins)
                            </Text>
                            <TextInput
                              style={{
                                width: 52,
                                height: 32,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.border,
                                textAlign: 'center',
                                fontSize: 13,
                                color: colors.text,
                                paddingHorizontal: 4,
                              }}
                              keyboardType="numeric"
                              maxLength={3}
                              value={waitMins > 0 ? String(waitMins) : ''}
                              placeholder="0"
                              placeholderTextColor={colors.icon}
                              onChangeText={(val) => {
                                const n = parseInt(val.replace(/\D/g, '')) || 0;
                                setStoreProgramState((prev) => ({
                                  ...prev,
                                  [store._id]: { ...prev[store._id], waitMins: n },
                                }));
                              }}
                            />
                            <TouchableOpacity
                              onPress={() => handleSaveWaitTime(store._id, waitMins)}
                              disabled={isSavingWait}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                backgroundColor: colors.tint,
                              }}
                            >
                              {isSavingWait ? (
                                <ActivityIndicator size="small" color={colors.card} />
                              ) : (
                                <Text
                                  style={{ fontSize: 11, fontWeight: '700', color: colors.card }}
                                >
                                  Save
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Bank Details */}
                {detailMerchant.bankDetails && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Details</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                      <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>
                            Account Holder
                          </Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>
                            {detailMerchant.bankDetails.accountHolderName}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="card-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>
                            Account Number
                          </Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>
                            {detailMerchant.bankDetails.accountNumber
                              ? '••••' + String(detailMerchant.bankDetails.accountNumber).slice(-4)
                              : '—'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="code-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>IFSC Code</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>
                            {detailMerchant.bankDetails.ifscCode}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>Verified</Text>
                          <Text
                            style={[
                              styles.infoValue,
                              {
                                color: detailMerchant.bankDetails.isVerified
                                  ? colors.success
                                  : colors.warning,
                              },
                            ]}
                          >
                            {detailMerchant.bankDetails.isVerified ? 'Yes' : 'No'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Wallet Section */}
                <View style={styles.detailSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Wallet</Text>
                  {loadingWallet ? (
                    <View style={styles.walletLoading}>
                      <ActivityIndicator size="small" color={colors.tint} />
                      <Text style={[styles.walletLoadingText, { color: colors.icon }]}>
                        Loading merchant wallet…
                      </Text>
                    </View>
                  ) : merchantWallet ? (
                    <View>
                      <View style={[styles.walletCard, { backgroundColor: colors.tint }]}>
                        <View style={styles.walletIcon}>
                          <Ionicons name="wallet" size={28} color={colors.card} />
                        </View>
                        <View style={styles.walletInfo}>
                          <Text style={styles.walletLabel}>Available Balance</Text>
                          <Text style={styles.walletBalance}>
                            {formatCurrency(merchantWallet.balance.available)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.walletStatsRow}>
                        <View
                          style={[styles.walletStatItem, { backgroundColor: colors.background }]}
                        >
                          <Text style={[styles.walletStatLabel, { color: colors.icon }]}>
                            Total
                          </Text>
                          <Text style={[styles.walletStatValue, { color: colors.text }]}>
                            {formatCurrency(merchantWallet.balance.total)}
                          </Text>
                        </View>
                        <View
                          style={[styles.walletStatItem, { backgroundColor: colors.background }]}
                        >
                          <Text style={[styles.walletStatLabel, { color: colors.icon }]}>
                            Pending
                          </Text>
                          <Text style={[styles.walletStatValue, { color: colors.warning }]}>
                            {formatCurrency(merchantWallet.balance.pending)}
                          </Text>
                        </View>
                        <View
                          style={[styles.walletStatItem, { backgroundColor: colors.background }]}
                        >
                          <Text style={[styles.walletStatLabel, { color: colors.icon }]}>
                            Withdrawn
                          </Text>
                          <Text style={[styles.walletStatValue, { color: colors.text }]}>
                            {formatCurrency(merchantWallet.balance.withdrawn)}
                          </Text>
                        </View>
                      </View>
                      {merchantWallet.statistics && (
                        <View
                          style={[
                            styles.infoCard,
                            { backgroundColor: colors.background, marginTop: 12 },
                          ]}
                        >
                          <View style={styles.infoRow}>
                            <Ionicons name="cart-outline" size={18} color={colors.icon} />
                            <View style={styles.infoContent}>
                              <Text style={[styles.infoLabel, { color: colors.icon }]}>
                                Total Orders
                              </Text>
                              <Text style={[styles.infoValue, { color: colors.text }]}>
                                {merchantWallet.statistics.totalOrders}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.infoRow}>
                            <Ionicons name="trending-up-outline" size={18} color={colors.icon} />
                            <View style={styles.infoContent}>
                              <Text style={[styles.infoLabel, { color: colors.icon }]}>
                                Total Sales
                              </Text>
                              <Text style={[styles.infoValue, { color: colors.text }]}>
                                {formatCurrency(merchantWallet.statistics.totalSales)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.infoRow}>
                            <Ionicons name="cash-outline" size={18} color={colors.icon} />
                            <View style={styles.infoContent}>
                              <Text style={[styles.infoLabel, { color: colors.icon }]}>
                                Net Sales
                              </Text>
                              <Text style={[styles.infoValue, { color: colors.success }]}>
                                {formatCurrency(merchantWallet.statistics.netSales)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  ) : walletError ? (
                    <View style={[styles.walletEmpty, { backgroundColor: colors.background }]}>
                      <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
                      <Text style={[styles.walletEmptyText, { color: colors.warning }]}>
                        {walletError}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.walletEmpty, { backgroundColor: colors.background }]}>
                      <Ionicons name="wallet-outline" size={24} color={colors.icon} />
                      <Text style={[styles.walletEmptyText, { color: colors.icon }]}>
                        No wallet data available
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
    fontSize: 15,
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  merchantCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
  },
  businessType: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  merchantDetails: {
    marginTop: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.light.modalOverlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
  },
  suspendModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: Colors.light.modalOverlay,
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailModalBody: {
    maxHeight: 450,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailMerchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailMerchantInfo: {
    flex: 1,
    marginLeft: 16,
  },
  detailMerchantName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  storeInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  storeStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  programBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  programBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  walletLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  walletLoadingText: {
    fontSize: 14,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
    marginLeft: 16,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 4,
  },
  walletBalance: {
    color: Colors.light.card,
    fontSize: 24,
    fontWeight: '700',
  },
  walletStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  walletStatItem: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  walletStatLabel: {
    fontSize: 12, // min readable
    marginBottom: 4,
  },
  walletStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  walletEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  walletEmptyText: {
    fontSize: 14,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontSize: 12, fontWeight: '800', color: '#15803D', letterSpacing: 0.5 }, // min readable
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

// ADM-004: Per-screen ErrorBoundary so a merchants crash is isolated from the root.
export default withErrorBoundary(MerchantsScreenInner, { name: 'MerchantsScreen' });
