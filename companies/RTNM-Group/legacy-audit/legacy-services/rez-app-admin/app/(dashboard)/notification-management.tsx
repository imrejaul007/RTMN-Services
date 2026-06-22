import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Modal,
  Switch,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/notification-management.styles';

// ============================================
// TYPES & CONSTANTS
// ============================================

interface NotificationTemplate {
  _id: string;
  title: string;
  body: string;
  channel: 'push' | 'email' | 'sms';
  category?: string;
  variables: string[];
  isActive: boolean;
  createdBy?: { fullName?: string; phoneNumber?: string };
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  title: string;
  body: string;
  channel: 'push' | 'email' | 'sms';
  category: string;
  variables: string;
  isActive: boolean;
}

interface NotificationStats {
  total: number;
  byChannel: Record<string, number>;
  byStatus: { active: number; inactive: number };
}

interface SendPayload {
  templateId: string;
  target: { type: 'all' | 'segment' | 'user'; userId?: string; segment?: string };
  schedule: string;
}

const CHANNELS: Array<'push' | 'email' | 'sms'> = ['push', 'email', 'sms'];
const CHANNEL_LABELS: Record<string, string> = { push: 'Push', email: 'Email', sms: 'SMS' };
const CHANNEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  push: 'notifications-outline',
  email: 'mail-outline',
  sms: 'chatbubble-outline',
};
const CHANNEL_COLORS: Record<string, string> = {
  push: Colors.light.purple,
  email: Colors.light.info,
  sms: Colors.light.success,
};
const TARGET_TYPES: Array<'all' | 'segment' | 'user'> = ['all', 'segment', 'user'];
const TARGET_LABELS: Record<string, string> = {
  all: 'All Users',
  segment: 'Segment',
  user: 'Single User',
};

const DEFAULT_FORM: TemplateFormData = {
  title: '',
  body: '',
  channel: 'push',
  category: '',
  variables: '',
  isActive: true,
};

// ============================================
// INLINE API SERVICE
// ============================================

