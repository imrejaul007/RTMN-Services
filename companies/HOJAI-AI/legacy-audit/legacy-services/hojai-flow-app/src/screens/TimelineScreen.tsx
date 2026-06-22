/**
 * TimelineScreen - Shows what happened
 *
 * Features:
 * - Yesterday's activities
 * - Today's activities
 * - Actions completed
 * - Knowledge accessed
 * - Memory entries
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task, MemoryEntry } from '../types';

interface TimelineItem {
  id: string;
  type: 'memory' | 'task' | 'knowledge' | 'message';
  title: string;
  subtitle: string;
  timestamp: Date;
  icon: string;
  color: string;
}

export default function TimelineScreen() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<'yesterday' | 'today'>('today');

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    setIsRefreshing(true);
    // In production, this would fetch from API
    // For now, show mock data
    setItems(generateMockTimeline());
    setIsRefreshing(false);
  };

  const groupedItems = items.reduce((acc, item) => {
    const day = getDayKey(item.timestamp);
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelector}>
        <TouchableOpacity
          style={[styles.dayButton, selectedDay === 'today' && styles.dayButtonActive]}
          onPress={() => setSelectedDay('today')}
        >
          <Text style={[styles.dayText, selectedDay === 'today' && styles.dayTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dayButton, selectedDay === 'yesterday' && styles.dayButtonActive]}
          onPress={() => setSelectedDay('yesterday')}
        >
          <Text style={[styles.dayText, selectedDay === 'yesterday' && styles.dayTextActive]}>
            Yesterday
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timeline */}
      <ScrollView
        style={styles.timeline}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadTimeline} />
        }
      >
        {selectedDay === 'today' && groupedItems['today']?.length > 0 && (
          <DaySection title="Today" items={groupedItems['today'] || []} />
        )}

        {selectedDay === 'yesterday' && groupedItems['yesterday']?.length > 0 && (
          <DaySection title="Yesterday" items={groupedItems['yesterday'] || []} />
        )}

        {(!groupedItems[selectedDay] || groupedItems[selectedDay].length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="time" size={48} color="#333" />
            <Text style={styles.emptyText}>Nothing yet today</Text>
            <Text style={styles.emptySubtext}>
              Start talking to Hojai
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DaySection({ title, items }: { title: string; items: TimelineItem[] }) {
  return (
    <View style={styles.daySection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <TimelineCard key={item.id} item={item} isFirst={index === 0} />
      ))}
    </View>
  );
}

function TimelineCard({ item, isFirst }: { item: TimelineItem; isFirst: boolean }) {
  const timeString = formatTime(item.timestamp);

  return (
    <View style={styles.cardContainer}>
      {/* Timeline line */}
      <View style={styles.timelineLine}>
        <View style={[styles.dot, { backgroundColor: item.color }]} />
        {!isFirst && <View style={styles.line} />}
      </View>

      {/* Card */}
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon as any} size={18} color={item.color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </View>
          <Text style={styles.time}>{timeString}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayKey(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'today';
  if (isYesterday) return 'yesterday';
  return 'other';
}

function generateMockTimeline(): TimelineItem[] {
  const now = new Date();
  const today = now.toDateString();

  return [
    {
      id: '1',
      type: 'memory',
      title: 'Merchant discussion',
      subtitle: 'Discussed pricing with Rahul from ABC Corp',
      timestamp: new Date(now.getTime() - 30 * 60000),
      icon: 'chatbubbles',
      color: '#6366F1',
    },
    {
      id: '2',
      type: 'task',
      title: 'Campaign created',
      subtitle: 'Summer Sale campaign scheduled',
      timestamp: new Date(now.getTime() - 2 * 3600000),
      icon: 'megaphone',
      color: '#F59E0B',
    },
    {
      id: '3',
      type: 'knowledge',
      title: 'Policy accessed',
      subtitle: 'Viewed refund policy',
      timestamp: new Date(now.getTime() - 3 * 3600000),
      icon: 'document-text',
      color: '#10B981',
    },
    {
      id: '4',
      type: 'message',
      title: 'Message sent',
      subtitle: 'Sent update to NeXha team',
      timestamp: new Date(now.getTime() - 4 * 3600000),
      icon: 'send',
      color: '#8B5CF6',
    },
  ];
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
  daySelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  dayTextActive: {
    color: '#6366F1',
  },
  timeline: {
    flex: 1,
    paddingHorizontal: 20,
  },
  daySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginLeft: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#444',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
    marginTop: 8,
  },
});
