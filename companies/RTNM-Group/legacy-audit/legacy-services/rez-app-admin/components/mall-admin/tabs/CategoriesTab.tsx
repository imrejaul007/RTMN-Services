/**
 * components/mall-admin/tabs/CategoriesTab.tsx
 * ADM-005: Mall categories tab.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MallCategory } from '../../../services/api/mall';
import { Colors } from '../../../constants/Colors';

type ColorsType = typeof Colors.light;

interface Props {
	colors: ColorsType;
	categories: MallCategory[];
	loading: boolean;
	processingId: string | null;
	onRefresh: () => void;
	onEdit: (category: MallCategory) => void;
	onDelete: (category: MallCategory) => void;
}

export function CategoriesTab({ colors, categories, loading, processingId, onRefresh, onEdit, onDelete }: Props) {
	const renderItem = ({ item }: { item: MallCategory }) => {
		const isProcessing = processingId === item._id;
		return (
			<View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={s.cardLeft}>
					{item.icon ? <Text style={s.catIcon}>{item.icon}</Text> : null}
					<View style={s.catInfo}>
						<Text style={[s.catName, { color: colors.text }]}>{item.name}</Text>
						<Text style={[s.catMeta, { color: colors.icon }]}>{item.brandCount ?? 0} brands · {item.isActive ? 'Active' : 'Inactive'}</Text>
					</View>
				</View>
				<View style={s.cardActions}>
					<TouchableOpacity style={s.actionBtn} onPress={() => onEdit(item)} disabled={isProcessing}>
						<Ionicons name="pencil" size={16} color={colors.tint} />
					</TouchableOpacity>
					<TouchableOpacity style={s.actionBtn} onPress={() => onDelete(item)} disabled={isProcessing}>
						{isProcessing ? <ActivityIndicator size="small" /> : <Ionicons name="trash" size={16} color="#ef4444" />}
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	return (
		<View style={[s.container, { backgroundColor: colors.background }]}>
			{loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
				<FlatList data={categories} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={{ padding: 12, gap: 8 }} refreshing={loading} onRefresh={onRefresh}
					ListEmptyComponent={<Text style={[s.emptyText, { color: colors.icon }]}>No categories yet</Text>} />
			)}
		</View>
	);
}

const s = StyleSheet.create({
	container: { flex: 1 },
	card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
	cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
	catIcon: { fontSize: 28 },
	catInfo: { flex: 1 },
	catName: { fontSize: 15, fontWeight: '600' },
	catMeta: { fontSize: 12, marginTop: 2 },
	cardActions: { flexDirection: 'row', gap: 6 },
	actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
