/**
 * AnimatedPressable — TS-H5: missing admin component
 *
 * High-performance pressable with automatic visual feedback and haptic feedback.
 * Brings parity with the merchant app component.
 *
 * Features:
 * - Spring scale animation on press (1 → 0.96 → 1)
 * - Android ripple effect
 * - Haptic feedback option
 * - Accessible by default
 * - useNativeDriver: true for 60fps
 *
 * Usage:
 *   <AnimatedPressable onPress={onPress} haptic="medium">
 *     <Text>Press Me</Text>
 *   </AnimatedPressable>
 */

import React, { useCallback } from 'react';
import { Pressable, PressableProps, ViewStyle, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';

interface AnimatedPressableProps extends Omit<PressableProps, 'onPress'> {
  children: React.ReactNode;
  onPress?: (event: any) => void;
  haptic?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedPressableComponent = React.forwardRef<any, AnimatedPressableProps>(
  (
    {
      onPress,
      onPressIn,
      onPressOut,
      haptic = false,
      hapticType = 'light',
      disabled = false,
      style,
      children,
      ...otherProps
    },
    ref
  ) => {
    const scale = useSharedValue(1);

    const triggerHaptic = useCallback(async () => {
      if (!haptic || Platform.OS === 'web') return;
      try {
        switch (hapticType) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
        }
      } catch {
        // Silent fail for haptics
      }
    }, [haptic, hapticType]);

    const handlePressIn = useCallback(
      (e: any) => {
        if (disabled) return;
        scale.value = withSpring(0.96, { damping: 10, mass: 1, overshootClamping: false });
        triggerHaptic();
        onPressIn?.(e);
      },
      [disabled, scale, triggerHaptic, onPressIn]
    );

    const handlePressOut = useCallback(
      (e: any) => {
        scale.value = withSpring(1, { damping: 8, mass: 1, overshootClamping: false });
        onPressOut?.(e);
      },
      [scale, onPressOut]
    );

    const handlePress = useCallback(
      (e: any) => {
        onPress?.(e);
      },
      [onPress]
    );

    const animatedStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        transform: [{ scale: scale.value }],
      };
    });

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        android_ripple={
          Platform.OS === 'android'
            ? { color: Colors.light.gray200, borderless: false }
            : undefined
        }
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...otherProps}
      >
        <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
      </Pressable>
    );
  }
);

AnimatedPressableComponent.displayName = 'AnimatedPressable';

export default React.memo(AnimatedPressableComponent);
