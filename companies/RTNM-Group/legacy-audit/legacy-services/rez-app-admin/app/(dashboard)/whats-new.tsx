import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { showAlert, showConfirm } from '../../utils/alert';
import { format } from 'date-fns';
import { s } from './styles/whats-new.styles';

interface Story {
  _id: string;
  title: string;
  subtitle?: string;
  icon: string;
  storyType?: string;
  validity: { startDate: string; endDate: string; isActive: boolean };
  analytics: { views: number; clicks: number; completions: number };
  metadata?: { sourceType?: string; sourceId?: string };
  createdAt: string;
}

export default function WhatsNewAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await apiClient.get<{ stories: Story[] }>('whats-new/admin/all');
      setStories(res.data?.stories || []);
    } catch {
      showAlert('Error', 'Failed to load stories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = useCallback(async (story: Story) => {
    try {
      await apiClient.put(`whats-new/admin/${story._id}`, {
        validity: { ...story.validity, isActive: !story.validity.isActive },
      });
      load();
    } catch {
      showAlert('Error', 'Failed to update story');
    }
  }, [load]);

  const deleteStory = useCallback(async (id: string) => {
    const confirmed = await showConfirm('Delete Story', 'Are you sure you want to delete this story?');
    if (!confirmed) return;
    try {
      await apiClient.delete(`whats-new/admin/${id}`);
      load();
    } catch {
      showAlert('Error', 'Failed to delete story');
    }
  }, [load]);

  const activeCount = stories.filter(s => s.validity.isActive).length;

  const renderStory = useCallback(({ item }: { item: Story }) => {
    const isExpired = new Date(item.validity.endDate) < new Date();
    const isEmoji = item.icon && !item.icon.startsWith('http');

    return (
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <View style={s.cardHeader}>
          <View style={s.cardTitleRow}>
            <Text style={s.iconText}>
              {isEmoji ? item.icon : '🖼️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={[s.subtitle, { color: colors.tabIconDefault }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          <Switch
            value={item.validity.isActive}
            onValueChange={() => toggleActive(item)}
            trackColor={{ true: colors.tint }}
          />
        </View>

        {/* Tags */}
        <View style={s.tagsRow}>
          {item.storyType ? (
            <View style={[s.tag, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[s.tagText, { color: colors.tint }]}>
                {item.storyType.replace(/_/g, ' ')}
              </Text>
            </View>
          ) : null}
          {item.metadata?.sourceType === 'campaign' ? (
            <View style={[s.tag, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[s.tagText, { color: '#92400E' }]}>Auto-generated</Text>
            </View>
          ) : null}
          {isExpired ? (
            <View style={[s.tag, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[s.tagText, { color: '#DC2626' }]}>Expired</Text>
            </View>
          ) : null}
        </View>

        {/* Validity */}
        <Text style={[s.dateText, { color: colors.tabIconDefault }]}>
          {format(new Date(item.validity.startDate), 'd MMM')} →{' '}
          {format(new Date(item.validity.endDate), 'd MMM yyyy')}
        </Text>

        {/* Analytics */}
        <View style={s.analyticsRow}>
          {[
            { label: 'Views', value: item.analytics?.views ?? 0, icon: 'eye-outline' as const },
            { label: 'Clicks', value: item.analytics?.clicks ?? 0, icon: 'hand-left-outline' as const },
            { label: 'Completions', value: item.analytics?.completions ?? 0, icon: 'checkmark-circle-outline' as const },
          ].map(({ label, value, icon }) => (
            <View key={label} style={s.analyticItem}>
              <Ionicons name={icon} size={14} color={colors.tint} />
              <Text style={[s.analyticValue, { color: colors.tint }]}>{value}</Text>
              <Text style={[s.analyticLabel, { color: colors.tabIconDefault }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => deleteStory(item._id)}
          style={s.deleteBtn}
        >
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
          <Text style={s.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  }, [colors, toggleActive, deleteStory]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text }]}>
          What's New Stories
        </Text>
        <Text style={[s.headerSubtitle, { color: colors.tabIconDefault }]}>
          {stories.length} stories · {activeCount} active
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={stories}
          keyExtractor={s => s._id}
          renderItem={renderStory}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={colors.tabIconDefault} />
              <Text style={[s.emptyText, { color: colors.tabIconDefault }]}>
                No stories yet. Create one from campaigns or manually.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

