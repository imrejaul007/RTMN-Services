import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import {
  mallService,
  MallCategory,
  MallOffer,
  MallStats,
  AllianceStore,
  ManagedMallStore,
  MallBanner,
  MallCollection,
  MallListingRequest,
} from '../../services/api/mall';
import { showAlert, showConfirm } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { DashboardTab } from '../../components/mall-admin/tabs/DashboardTab';
import { ListingRequestsTab } from '../../components/mall-admin/tabs/ListingRequestsTab';
import { CategoriesTab } from '../../components/mall-admin/tabs/CategoriesTab';
import { OffersTab } from '../../components/mall-admin/tabs/OffersTab';
import { BannersTab } from '../../components/mall-admin/tabs/BannersTab';
import { CollectionsTab } from '../../components/mall-admin/tabs/CollectionsTab';
import { AllianceTab } from '../../components/mall-admin/tabs/AllianceTab';
import { StoresTab } from '../../components/mall-admin/tabs/StoresTab';
import { MallModals } from '../../components/mall-admin/tabs/MallModals';
import { MallTabBar } from '../../components/mall-admin/tabs/MallTabBar';
import { s } from './styles/mall.styles';

export type MallTabType = 'dashboard' | 'stores' | 'listing-requests' | 'categories' | 'offers' | 'banners' | 'collections' | 'alliance';

