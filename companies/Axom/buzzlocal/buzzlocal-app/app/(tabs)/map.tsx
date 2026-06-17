/**
 * BuzzLocal - Map Screen
 * Interactive map with local points
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../src/constants';

const MAP_POIS = [
  { id: '1', name: 'Pizza Hub', type: 'Restaurant', lat: 12.9352, lng: 77.6245, offers: 2 },
  { id: '2', name: 'Jazz Club', type: 'Event', lat: 12.9716, lng: 77.5946, event: 'Tonight' },
  { id: '3', name: 'Traffic Alert', type: 'Alert', lat: 12.9720, lng: 77.5950, severity: 'warning' },
];

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color={COLORS.textMuted} />
          <Text style={styles.mapText}>Interactive Map</Text>
          <Text style={styles.mapSubtext}>Places, events, and alerts nearby</Text>
        </View>

        {/* Floating Search */}
        <View style={styles.searchOverlay}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <Text style={styles.searchPlaceholder}>Search places...</Text>
          </View>
        </View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <View style={styles.controlButton}>
            <Ionicons name="locate" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.controlButton}>
            <Ionicons name="layers" size={24} color={COLORS.textSecondary} />
          </View>
        </View>
      </View>

      {/* Bottom POI Cards */}
      <View style={styles.poiContainer}>
        <Text style={styles.poiTitle}>🧭 What's Nearby</Text>
        {MAP_POIS.map((poi) => (
          <View key={poi.id} style={styles.poiCard}>
            <View style={[styles.poiIcon, { backgroundColor: poi.type === 'Alert' ? COLORS.warning + '20' : COLORS.accent + '20' }]}>
              <Ionicons
                name={poi.type === 'Event' ? 'calendar' : poi.type === 'Alert' ? 'warning' : 'restaurant'}
                size={20}
                color={poi.type === 'Alert' ? COLORS.warning : COLORS.accent}
              />
            </View>
            <View style={styles.poiContent}>
              <Text style={styles.poiName}>{poi.name}</Text>
              <Text style={styles.poiType}>{poi.type}</Text>
            </View>
            {poi.offers && (
              <View style={styles.poiBadge}>
                <Text style={styles.poiBadgeText}>{poi.offers} offers</Text>
              </View>
            )}
            {poi.event && (
              <View style={[styles.poiBadge, { backgroundColor: COLORS.accent + '20' }]}>
                <Text style={[styles.poiBadgeText, { color: COLORS.accent }]}>{poi.event}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  mapContainer: { flex: 1, backgroundColor: '#E8E8E8', position: 'relative' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  mapSubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  searchOverlay: { position: 'absolute', top: 60, left: 16, right: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingHorizontal: 16, paddingVertical: 14, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  searchPlaceholder: { flex: 1, fontSize: 16, color: COLORS.textMuted },
  mapControls: { position: 'absolute', right: 16, bottom: 200, gap: 8 },
  controlButton: { width: 44, height: 44, backgroundColor: COLORS.card, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  poiContainer: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: 100 },
  poiTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md },
  poiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  poiIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  poiContent: { flex: 1, marginLeft: SPACING.md },
  poiName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  poiType: { fontSize: 13, color: COLORS.textSecondary },
  poiBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  poiBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
});