const notificationApi = {
  getTemplates: (params?: string) =>
    apiClient.get<any>(`admin/notifications/templates${params ? `?${params}` : ''}`),
  createTemplate: (data: Partial<NotificationTemplate>) =>
    apiClient.post('admin/notifications/templates', data),
  updateTemplate: (id: string, data: Partial<NotificationTemplate>) =>
    apiClient.put(`admin/notifications/templates/${id}`, data),
  deleteTemplate: (id: string) => apiClient.delete(`admin/notifications/templates/${id}`),
  sendNotification: (payload: SendPayload) => apiClient.post('admin/notifications/send', payload),
  getStats: () => apiClient.get<NotificationStats>('admin/notifications/stats'),
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Template list state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>('All');

  // Stats state
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM);

  // Send modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState('');
  const [sendTargetType, setSendTargetType] = useState<'all' | 'segment' | 'user'>('all');
  const [sendUserId, setSendUserId] = useState('');
  const [sendSegment, setSendSegment] = useState('');

  // ============================================
  // DATA LOADING
  // ============================================

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (channelFilter !== 'All') params.set('channel', channelFilter);
      params.set('limit', '100');
      const q = params.toString();
      const response = await notificationApi.getTemplates(q);
      if (!response.success) throw new Error(response.message || 'Failed to load templates');
      setTemplates(response.data?.templates || response.data || []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [channelFilter]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await notificationApi.getStats();
      if (!response.success) throw new Error(response.message || 'Failed to load stats');
      setStats(response.data || null);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTemplates();
  }, [loadTemplates]);

  // ============================================
  // TEMPLATE ACTIONS
  // ============================================

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      body: template.body,
      channel: template.channel,
      category: template.category || '',
      variables: (template.variables || []).join(', '),
      isActive: template.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showAlert('Error', 'Title is required');
      return;
    }
    if (!formData.body.trim()) {
      showAlert('Error', 'Body is required');
      return;
    }

    try {
      setIsSaving(true);
      const vars = (formData.variables || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        channel: formData.channel,
        category: formData.category.trim() || undefined,
        variables: vars,
        isActive: formData.isActive,
      };

      if (editingTemplate) {
        const res = await notificationApi.updateTemplate(editingTemplate._id, payload);
        if (!res.success) throw new Error(res.message || 'Failed to update');
        showAlert('Success', 'Template updated');
      } else {
        const res = await notificationApi.createTemplate(payload);
        if (!res.success) throw new Error(res.message || 'Failed to create');
        showAlert('Success', 'Template created');
      }
      setShowFormModal(false);
      loadTemplates();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (template: NotificationTemplate) => {
    showConfirm(
      'Delete Template',
      `Are you sure you want to delete "${template.title}"?`,
      async () => {
        try {
          const res = await notificationApi.deleteTemplate(template._id);
          if (!res.success) throw new Error(res.message || 'Failed to delete');
          showAlert('Success', 'Template deleted');
          loadTemplates();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  // ============================================
  // SEND ACTIONS
  // ============================================

  const handleOpenSend = (template?: NotificationTemplate) => {
    setSendTemplateId(template?._id || '');
    setSendTargetType('all');
    setSendUserId('');
    setSendSegment('');
    setShowSendModal(true);
  };

  const handleSend = async () => {
    if (!sendTemplateId) {
      showAlert('Error', 'Please select a template');
      return;
    }
    if (sendTargetType === 'user' && !sendUserId.trim()) {
      showAlert('Error', 'User ID is required for single-user target');
      return;
    }
    if (sendTargetType === 'segment' && !sendSegment.trim()) {
      showAlert('Error', 'Segment name is required for segment target');
      return;
    }

    const templateName =
      templates.find((t) => t._id === sendTemplateId)?.title || 'Selected template';
    const audienceLabel = TARGET_LABELS[sendTargetType] || sendTargetType;
    const confirmed = await showConfirm(
      'Confirm Send',
      `Send "${templateName}" to ${audienceLabel}${sendTargetType === 'segment' ? ` (${sendSegment.trim()})` : sendTargetType === 'user' ? ` (${sendUserId.trim()})` : ''}? This action cannot be undone.`,
      undefined,
      'Send Now',
      'warning'
    );
    if (!confirmed) return;

    try {
      setIsSending(true);
      const target: SendPayload['target'] = { type: sendTargetType };
      if (sendTargetType === 'user') target.userId = sendUserId.trim();
      if (sendTargetType === 'segment') target.segment = sendSegment.trim();

      const res = await notificationApi.sendNotification({
        templateId: sendTemplateId,
        target,
        schedule: 'now',
      });
      if (!res.success) throw new Error(res.message || 'Failed to send');
      showAlert('Success', 'Notification queued for delivery');
      setShowSendModal(false);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  // ============================================
  // STATS
  // ============================================

  const handleToggleStats = () => {
    if (!showStats && !stats) loadStats();
    setShowStats((prev) => !prev);
  };

  // ============================================
  // RENDERERS
  // ============================================

  const renderTemplate = ({ item }: { item: NotificationTemplate }) => {
    const chColor = CHANNEL_COLORS[item.channel] || colors.mutedDark;
    const chIcon = CHANNEL_ICONS[item.channel] || 'notifications-outline';
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.colorStrip, { backgroundColor: chColor }]} />
        <View style={s.cardBody}>
          <View style={s.cardTopRow}>
            <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[s.channelBadge, { backgroundColor: `${chColor}18` }]}>
              <Ionicons name={chIcon} size={12} color={chColor} style={{ marginRight: 3 }} />
              <Text style={[s.channelBadgeText, { color: chColor }]}>
                {CHANNEL_LABELS[item.channel]}
              </Text>
            </View>
          </View>
          <Text
            style={[s.bodyPreview, { color: colors.secondaryText || colors.mutedDark }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          {item.variables && item.variables.length > 0 && (
            <View style={s.varsRow}>
              {item.variables.slice(0, 4).map((v, i) => (
                <View key={i} style={[s.varPill, { backgroundColor: colors.background }]}>
                  <Text style={s.varText}>{`{{${v}}}`}</Text>
                </View>
              ))}
              {item.variables.length > 4 && (
                <Text style={s.moreText}>+{item.variables.length - 4}</Text>
              )}
            </View>
          )}
          <View style={s.metaRow}>
            {item.category ? (
              <View style={s.categoryBadge}>
                <Text style={s.categoryText}>{item.category}</Text>
              </View>
            ) : null}
            <View style={[s.statusBadge, item.isActive ? s.activeBg : s.inactiveBg]}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: item.isActive ? colors.successDark : colors.mutedDark,
                }}
              >
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={s.cardActions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
              <Ionicons name="create-outline" size={18} color={colors.info} />
              <Text style={[s.actionText, { color: colors.info }]}>Edit</Text>
            </TouchableOpacity>
            {item.isActive && (
              <TouchableOpacity style={s.actionBtn} onPress={() => handleOpenSend(item)}>
                <Ionicons name="send-outline" size={16} color={colors.purple} />
                <Text style={[s.actionText, { color: colors.purple }]}>Send</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[s.actionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Input helper matching gift-cards-admin pattern
  const inp = (key: keyof TemplateFormData, ph: string, opts?: { multi?: boolean }) => (
    <TextInput
      style={[
        s.formInput,
        opts?.multi && s.multiline,
        { color: colors.text, borderColor: colors.border },
      ]}
      value={String(formData[key])}
      onChangeText={(v) => setFormData((p) => ({ ...p, [key]: v }))}
      placeholder={ph}
      placeholderTextColor={colors.muted}
      multiline={opts?.multi}
    />
  );

  // ============================================
  // STATS PANEL
  // ============================================

  const renderStatsPanel = () => {
    if (!showStats) return null;

    if (statsLoading) {
      return (
        <View
          style={[s.statsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <ActivityIndicator size="small" color={colors.info} />
        </View>
      );
    }

    if (!stats) return null;

    return (
      <View
        style={[s.statsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={s.statsGrid}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{stats.total}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.success }]}>
              {stats.byStatus.active}
            </Text>
            <Text style={s.statLabel}>Active</Text>
          </View>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.mutedDark }]}>
              {stats.byStatus.inactive}
            </Text>
            <Text style={s.statLabel}>Inactive</Text>
          </View>
        </View>
        <View style={s.channelStatsRow}>
          {CHANNELS.map((ch) => (
            <View key={ch} style={[s.channelStatBox, { borderColor: CHANNEL_COLORS[ch] }]}>
              <Ionicons name={CHANNEL_ICONS[ch]} size={18} color={CHANNEL_COLORS[ch]} />
              <Text style={[s.channelStatCount, { color: CHANNEL_COLORS[ch] }]}>
                {stats.byChannel[ch] || 0}
              </Text>
              <Text style={s.channelStatLabel}>{CHANNEL_LABELS[ch]}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ============================================
  // FORM MODAL
  // ============================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {editingTemplate ? 'Edit Template' : 'New Template'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={s.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView style={s.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={s.formLabel}>Title</Text>
          {inp('title', 'e.g. Order Shipped')}

          <Text style={s.formLabel}>Body</Text>
          {inp('body', 'Notification body text. Use {{variable}} for placeholders.', {
            multi: true,
          })}

          <Text style={s.formLabel}>Channel</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {CHANNELS.map((ch) => (
              <TouchableOpacity
                key={ch}
                style={[
                  s.filterChip,
                  formData.channel === ch && { backgroundColor: CHANNEL_COLORS[ch] },
                ]}
                onPress={() => setFormData((p) => ({ ...p, channel: ch }))}
              >
                <Ionicons
                  name={CHANNEL_ICONS[ch]}
                  size={14}
                  color={formData.channel === ch ? colors.card : colors.mutedDark}
                  style={{ marginRight: 4 }}
                />
                <Text style={[s.chipText, formData.channel === ch && s.chipTextActive]}>
                  {CHANNEL_LABELS[ch]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.formLabel}>Category (optional)</Text>
          {inp('category', 'e.g. Marketing, Transactional')}

          <Text style={s.formLabel}>Variables (comma-separated)</Text>
          {inp('variables', 'e.g. userName, orderNumber, amount')}

          <View style={s.switchRow}>
            <Text style={s.formLabel}>Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              trackColor={{ false: colors.border, true: colors.info }}
              thumbColor={colors.card}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ============================================
  // SEND MODAL
  // ============================================

  const renderSendModal = () => (
    <Modal visible={showSendModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setShowSendModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>Send Notification</Text>
          <TouchableOpacity onPress={handleSend} disabled={isSending}>
            {isSending ? (
              <ActivityIndicator size="small" color={colors.purple} />
            ) : (
              <Text style={[s.saveBtn, { color: colors.purple }]}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView style={s.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Template selector */}
          <Text style={s.formLabel}>Template</Text>
          {sendTemplateId ? (
            <View
              style={[
                s.selectedTemplate,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Text style={[s.selectedTemplateName, { color: colors.text }]}>
                {templates.find((t) => t._id === sendTemplateId)?.title || 'Selected'}
              </Text>
              <TouchableOpacity onPress={() => setSendTemplateId('')}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={[s.templatePicker, { borderColor: colors.border }]}
              nestedScrollEnabled
            >
              {templates.filter((t) => t.isActive).length === 0 ? (
                <Text style={s.emptyPickerText}>No active templates available</Text>
              ) : (
                templates
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <TouchableOpacity
                      key={t._id}
                      style={[s.templateOption, { borderBottomColor: colors.border }]}
                      onPress={() => setSendTemplateId(t._id)}
                    >
                      <Ionicons
                        name={CHANNEL_ICONS[t.channel]}
                        size={16}
                        color={CHANNEL_COLORS[t.channel]}
                      />
                      <Text
                        style={[s.templateOptionText, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                      <Text style={s.templateOptionChannel}>{CHANNEL_LABELS[t.channel]}</Text>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          )}

          {/* Target type */}
          <Text style={[s.formLabel, { marginTop: 16 }]}>Target</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {TARGET_TYPES.map((tt) => (
              <TouchableOpacity
                key={tt}
                style={[s.filterChip, sendTargetType === tt && s.filterChipActive]}
                onPress={() => setSendTargetType(tt)}
              >
                <Text style={[s.chipText, sendTargetType === tt && s.chipTextActive]}>
                  {TARGET_LABELS[tt]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* User ID input (conditional) */}
          {sendTargetType === 'user' && (
            <>
              <Text style={s.formLabel}>User ID</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={sendUserId}
                onChangeText={setSendUserId}
                placeholder="MongoDB ObjectId of the user"
                placeholderTextColor={colors.muted}
              />
            </>
          )}

          {/* Segment input (conditional) */}
          {sendTargetType === 'segment' && (
            <>
              <Text style={s.formLabel}>Segment</Text>
              <TextInput
                style={[s.formInput, { color: colors.text, borderColor: colors.border }]}
                value={sendSegment}
                onChangeText={setSendSegment}
                placeholder="e.g. premium_users, new_users"
                placeholderTextColor={colors.muted}
              />
            </>
          )}

          {/* Schedule - now only for this iteration */}
          <Text style={[s.formLabel, { marginTop: 16 }]}>Schedule</Text>
          <View
            style={[
              s.scheduleBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="time-outline" size={18} color={colors.info} />
            <Text style={[s.scheduleText, { color: colors.text }]}>Send immediately</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <Text style={[s.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.statsBtn} onPress={handleToggleStats}>
            <Ionicons name="stats-chart-outline" size={18} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity style={s.sendBtnHeader} onPress={() => handleOpenSend()}>
            <Ionicons name="send-outline" size={16} color={colors.card} />
            <Text style={s.sendBtnHeaderText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
            <Ionicons name="add" size={20} color={colors.card} />
            <Text style={s.createBtnText}>New Template</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats panel (collapsible) */}
      {renderStatsPanel()}

      {/* Channel filters */}
      <View style={[s.filtersBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          <TouchableOpacity
            style={[s.filterChip, channelFilter === 'All' && s.filterChipActive]}
            onPress={() => setChannelFilter('All')}
          >
            <Text style={[s.chipText, channelFilter === 'All' && s.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {CHANNELS.map((ch) => (
            <TouchableOpacity
              key={ch}
              style={[
                s.filterChip,
                channelFilter === ch && { backgroundColor: CHANNEL_COLORS[ch] },
              ]}
              onPress={() => setChannelFilter(ch)}
            >
              <Ionicons
                name={CHANNEL_ICONS[ch]}
                size={14}
                color={channelFilter === ch ? colors.card : colors.mutedDark}
                style={{ marginRight: 4 }}
              />
              <Text style={[s.chipText, channelFilter === ch && s.chipTextActive]}>
                {CHANNEL_LABELS[ch]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Template list */}
      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : (
            <View style={s.emptyBox}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.gray300} />
              <Text style={s.emptyText}>No notification templates found</Text>
            </View>
          )
        }
      />

      {/* Modals */}
      {renderFormModal()}
      {renderSendModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

