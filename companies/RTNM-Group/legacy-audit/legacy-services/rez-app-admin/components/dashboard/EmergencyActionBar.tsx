/**
 * EmergencyActionBar — Collapsible critical actions bar for admin dashboard
 * Shows quick-access emergency controls for superadmin users.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showConfirm, showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/roles';

interface EmergencyActionBarProps {
  onFreezeMerchant?: () => void;
  onSystemAlert?: () => void;
}

function EmergencyActionBar({ onFreezeMerchant, onSystemAlert }: EmergencyActionBarProps) {
  const { hasRole } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [cashbackPaused, setCashbackPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusUnknown, setStatusUnknown] = useState(false);

  // RBAC: The "Pause Cashback" control kills platform earnings with one tap. Restrict
  // rendering to SUPER_ADMIN so lower-tier admins viewing the dashboard never see
  // emergency controls they should not be able to trigger.
  const isSuperAdmin = hasRole(ADMIN_ROLES.SUPER_ADMIN);

  // Fetch actual cashback state from server on mount — gated by the super-admin check
  // so we neither surface status info nor hit the endpoint for unauthorized admins.
  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        // Try dedicated cashback status endpoint first
        const res = await apiClient.get('admin/economics/cashback-status');
        if (!cancelled && res.success && res.data != null) {
          setCashbackPaused(!(res.data as any).enabled);
          return;
        }
      } catch {
        // Endpoint may not exist — fall through
      }
      try {
        // Fallback: read from admin settings
        const res = await apiClient.get('admin/settings');
        if (!cancelled && res.success && res.data != null) {
          const settings = res.data as any;
          if (typeof settings.cashbackEnabled === 'boolean') {
            setCashbackPaused(!settings.cashbackEnabled);
            return;
          }
          if (typeof settings.cashbackPaused === 'boolean') {
            setCashbackPaused(settings.cashbackPaused);
            return;
          }
        }
      } catch {
        // Neither endpoint available
      }
      if (!cancelled) setStatusUnknown(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return null;
  }

  const handleToggleCashback = async () => {
    const action = cashbackPaused ? 'Resume' : 'Pause';
    const confirmed = await showConfirm(
      `${action} All Cashback`,
      `Are you sure you want to ${action.toLowerCase()} all cashback platform-wide? This affects all users immediately.`,
      undefined,
      action
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await apiClient.post('admin/economics/cashback-toggle', {
        enabled: cashbackPaused,
      });
      if (res.success) {
        setCashbackPaused(!cashbackPaused);
        setStatusUnknown(false);
        showAlert('Success', `Cashback ${cashbackPaused ? 'resumed' : 'paused'} successfully`);
      } else {
        showAlert('Error', res.message || 'Failed to toggle cashback');
      }
    } catch {
      showAlert('Error', 'Failed to toggle cashback');
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <Pressable style={styles.collapsedBar} onPress={() => setExpanded(true)}>
        <Ionicons name="warning" size={16} color="#EF4444" />
        <Text style={styles.collapsedText}>Emergency Controls</Text>
        <Ionicons name="chevron-down" size={16} color="#EF4444" />
      </Pressable>
    );
  }

  return (
    <View style={styles.expandedBar}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="warning" size={16} color="#EF4444" />
          <Text style={styles.headerText}>Emergency Controls</Text>
        </View>
        <Pressable onPress={() => setExpanded(false)}>
          <Ionicons name="chevron-up" size={18} color="#991B1B" />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[
            styles.actionBtn,
            cashbackPaused ? styles.actionBtnResume : styles.actionBtnDanger,
          ]}
          onPress={handleToggleCashback}
          disabled={loading}
        >
          <Ionicons
            name={cashbackPaused ? 'play-circle' : 'pause-circle'}
            size={16}
            color={cashbackPaused ? '#10B981' : '#fff'}
          />
          <Text style={[styles.actionBtnText, cashbackPaused && { color: '#10B981' }]}>
            {cashbackPaused ? 'Resume Cashback' : 'Pause Cashback'}
            {statusUnknown ? ' (status unknown)' : ''}
          </Text>
        </Pressable>

        <Pressable style={[styles.actionBtn, styles.actionBtnWarning]} onPress={onFreezeMerchant}>
          <Ionicons name="snow" size={16} color="#F59E0B" />
          <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Freeze Merchant</Text>
        </Pressable>

        <Pressable style={[styles.actionBtn, styles.actionBtnInfo]} onPress={onSystemAlert}>
          <Ionicons name="megaphone" size={16} color="#3B82F6" />
          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>System Alert</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  collapsedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  expandedBar: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  actionBtnResume: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  actionBtnWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  actionBtnInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});

export default React.memo(EmergencyActionBar);
