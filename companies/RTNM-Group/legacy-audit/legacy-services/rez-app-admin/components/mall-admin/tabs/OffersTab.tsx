/**
 * components/mall-admin/tabs/OffersTab.tsx
 * ADM-005: Mall offers tab.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MallOffer } from '../../../services/api/mall';
import { Colors } from '../../../constants/Colors';

type ColorsType = typeof Colors.light;

interface Props {
	colors: ColorsType;
	offers: MallOffer[];
	loading: boolean;
	processingId: string | null;
	onRefresh: () => void;
	onEdit: (offer: MallOffer) => void;
	onDelete: (offer: MallOffer) => void;
	onToggleActive: (offer: MallOffer) => void;
}

export function OffersTab({ colors, offers, loading, processingId, onRefresh, onEdit, onDelete, onToggleActive }: Props) {
	const renderItem = ({ item }: { item: MallOffer }) => {
		const isProcessing = processingId === item._id;
		return (
			<View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={s.cardTop}>
					<View style={s.offerInfo}>
						<Text style={[s.offerTitle, { color: colors.text }]}>{item.title}</Text>
						<Text style={[s.offerMeta, { color: colors.icon }]}>{item.offerType} · {item.value}{item.valueType === 'percentage' ? '%' : '₹'} · {item.isActive ? 'Active' : 'Inactive'}</Text>
					</View>
					<View style={[{ backgroundColor: item.isMallExclusive ? colors.tint + '20' : 'transparent', borderColor: item.isMallExclusive ? colors.tint : colors.border, borderWidth: item.isMallExclusive ? 1 : 0, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }]}>
						<Text style={[{ color: colors.tint, fontSize: 11, fontWeight: '600' }]}>{item.isMallExclusive ? 'Exclusive' : ''}</Text>
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
				<FlatList data={offers} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={{ padding: 12, gap: 8 }} refreshing={loading} onRefresh={onRefresh}
					ListEmptyComponent={<Text style={[s.emptyText, { color: colors.icon }]}>No offers yet</Text>} />
			)}
		</View>
	);
}

const s = StyleSheet.create({
	container: { flex: 1 },
	card: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
	cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
	offerInfo: { flex: 1 },
	offerTitle: { fontSize: 15, fontWeight: '600' },
	offerMeta: { fontSize: 12, marginTop: 2 },
	cardActions: { flexDirection: 'row', gap: 6 },
	toggleBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
