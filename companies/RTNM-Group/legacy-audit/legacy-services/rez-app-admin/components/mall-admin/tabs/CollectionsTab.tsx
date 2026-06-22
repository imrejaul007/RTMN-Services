/**
 * components/mall-admin/tabs/CollectionsTab.tsx
 * ADM-005: Mall collections tab.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MallCollection } from '../../../services/api/mall';
import { Colors } from '../../../constants/Colors';

type ColorsType = typeof Colors.light;

interface Props {
	colors: ColorsType;
	collections: MallCollection[];
	loading: boolean;
	processingId: string | null;
	onRefresh: () => void;
	onEdit: (collection: MallCollection) => void;
	onDelete: (collection: MallCollection) => void;
	onToggleActive: (collection: MallCollection) => void;
}

export function CollectionsTab({ colors, collections, loading, processingId, onRefresh, onEdit, onDelete, onToggleActive }: Props) {
	const renderItem = ({ item }: { item: MallCollection }) => {
		const isProcessing = processingId === item._id;
		return (
			<View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={s.cardRow}>
					{item.image ? (
						<Image source={{ uri: item.image }} style={s.colThumb} />
					) : (
						<View style={[s.colThumb, { backgroundColor: colors.tint + '30' }]}>
							<Ionicons name="albums" size={20} color={colors.tint} />
						</View>
					)}
					<View style={s.colInfo}>
						<Text style={[s.colName, { color: colors.text }]}>{item.name}</Text>
						<Text style={[s.colMeta, { color: colors.icon }]}>{item.type} · {item.brandCount} brands</Text>
						<View style={[s.typeChip, { backgroundColor: colors.tint + '20' }]}>
							<Text style={[s.typeChipText, { color: colors.tint }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
						</View>
					</View>
				</View>
				<View style={s.cardActions}>
					<TouchableOpacity style={[s.toggleBtn, { backgroundColor: item.isActive ? colors.tint + '20' : colors.border + '80' }]} onPress={() => onToggleActive(item)} disabled={isProcessing}>
						<Ionicons name={item.isActive ? 'pause' : 'play'} size={14} color={item.isActive ? colors.tint : colors.icon} />
					</TouchableOpacity>
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
				<FlatList data={collections} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={{ padding: 12, gap: 10 }} refreshing={loading} onRefresh={onRefresh}
					ListEmptyComponent={<Text style={[s.emptyText, { color: colors.icon }]}>No collections yet</Text>} />
			)}
		</View>
	);
}

const s = StyleSheet.create({
	container: { flex: 1 },
	card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
	cardRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
	colThumb: { width: 64, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	colInfo: { flex: 1, justifyContent: 'center' },
	colName: { fontSize: 15, fontWeight: '600' },
	colMeta: { fontSize: 12, marginTop: 2 },
	typeChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginTop: 4 },
	typeChipText: { fontSize: 11, fontWeight: '600' },
	cardActions: { flexDirection: 'row', gap: 6 },
	toggleBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
