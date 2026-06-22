/**
 * ApprovalCenterScreen - Business approval workflows
 *
 * Features:
 * - Pending approvals
 * - Approval history
 * - Batch approve/reject
 * - Delegation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type ActionType = 'message' | 'email' | 'campaign' | 'budget' | 'task';

interface Approval {
  id: string;
  title: string;
  description: string;
  type: ActionType;
  requestedBy: string;
  persona: string;
  timestamp: Date;
  status: ApprovalStatus;
  priority: 'low' | 'medium' | 'high';
  amount?: number;
}

export default function ApprovalCenterScreen() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [approvals, setApprovals] = useState<Approval[]>([
    {
      id: '1',
      title: 'Send Welcome Email',
      description: 'Welcome email to 50 new leads',
      type: 'email',
      requestedBy: 'Sales Bot',
      persona: 'Founder',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'pending',
      priority: 'medium',
    },
    {
      id: '2',
      title: '₹50,000 Campaign Budget',
      description: 'Q2 social media campaign',
      type: 'budget',
      requestedBy: 'Marketing AI',
      persona: 'Sales',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      status: 'pending',
      priority: 'high',
      amount: 50000,
    },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const pending = approvals.filter(a => a.status === 'pending');
  const history = approvals.filter(a => a.status !== 'pending');

  const handleApprove = (id: string) => {
    setApprovals(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'approved' as ApprovalStatus } : a
    ));
  };

  const handleReject = (id: string) => {
    setApprovals(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'rejected' as ApprovalStatus } : a
    ));
  };

  const handleBatchApprove = () => {
    setApprovals(prev => prev.map(a =>
      selectedIds.includes(a.id) ? { ...a, status: 'approved' as ApprovalStatus } : a
    ));
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getTypeIcon = (type: ActionType) => {
    switch (type) {
      case 'email': return 'mail';
      case 'message': return 'chatbubbles';
      case 'campaign': return 'megaphone';
      case 'budget': return 'cash';
      case 'task': return 'checkbox';
    }
  };

  const getTypeColor = (type: ActionType) => {
    switch (type) {
      case 'email': return '#6366F1';
      case 'message': return '#10B981';
      case 'campaign': return '#EC4899';
      case 'budget': return '#F59E0B';
      case 'task': return '#8B5CF6';
    }
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Approvals</Text>
          <Text style={styles.subtitle}>{pending.length} pending</Text>
        </View>
        {selectedIds.length > 0 && (
          <TouchableOpacity style={styles.batchButton} onPress={handleBatchApprove}>
            <Ionicons name="checkmark-done" size={20} color="#10B981" />
            <Text style={styles.batchText}>Approve {selectedIds.length}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending
          </Text>
          {pending.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pending.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {activeTab === 'pending' && pending.map(approval => (
          <View key={approval.id} style={[styles.card, selectedIds.includes(approval.id) && styles.cardSelected]}>
            <TouchableOpacity style={styles.cardSelect} onPress={() => toggleSelect(approval.id)}>
              <View style={[styles.checkbox, selectedIds.includes(approval.id) && styles.checkboxSelected]}>
                {selectedIds.includes(approval.id) && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>

            <View style={[styles.typeIcon, { backgroundColor: getTypeColor(approval.type) + '20' }]}>
              <Ionicons name={getTypeIcon(approval.type) as any} size={20} color={getTypeColor(approval.type)} />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{approval.title}</Text>
              <Text style={styles.cardDesc}>{approval.description}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>
                  {approval.persona} • {formatTime(approval.timestamp)}
                </Text>
                {approval.amount && (
                  <Text style={styles.amount}>₹{approval.amount.toLocaleString()}</Text>
                )}
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(approval.id)}>
                <Ionicons name="close" size={18} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(approval.id)}>
                <Ionicons name="checkmark" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {activeTab === 'history' && history.map(approval => (
          <View key={approval.id} style={styles.historyCard}>
            <Ionicons
              name={approval.status === 'approved' ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={approval.status === 'approved' ? '#10B981' : '#EF4444'}
            />
            <View style={styles.historyContent}>
              <Text style={styles.historyTitle}>{approval.title}</Text>
              <Text style={styles.historyMeta}>
                {approval.persona} • {formatTime(approval.timestamp)}
              </Text>
            </View>
            <Text style={[styles.historyStatus, { color: approval.status === 'approved' ? '#10B981' : '#EF4444' }]}>
              {approval.status}
            </Text>
          </View>
        ))}

        {activeTab === 'pending' && pending.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No pending approvals</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  batchButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8 },
  batchText: { color: '#10B981', fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', gap: 8 },
  tabActive: { backgroundColor: 'rgba(99,102,241,0.2)' },
  tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#6366F1' },
  tabBadge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tabBadgeText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardSelected: { borderWidth: 1, borderColor: '#6366F1' },
  cardSelect: { marginRight: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#666', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  typeIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  cardDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  metaText: { fontSize: 12, color: '#666' },
  amount: { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8 },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.2)', justifyContent: 'center', alignItems: 'center' },
  approveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 8 },
  historyContent: { flex: 1, marginLeft: 12 },
  historyTitle: { fontSize: 14, color: '#FFF' },
  historyMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  historyStatus: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#10B981', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
});
