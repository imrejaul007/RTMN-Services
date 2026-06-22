import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pollsService, Poll, CreatePollPayload } from '../../services/api/polls';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';
import { s } from './styles/polls.styles';

type TabType = 'active' | 'closed' | 'archived';

export default function PollsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Create poll modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [newCoinsPerVote, setNewCoinsPerVote] = useState('10');
  const [newIsDaily, setNewIsDaily] = useState(false);
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await pollsService.getPolls(pageNum, 20, activeTab);

      if (append) {
        setPolls((prev) => [...prev, ...data.polls]);
      } else {
        setPolls(data.polls);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      logger.error('Failed to load polls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, [activeTab]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewOptions(['', '']);
    setNewCoinsPerVote('10');
    setNewIsDaily(false);
    setNewStartsAt('');
    setNewEndsAt('');
  };

  const handleCreatePoll = async () => {
    if (!newTitle.trim()) {
      showAlert('Error', 'Title is required');
      return;
    }

    const validOptions = newOptions.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) {
      showAlert('Error', 'At least 2 options are required');
      return;
    }

    // Default dates: start now, end in 7 days
    const start = newStartsAt || new Date().toISOString();
    const end = newEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const payload: CreatePollPayload = {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      options: validOptions.map((text) => ({ text: text.trim() })),
      startsAt: start,
      endsAt: end,
      coinsPerVote: parseInt(newCoinsPerVote, 10) || 10,
      isDaily: newIsDaily,
    };

    try {
      setIsCreating(true);
      await pollsService.createPoll(payload);
      showAlert('Success', 'Poll created successfully');
      setShowCreateModal(false);
      resetCreateForm();
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClosePoll = (pollId: string) => {
    showConfirm(
      'Close Poll',
      'This will stop accepting new votes. Continue?',
      async () => {
        try {
          await pollsService.updatePoll(pollId, { status: 'closed' });
          showAlert('Success', 'Poll closed');
          await loadData(1);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Close'
    );
  };

  const handleArchivePoll = (pollId: string) => {
    showConfirm(
      'Archive Poll',
      'This will archive the poll permanently. Continue?',
      async () => {
        try {
          await pollsService.archivePoll(pollId);
          showAlert('Success', 'Poll archived');
          await loadData(1);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Archive'
    );
  };

  const addOption = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, '']);
    }
  };

  const removeOption = (idx: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== idx));
    }
  };

  const updateOption = (idx: number, text: string) => {
    const updated = [...newOptions];
    updated[idx] = text;
    setNewOptions(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'closed':
        return colors.warning;
      case 'archived':
        return colors.mutedDark;
      default:
        return colors.info;
    }
  };

  const renderTabs = () => (
    <View style={s.tabsContainer}>
      {(['active', 'closed', 'archived'] as TabType[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[s.tab, activeTab === tab && { backgroundColor: colors.tint }]}
          onPress={() => {
            setActiveTab(tab);
            setPolls([]);
            setHasMore(true);
            setIsLoading(true);
          }}
        >
          <Text style={[s.tabText, { color: activeTab === tab ? colors.card : colors.icon }]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPollCard = ({ item }: { item: Poll }) => {
    const totalVotes = item.totalVotes || 0;
    const options = item.options || [];
    const maxVotes = Math.max(...options.map((o) => o.voteCount), 1);

    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: colors.card }]}
        onPress={() => {
          setSelectedPoll(item);
          setShowDetailModal(true);
        }}
      >
        <View style={s.cardHeader}>
          <View style={[s.avatar, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="bar-chart" size={20} color={colors.indigo} />
          </View>
          <View style={s.cardInfo}>
            <Text style={[s.pollTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[s.subtitle, { color: colors.icon }]}>
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''} &middot; {item.coinsPerVote} coins/vote
            </Text>
          </View>
          <View style={s.badges}>
            {item.isDaily && (
              <View style={[s.badge, { backgroundColor: colors.warningLight }]}>
                <Text style={{ color: colors.warningDark, fontSize: 10, fontWeight: '600' }}>
                  DAILY
                </Text>
              </View>
            )}
            <View style={[s.badge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              <Text style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '600' }}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Options preview */}
        <View style={s.optionsPreview}>
          {options.slice(0, 3).map((opt, idx) => (
            <View key={opt.id || idx} style={s.optionRow}>
              <View
                style={[
                  s.optionBar,
                  {
                    width: `${Math.max(5, (opt.voteCount / maxVotes) * 100)}%`,
                    backgroundColor: `${colors.tint}30`,
                  },
                ]}
              />
              <Text style={[s.optionText, { color: colors.text }]} numberOfLines={1}>
                {opt.text}
              </Text>
              <Text style={[s.optionCount, { color: colors.icon }]}>{opt.voteCount}</Text>
            </View>
          ))}
          {options.length > 3 && (
            <Text style={[s.moreOptions, { color: colors.icon }]}>
              +{options.length - 3} more options
            </Text>
          )}
        </View>

        {/* Date range */}
        <View style={s.dateRow}>
          <Ionicons name="time-outline" size={14} color={colors.icon} />
          <Text style={[s.dateText, { color: colors.icon }]}>
            {item.startsAt ? format(new Date(item.startsAt), 'MMM d') : 'N/A'} -{' '}
            {item.endsAt ? format(new Date(item.endsAt), 'MMM d, yyyy') : 'N/A'}
          </Text>
        </View>

        {/* Actions */}
        {(item.status === 'active' || item.status === 'closed') && (
          <View style={s.actionButtons}>
            {item.status === 'active' && (
              <TouchableOpacity
                style={[s.smallButton, { backgroundColor: colors.warning }]}
                onPress={() => handleClosePoll(item._id)}
              >
                <Ionicons name="lock-closed" size={14} color={colors.card} />
                <Text style={[s.smallButtonText, { color: colors.card }]}>Close</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.smallButton, { backgroundColor: colors.mutedDark }]}
              onPress={() => handleArchivePoll(item._id)}
            >
              <Ionicons name="archive" size={14} color={colors.card} />
              <Text style={[s.smallButtonText, { color: colors.card }]}>Archive</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && polls.length === 0) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card }]}>
        <Ionicons name="bar-chart" size={24} color={colors.indigo} />
        <Text style={[s.headerTitle, { color: colors.text }]}>Poll Management</Text>
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: colors.tint }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={18} color={colors.card} />
          <Text style={s.createBtnText}>New Poll</Text>
        </TouchableOpacity>
      </View>

      {renderTabs()}

      <FlatList
        data={polls}
        renderItem={renderPollCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && !isLoading && polls.length > 0 ? (
            <ActivityIndicator style={{ padding: 20 }} color={colors.tint} />
          ) : null
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.icon} />
            <Text style={[s.emptyText, { color: colors.icon }]}>No {activeTab} polls</Text>
          </View>
        }
      />

      {/* Create Poll Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.createModalContent, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Create New Poll</Text>

              <Text style={[s.fieldLabel, { color: colors.icon }]}>Title *</Text>
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="What's your question?"
                placeholderTextColor={colors.icon}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={[s.fieldLabel, { color: colors.icon }]}>Description</Text>
              <TextInput
                style={[
                  s.input,
                  s.multilineInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                placeholder="Optional description..."
                placeholderTextColor={colors.icon}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
              />

              <Text style={[s.fieldLabel, { color: colors.icon }]}>Options *</Text>
              {newOptions.map((opt, idx) => (
                <View key={idx} style={s.optionInputRow}>
                  <TextInput
                    style={[
                      s.input,
                      { flex: 1, color: colors.text, borderColor: colors.border },
                    ]}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={colors.icon}
                    value={opt}
                    onChangeText={(text) => updateOption(idx, text)}
                  />
                  {newOptions.length > 2 && (
                    <TouchableOpacity
                      style={s.removeOptionBtn}
                      onPress={() => removeOption(idx)}
                    >
                      <Ionicons name="close-circle" size={22} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {newOptions.length < 6 && (
                <TouchableOpacity style={s.addOptionBtn} onPress={addOption}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.tint} />
                  <Text style={[s.addOptionText, { color: colors.tint }]}>Add Option</Text>
                </TouchableOpacity>
              )}

              <Text style={[s.fieldLabel, { color: colors.icon }]}>Coins Per Vote</Text>
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="10"
                placeholderTextColor={colors.icon}
                value={newCoinsPerVote}
                onChangeText={setNewCoinsPerVote}
                keyboardType="numeric"
              />

              <View style={s.switchRow}>
                <Text style={[s.switchLabel, { color: colors.text }]}>Daily Poll</Text>
                <Switch
                  value={newIsDaily}
                  onValueChange={setNewIsDaily}
                  trackColor={{ false: colors.border, true: colors.tint }}
                  thumbColor={colors.card}
                />
              </View>

              <View style={s.modalButtons}>
                <TouchableOpacity
                  style={[s.modalButton, { backgroundColor: colors.border }]}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                >
                  <Text style={[s.modalButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalButton, { backgroundColor: colors.tint }]}
                  onPress={handleCreatePoll}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color={colors.card} />
                  ) : (
                    <Text style={[s.modalButtonText, { color: colors.card }]}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Poll Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.detailModalContent, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPoll && (
                <>
                  <Text style={[s.modalTitle, { color: colors.text }]}>
                    {selectedPoll.title}
                  </Text>
                  {selectedPoll.description && (
                    <Text style={[s.detailDescription, { color: colors.icon }]}>
                      {selectedPoll.description}
                    </Text>
                  )}

                  <View style={s.detailStats}>
                    <View style={s.detailStat}>
                      <Text style={[s.detailStatValue, { color: colors.text }]}>
                        {selectedPoll.totalVotes}
                      </Text>
                      <Text style={[s.detailStatLabel, { color: colors.icon }]}>
                        Total Votes
                      </Text>
                    </View>
                    <View style={s.detailStat}>
                      <Text style={[s.detailStatValue, { color: colors.text }]}>
                        {selectedPoll.coinsPerVote}
                      </Text>
                      <Text style={[s.detailStatLabel, { color: colors.icon }]}>
                        Coins/Vote
                      </Text>
                    </View>
                    <View style={s.detailStat}>
                      <Text
                        style={[
                          s.detailStatValue,
                          { color: getStatusColor(selectedPoll.status) },
                        ]}
                      >
                        {selectedPoll.status}
                      </Text>
                      <Text style={[s.detailStatLabel, { color: colors.icon }]}>Status</Text>
                    </View>
                  </View>

                  <Text style={[s.fieldLabel, { color: colors.icon, marginTop: 16 }]}>
                    Results
                  </Text>
                  {(selectedPoll.options || []).map((opt, idx) => {
                    const total = selectedPoll.totalVotes || 0;
                    const pct = total > 0 ? Math.round(((opt.voteCount || 0) / total) * 100) : 0;
                    return (
                      <View key={opt.id || idx} style={s.resultRow}>
                        <View style={s.resultInfo}>
                          <Text style={[s.resultText, { color: colors.text }]}>
                            {opt.text}
                          </Text>
                          <Text style={[s.resultCount, { color: colors.icon }]}>
                            {opt.voteCount} ({pct}%)
                          </Text>
                        </View>
                        <View style={[s.resultBarBg, { backgroundColor: `${colors.tint}15` }]}>
                          <View
                            style={[
                              s.resultBarFill,
                              { width: `${pct}%`, backgroundColor: colors.tint },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}

                  <View style={s.detailDateRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.icon} />
                    <Text style={[s.dateText, { color: colors.icon }]}>
                      {selectedPoll.startsAt
                        ? format(new Date(selectedPoll.startsAt), 'MMM d, yyyy h:mm a')
                        : 'N/A'}{' '}
                      -{' '}
                      {selectedPoll.endsAt
                        ? format(new Date(selectedPoll.endsAt), 'MMM d, yyyy h:mm a')
                        : 'N/A'}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[s.closeDetailBtn, { backgroundColor: colors.border }]}
              onPress={() => {
                setShowDetailModal(false);
                setSelectedPoll(null);
              }}
            >
              <Text style={[s.modalButtonText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

