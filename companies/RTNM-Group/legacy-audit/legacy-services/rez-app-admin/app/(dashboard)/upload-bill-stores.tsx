import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { uploadBillStoresService, UploadBillStore } from '../../services/api/uploadBillStores';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/upload-bill-stores.styles';

export default function UploadBillStoresScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [stores, setStores] = useState<UploadBillStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<UploadBillStore | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCoinsPerRupee, setFormCoinsPerRupee] = useState('1');
  const [formMaxCoins, setFormMaxCoins] = useState('500');
  const [formMinBill, setFormMinBill] = useState('100');
  const [formVerificationRequired, setFormVerificationRequired] = useState(true);
  const [formVerificationTime, setFormVerificationTime] = useState('24-48 hours');
  const [formPriority, setFormPriority] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchStores = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await uploadBillStoresService.getStores(params);
      if (response.success && response.data) {
        setStores(response.data.stores || []);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load stores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, debouncedSearch]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const resetForm = () => {
    setFormName('');
    setFormLogo('');
    setFormCategory('');
    setFormCoinsPerRupee('1');
    setFormMaxCoins('500');
    setFormMinBill('100');
    setFormVerificationRequired(true);
    setFormVerificationTime('24-48 hours');
    setFormPriority('0');
    setFormIsActive(true);
    setEditingStore(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (store: UploadBillStore) => {
    setEditingStore(store);
    setFormName(store.name);
    setFormLogo(store.logo || '');
    setFormCategory(store.category);
    setFormCoinsPerRupee(String(store.coinsPerRupee));
    setFormMaxCoins(String(store.maxCoinsPerBill));
    setFormMinBill(String(store.minBillAmount));
    setFormVerificationRequired(store.verificationRequired);
    setFormVerificationTime(store.verificationTime);
    setFormPriority(String(store.priority));
    setFormIsActive(store.isActive);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formCategory) {
      showAlert('Error', 'Name and category are required');
      return;
    }

    // MED-7 FIX: Validate numeric inputs before parsing instead of silently replacing NaN with defaults
    const coinsPerRupee = parseFloat(formCoinsPerRupee);
    if (isNaN(coinsPerRupee) || coinsPerRupee <= 0) {
      showAlert('Validation Error', 'Coins per rupee must be a valid positive number');
      return;
    }

    const maxCoinsPerBill = parseInt(formMaxCoins);
    if (isNaN(maxCoinsPerBill) || maxCoinsPerBill <= 0) {
      showAlert('Validation Error', 'Max coins per bill must be a valid positive number');
      return;
    }

    const minBillAmount = parseInt(formMinBill);
    if (isNaN(minBillAmount) || minBillAmount <= 0) {
      showAlert('Validation Error', 'Min bill amount must be a valid positive number');
      return;
    }

    const priority = parseInt(formPriority);
    if (isNaN(priority) || priority < 0) {
      showAlert('Validation Error', 'Priority must be a valid non-negative number');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        name: formName,
        logo: formLogo || undefined,
        category: formCategory,
        coinsPerRupee,
        maxCoinsPerBill,
        minBillAmount,
        verificationRequired: formVerificationRequired,
        verificationTime: formVerificationTime,
        priority,
        isActive: formIsActive,
      };
      if (editingStore) {
        await uploadBillStoresService.updateStore(editingStore._id, data);
      } else {
        await uploadBillStoresService.createStore(data);
      }
      setShowModal(false);
      resetForm();
      fetchStores();
      showAlert('Success', editingStore ? 'Store updated' : 'Store created');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (store: UploadBillStore) => {
    try {
      await uploadBillStoresService.toggleStore(store._id);
      fetchStores();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleDelete = async (store: UploadBillStore) => {
    const confirmed = await showConfirm('Delete Store', `Delete "${store.name}"?`);
    if (!confirmed) return;
    try {
      await uploadBillStoresService.deleteStore(store._id);
      fetchStores();
      showAlert('Success', 'Store deleted');
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const stats = {
    total: stores.length,
    active: stores.filter((s) => s.isActive).length,
    inactive: stores.filter((s) => !s.isActive).length,
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchStores();
          }}
        />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text }]}>Upload Bill Stores</Text>
          <Text style={[s.subtitle, { color: colors.icon }]}>
            Manage bill upload cashback stores
          </Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.tint }]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={s.addBtnText}>Add Store</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: colors.info },
          { label: 'Active', value: stats.active, color: colors.success },
          { label: 'Inactive', value: stats.inactive, color: colors.error },
        ].map((stat) => (
          <View
            key={stat.label}
            style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[s.statLabel, { color: colors.icon }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <View style={s.filtersRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && { backgroundColor: colors.tint }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && { color: colors.card }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View
        style={[
          s.searchBar,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search stores..."
          placeholderTextColor={colors.icon}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Store Cards */}
      {stores.map((store) => (
        <View
          key={store._id}
          style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={s.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>{store.name}</Text>
              <Text style={[s.cardMeta, { color: colors.icon }]}>{store.category}</Text>
            </View>
            <Switch value={store.isActive} onValueChange={() => handleToggle(store)} />
          </View>
          <View style={s.cardDetails}>
            <View style={s.detailItem}>
              <Text style={[s.detailLabel, { color: colors.icon }]}>Coins/Rupee</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {store.coinsPerRupee}
              </Text>
            </View>
            <View style={s.detailItem}>
              <Text style={[s.detailLabel, { color: colors.icon }]}>Max Coins</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {store.maxCoinsPerBill}
              </Text>
            </View>
            <View style={s.detailItem}>
              <Text style={[s.detailLabel, { color: colors.icon }]}>Min Bill</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {store.minBillAmount}
              </Text>
            </View>
            <View style={s.detailItem}>
              <Text style={[s.detailLabel, { color: colors.icon }]}>Uploads</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>{store.totalUploads}</Text>
            </View>
          </View>
          <View style={s.cardActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(store)}>
              <Ionicons name="pencil" size={16} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(store)}>
              <Ionicons name="trash" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {stores.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.icon} />
          <Text style={[s.emptyText, { color: colors.icon }]}>
            No upload bill stores found
          </Text>
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <ScrollView>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {editingStore ? 'Edit Store' : 'Create Store'}
              </Text>
              {[
                {
                  label: 'Store Name *',
                  value: formName,
                  setter: setFormName,
                  placeholder: 'Store name',
                },
                {
                  label: 'Logo URL',
                  value: formLogo,
                  setter: setFormLogo,
                  placeholder: 'https://...',
                },
                {
                  label: 'Category *',
                  value: formCategory,
                  setter: setFormCategory,
                  placeholder: 'e.g. restaurants',
                },
                {
                  label: 'Coins Per Rupee',
                  value: formCoinsPerRupee,
                  setter: setFormCoinsPerRupee,
                  placeholder: '1',
                  keyboard: 'decimal-pad' as const,
                },
                {
                  label: 'Max Coins Per Bill',
                  value: formMaxCoins,
                  setter: setFormMaxCoins,
                  placeholder: '500',
                  keyboard: 'number-pad' as const,
                },
                {
                  label: 'Min Bill Amount',
                  value: formMinBill,
                  setter: setFormMinBill,
                  placeholder: '100',
                  keyboard: 'number-pad' as const,
                },
                {
                  label: 'Verification Time',
                  value: formVerificationTime,
                  setter: setFormVerificationTime,
                  placeholder: '24-48 hours',
                },
                {
                  label: 'Priority',
                  value: formPriority,
                  setter: setFormPriority,
                  placeholder: '0',
                  keyboard: 'number-pad' as const,
                },
              ].map((field) => (
                <View key={field.label} style={s.formField}>
                  <Text style={[s.formLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[
                      s.formInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    value={field.value}
                    onChangeText={field.setter}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.icon}
                    keyboardType={field.keyboard}
                  />
                </View>
              ))}
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>
                  Verification Required
                </Text>
                <Switch
                  value={formVerificationRequired}
                  onValueChange={setFormVerificationRequired}
                />
              </View>
              <View style={s.formField}>
                <Text style={[s.formLabel, { color: colors.text }]}>Active</Text>
                <Switch value={formIsActive} onValueChange={setFormIsActive} />
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.secondaryText }]}
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Text style={s.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: colors.tint }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.card} size="small" />
                  ) : (
                    <Text style={s.modalBtnText}>{editingStore ? 'Update' : 'Create'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

