/**
 * REZ Admin — Hotels Screen
 * Route: /(dashboard)/hotels
 * Shows Hotel OTA overview: property list, OTA stats, brand coin liability.
 * Data is fetched via the backend proxy (admin/ota/*) — never directly from OTA service.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/hotels.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtaHotelAdmin {
  id: string;
  _id?: string;
  name: string;
  city: string;
  country: string;
  starRating: number;
  isActive: boolean;
  onboardingStatus: string;
  brandCoinEnabled: boolean;
  brandCoinName?: string;
  brandCoinOutstandingPaise: number;
  totalBrandCoinLiabilityPaise?: number;
  totalBookings: number;
  totalRevenuePaise: number;
  createdAt: string;
}

// Backend proxy returns: { activeHotels, activeBookings, gmvTodayPaise, brandCoinTotalLiabilityPaise }
interface OtaAdminStats {
  totalHotels: number;
  activeHotels: number;
  activeBookings: number;
  gmvTodayPaise: number;
  brandCoinTotalLiabilityPaise: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <View style={[s.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={[s.statIconBox, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as unknown as keyof typeof Ionicons.glyphMap} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.statLabel}>{label}</Text>
        <Text style={[s.statValue, { color }]}>{value}</Text>
        {sub && <Text style={s.statSub}>{sub}</Text>}
      </View>
    </View>
  );
}

function HotelRow({ hotel }: { hotel: OtaHotelAdmin }) {
  const statusColor = hotel.isActive ? '#16A34A' : '#94A3B8';
  return (
    <View style={s.hotelRow}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Text style={s.hotelName} numberOfLines={1}>
            {hotel.name}
          </Text>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
        </View>
        <Text style={s.hotelCity}>
          {hotel.city}, {hotel.country} · {'★'.repeat(hotel.starRating)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Text style={s.hotelStat}>{hotel.totalBookings} bookings</Text>
          <Text style={s.hotelStat}>
            ₹{Math.round(hotel.totalRevenuePaise / 100).toLocaleString()}
          </Text>
          {hotel.brandCoinEnabled && (
            <Text style={[s.hotelStat, { color: '#7C3AED' }]}>
              Brand: ₹{Math.round(hotel.brandCoinOutstandingPaise / 100).toLocaleString()}
            </Text>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View
          style={[
            s.onboardBadge,
            {
              backgroundColor: hotel.onboardingStatus === 'active' ? '#DCFCE7' : '#FEF9C3',
            },
          ]}
        >
          <Text
            style={[
              s.onboardText,
              {
                color: hotel.onboardingStatus === 'active' ? '#16A34A' : '#92400E',
              },
            ]}
          >
            {hotel.onboardingStatus}
          </Text>
        </View>
        {hotel.brandCoinEnabled && (
          <View style={s.coinBadge}>
            <Ionicons name="wallet" size={10} color="#7C3AED" />
            <Text style={s.coinBadgeText}>{hotel.brandCoinName ?? 'Brand Coin'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HotelsAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [stats, setStats] = useState<OtaAdminStats | null>(null);
  const [hotels, setHotels] = useState<OtaHotelAdmin[]>([]);
  const [filtered, setFiltered] = useState<OtaHotelAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'hotels' | 'liability'>('overview');

  const load = useCallback(async () => {
    try {
      const [overviewRes, hotelsRes] = await Promise.allSettled([
        apiClient.get<OtaAdminStats>('admin/ota/overview'),
        apiClient.get<{ hotels: OtaHotelAdmin[]; total: number }>('admin/ota/hotels'),
      ]);
      if (
        overviewRes.status === 'fulfilled' &&
        overviewRes.value.success &&
        overviewRes.value.data
      ) {
        const d = overviewRes.value.data;
        setStats({
          totalHotels: d.activeHotels ?? 0,
          activeHotels: d.activeHotels ?? 0,
          activeBookings: d.activeBookings ?? 0,
          gmvTodayPaise: d.gmvTodayPaise ?? 0,
          brandCoinTotalLiabilityPaise: d.brandCoinTotalLiabilityPaise ?? 0,
        });
      }
      if (hotelsRes.status === 'fulfilled' && hotelsRes.value.success && hotelsRes.value.data) {
        const raw = hotelsRes.value.data;
        const list: OtaHotelAdmin[] = (raw.hotels ?? []).map((h: any) => ({
          id: h._id ?? h.id ?? '',
          _id: h._id ?? h.id,
          name: h.name ?? '',
          city: h.city ?? '',
          country: h.country ?? '',
          starRating: h.starRating ?? h.star_rating ?? 0,
          isActive: h.isActive ?? false,
          onboardingStatus: h.onboardingStatus ?? (h.isActive ? 'active' : 'inactive'),
          brandCoinEnabled: h.brandCoinEnabled ?? false,
          brandCoinName: h.brandCoinName ?? h.brandCoinSymbol ?? undefined,
          brandCoinOutstandingPaise: h.totalBrandCoinLiabilityPaise ?? 0,
          totalBrandCoinLiabilityPaise: h.totalBrandCoinLiabilityPaise ?? 0,
          totalBookings: h.totalBookings ?? 0,
          totalRevenuePaise: h.totalRevenuePaise ?? 0,
          createdAt: h.createdAt ?? '',
        }));
        setHotels(list);
        setFiltered(list);
      }
    } catch {
      /* fallback to empty */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!query) {
      setFiltered(hotels);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      hotels.filter((h) => h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q))
    );
  }, [query, hotels]);

  const totalBrandLiability = hotels.reduce((s, h) => s + h.brandCoinOutstandingPaise, 0);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Hotel OTA</Text>
        <Pressable
          onPress={() => {
            setRefreshing(true);
            load();
          }}
        >
          <Ionicons name="refresh-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['overview', 'hotels', 'liability'] as const).map((t) => (
          <Pressable
            key={t}
            style={[s.tab, activeTab === t && s.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
              {t === 'overview'
                ? 'Overview'
                : t === 'hotels'
                  ? `Properties (${hotels.length})`
                  : 'Liability'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#06B6D4" style={{ marginTop: 60 }} />
        ) : activeTab === 'overview' ? (
          <>
            <Text style={s.sectionTitle}>Platform Stats</Text>
            <View style={s.statsGrid}>
              <StatCard
                icon="business-outline"
                label="Total Hotels"
                value={String(stats?.totalHotels ?? hotels.length)}
                color="#06B6D4"
              />
              <StatCard
                icon="checkmark-circle-outline"
                label="Active"
                value={String(stats?.activeHotels ?? hotels.filter((h) => h.isActive).length)}
                color="#16A34A"
              />
              <StatCard
                icon="calendar-outline"
                label="Active Bookings"
                value={String(stats?.activeBookings ?? 0)}
                color="#F59E0B"
              />
              <StatCard
                icon="cash-outline"
                label="GMV Today"
                value={`₹${Math.round((stats?.gmvTodayPaise ?? 0) / 100).toLocaleString()}`}
                color="#8B5CF6"
              />
            </View>

            <Text style={[s.sectionTitle, { marginTop: 20 }]}>Coin Liability</Text>
            <View style={s.liabilityCard}>
              <View style={s.liabilityRow}>
                <Text style={s.liabilityLabel}>Brand Coin Liability</Text>
                <Text style={[s.liabilityValue, { color: '#06B6D4' }]}>
                  ₹
                  {Math.round(
                    (stats?.brandCoinTotalLiabilityPaise ?? totalBrandLiability) / 100
                  ).toLocaleString()}
                </Text>
              </View>
              <View style={s.liabilityRow}>
                <Text style={s.liabilityLabel}>Active Bookings</Text>
                <Text style={[s.liabilityValue, { color: '#8B5CF6' }]}>
                  {stats?.activeBookings ?? 0}
                </Text>
              </View>
              <View style={[s.liabilityRow, { borderBottomWidth: 0 }]}>
                <Text style={s.liabilityLabel}>Today GMV</Text>
                <Text style={[s.liabilityValue, { color: '#7C3AED' }]}>
                  ₹{Math.round((stats?.gmvTodayPaise ?? 0) / 100).toLocaleString()}
                </Text>
              </View>
            </View>

            <Text style={[s.sectionTitle, { marginTop: 20 }]}>Brand Coin Properties</Text>
            {hotels.filter((h) => h.brandCoinEnabled).length === 0 ? (
              <Text style={s.emptyText}>No hotels have brand coins enabled yet.</Text>
            ) : (
              hotels
                .filter((h) => h.brandCoinEnabled)
                .map((h) => (
                  <View key={h.id} style={s.brandCoinRow}>
                    <Text style={s.brandCoinHotel} numberOfLines={1}>
                      {h.name}
                    </Text>
                    <Text style={s.brandCoinName}>{h.brandCoinName}</Text>
                    <Text style={[s.brandCoinAmount, { color: '#7C3AED' }]}>
                      ₹{Math.round(h.brandCoinOutstandingPaise / 100).toLocaleString()}
                    </Text>
                  </View>
                ))
            )}
          </>
        ) : activeTab === 'hotels' ? (
          <>
            <TextInput
              style={s.searchBox}
              placeholder="Search hotels..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
            />
            {filtered.length === 0 ? (
              <Text style={s.emptyText}>No hotels found.</Text>
            ) : (
              filtered.map((h) => <HotelRow key={h.id} hotel={h} />)
            )}
          </>
        ) : (
          /* Liability detail */
          <>
            <View style={s.liabilityCard}>
              <Text style={s.liabilityHeading}>Total Coin Liability</Text>
              <View style={s.liabilityRow}>
                <Text style={s.liabilityLabel}>Brand Coin Liability</Text>
                <Text style={[s.liabilityValue, { color: '#06B6D4' }]}>
                  ₹
                  {Math.round(
                    (stats?.brandCoinTotalLiabilityPaise ?? totalBrandLiability) / 100
                  ).toLocaleString()}
                </Text>
              </View>
              <View style={s.liabilityRow}>
                <Text style={s.liabilityLabel}>Active Bookings</Text>
                <Text style={[s.liabilityValue, { color: '#8B5CF6' }]}>
                  {stats?.activeBookings ?? 0}
                </Text>
              </View>
              <View style={[s.liabilityRow, { borderBottomWidth: 0 }]}>
                <Text style={s.liabilityLabel}>Today GMV</Text>
                <Text style={[s.liabilityValue, { color: '#7C3AED' }]}>
                  ₹{Math.round((stats?.gmvTodayPaise ?? 0) / 100).toLocaleString()}
                </Text>
              </View>
            </View>

            <Text style={[s.sectionTitle, { marginTop: 20 }]}>
              Per-Hotel Brand Coin Liability
            </Text>
            {hotels
              .filter((h) => h.brandCoinEnabled && h.brandCoinOutstandingPaise > 0)
              .map((h) => (
                <View key={h.id} style={s.perHotelRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.perHotelName} numberOfLines={1}>
                      {h.name}
                    </Text>
                    <Text style={s.perHotelCity}>
                      {h.city} · {h.brandCoinName}
                    </Text>
                  </View>
                  <Text style={s.perHotelAmount}>
                    ₹{Math.round(h.brandCoinOutstandingPaise / 100).toLocaleString()}
                  </Text>
                </View>
              ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

