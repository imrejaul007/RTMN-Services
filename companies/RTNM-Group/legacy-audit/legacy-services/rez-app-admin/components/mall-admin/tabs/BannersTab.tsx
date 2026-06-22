/**
 * components/mall-admin/tabs/BannersTab.tsx
 * ADM-005: Mall banners tab.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MallBanner } from '../../../services/api/mall';
import { Colors } from '../../../constants/Colors';

type ColorsType = typeof Colors.light;

interface Props {
	colors: ColorsType;
	banners: MallBanner[];
	loading: boolean;
	processingId: string | null;
	onRefresh: () => void;
	onEdit: (banner: MallBanner) => void;
	onDelete: (banner: MallBanner) => void;
	onToggleActive: (banner: MallBanner) => void;
}

export function BannersTab({ colors, banners, loading, processingId, onRefresh, onEdit, onDelete, onToggleActive }: Props) {
	const renderItem = ({ item }: { item: MallBanner }) => {
		const isProcessing = processingId === item._id;
		return (
			<View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={s.cardRow}>
					{item.image ? (
						<Image source={{ uri: item.image }} style={s.bannerThumb} />
					) : (
						<View style={[s.bannerThumb, { backgroundColor: item.backgroundColor || colors.tint }]} />
					)}
					<View style={s.bannerInfo}>
						<Text style={[s.bannerTitle, { color: colors.text }]}>{item.title}</Text>
						<Text style={[s.bannerMeta, { color: colors.icon }]}>{item.position} · Priority: {item.priority}</Text>
						<View style={[s.statusChip, { backgroundColor: item.isActive ? '#22c55e20' : colors.border + '80' }]}>
							<Text style={[s.statusChipText, { color: item.isActive ? '#22c55e' : colors.icon }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
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
				<FlatList data={banners} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={{ padding: 12, gap: 10 }} refreshing={loading} onRefresh={onRefresh}
					ListEmptyComponent={<Text style={[s.emptyText, { color: colors.icon }]}>No banners yet</Text>} />
			)}
		</View>
	);
}

const s = StyleSheet.create({
	container: { flex: 1 },
	card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
	cardRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
	bannerThumb: { width: 72, height: 48, borderRadius: 8 },
	bannerInfo: { flex: 1, justifyContent: 'center' },
	bannerTitle: { fontSize: 14, fontWeight: '600' },
	bannerMeta: { fontSize: 12, marginTop: 2 },
	statusChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginTop: 4 },
	statusChipText: { fontSize: 11, fontWeight: '600' },
	cardActions: { flexDirection: 'row', gap: 6 },
	toggleBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
