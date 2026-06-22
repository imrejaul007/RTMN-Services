import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Switch,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// DateTimePicker is only available on native (iOS/Android). On web we use HTML <input> elements.
// We lazy-require it inside the Platform.OS !== 'web' branch to avoid breaking the web bundle.
type DateTimePickerEvent = { type: string; nativeEvent: { timestamp?: number } };
const DateTimePickerRaw: React.ComponentType<any> | null =
  Platform.OS !== 'web' ? require('@react-native-community/datetimepicker').default : null;
const DateTimePicker = DateTimePickerRaw as React.ComponentType<any>;
import * as ImagePicker from 'expo-image-picker';
import {
  campaignsService,
  uploadsService,
  Campaign,
  CampaignStats,
  CampaignDeal,
  StoreOption,
} from '../../services';
import { campaignStyles as s } from './styles/campaigns.styles';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { CampaignCard, CampaignStatsBar, CampaignFormModal, CampaignDealModal } from '../../components/campaigns';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { useCreateCampaign, useUpdateCampaign, useToggleCampaignStatus } from '@/hooks/queries/useCampaignMutations';


type TabType = 'all' | 'running' | 'upcoming' | 'expired' | 'inactive';
type CampaignType = Campaign['type'];

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'albums' },
  { key: 'running', label: 'Running', icon: 'play-circle' },
  { key: 'upcoming', label: 'Upcoming', icon: 'time' },
  { key: 'expired', label: 'Expired', icon: 'close-circle' },
  { key: 'inactive', label: 'Inactive', icon: 'pause-circle' },
];

const DEFAULT_GRADIENT_COLORS = ['#FF6B6B', '#FF8E53'];

