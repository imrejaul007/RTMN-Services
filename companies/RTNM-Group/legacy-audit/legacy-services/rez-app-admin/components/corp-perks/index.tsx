/**
 * CorpPerks Admin Components
 *
 * Shared components for CorpPerks admin pages.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';

// Card Component
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyle, style]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: { value: number; isPositive: boolean };
}

export function StatsCard({ title, value, subtitle, icon, iconColor, trend }: StatsCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Card style={styles.statsCard}>
      <View style={styles.statsHeader}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: (iconColor || colors.tint) + '20' }]}>
            <Ionicons name={icon} size={20} color={iconColor || colors.tint} />
          </View>
        )}
        <Text style={[styles.statsTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <Text style={[styles.statsValue, { color: colors.text }]}>{value}</Text>
      <View style={styles.statsFooter}>
        {subtitle && (
          <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons
              name={trend.isPositive ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend.isPositive ? '#22c55e' : '#ef4444'}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend.isPositive ? '#22c55e' : '#ef4444' },
              ]}
            >
              {trend.value}%
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}

// Status Badge Component
type StatusType = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'completed' | 'draft' | 'cancelled' | 'confirmed';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig: Record<StatusType, { color: string; bg: string; label: string }> = {
    active: { color: '#22c55e', bg: '#22c55e20', label: 'Active' },
    inactive: { color: '#6b7280', bg: '#6b728020', label: 'Inactive' },
    pending: { color: '#f59e0b', bg: '#f59e0b20', label: 'Pending' },
    approved: { color: '#22c55e', bg: '#22c55e20', label: 'Approved' },
    rejected: { color: '#ef4444', bg: '#ef444420', label: 'Rejected' },
    completed: { color: '#22c55e', bg: '#22c55e20', label: 'Completed' },
    draft: { color: '#6b7280', bg: '#6b728020', label: 'Draft' },
    cancelled: { color: '#ef4444', bg: '#ef444420', label: 'Cancelled' },
    confirmed: { color: '#3b82f6', bg: '#3b82f620', label: 'Confirmed' },
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>
        {label || config.label}
      </Text>
    </View>
  );
}

// Benefit Type Badge
interface BenefitBadgeProps {
  type: 'meal' | 'travel' | 'gift' | 'wellness' | 'flex' | 'learning';
}

export function BenefitBadge({ type }: BenefitBadgeProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const typeConfig = {
    meal: { color: '#f59e0b', icon: 'restaurant-outline' as const },
    travel: { color: '#3b82f6', icon: 'airplane-outline' as const },
    gift: { color: '#ec4899', icon: 'gift-outline' as const },
    wellness: { color: '#22c55e', icon: 'fitness-outline' as const },
    flex: { color: '#8b5cf6', icon: 'options-outline' as const },
    learning: { color: '#06b6d4', icon: 'school-outline' as const },
  };

  const config = typeConfig[type];

  return (
    <View style={[styles.benefitBadge, { backgroundColor: config.color + '20' }]}>
      <Ionicons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.benefitBadgeText, { color: config.color }]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Text>
    </View>
  );
}

// Loading State
interface LoadingProps {
  message?: string;
}

export function Loading({ message = 'Loading...' }: LoadingProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

// Empty State
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.emptyContainer}>
      {icon && <Ionicons name={icon} size={48} color={colors.textSecondary} />}
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.tint }]} onPress={onAction}>
          <Text style={styles.emptyButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Section Header
interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={[styles.sectionAction, { color: colors.tint }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Tab Selector
interface TabItem {
  key: string;
  label: string;
}

interface TabSelectorProps {
  tabs: TabItem[];
  selected: string;
  onSelect: (key: string) => void;
}

export function TabSelector({ tabs, selected, onSelect }: TabSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            selected === tab.key && [styles.tabActive, { backgroundColor: colors.tint }],
          ]}
          onPress={() => onSelect(tab.key)}
        >
          <Text
            style={[
              styles.tabText,
              { color: selected === tab.key ? '#fff' : colors.textSecondary },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Card
  statsCard: {
    flex: 1,
    minWidth: 140,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsSubtitle: {
    fontSize: 11,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Benefit Badge
  benefitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  benefitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Tab Selector
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    // backgroundColor set dynamically
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

// ============================================
// SHARED UTILITIES
// ============================================

/**
 * Format currency in Indian format
 */
export function formatCurrency(amount: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Format date in Indian format
 */
export function formatDate(
  dateString?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(dateString);
}

/**
 * Get benefit type icon
 */
export function getBenefitIcon(type: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    meal: 'restaurant-outline',
    travel: 'airplane-outline',
    gift: 'gift-outline',
    wellness: 'fitness-outline',
    flex: 'options-outline',
    learning: 'school-outline',
    dining: 'restaurant-outline',
    hotel: 'bed-outline',
    gifting: 'gift-outline',
  };
  return icons[type] || 'card-outline';
}

/**
 * Get benefit type color
 */
export function getBenefitColor(type: string): string {
  const colors: Record<string, string> = {
    meal: '#f59e0b',
    travel: '#3b82f6',
    gift: '#ec4899',
    wellness: '#22c55e',
    flex: '#8b5cf6',
    learning: '#06b6d4',
    dining: '#f59e0b',
    hotel: '#3b82f6',
    gifting: '#ec4899',
  };
  return colors[type] || '#6b7280';
}

/**
 * Get campaign category icon
 */
export function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    environment: 'leaf-outline',
    education: 'school-outline',
    health: 'heart-outline',
    community: 'people-outline',
    disaster_relief: 'alert-circle-outline',
  };
  return icons[category] || 'star-outline';
}

/**
 * Get campaign category color
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    environment: '#22c55e',
    education: '#3b82f6',
    health: '#ef4444',
    community: '#f59e0b',
    disaster_relief: '#8b5cf6',
  };
  return colors[category] || '#6b7280';
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#22c55e',
    confirmed: '#3b82f6',
    completed: '#22c55e',
    enrolled: '#22c55e',
    pending: '#f59e0b',
    draft: '#6b7280',
    inactive: '#6b7280',
    suspended: '#f59e0b',
    rejected: '#ef4444',
    cancelled: '#ef4444',
    terminated: '#ef4444',
  };
  return colors[status] || '#6b7280';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Pluralize a word
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}
