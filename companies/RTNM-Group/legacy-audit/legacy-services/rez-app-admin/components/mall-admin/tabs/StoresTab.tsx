/**
 * components/mall-admin/tabs/StoresTab.tsx
 * ADM-005: Mall managed stores tab.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ManagedMallStore } from '../../../services/api/mall';
import { Colors } from '../../../constants/Colors';

type ColorsType = typeof Colors.light;

interface Props {
	colors: ColorsType;
	managedStores: ManagedMallStore[];
	managedStoresSearch: string;
	managedStoresFilter: 'all' | 'mall' | 'non-mall';
	managedStoresLoading: boolean;
	processingManagedStore: string | null;
	onSearchChange: (v: string) => void;
	onFilterChange: (v: 'all' | 'mall' | 'non-mall') => void;
	onRefresh: () => void;
	onToggleMall: (store: ManagedMallStore) => void;
	onToggleFeatured: (store: ManagedMallStore) => void;
	onTogglePremium: (store: ManagedMallStore) => void;
}

export function StoresTab({ colors, managedStores, managedStoresSearch, managedStoresFilter, managedStoresLoading, processingManagedStore, onSearchChange, onFilterChange, onRefresh, onToggleMall, onToggleFeatured, onTogglePremium }: Props) {
	const filtered = managedStores.filter((s) => {
		if (managedStoresFilter === 'mall') return s.deliveryCategories?.mall;
		if (managedStoresFilter === 'non-mall') return !s.deliveryCategories?.mall;
		return true;
	}).filter((s) => s.name.toLowerCase().includes(managedStoresSearch.toLowerCase()));

	const renderItem = ({ item }: { item: ManagedMallStore }) => {
		const isProcessing = processingManagedStore === item._id;
		return (
			<View style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={s.rowLeft}>
					<Text style={[s.rowName, { color: colors.text }]}>{item.name}</Text>
					{item.deliveryCategories?.mall && (
						<View style={[s.badge, { backgroundColor: colors.tint + '20' }]}>
							<Text style={[s.badgeText, { color: colors.tint }]}>Mall</Text>
						</View>
					)}
					{item.isFeatured && (
						<View style={[s.badge, { backgroundColor: '#f59e0b20' }]}>
							<Text style={[s.badgeText, { color: '#f59e0b' }]}>Featured</Text>
						</View>
					)}
				</View>
				<View style={s.rowActions}>
					<TouchableOpacity style={[s.actionBtn, { backgroundColor: item.deliveryCategories?.mall ? colors.tint + '20' : colors.border + '80' }]} onPress={() => onToggleMall(item)} disabled={isProcessing}>
						{isProcessing ? <ActivityIndicator size="small" /> : <Ionicons name={item.deliveryCategories?.mall ? 'close' : 'add'} size={16} color={item.deliveryCategories?.mall ? colors.tint : colors.icon} />}
					</TouchableOpacity>
					{item.deliveryCategories?.mall && (
						<>
							<TouchableOpacity style={[s.actionBtn, { backgroundColor: item.isFeatured ? colors.tint + '20' : colors.border + '80' }]} onPress={() => onToggleFeatured(item)} disabled={isProcessing}>
								<Ionicons name="star" size={16} color={item.isFeatured ? colors.tint : colors.icon} />
							</TouchableOpacity>
							<TouchableOpacity style={[s.actionBtn, { backgroundColor: item.deliveryCategories?.premium ? '#f59e0b20' : colors.border + '80' }]} onPress={() => onTogglePremium(item)} disabled={isProcessing}>
								<Ionicons name="diamond" size={16} color={item.deliveryCategories?.premium ? '#f59e0b' : colors.icon} />
							</TouchableOpacity>
						</>
					)}
				</View>
			</View>
		);
	};

	return (
		<View style={[s.container, { backgroundColor: colors.background }]}>
			<View style={[s.searchRow, { borderColor: colors.border }]}>
				<TextInput style={[s.searchInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholder="Search stores..." placeholderTextColor={colors.icon} value={managedStoresSearch} onChangeText={onSearchChange} />
				<View style={s.filterRow}>
					{(['all', 'mall', 'non-mall'] as const).map((f) => (
						<TouchableOpacity key={f} style={[s.filterBtn, managedStoresFilter === f && { backgroundColor: colors.tint }]} onPress={() => onFilterChange(f)}>
							<Text style={[s.filterText, { color: managedStoresFilter === f ? colors.card : colors.icon }]}>{f === 'all' ? 'All' : f === 'mall' ? 'In Mall' : 'Not in Mall'}</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>
			{managedStoresLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
				<FlatList data={filtered} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={{ padding: 12, gap: 8 }} refreshing={managedStoresLoading} onRefresh={onRefresh} />
			)}
		</View>
	);
}

const s = StyleSheet.create({
	container: { flex: 1 },
	searchRow: { padding: 12, gap: 8, borderBottomWidth: 1 },
	searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14 },
	filterRow: { flexDirection: 'row', gap: 8 },
	filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
	filterText: { fontSize: 12, fontWeight: '600' },
	row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
	rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
	rowName: { fontSize: 14, fontWeight: '600', flex: 1 },
	rowActions: { flexDirection: 'row', gap: 6 },
	actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
	badgeText: { fontSize: 11, fontWeight: '600' },
});
