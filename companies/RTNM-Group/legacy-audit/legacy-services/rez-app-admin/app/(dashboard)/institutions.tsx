import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { institutionsService, VerifiedInstitution } from '../../services/api/institutions';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/institutions.styles';

type FilterType = 'all' | 'college' | 'company';

export default function InstitutionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [institutions, setInstitutions] = useState<VerifiedInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'college' | 'company'>('college');
  const [formDomains, setFormDomains] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAutoVerify, setFormAutoVerify] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const loadData = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (!append) setLoading(true);
        const result = await institutionsService.getInstitutions({
          type: filterType === 'all' ? undefined : filterType,
          search: debouncedSearch || undefined,
          page: pageNum,
          limit: 20,
        });
        if (append) {
          setInstitutions((prev) => [...prev, ...result.institutions]);
        } else {
          setInstitutions(result.institutions);
        }
        setHasMore(result.pagination.hasNextPage);
        setPage(pageNum);
      } catch (e: any) {
        showAlert('Error', e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterType, debouncedSearch]
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormType('college');
    setFormDomains('');
    setFormAliases('');
    setFormCity('');
    setFormAutoVerify(true);
    setModalVisible(true);
  };

  const openEditModal = (inst: VerifiedInstitution) => {
    setEditingId(inst._id);
    setFormName(inst.name);
    setFormType(inst.type);
    setFormDomains(inst.emailDomains.join(', '));
    setFormAliases(inst.aliases.join(', '));
    setFormCity(inst.city);
    setFormAutoVerify(inst.autoVerifyEnabled);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCity.trim()) {
      showAlert('Required', 'Name and city are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        type: formType,
        emailDomains: formDomains
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
        aliases: formAliases
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        city: formCity.trim(),
        autoVerifyEnabled: formAutoVerify,
      };

      if (editingId) {
        await institutionsService.updateInstitution(editingId, data);
        showAlert('Updated', `${formName} updated successfully`);
      } else {
        await institutionsService.createInstitution(data);
        showAlert('Created', `${formName} added. Matching emails will now auto-verify.`);
      }

      setModalVisible(false);
      loadData(1);
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inst: VerifiedInstitution) => {
    const confirmed = await showConfirm(
      'Deactivate',
      `Deactivate ${inst.name}? Auto-verify will stop for this institution.`
    );
    if (!confirmed) return;

    try {
      await institutionsService.deleteInstitution(inst._id);
      loadData(1);
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: VerifiedInstitution }) => (
      <View style={[s.card, { backgroundColor: colors.background }]}>
        <View style={s.cardHeader}>
          <Text style={[s.cardIcon]}>{item.type === 'college' ? '🎓' : '💼'}</Text>
          <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              s.autoBadge,
              { backgroundColor: item.autoVerifyEnabled ? '#dcfce7' : '#fef2f2' },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: item.autoVerifyEnabled ? '#16a34a' : '#dc2626',
              }}
            >
              {item.autoVerifyEnabled ? 'Auto ON' : 'Auto OFF'}
            </Text>
          </View>
        </View>

        <Text style={[s.cardCity, { color: colors.text + '99' }]}>{item.city}</Text>

        {item.emailDomains.length > 0 && (
          <Text style={[s.cardDomains, { color: colors.tint }]}>
            📧 {item.emailDomains.join(', ')}
          </Text>
        )}

        <View style={s.cardStats}>
          <Text style={{ fontSize: 12, color: '#16a34a' }}>
            ✓ {item.verifiedCount || 0} verified
          </Text>
          <Text style={{ fontSize: 12, color: '#f59e0b' }}>
            ⏳ {item.pendingCount || 0} pending
          </Text>
        </View>

        <View style={s.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={s.actionBtn}>
            <Ionicons name="create-outline" size={16} color={colors.tint} />
            <Text style={{ fontSize: 13, color: colors.tint, marginLeft: 4 }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={s.actionBtn}>
            <Ionicons name="trash-outline" size={16} color="#dc2626" />
            <Text style={{ fontSize: 13, color: '#dc2626', marginLeft: 4 }}>Deactivate</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [colors]
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Verified Institutions</Text>
        <TouchableOpacity
          onPress={openCreateModal}
          style={[s.addButton, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={[
          s.searchInput,
          {
            backgroundColor: colors.background,
            borderColor: colors.text + '30',
            color: colors.text,
          },
        ]}
        placeholder="Search institutions..."
        placeholderTextColor={colors.text + '66'}
        value={search}
        onChangeText={setSearch}
      />

      {/* Filter chips */}
      <View style={s.chipRow}>
        {(['all', 'college', 'company'] as FilterType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.chip, filterType === t && { backgroundColor: colors.tint }]}
            onPress={() => setFilterType(t)}
          >
            <Text style={[s.chipText, filterType === t && { color: '#fff' }]}>
              {t === 'all' ? 'All' : t === 'college' ? '🎓 Colleges' : '💼 Companies'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={institutions}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={() => hasMore && loadData(page + 1, true)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
          ) : (
            <Text style={[s.emptyText, { color: colors.text + '66' }]}>
              No institutions found
            </Text>
          )
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {editingId ? 'Edit Institution' : 'Add Institution'}
            </Text>

            <ScrollView>
              <Text style={[s.formLabel, { color: colors.text }]}>Name *</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.text + '30' }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Institution name"
                placeholderTextColor={colors.text + '66'}
              />

              <Text style={[s.formLabel, { color: colors.text }]}>Type</Text>
              <View style={s.chipRow}>
                {(['college', 'company'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.chip, formType === t && { backgroundColor: colors.tint }]}
                    onPress={() => setFormType(t)}
                  >
                    <Text style={[s.chipText, formType === t && { color: '#fff' }]}>
                      {t === 'college' ? 'College' : 'Company'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.formLabel, { color: colors.text }]}>Email Domains</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.text + '30' }]}
                value={formDomains}
                onChangeText={setFormDomains}
                placeholder="domain1.edu, domain2.edu"
                placeholderTextColor={colors.text + '66'}
              />
              <Text style={{ fontSize: 11, color: colors.text + '66', marginBottom: 12 }}>
                Comma-separated. Students with these emails get instant verification.
              </Text>

              <Text style={[s.formLabel, { color: colors.text }]}>Aliases</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.text + '30' }]}
                value={formAliases}
                onChangeText={setFormAliases}
                placeholder="Short names, abbreviations"
                placeholderTextColor={colors.text + '66'}
              />

              <Text style={[s.formLabel, { color: colors.text }]}>City *</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.text + '30' }]}
                value={formCity}
                onChangeText={setFormCity}
                placeholder="City"
                placeholderTextColor={colors.text + '66'}
              />

              <View style={s.switchRow}>
                <Text style={[s.formLabel, { color: colors.text, marginBottom: 0 }]}>
                  Auto-Verify
                </Text>
                <Switch value={formAutoVerify} onValueChange={setFormAutoVerify} />
              </View>
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[s.modalBtn, { borderColor: colors.text + '30' }]}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[s.modalBtn, { backgroundColor: colors.tint }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {editingId ? 'Update' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

