/**
 * TasksScreen - Pending Actions, Completed, Approvals
 *
 * Features:
 * - View pending tasks
 * - View completed tasks
 * - View tasks requiring approval
 * - Complete/Approve tasks
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFlowStore } from '../store/flowStore';
import { getTasks, updateTaskStatus } from '../services/flowApi';
import type { Task } from '../types';

type Tab = 'pending' | 'completed' | 'approvals';

export default function TasksScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { tasks, setTasks, updateTask, completeTask } = useFlowStore();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsRefreshing(true);
    try {
      const response = await getTasks('current_user');
      if (response.success) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleComplete = useCallback(async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'completed');
      completeTask(taskId);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }, [completeTask]);

  const handleApprove = useCallback(async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'in_progress');
      updateTask(taskId, { status: 'in_progress' });
    } catch (error) {
      console.error('Failed to approve task:', error);
    }
  }, [updateTask]);

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'pending') {
      return task.status === 'pending' || task.status === 'in_progress';
    }
    if (activeTab === 'completed') {
      return task.status === 'completed';
    }
    if (activeTab === 'approvals') {
      return task.status === 'requires_approval';
    }
    return true;
  });

  const pendingCount = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  ).length;
  const approvalCount = tasks.filter(
    (t) => t.status === 'requires_approval'
  ).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending
          </Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'approvals' && styles.tabActive]}
          onPress={() => setActiveTab('approvals')}
        >
          <Text style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>
            Approvals
          </Text>
          {approvalCount > 0 && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <Text style={styles.badgeText}>{approvalCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <ScrollView
        style={styles.taskList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadTasks} />
        }
      >
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => handleComplete(task.id)}
              onApprove={() => handleApprove(task.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#333" />
            <Text style={styles.emptyText}>
              {activeTab === 'pending' && 'All caught up!'}
              {activeTab === 'completed' && 'No completed tasks'}
              {activeTab === 'approvals' && 'No pending approvals'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

function TaskCard({
  task,
  onComplete,
  onApprove,
}: {
  task: Task;
  onComplete: () => void;
  onApprove: () => void;
}) {
  const getStatusColor = () => {
    switch (task.status) {
      case 'pending':
        return '#F59E0B';
      case 'in_progress':
        return '#3B82F6';
      case 'requires_approval':
        return '#EF4444';
      case 'completed':
        return '#10B981';
      default:
        return '#666';
    }
  };

  const getActionIcon = () => {
    switch (task.action?.type) {
      case 'send_message':
        return 'mail';
      case 'send_email':
        return 'send';
      case 'create_meeting':
        return 'calendar';
      case 'create_campaign':
        return 'megaphone';
      case 'schedule':
        return 'time';
      default:
        return 'checkbox';
    }
  };

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskIcon}>
        <Ionicons name={getActionIcon() as any} size={20} color="#6366F1" />
      </View>
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        {task.description && (
          <Text style={styles.taskDesc} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        <View style={styles.taskMeta}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.taskDate}>
            {new Date(task.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.taskActions}>
        {task.status === 'pending' && (
          <TouchableOpacity style={styles.actionButton} onPress={onComplete}>
            <Ionicons name="checkmark" size={20} color="#10B981" />
          </TouchableOpacity>
        )}
        {task.status === 'requires_approval' && (
          <TouchableOpacity style={styles.actionButton} onPress={onApprove}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </TouchableOpacity>
        )}
        {task.status === 'in_progress' && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>Running</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#6366F1',
  },
  badge: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeWarning: {
    backgroundColor: '#EF4444',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  taskDesc: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskDate: {
    fontSize: 12,
    color: '#666',
  },
  taskActions: {
    justifyContent: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
