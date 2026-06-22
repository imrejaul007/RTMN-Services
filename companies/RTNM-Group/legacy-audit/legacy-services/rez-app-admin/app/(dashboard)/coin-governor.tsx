import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { adminTrialsService, BreakageStats } from '../../services/api/trials';
import { s } from './styles/coin-governor.styles';
import { Colors } from '@/constants/Colors';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';
import { showAlert, showConfirm } from '../../utils/alert';

type GovernorAction = 'pause_bookings' | 'freeze_merchant' | 'pause_purchases' | 'clawback';

interface FrozenMerchant {
  merchantId: string;
  merchantName: string;
  frozenAt: string;
}

function CoinGovernorContent() {
  // State
  const [breakageStats, setBreakageStats] = useState<BreakageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Pause Bookings
  const [pauseBookings, setPauseBookings] = useState(false);

  // Daily Exposure
  const [maxTrialsPerDay, setMaxTrialsPerDay] = useState('10');

  // Freeze Merchant
  const [freezeSearchId, setFreezeSearchId] = useState('');
  const [frozenMerchants, setFrozenMerchants] = useState<FrozenMerchant[]>([]);

  // Pause Purchases
  const [pausePurchases, setPausePurchases] = useState(false);

  // Clawback
  const [showClawbackModal, setShowClawbackModal] = useState(false);
  const [clawbackUserId, setClawbackUserId] = useState('');
  const [clawbackAmount, setClawbackAmount] = useState('');
  const [clawbackReason, setClawbackReason] = useState('');

  // Last update
  const [lastActionTime, setLastActionTime] = useState<string | null>(null);

  const loadBreakageStats = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await adminTrialsService.getBreakageStats();
      if (response.success && response.data) {
        setBreakageStats(response.data.stats || null);
        setLastActionTime(new Date().toISOString());
      } else {
        setLoadError(response.message || 'Failed to load breakage stats');
      }
    } catch (err: any) {
      logger.error('Failed to load breakage stats:', err);
      setLoadError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBreakageStats();
  }, [loadBreakageStats]);

  const executeAction = async (
    action: GovernorAction,
    payload: any,
    skipConfirm?: boolean
  ): Promise<boolean> => {
    if (!skipConfirm) {
      const confirmed = await showConfirm(
        'Confirm Emergency Action',
        'This is a critical operation. Are you sure?'
      );
      if (!confirmed) return false;
    }
    setActionLoading(true);
    try {
      const response = await adminTrialsService.executeGovernorAction({
        action,
        ...payload,
      });
      if (response.success) {
        showAlert('Success', 'Action executed successfully');
        setLastActionTime(new Date().toISOString());
        return true;
      }
      return false;
    } catch (err) {
      showAlert('Error', 'Failed to execute action');
      logger.error('Governor action error:', err);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseBookings = async (value: boolean) => {
    const success = await executeAction('pause_bookings', { enabled: value });
    if (success) setPauseBookings(value);
  };

  const handlePausePurchases = async (value: boolean) => {
    const success = await executeAction('pause_purchases', { enabled: value });
    if (success) setPausePurchases(value);
  };

  const handleFreezeMerchant = () => {
    if (!freezeSearchId.trim()) {
      showAlert('Required', 'Please enter a merchant ID or name');
      return;
    }
    executeAction('freeze_merchant', { merchantId: freezeSearchId });
  };

  const handleClawback = async () => {
    if (!clawbackUserId.trim() || !clawbackAmount.trim() || !clawbackReason.trim()) {
      showAlert('Required', 'All fields are required for clawback');
      return;
    }

    const parsedAmount = Number(clawbackAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showAlert('Invalid Amount', 'Please enter a positive number of coins to claw back.');
      return;
    }

    if (parsedAmount > 100000) {
      showAlert(
        'Amount Too Large',
        `${parsedAmount.toLocaleString()} coins exceeds the single-operation limit of 100,000. Split the clawback into smaller operations.`
      );
      return;
    }

    const confirmed = await showConfirm(
      'Confirm Clawback',
      `Claw back ${parsedAmount.toLocaleString()} coins from user ${clawbackUserId.trim()}?\n\nReason: ${clawbackReason.trim()}`
    );
    if (!confirmed) return;
    const success = await executeAction(
      'clawback',
      {
        userId: clawbackUserId,
        amount: parsedAmount,
        reason: clawbackReason,
      },
      true
    );
    if (success) {
      setShowClawbackModal(false);
      setClawbackUserId('');
      setClawbackAmount('');
      setClawbackReason('');
    }
  };

  const handleUnfreeze = async (merchantId: string) => {
    const confirmed = await showConfirm(
      'Unfreeze Merchant',
      'Are you sure? This merchant will be able to create trials again.'
    );
    if (!confirmed) return;
    const success = await executeAction('freeze_merchant', { merchantId, unfreeze: true }, true);
    if (success) {
      setFrozenMerchants((prev) => prev.filter((m) => m.merchantId !== merchantId));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#DC2626', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Coin Economy Governor</Text>
            <Text style={styles.headerSubtitle}>⚠️ Emergency Controls</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={{ color: Colors.light.secondaryText, marginTop: 12, fontSize: 13 }}>
            Loading economy data...
          </Text>
        </View>
      ) : loadError ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#DC2626" />
          <Text
            style={{ color: Colors.light.text, fontSize: 16, fontWeight: '600', marginTop: 12 }}
          >
            Failed to load
          </Text>
          <Text
            style={{
              color: Colors.light.secondaryText,
              marginTop: 4,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            {loadError}
          </Text>
          <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={loadBreakageStats}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* System Status */}
          <View style={styles.section}>
            <View style={styles.statusCard}>
              <View style={styles.statusIndicator} />
              <View style={styles.statusContent}>
                <Text style={styles.statusLabel}>System Status</Text>
                <Text style={styles.statusValue}>Normal</Text>
              </View>
              {lastActionTime && (
                <Text style={styles.statusTime}>
                  {format(new Date(lastActionTime), 'HH:mm:ss')}
                </Text>
              )}
            </View>
          </View>

          {/* Booking Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Controls</Text>

            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <View>
                  <Text style={styles.controlTitle}>Pause All New Bookings</Text>
                  <Text style={styles.controlDesc}>Stop customers from booking new trials</Text>
                </View>
                <Switch
                  value={pauseBookings}
                  onValueChange={handlePauseBookings}
                  disabled={actionLoading}
                  trackColor={{ false: '#E5E7EB', true: '#FCA5A5' }}
                  thumbColor={pauseBookings ? '#DC2626' : '#9CA3AF'}
                />
              </View>
            </View>

            <View style={styles.controlCard}>
              <Text style={styles.controlTitle}>Daily Trial Exposure Limit</Text>
              <Text style={styles.controlDesc}>Max trials per user per day</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={maxTrialsPerDay}
                  onChangeText={setMaxTrialsPerDay}
                  keyboardType="number-pad"
                  editable={!actionLoading}
                />
                <TouchableOpacity
                  style={[styles.button, { marginLeft: 8 }]}
                  onPress={() =>
                    executeAction('pause_bookings', { maxPerDay: parseInt(maxTrialsPerDay) })
                  }
                  disabled={actionLoading}
                >
                  <Text style={styles.buttonText}>Set</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Merchant Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Merchant Controls</Text>

            <View style={styles.controlCard}>
              <Text style={styles.controlTitle}>Freeze Merchant</Text>
              <Text style={styles.controlDesc}>Prevent merchant from creating trials</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Merchant ID or name..."
                  value={freezeSearchId}
                  onChangeText={setFreezeSearchId}
                  editable={!actionLoading}
                />
                <TouchableOpacity
                  style={[styles.button, styles.dangerButton, { marginLeft: 8 }]}
                  onPress={handleFreezeMerchant}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Freeze</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {frozenMerchants.length > 0 && (
              <View style={styles.frozenList}>
                <Text style={styles.frozenTitle}>Frozen Merchants ({frozenMerchants.length})</Text>
                {frozenMerchants.map((merchant) => (
                  <View key={merchant.merchantId} style={styles.frozenItem}>
                    <View style={styles.frozenInfo}>
                      <Text style={styles.frozenName}>{merchant.merchantName}</Text>
                      <Text style={styles.frozenTime}>
                        {format(new Date(merchant.frozenAt), 'MMM dd, HH:mm')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnfreeze(merchant.merchantId)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.unfreezeLink}>Unfreeze</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Coin Economy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coin Economy</Text>

            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <View>
                  <Text style={styles.controlTitle}>Pause Coin Purchases</Text>
                  <Text style={styles.controlDesc}>Stop users from buying coins</Text>
                </View>
                <Switch
                  value={pausePurchases}
                  onValueChange={handlePausePurchases}
                  disabled={actionLoading}
                  trackColor={{ false: '#E5E7EB', true: '#FCA5A5' }}
                  thumbColor={pausePurchases ? '#DC2626' : '#9CA3AF'}
                />
              </View>
            </View>

            <View style={styles.controlCard}>
              <Text style={styles.controlTitle}>Emergency Clawback</Text>
              <Text style={styles.controlDesc}>Recover coins from a user account</Text>
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={() => setShowClawbackModal(true)}
                disabled={actionLoading}
              >
                <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
                <Text style={styles.buttonText}>Execute Clawback</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Breakage Stats */}
          <View style={styles.section}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={styles.sectionTitle}>Coin Breakage</Text>
              <TouchableOpacity onPress={loadBreakageStats} disabled={loading}>
                <Ionicons name="refresh" size={18} color={Colors.light.secondaryText} />
              </TouchableOpacity>
            </View>

            {breakageStats ? (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Total Breakage (30d)</Text>
                  <Text style={styles.statValue}>
                    {(breakageStats.totalBreakage ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.statUnit}>coins expired</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>This Month</Text>
                  <Text style={styles.statValue}>
                    {(
                      breakageStats.monthly?.[breakageStats.monthly.length - 1]?.amount ?? 0
                    ).toLocaleString()}
                  </Text>
                  <Text style={styles.statUnit}>coins expired</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Today</Text>
                  <Text style={styles.statValue}>
                    {(
                      breakageStats.daily?.[breakageStats.daily.length - 1]?.amount ?? 0
                    ).toLocaleString()}
                  </Text>
                  <Text style={styles.statUnit}>coins expired</Text>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.statsContainer,
                  { justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
                ]}
              >
                <Ionicons name="analytics-outline" size={32} color={Colors.light.secondaryText} />
                <Text style={{ color: Colors.light.secondaryText, marginTop: 8, fontSize: 13 }}>
                  No breakage data available
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Clawback Modal */}
      <Modal visible={showClawbackModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Emergency Clawback</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>User ID</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="User ID"
                value={clawbackUserId}
                onChangeText={setClawbackUserId}
                editable={!actionLoading}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Amount (coins)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Amount"
                value={clawbackAmount}
                onChangeText={setClawbackAmount}
                keyboardType="number-pad"
                editable={!actionLoading}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Reason</Text>
              <TextInput
                style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Why is this clawback needed?"
                value={clawbackReason}
                onChangeText={setClawbackReason}
                multiline
                editable={!actionLoading}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowClawbackModal(false);
                  setClawbackUserId('');
                  setClawbackAmount('');
                  setClawbackReason('');
                }}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, actionLoading && { opacity: 0.6 }]}
                onPress={handleClawback}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Execute Clawback</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function CoinGovernorScreen() {
  const { hasRole } = useAuth();

  if (!hasRole(ADMIN_ROLES.SUPER_ADMIN)) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.light.secondaryText} />
        <Text style={[styles.sectionTitle, { marginTop: 16, textAlign: 'center' }]}>
          Access Denied
        </Text>
        <Text
          style={{
            color: Colors.light.secondaryText,
            textAlign: 'center',
            paddingHorizontal: 32,
            marginTop: 8,
          }}
        >
          You need Super Admin privileges to access the Coin Economy Governor.
        </Text>
      </View>
    );
  }

  return <CoinGovernorContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : (RNStatusBar.currentHeight || 40) + 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.light.secondaryText,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 2,
  },
  statusTime: {
    fontSize: 11,
    color: Colors.light.secondaryText,
  },
  controlCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  controlDesc: {
    fontSize: 12,
    color: Colors.light.secondaryText,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.light.text,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    gap: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  frozenList: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  frozenTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  frozenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  frozenInfo: {
    flex: 1,
  },
  frozenName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  frozenTime: {
    fontSize: 11,
    color: Colors.light.secondaryText,
    marginTop: 2,
  },
  unfreezeLink: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 12,
  },
  statsContainer: {
    gap: 10,
  },
  statCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.secondaryText,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 6,
  },
  statUnit: {
    fontSize: 11,
    color: Colors.light.secondaryText,
    marginTop: 4,
  },
  rateBar: {
    height: 6,
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  rateBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: Colors.light.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.light.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 13,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
