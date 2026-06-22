import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  useColorScheme,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { showAlert } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { s } from './styles/broadcast.styles';

// ============================================
// TYPES
// ============================================

type AudienceType = 'all' | 'premium' | 'inactive' | 'custom';

interface AudienceOption {
  key: AudienceType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface BroadcastHistoryItem {
  _id: string;
  title: string;
  body: string;
  audience: string;
  sentCount: number;
  sentAt: string;
  status?: string;
}

interface EstimateResponse {
  estimatedUsers: number;
}

// ============================================
// CONSTANTS
// ============================================

const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    key: 'all',
    label: 'All Users',
    description: 'Send to entire platform',
    icon: 'people',
  },
  {
    key: 'premium',
    label: 'Premium Users',
    description: 'Users on premium_monthly plan',
    icon: 'star',
  },
  {
    key: 'inactive',
    label: 'Inactive Users',
    description: 'No activity in 30 days',
    icon: 'moon',
  },
  {
    key: 'custom',
    label: 'Custom Segment',
    description: 'Enter specific tags or segment',
    icon: 'options',
  },
];

const TITLE_MAX = 50;
const BODY_MAX = 160;

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BroadcastScreen() {
  const { user, hasRole } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // RBAC: Platform-wide broadcasts can push a notification to every user at once. Lower
  // admin tiers must not be able to do this; match the SUPER_ADMIN gate used by other
  // high-impact surfaces (wallet-adjustment, coin-governor).
  if (!user || !hasRole(ADMIN_ROLES.SUPER_ADMIN)) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Ionicons name="lock-closed-outline" size={48} color={colors.tabIconDefault} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: colors.text,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Access Denied
        </Text>
        <Text
          style={{
            color: colors.tabIconDefault,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          You need Super Admin privileges to send platform broadcasts.
        </Text>
      </SafeAreaView>
    );
  }

  return <BroadcastScreenContent colors={colors} />;
}