export default function MallScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<MallTabType>('dashboard');

  // Dashboard
  const [stats, setStats] = useState<MallStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Categories
  const [categories, setCategories] = useState<MallCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [processingCategory, setProcessingCategory] = useState<string | null>(null);

  // Offers
  const [offers, setOffers] = useState<MallOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [processingOffer, setProcessingOffer] = useState<string | null>(null);

  // Alliance
  const [allianceStores, setAllianceStores] = useState<AllianceStore[]>([]);
  const [allianceSearch, setAllianceSearch] = useState('');
  const [allianceLoading, setAllianceLoading] = useState(false);
  const [processingAlliance, setProcessingAlliance] = useState<string | null>(null);

  // Stores
  const [managedStores, setManagedStores] = useState<ManagedMallStore[]>([]);
  const [managedStoresSearch, setManagedStoresSearch] = useState('');
  const [managedStoresFilter, setManagedStoresFilter] = useState<'all' | 'mall' | 'non-mall'>('all');
  const [managedStoresLoading, setManagedStoresLoading] = useState(false);
  const [processingManagedStore, setProcessingManagedStore] = useState<string | null>(null);

  // Banners
  const [banners, setBanners] = useState<MallBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [processingBanner, setProcessingBanner] = useState<string | null>(null);

  // Collections
  const [collections, setCollections] = useState<MallCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [processingCollection, setProcessingCollection] = useState<string | null>(null);

  // Listing Requests
  const [listingRequests, setListingRequests] = useState<MallListingRequest[]>([]);
  const [listingRequestsLoading, setListingRequestsLoading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [listingRequestsFilter, setListingRequestsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MallCategory | null>(null);
  const [editingOffer, setEditingOffer] = useState<MallOffer | null>(null);
  const [editingBanner, setEditingBanner] = useState<MallBanner | null>(null);
  const [editingCollection, setEditingCollection] = useState<MallCollection | null>(null);

  // Forms
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '', icon: '', image: '', color: colors.navy, backgroundColor: '', maxCashback: '', sortOrder: '', isActive: true, isFeatured: false });
  const [offerForm, setOfferForm] = useState({ title: '', subtitle: '', description: '', image: '', store: '', brand: '', offerType: 'cashback' as string, value: '', valueType: 'percentage' as string, minPurchase: '', maxDiscount: '', validFrom: '', validUntil: '', badge: '', isActive: true, isMallExclusive: false });
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', image: '', backgroundColor: colors.emerald, textColor: colors.card, ctaText: 'Shop Now', ctaAction: 'navigate' as string, ctaUrl: '', ctaBrand: '', ctaCategory: '', ctaCollection: '', position: 'hero' as string, priority: '0', validFrom: '', validUntil: '', isActive: true, badge: '' });
  const [collectionForm, setCollectionForm] = useState({ name: '', slug: '', description: '', image: '', type: 'curated' as string, sortOrder: '0', validFrom: '', validUntil: '', isActive: true });

  useEffect(() => { loadStats(); }, []);
  useEffect(() => {
    if (activeTab === 'categories') loadCategories();
    else if (activeTab === 'offers') loadOffers();
    else if (activeTab === 'alliance') loadAllianceStores();
    else if (activeTab === 'stores') loadManagedStores();
    else if (activeTab === 'banners') loadBanners();
    else if (activeTab === 'collections') loadCollections();
    else if (activeTab === 'listing-requests') loadListingRequests();
  }, [activeTab, managedStoresFilter, listingRequestsFilter]);

  // ==================== LOADERS ====================

  const loadStats = async () => { try { setStatsLoading(true); setStats(await mallService.getStats()); } catch (error: any) { logger.error('Failed to load mall stats:', error); } finally { setStatsLoading(false); } };
  const loadCategories = async () => { try { setCategoriesLoading(true); setCategories(await mallService.getCategories()); } catch (error: any) { logger.error('Failed to load categories:', error); showAlert('Error', 'Failed to load categories'); } finally { setCategoriesLoading(false); } };
  const loadOffers = async () => { try { setOffersLoading(true); const result = await mallService.getOffers({ limit: 50 }); setOffers(result.offers); } catch (error: any) { logger.error('Failed to load offers:', error); showAlert('Error', 'Failed to load offers'); } finally { setOffersLoading(false); } };
  const loadAllianceStores = async (search?: string) => { try { setAllianceLoading(true); setAllianceStores(await mallService.getAllianceStores(search || allianceSearch || undefined)); } catch (error: any) { logger.error('Failed to load alliance stores:', error); showAlert('Error', 'Failed to load alliance stores'); } finally { setAllianceLoading(false); } };
  const loadBanners = async () => { try { setBannersLoading(true); setBanners(await mallService.getBanners()); } catch (error: any) { logger.error('Failed to load banners:', error); showAlert('Error', 'Failed to load banners'); } finally { setBannersLoading(false); } };
  const loadCollections = async () => { try { setCollectionsLoading(true); setCollections(await mallService.getCollections()); } catch (error: any) { logger.error('Failed to load collections:', error); showAlert('Error', 'Failed to load collections'); } finally { setCollectionsLoading(false); } };
  const loadManagedStores = async (search?: string) => { try { setManagedStoresLoading(true); setManagedStores(await mallService.getManagedMallStores({ search: search || managedStoresSearch || undefined, filter: managedStoresFilter !== 'all' ? managedStoresFilter : undefined })); } catch (error: any) { logger.error('Failed to load managed stores:', error); showAlert('Error', 'Failed to load stores'); } finally { setManagedStoresLoading(false); } };
  const loadListingRequests = async () => { try { setListingRequestsLoading(true); const result = await mallService.getListingRequests({ status: listingRequestsFilter === 'all' ? undefined : listingRequestsFilter, limit: 50 }); setListingRequests(result.requests); } catch (error: any) { logger.error('Failed to load listing requests:', error); showAlert('Error', 'Failed to load listing requests'); } finally { setListingRequestsLoading(false); } };

  // ==================== CATEGORY ACTIONS ====================

  const openCategoryForm = (category?: MallCategory) => {
    if (category) { setEditingCategory(category); setCategoryForm({ name: category.name, slug: category.slug, description: category.description || '', icon: category.icon, image: category.image || '', color: category.color || colors.navy, backgroundColor: (category as unknown as {backgroundColor?: string}).backgroundColor || '', maxCashback: category.maxCashback?.toString() || '0', sortOrder: category.sortOrder?.toString() || '0', isActive: category.isActive, isFeatured: category.isFeatured || false }); }
    else { setEditingCategory(null); setCategoryForm({ name: '', slug: '', description: '', icon: '', image: '', color: colors.navy, backgroundColor: '', maxCashback: '0', sortOrder: '0', isActive: true, isFeatured: false }); }
    setShowCategoryModal(true);
  };
  const saveCategory = async () => { if (!categoryForm.name.trim()) { showAlert('Error', 'Category name is required'); return; } try { const data: any = { name: categoryForm.name.trim(), slug: categoryForm.slug.trim() || categoryForm.name.toLowerCase().replace(/\s+/g, '-'), description: categoryForm.description.trim() || undefined, icon: categoryForm.icon.trim(), image: categoryForm.image.trim() || undefined, color: categoryForm.color.trim(), backgroundColor: categoryForm.backgroundColor.trim() || undefined, maxCashback: parseFloat(categoryForm.maxCashback) || 0, sortOrder: parseInt(categoryForm.sortOrder) || 0, isActive: categoryForm.isActive, isFeatured: categoryForm.isFeatured }; if (editingCategory) { await mallService.updateCategory(editingCategory._id, data); showAlert('Success', 'Category updated'); } else { await mallService.createCategory(data); showAlert('Success', 'Category created'); } setShowCategoryModal(false); loadCategories(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to save category'); } };
  const deleteCategory = (category: MallCategory) => { showConfirm('Delete Category', `Delete "${category.name}"?`, async () => { try { setProcessingCategory(category._id); await mallService.deleteCategory(category._id); showAlert('Success', 'Category deleted'); loadCategories(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to delete category'); } finally { setProcessingCategory(null); } }, 'Delete'); };

  // ==================== OFFER ACTIONS ====================

  const openOfferForm = (offer?: MallOffer) => {
    if (offer) { setEditingOffer(offer); const brandId = typeof offer.brand === 'object' ? offer.brand?._id : offer.brand; setOfferForm({ title: offer.title, subtitle: offer.subtitle || '', description: offer.description || '', image: offer.image || '', store: offer.store || '', brand: brandId || '', offerType: offer.offerType, value: offer.value?.toString() || '0', valueType: offer.valueType, minPurchase: (offer as unknown as {minPurchase?: string}).minPurchase?.toString() || '', maxDiscount: (offer as unknown as {maxDiscount?: string}).maxDiscount?.toString() || '', validFrom: offer.validFrom?.split('T')[0] || '', validUntil: offer.validUntil?.split('T')[0] || '', badge: offer.badge || '', isActive: offer.isActive, isMallExclusive: offer.isMallExclusive }); }
    else { setEditingOffer(null); const today = new Date().toISOString().split('T')[0]; const oneMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; setOfferForm({ title: '', subtitle: '', description: '', image: '', store: '', brand: '', offerType: 'cashback', value: '0', valueType: 'percentage', minPurchase: '', maxDiscount: '', validFrom: today, validUntil: oneMonth, badge: '', isActive: true, isMallExclusive: false }); }
    setShowOfferModal(true);
  };
  const saveOffer = async () => { if (!offerForm.title.trim()) { showAlert('Error', 'Offer title is required'); return; } if (!offerForm.store.trim() && !offerForm.brand.trim()) { showAlert('Error', 'Either Store ID or Brand ID is required'); return; } if (offerForm.store.trim() && offerForm.brand.trim()) { showAlert('Error', 'Offer must be linked to a Store OR Brand, not both'); return; } try { const data: any = { title: offerForm.title.trim(), subtitle: offerForm.subtitle.trim() || undefined, description: offerForm.description.trim() || undefined, image: offerForm.image.trim() || undefined, store: offerForm.store.trim() || undefined, brand: offerForm.brand.trim() || undefined, offerType: offerForm.offerType, value: parseFloat(offerForm.value) || 0, valueType: offerForm.valueType, minPurchase: offerForm.minPurchase ? parseFloat(offerForm.minPurchase) : undefined, maxDiscount: offerForm.maxDiscount ? parseFloat(offerForm.maxDiscount) : undefined, validFrom: offerForm.validFrom || new Date().toISOString(), validUntil: offerForm.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), badge: offerForm.badge || undefined, isActive: offerForm.isActive, isMallExclusive: offerForm.isMallExclusive }; if (editingOffer) { await mallService.updateOffer(editingOffer._id, data); showAlert('Success', 'Offer updated'); } else { await mallService.createOffer(data); showAlert('Success', 'Offer created'); } setShowOfferModal(false); loadOffers(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to save offer'); } };
  const deleteOffer = (offer: MallOffer) => { showConfirm('Delete Offer', `Delete "${offer.title}"?`, async () => { try { setProcessingOffer(offer._id); await mallService.deleteOffer(offer._id); showAlert('Success', 'Offer deleted'); loadOffers(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to delete offer'); } finally { setProcessingOffer(null); } }, 'Delete'); };
  const toggleOfferActive = async (offer: MallOffer) => { try { setProcessingOffer(offer._id); await mallService.updateOffer(offer._id, { isActive: !offer.isActive }); loadOffers(); } catch (error: any) { showAlert('Error', 'Failed to update offer'); } finally { setProcessingOffer(null); } };

  // ==================== BANNER ACTIONS ====================

  const openBannerForm = (banner?: MallBanner) => {
    if (banner) { setEditingBanner(banner); setBannerForm({ title: banner.title, subtitle: banner.subtitle || '', image: banner.image || '', backgroundColor: banner.backgroundColor || colors.emerald, textColor: banner.textColor || colors.card, ctaText: banner.ctaText || 'Shop Now', ctaAction: banner.ctaAction || 'navigate', ctaUrl: banner.ctaUrl || '', ctaBrand: (typeof banner.ctaBrand === 'object' ? banner.ctaBrand?._id : banner.ctaBrand) || '', ctaCategory: (typeof banner.ctaCategory === 'object' ? banner.ctaCategory?._id : banner.ctaCategory) || '', ctaCollection: (typeof banner.ctaCollection === 'object' ? banner.ctaCollection?._id : banner.ctaCollection) || '', position: banner.position || 'hero', priority: banner.priority?.toString() || '0', validFrom: banner.validFrom?.split('T')[0] || '', validUntil: banner.validUntil?.split('T')[0] || '', isActive: banner.isActive, badge: banner.badge || '' }); }
    else { setEditingBanner(null); const today = new Date().toISOString().split('T')[0]; const sixMonths = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; setBannerForm({ title: '', subtitle: '', image: '', backgroundColor: colors.emerald, textColor: colors.card, ctaText: 'Shop Now', ctaAction: 'navigate', ctaUrl: '', ctaBrand: '', ctaCategory: '', ctaCollection: '', position: 'hero', priority: '0', validFrom: today, validUntil: sixMonths, isActive: true, badge: '' }); }
    setShowBannerModal(true);
  };
  const saveBanner = async () => { if (!bannerForm.title.trim()) { showAlert('Error', 'Banner title is required'); return; } if (!bannerForm.image.trim()) { showAlert('Error', 'Banner image URL is required'); return; } try { const data: any = { title: bannerForm.title.trim(), subtitle: bannerForm.subtitle.trim() || undefined, image: bannerForm.image.trim(), backgroundColor: bannerForm.backgroundColor.trim(), textColor: bannerForm.textColor.trim(), ctaText: bannerForm.ctaText.trim(), ctaAction: bannerForm.ctaAction, ctaUrl: bannerForm.ctaUrl.trim() || undefined, ctaBrand: bannerForm.ctaBrand.trim() || undefined, ctaCategory: bannerForm.ctaCategory.trim() || undefined, ctaCollection: bannerForm.ctaCollection.trim() || undefined, position: bannerForm.position, priority: parseInt(bannerForm.priority) || 0, validFrom: bannerForm.validFrom || new Date().toISOString(), validUntil: bannerForm.validUntil || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), isActive: bannerForm.isActive, badge: bannerForm.badge.trim() || undefined }; if (editingBanner) { await mallService.updateBanner(editingBanner._id, data); showAlert('Success', 'Banner updated'); } else { await mallService.createBanner(data); showAlert('Success', 'Banner created'); } setShowBannerModal(false); loadBanners(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to save banner'); } };
  const deleteBanner = (banner: MallBanner) => { showConfirm('Delete Banner', `Delete "${banner.title}"?`, async () => { try { setProcessingBanner(banner._id); await mallService.deleteBanner(banner._id); showAlert('Success', 'Banner deleted'); loadBanners(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to delete banner'); } finally { setProcessingBanner(null); } }, 'Delete'); };
  const toggleBannerActive = async (banner: MallBanner) => { try { setProcessingBanner(banner._id); await mallService.updateBanner(banner._id, { isActive: !banner.isActive }); loadBanners(); } catch (error: any) { showAlert('Error', 'Failed to update banner'); } finally { setProcessingBanner(null); } };

  // ==================== COLLECTION ACTIONS ====================

  const openCollectionForm = (collection?: MallCollection) => {
    if (collection) { setEditingCollection(collection); setCollectionForm({ name: collection.name, slug: collection.slug || '', description: collection.description || '', image: collection.image || '', type: collection.type || 'curated', sortOrder: collection.sortOrder?.toString() || '0', validFrom: collection.validFrom?.split('T')[0] || '', validUntil: collection.validUntil?.split('T')[0] || '', isActive: collection.isActive }); }
    else { setEditingCollection(null); setCollectionForm({ name: '', slug: '', description: '', image: '', type: 'curated', sortOrder: '0', validFrom: '', validUntil: '', isActive: true }); }
    setShowCollectionModal(true);
  };
  const saveCollection = async () => { if (!collectionForm.name.trim()) { showAlert('Error', 'Collection name is required'); return; } if (!collectionForm.image.trim()) { showAlert('Error', 'Collection image URL is required'); return; } try { const data: any = { name: collectionForm.name.trim(), slug: collectionForm.slug.trim() || collectionForm.name.toLowerCase().replace(/\s+/g, '-'), description: collectionForm.description.trim() || undefined, image: collectionForm.image.trim(), type: collectionForm.type, sortOrder: parseInt(collectionForm.sortOrder) || 0, validFrom: collectionForm.validFrom || undefined, validUntil: collectionForm.validUntil || undefined, isActive: collectionForm.isActive }; if (editingCollection) { await mallService.updateCollection(editingCollection._id, data); showAlert('Success', 'Collection updated'); } else { await mallService.createCollection(data); showAlert('Success', 'Collection created'); } setShowCollectionModal(false); loadCollections(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to save collection'); } };
  const deleteCollection = (collection: MallCollection) => { showConfirm('Delete Collection', `Delete "${collection.name}"?`, async () => { try { setProcessingCollection(collection._id); await mallService.deleteCollection(collection._id); showAlert('Success', 'Collection deleted'); loadCollections(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to delete collection'); } finally { setProcessingCollection(null); } }, 'Delete'); };
  const toggleCollectionActive = async (collection: MallCollection) => { try { setProcessingCollection(collection._id); await mallService.updateCollection(collection._id, { isActive: !collection.isActive }); loadCollections(); } catch (error: any) { showAlert('Error', 'Failed to update collection'); } finally { setProcessingCollection(null); } };

  // ==================== STORE ACTIONS ====================

  const toggleStoreMall = async (store: ManagedMallStore) => { try { setProcessingManagedStore(store._id); await mallService.toggleStoreMall(store._id, !store.deliveryCategories?.mall); loadManagedStores(); loadStats(); } catch (error: any) { showAlert('Error', error.message || 'Failed to toggle mall status'); } finally { setProcessingManagedStore(null); } };
  const toggleStoreFeatured = async (store: ManagedMallStore) => { if (!store.deliveryCategories?.mall) { showAlert('Info', 'Store must be added to mall first'); return; } try { setProcessingManagedStore(store._id); await mallService.updateStoreMallProperties(store._id, { isFeatured: !store.isFeatured }); loadManagedStores(); } catch (error: any) { showAlert('Error', error.message || 'Failed to update store'); } finally { setProcessingManagedStore(null); } };
  const toggleStorePremium = async (store: ManagedMallStore) => { if (!store.deliveryCategories?.mall) { showAlert('Info', 'Store must be added to mall first'); return; } try { setProcessingManagedStore(store._id); await mallService.updateStoreMallProperties(store._id, { premium: !store.deliveryCategories?.premium }); loadManagedStores(); } catch (error: any) { showAlert('Error', error.message || 'Failed to update store'); } finally { setProcessingManagedStore(null); } };

  // ==================== ALLIANCE ACTIONS ====================

  const toggleAlliance = async (store: AllianceStore) => { try { setProcessingAlliance(store._id); await mallService.toggleStoreAlliance(store._id, !store.deliveryCategories?.alliance); loadAllianceStores(); } catch (error: any) { showAlert('Error', error.message || 'Failed to toggle alliance'); } finally { setProcessingAlliance(null); } };

  // ==================== LISTING REQUEST ACTIONS ====================

  const handleApproveRequest = async (requestId: string) => { const confirmed = await showConfirm('Approve Request', 'This will enable Mall listing for this store. Continue?'); if (!confirmed) return; try { setProcessingRequest(requestId); await mallService.approveListingRequest(requestId); showAlert('Success', 'Request approved'); loadListingRequests(); } catch (error: any) { showAlert('Error', error.message || 'Failed to approve'); } finally { setProcessingRequest(null); } };
  const handleRejectRequest = async (requestId: string) => { const confirmed = await showConfirm('Reject Request', 'Reject this mall listing request?'); if (!confirmed) return; try { setProcessingRequest(requestId); await mallService.rejectListingRequest(requestId, 'Rejected by admin'); showAlert('Success', 'Request rejected'); loadListingRequests(); } catch (error: any) { showAlert('Error', error.message || 'Failed to reject'); } finally { setProcessingRequest(null); } };

  // ==================== MAIN RENDER ====================

  if (!hasRole(ADMIN_ROLES.SUPER_ADMIN)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.icon} />
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>Access Denied</Text>
        <Text style={{ color: colors.icon, textAlign: 'center', paddingHorizontal: 32, marginTop: 8 }}>You need Super Admin privileges to manage the Mall.</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card }]}>
        <View style={s.headerRow}>
          <Ionicons name="bag-handle" size={24} color={colors.tint} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Mall Management</Text>
        </View>
        <Text style={[s.headerSubtitle, { color: colors.icon }]}>Manage stores, brands, offers, banners & collections</Text>
      </View>
      <MallTabBar colors={colors} activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard' && <DashboardTab colors={colors} onNavigate={(tab: string) => setActiveTab(tab as MallTabType)} />}
        {activeTab === 'stores' && <StoresTab colors={colors} managedStores={managedStores} managedStoresSearch={managedStoresSearch} managedStoresFilter={managedStoresFilter} managedStoresLoading={managedStoresLoading} processingManagedStore={processingManagedStore} onSearchChange={setManagedStoresSearch} onFilterChange={setManagedStoresFilter} onRefresh={() => loadManagedStores(managedStoresSearch)} onToggleMall={toggleStoreMall} onToggleFeatured={toggleStoreFeatured} onTogglePremium={toggleStorePremium} />}
        {activeTab === 'listing-requests' && <ListingRequestsTab colors={colors} requests={listingRequests} filter={listingRequestsFilter} loading={listingRequestsLoading} processingId={processingRequest} onFilterChange={setListingRequestsFilter} onRefresh={loadListingRequests} onApprove={handleApproveRequest} onReject={handleRejectRequest} />}
        {activeTab === 'categories' && <CategoriesTab colors={colors} categories={categories} loading={categoriesLoading} processingId={processingCategory} onRefresh={loadCategories} onEdit={openCategoryForm} onDelete={deleteCategory} />}
        {activeTab === 'offers' && <OffersTab colors={colors} offers={offers} loading={offersLoading} processingId={processingOffer} onRefresh={loadOffers} onEdit={openOfferForm} onDelete={deleteOffer} onToggleActive={toggleOfferActive} />}
        {activeTab === 'banners' && <BannersTab colors={colors} banners={banners} loading={bannersLoading} processingId={processingBanner} onRefresh={loadBanners} onEdit={openBannerForm} onDelete={deleteBanner} onToggleActive={toggleBannerActive} />}
        {activeTab === 'collections' && <CollectionsTab colors={colors} collections={collections} loading={collectionsLoading} processingId={processingCollection} onRefresh={loadCollections} onEdit={openCollectionForm} onDelete={deleteCollection} onToggleActive={toggleCollectionActive} />}
        {activeTab === 'alliance' && <AllianceTab colors={colors} stores={allianceStores} search={allianceSearch} loading={allianceLoading} processingId={processingAlliance} onSearchChange={setAllianceSearch} onRefresh={() => loadAllianceStores(allianceSearch)} onToggleAlliance={toggleAlliance} />}
      </View>
      <MallModals
        colors={colors}
        showCategoryModal={showCategoryModal} editingCategory={editingCategory} categoryForm={categoryForm} onCategoryFormChange={setCategoryForm} onCloseCategoryModal={() => setShowCategoryModal(false)} onSaveCategory={saveCategory}
        showOfferModal={showOfferModal} editingOffer={editingOffer} offerForm={offerForm} onOfferFormChange={setOfferForm} onCloseOfferModal={() => setShowOfferModal(false)} onSaveOffer={saveOffer}
        showBannerModal={showBannerModal} editingBanner={editingBanner} bannerForm={bannerForm} onBannerFormChange={setBannerForm} onCloseBannerModal={() => setShowBannerModal(false)} onSaveBanner={saveBanner}
        showCollectionModal={showCollectionModal} editingCollection={editingCollection} collectionForm={collectionForm} onCollectionFormChange={setCollectionForm} onCloseCollectionModal={() => setShowCollectionModal(false)} onSaveCollection={saveCollection}
      />
    </View>
  );
}

