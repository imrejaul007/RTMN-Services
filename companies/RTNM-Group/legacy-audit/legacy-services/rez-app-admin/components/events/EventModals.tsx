/**
 * EventModals — form, bookings, and analytics modals for the Events screen.
 * Extracted to keep the main events.tsx screen under 500 lines.
 */
import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, Switch, ActivityIndicator, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import type { AdminEvent, EventBooking, EventAnalytics, EventStatus } from '../../services/api/events';

const STATUS_OPTIONS: { value: EventStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: Colors.light.mutedDark },
  { value: 'published', label: 'Published', color: Colors.light.success },
  { value: 'cancelled', label: 'Cancelled', color: Colors.light.error },
  { value: 'completed', label: 'Completed', color: Colors.light.info },
];

// ─── EventFormModal ─────────────────────────────────────────────────────────────

interface EventFormData {
  title: string; shortDescription: string; description: string; categoryId: string;
  image: string; date: string; endDate: string; time: string; endTime: string;
  location: { name: string; address: string; city: string }; isOnline: boolean;
  onlineLink: string; price: number; isFree: boolean;
  slots: { total: number }; status: EventStatus; isFeatured: boolean;
  featuredPriority: number; tags: string[];
}

interface EventFormModalProps {
  visible: boolean;
  editingEvent: AdminEvent | null;
  categories: Array<{ _id: string; name: string; icon?: string }>;
  formData: Partial<EventFormData>;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updated: Partial<EventFormData>) => void;
}

