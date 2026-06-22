import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { Image as ExpoImage, ImageStyle } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const MAX_RETRIES = 2;

export interface CachedImageProps {
  source: string | { uri: string } | number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  width?: number;
  height?: number;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: string;
  transition?: number;
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  priority?: 'low' | 'normal' | 'high';
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  borderRadius?: number;
  recyclingKey?: string;
  accessibilityLabel?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * CachedImage
 *
 * Image component with disk/memory caching, loading states, error handling with
 * automatic retry (up to 2 retries), and a fallback icon on permanent failure.
 * Uses expo-image under the hood for native performance.
 *
 * Usage:
 * ```tsx
 * <CachedImage
 *   source={{ uri: merchant.logoUrl }}
 *   width={64}
 *   height={64}
 *   borderRadius={8}
 *   fallbackIcon="business"
 * />
 * ```
 */
const CachedImage = memo(
  ({
    source,
    style,
    containerStyle,
    width,
    height,
    contentFit = 'cover',
    placeholder,
    transition = 200,
    cachePolicy = 'memory-disk',
    priority = 'normal',
    fallbackIcon = 'image-outline',
    borderRadius = 0,
    recyclingKey,
    accessibilityLabel,
    onLoad,
    onError,
  }: CachedImageProps) => {
    const isLocalAsset = typeof source === 'number';
    const [hasError, setHasError] = useState(false);
    const retryCountRef = useRef(0);
    const [retryKey, setRetryKey] = useState(0);

    const imageUri = useMemo(() => {
      if (typeof source === 'number') return source;
      return typeof source === 'string' ? source : source?.uri;
    }, [source]);

    // Reset error state when source changes
    useEffect(() => {
      setHasError(false);
      retryCountRef.current = 0;
      setRetryKey(0);
    }, [imageUri]);

    const handleLoad = useCallback(() => {
      retryCountRef.current = 0;
      onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(() => {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        setRetryKey((prev) => prev + 1);
        return;
      }
      setHasError(true);
      onError?.();
    }, [onError]);

    const sizeStyle = useMemo(() => {
      const s: ViewStyle = {};
      if (width) s.width = width;
      if (height) s.height = height;
      if (!width || !height) {
        const flatStyle = StyleSheet.flatten(style) as Record<string, any> | undefined;
        if (flatStyle) {
          if (!width && flatStyle.width) s.width = flatStyle.width;
          if (!height && flatStyle.height) s.height = flatStyle.height;
        }
      }
      return s;
    }, [width, height, style]);

    const iconSize = Math.min(width || 32, height || 32) / 2.5;

    if (hasError || (!imageUri && !isLocalAsset)) {
      return (
        <View
          style={[
            styles.container,
            sizeStyle,
            { borderRadius },
            styles.errorContainer,
            containerStyle,
          ]}
        >
          <Ionicons
            name={fallbackIcon}
            size={iconSize}
            color={Colors.light.textSecondary}
          />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.container,
          isLocalAsset && styles.localAssetContainer,
          sizeStyle,
          { borderRadius },
          containerStyle,
        ]}
      >
        <ExpoImage
          key={retryKey}
          source={imageUri}
          style={[StyleSheet.absoluteFill, { borderRadius }, style]}
          contentFit={contentFit}
          cachePolicy={cachePolicy}
          transition={isLocalAsset ? 0 : transition}
          placeholder={placeholder ? { blurhash: placeholder } : undefined}
          priority={priority}
          recyclingKey={
            recyclingKey ||
            (typeof imageUri === 'string' ? imageUri : undefined)
          }
          onLoad={handleLoad}
          onError={handleError}
          accessibilityLabel={accessibilityLabel}
          {...(Platform.OS === 'web' && typeof imageUri === 'string'
            ? { crossOrigin: 'anonymous' }
            : {})}
        />
      </View>
    );
  },
  (prevProps, nextProps) => {
    const getUri = (s: CachedImageProps['source']) =>
      typeof s === 'number' ? s : typeof s === 'string' ? s : s?.uri;
    return (
      getUri(prevProps.source) === getUri(nextProps.source) &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      prevProps.priority === nextProps.priority &&
      prevProps.borderRadius === nextProps.borderRadius &&
      prevProps.contentFit === nextProps.contentFit &&
      prevProps.style === nextProps.style &&
      prevProps.containerStyle === nextProps.containerStyle
    );
  }
);

CachedImage.displayName = 'CachedImage';

/** Prefetch a list of image URLs into the cache for faster subsequent renders */
export function prefetchImages(urls: string[]): void {
  ExpoImage.prefetch(urls);
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  localAssetContainer: {
    backgroundColor: 'transparent',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundTertiary,
  },
});

export default CachedImage;
