// Admin Travel Management Page — 6 tabs: Dashboard, Categories, Services, Bookings, Analytics, Hotels OTA

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput, ActivityIndicator, RefreshControl, Modal, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { travelAdminService, type TravelCategory, type TravelService } from '@/services/api/travel';
import { getOtaAdminOverview, getOtaAdminHotels, toggleHotelBrandCoin, type OtaAdminHotel, type OtaAdminOverview } from '@/services/api/hotelOtaAdmin';
import { useTravelDashboard, useTravelCategories, useTravelServices, useTravelBookings } from '@/hooks/queries/useTravel';
import { queryKeys } from '@/hooks/queries/queryKeys';

type TabName = 'dashboard' | 'categories' | 'services' | 'bookings' | 'analytics' | 'hotels';
const TABS: { key: TabName; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' }, { key: 'categories', label: 'Categories', icon: 'folder' },
  { key: 'services', label: 'Services', icon: 'cube' }, { key: 'bookings', label: 'Bookings', icon: 'calendar' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart' }, { key: 'hotels', label: 'Hotels OTA', icon: 'bed' },
];
const CATEGORY_ICONS: Record<string, string> = { flights: 'airplane', hotels: 'bed', trains: 'train', bus: 'bus', cab: 'car', packages: 'briefcase' };
const STATUS_COLORS: Record<string, string> = { pending: Colors.light.warning, confirmed: Colors.light.info, completed: Colors.light.green, cancelled: Colors.light.error, no_show: Colors.light.mutedDark };
const CB_COLORS: Record<string, string> = { pending: Colors.light.slateMedium, held: Colors.light.warning, credited: Colors.light.green, clawed_back: Colors.light.error };
const CL = Colors.light;

// ── Mutations ──────────────────────────────────────────────────────────────────
function useTravelMutations() {
  const qc = useQueryClient();
  return {
    updateCategory: async (id: string, data: { cashbackPercentage: number }) => {
      await travelAdminService.updateCategory(id, data);
      qc.invalidateQueries({ queryKey: queryKeys.travel.categories() });
      qc.invalidateQueries({ queryKey: queryKeys.travel.dashboard() });
    },
    toggleServiceActive: async (svc: TravelService) => {
      await travelAdminService.updateService(svc._id, { isActive: !svc.isActive });
      qc.invalidateQueries({ queryKey: queryKeys.travel.services() });
    },
    toggleServiceFeatured: async (svc: TravelService) => {
      await travelAdminService.updateService(svc._id, { isFeatured: !svc.isFeatured });
      qc.invalidateQueries({ queryKey: queryKeys.travel.services() });
    },
    updateBookingStatus: async (id: string, status: string) => {
      await travelAdminService.updateBookingStatus(id, status);
      qc.invalidateQueries({ queryKey: queryKeys.travel.bookings() });
    },
    overrideCashback: async (id: string, action: 'credit' | 'clawback') => {
      await travelAdminService.overrideCashback(id, action);
      qc.invalidateQueries({ queryKey: queryKeys.travel.bookings() });
    },
    updateBookingPnr: async (id: string, data: { pnr?: string; eTicketUrl?: string }) => {
      await travelAdminService.updateBookingPnr(id, data);
      qc.invalidateQueries({ queryKey: queryKeys.travel.bookings() });
    },
  };
}

// ── Main ────────────────────────────────────────────────────────────────────────
export default function TravelManagementPage() {
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  return (
    <View style={[s.c, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Travel Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key && { backgroundColor: colors.navy }]} onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={tab.icon as unknown as keyof typeof Ionicons.glyphMap} size={16} color={activeTab === tab.key ? colors.card : colors.icon} />
              <Text style={[s.tabLabel, { color: activeTab === tab.key ? colors.card : colors.secondaryText }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {activeTab === 'dashboard' && <DashboardTab colors={colors} />}
      {activeTab === 'categories' && <CategoriesTab colors={colors} />}
      {activeTab === 'services' && <ServicesTab colors={colors} />}
      {activeTab === 'bookings' && <BookingsTab colors={colors} />}
      {activeTab === 'analytics' && <AnalyticsTab colors={colors} />}
      {activeTab === 'hotels' && <HotelsOtaTab colors={colors} />}
    </View>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────────
function DashboardTab({ colors }: any) {
  const { data: stats, isLoading } = useTravelDashboard();
  if (isLoading) return <LoadingView />;
  if (!stats) return <EmptyView message="Failed to load dashboard" />;
  const statCards = [
    { label: 'Total Bookings', value: stats.totalBookings, icon: 'calendar', color: colors.info },
    { label: 'Total Revenue', value: `₹${(stats.revenue.total || 0).toLocaleString()}`, icon: 'cash', color: colors.green },
    { label: 'Avg Booking', value: `₹${Math.round(stats.revenue.average || 0).toLocaleString()}`, icon: 'trending-up', color: colors.purple },
    { label: 'Cashback Credited', value: `₹${(stats.cashback?.credited?.amount || 0).toLocaleString()}`, icon: 'gift', color: colors.warning },
  ];
  return (
    <ScrollView contentContainerStyle={s.tabContent}>
      <View style={s.statsGrid}>
        {statCards.map((card, idx) => (
          <View key={idx} style={[s.statCard, { backgroundColor: colors.card }]}>
            <View style={[s.statIcon, { backgroundColor: card.color + '15' }]}><Ionicons name={card.icon as unknown as keyof typeof Ionicons.glyphMap} size={20} color={card.color} /></View>
            <Text style={[s.statValue, { color: colors.text }]}>{card.value}</Text>
            <Text style={[s.statLabel, { color: colors.secondaryText }]}>{card.label}</Text>
          </View>
        ))}
      </View>
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Booking Status</Text>
        {Object.entries(stats.statusCounts || {}).map(([status, count]) => (
          <View key={status} style={s.breakdownRow}>
            <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.mutedDark }]} />
            <Text style={[s.breakdownLabel, { color: colors.text }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
            <Text style={[s.breakdownValue, { color: colors.secondaryText }]}>{count}</Text>
          </View>
        ))}
      </View>
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Revenue by Category</Text>
        {(stats.revenueByCategory || []).map((cat) => (
          <View key={cat.categorySlug} style={s.breakdownRow}>
            <Ionicons name={(CATEGORY_ICONS[cat.categorySlug] || 'airplane') as unknown as keyof typeof Ionicons.glyphMap} size={18} color={colors.navy} />
            <Text style={[s.breakdownLabel, { color: colors.text }]}>{cat.categoryName}</Text>
            <View style={s.breakdownRight}><Text style={[s.breakdownValue, { color: colors.text }]}>₹{cat.revenue.toLocaleString()}</Text><Text style={[s.breakdownSub, { color: colors.secondaryText }]}>{cat.bookingCount} bkgs</Text></View>
          </View>
        ))}
      </View>
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Bookings</Text>
        {(stats.recentBookings || []).slice(0, 5).map((b: any) => (
          <View key={b._id} style={s.breakdownRow}>
            <View style={{ flex: 1 }}><Text style={[s.breakdownLabel, { color: colors.text }]}>{b.service?.name || 'N/A'}</Text><Text style={[s.breakdownSub, { color: colors.secondaryText }]}>#{b.bookingNumber} · {b.user?.name || b.customerName}</Text></View>
            <View style={[s.miniBadge, { backgroundColor: (STATUS_COLORS[b.status] || colors.mutedDark) + '20' }]}><Text style={[s.miniBadgeText, { color: STATUS_COLORS[b.status] || colors.mutedDark }]}>{b.status}</Text></View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Categories Tab ─────────────────────────────────────────────────────────────
function CategoriesTab({ colors }: any) {
  const { data: cats, isLoading } = useTravelCategories();
  const [editing, setEditing] = useState<TravelCategory | null>(null);
  const [cashbackVal, setCashbackVal] = useState('');
  const muts = useTravelMutations();
  const saveCat = async () => {
    if (!editing) return;
    try { await muts.updateCategory(editing._id, { cashbackPercentage: Number(cashbackVal) || 0 }); showAlert('Success', 'Category updated'); setEditing(null); }
    catch (e: any) { showAlert('Error', e.message || 'Failed to update'); }
  };
  if (isLoading) return <LoadingView />;
  return (
    <ScrollView contentContainerStyle={s.tabContent}>
      {(cats ?? []).map((cat) => (
        <View key={cat._id} style={[s.catCard, { backgroundColor: colors.card }]}>
          <View style={s.catRow}>
            <View style={[s.catIcon, { backgroundColor: colors.infoLight }]}><Ionicons name={(CATEGORY_ICONS[cat.slug] || 'airplane') as unknown as keyof typeof Ionicons.glyphMap} size={24} color={colors.navy} /></View>
            <View style={{ flex: 1 }}><Text style={[s.catName, { color: colors.text }]}>{cat.name}</Text><Text style={[s.catSub, { color: colors.secondaryText }]}>{cat.serviceCount || 0} services · {cat.cashbackPercentage || 0}% cb</Text></View>
            <TouchableOpacity style={s.editBtn} onPress={() => { setEditing(cat); setCashbackVal(String(cat.cashbackPercentage || 0)); }}><Ionicons name="create-outline" size={20} color={colors.info} /></TouchableOpacity>
          </View>
        </View>
      ))}
      <Modal visible={!!editing} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Edit {editing?.name}</Text>
            <Text style={[s.fieldLabel, { color: colors.secondaryText }]}>Cashback %</Text>
            <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} value={cashbackVal} onChangeText={setCashbackVal} keyboardType="numeric" placeholder="e.g. 5" placeholderTextColor={colors.secondaryText} />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => setEditing(null)}><Text style={s.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.saveBtn]} onPress={saveCat}><Text style={s.saveBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ── Services Tab ───────────────────────────────────────────────────────────────
function ServicesTab({ colors }: any) {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const { data, isLoading } = useTravelServices({ page, limit: 20, search: search || undefined });
  const muts = useTravelMutations();
  return (
    <View style={{ flex: 1 }}>
      <View style={[s.searchBar, { backgroundColor: colors.card }]}><Ionicons name="search" size={18} color={colors.secondaryText} /><TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search services..." placeholderTextColor={colors.secondaryText} value={search} onChangeText={(t) => { setSearch(t); setPage(1); }} /></View>
      {isLoading ? <LoadingView /> : (
        <FlatList
          data={data?.services ?? []} keyExtractor={(item) => item._id} contentContainerStyle={s.tabContent}
          renderItem={({ item }) => (
            <View style={[s.svcCard, { backgroundColor: colors.card }]}>
              <View style={s.svcRow}>
                <View style={{ flex: 1 }}><Text style={[s.svcName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text><Text style={[s.svcSub, { color: colors.secondaryText }]}>{item.serviceCategory?.name} · ₹{item.pricing?.selling?.toLocaleString()}</Text></View>
                <View style={s.svcToggles}>
                  <TouchableOpacity onPress={() => muts.toggleServiceFeatured(item)}><Ionicons name={item.isFeatured ? 'star' : 'star-outline'} size={18} color={item.isFeatured ? colors.warning : colors.secondaryText} /></TouchableOpacity>
                  <Switch value={item.isActive} onValueChange={() => muts.toggleServiceActive(item)} trackColor={{ false: colors.slateLight, true: '#86EFAC' }} thumbColor={item.isActive ? colors.green : colors.slateMedium} />
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyView message="No services yet" />}
          ListFooterComponent={(data?.pagination?.totalPages ?? 1) > 1 ? (
            <View style={s.pagination}>
              <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)} style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}><Text style={s.pageBtnText}>Prev</Text></TouchableOpacity>
              <Text style={[s.pageInfo, { color: colors.secondaryText }]}>{page} / {data?.pagination?.totalPages}</Text>
              <TouchableOpacity disabled={page >= (data?.pagination?.totalPages ?? 1)} onPress={() => setPage(p => p + 1)} style={[s.pageBtn, page >= (data?.pagination?.totalPages ?? 1) && s.pageBtnDisabled]}><Text style={s.pageBtnText}>Next</Text></TouchableOpacity>
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

// ── Bookings Tab ───────────────────────────────────────────────────────────────
function BookingsTab({ colors }: any) {
  const [search, setSearch] = useState(''); const [statusF, setStatusF] = useState(''); const [cbF, setCbF] = useState(''); const [page, setPage] = useState(1);
  const [selBook, setSelBook] = useState<any>(null); const [pnr, setPnr] = useState(''); const [eticket, setEticket] = useState('');
  const { data, isLoading } = useTravelBookings({ page, limit: 20, search: search || undefined, status: statusF || undefined, cashbackStatus: cbF || undefined });
  const muts = useTravelMutations();
  const STATUS_OPTS = ['', 'pending', 'confirmed', 'completed', 'cancelled'];
  const CB_OPTS = ['', 'pending', 'held', 'credited', 'clawed_back'];
  const doStatus = (id: string, s: string) => showConfirm('Confirm', `Change status to ${s}?`, async () => { try { await muts.updateBookingStatus(id, s); showAlert('Success', 'Status updated'); setSelBook(null); } catch (e: any) { showAlert('Error', e.message); } });
  const doCashback = (id: string, a: 'credit' | 'clawback') => showConfirm('Confirm', `${a === 'credit' ? 'Credit' : 'Claw back'} cashback?`, async () => { try { await muts.overrideCashback(id, a); showAlert('Success', `Cashback ${a === 'credit' ? 'credited' : 'clawed back'}`); setSelBook(null); } catch (e: any) { showAlert('Error', e.message); } });
  const doPnr = async () => { if (!selBook) return; try { await muts.updateBookingPnr(selBook._id, { pnr: pnr || undefined, eTicketUrl: eticket || undefined }); showAlert('Success', 'PNR updated'); setSelBook(null); } catch (e: any) { showAlert('Error', e.message); } };
  return (
    <View style={{ flex: 1 }}>
      <View style={[s.filtersRow, { backgroundColor: colors.card }]}><View style={[s.searchBarSm, { borderColor: colors.border }]}><Ionicons name="search" size={16} color={colors.secondaryText} /><TextInput style={[s.searchInputSm, { color: colors.text }]} placeholder="Search..." placeholderTextColor={colors.secondaryText} value={search} onChangeText={(t) => { setSearch(t); setPage(1); }} /></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterChips}>
        {STATUS_OPTS.map((_s) => <TouchableOpacity key={`s-${_s}`} style={[s.chip, statusF === _s && { backgroundColor: colors.navy }]} onPress={() => { setStatusF(_s); setPage(1); }}><Text style={[s.chipText, statusF === _s && { color: colors.card }]}>{_s || 'All Status'}</Text></TouchableOpacity>)}
        <View style={s.chipDivider} />
        {CB_OPTS.map((_c) => <TouchableOpacity key={`c-${_c}`} style={[s.chip, cbF === _c && { backgroundColor: colors.warning }]} onPress={() => { setCbF(_c); setPage(1); }}><Text style={[s.chipText, cbF === _c && { color: colors.card }]}>{_c ? _c.replace('_', ' ') : 'All Cashback'}</Text></TouchableOpacity>)}
      </ScrollView>
      {isLoading ? <LoadingView /> : (
        <FlatList
          data={data?.bookings ?? []} keyExtractor={(item) => item._id} contentContainerStyle={s.tabContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.bookCard, { backgroundColor: colors.card }]} onPress={() => { setSelBook(item); setPnr(item.pnr || ''); setEticket(item.eTicketUrl || ''); }}>
              <View style={s.svcRow}>
                <View style={{ flex: 1 }}><Text style={[s.bookNum, { color: colors.text }]}>#{item.bookingNumber}</Text><Text style={[s.svcSub, { color: colors.secondaryText }]}>{item.service?.name} · {item.serviceCategory?.name}</Text><Text style={[s.svcSub, { color: colors.secondaryText }]}>{item.user?.name || item.customerName}</Text></View>
                <View>
                  <View style={[s.miniBadge, { backgroundColor: (STATUS_COLORS[item.status] || colors.mutedDark) + '20' }]}><Text style={[s.miniBadgeText, { color: STATUS_COLORS[item.status] || colors.mutedDark }]}>{item.status}</Text></View>
                  {item.cashbackStatus && item.cashbackStatus !== 'pending' && <View style={[s.miniBadge, { backgroundColor: (CB_COLORS[item.cashbackStatus] || colors.mutedDark) + '20', marginTop: 4 }]}><Text style={[s.miniBadgeText, { color: CB_COLORS[item.cashbackStatus] || colors.mutedDark }]}>CB: {item.cashbackStatus.replace('_', ' ')}</Text></View>}
                </View>
              </View>
              <View style={[s.bookFooter, { borderTopColor: CL.slate }]}>
                <Text style={[s.bookDate, { color: colors.secondaryText }]}>{new Date(item.bookingDate).toLocaleDateString()}</Text>
                {item.pnr && <Text style={[s.bookPnr, { color: colors.text }]}>PNR: {item.pnr}</Text>}
                <Text style={[s.bookPrice, { color: colors.navy }]}>₹{item.pricing?.total?.toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={(data?.pagination?.totalPages ?? 1) > 1 ? (
            <View style={s.pagination}>
              <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)} style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}><Text style={s.pageBtnText}>Prev</Text></TouchableOpacity>
              <Text style={[s.pageInfo, { color: colors.secondaryText }]}>{page} / {data?.pagination?.totalPages}</Text>
              <TouchableOpacity disabled={page >= (data?.pagination?.totalPages ?? 1)} onPress={() => setPage(p => p + 1)} style={[s.pageBtn, page >= (data?.pagination?.totalPages ?? 1) && s.pageBtnDisabled]}><Text style={s.pageBtnText}>Next</Text></TouchableOpacity>
            </View>
          ) : null}
        />
      )}
      <Modal visible={!!selBook} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <ScrollView>
              <View style={s.modalHeader}><Text style={[s.modalTitle, { color: colors.text }]}>Booking #{selBook?.bookingNumber}</Text><TouchableOpacity onPress={() => setSelBook(null)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View>
              {selBook && <>
                <Text style={[s.fieldLabel, { color: colors.secondaryText }]}>Status</Text>
                <View style={s.statusActions}>
                  {['confirmed', 'completed', 'cancelled'].map((st) => <TouchableOpacity key={st} style={[s.statusBtn, { borderColor: STATUS_COLORS[st] }]} onPress={() => doStatus(selBook._id, st)}><Text style={[s.statusBtnText, { color: STATUS_COLORS[st] }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text></TouchableOpacity>)}
                </View>
                <Text style={[s.fieldLabel, { color: colors.secondaryText, marginTop: 16 }]}>Cashback ({selBook.cashbackStatus || 'pending'})</Text>
                <View style={s.statusActions}>
                  <TouchableOpacity style={[s.statusBtn, { borderColor: colors.green }]} onPress={() => doCashback(selBook._id, 'credit')}><Text style={[s.statusBtnText, { color: colors.green }]}>Force Credit</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.statusBtn, { borderColor: colors.error }]} onPress={() => doCashback(selBook._id, 'clawback')}><Text style={[s.statusBtnText, { color: colors.error }]}>Claw Back</Text></TouchableOpacity>
                </View>
                <Text style={[s.fieldLabel, { color: colors.secondaryText, marginTop: 16 }]}>PNR</Text>
                <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} value={pnr} onChangeText={setPnr} placeholder="Enter PNR" placeholderTextColor={colors.secondaryText} />
                <Text style={[s.fieldLabel, { color: colors.secondaryText, marginTop: 12 }]}>E-Ticket URL</Text>
                <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} value={eticket} onChangeText={setEticket} placeholder="Enter e-ticket URL" placeholderTextColor={colors.secondaryText} />
                <View style={[s.modalActions, { marginTop: 16 }]}>
                  <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => setSelBook(null)}><Text style={s.cancelBtnText}>Close</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.modalBtn, s.saveBtn]} onPress={doPnr}><Text style={s.saveBtnText}>Save PNR</Text></TouchableOpacity>
                </View>
              </>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Analytics Tab ──────────────────────────────────────────────────────────────
function AnalyticsTab({ colors }: any) {
  const { data: stats, isLoading } = useTravelDashboard();
  if (isLoading) return <LoadingView />;
  if (!stats) return <EmptyView message="Failed to load analytics" />;
  const cbEntries = Object.entries(stats.cashback || {});
  const totalCb = cbEntries.reduce((sum, [_, v]) => sum + (v.amount || 0), 0);
  return (
    <ScrollView contentContainerStyle={s.tabContent}>
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Cashback Overview</Text>
        <Text style={[s.analyticsTotal, { color: colors.navy }]}>₹{totalCb.toLocaleString()} Total</Text>
        {cbEntries.map(([status, data]) => {
          const pct = totalCb > 0 ? (data.amount / totalCb) * 100 : 0;
          const color = CB_COLORS[status] || colors.mutedDark;
          return <View key={status} style={s.analyticsRow}><View style={s.analyticsLeft}><View style={[s.statusDot, { backgroundColor: color }]} /><Text style={[s.analyticsLabel, { color: colors.text }]}>{status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}</Text></View><View style={s.analyticsRight}><View style={s.barContainer}><View style={[s.bar, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} /></View><Text style={[s.analyticsValue, { color: colors.text }]}>₹{data.amount.toLocaleString()} ({data.count})</Text></View></View>;
        })}
      </View>
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Revenue Distribution</Text>
        {(stats.revenueByCategory || []).map((cat) => {
          const maxRev = Math.max(...(stats.revenueByCategory || []).map((c: any) => c.revenue), 1);
          const pct = (cat.revenue / maxRev) * 100;
          return <View key={cat.categorySlug} style={s.analyticsRow}><View style={s.analyticsLeft}><Ionicons name={(CATEGORY_ICONS[cat.categorySlug] || 'airplane') as unknown as keyof typeof Ionicons.glyphMap} size={16} color={colors.navy} /><Text style={[s.analyticsLabel, { color: colors.text }]}>{cat.categoryName}</Text></View><View style={s.analyticsRight}><View style={s.barContainer}><View style={[s.bar, { width: `${pct}%`, backgroundColor: colors.navy }]} /></View><Text style={[s.analyticsValue, { color: colors.text }]}>₹{cat.revenue.toLocaleString()}</Text></View></View>;
        })}
      </View>
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Status Distribution</Text>
        {Object.entries(stats.statusCounts || {}).map(([status, count]) => {
          const total = stats.totalBookings || 1;
          const pct = (count / total) * 100;
          return <View key={status} style={s.analyticsRow}><View style={s.analyticsLeft}><View style={[s.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.mutedDark }]} /><Text style={[s.analyticsLabel, { color: colors.text }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text></View><View style={s.analyticsRight}><View style={s.barContainer}><View style={[s.bar, { width: `${pct}%`, backgroundColor: STATUS_COLORS[status] || colors.mutedDark }]} /></View><Text style={[s.analyticsValue, { color: colors.text }]}>{count} ({Math.round(pct)}%)</Text></View></View>;
        })}
      </View>
    </ScrollView>
  );
}

// ── Hotels OTA Tab ─────────────────────────────────────────────────────────────
function HotelsOtaTab({ colors }: any) {
  const [ov, setOv] = useState<OtaAdminOverview | null>(null); const [hotels, setHotels] = useState<OtaAdminHotel[]>([]);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState(''); const [togglingId, setTogglingId] = useState<string | null>(null);
  const load = async () => { try { const [o, list] = await Promise.all([getOtaAdminOverview().catch(() => null), getOtaAdminHotels({ page: 1 }).catch(() => ({ hotels: [], total: 0 }))]); setOv(o); setHotels(list.hotels); } catch { /* no-op */ } finally { setLoading(false); setRefreshing(false); } };
  useEffect(() => { load(); }, []);
  const toggleBc = async (hotel: OtaAdminHotel) => { setTogglingId(hotel.id); try { await toggleHotelBrandCoin(hotel.id, !hotel.brandCoinEnabled); setHotels(prev => prev.map(h => h.id === hotel.id ? { ...h, brandCoinEnabled: !h.brandCoinEnabled } : h)); } catch (e: any) { showAlert('Error', e.message || 'Failed to toggle'); } finally { setTogglingId(null); } };
  const filtered = hotels.filter((h) => !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.city.toLowerCase().includes(search.toLowerCase()));
  if (loading) return <LoadingView />;
  return (
    <ScrollView contentContainerStyle={s.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      {ov && (
        <View style={s.statsGrid}>
          {[{ label: 'Active Hotels', value: ov.activeHotels, icon: 'business', color: colors.info }, { label: 'Active Bookings', value: ov.activeBookings, icon: 'calendar', color: colors.green }, { label: 'GMV Today', value: `₹${Math.round((ov.gmvTodayPaise || 0) / 100).toLocaleString()}`, icon: 'cash', color: colors.purple }, { label: 'Brand Coin Liability', value: `₹${Math.round((ov.brandCoinTotalLiabilityPaise || 0) / 100).toLocaleString()}`, icon: 'wallet', color: '#7C3AED' }].map((card) => (
            <View key={card.label} style={[s.statCard, { backgroundColor: colors.card }]}>
              <View style={[s.statIcon, { backgroundColor: card.color + '18' }]}><Ionicons name={card.icon as unknown as keyof typeof Ionicons.glyphMap} size={18} color={card.color} /></View>
              <Text style={[s.statValue, { color: colors.text }]}>{card.value}</Text><Text style={[s.statLabel, { color: colors.secondaryText }]}>{card.label}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={[s.searchBar, { borderColor: colors.border, backgroundColor: colors.card }]}><Ionicons name="search" size={18} color={colors.secondaryText} /><TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search hotels..." placeholderTextColor={colors.secondaryText} value={search} onChangeText={setSearch} /></View>
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Hotels ({filtered.length})</Text>
        {filtered.length === 0 && <EmptyView message="No hotels found" />}
        {filtered.map((hotel) => (
          <View key={hotel.id} style={[s.bookCard, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text style={[s.bookPnr, { color: colors.text }]} numberOfLines={1}>{hotel.name}</Text>
                {hotel.brandCoinEnabled && <View style={{ marginLeft: 6, backgroundColor: '#F5F3FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#7C3AED', fontWeight: '700' }}>{hotel.brandCoinSymbol ?? 'Brand Coin'}</Text></View>}
              </View>
              <Text style={{ fontSize: 12, color: colors.secondaryText }}>{hotel.city} · {hotel.starRating}&#9733;</Text>
              {hotel.brandCoinEnabled && <Text style={{ fontSize: 12, color: '#7C3AED', marginTop: 2 }}>Coin liability: ₹{Math.round((hotel.totalBrandCoinLiabilityPaise || 0) / 100).toLocaleString()}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.secondaryText }}>Brand Coin</Text>
                {togglingId === hotel.id ? <ActivityIndicator size="small" color="#7C3AED" /> : <Switch value={hotel.brandCoinEnabled} onValueChange={() => toggleBc(hotel)} trackColor={{ false: colors.border, true: '#7C3AED' }} thumbColor={hotel.brandCoinEnabled ? '#fff' : colors.secondaryText} />}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.green }}>₹{Math.round((hotel.totalBrandCoinLiabilityPaise || 0) / 100).toLocaleString()} rev</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Shared ─────────────────────────────────────────────────────────────────────
function LoadingView() { return <View style={s.loadingView}><ActivityIndicator size="large" color={CL.navy} /></View>; }
function EmptyView({ message }: { message: string }) { return <View style={s.emptyView}><Ionicons name="airplane-outline" size={48} color={CL.slateLight} /><Text style={s.emptyText}>{message}</Text></View>; }

// ── Styles (s = styles) ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  c: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 12, borderBottomWidth: 1, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: CL.slate },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  tabContent: { padding: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', borderRadius: 14, padding: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 } }) },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 12 },
  section: { borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: CL.slate },
  breakdownLabel: { flex: 1, fontSize: 14 },
  breakdownValue: { fontSize: 14, fontWeight: '600' },
  breakdownRight: { alignItems: 'flex-end' },
  breakdownSub: { fontSize: 11, marginTop: 2 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  miniBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  catCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  catName: { fontSize: 16, fontWeight: '600' },
  catSub: { fontSize: 13, marginTop: 2 },
  editBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  searchBarSm: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flex: 1 },
  searchInputSm: { flex: 1, fontSize: 13, padding: 0 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChips: { paddingHorizontal: 16, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: CL.slate, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569', textTransform: 'capitalize' },
  chipDivider: { width: 1, backgroundColor: CL.slateLight, marginHorizontal: 4 },
  svcCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  svcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  svcName: { fontSize: 15, fontWeight: '600' },
  svcSub: { fontSize: 12, marginTop: 2 },
  svcToggles: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bookCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  bookNum: { fontSize: 14, fontWeight: '700' },
  bookFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 0.5 },
  bookDate: { fontSize: 12 },
  bookPnr: { fontSize: 12, fontWeight: '600' },
  bookPrice: { fontSize: 14, fontWeight: '700', marginLeft: 'auto' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: CL.navy, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { color: CL.card, fontSize: 13, fontWeight: '600' },
  pageInfo: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: CL.slate },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveBtn: { backgroundColor: CL.navy },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: CL.card },
  statusActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  statusBtnText: { fontSize: 13, fontWeight: '600' },
  analyticsTotal: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: CL.slate },
  analyticsLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 },
  analyticsLabel: { fontSize: 13 },
  analyticsRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  barContainer: { flex: 1, height: 8, backgroundColor: CL.slate, borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  analyticsValue: { fontSize: 12, fontWeight: '600', width: 90, textAlign: 'right' },
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 12 },
});