function BroadcastScreenContent({ colors }: { colors: typeof Colors.light }) {

  // Form state
  const [audience, setAudience] = useState<AudienceType>('all');
  const [customTag, setCustomTag] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Estimate state
  const [estimatedUsers, setEstimatedUsers] = useState<number | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Send state
  const [sending, setSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  // History state
  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce timer for estimate fetching
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Estimate ───────────────────────────────────────────────────────────────

  const fetchEstimate = useCallback(async (aud: AudienceType, tag?: string) => {
    setLoadingEstimate(true);
    setEstimatedUsers(null);
    try {
      const audienceParam = aud === 'custom' ? tag || 'custom' : aud;
      const res = await apiClient.get<EstimateResponse>(
        `admin/broadcast/estimate?audience=${encodeURIComponent(audienceParam)}`
      );
      const count = res.data?.estimatedUsers ?? 0;
      setEstimatedUsers(count);
    } catch {
      setEstimatedUsers(null);
    } finally {
      setLoadingEstimate(false);
    }
  }, []);

  useEffect(() => {
    if (estimateTimer.current) clearTimeout(estimateTimer.current);
    estimateTimer.current = setTimeout(() => {
      fetchEstimate(audience, customTag || undefined);
    }, 400);
    return () => {
      if (estimateTimer.current) clearTimeout(estimateTimer.current);
    };
  }, [audience, customTag, fetchEstimate]);

  // ── History ────────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    try {
      // The API returns either { broadcasts: [...] } (typed) or a legacy bare array.
      // We handle both shapes without bypassing TypeScript via double-cast.
      const res = await apiClient.get<
        { broadcasts?: BroadcastHistoryItem[] } | BroadcastHistoryItem[]
      >('admin/broadcasts');
      let items: BroadcastHistoryItem[] = [];
      if (Array.isArray(res.data)) {
        items = res.data as BroadcastHistoryItem[];
      } else if (res.data && 'broadcasts' in res.data && Array.isArray(res.data.broadcasts)) {
        items = res.data.broadcasts;
      }
      setHistory(items.slice(0, 5));
    } catch {
      // Non-blocking — history is supplementary
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory();
  }, [loadHistory]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const isValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience !== 'custom' || customTag.trim().length > 0);

  // ── Send ───────────────────────────────────────────────────────────────────

  const handleSendConfirm = useCallback(async () => {
    const COOLDOWN_MS = 10_000;
    if (lastSentAt && Date.now() - lastSentAt < COOLDOWN_MS) {
      showAlert('Please Wait', 'Please wait before sending another broadcast.');
      setShowConfirmModal(false);
      return;
    }

    setShowConfirmModal(false);
    setSending(true);
    try {
      const payload = {
        audience: audience === 'custom' ? customTag.trim() : audience,
        title: title.trim(),
        body: body.trim(),
      };
      const res = await apiClient.post<{ sentCount?: number; sent?: number }>(
        'admin/broadcast/send',
        payload
      );
      const count = res.data?.sentCount ?? res.data?.sent ?? estimatedUsers ?? 0;
      setSentCount(count);
      setLastSentAt(Date.now());
      setShowSuccessModal(true);
      // Reset form
      setTitle('');
      setBody('');
      setAudience('all');
      setCustomTag('');
      // Reload history
      loadHistory();
    } catch {
      showAlert('Error', 'Failed to send broadcast. Please try again.');
    } finally {
      setSending(false);
    }
  }, [audience, customTag, title, body, estimatedUsers, loadHistory, lastSentAt]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label ?? audience;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
        >
          {/* Page title */}
          <Text style={[s.pageTitle, { color: colors.text }]}>Send Platform Broadcast</Text>
          <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginBottom: 20 }}>
            Push a notification to a segment of your users
          </Text>

          {/* ── Audience Selector ── */}
          <Text style={[s.sectionLabel, { color: colors.text }]}>Audience</Text>
          <View style={{ gap: 8, marginBottom: 16 }}>
            {AUDIENCE_OPTIONS.map((opt) => {
              const selected = audience === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setAudience(opt.key)}
                  style={[
                    s.audienceOption,
                    {
                      backgroundColor: selected ? `${colors.tint}15` : colors.card,
                      borderColor: selected ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.audienceIconWrap,
                      { backgroundColor: selected ? colors.tint : colors.gray200 },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={selected ? '#fff' : colors.tabIconDefault}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: selected ? colors.tint : colors.text,
                      }}
                    >
                      {opt.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.tabIconDefault }}>
                      {opt.description}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={colors.tint} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom tag input */}
          {audience === 'custom' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Custom Segment Tag</Text>
              <TextInput
                style={[
                  s.input,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g. power_users, city_delhi, tier_gold"
                placeholderTextColor={colors.tabIconDefault}
                value={customTag}
                onChangeText={setCustomTag}
                autoCapitalize="none"
              />
            </View>
          )}

          {/* ── Estimated Reach ── */}
          <View
            style={[
              s.estimateCard,
              { backgroundColor: colors.infoLight, borderColor: colors.info + '40' },
            ]}
          >
            <Ionicons name="people-outline" size={18} color={colors.info} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 12, color: colors.info, fontWeight: '600' }}>
                Estimated Reach
              </Text>
              {loadingEstimate ? (
                <ActivityIndicator size="small" color={colors.info} style={{ marginTop: 2 }} />
              ) : estimatedUsers !== null ? (
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.info }}>
                  {estimatedUsers.toLocaleString()} users
                </Text>
              ) : (
                <Text style={{ fontSize: 14, color: colors.tabIconDefault }}>
                  Unable to estimate
                </Text>
              )}
            </View>
          </View>

          {/* ── Notification Form ── */}
          <Text style={[s.sectionLabel, { color: colors.text, marginTop: 20 }]}>
            Notification Content
          </Text>

          {/* Title */}
          <View style={{ marginBottom: 14 }}>
            <View style={s.labelRow}>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>Title</Text>
              <Text
                style={{
                  fontSize: 12,
                  color: title.length >= TITLE_MAX ? colors.error : colors.tabIconDefault,
                }}
              >
                {title.length}/{TITLE_MAX}
              </Text>
            </View>
            <TextInput
              style={[
                s.input,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Notification title..."
              placeholderTextColor={colors.tabIconDefault}
              value={title}
              onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
            />
          </View>

          {/* Body */}
          <View style={{ marginBottom: 20 }}>
            <View style={s.labelRow}>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>Message</Text>
              <Text
                style={{
                  fontSize: 12,
                  color: body.length >= BODY_MAX ? colors.error : colors.tabIconDefault,
                }}
              >
                {body.length}/{BODY_MAX}
              </Text>
            </View>
            <TextInput
              style={[
                s.input,
                s.bodyInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Notification message..."
              placeholderTextColor={colors.tabIconDefault}
              value={body}
              onChangeText={(t) => setBody(t.slice(0, BODY_MAX))}
              maxLength={BODY_MAX}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* ── Preview Card ── */}
          {(title.trim() || body.trim()) && (
            <View style={{ marginBottom: 20 }}>
              <Text style={[s.sectionLabel, { color: colors.text }]}>Preview</Text>
              <View
                style={[
                  s.previewCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={s.previewHeader}>
                  <View style={[s.previewAppIcon, { backgroundColor: colors.tint }]}>
                    <Ionicons name="notifications" size={14} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 11, color: colors.tabIconDefault, fontWeight: '600' }}>
                    REZ · now
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 }}>
                  {title || 'Notification Title'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginTop: 2 }}>
                  {body || 'Notification message will appear here'}
                </Text>
              </View>
            </View>
          )}

          {/* ── Rate Limit Warning ── */}
          {estimatedUsers !== null && estimatedUsers > 0 && (
            <View
              style={[
                s.warningCard,
                { backgroundColor: colors.warningLight, borderColor: colors.warning + '60' },
              ]}
            >
              <Ionicons name="warning-outline" size={16} color={colors.warningDark} />
              <Text style={{ fontSize: 12, color: colors.warningDark, marginLeft: 8, flex: 1 }}>
                This will send{' '}
                <Text style={{ fontWeight: '700' }}>
                  {estimatedUsers.toLocaleString()} push notification
                  {estimatedUsers !== 1 ? 's' : ''}
                </Text>
                . Confirm before sending.
              </Text>
            </View>
          )}

          {/* ── Send Button ── */}
          <TouchableOpacity
            onPress={() => {
              if (!isValid) {
                showAlert(
                  'Incomplete',
                  'Please fill in the title, message, and audience before sending.'
                );
                return;
              }
              setShowConfirmModal(true);
            }}
            disabled={sending}
            style={[s.sendBtn, { backgroundColor: isValid ? colors.tint : colors.gray300 }]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="megaphone" size={18} color="#fff" />
                <Text style={s.sendBtnText}>Send Now</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Broadcast History ── */}
          <View style={{ marginTop: 28 }}>
            <Text style={[s.sectionLabel, { color: colors.text }]}>Recent Broadcasts</Text>
            {loadingHistory ? (
              <ActivityIndicator color={colors.tint} style={{ marginTop: 8 }} />
            ) : history.length === 0 ? (
              <View style={[s.historyEmpty, { backgroundColor: colors.card }]}>
                <Ionicons name="radio-outline" size={32} color={colors.tabIconDefault} />
                <Text style={{ color: colors.tabIconDefault, marginTop: 8, fontSize: 13 }}>
                  No broadcasts sent yet
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {history.map((item) => (
                  <View
                    key={item._id}
                    style={[s.historyCard, { backgroundColor: colors.card }]}
                  >
                    <View style={s.rowBetween}>
                      <Text
                        style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={[s.audiencePill, { backgroundColor: colors.infoLight }]}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.info }}>
                          {item.audience}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{ fontSize: 12, color: colors.tabIconDefault, marginTop: 2 }}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                    <View style={[s.rowBetween, { marginTop: 6 }]}>
                      <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>
                        {formatDate(item.sentAt)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="send" size={11} color={colors.success} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>
                          {item.sentCount.toLocaleString()} sent
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Confirm Modal ── */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card }]}>
            <View style={[s.modalIconWrap, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="megaphone" size={28} color={colors.tint} />
            </View>
            <Text style={[s.modalTitle, { color: colors.text }]}>Confirm Broadcast</Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.tabIconDefault,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Send "{title}" to{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>{audienceLabel}</Text>
              {estimatedUsers !== null && estimatedUsers > 0
                ? ` (~${estimatedUsers.toLocaleString()} users)`
                : ''}
              ?
            </Text>
            {estimatedUsers !== null && estimatedUsers > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.warningDark,
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                This will trigger {estimatedUsers.toLocaleString()} push notification
                {estimatedUsers !== 1 ? 's' : ''}.
              </Text>
            )}
            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={[
                  s.modalBtn,
                  { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendConfirm}
                style={[s.modalBtn, { backgroundColor: colors.tint }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Send Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card }]}>
            <View style={[s.modalIconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            </View>
            <Text style={[s.modalTitle, { color: colors.text }]}>Broadcast Sent!</Text>
            <Text style={{ fontSize: 14, color: colors.tabIconDefault, textAlign: 'center' }}>
              Successfully dispatched to{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {sentCount.toLocaleString()} user{sentCount !== 1 ? 's' : ''}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowSuccessModal(false)}
              style={[
                s.modalBtn,
                { backgroundColor: colors.tint, marginTop: 20, width: '100%' },
              ]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

