import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { s } from './styles/delivery-settings.styles';

// --- Types ---

interface DeliveryZone {
  id: string;
  name: string;
  baseFee: number;
  isActive: boolean;
}

interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface GlobalSettings {
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryMinutes: number;
  deliveryHoursOpen: string;
  deliveryHoursClose: string;
}

type SectionKey = 'global' | 'zones' | 'timeslots';

const SECTIONS: {
  key: SectionKey;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'global', title: 'Global Delivery Settings', icon: 'settings', color: Colors.light.info },
  { key: 'zones', title: 'Delivery Zones', icon: 'map', color: Colors.light.success },
  { key: 'timeslots', title: 'Time Slots', icon: 'time', color: Colors.light.purple },
];

// --- Default data ---

const DEFAULT_GLOBAL: GlobalSettings = {
  defaultDeliveryFee: 5,
  freeDeliveryThreshold: 50,
  estimatedDeliveryMinutes: 45,
  deliveryHoursOpen: '08:00',
  deliveryHoursClose: '22:00',
};

const DEFAULT_ZONES: DeliveryZone[] = [
  { id: '1', name: 'Downtown', baseFee: 3, isActive: true },
  { id: '2', name: 'Suburbs', baseFee: 7, isActive: true },
  { id: '3', name: 'Extended Area', baseFee: 12, isActive: false },
];

const DEFAULT_TIMESLOTS: TimeSlot[] = [
  { id: '1', label: 'Morning', startTime: '08:00', endTime: '12:00', isActive: true },
  { id: '2', label: 'Afternoon', startTime: '12:00', endTime: '17:00', isActive: true },
  { id: '3', label: 'Evening', startTime: '17:00', endTime: '22:00', isActive: true },
];

let nextZoneId = 4;
let nextSlotId = 4;

