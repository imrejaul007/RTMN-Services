import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { bbpsService } from '../../services/api/bbps';
import { s } from './styles/bbps-transactions.styles';

interface Transaction {
  _id: string;
  userId: string;
  provider: string;
  billType: string;
  amount: number;
  status: 'completed' | 'failed' | 'processing' | 'refunded';
  aggregatorRef: string;
  promoCoinsIssued: number;
  createdAt: string;
}

// DUMMY_TRANSACTIONS intentionally removed — do not use dummy data in production

const STATUS_COLORS: Record<string, { color: string; bgColor: string }> = {
  completed: { color: '#10B981', bgColor: '#D1FAE5' },
  failed: { color: '#EF4444', bgColor: '#FEE2E2' },
  processing: { color: '#F59E0B', bgColor: '#FEF3C7' },
  refunded: { color: '#8B5CF6', bgColor: '#EDE9FE' },
};

export default function BBPSTransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [statusFilter, transactions]);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const result = await bbpsService.getTransactions(1, 20);
      setTransactions(result.transactions);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  const filterTransactions = () => {
    if (statusFilter === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter((t) => t.status === statusFilter));
    }
  };

  const handleRefund = async () => {
    if (!selectedTransaction) return;
    try {
      setLoading(true);
      await bbpsService.refundTransaction(selectedTransaction._id);
      setTransactions((prev) =>
        prev.map((t) => (t._id === selectedTransaction._id ? { ...t, status: 'refunded' } : t))
      );
      showAlert('Success', 'Refund processed successfully');
      setShowRefundModal(false);
      setSelectedTransaction(null);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = ['User ID', 'Provider', 'Amount', 'Status', 'Coins Issued', 'Date'];
      const rows = filteredTransactions.map((t) => [
        t.userId,
        t.provider,
        `₹${t.amount}`,
        t.status,
        t.promoCoinsIssued,
        new Date(t.createdAt).toLocaleDateString(),
      ]);

      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

      await Share.share({
        message: csvContent,
        title: 'BBPS Transactions Export',
      });
    } catch (err: any) {
      showAlert('Error', 'Failed to export CSV');
    }
  };

  const renderStatusBadge = (status: Transaction['status']) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.processing;
    return (
      <View style={[s.statusBadge, { backgroundColor: colors.bgColor }]}>
        <Text style={[s.statusBadgeText, { color: colors.color }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isExpanded = expandedId === item._id;
    const canRefund = item.status === 'failed' || item.status === 'processing';

    return (
      <View
        style={[
          s.transactionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => setExpandedId(isExpanded ? null : item._id)}
          style={s.transactionMain}
        >
          <View style={s.transactionContent}>
            <Text style={[s.userIdText, { color: colors.icon }]}>
              {item.userId.substring(0, 12)}...
            </Text>
            <Text style={[s.providerText, { color: colors.text }]}>{item.provider}</Text>
            <Text style={[s.amountText, { color: colors.tint }]}>
              ₹{(item.amount ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={s.transactionRight}>
            {renderStatusBadge(item.status)}
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.icon}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[s.expandedContent, { borderTopColor: colors.border }]}>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.icon }]}>Ref:</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>{item.aggregatorRef}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.icon }]}>Coins:</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {item.promoCoinsIssued}
              </Text>
            </View>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.icon }]}>Type:</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>{item.billType}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.icon }]}>Date:</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {canRefund && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedTransaction(item);
                  setShowRefundModal(true);
                }}
                style={[s.refundButton, { backgroundColor: colors.error + '20' }]}
              >
                <Ionicons name="cash-outline" size={16} color={colors.error} />
                <Text style={[s.refundButtonText, { color: colors.error }]}>
                  Refund Transaction
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Transactions</Text>
          <Text style={[s.headerSubtitle, { color: colors.icon }]}>
            Total: {filteredTransactions.length}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleExportCSV}
          style={[s.exportButton, { backgroundColor: colors.success + '20' }]}
        >
          <Ionicons name="download" size={20} color={colors.success} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterContainer}
        contentContainerStyle={s.filterContent}
      >
        {['all', 'completed', 'failed', 'processing', 'refunded'].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setStatusFilter(status)}
            style={[
              s.filterChip,
              {
                backgroundColor: statusFilter === status ? colors.tint : colors.border,
              },
            ]}
          >
            <Text
              style={[
                s.filterChipText,
                {
                  color: statusFilter === status ? '#fff' : colors.text,
                  fontWeight: statusFilter === status ? '600' : '500',
                },
              ]}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transaction List */}
      {loading ? (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : fetchError ? (
        <View style={s.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[s.emptyText, { color: colors.text }]}>{fetchError}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          scrollEnabled
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={colors.icon} />
              <Text style={[s.emptyText, { color: colors.text }]}>No transactions found</Text>
            </View>
          }
        />
      )}

      {/* Refund Confirmation Modal */}
      <Modal visible={showRefundModal} transparent animationType="fade">
        <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View style={s.confirmIcon}>
              <Ionicons name="help-circle-outline" size={48} color={colors.warning} />
            </View>
            <Text style={[s.modalTitle, { color: colors.text }]}>Confirm Refund</Text>
            <Text style={[s.modalMessage, { color: colors.icon }]}>
              Are you sure you want to refund ₹{selectedTransaction?.amount} to{' '}
              {selectedTransaction?.userId}?
            </Text>
            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowRefundModal(false);
                  setSelectedTransaction(null);
                }}
                style={[s.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRefund}
                disabled={loading}
                style={[s.modalButton, { backgroundColor: colors.error }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalButtonText, { color: '#fff' }]}>Refund</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

