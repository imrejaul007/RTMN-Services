import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authService, AdminUser } from '../../services/api/auth';
import { apiClient } from '../../services/api/apiClient';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  lastModified?: string;
}

// PERF: Memoize SettingItem to prevent unnecessary re-renders (default shallow comparison)
const SettingItem = React.memo(function SettingItemComponent({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
  lastModified,
}: SettingItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.icon }]}>{subtitle}</Text>
        )}
        {lastModified && (
          <Text style={[styles.settingLastModified, { color: colors.icon }]}>
            Last changed: {lastModified}
          </Text>
        )}
      </View>
      {rightElement ||
        (showChevron && onPress && (
          <Ionicons name="chevron-forward" size={20} color={colors.icon} />
        ))}
    </TouchableOpacity>
  );
});

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  // BUG-020/081: Use AuthContext logout so the global auth state is properly cleared.
  const { logout: authLogout } = useAuth();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(colorScheme === 'dark');

  // NIDHI: governance — settings search/filter control
  const [searchText, setSearchText] = useState('');

  // BUG-062 FIX: isDirty was set on toggle change but never cleared via a
  // "Save" action, and no API call ever persisted the toggle values. The banner
  // told the user "Unsaved changes" with no way to save. Removed isDirty and
  // the banner rather than shipping a false affordance.
  const [showExportModal, setShowExportModal] = useState(false);

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert('Error', 'All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      showAlert('Error', 'New password must be at least 8 characters');
      return;
    }
    // BUG-029: Enforce password complexity — must contain uppercase, lowercase, digit, and special char.
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!complexityRegex.test(newPassword)) {
      showAlert(
        'Weak Password',
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
      return;
    }

    // PRIYA: Destructive action confirmation for password change
    const confirmed = await showConfirm(
      'Confirm Password Change',
      'Are you sure you want to change your admin password? You will need to log in again with the new password.'
    );
    if (!confirmed) return;

    setIsChangingPassword(true);
    try {
      // PRIYA: Add API version header for session tracking
      const response = await apiClient.post(
        'admin/auth/change-password',
        { currentPassword, newPassword },
        {
          headers: { 'X-App-Version': '1.0.0' },
        }
      );

      // PRIYA: Handle 401 - session expired during password change
      if (response?.success) {
        showAlert('Success', 'Password changed successfully. Please log in again.');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Force logout and redirect to login via AuthContext so state is cleared.
        setTimeout(() => {
          authLogout();
        }, 1500);
      } else {
        showAlert('Error', response?.message || 'Failed to change password');
      }
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const loadUser = useCallback(async () => {
    const adminUser = await authService.getCurrentUser();
    setUser(adminUser);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // BUG-020/081: Use AuthContext logout so global auth state and redirect are handled correctly.
  const handleLogout = useCallback(() => {
    showConfirm(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        await authLogout();
      },
      'Logout'
    );
  }, [authLogout]);

  // AS2-L1 / AC2-M7 FIX: Logout all active sessions on all devices.
  const handleLogoutAllDevices = useCallback(() => {
    showConfirm(
      'Logout All Devices',
      'This will sign you out on all devices, including this one. Continue?',
      async () => {
        try {
          await authService.logoutAllDevices();
        } catch {
          // Even if the API call fails, proceed with local logout to ensure
          // the current session is cleared. The server-side invalidation may
          // still succeed on retry or expire naturally.
        }
        await authLogout();
      },
      'Logout All'
    );
  }, [authLogout]);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'operator':
        return 'Operator';
      case 'support':
        return 'Support';
      default:
        return 'Unknown';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return colors.errorDark;
      case 'admin':
        return colors.purpleDark;
      case 'operator':
        return colors.info;
      case 'support':
        return colors.success;
      default:
        return colors.icon;
    }
  };

  // NIDHI: governance — filter settings by search text (name matching)
  const filterSettings = (title: string, subtitle?: string): boolean => {
    if (!searchText.trim()) return true;
    const query = searchText.toLowerCase();
    return (
      title.toLowerCase().includes(query) || (subtitle?.toLowerCase().includes(query) ?? false)
    );
  };

  // NIDHI: governance — export all settings as JSON to clipboard
  const handleExportConfig = useCallback(async () => {
    const configSnapshot = {
      notificationsEnabled,
      darkModeEnabled,
      exportedAt: new Date().toISOString(),
      adminUser: user?.email,
    };
    const jsonStr = JSON.stringify(configSnapshot, null, 2);
    // Note: React Native doesn't have clipboard API in core; use platform-specific solution
    // For now, show in modal. Production would use react-native-clipboard
    setShowExportModal(true);
  }, [notificationsEnabled, darkModeEnabled, user]);

  const handleNotificationsChange = useCallback((value: boolean) => {
    setNotificationsEnabled(value);
  }, []);

  const handleDarkModeChange = useCallback((value: boolean) => {
    setDarkModeEnabled(value);
  }, []);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* BUG-062 FIX: unsaved changes banner removed — toggles are not persisted */}

      {/* NIDHI: governance — settings search/filter input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search settings..."
          placeholderTextColor={colors.icon}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
          <Ionicons name="person" size={32} color={colors.card} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {user?.name || 'Admin User'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.icon }]}>
            {/* BUG-018 FIX: Show loading indicator instead of hardcoded fallback email */}
            {user?.email ?? (user === null ? 'Loading...' : '')}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(user?.role)}20` }]}>
            <Text style={[styles.roleText, { color: getRoleColor(user?.role) }]}>
              {getRoleLabel(user?.role)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* REZ TRY */}
      {filterSettings('Trial Approvals') ||
      filterSettings('Campaign Management') ||
      filterSettings('Bundle Management') ||
      filterSettings('Coin Governor') ||
      filterSettings('Fraud Alerts') ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.icon }]}>REZ TRY</Text>
          <View style={styles.settingsGroup}>
            {filterSettings('Trial Approvals') && (
              <SettingItem
                icon="star"
                iconColor={colors.warning}
                title="Trial Approvals"
                subtitle="Review & approve merchant trials"
                onPress={() => router.push('/(dashboard)/trial-approvals')}
              />
            )}
            {filterSettings('Campaign Management') && (
              <SettingItem
                icon="megaphone"
                iconColor={colors.info}
                title="Campaign Management"
                subtitle="Create & manage discovery campaigns"
                onPress={() => router.push('/(dashboard)/campaigns')}
              />
            )}
            {filterSettings('Bundle Management') && (
              <SettingItem
                icon="gift-outline"
                iconColor={colors.purple}
                title="Bundle Management"
                subtitle="Create & manage trial bundles & passes"
                onPress={() => router.push('/(dashboard)/bundle-management')}
              />
            )}
            {filterSettings('Coin Governor') && (
              <SettingItem
                icon="star"
                iconColor={colors.warning}
                title="Coin Governor"
                subtitle="Emergency controls & breakage stats"
                onPress={() => router.push('/(dashboard)/coin-governor')}
              />
            )}
            {filterSettings('Fraud Alerts') && (
              <SettingItem
                icon="alert-circle"
                iconColor={colors.error}
                title="Fraud Alerts"
                subtitle="Monitor fraud signals & suspicious bookings"
                onPress={() => router.push('/(dashboard)/fraud-alerts')}
              />
            )}
          </View>
        </View>
      ) : null}

      {/* Financial & Compliance */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>FINANCIAL & COMPLIANCE</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="wallet"
            iconColor={colors.success}
            title="Wallet Management"
            subtitle="Manage user wallets"
            onPress={() => router.push('/(dashboard)/wallet')}
          />
          <SettingItem
            icon="settings"
            iconColor={colors.indigo}
            title="Wallet Config"
            subtitle="Transfer limits, cashback tiers, fraud thresholds"
            onPress={() => router.push('/(dashboard)/wallet-config')}
          />
          <SettingItem
            icon="people-circle"
            iconColor={colors.cyan}
            title="User Wallets"
            subtitle="Search, freeze, adjust user wallets"
            onPress={() => router.push('/(dashboard)/user-wallets')}
          />
          <SettingItem
            icon="stats-chart"
            iconColor={colors.success}
            title="Economy Dashboard"
            subtitle="Monitor coin economy & fraud"
            onPress={() => router.push('/(dashboard)/gamification-economy')}
          />
          <SettingItem
            icon="warning"
            iconColor={colors.error}
            title="Fraud Reports"
            subtitle="Review fraud reports & suspicious activity"
            onPress={() => router.push('/(dashboard)/fraud-reports')}
          />
          <SettingItem
            icon="shield-checkmark"
            iconColor={colors.navy}
            title="Fraud & Cashback Config"
            subtitle="Live controls for cashback limits, hold periods and risk thresholds"
            onPress={() => router.push('/(dashboard)/fraud-config')}
          />
          <SettingItem
            icon="checkmark-circle"
            iconColor={colors.success}
            title="Reconciliation"
            subtitle="Financial state integrity & issue tracking"
            onPress={() => router.push('/(dashboard)/reconciliation')}
          />
          <SettingItem
            icon="chatbox"
            iconColor={colors.purple}
            title="Economics"
            subtitle="Monitor coin economy & financial metrics"
            onPress={() => router.push('/(dashboard)/economics')}
          />
          <SettingItem
            icon="medkit"
            iconColor={colors.cyan}
            title="BBPS Health"
            subtitle="Bill payment system health & status"
            onPress={() => router.push('/(dashboard)/bbps-health')}
          />
          <SettingItem
            icon="analytics-outline"
            iconColor={colors.cyan}
            title="BBPS Analytics"
            subtitle="Bill payment analytics & reports"
            onPress={() => router.push('/(dashboard)/bbps-analytics')}
          />
          <SettingItem
            icon="settings-outline"
            iconColor={colors.cyan}
            title="BBPS Config"
            subtitle="Configure bill payment settings"
            onPress={() => router.push('/(dashboard)/bbps-config')}
          />
          <SettingItem
            icon="grid-outline"
            iconColor={colors.cyan}
            title="BBPS Providers"
            subtitle="Manage bill payment providers"
            onPress={() => router.push('/(dashboard)/bbps-providers')}
          />
          <SettingItem
            icon="receipt-outline"
            iconColor={colors.cyan}
            title="BBPS Transactions"
            subtitle="View bill payment transactions"
            onPress={() => router.push('/(dashboard)/bbps-transactions')}
          />
          <SettingItem
            icon="cash-outline"
            iconColor={colors.greenDark}
            title="Cashback Rules"
            subtitle="Configure cashback rules & tiers"
            onPress={() => router.push('/(dashboard)/cashback-rules')}
          />
          <SettingItem
            icon="id-card-outline"
            iconColor={colors.purpleDark}
            title="Membership Config"
            subtitle="Configure membership plans & perks"
            onPress={() => router.push('/(dashboard)/membership-config')}
          />
          <SettingItem
            icon="ticket-outline"
            iconColor={colors.warningDark}
            title="Voucher Management"
            subtitle="Manage vouchers & coupon codes"
            onPress={() => router.push('/(dashboard)/voucher-management')}
          />
          <SettingItem
            icon="card-outline"
            iconColor={colors.info}
            title="Wallet Adjustment"
            subtitle="Manual wallet balance adjustments"
            onPress={() => router.push('/(dashboard)/wallet-adjustment')}
          />
          <SettingItem
            icon="document-text-outline"
            iconColor={colors.gray500}
            title="Payroll"
            subtitle="Manage payroll & disbursements"
            onPress={() => router.push('/(dashboard)/payroll')}
          />
          <SettingItem
            icon="cash-outline"
            iconColor={colors.successDark}
            title="Partner Earnings"
            subtitle="Track & manage partner earnings"
            onPress={() => router.push('/(dashboard)/partner-earnings')}
          />
          <SettingItem
            icon="alert-circle-outline"
            iconColor={colors.error}
            title="Disputes"
            subtitle="Resolve transaction disputes"
            onPress={() => router.push('/(dashboard)/disputes')}
          />
        </View>
      </View>

      {/* Offers & Zones Management */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>OFFERS & ZONES</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="pricetag"
            iconColor={colors.success}
            title="Offers Management"
            subtitle="Create & manage all offers"
            onPress={() => router.push('/(dashboard)/offers')}
          />
          <SettingItem
            icon="layers"
            iconColor={colors.indigo}
            title="Offers Page Sections"
            subtitle="Toggle, reorder & configure all 21 sections"
            onPress={() => router.push('/(dashboard)/offers-sections')}
          />
          <SettingItem
            icon="flash"
            iconColor={colors.orange}
            title="Flash Sales"
            subtitle="Manage flash sales & lightning deals"
            onPress={() => router.push('/(dashboard)/flash-sales')}
          />
          <SettingItem
            icon="flame"
            iconColor={colors.error}
            title="Hotspot Areas"
            subtitle="Manage geographic deal hotspots"
            onPress={() => router.push('/(dashboard)/hotspot-areas')}
          />
          <SettingItem
            icon="card"
            iconColor={colors.info}
            title="Bank Offers"
            subtitle="Manage bank partnership offers"
            onPress={() => router.push('/(dashboard)/bank-offers')}
          />
          <SettingItem
            icon="document-text"
            iconColor={colors.purple}
            title="Upload Bill Stores"
            subtitle="Manage bill upload cashback stores"
            onPress={() => router.push('/(dashboard)/upload-bill-stores')}
          />
          <SettingItem
            icon="shield-checkmark"
            iconColor={colors.success}
            title="Exclusive Zones"
            subtitle="Manage student, corporate & birthday zones"
            onPress={() => router.push('/(dashboard)/exclusive-zones')}
          />
          <SettingItem
            icon="ribbon"
            iconColor={colors.successDark}
            title="Special Profiles"
            subtitle="Manage defence, healthcare & other profiles"
            onPress={() => router.push('/(dashboard)/special-profiles')}
          />
          <SettingItem
            icon="trophy"
            iconColor={colors.warning}
            title="Loyalty Milestones"
            subtitle="Manage loyalty program milestones"
            onPress={() => router.push('/(dashboard)/loyalty-milestones')}
          />
          <SettingItem
            icon="gift-outline"
            iconColor={colors.errorDark}
            title="Bonus Zone"
            subtitle="Cashback boosts, bank offers & bonuses"
            onPress={() => router.push('/(dashboard)/bonus-zone')}
          />
          <SettingItem
            icon="sparkles-outline"
            iconColor={colors.purple}
            title="What's New Stories"
            subtitle="Manage homepage story circles"
            onPress={() => router.push('/(dashboard)/whats-new')}
          />
          <SettingItem
            icon="diamond-outline"
            iconColor={colors.gold}
            title="Privé"
            subtitle="Offers, vouchers, reputation & analytics"
            onPress={() => router.push('/(dashboard)/prive')}
          />
          <SettingItem
            icon="megaphone-outline"
            iconColor={colors.purple}
            title="Privé Campaigns"
            subtitle="Exclusive campaigns for Privé members"
            onPress={() => router.push('/(dashboard)/prive-campaigns')}
          />
        </View>
      </View>

      {/* Homepage Management */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>HOMEPAGE MANAGEMENT</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="flash"
            iconColor={colors.warning}
            title="Deals Section"
            subtitle="Manage deals that save money"
            onPress={() => router.push('/(dashboard)/homepage-deals')}
          />
          <SettingItem
            icon="sparkles"
            iconColor={colors.purple}
            title="Shop by Experience"
            subtitle="Manage homepage experiences"
            onPress={() => router.push('/(dashboard)/experiences')}
          />
          <SettingItem
            icon="compass"
            iconColor={colors.cyan}
            title="Explore Section"
            subtitle="Manage explore page content"
            onPress={() => router.push('/(dashboard)/explore')}
          />
          <SettingItem
            icon="apps"
            iconColor={colors.purple}
            title="Categories"
            subtitle="Manage main categories & page configs"
            onPress={() => router.push('/(dashboard)/categories')}
          />
          <SettingItem
            icon="bag-handle"
            iconColor={colors.info}
            title="Mall Management"
            subtitle="Manage mall brands, categories & offers"
            onPress={() => router.push('/(dashboard)/mall')}
          />
          <SettingItem
            icon="rocket"
            iconColor={colors.warning}
            title="Extra Rewards"
            subtitle="Double cashback campaigns & coin drops"
            onPress={() => router.push('/(dashboard)/extra-rewards')}
          />
          <SettingItem
            icon="cash"
            iconColor={colors.success}
            title="Cash Store Management"
            subtitle="Vouchers, coupons, campaigns & analytics"
            onPress={() => router.push('/(dashboard)/cash-store')}
          />
          <SettingItem
            icon="airplane"
            iconColor={colors.purple}
            title="Travel Management"
            subtitle="Bookings, categories, cashback & analytics"
            onPress={() => router.push('/(dashboard)/travel')}
          />
          <SettingItem
            icon="albums-outline"
            iconColor={colors.info}
            title="Store Collections"
            subtitle="Curated store collections & featured sets"
            onPress={() => router.push('/(dashboard)/store-collections')}
          />
        </View>
      </View>

      {/* Analytics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>ANALYTICS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="stats-chart"
            iconColor={colors.navy}
            title="Revenue Dashboard"
            subtitle="KPIs, 7-day chart, top merchants & tier distribution"
            onPress={() => router.push('/(dashboard)/revenue')}
          />
          <SettingItem
            icon="analytics"
            iconColor={colors.tint}
            title="Analytics Dashboard"
            subtitle="Platform overview, user growth, top merchants & fraud"
            onPress={() => router.push('/(dashboard)/analytics-dashboard')}
          />
          <SettingItem
            icon="trending-up"
            iconColor={colors.green}
            title="Business Metrics"
            subtitle="Core business KPIs & dashboards"
            onPress={() => router.push('/(dashboard)/business-metrics')}
          />
          <SettingItem
            icon="bar-chart-outline"
            iconColor={colors.green}
            title="Revenue by Vertical"
            subtitle="Revenue breakdown by business vertical"
            onPress={() => router.push('/(dashboard)/revenue-by-vertical')}
          />
          <SettingItem
            icon="people-outline"
            iconColor={colors.info}
            title="Cohort Analysis"
            subtitle="User retention cohorts & lifecycle"
            onPress={() => router.push('/(dashboard)/cohort-analysis')}
          />
          <SettingItem
            icon="funnel-outline"
            iconColor={colors.warning}
            title="Funnel Analytics"
            subtitle="Conversion funnels & dropoff analysis"
            onPress={() => router.push('/(dashboard)/funnel-analytics')}
          />
          <SettingItem
            icon="git-branch-outline"
            iconColor={colors.purple}
            title="A/B Test Manager"
            subtitle="Manage & monitor active experiments"
            onPress={() => router.push('/(dashboard)/ab-test-manager')}
          />
          <SettingItem
            icon="megaphone-outline"
            iconColor={colors.errorDark}
            title="Marketing Analytics"
            subtitle="Cross-merchant campaigns, channels & keyword ads"
            onPress={() => router.push('/(dashboard)/marketing-analytics')}
          />
        </View>
      </View>

      {/* Dining & Web Orders */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>DINING & WEB ORDERS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="bag-handle-outline"
            iconColor={colors.orange ?? colors.warning}
            title="REZ Now Orders"
            subtitle="All web-ordering (dine-in QR) orders with filters & pagination"
            onPress={() => router.push('/(dashboard)/rez-now-orders')}
          />
          <SettingItem
            icon="bar-chart-outline"
            iconColor={colors.purple}
            title="REZ Now Analytics"
            subtitle="Per-store order analytics: revenue, top items, peak hours"
            onPress={() => router.push('/(dashboard)/rez-now-analytics')}
          />
          <SettingItem
            icon="document-text-outline"
            iconColor={colors.successDark}
            title="Revenue Report"
            subtitle="Date-range revenue, payment split & top items with CSV export"
            onPress={() => router.push('/(dashboard)/revenue-report')}
          />
          <SettingItem
            icon="qr-code-outline"
            iconColor={colors.tint}
            title="Web Menu Analytics"
            subtitle="QR scan orders & dine-in web performance"
            onPress={() => router.push('/(dashboard)/web-menu-analytics')}
          />
        </View>
      </View>

      {/* Operations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>OPERATIONS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="gift"
            iconColor={colors.warning}
            title="Coin Rewards"
            subtitle="Review and approve rewards"
            onPress={() => router.push('/(dashboard)/coin-rewards')}
          />
          <SettingItem
            icon="card"
            iconColor={colors.warningDark}
            title="Gift Cards"
            subtitle="Manage gift card catalog"
            onPress={() => router.push('/(dashboard)/gift-cards-admin')}
          />
          <SettingItem
            icon="gift"
            iconColor={colors.pink}
            title="Coin Gifts Management"
            subtitle="Manage coin gift campaigns"
            onPress={() => router.push('/(dashboard)/coin-gifts')}
          />
          <SettingItem
            icon="sparkles"
            iconColor={colors.warning}
            title="Surprise Coin Drops"
            subtitle="Schedule & manage surprise coin drops"
            onPress={() => router.push('/(dashboard)/surprise-coin-drops')}
          />
          <SettingItem
            icon="cash"
            iconColor={colors.successDark}
            title="Merchant Withdrawals"
            subtitle="Review & process merchant withdrawals"
            onPress={() => router.push('/(dashboard)/merchant-withdrawals')}
          />
          <SettingItem
            icon="people"
            iconColor={colors.info}
            title="Users"
            subtitle="Manage user accounts"
            onPress={() => router.push('/(dashboard)/users')}
          />
          <SettingItem
            icon="warning"
            iconColor={colors.error}
            title="Fraud Queue"
            subtitle="Review coin-velocity flagged users"
            onPress={() => router.push('/(dashboard)/fraud-queue')}
          />
          <SettingItem
            icon="shield-checkmark"
            iconColor={colors.purple}
            title="Verifications"
            subtitle="Review student & zone verifications"
            onPress={() => router.push('/(dashboard)/verifications')}
          />
          <SettingItem
            icon="ribbon"
            iconColor={colors.gold}
            title="Special Programs"
            subtitle="Student Zone, Corporate Perks, Privé"
            onPress={() => router.push('/(dashboard)/special-programs')}
          />
          <SettingItem
            icon="trophy"
            iconColor={colors.warning}
            title="Loyalty Management"
            subtitle="Manage user streaks, missions & coins"
            onPress={() => router.push('/(dashboard)/loyalty')}
          />
          <SettingItem
            icon="flag"
            iconColor={colors.error}
            title="Challenges"
            subtitle="Manage Play & Earn challenges"
            onPress={() => router.push('/(dashboard)/challenges')}
          />
          <SettingItem
            icon="heart"
            iconColor={colors.pink}
            title="Social Impact"
            subtitle="CSR events, participants & rewards"
            onPress={() => router.push('/(dashboard)/social-impact')}
          />
          <SettingItem
            icon="business"
            iconColor={colors.info}
            title="CSR Sponsors"
            subtitle="Sponsors, budgets & brand coins"
            onPress={() => router.push('/(dashboard)/sponsors')}
          />
          <SettingItem
            icon="trophy"
            iconColor={colors.warning}
            title="Tournaments"
            subtitle="Manage tournaments & prize pools"
            onPress={() => router.push('/(dashboard)/tournaments')}
          />
          <SettingItem
            icon="book"
            iconColor={colors.info}
            title="Learning Content"
            subtitle="Manage educational articles & rewards"
            onPress={() => router.push('/(dashboard)/learning-content')}
          />
          <SettingItem
            icon="game-controller"
            iconColor={colors.info}
            title="Game Config"
            subtitle="Configure mini-games & rewards"
            onPress={() => router.push('/(dashboard)/game-config')}
          />
          <SettingItem
            icon="speedometer"
            iconColor={colors.success}
            title="System Health"
            subtitle="API uptime, DB health, incidents & services"
            onPress={() => router.push('/(dashboard)/system-health')}
          />
          <SettingItem
            icon="document-text"
            iconColor={colors.indigo}
            title="Audit Log"
            subtitle="Admin action history, timeline & CSV export"
            onPress={() => router.push('/(dashboard)/audit-log')}
          />
          <SettingItem
            icon="settings"
            iconColor={colors.orange}
            title="Admin Settings"
            subtitle="Cashback multiplier, maintenance mode, admin users"
            onPress={() => router.push('/(dashboard)/admin-settings')}
          />
          <SettingItem
            icon="car"
            iconColor={colors.info}
            title="Delivery Settings"
            subtitle="Configure delivery zones & fees"
            onPress={() => router.push('/(dashboard)/delivery-settings')}
          />
          <SettingItem
            icon="trophy-outline"
            iconColor={colors.warning}
            title="Achievements"
            subtitle="Manage user achievement badges & milestones"
            onPress={() => router.push('/(dashboard)/achievements')}
          />
          <SettingItem
            icon="podium-outline"
            iconColor={colors.purple}
            title="Leaderboard Config"
            subtitle="Configure leaderboard rules & scoring"
            onPress={() => router.push('/(dashboard)/leaderboard-config')}
          />
          <SettingItem
            icon="calendar-outline"
            iconColor={colors.purpleDark}
            title="Daily Check-In Config"
            subtitle="Configure daily check-in rewards"
            onPress={() => router.push('/(dashboard)/daily-checkin-config')}
          />
          <SettingItem
            icon="flash-outline"
            iconColor={colors.warningDark}
            title="Quick Actions"
            subtitle="Manage homepage quick action shortcuts"
            onPress={() => router.push('/(dashboard)/quick-actions')}
          />
          <SettingItem
            icon="card-outline"
            iconColor={colors.info}
            title="Value Cards"
            subtitle="Manage value card offerings"
            onPress={() => router.push('/(dashboard)/value-cards')}
          />
          <SettingItem
            icon="megaphone-outline"
            iconColor={colors.info}
            title="Campaign Management"
            subtitle="Manage merchant & user campaigns"
            onPress={() => router.push('/(dashboard)/campaign-management')}
          />
          <SettingItem
            icon="people-circle-outline"
            iconColor={colors.pink}
            title="Creators"
            subtitle="Manage content creators & influencers"
            onPress={() => router.push('/(dashboard)/creators')}
          />
          <SettingItem
            icon="calendar"
            iconColor={colors.info}
            title="Events"
            subtitle="Manage events & experiences"
            onPress={() => router.push('/(dashboard)/events')}
          />
          <SettingItem
            icon="apps-outline"
            iconColor={colors.indigo}
            title="Event Categories"
            subtitle="Manage event category taxonomy"
            onPress={() => router.push('/(dashboard)/event-categories')}
          />
          <SettingItem
            icon="gift-outline"
            iconColor={colors.green}
            title="Event Rewards"
            subtitle="Configure event participation rewards"
            onPress={() => router.push('/(dashboard)/event-rewards')}
          />
          <SettingItem
            icon="calendar-clear-outline"
            iconColor={colors.cyan}
            title="Service Appointments"
            subtitle="Manage service booking & appointments"
            onPress={() => router.push('/(dashboard)/service-appointments')}
          />
          <SettingItem
            icon="restaurant-outline"
            iconColor={colors.orange}
            title="Table Bookings"
            subtitle="Manage restaurant table reservations"
            onPress={() => router.push('/(dashboard)/table-bookings')}
          />
          <SettingItem
            icon="school-outline"
            iconColor={colors.purpleDark}
            title="Institute Referrals"
            subtitle="Manage institutional referral programs"
            onPress={() => router.push('/(dashboard)/institute-referrals')}
          />
        </View>
      </View>

      {/* Engagement & UGC */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>ENGAGEMENT & UGC</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="camera"
            iconColor={colors.pink}
            title="Photo Moderation"
            subtitle="Review user-uploaded photos"
            onPress={() => router.push('/(dashboard)/photo-moderation')}
          />
          <SettingItem
            icon="bar-chart"
            iconColor={colors.indigo}
            title="Polls"
            subtitle="Create & manage polls"
            onPress={() => router.push('/(dashboard)/polls')}
          />
          <SettingItem
            icon="chatbubbles"
            iconColor={colors.success}
            title="Comments Moderation"
            subtitle="Review & moderate user comments"
            onPress={() => router.push('/(dashboard)/comments-moderation')}
          />
          <SettingItem
            icon="heart"
            iconColor={colors.error}
            title="Reactions"
            subtitle="Manage reaction types & emojis"
            onPress={() => router.push('/(dashboard)/reactions')}
          />
          <SettingItem
            icon="megaphone"
            iconColor={colors.warning}
            title="Engagement Config"
            subtitle="Trending posts, viral limits"
            onPress={() => router.push('/(dashboard)/engagement-config')}
          />
        </View>
      </View>

      {/* System */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>SYSTEM</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="desktop-outline"
            iconColor={colors.tint}
            title="System Monitor"
            subtitle="Unified command center — services, queues & health"
            onPress={() => router.push('/(dashboard)/unified-monitor')}
          />
          <SettingItem
            icon="speedometer-outline"
            iconColor={colors.purpleDark}
            title="API Latency"
            subtitle="Monitor API performance metrics"
            onPress={() => router.push('/(dashboard)/api-latency')}
          />
          <SettingItem
            icon="notifications-outline"
            iconColor={colors.error}
            title="Alert Rules"
            subtitle="Configure alert thresholds & channels"
            onPress={() => router.push('/(dashboard)/alert-rules')}
          />
          <SettingItem
            icon="git-branch-outline"
            iconColor={colors.purple}
            title="Feature Flags"
            subtitle="Toggle features for users & merchants"
            onPress={() => router.push('/(dashboard)/feature-flags')}
          />
          <SettingItem
            icon="pulse"
            iconColor={colors.error}
            title="SLA Monitor"
            subtitle="Snapshot freshness, queue depth, daily stats"
            onPress={() => router.push('/(dashboard)/sla-monitor')}
          />
          <SettingItem
            icon="hammer"
            iconColor={colors.warning}
            title="Job Monitor"
            subtitle="Background jobs, queue status"
            onPress={() => router.push('/(dashboard)/job-monitor')}
          />
          <SettingItem
            icon="megaphone"
            iconColor={colors.errorDark}
            title="Notification Management"
            subtitle="Push, SMS & in-app notifications"
            onPress={() => router.push('/(dashboard)/notification-management')}
          />
          <SettingItem
            icon="settings-outline"
            iconColor={colors.purpleDark}
            title="Platform Config"
            subtitle="System config keys, limits & plan settings"
            onPress={() => router.push('/(dashboard)/platform-config')}
          />
          <SettingItem
            icon="server-outline"
            iconColor={colors.info}
            title="Platform Control Center"
            subtitle="Cross-system health & quick actions"
            onPress={() => router.push('/(dashboard)/platform-control-center')}
          />
          <SettingItem
            icon="git-network-outline"
            iconColor={colors.successDark}
            title="Aggregator Monitor"
            subtitle="Payment aggregator status & routing"
            onPress={() => router.push('/(dashboard)/aggregator-monitor')}
          />
          <SettingItem
            icon="shield-outline"
            iconColor={colors.error}
            title="Device Security"
            subtitle="Device trust, jailbreak detection & policies"
            onPress={() => router.push('/(dashboard)/device-security')}
          />
        </View>
      </View>

      {/* Monitoring */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>MONITORING</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="radio-button-on"
            iconColor={colors.errorDark}
            title="Live Monitor"
            subtitle="Real-time nerve center — server, queues, orders, financials"
            onPress={() => router.push('/(dashboard)/live-monitor')}
          />
          <SettingItem
            icon="storefront"
            iconColor={colors.info}
            title="Merchants"
            subtitle="Manage merchant accounts"
            onPress={() => router.push('/(dashboard)/merchants')}
          />
          <SettingItem
            icon="radio-button-on"
            iconColor={colors.green}
            title="Merchant Live Status"
            subtitle="Real-time merchant activity"
            onPress={() => router.push('/(dashboard)/merchant-live-status')}
          />
          <SettingItem
            icon="bar-chart-outline"
            iconColor={colors.purple}
            title="Merchant Plan Analytics"
            subtitle="Plan adoption, upgrades & revenue"
            onPress={() => router.push('/(dashboard)/merchant-plan-analytics')}
          />
        </View>
      </View>

      {/* Support & Moderation */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>SUPPORT & MODERATION</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="settings"
            iconColor={colors.cyan}
            title="Support Config"
            subtitle="Hours, phone numbers, categories & callbacks"
            onPress={() => router.push('/(dashboard)/support-config')}
          />
          <SettingItem
            icon="chatbubbles"
            iconColor={colors.info}
            title="Support Tickets"
            subtitle="Review & manage support tickets"
            onPress={() => router.push('/(dashboard)/support-tickets')}
          />
          <SettingItem
            icon="hammer-outline"
            iconColor={colors.gray500}
            title="Support Tools"
            subtitle="Admin tools for resolving support issues"
            onPress={() => router.push('/(dashboard)/support-tools')}
          />
          <SettingItem
            icon="help-circle-outline"
            iconColor={colors.info}
            title="FAQ Management"
            subtitle="Manage FAQ articles & categories"
            onPress={() => router.push('/(dashboard)/faq-management')}
          />
          <SettingItem
            icon="camera-outline"
            iconColor={colors.pink}
            title="UGC Moderation"
            subtitle="Moderate user-generated content"
            onPress={() => router.push('/(dashboard)/ugc-moderation')}
          />
          <SettingItem
            icon="star-outline"
            iconColor={colors.warning}
            title="Review Moderation"
            subtitle="Approve & remove user reviews"
            onPress={() => router.push('/(dashboard)/review-moderation')}
          />
          <SettingItem
            icon="checkmark-circle-outline"
            iconColor={colors.green}
            title="Pending Approvals"
            subtitle="Items awaiting admin approval"
            onPress={() => router.push('/(dashboard)/pending-approvals')}
          />
          <SettingItem
            icon="people-outline"
            iconColor={colors.purpleDark}
            title="Admin Users"
            subtitle="Manage admin accounts & roles"
            onPress={() => router.push('/(dashboard)/admin-users')}
          />
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>ACCOUNT</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="key"
            iconColor={colors.warning}
            title="Change Password"
            subtitle="Update your admin password"
            onPress={() => setShowPasswordModal(true)}
            showChevron={true}
          />
          <SettingItem
            icon="phone-portrait-outline"
            iconColor={colors.error}
            title="Logout All Devices"
            subtitle="Sign out from all active sessions"
            onPress={handleLogoutAllDevices}
            showChevron={true}
          />
          <SettingItem
            icon="notifications"
            iconColor={colors.success}
            title="Notifications"
            subtitle="Alert preferences"
            rightElement={
              <Switch value={notificationsEnabled} onValueChange={handleNotificationsChange} />
            }
            showChevron={false}
          />
          <SettingItem
            icon="moon"
            iconColor={colors.purple}
            title="Dark Mode"
            subtitle="Enable dark theme"
            rightElement={<Switch value={darkModeEnabled} onValueChange={handleDarkModeChange} />}
            showChevron={false}
          />
          <SettingItem
            icon="help-circle"
            iconColor={colors.info}
            title="Help & Support"
            subtitle="Contact support team"
            onPress={() => router.push('/(dashboard)/support-tickets')}
          />
        </View>
      </View>

      {/* NIDHI: governance — config export button for audit/recovery */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.tint }]}
          onPress={handleExportConfig}
        >
          <Ionicons name="download-outline" size={18} color="white" />
          <Text style={styles.exportButtonText}>Export Config</Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <View style={[styles.footerSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.appVersion, { color: colors.icon }]}>RezAdmin v1.0.0</Text>
        <Text style={[styles.appCopyright, { color: colors.icon }]}>
          © 2024-2025 Rez. All rights reserved.
        </Text>
      </View>

      {/* NIDHI: governance — config export modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Export Config</Text>
            <Text style={[styles.modalSubtext, { color: colors.icon }]}>
              Exported at {new Date().toLocaleString()}
            </Text>
            <View style={[styles.configBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.configText, { color: colors.text }]}>
                {JSON.stringify(
                  {
                    notificationsEnabled,
                    darkModeEnabled,
                    exportedAt: new Date().toISOString(),
                    adminUser: user?.email,
                  },
                  null,
                  2
                )}
              </Text>
            </View>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => setShowExportModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.icon }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Current Password"
              placeholderTextColor={colors.icon}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isChangingPassword}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="New Password"
              placeholderTextColor={colors.icon}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!isChangingPassword}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.icon}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isChangingPassword}
            />

            {isChangingPassword && <ActivityIndicator size="large" color={colors.tint} />}

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isChangingPassword}
              >
                <Text style={[styles.modalButtonText, { color: colors.icon }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// PERF: Move StyleSheet outside component to prevent recreations
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // NIDHI: governance — unsaved changes banner style
  unsavedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  unsavedText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  // NIDHI: governance — settings search input
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  // NIDHI: governance — last modified timestamp
  settingLastModified: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // NIDHI: governance — export button
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  configBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 300,
  },
  configText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  modalSubtext: {
    fontSize: 13,
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  settingsGroup: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 48,
  },
  appVersion: {
    fontSize: 13,
  },
  appCopyright: {
    fontSize: 11,
    marginTop: 4,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 48,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: Colors.light.text,
  },
  input: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    color: Colors.light.text,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
