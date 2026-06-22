/**
 * Perk Management Admin Screen
 * CRUD for karma perks — create, edit, activate/deactivate perks.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BAND_OPTIONS = ['starter', 'active', 'performer', 'leader', 'elite', 'pinnacle'];
const PERK_TYPES = ['discount', 'upgrade', 'access', 'cashback', 'coin_bonus'];

interface Perk {
  id: string;
  name: string;
  description: string;
  perkType: string;
  requiredBand: string;
  minKarmaScore: number;
  value: number;
  currency: string;
  claimsUsed: number;
  maxClaims?: number;
  isActive: boolean;
  validUntil: string;
}

// Mock data
const MOCK_PERKS: Perk[] = [
  { id: 'p1', name: '10% Off at Partner Cafe', description: 'Get 10% off your bill at Partner Cafe outlets', perkType: 'discount', requiredBand: 'active', minKarmaScore: 350, value: 10, currency: 'INR', claimsUsed: 47, maxClaims: 200, isActive: true, validUntil: '2026-06-30' },
  { id: 'p2', name: '50 Bonus Coins', description: 'Receive 50 bonus REZ coins on your next earn', perkType: 'coin_bonus', requiredBand: 'performer', minKarmaScore: 450, value: 50, currency: 'coins', claimsUsed: 23, isActive: true, validUntil: '2026-05-31' },
  { id: 'p3', name: 'VIP Event Access', description: 'Exclusive access to VIP volunteer events', perkType: 'access', requiredBand: 'leader', minKarmaScore: 600, value: 0, currency: '', claimsUsed: 8, isActive: true, validUntil: '2026-12-31' },
  { id: 'p4', name: '15% Cashback', description: '15% cashback on your next order', perkType: 'cashback', requiredBand: 'elite', minKarmaScore: 750, value: 15, currency: 'INR', claimsUsed: 5, isActive: false, validUntil: '2026-04-30' },
];

const BAND_COLORS: Record<string, string> = {
  starter: '#9CA3AF', active: '#10B981', performer: '#3B82F6',
  leader: '#8B5CF6', elite: '#F59E0B', pinnacle: '#EF4444',
};

const PERK_TYPE_ICONS: Record<string, string> = {
  discount: 'pricetag', access: 'key', coin_bonus: 'logo-bitcoin',
  cashback: 'cash', upgrade: 'arrow-up-circle',
};

export default function PerkManagement() {
  const [perks, setPerks] = useState<Perk[]>(MOCK_PERKS);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPerk, setEditingPerk] = useState<Perk | null>(null);
  const [form, setForm] = useState({ name: '', description: '', perkType: 'discount', requiredBand: 'active', value: '', currency: 'INR', maxClaims: '' });

  const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }, []);

  const openCreate = () => {
    setEditingPerk(null);
    setForm({ name: '', description: '', perkType: 'discount', requiredBand: 'active', value: '', currency: 'INR', maxClaims: '' });
    setShowModal(true);
  };

  const openEdit = (perk: Perk) => {
    setEditingPerk(perk);
    setForm({ name: perk.name, description: perk.description, perkType: perk.perkType, requiredBand: perk.requiredBand, value: String(perk.value), currency: perk.currency, maxClaims: perk.maxClaims ? String(perk.maxClaims) : '' });
    setShowModal(true);
  };

  const toggleActive = (perk: Perk) => {
    setPerks(prev => prev.map(p => p.id === perk.id ? { ...p, isActive: !p.isActive } : p));
  };

  const savePerk = () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Perk name is required'); return; }
    const newPerk: Perk = {
      id: editingPerk?.id ?? `p${Date.now()}`,
      name: form.name,
      description: form.description,
      perkType: form.perkType,
      requiredBand: form.requiredBand,
      minKarmaScore: 0, // computed from band
      value: parseInt(form.value) || 0,
      currency: form.currency,
      maxClaims: form.maxClaims ? parseInt(form.maxClaims) : undefined,
      claimsUsed: editingPerk?.claimsUsed ?? 0,
      isActive: editingPerk?.isActive ?? true,
      validUntil: editingPerk?.validUntil ?? '2026-12-31',
    };
    setPerks(prev => editingPerk ? prev.map(p => p.id === newPerk.id ? newPerk : p) : [...prev, newPerk]);
    setShowModal(false);
  };

  const renderPerk = ({ item }: { item: Perk }) => (
    <View style={[styles.perkCard, !item.isActive && styles.perkCardInactive]}>
      <View style={styles.perkHeader}>
        <View style={styles.perkInfo}>
          <View style={[styles.bandBadge, { backgroundColor: BAND_COLORS[item.requiredBand] + '22' }]}>
            <Text style={[styles.bandBadgeText, { color: BAND_COLORS[item.requiredBand] }]}>
              {item.requiredBand}
            </Text>
          </View>
          <Text style={styles.perkTypeLabel}>
            <Ionicons name={PERK_TYPE_ICONS[item.perkType] as any} size={12} color="#94A3B8" />
            {' '}{item.perkType.replace('_', ' ')}
          </Text>
        </View>
        <Switch value={item.isActive} onValueChange={() => toggleActive(item)} trackColor={{ true: '#3B82F6' }} />
      </View>
      <Text style={styles.perkName}>{item.name}</Text>
      <Text style={styles.perkDesc}>{item.description}</Text>
      <View style={styles.perkFooter}>
        <Text style={styles.perkMeta}>{item.claimsUsed} claims {item.maxClaims ? `/ ${item.maxClaims}` : ''}</Text>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
          <Ionicons name="pencil" size={14} color="#3B82F6" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Perk</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={perks}
        renderItem={renderPerk}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPerk ? 'Edit Perk' : 'Create Perk'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color="#94A3B8" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} placeholder="Perk name" placeholderTextColor="#475569" />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput style={styles.input} value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} placeholder="Description" placeholderTextColor="#475569" multiline />
              <Text style={styles.inputLabel}>Perk Type</Text>
              <View style={styles.optionRow}>
                {PERK_TYPES.map(type => (
                  <TouchableOpacity key={type} style={[styles.optionChip, form.perkType === type && styles.optionChipActive]} onPress={() => setForm(f => ({ ...f, perkType: type }))}>
                    <Text style={[styles.optionChipText, form.perkType === type && styles.optionChipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Required Band</Text>
              <View style={styles.optionRow}>
                {BAND_OPTIONS.map(band => (
                  <TouchableOpacity key={band} style={[styles.optionChip, form.requiredBand === band && styles.optionChipActive]} onPress={() => setForm(f => ({ ...f, requiredBand: band }))}>
                    <Text style={[styles.optionChipText, form.requiredBand === band && styles.optionChipTextActive]}>{band}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput style={styles.input} value={form.value} onChangeText={t => setForm(f => ({ ...f, value: t }))} keyboardType="numeric" placeholder="e.g. 10" placeholderTextColor="#475569" />
              <Text style={styles.inputLabel}>Currency</Text>
              <TextInput style={styles.input} value={form.currency} onChangeText={t => setForm(f => ({ ...f, currency: t }))} placeholder="INR or coins" placeholderTextColor="#475569" />
              <TouchableOpacity style={styles.saveBtn} onPress={savePerk}>
                <Text style={styles.saveBtnText}>{editingPerk ? 'Update' : 'Create'} Perk</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#F8FAFC' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  perkCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14 },
  perkCardInactive: { opacity: 0.6 },
  perkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  perkInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bandBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  bandBadgeText: { fontSize: 11, fontWeight: '700' },
  perkTypeLabel: { fontSize: 12, color: '#94A3B8', textTransform: 'capitalize' },
  perkName: { fontSize: 15, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  perkDesc: { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  perkFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perkMeta: { fontSize: 12, color: '#64748B' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  modalForm: { padding: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, color: '#F8FAFC', fontSize: 14 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip: { backgroundColor: '#0F172A', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  optionChipActive: { backgroundColor: '#3B82F6' },
  optionChipText: { fontSize: 12, color: '#94A3B8' },
  optionChipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
