/**
 * ActionsScreen - Smart Actions & Approvals
 *
 * NOT "Tasks" - this is Hojai's action engine
 * Suggests, schedules, requires approval
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

type ActionStatus = 'suggested' | 'pending' | 'scheduled' | 'completed';
type ActionType = 'message' | 'email' | 'meeting' | 'follow_up' | 'campaign';

interface Action {
  id: string;
  title: string;
  description: string;
  type: ActionType;
  status: ActionStatus;
  target?: string;
  scheduledFor?: string;
  priority: number;
  approved?: boolean;
}

export default function ActionsScreen() {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'pending' | 'today' | 'completed'>('suggestions');

  // Mock data
  const suggestions: Action[] = [
    { id: '1', title: 'Follow up with Rahul', description: 'Hasn\'t responded in 3 days', type: 'follow_up', status: 'suggested', priority: 8 },
    { id: '2', title: 'Send weekly update', description: 'Time for weekly team update', type: 'message', status: 'suggested', priority: 7 },
    { id: '3', title: 'Monthly newsletter', description: 'Monthly customer newsletter', type: 'campaign', status: 'suggested', priority: 6 },
  ];

  const pending: Action[] = [
    { id: '4', title: 'Approve campaign budget', description: '₹50,000 for Q3 campaign', type: 'campaign', status: 'pending', priority: 9, approved: false },
    { id: '5', title: 'Review proposal', description: 'New vendor proposal', type: 'message', status: 'pending', priority: 8, approved: false },
  ];

  const today: Action[] = [
    { id: '6', title: 'Team meeting', description: '10:00 AM', type: 'meeting', status: 'scheduled', scheduledFor: '10:00 AM' },
    { id: '7', title: 'Send proposal', description: 'To ABC Corp', type: 'email', status: 'completed' },
    { id: '8', title: 'Follow up NeXha', description: 'About partnership', type: 'follow_up', status: 'completed' },
  ];

  const completed: Action[] = [
    { id: '9', title: 'Sent welcome email', description: 'To new leads', type: 'email', status: 'completed' },
    { id: '10', title: 'Scheduled demo', description: 'With prospect', type: 'meeting', status: 'completed' },
  ];

  const getActiveData = () => {
    switch (activeTab) {
      case 'suggestions': return suggestions;
      case 'pending': return pending;
      case 'today': return today;
      case 'completed': return completed;
    }
  };

  const getTabCount = (tab: typeof activeTab) => {
    switch (tab) {
      case 'suggestions': return suggestions.length;
      case 'pending': return pending.length;
      case 'today': return today.filter(a => a.status === 'scheduled').length;
      case 'completed': return completed.length;
    }
  };

  const getTypeIcon = (type: ActionType) => {
    switch (type) {
      case 'message': return 'chatbubbles';
      case 'email': return 'mail';
      case 'meeting': return 'calendar';
      case 'follow_up': return 'refresh';
      case 'campaign': return 'megaphone';
    }
  };

  const getTypeColor = (type: ActionType) => {
    switch (type) {
      case 'message': return '#6366F1';
      case 'email': return '#10B981';
      case 'meeting': return '#F59E0B';
      case 'follow_up': return '#8B5CF6';
      case 'campaign': return '#EC4899';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Actions</Text>
        <Text style={styles.subtitle}>Hojai handles the work</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['suggestions', 'pending', 'today', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {getTabCount(tab) > 0 && (
              <View style={[styles.tabBadge, tab === 'pending' && styles.tabBadgeRed]}>
                <Text style={styles.tabBadgeText}>{getTabCount(tab)}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <StatCard icon="checkmark-circle" value="8" label="Done today" color="#10B981" />
        <StatCard icon="time" value="5" label="Scheduled" color="#F59E0B" />
        <StatCard icon="flash" value="12" label="Suggestions" color="#6366F1" />
      </View>

      {/* Actions List */}
      <ScrollView style={styles.list}>
        {activeTab === 'suggestions' && (
          <View>
            <Text style={styles.sectionTitle}>Hojai suggests</Text>
            {suggestions.map((action) => (
              <ActionCard key={action.id} action={action} typeIcon={getTypeIcon(action.type)} color={getTypeColor(action.type)} />
            ))}
          </View>
        )}

        {activeTab === 'pending' && (
          <View>
            <Text style={styles.sectionTitle}>Needs your approval</Text>
            {pending.map((action) => (
              <ApprovalCard key={action.id} action={action} typeIcon={getTypeIcon(action.type)} color={getTypeColor(action.type)} />
            ))}
          </View>
        )}

        {activeTab === 'today' && (
          <View>
            <Text style={styles.sectionTitle}>Today's schedule</Text>
            {today.map((action) => (
              <ScheduledCard key={action.id} action={action} typeIcon={getTypeIcon(action.type)} color={getTypeColor(action.type)} />
            ))}
          </View>
        )}

        {activeTab === 'completed' && (
          <View>
            <Text style={styles.sectionTitle}>Recently done</Text>
            {completed.map((action) => (
              <CompletedCard key={action.id} action={action} typeIcon={getTypeIcon(action.type)} color={getTypeColor(action.type)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActionCard({ action, typeIcon, color }: { action: Action; typeIcon: string; color: string }) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={typeIcon as any} size={20} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{action.title}</Text>
        <Text style={styles.cardDesc}>{action.description}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.approveButton}>
          <Ionicons name="checkmark" size={20} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ApprovalCard({ action, typeIcon, color }: { action: Action; typeIcon: string; color: string }) {
  return (
    <View style={[styles.card, styles.approvalCard]}>
      <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={typeIcon as any} size={20} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{action.title}</Text>
        <Text style={styles.cardDesc}>{action.description}</Text>
      </View>
      <View style={styles.approvalButtons}>
        <TouchableOpacity style={styles.rejectButton}>
          <Ionicons name="close" size={18} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveFullButton}>
          <Ionicons name="checkmark" size={18} color="#FFF" />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ScheduledCard({ action, typeIcon, color }: { action: Action; typeIcon: string; color: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.timeBadge}>
        <Text style={styles.timeText}>{action.scheduledFor}</Text>
      </View>
      <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={typeIcon as any} size={20} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{action.title}</Text>
        <Text style={styles.cardDesc}>{action.description}</Text>
      </View>
      <View style={styles.statusBadge}>
        <Ionicons name="time" size={14} color="#F59E0B" />
      </View>
    </View>
  );
}

function CompletedCard({ action, typeIcon, color }: { action: Action; typeIcon: string; color: string }) {
  return (
    <View style={[styles.card, styles.completedCard]}>
      <View style={[styles.cardIcon, styles.completedIcon]}>
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.completedTitle}>{action.title}</Text>
        <Text style={styles.cardDesc}>{action.description}</Text>
      </View>
    </View>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4,
  },
  tabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#6366F1',
  },
  tabBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 6,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeRed: {
    backgroundColor: '#EF4444',
  },
  tabBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  cardDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  approveText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  timeBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCard: {
    opacity: 0.7,
  },
  completedIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
});
