import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { bbpsService } from '../../services/api/bbps';
import { s } from './styles/bbps-config.styles';

interface BBPSConfig {
  enabledTypes: string[];
  defaultCoins: Record<string, number>;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  maxCoinsPerUserPerMonth: number;
  maxPaymentsPerDayPerUser: number;
}

const DEFAULT_CONFIG: BBPSConfig = {
  enabledTypes: [
    'electricity',
    'mobile_prepaid',
    'mobile_postpaid',
    'dth',
    'gas',
    'broadband',
    'fastag',
  ],
  defaultCoins: {
    electricity: 25,
    mobile_prepaid: 15,
    mobile_postpaid: 30,
    dth: 20,
    gas: 15,
    broadband: 40,
    fastag: 20,
  },
  reminderEnabled: true,
  reminderDaysBefore: 3,
  maxCoinsPerUserPerMonth: 500,
  maxPaymentsPerDayPerUser: 10,
};

const BILL_TYPES = [
  'electricity',
  'mobile_prepaid',
  'mobile_postpaid',
  'dth',
  'gas',
  'broadband',
  'fastag',
];

const BILL_TYPE_LABELS: Record<string, string> = {
  electricity: '⚡ Electricity',
  mobile_prepaid: '📱 Mobile Prepaid',
  mobile_postpaid: '📱 Mobile Postpaid',
  dth: '📺 DTH',
  gas: '🔥 Gas',
  broadband: '🌐 Broadband',
  fastag: '🚗 FASTag',
};

export default function BBPSConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [config, setConfig] = useState<BBPSConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await bbpsService.getConfig();
      setConfig(config as unknown as BBPSConfig);
    } catch (err: any) {
      showAlert('Error', 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await bbpsService.updateConfig(config);
      showAlert('Success', 'Configuration saved successfully');
      setDirty(false);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const toggleBillType = (type: string) => {
    setConfig((prev) => ({
      ...prev,
      enabledTypes: prev.enabledTypes.includes(type)
        ? prev.enabledTypes.filter((t) => t !== type)
        : [...prev.enabledTypes, type],
    }));
    setDirty(true);
  };

  const updateDefaultCoins = (type: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      defaultCoins: {
        ...prev.defaultCoins,
        [type]: parseInt(value) || 0,
      },
    }));
    setDirty(true);
  };

  const updateField = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>BBPS Config</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!dirty || saving}
          style={[
            s.saveButton,
            {
              backgroundColor: dirty ? colors.tint : colors.border,
              opacity: dirty ? 1 : 0.5,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.contentPadding}>
        {/* Section 1: Bill Type Toggles */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Bill Types</Text>
          <Text style={[s.sectionDescription, { color: colors.icon }]}>
            Enable/disable bill type support
          </Text>

          {BILL_TYPES.map((type) => (
            <View
              key={type}
              style={[
                s.billTypeRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[s.billTypeLabel, { color: colors.text }]}>
                {BILL_TYPE_LABELS[type]}
              </Text>
              <Switch
                value={config.enabledTypes.includes(type)}
                onValueChange={() => toggleBillType(type)}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={config.enabledTypes.includes(type) ? colors.success : colors.icon}
              />
            </View>
          ))}
        </View>

        {/* Section 2: Default Coin Amounts */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Default Coin Amounts</Text>
          <Text style={[s.sectionDescription, { color: colors.icon }]}>
            Override per-provider defaults
          </Text>

          {BILL_TYPES.map((type) => (
            <View
              key={`coins-${type}`}
              style={[
                s.coinInputRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[s.coinLabel, { color: colors.text }]}>
                {BILL_TYPE_LABELS[type]}
              </Text>
              <View style={s.coinInputGroup}>
                <TextInput
                  style={[
                    s.coinInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.icon}
                  value={config.defaultCoins[type]?.toString() || '0'}
                  onChangeText={(v) => updateDefaultCoins(type, v)}
                />
                <Text style={[s.coinUnit, { color: colors.icon }]}>coins</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Section 3: Reminder Notifications */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Reminder Notifications</Text>
          <Text style={[s.sectionDescription, { color: colors.icon }]}>
            Configure bill due reminders
          </Text>

          <View
            style={[
              s.settingRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[s.settingLabel, { color: colors.text }]}>
              Send Bill Due Reminders
            </Text>
            <Switch
              value={config.reminderEnabled}
              onValueChange={(v) => updateField('reminderEnabled', v)}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={config.reminderEnabled ? colors.success : colors.icon}
            />
          </View>

          {config.reminderEnabled && (
            <View
              style={[
                s.reminderOption,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[s.reminderLabel, { color: colors.text }]}>
                Days Before Due Date
              </Text>
              <View style={s.reminderOptions}>
                {[1, 3, 7].map((days) => (
                  <TouchableOpacity
                    key={days}
                    onPress={() => updateField('reminderDaysBefore', days)}
                    style={[
                      s.reminderOption2,
                      {
                        backgroundColor:
                          config.reminderDaysBefore === days ? colors.tint : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.reminderOptionText,
                        {
                          color: config.reminderDaysBefore === days ? '#fff' : colors.text,
                        },
                      ]}
                    >
                      {days} day{days > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Section 4: Fraud Prevention */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Fraud Prevention</Text>
          <Text style={[s.sectionDescription, { color: colors.icon }]}>
            Set limits to prevent abuse
          </Text>

          <View
            style={[
              s.inputRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[s.inputLabel, { color: colors.text }]}>
              Max Coins Per User/Month
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              keyboardType="number-pad"
              placeholder="500"
              placeholderTextColor={colors.icon}
              value={config.maxCoinsPerUserPerMonth.toString()}
              onChangeText={(v) => updateField('maxCoinsPerUserPerMonth', parseInt(v) || 0)}
            />
          </View>

          <View
            style={[
              s.inputRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[s.inputLabel, { color: colors.text }]}>
              Max Payments Per Day/User
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={colors.icon}
              value={config.maxPaymentsPerDayPerUser.toString()}
              onChangeText={(v) => updateField('maxPaymentsPerDayPerUser', parseInt(v) || 0)}
            />
          </View>
        </View>

        {/* Save Notice */}
        {dirty && (
          <View
            style={[
              s.notice,
              { backgroundColor: colors.warning + '20', borderColor: colors.warning },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={[s.noticeText, { color: colors.warningDark }]}>
              You have unsaved changes. Press Save to apply.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

