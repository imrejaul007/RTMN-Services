import React, { useState, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { experiencesService } from '../../services/api/experiences';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  useExperiencesList,
  useExperienceStats,
  useCreateExperience,
  useUpdateExperience,
  useDeleteExperience,
  useToggleExperience,
  useToggleFeatured,
} from '@/hooks/queries';
import type { StoreExperience, ExperienceRequest } from '../../services/api/experiences';
import { ExperienceFormModal } from '../../components/experiences/ExperienceFormModal';
import { s } from './styles/experiences.styles';

type TabType = 'all' | 'active' | 'inactive' | 'featured';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'albums' },
  { key: 'active', label: 'Active', icon: 'checkmark-circle' },
  { key: 'inactive', label: 'Inactive', icon: 'pause-circle' },
  { key: 'featured', label: 'Featured', icon: 'star' },
];

export default function ExperiencesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState<StoreExperience | null>(null);

  const tabFilters = {
    all: {},
    active: { status: 'active' },
    inactive: { status: 'inactive' },
    featured: { featured: true },
  } as const;

  const { data: listData, isLoading, refetch, isRefetching } = useExperiencesList({
    ...tabFilters[activeTab],
    page,
    limit: 20,
    search: searchQuery || undefined,
  });

  const { data: stats, refetch: refetchStats } = useExperienceStats();

  const createMutation = useCreateExperience();
  const updateMutation = useUpdateExperience();
  const deleteMutation = useDeleteExperience();
  const toggleMutation = useToggleExperience();
  const featuredMutation = useToggleFeatured();

  const experiences = listData?.experiences ?? [];
  const pagination = listData?.pagination;

  const handleRefresh = () => { refetch(); refetchStats(); };

  const loadMore = () => {
    if (pagination?.hasNext && !isLoading) {
      setPage(p => p + 1);
    }
  };

  const openCreate = () => { setEditing(null); setShowFormModal(true); };
  const openEdit = (exp: StoreExperience) => { setEditing(exp); setShowFormModal(true); };

  const handleSave = async (data: ExperienceRequest) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing._id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setShowFormModal(false);
    refetch();
    refetchStats();
  };

  const handleDelete = (exp: StoreExperience) => {
    showConfirm('Delete Experience', `Delete "${exp.title}"?`, async () => {
      await deleteMutation.mutateAsync(exp._id);
      refetch(); refetchStats();
    }, 'Delete');
  };

  const handleToggle = (exp: StoreExperience) => toggleMutation.mutateAsync(exp._id).then(() => { refetch(); refetchStats(); });
  const handleToggleFeatured = (exp: StoreExperience) => featuredMutation.mutateAsync(exp._id).then(() => { refetch(); refetchStats(); });

  const renderStatCard = (label: string, value: number, icon: string, color: string) => (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as unknown as keyof typeof Ionicons.glyphMap} size={24} color={color} />
      </View>
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.icon }]}>{label}</Text>
    </View>
  );

  const renderCard = ({ item }: { item: StoreExperience }) => (
    <View style={[s.expCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.expCardHeader}>
        <View style={[s.expIconBox, { backgroundColor: item.backgroundColor || colors.warningLight }]}>
          <Text style={s.expIcon}>{item.icon}</Text>
        </View>
        <View style={s.expInfo}>
          <Text style={[s.expTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[s.expSubtitle, { color: colors.icon }]} numberOfLines={1}>{item.subtitle || item.slug}</Text>
          <View style={s.expBadges}>
            <View style={[s.typeBadge, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[s.typeBadgeText, { color: colors.tint }]}>{item.type}</Text>
            </View>
            {item.isFeatured && (
              <View style={[s.featuredBadge, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="star" size={10} color={colors.warning} />
                <Text style={[s.featuredBadgeText, { color: colors.warning }]}>Featured</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => handleToggle(item)} disabled={toggleMutation.isPending}>
          <Ionicons name={item.isActive ? 'checkbox' : 'square-outline'} size={32} color={item.isActive ? colors.tint : colors.icon} />
        </TouchableOpacity>
      </View>
      <View style={s.expCardActions}>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.tint + '10' }]} onPress={() => openEdit(item)}>
          <Ionicons name="pencil" size={16} color={colors.tint} /><Text style={[s.actionBtnText, { color: colors.tint }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.warning + '10' }]} onPress={() => handleToggleFeatured(item)} disabled={featuredMutation.isPending}>
          <Ionicons name={item.isFeatured ? 'star' : 'star-outline'} size={16} color={colors.warning} />
          <Text style={[s.actionBtnText, { color: colors.warning }]}>{item.isFeatured ? 'Unfeature' : 'Feature'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.error + '10' }]} onPress={() => handleDelete(item)} disabled={deleteMutation.isPending}>
          <Ionicons name="trash" size={16} color={colors.error} /><Text style={[s.actionBtnText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.expCardFooter, { borderTopColor: colors.border }]}>
        <Text style={[s.expCardFooterText, { color: colors.icon }]}>
          Order: {item.sortOrder} • {item.storeCount || 0} stores
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text, flex: 1 }]}>Shop by Experience</Text>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.tint }]} onPress={openCreate}>
          <Ionicons name="add" size={20} color={colors.card} /><Text style={s.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={s.statsContainer}>
          {renderStatCard('Total', stats.total, 'albums', colors.indigo)}
          {renderStatCard('Active', stats.active, 'checkmark-circle', colors.green)}
          {renderStatCard('Featured', stats.featured, 'star', colors.warning)}
          {renderStatCard('Inactive', stats.inactive, 'pause-circle', colors.error)}
        </View>
      )}

      <View style={[s.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.icon} />
        <TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search..." placeholderTextColor={colors.icon} value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={colors.icon} /></TouchableOpacity>
        )}
      </View>

      <View style={s.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContentContainer}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key ? { backgroundColor: colors.tint } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]} onPress={() => { setActiveTab(tab.key); setPage(1); }}>
              <Ionicons name={tab.icon as unknown as keyof typeof Ionicons.glyphMap} size={16} color={activeTab === tab.key ? colors.card : colors.icon} />
              <Text style={[s.tabText, { color: activeTab === tab.key ? colors.card : colors.text }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>
      ) : (
        <FlatList
          data={experiences}
          renderItem={renderCard}
          keyExtractor={item => item._id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.tint} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={colors.icon} />
              <Text style={[s.emptyText, { color: colors.icon }]}>No experiences found</Text>
              <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.tint }]} onPress={openCreate}>
                <Text style={s.emptyBtnText}>Create First Experience</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <ExperienceFormModal
        visible={showFormModal}
        editing={editing}
        colors={colors}
        onClose={() => setShowFormModal(false)}
        onSave={handleSave}
        onToggle={handleToggle}
        onToggleFeatured={handleToggleFeatured}
        onDelete={handleDelete as unknown as (exp: StoreExperience) => Promise<void>}
      />
    </SafeAreaView>
  );
}

