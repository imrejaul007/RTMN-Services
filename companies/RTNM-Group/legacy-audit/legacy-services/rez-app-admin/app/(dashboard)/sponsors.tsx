import React, { useState, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, ActivityIndicator, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { useSocialImpactSponsors } from '@/hooks/queries/useSocialImpact';
import { socialImpactService } from '../../services/api/socialImpact';
import type { Sponsor } from '../../services/api/socialImpact';
import { SponsorFormModal, SponsorFundModal } from '../../components/social-impact-admin';
import { s } from './styles/sponsors.styles';

// ── Constants ───────────────────────────────────────────────────────────────────
const INDUSTRY_COLORS: Record<string, string> = {
  technology: Colors.light.info, healthcare: Colors.light.success, finance: Colors.light.purple,
  retail: Colors.light.warning, manufacturing: Colors.light.indigo, fmcg: Colors.light.pink,
  energy: '#14B8A6', education: Colors.light.orange, hospitality: Colors.light.cyan, other: Colors.light.mutedDark,
};
const LOGO_COLORS = [
  Colors.light.info, Colors.light.success, Colors.light.purple, Colors.light.warning,
  Colors.light.error, Colors.light.pink, '#14B8A6', Colors.light.orange, Colors.light.indigo, Colors.light.cyan,
];

// ── Form types ───────────────────────────────────────────────────────────────────
interface SponsorFormData {
  name: string; logo: string; description: string; brandCoinName: string; brandCoinLogo: string;
  contactPerson: { name: string; email: string; phone: string }; website: string; industry: string;
}
const DEFAULT_FORM: SponsorFormData = {
  name: '', logo: '', description: '', brandCoinName: '', brandCoinLogo: '',
  contactPerson: { name: '', email: '', phone: '' }, website: '', industry: '',
};

// ── Utilities ───────────────────────────────────────────────────────────────────
function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return String(num);
}
function formatCurrency(num: number): string { return num.toLocaleString('en-IN'); }
function getLogoColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}
function capitalizeFirst(str: string): string { return str.charAt(0).toUpperCase() + str.slice(1); }

