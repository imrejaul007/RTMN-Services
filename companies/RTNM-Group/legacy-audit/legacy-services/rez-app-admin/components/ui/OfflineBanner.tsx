import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Colors } from '@/constants/Colors';

interface OfflineBannerProps {
  /** If true, the banner shows connection type details on press */
  showDetails?: boolean;
}

/**
 * OfflineBanner
 *
 * Shows a persistent banner at the top of the screen when the device is offline.
 * Disappears automatically when connectivity is restored.
 *
 * Usage:
 * ```tsx
 * <OfflineBanner />
 * // or with expandable details
 * <OfflineBanner showDetails />
 * ```
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  showDetails = false,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef<any>(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? true);
      setConnectionType(state.type ?? 'unknown');
    });

    // Check initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? true);
      setConnectionType(state.type ?? 'unknown');
    });

    return () => unsubscribe();
  }, []);

  // Don't show banner when online
  if (isOnline) return null;

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    Animated.timing(animation, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const expandedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.banner}
        onPress={showDetails ? toggleExpanded : undefined}
        activeOpacity={showDetails ? 0.8 : 1}
      >
        <View style={styles.content}>
          <Ionicons name="cloud-offline" size={18} color={Colors.light.card} />
          <Text style={styles.primaryText}>You are offline</Text>
          <Text style={styles.secondaryText}>
            Changes will sync when connection returns
          </Text>
          {showDetails && (
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.light.card}
            />
          )}
        </View>
      </TouchableOpacity>

      {showDetails && (
        <Animated.View style={[styles.expandedContent, { height: expandedHeight }]}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Connection type:</Text>
            <Text style={styles.detailValue}>{connectionType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, { color: Colors.light.error }]}>
              Offline
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.error,
    zIndex: 999,
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryText: {
    color: Colors.light.card,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  secondaryText: {
    color: Colors.light.card,
    fontSize: 11,
    opacity: 0.85,
  },
  expandedContent: {
    overflow: 'hidden',
    backgroundColor: Colors.light.errorDark ?? '#B91C1C',
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.light.card,
    opacity: 0.75,
  },
  detailValue: {
    fontSize: 11,
    color: Colors.light.card,
    fontWeight: '600',
  },
});

export default OfflineBanner;
