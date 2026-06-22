import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { showAlert, showConfirm } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/alert-rules.styles';

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  lastTriggeredAt: string | null;
  triggerCount: number;
  // FIX-BUG-HIGH-001: Renamed from notifyChannels to channels to match backend model
  channels: ('slack' | 'pagerduty' | 'email' | 'admin_push')[];
  unit?: string;
  cooldownMinutes?: number;
}

const SEVERITY_CONFIG = {
  info: { color: '#0EA5E9', bg: '#E0F2FE', label: 'Info' },
  warning: { color: '#F59E0B', bg: '#FEF3C7', label: 'Warning' },
  critical: { color: '#EF4444', bg: '#FEE2E2', label: 'Critical' },
};

export default function AlertRulesScreen() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState('');

  // NIDHI: governance — bulk actions state
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await apiClient.get<AlertRule[]>('/admin/system/alert-rules');
      if (res.success && res.data) {
        setRules(res.data);
      } else {
        setRules([]);
      }
    } catch (err: any) {
      logger.error('Failed to load alert rules:', err);
      setRules([]);
      setFetchError(
        err.message || 'Failed to load alert rules. The endpoint may not be available.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const toggleRule = async (rule: AlertRule) => {
    const updated = { ...rule, enabled: !rule.enabled };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    try {
      const res = await apiClient.patch(`/admin/system/alert-rules/${rule.id}`, {
        enabled: updated.enabled,
      });
      if (!res.success) {
        // Revert on error
        setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
        showAlert('Error', res.message || 'Could not update rule');
      }
    } catch (e) {
      // Revert on error
      setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
      showAlert('Error', 'Could not update rule');
      logger.error('Toggle rule error:', e);
    }
  };

  const saveThreshold = async (rule: AlertRule) => {
    const val = parseFloat(editThreshold);
    if (isNaN(val)) {
      showAlert('Invalid', 'Enter a valid number');
      return;
    }
    const updated = { ...rule, threshold: val };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    setEditingId(null);
    try {
      const res = await apiClient.patch(`/admin/system/alert-rules/${rule.id}`, { threshold: val });
      if (!res.success) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
        showAlert('Error', res.message || 'Could not update threshold');
      }
    } catch (e) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
      logger.error('Save threshold error:', e);
    }
  };

  // NIDHI: governance — bulk enable/disable all rules
  const handleBulkToggle = async (enableAll: boolean) => {
    const confirmed = await showConfirm(
      enableAll ? 'Enable All Rules?' : 'Disable All Rules?',
      `This will ${enableAll ? 'enable' : 'disable'} all ${rules.length} alert rules.`
    );
    if (!confirmed) return;
    setBulkUpdating(true);
    try {
      const updatePromises = rules.map((rule) =>
        apiClient.patch(`/admin/system/alert-rules/${rule.id}`, { enabled: enableAll })
      );
      await Promise.all(updatePromises);
      showAlert('Success', `All rules ${enableAll ? 'enabled' : 'disabled'}`);
      fetchRules();
    } catch (e) {
      showAlert('Error', 'Could not update rules');
      logger.error('Bulk toggle error:', e);
    } finally {
      setBulkUpdating(false);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1a3a52" />
      </View>
    );

  const allEnabled = rules.every((r) => r.enabled);
  const allDisabled = rules.every((r) => !r.enabled);

  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchRules();
          }}
        />
      }
    >
      <View style={s.header}>
        <Ionicons name="notifications-outline" size={20} color="#1a3a52" />
        <Text style={s.headerText}>Configure alert thresholds and notification channels</Text>
      </View>

      {/* NIDHI: governance — bulk action buttons */}
      {!fetchError && rules.length > 0 && (
        <View style={s.bulkActionRow}>
          <TouchableOpacity
            style={[
              s.bulkButton,
              s.bulkEnableBtn,
              allEnabled && s.bulkButtonDisabled,
            ]}
            onPress={() => handleBulkToggle(true)}
            disabled={allEnabled || bulkUpdating}
          >
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text style={s.bulkButtonText}>Enable All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.bulkButton,
              s.bulkDisableBtn,
              allDisabled && s.bulkButtonDisabled,
            ]}
            onPress={() => handleBulkToggle(false)}
            disabled={allDisabled || bulkUpdating}
          >
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={s.bulkButtonText}>Disable All</Text>
          </TouchableOpacity>
        </View>
      )}

      {fetchError ? (
        <View style={s.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={s.errorTitle}>Failed to Load Alert Rules</Text>
          <Text style={s.errorMessage}>{fetchError}</Text>
          <TouchableOpacity
            style={s.retryButton}
            onPress={() => {
              setLoading(true);
              setFetchError(null);
              fetchRules();
            }}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={s.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rules.length === 0 ? (
        <View style={s.errorContainer}>
          <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
          <Text style={s.errorTitle}>No Alert Rules</Text>
          <Text style={s.errorMessage}>No alert rules have been configured yet.</Text>
        </View>
      ) : null}

      {rules.map((rule) => {
        const sev = SEVERITY_CONFIG[rule.severity];
        const editing = editingId === rule.id;
        return (
          <View key={rule.id} style={[s.ruleCard, !rule.enabled && s.ruleCardDisabled]}>
            <View style={s.ruleTop}>
              <View style={[s.severityBadge, { backgroundColor: sev.bg }]}>
                <Text style={[s.severityText, { color: sev.color }]}>{sev.label}</Text>
              </View>
              <Text style={s.ruleName}>{rule.name}</Text>
              <Switch
                value={rule.enabled}
                onValueChange={() => toggleRule(rule)}
                trackColor={{ false: '#E5E7EB', true: '#1a3a52' }}
                thumbColor={rule.enabled ? '#ffcd57' : '#9CA3AF'}
              />
            </View>

            <View style={s.ruleMetric}>
              <Text style={s.metricLabel}>Metric: </Text>
              <Text style={s.metricValue}>{rule.metric}</Text>
              <Text style={s.metricLabel}>
                {' '}
                {rule.condition === 'gt' ? '>' : rule.condition === 'lt' ? '<' : '='}{' '}
              </Text>
              {editing ? (
                <View style={s.editRow}>
                  <TextInput
                    style={s.thresholdInput}
                    value={editThreshold}
                    onChangeText={setEditThreshold}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => saveThreshold(rule)} style={s.saveBtn}>
                    <Text style={s.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)} style={s.cancelBtn}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setEditingId(rule.id);
                    setEditThreshold(String(rule.threshold));
                  }}
                >
                  <Text style={s.thresholdValue}>{rule.threshold} ✏️</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.ruleMeta}>
              <Text style={s.metaSmall}>
                Triggered: {rule.triggerCount} times
                {rule.lastTriggeredAt
                  ? ` · Last: ${new Date(rule.lastTriggeredAt).toLocaleString('en-IN')}`
                  : ' · Never'}
              </Text>
            </View>

            <View style={s.channelRow}>
              {(['admin_push', 'email', 'slack'] as const).map((ch) => (
                <View
                  key={ch}
                  style={[
                    s.channelChip,
                    rule.channels.includes(ch) && s.channelChipActive,
                  ]}
                >
                  <Text
                    style={[
                      s.channelChipText,
                      rule.channels.includes(ch) && s.channelChipTextActive,
                    ]}
                  >
                    {ch === 'admin_push' ? '📱 Push' : ch === 'email' ? '📧 Email' : '💬 Slack'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