export default function DeliverySettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    global: false,
    zones: false,
    timeslots: false,
  });

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ ...DEFAULT_GLOBAL });
  const [zones, setZones] = useState<DeliveryZone[]>(DEFAULT_ZONES.map((z) => ({ ...z })));
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIMESLOTS.map((s) => ({ ...s })));

  // --- Handlers ---

  const toggleSection = (key: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await apiClient.get<any>('admin/delivery-config');
      if (response.success && response.data) {
        if (response.data.globalSettings) setGlobalSettings(response.data.globalSettings);
        if (response.data.zones) setZones(response.data.zones);
        if (response.data.timeSlots) setTimeSlots(response.data.timeSlots);
        setDirty(false);
      }
    } catch {
      // Endpoint may not exist yet (404 = first time), keep defaults
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Load existing config from backend on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        setConfigError(null);
        const response = await apiClient.get<any>('admin/delivery-config');
        if (response.success && response.data) {
          if (response.data.globalSettings) setGlobalSettings(response.data.globalSettings);
          if (response.data.zones) setZones(response.data.zones);
          if (response.data.timeSlots) setTimeSlots(response.data.timeSlots);
          setDirty(false);
        }
      } catch (err: any) {
        // 404 = endpoint not configured yet — show clear "not configured" state
        const status = err?.response?.status || err?.status;
        if (status === 404) {
          setNotConfigured(true);
        } else {
          setConfigError(err.message || 'Failed to load delivery config');
        }
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    // Validate
    if (globalSettings.defaultDeliveryFee < 0) {
      showAlert('Validation Error', 'Default delivery fee cannot be negative');
      return;
    }
    if (globalSettings.freeDeliveryThreshold < 0) {
      showAlert('Validation Error', 'Free delivery threshold cannot be negative');
      return;
    }
    if (zones.some((z) => !z.name.trim())) {
      showAlert('Validation Error', 'All zones must have a name');
      return;
    }
    if (timeSlots.some((s) => !s.label.trim() || !s.startTime.trim() || !s.endTime.trim())) {
      showAlert('Validation Error', 'All time slots must have a label, start time, and end time');
      return;
    }

    try {
      setSaving(true);
      const payload = { globalSettings, zones, timeSlots };
      const response = await apiClient.post('admin/delivery-config', payload);
      if (response.success) {
        showAlert('Success', 'Delivery settings saved successfully');
        setDirty(false);
        setNotConfigured(false);
      } else {
        showAlert('Error', response.message || 'Failed to save delivery settings');
      }
    } catch (err: any) {
      showAlert(
        'Error',
        err.message || 'Failed to save. The backend endpoint may not be configured yet.'
      );
    } finally {
      setSaving(false);
    }
  };

  // --- Global settings updaters ---

  const updateGlobal = (field: keyof GlobalSettings, value: string) => {
    setGlobalSettings((prev) => ({
      ...prev,
      [field]: typeof prev[field] === 'number' ? parseFloat(value) || 0 : value,
    }));
    setDirty(true);
  };

  // --- Zone updaters ---

  const addZone = () => {
    setZones((prev) => [
      ...prev,
      { id: String(nextZoneId++), name: '', baseFee: 5, isActive: true },
    ]);
    setDirty(true);
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    setDirty(true);
  };

  const updateZone = (id: string, field: keyof DeliveryZone, value: any) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));
    setDirty(true);
  };

  // --- Time slot updaters ---

  const addTimeSlot = () => {
    setTimeSlots((prev) => [
      ...prev,
      { id: String(nextSlotId++), label: '', startTime: '09:00', endTime: '12:00', isActive: true },
    ]);
    setDirty(true);
  };

  const removeTimeSlot = (id: string) => {
    setTimeSlots((prev) => prev.filter((s) => s.id !== id));
    setDirty(true);
  };

  const updateTimeSlot = (id: string, field: keyof TimeSlot, value: any) => {
    setTimeSlots((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    setDirty(true);
  };

  // --- Render helpers ---

  const renderInput = (
    label: string,
    value: string | number,
    onChange: (val: string) => void,
    numeric = false,
    placeholder?: string
  ) => (
    <View style={s.fieldRow}>
      <Text style={[s.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[
          s.fieldInput,
          { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
        ]}
        value={String(value)}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholder={placeholder}
        placeholderTextColor={colors.icon}
        selectTextOnFocus
      />
    </View>
  );

  const renderSectionCard = (sectionKey: SectionKey, content: React.ReactNode) => {
    const sec = SECTIONS.find((s) => s.key === sectionKey)!;
    const isCollapsed = collapsed[sectionKey];
    return (
      <View
        key={sectionKey}
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <TouchableOpacity
          style={s.cardHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <Ionicons name={sec.icon} size={18} color={sec.color} />
          <Text style={[s.cardTitle, { color: colors.text }]}>{sec.title}</Text>
          <Ionicons
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={colors.secondaryText}
          />
        </TouchableOpacity>
        {!isCollapsed && (
          <View style={[s.cardBody, { borderTopColor: colors.border }]}>{content}</View>
        )}
      </View>
    );
  };

  // --- Main render ---

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <View style={s.headerLeft}>
          <Ionicons name="bicycle" size={22} color={colors.tint} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Delivery Settings</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={handleRefresh} style={s.iconBtn}>
            <Ionicons name="refresh" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveButton, !dirty && s.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="save" size={16} color={colors.card} />
                <Text style={s.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {configLoading ? (
        <View style={s.configLoadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[s.configLoadingText, { color: colors.secondaryText }]}>
            Loading delivery configuration...
          </Text>
        </View>
      ) : configError ? (
        <View style={s.configErrorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={[s.configErrorText, { color: colors.text }]}>{configError}</Text>
          <TouchableOpacity
            style={[s.retryBtn, { borderColor: colors.border }]}
            onPress={() => {
              setConfigError(null);
              setConfigLoading(true);
              apiClient
                .get<any>('admin/delivery-config')
                .then((response) => {
                  if (response.success && response.data) {
                    if (response.data.globalSettings)
                      setGlobalSettings(response.data.globalSettings);
                    if (response.data.zones) setZones(response.data.zones);
                    if (response.data.timeSlots) setTimeSlots(response.data.timeSlots);
                    setDirty(false);
                  }
                })
                .catch((err: any) => {
                  setConfigError(err.message || 'Failed to load delivery config');
                })
                .finally(() => setConfigLoading(false));
            }}
          >
            <Ionicons name="refresh" size={16} color={colors.tint} />
            <Text style={[s.retryBtnText, { color: colors.tint }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.tint]}
            />
          }
        >
          {/* Not-configured info banner */}
          {notConfigured && (
            <View style={[s.notConfiguredBanner, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
              <Ionicons name="information-circle" size={18} color={colors.warning} />
              <Text style={[s.notConfiguredText, { color: colors.text }]}>
                No delivery configuration found. The default values below are placeholders — fill in your
                settings and save to create the initial configuration.
              </Text>
            </View>
          )}

          {/* Section 1: Global Delivery Settings */}
          {renderSectionCard(
            'global',
            <>
              <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
                Configure default delivery fees, thresholds, and operating hours.
              </Text>
              {renderInput(
                'Default Delivery Fee',
                globalSettings.defaultDeliveryFee,
                (v) => updateGlobal('defaultDeliveryFee', v),
                true
              )}
              {renderInput(
                'Free Delivery Threshold',
                globalSettings.freeDeliveryThreshold,
                (v) => updateGlobal('freeDeliveryThreshold', v),
                true
              )}
              {renderInput(
                'Est. Delivery Time (min)',
                globalSettings.estimatedDeliveryMinutes,
                (v) => updateGlobal('estimatedDeliveryMinutes', v),
                true
              )}
              {renderInput(
                'Delivery Hours Open',
                globalSettings.deliveryHoursOpen,
                (v) => updateGlobal('deliveryHoursOpen', v),
                false,
                'HH:MM'
              )}
              {renderInput(
                'Delivery Hours Close',
                globalSettings.deliveryHoursClose,
                (v) => updateGlobal('deliveryHoursClose', v),
                false,
                'HH:MM'
              )}
            </>
          )}

          {/* Section 2: Delivery Zones */}
          {renderSectionCard(
            'zones',
            <>
              <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
                Define delivery zones with custom base fees and toggle their availability.
              </Text>
              {zones.length === 0 && (
                <Text style={[s.emptyText, { color: colors.secondaryText }]}>
                  No delivery zones configured.
                </Text>
              )}
              {zones.map((zone) => (
                <View key={zone.id} style={[s.listRow, { borderColor: colors.border }]}>
                  <View style={s.listRowMain}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.listItemLabel, { color: colors.secondaryText }]}>
                        Zone Name
                      </Text>
                      <TextInput
                        style={[
                          s.listInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        value={zone.name}
                        onChangeText={(v) => updateZone(zone.id, 'name', v)}
                        placeholder="Zone name"
                        placeholderTextColor={colors.icon}
                      />
                    </View>
                    <View style={{ width: 90 }}>
                      <Text style={[s.listItemLabel, { color: colors.secondaryText }]}>
                        Base Fee
                      </Text>
                      <TextInput
                        style={[
                          s.listInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.text,
                            textAlign: 'right',
                          },
                        ]}
                        value={String(zone.baseFee)}
                        onChangeText={(v) => updateZone(zone.id, 'baseFee', parseFloat(v) || 0)}
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                  <View style={s.listRowActions}>
                    <View style={s.switchRow}>
                      <Text
                        style={[
                          s.switchLabel,
                          { color: zone.isActive ? colors.success : colors.secondaryText },
                        ]}
                      >
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </Text>
                      <Switch
                        value={zone.isActive}
                        onValueChange={(v) => updateZone(zone.id, 'isActive', v)}
                        trackColor={{ false: colors.border, true: `${colors.success}60` }}
                        thumbColor={zone.isActive ? colors.success : '#f4f3f4'}
                      />
                    </View>
                    <TouchableOpacity style={s.removeBtn} onPress={() => removeZone(zone.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[s.addBtn, { borderColor: colors.border }]}
                onPress={addZone}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
                <Text style={[s.addBtnText, { color: colors.tint }]}>Add Zone</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Section 3: Time Slots */}
          {renderSectionCard(
            'timeslots',
            <>
              <Text style={[s.sectionDescription, { color: colors.secondaryText }]}>
                Configure available delivery time slots for customers to choose from.
              </Text>
              {timeSlots.length === 0 && (
                <Text style={[s.emptyText, { color: colors.secondaryText }]}>
                  No time slots configured.
                </Text>
              )}
              {timeSlots.map((slot) => (
                <View key={slot.id} style={[s.listRow, { borderColor: colors.border }]}>
                  <View style={s.listRowMain}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.listItemLabel, { color: colors.secondaryText }]}>
                        Label
                      </Text>
                      <TextInput
                        style={[
                          s.listInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        value={slot.label}
                        onChangeText={(v) => updateTimeSlot(slot.id, 'label', v)}
                        placeholder="e.g. Morning"
                        placeholderTextColor={colors.icon}
                      />
                    </View>
                    <View style={{ width: 80 }}>
                      <Text style={[s.listItemLabel, { color: colors.secondaryText }]}>
                        Start
                      </Text>
                      <TextInput
                        style={[
                          s.listInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.text,
                            textAlign: 'center',
                          },
                        ]}
                        value={slot.startTime}
                        onChangeText={(v) => updateTimeSlot(slot.id, 'startTime', v)}
                        placeholder="HH:MM"
                        placeholderTextColor={colors.icon}
                      />
                    </View>
                    <View style={{ width: 80 }}>
                      <Text style={[s.listItemLabel, { color: colors.secondaryText }]}>
                        End
                      </Text>
                      <TextInput
                        style={[
                          s.listInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.text,
                            textAlign: 'center',
                          },
                        ]}
                        value={slot.endTime}
                        onChangeText={(v) => updateTimeSlot(slot.id, 'endTime', v)}
                        placeholder="HH:MM"
                        placeholderTextColor={colors.icon}
                      />
                    </View>
                  </View>
                  <View style={s.listRowActions}>
                    <View style={s.switchRow}>
                      <Text
                        style={[
                          s.switchLabel,
                          { color: slot.isActive ? colors.success : colors.secondaryText },
                        ]}
                      >
                        {slot.isActive ? 'Active' : 'Inactive'}
                      </Text>
                      <Switch
                        value={slot.isActive}
                        onValueChange={(v) => updateTimeSlot(slot.id, 'isActive', v)}
                        trackColor={{ false: colors.border, true: `${colors.success}60` }}
                        thumbColor={slot.isActive ? colors.success : '#f4f3f4'}
                      />
                    </View>
                    <TouchableOpacity
                      style={s.removeBtn}
                      onPress={() => removeTimeSlot(slot.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[s.addBtn, { borderColor: colors.border }]}
                onPress={addTimeSlot}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
                <Text style={[s.addBtnText, { color: colors.tint }]}>Add Time Slot</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Bottom Save */}
          <TouchableOpacity
            style={[s.bottomSave, !dirty && { backgroundColor: colors.muted }]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.bottomSaveText}>{dirty ? 'Save All Changes' : 'No Changes'}</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

