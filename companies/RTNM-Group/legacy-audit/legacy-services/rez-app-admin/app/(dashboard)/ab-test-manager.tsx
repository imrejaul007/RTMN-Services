import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/ab-test-manager.styles';

interface ABTest {
  id: string;
  name: string;
  description?: string;
  status: 'running' | 'paused' | 'completed';
  variants: { name: string; allocation: number; conversions: number; impressions: number }[];
  startDate: string;
  endDate?: string;
  metric: string;
  winner?: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  running: { color: '#22C55E', label: 'Running' },
  paused: { color: '#F59E0B', label: 'Paused' },
  completed: { color: '#6B7280', label: 'Completed' },
};

interface NewTestForm {
  id: string;
  name: string;
  metric: string;
  variantAName: string;
  variantBName: string;
}

const EMPTY_FORM: NewTestForm = {
  id: '',
  name: '',
  metric: '',
  variantAName: 'Control',
  variantBName: 'Variant',
};

export default function ABTestManagerScreen() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // BUG-013: Add error state so the UI can show a retry button on API failure.
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<NewTestForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<NewTestForm>>({});
  const [creating, setCreating] = useState(false);

  const fetchTests = useCallback(async () => {
    setError(null);
    try {
      const res = await apiClient.get<any>('admin/ab-tests');
      if (res.success && res.data) {
        // Backend returns data as array directly or nested in data.data
        const rawTests = Array.isArray(res.data) ? res.data : (res.data.data ?? []);
        setTests(rawTests);
      } else {
        setError((res as unknown as {message?: string; error?: string}).message || (res as unknown as {message?: string; error?: string}).error || 'Failed to load A/B tests');
        setTests([]);
      }
    } catch (err: any) {
      logger.error('Failed to load A/B tests:', err);
      setError(err?.message || 'Failed to load A/B tests');
      setTests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const validateForm = (): boolean => {
    const errs: Partial<NewTestForm> = {};
    if (!form.id.trim()) errs.id = 'ID required';
    else if (!/^[a-z0-9-]+$/.test(form.id.trim()))
      errs.id = 'Lowercase letters, numbers, hyphens only';
    if (!form.name.trim()) errs.name = 'Name required';
    if (!form.metric.trim()) errs.metric = 'Metric required';
    if (!form.variantAName.trim()) errs.variantAName = 'Required';
    if (!form.variantBName.trim()) errs.variantBName = 'Required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setCreating(true);
    try {
      const res = await apiClient.post<any>('admin/ab-tests', {
        id: form.id.trim(),
        name: form.name.trim(),
        metric: form.metric.trim(),
        variants: [
          { name: form.variantAName.trim(), allocation: 50, conversions: 0, impressions: 0 },
          { name: form.variantBName.trim(), allocation: 50, conversions: 0, impressions: 0 },
        ],
      });
      if (res.success) {
        setShowCreateModal(false);
        setForm(EMPTY_FORM);
        setFormErrors({});
        fetchTests();
      } else {
        showAlert('Error', (res as unknown as {message?: string; error?: string}).message || (res as unknown as {message?: string; error?: string}).error || 'Failed to create test');
      }
    } catch (err: any) {
      logger.error('Create AB test error:', err);
      showAlert('Error', err?.message || 'Failed to create test');
    } finally {
      setCreating(false);
    }
  };

  const toggleTest = async (test: ABTest) => {
    const newStatus = test.status === 'running' ? 'paused' : 'running';
    setTests((prev) => prev.map((t) => (t.id === test.id ? { ...t, status: newStatus } : t)));
    try {
      const res = await apiClient.patch(`admin/ab-tests/${test.id}`, { status: newStatus });
      if (!res.success) {
        setTests((prev) => prev.map((t) => (t.id === test.id ? test : t)));
        showAlert(
          'Error',
          (res as unknown as {message?: string; error?: string}).message || (res as unknown as {message?: string; error?: string}).error || 'Could not update test status'
        );
      }
    } catch (err) {
      setTests((prev) => prev.map((t) => (t.id === test.id ? test : t)));
      logger.error('Toggle test error:', err);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1a3a52" />
      </View>
    );

  // BUG-013: Show error UI with retry button when the API call fails.
  if (error && tests.length === 0)
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={{ color: '#EF4444', marginTop: 12, fontSize: 16, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={fetchTests}
          style={{
            marginTop: 16,
            paddingHorizontal: 24,
            paddingVertical: 10,
            backgroundColor: '#1a3a52',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <>
      <ScrollView
        style={s.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTests();
            }}
          />
        }
      >
        <View style={s.headerBar}>
          <Text style={s.headerTitle}>
            {tests.filter((t) => t.status === 'running').length} tests running
          </Text>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => {
              setForm(EMPTY_FORM);
              setFormErrors({});
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.newBtnText}>New Test</Text>
          </TouchableOpacity>
        </View>

        {tests.map((test) => {
          const sc = STATUS_CONFIG[test.status] || { color: '#9CA3AF', label: test.status };
          const isExpanded = expanded === test.id;
          const variants = test.variants || [];
          const maxConvRate = Math.max(
            0,
            ...variants.map((v) => (v.impressions > 0 ? v.conversions / v.impressions : 0))
          );

          return (
            <TouchableOpacity
              key={test.id}
              style={s.testCard}
              onPress={() => setExpanded(isExpanded ? null : test.id)}
            >
              <View style={s.testHeader}>
                <View style={[s.statusDot, { backgroundColor: sc.color }]} />
                <View style={s.testInfo}>
                  <Text style={s.testName}>{test.name}</Text>
                  {test.description ? (
                    <Text style={s.testDesc}>{test.description}</Text>
                  ) : null}
                </View>
                <View style={s.testActions}>
                  {(test.status === 'running' || test.status === 'paused') && (
                    <Switch
                      value={test.status === 'running'}
                      onValueChange={() => toggleTest(test)}
                      trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
                      thumbColor="#fff"
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  )}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#9CA3AF"
                  />
                </View>
              </View>

              {test.winner && (
                <View style={s.winnerBadge}>
                  <Ionicons name="trophy" size={14} color="#F59E0B" />
                  <Text style={s.winnerText}>Winner: {test.winner}</Text>
                </View>
              )}

              {isExpanded && (
                <View style={s.variantsSection}>
                  <Text style={s.metricLabel}>Metric: {test.metric}</Text>
                  {variants.map((v, i) => {
                    const impr = v.impressions ?? 0;
                    const conv = v.conversions ?? 0;
                    const convRate = impr > 0 ? ((conv / impr) * 100).toFixed(1) : '0.0';
                    const isWinner =
                      maxConvRate > 0 && impr > 0 && Math.abs(conv / impr - maxConvRate) < 0.0001;
                    return (
                      <View
                        key={i}
                        style={[s.variantRow, isWinner && s.variantRowWinner]}
                      >
                        <View style={s.variantLeft}>
                          {isWinner && (
                            <Ionicons
                              name="trophy"
                              size={12}
                              color="#F59E0B"
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text style={s.variantName}>{v.name}</Text>
                          <Text style={s.variantTraffic}>{v.allocation ?? 0}% traffic</Text>
                        </View>
                        <View style={s.variantRight}>
                          <Text style={s.variantConvRate}>{convRate}%</Text>
                          <Text style={s.variantCount}>
                            {conv}/{impr}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  <Text style={s.dateMeta}>
                    Started: {new Date(test.startDate).toLocaleDateString('en-IN')}
                    {test.endDate
                      ? ` · Ended: ${new Date(test.endDate).toLocaleDateString('en-IN')}`
                      : ''}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create New A/B Test Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New A/B Test</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} disabled={creating}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Test ID */}
              <View style={s.mGroup}>
                <Text style={s.mLabel}>
                  Test ID <Text style={s.mRequired}>*</Text>
                </Text>
                <TextInput
                  style={[s.mInput, formErrors.id ? s.mInputErr : undefined]}
                  placeholder="e.g. checkout-button-color"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  value={form.id}
                  onChangeText={(t) =>
                    setForm({ ...form, id: t.toLowerCase().replace(/\s+/g, '-') })
                  }
                  editable={!creating}
                />
                {formErrors.id ? <Text style={s.mErrText}>{formErrors.id}</Text> : null}
                <Text style={s.mHelper}>Lowercase letters, numbers and hyphens only</Text>
              </View>

              {/* Name */}
              <View style={s.mGroup}>
                <Text style={s.mLabel}>
                  Test Name <Text style={s.mRequired}>*</Text>
                </Text>
                <TextInput
                  style={[s.mInput, formErrors.name ? s.mInputErr : undefined]}
                  placeholder="e.g. Checkout Button Color"
                  placeholderTextColor="#9CA3AF"
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  editable={!creating}
                />
                {formErrors.name ? <Text style={s.mErrText}>{formErrors.name}</Text> : null}
              </View>

              {/* Metric */}
              <View style={s.mGroup}>
                <Text style={s.mLabel}>
                  Success Metric <Text style={s.mRequired}>*</Text>
                </Text>
                <TextInput
                  style={[s.mInput, formErrors.metric ? s.mInputErr : undefined]}
                  placeholder="e.g. checkout_completion"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  value={form.metric}
                  onChangeText={(t) => setForm({ ...form, metric: t })}
                  editable={!creating}
                />
                {formErrors.metric ? (
                  <Text style={s.mErrText}>{formErrors.metric}</Text>
                ) : null}
              </View>

              {/* Variants */}
              <View style={s.mGroup}>
                <Text style={s.mLabel}>Variants (50% / 50% split)</Text>
                <View style={s.variantInputRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={s.mLabelSmall}>Variant A</Text>
                    <TextInput
                      style={[
                        s.mInput,
                        formErrors.variantAName ? s.mInputErr : undefined,
                      ]}
                      placeholder="Control"
                      placeholderTextColor="#9CA3AF"
                      value={form.variantAName}
                      onChangeText={(t) => setForm({ ...form, variantAName: t })}
                      editable={!creating}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mLabelSmall}>Variant B</Text>
                    <TextInput
                      style={[
                        s.mInput,
                        formErrors.variantBName ? s.mInputErr : undefined,
                      ]}
                      placeholder="Variant"
                      placeholderTextColor="#9CA3AF"
                      value={form.variantBName}
                      onChangeText={(t) => setForm({ ...form, variantBName: t })}
                      editable={!creating}
                    />
                  </View>
                </View>
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnCancel]}
                onPress={() => setShowCreateModal(false)}
                disabled={creating}
              >
                <Text style={s.mBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnCreate]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.mBtnCreateText}>Create Test</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