export function EventFormModal({
  visible, editingEvent, categories, formData, isSaving, onClose, onSave, onChange,
}: EventFormModalProps) {
  const colors = Colors.light;
  const set = (patch: Partial<EventFormData>) => onChange({ ...formData, ...patch });

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return dateStr; }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>{editingEvent ? 'Edit Event' : 'Create Event'}</Text>
          <TouchableOpacity onPress={onSave} disabled={isSaving} style={[s.modalSaveBtn, { backgroundColor: colors.tint }]}>
            {isSaving ? <ActivityIndicator size="small" color={colors.card} /> : <Text style={s.modalSaveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent} showsVerticalScrollIndicator={false}>
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Title *</Text>
            <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.title || ''} onChangeText={(t) => set({ title: t })} placeholder="Event title" placeholderTextColor={colors.icon} />
          </View>
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Short Description</Text>
            <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.shortDescription || ''} onChangeText={(t) => set({ shortDescription: t })} placeholder="Brief event summary" placeholderTextColor={colors.icon} />
          </View>
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Description</Text>
            <TextInput style={[s.formInput, styles.multilineInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.description || ''} onChangeText={(t) => set({ description: t })} placeholder="Full event description..." placeholderTextColor={colors.icon} multiline numberOfLines={4} textAlignVertical="top" />
          </View>

          {/* Category */}
          <View style={s.formGroup}>
            <Text style={[s.formLabel, { color: colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              <TouchableOpacity style={[s.chipOption, { borderColor: colors.border }, !formData.categoryId && { backgroundColor: colors.tint, borderColor: colors.tint }]} onPress={() => set({ categoryId: '' })}>
                <Text style={[s.chipOptionText, { color: !formData.categoryId ? colors.card : colors.text }]}>None</Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity key={cat._id} style={[s.chipOption, { borderColor: colors.border }, formData.categoryId === cat._id && { backgroundColor: colors.tint, borderColor: colors.tint }]} onPress={() => set({ categoryId: cat._id })}>
                  <Text style={[s.chipOptionText, { color: formData.categoryId === cat._id ? colors.card : colors.text }]}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Date & Time */}
          <View style={[s.formSection, { borderColor: colors.border }]}>
            <View style={s.formSectionHeader}><Ionicons name="calendar" size={18} color={colors.tint} /><Text style={[s.formSectionTitle, { color: colors.text }]}>Date & Time</Text></View>
            <View style={s.formRow}>
              <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[s.formLabel, { color: colors.text }]}>Start Date *</Text>
                <TouchableOpacity style={[s.formInput, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]} onPress={() => {}}>
                  <Text style={{ color: formData.date ? colors.text : colors.icon }}>{formData.date ? formatDate(formData.date) : 'Select date'}</Text>
                </TouchableOpacity>
              </View>
              <View style={[s.formGroup, { flex: 1 }]}>
                <Text style={[s.formLabel, { color: colors.text }]}>End Date</Text>
                <TouchableOpacity style={[s.formInput, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]} onPress={() => {}}>
                  <Text style={{ color: formData.endDate ? colors.text : colors.icon }}>{formData.endDate ? formatDate(formData.endDate) : 'Select date'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.formRow}>
              <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[s.formLabel, { color: colors.text }]}>Start Time</Text>
                <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.time || ''} onChangeText={(t) => set({ time: t })} placeholder="e.g. 10:00 AM" placeholderTextColor={colors.icon} />
              </View>
              <View style={[s.formGroup, { flex: 1 }]}>
                <Text style={[s.formLabel, { color: colors.text }]}>End Time</Text>
                <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.endTime || ''} onChangeText={(t) => set({ endTime: t })} placeholder="e.g. 5:00 PM" placeholderTextColor={colors.icon} />
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={[s.formSection, { borderColor: colors.border }]}>
            <View style={s.formSectionHeader}><Ionicons name="location" size={18} color={colors.tint} /><Text style={[s.formSectionTitle, { color: colors.text }]}>Location</Text></View>
            <View style={s.formRow}>
              <View style={[s.formGroup, { flex: 1 }]}>
                <Text style={[s.formLabel, { color: colors.text }]}>Online Event</Text>
                <View style={[s.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.switchLabel, { color: colors.icon }]}>{formData.isOnline ? 'Yes' : 'No'}</Text>
                  <Switch value={formData.isOnline || false} onValueChange={(v) => set({ isOnline: v })} trackColor={{ true: colors.tint }} />
                </View>
              </View>
            </View>
            {formData.isOnline ? (
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.text }]}>Online Link</Text>
                <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.onlineLink || ''} onChangeText={(t) => set({ onlineLink: t })} placeholder="https://..." placeholderTextColor={colors.icon} />
              </View>
            ) : (
              <>
                <View style={s.formGroup}><Text style={[s.formLabel, { color: colors.text }]}>Venue Name</Text><TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.location?.name || ''} onChangeText={(t) => set({ location: { ...formData.location!, name: t } })} placeholder="e.g. Convention Center" placeholderTextColor={colors.icon} /></View>
                <View style={s.formGroup}><Text style={[s.formLabel, { color: colors.text }]}>Address</Text><TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.location?.address || ''} onChangeText={(t) => set({ location: { ...formData.location!, address: t } })} placeholder="Full address" placeholderTextColor={colors.icon} /></View>
                <View style={s.formGroup}><Text style={[s.formLabel, { color: colors.text }]}>City</Text><TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.location?.city || ''} onChangeText={(t) => set({ location: { ...formData.location!, city: t } })} placeholder="City name" placeholderTextColor={colors.icon} /></View>
              </>
            )}
          </View>

          {/* Pricing & Slots */}
          <View style={[s.formSection, { borderColor: colors.border }]}>
            <View style={s.formSectionHeader}><Ionicons name="pricetag" size={18} color={colors.tint} /><Text style={[s.formSectionTitle, { color: colors.text }]}>Pricing & Slots</Text></View>
            <View style={s.formRow}>
              <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[s.formLabel, { color: colors.text }]}>Free Event</Text>
                <View style={[s.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.switchLabel, { color: colors.icon }]}>{formData.isFree !== false ? 'Yes' : 'No'}</Text>
                  <Switch value={formData.isFree !== false} onValueChange={(v) => set({ isFree: v, price: v ? 0 : formData.price })} trackColor={{ true: colors.tint }} />
                </View>
              </View>
              {formData.isFree === false && (
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={[s.formLabel, { color: colors.text }]}>Price</Text>
                  <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.price ? String(formData.price) : ''} onChangeText={(t) => set({ price: parseFloat(t) || 0 })} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.icon} />
                </View>
              )}
            </View>
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Total Slots</Text>
              <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.slots?.total ? String(formData.slots.total) : ''} onChangeText={(t) => set({ slots: { total: parseInt(t) || 0 } })} keyboardType="numeric" placeholder="e.g. 100" placeholderTextColor={colors.icon} />
            </View>
          </View>

          {/* Image & Tags */}
          <View style={[s.formSection, { borderColor: colors.border }]}>
            <View style={s.formSectionHeader}><Ionicons name="image" size={18} color={colors.tint} /><Text style={[s.formSectionTitle, { color: colors.text }]}>Media & Tags</Text></View>
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Image URL</Text>
              <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={formData.image || ''} onChangeText={(t) => set({ image: t })} placeholder="https://..." placeholderTextColor={colors.icon} />
              {formData.image ? (
                <View style={s.imagePreview}>
                  <Image source={{ uri: formData.image }} style={s.previewImage} resizeMode="cover" />
                  <TouchableOpacity style={s.removeImageBtn} onPress={() => set({ image: '' })}>
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Tags (comma separated)</Text>
              <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={(formData.tags || []).join(', ')} onChangeText={(t) => set({ tags: t ? t.split(',').map((s) => s.trim()).filter(Boolean) : [] })} placeholder="e.g. music, food, tech" placeholderTextColor={colors.icon} />
            </View>
          </View>

          {/* Status & Featured */}
          <View style={[s.formSection, { borderColor: colors.border }]}>
            <View style={s.formSectionHeader}><Ionicons name="settings" size={18} color={colors.tint} /><Text style={[s.formSectionTitle, { color: colors.text }]}>Status & Visibility</Text></View>
            <View style={s.formGroup}>
              <Text style={[s.formLabel, { color: colors.text }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                {STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.value} style={[s.chipOption, { borderColor: colors.border }, formData.status === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]} onPress={() => set({ status: opt.value })}>
                    <Text style={[s.chipOptionText, { color: formData.status === opt.value ? colors.card : colors.text }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={s.formRow}>
              <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[s.formLabel, { color: colors.text }]}>Featured</Text>
                <View style={[s.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.switchLabel, { color: colors.icon }]}>{formData.isFeatured ? 'Yes' : 'No'}</Text>
                  <Switch value={formData.isFeatured || false} onValueChange={(v) => set({ isFeatured: v })} trackColor={{ true: colors.tint }} />
                </View>
              </View>
              {formData.isFeatured && (
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={[s.formLabel, { color: colors.text }]}>Priority (0-100)</Text>
                  <TextInput style={[s.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={String(formData.featuredPriority || 0)} onChangeText={(t) => set({ featuredPriority: parseInt(t) || 0 })} keyboardType="numeric" placeholderTextColor={colors.icon} />
                </View>
              )}
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── BookingsModal ─────────────────────────────────────────────────────────────

interface BookingsModalProps {
  visible: boolean;
  loading: boolean;
  bookings: EventBooking[];
  onClose: () => void;
}

export function BookingsModal({ visible, loading, bookings, onClose }: BookingsModalProps) {
  const colors = Colors.light;
  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return dateStr; }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>Event Bookings</Text>
          <View style={{ width: 60 }} />
        </View>
        {loading ? (
          <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /><Text style={[s.loadingText, { color: colors.icon }]}>Loading bookings...</Text></View>
        ) : bookings.length === 0 ? (
          <View style={s.emptyState}><Ionicons name="ticket-outline" size={48} color={colors.icon} /><Text style={[s.emptyTitle, { color: colors.text }]}>No Bookings</Text></View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: booking }) => {
              const statusColors: Record<string, string> = { confirmed: colors.success, cancelled: colors.error, pending: colors.warning, checked_in: colors.info };
              const statusColor = statusColors[booking.status] || colors.mutedDark;
              return (
                <View style={[s.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={s.bookingCardHeader}>
                    <View>
                      <Text style={[s.bookingUserName, { color: colors.text }]}>{booking.userId?.firstName ? `${booking.userId.firstName} ${booking.userId.lastName || ''}`.trim() : 'Unknown User'}</Text>
                      <Text style={[s.bookingUserPhone, { color: colors.icon }]}>{booking.userId?.phone || booking.userId?.email || '-'}</Text>
                    </View>
                    <View style={[s.bookingStatusChip, { backgroundColor: `${statusColor}15` }]}><Text style={[s.bookingStatusText, { color: statusColor }]}>{booking.status.replace('_', ' ').toUpperCase()}</Text></View>
                  </View>
                  <View style={[s.bookingCardMeta, { borderTopColor: colors.border }]}>
                    <View style={s.bookingMetaItem}><Ionicons name="ticket-outline" size={14} color={colors.icon} /><Text style={[s.bookingMetaText, { color: colors.icon }]}>{booking.tickets} ticket{booking.tickets !== 1 ? 's' : ''}</Text></View>
                    <View style={s.bookingMetaItem}><Ionicons name="cash-outline" size={14} color={colors.icon} /><Text style={[s.bookingMetaText, { color: colors.icon }]}>${(booking.totalAmount || booking.amount || 0).toFixed(2)}</Text></View>
                    <View style={s.bookingMetaItem}><Ionicons name="time-outline" size={14} color={colors.icon} /><Text style={[s.bookingMetaText, { color: colors.icon }]}>{formatDate(booking.createdAt)}</Text></View>
                  </View>
                  {(booking.bookingRef || booking.bookingReference) && <Text style={[s.bookingRef, { color: colors.icon }]}>Ref: {booking.bookingRef || booking.bookingReference}</Text>}
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── AnalyticsModal ─────────────────────────────────────────────────────────────

interface AnalyticsModalProps {
  visible: boolean;
  loading: boolean;
  analytics: EventAnalytics | null;
  onClose: () => void;
}

export function AnalyticsModal({ visible, loading, analytics, onClose }: AnalyticsModalProps) {
  const colors = Colors.light;
  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return dateStr; }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>Event Analytics</Text>
          <View style={{ width: 60 }} />
        </View>
        {loading ? (
          <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /><Text style={[s.loadingText, { color: colors.icon }]}>Loading analytics...</Text></View>
        ) : analytics ? (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={s.analyticsGrid}>
              {[
                { label: 'Total Bookings', value: analytics.totalBookings, icon: 'ticket', color: colors.info },
                { label: 'Total Revenue', value: `$${analytics.totalRevenue?.toFixed(2) || '0.00'}`, icon: 'cash', color: colors.success },
                { label: 'Check-ins', value: analytics.totalCheckins, icon: 'checkmark-circle', color: colors.purple },
                { label: 'Total Views', value: analytics.totalViews, icon: 'eye', color: colors.warning },
                { label: 'Favorites', value: analytics.totalFavorites, icon: 'heart', color: colors.error },
                { label: 'Check-in Rate', value: `${(analytics.checkinRate * 100).toFixed(1)}%`, icon: 'trending-up', color: colors.cyan },
                { label: 'Avg Tickets', value: analytics.averageTicketsPerBooking?.toFixed(1) || '0', icon: 'people', color: colors.pink },
              ].map((item, index) => (
                <View key={index} style={[s.analyticsCard, { backgroundColor: colors.card }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                  <Text style={[s.analyticsValue, { color: colors.text }]}>{item.value}</Text>
                  <Text style={[s.analyticsLabel, { color: colors.icon }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            {analytics.bookingsByDay && analytics.bookingsByDay.length > 0 && (
              <View style={[s.analyticsSection, { backgroundColor: colors.card }]}>
                <Text style={[s.analyticsSectionTitle, { color: colors.text }]}>Bookings by Day</Text>
                {analytics.bookingsByDay.map((day, index) => {
                  const maxCount = Math.max(...analytics.bookingsByDay!.map((d) => d.count), 1);
                  return (
                    <View key={index} style={[s.dayRow, { borderBottomColor: colors.border }]}>
                      <Text style={[s.dayDate, { color: colors.icon }]}>{formatDate(day.date)}</Text>
                      <View style={s.dayBarContainer}>
                        <View style={[s.dayBar, { backgroundColor: colors.tint, width: `${Math.max(5, (day.count / maxCount) * 100)}%` }]} />
                      </View>
                      <Text style={[s.dayCount, { color: colors.text }]}>{day.count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={s.emptyState}><Ionicons name="analytics-outline" size={48} color={colors.icon} /><Text style={[s.emptyTitle, { color: colors.text }]}>No Analytics Data</Text></View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Modal shell
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalCloseBtn: { padding: 4 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  modalSaveBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: 16 },
  // Form
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  formRow: { flexDirection: 'row', alignItems: 'flex-start' },
  formSection: { marginBottom: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  formSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  formSectionTitle: { fontSize: 15, fontWeight: '600' },
  chipScroll: { marginBottom: 4 },
  chipOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chipOptionText: { fontSize: 13, fontWeight: '500' },
  switchBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  switchLabel: { fontSize: 14 },
  imagePreview: { marginTop: 10, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: 120, borderRadius: 10 },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.light.card, borderRadius: 12 },
  // Loading / empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  // Bookings
  bookingCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  bookingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  bookingUserName: { fontSize: 15, fontWeight: '600' },
  bookingUserPhone: { fontSize: 12, marginTop: 2 },
  bookingStatusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bookingStatusText: { fontSize: 10, fontWeight: '700' },
  bookingCardMeta: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1 },
  bookingMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingMetaText: { fontSize: 12 },
  bookingRef: { fontSize: 11, marginTop: 8 },
  // Analytics
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  analyticsCard: { width: '48%', padding: 14, borderRadius: 12, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  analyticsValue: { fontSize: 20, fontWeight: '700' },
  analyticsLabel: { fontSize: 11, textAlign: 'center' },
  analyticsSection: { borderRadius: 12, padding: 14, marginBottom: 16 },
  analyticsSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  dayDate: { fontSize: 12, width: 80 },
  dayBarContainer: { flex: 1, height: 8, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 4, overflow: 'hidden' },
  dayBar: { height: '100%', borderRadius: 4 },
  dayCount: { fontSize: 12, fontWeight: '600', width: 30, textAlign: 'right' },
});

const styles = StyleSheet.create({
  multilineInput: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
});