export default function CampaignsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[(colorScheme ?? 'light') as keyof typeof Colors];
  const { hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const isLoadingMore = useRef(false);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<Partial<Campaign>>({});
  const [dealFormData, setDealFormData] = useState<CampaignDeal>({ image: '' });
  const [editingDealIndex, setEditingDealIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const toggleCampaignStatus = useToggleCampaignStatus();

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Store selection states
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  // Request permission for image picker
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        'Permission Required',
        'Please allow access to your photo library to upload images.'
      );
      return false;
    }
    return true;
  };

  // Pick and upload image
  const pickAndUploadImage = async (
    field: 'bannerImage' | 'icon' | 'dealImage',
    imageType: 'banner' | 'icon' | 'deal'
  ) => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: imageType === 'banner' ? [3, 1] : [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setIsUploading(true);
      setUploadingField(field);

      const uploadedImage = await uploadsService.uploadImage(
        result.assets[0].uri,
        imageType,
        'campaigns'
      );

      if (field === 'dealImage') {
        setDealFormData((p) => ({ ...p, image: uploadedImage.url }));
      } else {
        setFormData((p) => ({ ...p, [field]: uploadedImage.url }));
      }

      showAlert('Success', 'Image uploaded successfully');
    } catch (error: any) {
      logger.error('Upload error:', error);
      showAlert('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadingField(null);
    }
  };

  // Debounce search input to avoid API storms on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadStores = useCallback(async (search?: string) => {
    setStoresLoading(true);
    try {
      const storesData = await campaignsService.getStores(search, 100);
      setStores(storesData);
    } catch (error) {
      logger.error('Failed to load stores:', error);
      showAlert('Error', 'Failed to load stores. Please try again.');
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const loadData = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (append) {
        if (isLoadingMore.current) return;
        isLoadingMore.current = true;
      } else {
        setIsLoading(true);
      }
      setLoadError(null);
      try {
        const query: any = { page: pageNum, limit: 20 };

        if (debouncedSearch) query.search = debouncedSearch;
        if (activeTab === 'running') query.running = true;
        if (activeTab === 'upcoming') query.upcoming = true;
        if (activeTab === 'expired') query.expired = true;
        if (activeTab === 'inactive') query.status = 'inactive';

        const data = await campaignsService.getCampaigns(query);

        if (append) {
          setCampaigns((prev) => [...prev, ...data.campaigns]);
        } else {
          setCampaigns(data.campaigns);
        }

        setHasMore(data.pagination.hasNext);
        setPage(pageNum);
      } catch (error: any) {
        logger.error('Failed to load campaigns:', error);
        if (!append) setLoadError(error.message || 'Failed to load campaigns');
      } finally {
        setIsLoading(false);
        isLoadingMore.current = false;
      }
    },
    [activeTab, debouncedSearch]
  );

  const loadStats = useCallback(async () => {
    try {
      const data = await campaignsService.getStats();
      setStats(data);
    } catch (error) {
      logger.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadStats();
    loadStores();
  }, [loadData, loadStats, loadStores]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(1), loadStats()]);
    setRefreshing(false);
  }, [loadData, loadStats]);

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore.current && hasMore) {
      loadData(page + 1, true);
    }
  }, [isLoading, hasMore, page, loadData]);

  const handleCreateNew = () => {
    setEditingCampaign(null);
    setFormData({
      campaignId: '',
      title: '',
      subtitle: '',
      description: '',
      badge: '',
      badgeBg: colors.card,
      badgeColor: colors.navyDark,
      gradientColors: DEFAULT_GRADIENT_COLORS,
      type: 'general',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      priority: 50,
      region: 'all',
      deals: [],
    });
    setShowFormModal(true);
  };

  const handleEdit = useCallback((campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({ ...campaign });
    setShowFormModal(true);
  }, []);

  const handleSave = async () => {
    if (!formData.title || !formData.subtitle || !formData.badge) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.campaignId && !editingCampaign) {
      showAlert('Error', 'Campaign ID is required');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      showAlert('Error', 'Please set both start and end dates');
      return;
    }

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);
    if (endDate <= startDate) {
      showAlert('Error', 'End date must be after start date');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCampaign) {
        await updateCampaign.mutateAsync({ id: editingCampaign._id, data: formData });
        showAlert('Success', 'Campaign updated successfully');
      } else {
        await createCampaign.mutateAsync(formData);
        showAlert('Success', 'Campaign created successfully');
      }
      setShowFormModal(false);
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = useCallback(
    (campaign: Campaign) => {
      showConfirm(
        'Delete Campaign',
        `Are you sure you want to delete "${campaign.title}"?`,
        async () => {
          try {
            await campaignsService.deleteCampaign(campaign._id);
            showAlert('Success', 'Campaign deleted');
            await loadData(1);
            await loadStats();
          } catch (error: any) {
            showAlert('Error', error.message);
          }
        },
        'Delete'
      );
    },
    [loadData, loadStats]
  );

  const handleToggle = useCallback(
    async (campaign: Campaign) => {
      try {
        await toggleCampaignStatus.mutateAsync({ id: campaign._id });
        await loadData(1);
        await loadStats();
      } catch (error: any) {
        showAlert('Error', error.message);
      }
    },
    [loadData, loadStats]
  );

  const handleDuplicate = useCallback(
    async (campaign: Campaign) => {
      try {
        await campaignsService.duplicateCampaign(campaign._id);
        showAlert('Success', 'Campaign duplicated');
        await loadData(1);
        await loadStats();
      } catch (error: any) {
        showAlert('Error', error.message);
      }
    },
    [loadData, loadStats]
  );

  const handleAddDeal = () => {
    if (!editingCampaign) return;
    setEditingDealIndex(null);
    setDealFormData({
      image: '',
      store: '',
      cashback: '',
      coins: '',
      discount: '',
      bonus: '',
      drop: '',
      endsIn: '',
    });
    setShowDealModal(true);
  };

  const handleEditDeal = (deal: CampaignDeal, index: number) => {
    setEditingDealIndex(index);
    setDealFormData({ ...deal });
    setShowDealModal(true);
  };

  const handleSaveDeal = async () => {
    if (!dealFormData.image) {
      showAlert('Error', 'Deal image URL is required');
      return;
    }

    // Validate cashback does not exceed 15% — this is a stricter UI-only safety margin.
    // The backend rewardConfig.ts enforces a technical ceiling of 20% (merchantMaxRate = 0.20).
    // The admin UI caps at 15% as an extra guardrail; direct API calls can use up to 20%.
    if (dealFormData.cashback) {
      const cashbackMatch = dealFormData.cashback.match(/(\d+(?:\.\d+)?)/);
      if (cashbackMatch && parseFloat(cashbackMatch[1]) > 15) {
        showAlert('Error', 'Cashback cannot exceed 15% (platform ceiling — backend allows up to 20%)');
        return;
      }
    }

    if (!editingCampaign) return;

    setIsSaving(true);
    try {
      if (editingDealIndex !== null) {
        // Update existing deal - we need to update the whole deals array
        const updatedDeals = [...(formData.deals || [])];
        updatedDeals[editingDealIndex] = dealFormData;
        await updateCampaign.mutateAsync({ id: editingCampaign._id, data: { deals: updatedDeals } });
        showAlert('Success', 'Deal updated');
      } else {
        // Add new deal
        await campaignsService.addDeal(editingCampaign._id, dealFormData);
        showAlert('Success', 'Deal added');
      }
      const updated = await campaignsService.getCampaignById(editingCampaign._id);
      setEditingCampaign(updated);
      setFormData({ ...updated });
      setShowDealModal(false);
      setEditingDealIndex(null);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveDeal = async (dealIndex: number) => {
    if (!editingCampaign) return;

    showConfirm('Remove Deal', 'Are you sure?', async () => {
      try {
        await campaignsService.removeDeal(editingCampaign._id, dealIndex);
        const updated = await campaignsService.getCampaignById(editingCampaign._id);
        setEditingCampaign(updated);
        setFormData({ ...updated });
      } catch (error: any) {
        showAlert('Error', error.message);
      }
    });
  };

  // Date picker handlers
  const handleStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const currentDate = formData.startTime ? new Date(formData.startTime) : new Date();
      selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
      setFormData((p) => ({ ...p, startTime: selectedDate.toISOString() }));
    }
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (event.type === 'set' && selectedTime) {
      const currentDate = formData.startTime ? new Date(formData.startTime) : new Date();
      currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setFormData((p) => ({ ...p, startTime: currentDate.toISOString() }));
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const currentDate = formData.endTime ? new Date(formData.endTime) : new Date();
      selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
      setFormData((p) => ({ ...p, endTime: selectedDate.toISOString() }));
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (event.type === 'set' && selectedTime) {
      const currentDate = formData.endTime ? new Date(formData.endTime) : new Date();
      currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setFormData((p) => ({ ...p, endTime: currentDate.toISOString() }));
    }
  };

  const renderHeader = () => (
    <View style={s.header}>
      <View>
        <Text style={[s.headerTitle, { color: colors.text }]}>Campaigns</Text>
        <Text style={[s.headerSubtitle, { color: colors.icon }]}>
          Manage promotional campaigns
        </Text>
      </View>
      <TouchableOpacity
        style={[s.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={20} color={colors.card} />
        <Text style={s.createBtnText}>New</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsCard = () => <CampaignStatsBar stats={stats} colors={colors} />;

  const renderSearchAndFilter = () => (
    <View style={s.searchFilterContainer}>
      <View style={[s.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search campaigns..."
          placeholderTextColor={colors.icon}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={s.tabsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsContent}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabItem, { backgroundColor: isActive ? colors.tint : colors.card }]}
              onPress={() => {
                setActiveTab(tab.key);
                setIsLoading(true);
              }}
            >
              <Ionicons
                name={tab.icon as unknown as keyof typeof Ionicons.glyphMap}
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

  const renderCampaignItem = useCallback(
    ({ item }: { item: Campaign }) => (
      <CampaignCard
        item={item}
        colors={colors}
        onEdit={handleEdit}
        onToggle={handleToggle}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    ),
    [colors, handleEdit, handleToggle, handleDuplicate, handleDelete]
  );

  // Campaign modals extracted to components/campaigns/

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderStatsCard()}
      {renderSearchAndFilter()}
      {renderTabs()}

      <FlatList
        data={campaigns}
        keyExtractor={(item: Campaign) => item._id}
        renderItem={renderCampaignItem}
        ListHeaderComponent={<View />}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={() => {
          if (hasMore && !isLoadingMore.current) loadMore();
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyContainer}>
              {loadError ? (
                <>
                  <Ionicons name="alert-circle-outline" size={56} color={colors.icon} />
                  <Text style={[s.emptyText, { color: colors.icon }]}>{loadError}</Text>
                  <TouchableOpacity
                    style={[s.retryBtn, { backgroundColor: colors.tint }]}
                    onPress={() => loadData(1)}
                  >
                    <Ionicons name="refresh" size={16} color={colors.card} />
                    <Text style={{ color: colors.card, fontWeight: '600', marginLeft: 6 }}>Retry</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="megaphone-outline" size={56} color={colors.icon} />
                  <Text style={[s.emptyTitle, { color: colors.text }]}>No campaigns</Text>
                  <Text style={[s.emptyText, { color: colors.icon }]}>
                    Create your first campaign to get started
                  </Text>
                </>
              )}
            </View>
          ) : null
        }
      />

      {showFormModal && (
        <CampaignFormModal
          visible={showFormModal}
          editingCampaign={editingCampaign}
          formData={formData}
          onFormDataChange={setFormData}
          showStartDatePicker={showStartDatePicker}
          setShowStartDatePicker={setShowStartDatePicker}
          showStartTimePicker={showStartTimePicker}
          setShowStartTimePicker={setShowStartTimePicker}
          showEndDatePicker={showEndDatePicker}
          setShowEndDatePicker={setShowEndDatePicker}
          showEndTimePicker={showEndTimePicker}
          setShowEndTimePicker={setShowEndTimePicker}
          isUploading={isUploading}
          uploadingField={uploadingField}
          isSaving={isSaving}
          colors={colors}
          onPickAndUploadImage={pickAndUploadImage}
          onSave={handleSave}
          onClose={() => setShowFormModal(false)}
          onAddDeal={handleAddDeal}
          onEditDeal={handleEditDeal}
          onRemoveDeal={(index: number) => handleRemoveDeal(index)}
          handleStartDateChange={handleStartDateChange}
          handleStartTimeChange={handleStartTimeChange}
          handleEndDateChange={handleEndDateChange}
          handleEndTimeChange={handleEndTimeChange}
        />
      )}
      {showDealModal && (
        <CampaignDealModal
          visible={showDealModal}
          dealFormData={dealFormData}
          editingDealIndex={editingDealIndex}
          stores={stores}
          colors={colors}
          isUploading={isUploading}
          uploadingField={uploadingField}
          isSaving={isSaving}
          onDealFormDataChange={setDealFormData}
          onPickAndUploadImage={pickAndUploadImage}
          onSave={handleSaveDeal}
          onClose={() => setShowDealModal(false)}
          onSelectStore={() => setShowStoreSelector(true)}
        />
      )}
      {showStoreSelector && (() => {
        const filtered = stores.filter((s) => s.name.toLowerCase().includes(storeSearchQuery.toLowerCase()));
        return (
          <Modal visible={showStoreSelector} transparent animationType="fade">
            <View style={s.storeSelectorOverlay}>
              <View style={[s.storeSelectorContent, { backgroundColor: colors.card }]}>
                <View style={s.storeSelectorHeader}>
                  <Text style={[s.storeSelectorTitle, { color: colors.text }]}>Select Store</Text>
                  <TouchableOpacity onPress={() => setShowStoreSelector(false)}>
                    <Ionicons name="close" size={24} color={colors.icon} />
                  </TouchableOpacity>
                </View>
                <View style={[s.storeSearchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="search" size={18} color={colors.icon} />
                  <TextInput
                    style={[s.storeSearchInput, { color: colors.text }]}
                    value={storeSearchQuery}
                    onChangeText={setStoreSearchQuery}
                    placeholder="Search stores..."
                    placeholderTextColor={colors.icon}
                  />
                  {storeSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setStoreSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={colors.icon} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView style={s.storeList} showsVerticalScrollIndicator={false}>
                  {storesLoading ? (
                    <View style={s.storesLoadingContainer}>
                      <ActivityIndicator size="large" color={colors.tint} />
                    </View>
                  ) : filtered.length === 0 ? (
                    <View style={s.noStoresContainer}>
                      <Ionicons name="storefront-outline" size={48} color={colors.icon} />
                      <Text style={[s.noStoresText, { color: colors.icon }]}>No stores found</Text>
                    </View>
                  ) : (
                    filtered.map((store) => (
                      <TouchableOpacity
                        key={store._id}
                        style={[s.storeListItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setDealFormData((p) => ({ ...p, storeId: store._id, storeName: store.name }));
                          setShowStoreSelector(false);
                        }}
                      >
                        {store.logo ? (
                          <Image source={{ uri: store.logo }} style={s.storeListItemImage} />
                        ) : (
                          <View style={[s.storeListItemImagePlaceholder, { backgroundColor: colors.backgroundTertiary }]}>
                            <Ionicons name="storefront" size={20} color={colors.icon} />
                          </View>
                        )}
                        <View style={s.storeListItemInfo}>
                          <Text style={[s.storeListItemName, { color: colors.text }]} numberOfLines={1}>
                            {store.name}
                          </Text>
                          {store.category && (
                            <Text style={[s.storeListItemCategory, { color: colors.icon }]}>{store.category}</Text>
                          )}
                        </View>
                        {dealFormData.storeId === store._id && (
                          <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        );
      })()}
    </SafeAreaView>
  );

}