// ── Component ────────────────────────────────────────────────────────────────────
export default function SponsorsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data: sponsors list via React Query hook
  const [search, setSearch] = useState('');
  const sponsorsQuery = useSocialImpactSponsors({ search: search || undefined, page: 1, limit: 100 });
  const allSponsors: Sponsor[] = ((sponsorsQuery.data as unknown as {sponsors?: Sponsor[]})?.sponsors ?? []);

  // Stats computed from loaded data
  const statsData = {
    activeSponsors: allSponsors.filter((s) => s.isActive).length,
    totalEvents: allSponsors.reduce((sum, s) => sum + (s.totalEventsSponsored || 0), 0),
    totalCoinsDistributed: allSponsors.reduce((sum, s) => sum + (s.totalCoinsDistributed || 0), 0),
  };

  // Processing state for toggle actions
  const [processingSet, setProcessingSet] = useState<Set<string>>(new Set());

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [form, setForm] = useState<SponsorFormData>({ ...DEFAULT_FORM });
  const [isSaving, setIsSaving] = useState(false);

  // Fund modal state
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundingSponsor, setFundingSponsor] = useState<Sponsor | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDescription, setFundDescription] = useState('');
  const [isFunding, setIsFunding] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreate = () => { setEditingSponsor(null); setForm({ ...DEFAULT_FORM }); setShowFormModal(true); };

  const handleEdit = useCallback((sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setForm({
      name: sponsor.name || '', logo: sponsor.logo || '', description: sponsor.description || '',
      brandCoinName: sponsor.brandCoinName || '', brandCoinLogo: sponsor.brandCoinLogo || '',
      contactPerson: { name: sponsor.contactPerson?.name || '', email: sponsor.contactPerson?.email || '', phone: sponsor.contactPerson?.phone || '' },
      website: sponsor.website || '', industry: sponsor.industry || '',
    });
    setShowFormModal(true);
  }, []);

  const validateForm = (): boolean => {
    if (!form.name.trim()) { showAlert('Validation Error', 'Sponsor name is required'); return false; }
    if (!form.logo.trim()) { showAlert('Validation Error', 'Logo URL is required'); return false; }
    if (!form.brandCoinName.trim()) { showAlert('Validation Error', 'Brand coin name is required'); return false; }
    if (!form.contactPerson.name.trim()) { showAlert('Validation Error', 'Contact person name is required'); return false; }
    if (!form.contactPerson.email.trim()) { showAlert('Validation Error', 'Contact person email is required'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contactPerson.email.trim())) { showAlert('Validation Error', 'Please enter a valid email address'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setIsSaving(true);
      const payload: Partial<Sponsor> = {
        name: form.name.trim(), logo: form.logo.trim(), description: form.description.trim(), brandCoinName: form.brandCoinName.trim(),
        contactPerson: { name: form.contactPerson.name.trim(), email: form.contactPerson.email.trim(), phone: form.contactPerson.phone.trim() || undefined },
      };
      if (form.brandCoinLogo.trim()) payload.brandCoinLogo = form.brandCoinLogo.trim();
      if (form.website.trim()) payload.website = form.website.trim();
      if (form.industry) payload.industry = form.industry;
      const response = editingSponsor
        ? await socialImpactService.updateSponsor(editingSponsor._id, payload)
        : await socialImpactService.createSponsor(payload);
      if (response.success) {
        showAlert('Success', editingSponsor ? 'Sponsor updated successfully' : 'Sponsor created successfully');
        setShowFormModal(false); setEditingSponsor(null); setForm({ ...DEFAULT_FORM });
        sponsorsQuery.refetch();
      } else { showAlert('Error', response.message || 'Failed to save sponsor'); }
    } catch (error: any) { logger.error('Save sponsor error:', error); showAlert('Error', error.message || 'Failed to save sponsor'); }
    finally { setIsSaving(false); }
  };

  const handleToggleActive = async (sponsor: Sponsor) => {
    const action = sponsor.isActive ? 'deactivate' : 'activate';
    showConfirm(`${capitalizeFirst(action)} Sponsor`, `Are you sure you want to ${action} "${sponsor.name}"?`,
      async () => {
        try {
          setProcessingSet(new Set([sponsor._id]));
          const response = sponsor.isActive
            ? await socialImpactService.deactivateSponsor(sponsor._id)
            : await socialImpactService.activateSponsor(sponsor._id);
          if (response.success) { showAlert('Success', `Sponsor ${action}d successfully`); sponsorsQuery.refetch(); }
          else { showAlert('Error', response.message || `Failed to ${action} sponsor`); }
        } catch (error: any) { logger.error('Toggle active error:', error); showAlert('Error', error.message || `Failed to ${action} sponsor`); }
        finally { setProcessingSet(new Set()); }
      }, capitalizeFirst(action));
  };

  const handleOpenFund = useCallback((sponsor: Sponsor) => {
    setFundingSponsor(sponsor); setFundAmount(''); setFundDescription('');
    setShowFundModal(true);
  }, []);

  const handleFund = async () => {
    if (!fundingSponsor) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) { showAlert('Validation Error', 'Please enter a valid amount greater than 0'); return; }
    try {
      setIsFunding(true);
      const response = await socialImpactService.fundSponsor(fundingSponsor._id, amount, fundDescription.trim() || undefined);
      if (response.success) { showAlert('Success', `Successfully funded ${formatCurrency(amount)} coins to ${fundingSponsor.name}`); setFundAmount(''); setFundDescription(''); sponsorsQuery.refetch(); }
      else { showAlert('Error', response.message || 'Failed to fund sponsor'); }
    } catch (error: any) { logger.error('Fund sponsor error:', error); showAlert('Error', error.message || 'Failed to fund sponsor'); }
    finally { setIsFunding(false); }
  };

  const handleViewEvents = (sponsor: Sponsor) => {
    showAlert('Sponsor Events', `${sponsor.name} has sponsored ${sponsor.totalEventsSponsored} event(s). View events on the Social Impact page.`);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────────
  const onRefresh = useCallback(() => { sponsorsQuery.refetch(); }, [sponsorsQuery]);

  const renderHeader = () => (
    <View style={s.header}>
      <View>
        <View style={s.headerTitleRow}>
          <Text style={[s.headerTitle, { color: colors.text }]}>CSR Sponsors</Text>
          <View style={[s.countBadge, { backgroundColor: colors.tint }]}>
            <Text style={s.countBadgeText}>{allSponsors.length}</Text>
          </View>
        </View>
        <Text style={[s.headerSubtitle, { color: colors.secondaryText }]}>Manage corporate sponsors and budgets</Text>
      </View>
      <TouchableOpacity style={[s.refreshBtn, { backgroundColor: `${colors.tint}15` }]} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color={colors.tint} />
      </TouchableOpacity>
    </View>
  );

  const renderStatsRow = () => (
    <View style={s.statsRow}>
      {[
        { label: 'Active Sponsors', value: statsData.activeSponsors, color: colors.success, icon: 'business-outline' as const },
        { label: 'Total Events', value: formatNumber(statsData.totalEvents), color: colors.info, icon: 'calendar-outline' as const },
        { label: 'Coins Distributed', value: formatNumber(statsData.totalCoinsDistributed), color: colors.warning, icon: 'logo-bitcoin' as const },
      ].map(({ label, value, color, icon }) => (
        <View key={label} style={[s.statItem, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={18} color={color} />
          <Text style={[s.statValue, { color }]}>{value}</Text>
          <Text style={[s.statLabel, { color: colors.secondaryText }]}>{label}</Text>
        </View>
      ))}
    </View>
  );

  const renderSearchBar = () => (
    <View style={s.searchContainer}>
      <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search sponsors by name..."
          placeholderTextColor={colors.icon} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.icon} /></TouchableOpacity>}
      </View>
    </View>
  );

  const renderCreateButton = () => (
    <View style={s.createBtnContainer}>
      <TouchableOpacity style={[s.createBtn, { backgroundColor: colors.tint }]} onPress={handleCreate}>
        <Ionicons name="add-circle-outline" size={18} color={colors.card} />
        <Text style={s.createBtnText}>New Sponsor</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Sponsor Card ───────────────────────────────────────────────────────────────
  const renderSponsorItem = useCallback(({ item }: { item: Sponsor }) => {
    const logoColor = getLogoColor(item.name);
    const industryColor = INDUSTRY_COLORS[item.industry || 'other'] || colors.mutedDark;
    const isProcessing = processingSet.has(item._id);
    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <View style={[s.logoCircle, { backgroundColor: `${logoColor}20` }]}>
              <Text style={[s.logoLetter, { color: logoColor }]}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={s.cardTitleContainer}>
              <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <View style={s.coinNameRow}>
                <Ionicons name="logo-bitcoin" size={12} color={colors.warning} />
                <Text style={[s.coinName, { color: colors.secondaryText }]} numberOfLines={1}>{item.brandCoinName}</Text>
              </View>
            </View>
          </View>
          <View style={[s.statusBadge, { backgroundColor: item.isActive ? `${colors.success}15` : `${colors.error}15` }]}>
            <View style={[s.statusDot, { backgroundColor: item.isActive ? colors.success : colors.error }]} />
            <Text style={[s.statusText, { color: item.isActive ? colors.success : colors.error }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
        {item.industry && (
          <View style={s.badgesRow}>
            <View style={[s.industryBadge, { backgroundColor: `${industryColor}15` }]}>
              <Text style={[s.industryBadgeText, { color: industryColor }]}>{capitalizeFirst(item.industry)}</Text>
            </View>
          </View>
        )}
        <View style={s.metaRow}>
          {[
            { icon: 'calendar-outline' as const, text: `${item.totalEventsSponsored || 0} events`, color: colors.icon },
            { icon: 'people-outline' as const, text: `${formatNumber(item.totalParticipants || 0)} participants`, color: colors.icon },
            { icon: 'logo-bitcoin' as const, text: `${formatNumber(item.totalCoinsDistributed || 0)} coins`, color: colors.warning },
          ].map(({ icon, text, color }) => (
            <View key={text} style={s.metaChip}>
              <Ionicons name={icon} size={13} color={color} />
              <Text style={[s.metaText, { color }]}>{text}</Text>
            </View>
          ))}
        </View>
        <View style={[s.budgetRow, { borderTopColor: colors.border }]}>
          <View style={s.budgetItem}>
            <Text style={[s.budgetLabel, { color: colors.secondaryText }]}>Total Funded</Text>
            <Text style={[s.budgetValue, { color: colors.text }]}>{formatCurrency(item.totalBudgetFunded || 0)}</Text>
          </View>
          <View style={[s.budgetDivider, { backgroundColor: colors.border }]} />
          <View style={s.budgetItem}>
            <Text style={[s.budgetLabel, { color: colors.secondaryText }]}>Balance</Text>
            <Text style={[s.budgetValue, { color: (item.currentBalance || 0) > 0 ? colors.success : colors.error }]}>{formatCurrency(item.currentBalance || 0)}</Text>
          </View>
        </View>
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: `${colors.info}10` }]} onPress={() => handleEdit(item)}>
            <Ionicons name="pencil" size={14} color={colors.info} /><Text style={[s.actionBtnText, { color: colors.info }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: `${colors.success}10` }]} onPress={() => handleOpenFund(item)}>
            <Ionicons name="wallet-outline" size={14} color={colors.success} /><Text style={[s.actionBtnText, { color: colors.success }]}>Fund</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: `${colors.warning}10` }]} onPress={() => handleViewEvents(item)}>
            <Ionicons name="calendar-outline" size={14} color={colors.warning} /><Text style={[s.actionBtnText, { color: colors.warning }]}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionIconBtn, { backgroundColor: item.isActive ? `${colors.error}10` : `${colors.success}10` }]}
            onPress={() => handleToggleActive(item)} disabled={isProcessing}>
            {isProcessing ? <ActivityIndicator size="small" color={item.isActive ? colors.error : colors.success} /> :
              <Ionicons name={item.isActive ? 'pause' : 'play'} size={16} color={item.isActive ? colors.error : colors.success} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, processingSet, handleEdit, handleOpenFund]);

  const renderEmptyState = () => (
    <View style={s.emptyContainer}>
      <Ionicons name="business-outline" size={56} color={colors.icon} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No sponsors found</Text>
      <Text style={[s.emptyText, { color: colors.icon }]}>{search ? 'Try a different search term' : 'Create your first CSR sponsor'}</Text>
    </View>
  );

  // ── Main Render ───────────────────────────────────────────────────────────────
  if (sponsorsQuery.isLoading && allSponsors.length === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderStatsRow()}
      {renderSearchBar()}
      {renderCreateButton()}
      <FlatList data={allSponsors} renderItem={renderSponsorItem} keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={sponsorsQuery.isFetching} onRefresh={onRefresh} tintColor={colors.tint} />}
        ListFooterComponent={allSponsors.length > 0 ? (
          <Text style={[s.endListText, { color: colors.secondaryText }]}>{allSponsors.length} sponsor{allSponsors.length !== 1 ? 's' : ''} total</Text>
        ) : null}
        ListEmptyComponent={renderEmptyState()}
      />
      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <SponsorFormModal visible={showFormModal} editing={!!editingSponsor} form={form} setForm={setForm}
            onClose={() => { setShowFormModal(false); setEditingSponsor(null); setForm({ ...DEFAULT_FORM }); }}
            onSave={handleSave} isSaving={isSaving} colors={colors} />
        </SafeAreaView>
      </Modal>
      {fundingSponsor && (
        <Modal visible={showFundModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <SponsorFundModal sponsor={fundingSponsor} fundAmount={fundAmount} setFundAmount={setFundAmount}
              fundDescription={fundDescription} setFundDescription={setFundDescription}
              isFunding={isFunding} onClose={() => { setShowFundModal(false); setFundingSponsor(null); }}
              onFund={handleFund} colors={colors} />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}


