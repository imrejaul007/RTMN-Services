/**
 * CorpPerks Hotel Bookings Page
 * Route: /corp-bookings
 *
 * Corporate hotel booking with Makcorps OTA integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Card, StatsCard, StatusBadge, Loading, EmptyState, TabSelector } from '@/components/corp-perks';
import { hotelOTAApi, type OTAProperty, type OTABooking, type OTARoom } from '../../services/api/hotelOTA';
import { logger } from '../../utils/logger';

// Mock bookings for demo
const MOCK_BOOKINGS: OTABooking[] = [
  {
    bookingId: 'HB001',
    confirmationNumber: 'MCB20240415001',
    status: 'confirmed',
    property: {
      propertyId: 'P001',
      name: 'The Grand Mumbai',
      address: '1 MG Road, Mumbai',
      phone: '+91 22 1234 5678',
    },
    room: {
      roomId: 'R001',
      name: 'Deluxe Room',
      bedType: 'King',
    },
    guest: {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya@company.com',
      phone: '+91 98765 43210',
    },
    dates: {
      checkIn: '2024-04-15',
      checkOut: '2024-04-17',
      nights: 2,
    },
    pricing: {
      roomRate: 4500,
      numberOfRooms: 1,
      subtotal: 9000,
      discount: 500,
      gstAmount: 1530,
      totalAmount: 10030,
      currency: 'INR',
    },
    cancellationPolicy: {
      freeCancellationUntil: '2024-04-14',
      cancellationFee: 0,
    },
    invoice: {
      invoiceNumber: 'CP/HOT/2024-04/00001',
      gstIn: '27AABCU9603R1ZM',
    },
    createdAt: '2024-04-10',
  },
  {
    bookingId: 'HB002',
    confirmationNumber: 'MCB20240420001',
    status: 'pending',
    property: {
      propertyId: 'P002',
      name: 'ITC Gardenia',
      address: 'MG Road, Bangalore',
      phone: '+91 80 2345 6789',
    },
    room: {
      roomId: 'R002',
      name: 'Executive Suite',
      bedType: 'King',
    },
    guest: {
      firstName: 'Rahul',
      lastName: 'Verma',
      email: 'rahul@company.com',
      phone: '+91 98765 43211',
    },
    dates: {
      checkIn: '2024-04-20',
      checkOut: '2024-04-23',
      nights: 3,
    },
    pricing: {
      roomRate: 6500,
      numberOfRooms: 1,
      subtotal: 19500,
      discount: 1000,
      gstAmount: 3330,
      totalAmount: 21830,
      currency: 'INR',
    },
    cancellationPolicy: {
      freeCancellationUntil: '2024-04-19',
      cancellationFee: 5000,
    },
    createdAt: '2024-04-18',
  },
];

export default function CorpBookingsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [bookings, setBookings] = useState<OTABooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<OTAProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<OTAProperty | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<OTARoom | null>(null);

  // Search params
  const [searchCity, setSearchCity] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState('1');

  const fetchBookings = useCallback(async () => {
    try {
      const result = await hotelOTAApi.getBookingHistory({ limit: 50 });
      setBookings(result.data.length > 0 ? result.data : MOCK_BOOKINGS);
    } catch (error) {
      logger.error('Failed to fetch bookings:', error);
      setBookings(MOCK_BOOKINGS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const handleSearch = async () => {
    if (!searchCity || !checkInDate || !checkOutDate) {
      Alert.alert('Missing Info', 'Please fill in city, check-in and check-out dates');
      return;
    }

    setSearching(true);
    try {
      const results = await hotelOTAApi.searchProperties({
        city: searchCity,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: parseInt(guests) || 1,
      });
      setSearchResults(results.length > 0 ? results : MOCK_SEARCH_RESULTS);
    } catch (error) {
      logger.error('Search failed:', error);
      setSearchResults(MOCK_SEARCH_RESULTS);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProperty = (property: OTAProperty) => {
    setSelectedProperty(property);
    setSelectedRoom(null);
  };

  const handleSelectRoom = (room: OTARoom) => {
    setSelectedRoom(room);
  };

  const handleCreateBooking = async () => {
    if (!selectedProperty || !selectedRoom) {
      Alert.alert('Error', 'Please select a property and room');
      return;
    }

    try {
      const booking = await hotelOTAApi.createBooking({
        propertyId: selectedProperty.propertyId,
        roomId: selectedRoom.roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: parseInt(guests) || 1,
        guestDetails: [{
          firstName: 'Guest',
          lastName: 'User',
          email: 'guest@company.com',
          phone: '+91 99999 99999',
        }],
      });

      Alert.alert('Success', `Booking created! Confirmation: ${booking.confirmationNumber}`);
      setShowSearchModal(false);
      setSelectedProperty(null);
      setSelectedRoom(null);
      fetchBookings();
    } catch (error) {
      Alert.alert('Error', 'Failed to create booking');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await hotelOTAApi.cancelBooking(bookingId);
              Alert.alert('Success', 'Booking cancelled');
              fetchBookings();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.confirmationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.property?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const totalRevenue = bookings.reduce((sum, b) => sum + b.pricing?.totalAmount || 0, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { color: '#22c55e', label: 'Confirmed' };
      case 'pending':
        return { color: '#f59e0b', label: 'Pending' };
      case 'cancelled':
        return { color: '#ef4444', label: 'Cancelled' };
      case 'completed':
        return { color: '#6b7280', label: 'Completed' };
      default:
        return { color: '#6b7280', label: status };
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending', label: 'Pending' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  if (loading) {
    return <Loading message="Loading bookings..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Hotel Bookings</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowSearchModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Book Hotel</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by booking ID, guest, or hotel..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Pending"
          value={pendingCount}
          icon="time-outline"
          iconColor="#f59e0b"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Confirmed"
          value={confirmedCount}
          icon="checkmark-circle-outline"
          iconColor="#22c55e"
        />
      </View>

      <View style={styles.statsRow}>
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon="wallet-outline"
          iconColor="#3b82f6"
        />
        <View style={{ width: 12 }} />
        <StatsCard
          title="Total Bookings"
          value={bookings.length}
          icon="bed-outline"
          iconColor="#8b5cf6"
        />
      </View>

      {/* Filter Tabs */}
      <TabSelector tabs={tabs} selected={filterStatus} onSelect={setFilterStatus} />

      {/* Bookings List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBookings.length === 0 ? (
          <EmptyState
            icon="bed-outline"
            title="No Bookings Found"
            message="Hotel bookings will appear here when employees make reservations"
            actionLabel="Book Hotel"
            onAction={() => setShowSearchModal(true)}
          />
        ) : (
          filteredBookings.map((booking) => {
            const statusConfig = getStatusConfig(booking.status);

            return (
              <Card key={booking.bookingId}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingInfo}>
                    <View style={styles.bookingTitleRow}>
                      <Text style={[styles.confirmationNumber, { color: colors.tint }]}>
                        {booking.confirmationNumber}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.hotelName, { color: colors.text }]}>
                      {booking.property?.name}
                    </Text>
                    <Text style={[styles.hotelAddress, { color: colors.textSecondary }]}>
                      {booking.property?.address}
                    </Text>
                  </View>
                </View>

                {/* Room Info */}
                <View style={[styles.roomInfo, { backgroundColor: colors.background }]}>
                  <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.roomName, { color: colors.text }]}>
                    {booking.room?.name} ({booking.room?.bedType})
                  </Text>
                </View>

                {/* Dates & Guest */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {formatDate(booking.dates.checkIn)} - {formatDate(booking.dates.checkOut)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="moon-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {booking.dates.nights} night{booking.dates.nights !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {booking.guests || 1} guest{(booking.guests || 1) !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {/* Guest Info */}
                <View style={[styles.guestRow, { borderTopColor: colors.border }]}>
                  <View style={[styles.avatar, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.avatarText}>
                      {booking.guest?.firstName?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.guestName, { color: colors.text }]}>
                      {booking.guest?.firstName} {booking.guest?.lastName}
                    </Text>
                    <Text style={[styles.guestEmail, { color: colors.textSecondary }]}>
                      {booking.guest?.email}
                    </Text>
                  </View>
                  <View style={styles.amountInfo}>
                    <Text style={[styles.amount, { color: colors.tint }]}>
                      {formatCurrency(booking.pricing?.totalAmount || 0)}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.background }]}
                    onPress={() => Alert.alert('Invoice', `Invoice: ${booking.invoice?.invoiceNumber || 'N/A'}`)}
                  >
                    <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnText, { color: colors.text }]}>Invoice</Text>
                  </TouchableOpacity>

                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#ef4444' }]}
                      onPress={() => handleCancelBooking(booking.bookingId)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                      <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={showSearchModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setShowSearchModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Book Hotel</Text>
            <View style={{ width: 24 }} />
          </View>

          {!selectedProperty ? (
            <ScrollView style={styles.modalContent}>
              {/* Search Form */}
              <View style={[styles.searchForm, { backgroundColor: colors.card }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>City</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Mumbai, Bangalore"
                  placeholderTextColor={colors.textSecondary}
                  value={searchCity}
                  onChangeText={setSearchCity}
                />

                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Check-in</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      value={checkInDate}
                      onChangeText={setCheckInDate}
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Check-out</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                      value={checkOutDate}
                      onChangeText={setCheckOutDate}
                    />
                  </View>
                </View>

                <Text style={[styles.formLabel, { color: colors.text }]}>Guests</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Number of guests"
                  placeholderTextColor={colors.textSecondary}
                  value={guests}
                  onChangeText={setGuests}
                  keyboardType="number-pad"
                />

                <TouchableOpacity
                  style={[styles.searchBtn, { backgroundColor: colors.tint }]}
                  onPress={handleSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="search" size={20} color="#fff" />
                      <Text style={styles.searchBtnText}>Search Hotels</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Results */}
              <Text style={[styles.resultsTitle, { color: colors.text }]}>
                {searchResults.length > 0 ? `${searchResults.length} Properties Found` : 'Popular Hotels'}
              </Text>

              {searchResults.map((property) => (
                <TouchableOpacity
                  key={property.propertyId}
                  onPress={() => handleSelectProperty(property)}
                >
                  <Card>
                    <View style={styles.propertyHeader}>
                      <View style={styles.propertyInfo}>
                        <Text style={[styles.propertyName, { color: colors.text }]}>
                          {property.name}
                        </Text>
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={14} color="#f59e0b" />
                          <Text style={[styles.rating, { color: colors.text }]}>
                            {property.starRating} ({property.reviewCount} reviews)
                          </Text>
                        </View>
                        <Text style={[styles.propertyAddress, { color: colors.textSecondary }]}>
                          {property.address.city}, {property.address.state}
                        </Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={[styles.priceFrom, { color: colors.textSecondary }]}>From</Text>
                        <Text style={[styles.price, { color: colors.tint }]}>
                          {formatCurrency(property.rooms[0]?.corporateRate || 0)}
                        </Text>
                        <Text style={[styles.perNight, { color: colors.textSecondary }]}>per night</Text>
                      </View>
                    </View>
                    <View style={styles.amenities}>
                      {property.amenities.slice(0, 4).map((amenity, idx) => (
                        <View key={idx} style={[styles.amenityChip, { backgroundColor: colors.background }]}>
                          <Text style={[styles.amenityText, { color: colors.textSecondary }]}>{amenity}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}

              <View style={{ height: 50 }} />
            </ScrollView>
          ) : !selectedRoom ? (
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: colors.card }]}
                onPress={() => setSelectedProperty(null)}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
                <Text style={[styles.backBtnText, { color: colors.text }]}>Back to results</Text>
              </TouchableOpacity>

              <Card>
                <Text style={[styles.propertyNameLarge, { color: colors.text }]}>
                  {selectedProperty.name}
                </Text>
                <Text style={[styles.propertyAddressLarge, { color: colors.textSecondary }]}>
                  {selectedProperty.address.line1}, {selectedProperty.address.city}
                </Text>
              </Card>

              <Text style={[styles.roomsTitle, { color: colors.text }]}>Select Room</Text>

              {selectedProperty.rooms.map((room) => (
                <TouchableOpacity
                  key={room.roomId}
                  onPress={() => handleSelectRoom(room)}
                >
                  <Card>
                    <View style={styles.roomHeader}>
                      <View style={styles.roomInfo}>
                        <Text style={[styles.roomType, { color: colors.text }]}>{room.name}</Text>
                        <Text style={[styles.roomDesc, { color: colors.textSecondary }]}>
                          {room.description}
                        </Text>
                        <View style={styles.roomAmenities}>
                          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.roomAmenityText, { color: colors.textSecondary }]}>
                            Up to {room.maxOccupancy} guests
                          </Text>
                          <Ionicons name="bed-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.roomAmenityText, { color: colors.textSecondary }]}>
                            {room.bedType}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.roomPriceContainer}>
                        <Text style={[styles.roomPrice, { color: colors.tint }]}>
                          {formatCurrency(room.corporateRate)}
                        </Text>
                        <Text style={[styles.roomPerNight, { color: colors.textSecondary }]}>per night</Text>
                        {room.discount > 0 && (
                          <Text style={styles.discount}>Save {room.discount}%</Text>
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}

              <View style={{ height: 50 }} />
            </ScrollView>
          ) : (
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: colors.card }]}
                onPress={() => setSelectedRoom(null)}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
                <Text style={[styles.backBtnText, { color: colors.text }]}>Back to rooms</Text>
              </TouchableOpacity>

              <Card>
                <Text style={[styles.propertyNameLarge, { color: colors.text }]}>
                  {selectedProperty.name}
                </Text>
                <Text style={[styles.selectedRoom, { color: colors.textSecondary }]}>
                  {selectedRoom.name}
                </Text>
              </Card>

              <Card>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Booking Summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Check-in</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{checkInDate}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Check-out</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{checkOutDate}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Nights</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {calculateNights(checkInDate, checkOutDate)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Guests</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{guests}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text }]}>Room Rate</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatCurrency(selectedRoom.corporateRate)} x {calculateNights(checkInDate, checkOutDate)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatCurrency(selectedRoom.corporateRate * calculateNights(checkInDate, checkOutDate))}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>GST (12%)</Text>
                  <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>
                    {formatCurrency(selectedRoom.corporateRate * calculateNights(checkInDate, checkOutDate) * 0.12)}
                  </Text>
                </View>
                <View style={[styles.totalRow, { backgroundColor: colors.tint + '15' }]}>
                  <Text style={[styles.totalLabel, { color: colors.tint }]}>Total</Text>
                  <Text style={[styles.totalValue, { color: colors.tint }]}>
                    {formatCurrency(selectedRoom.corporateRate * calculateNights(checkInDate, checkOutDate) * 1.12)}
                  </Text>
                </View>
              </Card>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.tint }]}
                onPress={handleCreateBooking}
              >
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              </TouchableOpacity>

              <View style={{ height: 50 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Mock search results for demo
const MOCK_SEARCH_RESULTS: OTAProperty[] = [
  {
    propertyId: 'P001',
    name: 'The Grand Mumbai',
    description: 'Luxury hotel in the heart of Mumbai',
    address: { line1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India' },
    location: { lat: 18.916, lng: 72.833 },
    starRating: 5,
    userRating: 4.5,
    reviewCount: 2341,
    images: [],
    amenities: ['Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar'],
    policies: { checkIn: '14:00', checkOut: '11:00', childrenAllowed: true, petsAllowed: false },
    rooms: [
      {
        roomId: 'R001',
        roomType: 'Deluxe',
        description: 'Spacious room with city view',
        maxOccupancy: 2,
        bedType: 'King',
        baseRate: 5000,
        corporateRate: 4500,
        discount: 10,
        amenities: ['King Bed', 'City View', 'Mini Bar'],
        images: [],
        cancellationPolicy: { freeCancellationUntil: '2024-04-14', cancellationFee: 500 },
        available: true,
        availableRooms: 5,
      },
    ],
    gstInfo: { gstIn: '27AABCU9603R1ZM', hsnCode: '9963', taxRate: 12 },
    corporatePricing: { enabled: true, discountPercent: 10, markupPercent: 0 },
  },
  {
    propertyId: 'P002',
    name: 'ITC Gardenia',
    description: 'Premium business hotel',
    address: { line1: 'MG Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001', country: 'India' },
    location: { lat: 12.971, lng: 77.594 },
    starRating: 5,
    userRating: 4.6,
    reviewCount: 1892,
    images: [],
    amenities: ['Free WiFi', 'Business Center', 'Gym', 'Restaurant'],
    policies: { checkIn: '14:00', checkOut: '12:00', childrenAllowed: true, petsAllowed: false },
    rooms: [
      {
        roomId: 'R002',
        roomType: 'Executive Suite',
        description: 'Luxury suite for business travelers',
        maxOccupancy: 2,
        bedType: 'King',
        baseRate: 7500,
        corporateRate: 6500,
        discount: 13,
        amenities: ['King Bed', 'Lounge Area', 'Work Desk'],
        images: [],
        cancellationPolicy: { freeCancellationUntil: '2024-04-19', cancellationFee: 1000 },
        available: true,
        availableRooms: 3,
      },
    ],
    gstInfo: { gstIn: '29AABCI1234D1ZX', hsnCode: '9963', taxRate: 12 },
    corporatePricing: { enabled: true, discountPercent: 13, markupPercent: 0 },
  },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 60 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  list: { flex: 1, paddingHorizontal: 16 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  bookingInfo: { flex: 1 },
  bookingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  confirmationNumber: { fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  hotelName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  hotelAddress: { fontSize: 12 },
  roomInfo: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
  roomName: { fontSize: 14, fontWeight: '500' },
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12 },
  guestRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 12, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  guestName: { fontSize: 14, fontWeight: '500' },
  guestEmail: { fontSize: 12 },
  amountInfo: { marginLeft: 'auto', alignItems: 'flex-end' },
  amount: { fontSize: 18, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, paddingTop: 12, marginTop: 12, gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '500' },

  // Modal styles
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  searchForm: { padding: 16, borderRadius: 12, marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, gap: 8 },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  resultsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  propertyHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  rating: { fontSize: 13 },
  propertyAddress: { fontSize: 12 },
  priceContainer: { alignItems: 'flex-end' },
  priceFrom: { fontSize: 11 },
  price: { fontSize: 18, fontWeight: '700' },
  perNight: { fontSize: 11 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  amenityChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  amenityText: { fontSize: 11 },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  backBtnText: { fontSize: 15, fontWeight: '500' },
  propertyNameLarge: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  propertyAddressLarge: { fontSize: 14 },
  roomsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  roomInfo: { flex: 1 },
  roomType: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  roomDesc: { fontSize: 12, marginBottom: 8 },
  roomAmenities: { flexDirection: 'row', gap: 12 },
  roomAmenityText: { fontSize: 11 },
  roomPriceContainer: { alignItems: 'flex-end' },
  roomPrice: { fontSize: 18, fontWeight: '700' },
  roomPerNight: { fontSize: 11 },
  discount: { fontSize: 11, color: '#22c55e', fontWeight: '600', marginTop: 2 },
  selectedRoom: { fontSize: 14, marginTop: 4 },
  summaryTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  confirmBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
