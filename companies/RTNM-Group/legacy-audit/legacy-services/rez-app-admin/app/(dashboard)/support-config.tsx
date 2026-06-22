import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { s } from './styles/support-config.styles';
import supportConfigService, {
  SupportConfig,
  SupportConfigData,
  DaySchedule,
  SupportPhoneNumber,
  SupportCategoryConfig,
  Holiday,
} from '../../services/api/supportConfig';

type SectionKey = 'hours' | 'phones' | 'callback' | 'categories' | 'queue';

const SECTIONS: {
  key: SectionKey;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'hours', title: 'Support Hours', icon: 'time', color: Colors.light.info },
  { key: 'phones', title: 'Phone Numbers', icon: 'call', color: Colors.light.success },
  { key: 'callback', title: 'Callback Settings', icon: 'arrow-undo', color: Colors.light.purple },
  { key: 'categories', title: 'Categories', icon: 'grid', color: Colors.light.warning },
  { key: 'queue', title: 'Queue Settings', icon: 'warning', color: Colors.light.error },
];

const TIMEZONES = ['Asia/Dubai', 'Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London'];
const PRIORITIES: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent'];
const SEVERITY_OPTIONS: Array<'normal' | 'busy' | 'critical'> = ['normal', 'busy', 'critical'];

export default function SupportConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    hours: false,
    phones: true,
    callback: true,
    categories: true,
    queue: true,
  });
  const [config, setConfig] = useState<SupportConfigData | null>(null);

  const loadConfig = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await supportConfigService.getConfig();
      setConfig(data);
      setDirty(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await supportConfigService.updateConfig(config);
      showAlert('Success', 'Support configuration saved successfully');
      setDirty(false);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const markDirty = () => setDirty(true);

  const updateConfig = (updater: (prev: SupportConfigData) => SupportConfigData) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return updater(JSON.parse(JSON.stringify(prev)));
    });
    markDirty();
  };

  // --- Render helpers ---

  const renderTextInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { keyboardType?: 'numeric' | 'default'; placeholder?: string }
  ) => (
    <View style={s.fieldRow}>
      <Text style={[s.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[
          s.fieldInput,
          { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
        ]}
        value={value}
        onChangeText={onChange}
        keyboardType={opts?.keyboardType || 'default'}
        placeholder={opts?.placeholder}
        placeholderTextColor={colors.icon}
        selectTextOnFocus
      />
    </View>
  );

  const renderNumInput = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    suffix?: string
  ) => (
    <View style={s.fieldRow}>
      <Text style={[s.fieldLabel, { color: colors.text }]}>
        {label}
        {suffix ? ` (${suffix})` : ''}
      </Text>
      <TextInput
        style={[
          s.fieldInput,
          { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
        ]}
        value={String(value)}
        onChangeText={(t) => onChange(parseFloat(t) || 0)}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );

  const renderSwitchRow = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={s.switchRow}>
      <Text style={[s.fieldLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );

  const renderSectionCard = (sectionKey: SectionKey, content: React.ReactNode) => {
    const sec = SECTIONS.find((s) => s.key === sectionKey);
    if (!sec) return null;
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
            color={colors.text}
          />
        </TouchableOpacity>
        {!isCollapsed && (
          <View style={[s.cardBody, { borderTopColor: colors.border }]}>{content}</View>
        )}
      </View>
    );
  };

  // --- Loading / Error ---

  if (loading) {
    return (
      <View style={[s.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[s.loadingText, { color: colors.text }]}>Loading support config...</Text>
      </View>
    );
  }

  if (error || !config) {
    return (
      <View style={[s.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[s.errorText, { color: colors.text }]}>{error || 'Unknown error'}</Text>
        <TouchableOpacity style={s.retryButton} onPress={() => loadConfig()}>
          <Text style={s.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Section content ---

  const renderHoursSection = () => (
    <View>
      {/* Timezone */}
      <Text style={[s.subLabel, { color: colors.icon }]}>Timezone</Text>
      <View style={s.chipRow}>
        {TIMEZONES.map((tz) => (
          <TouchableOpacity
            key={tz}
            style={[
              s.chip,
              { borderColor: colors.border },
              config.supportHours.timezone === tz && {
                backgroundColor: colors.info,
                borderColor: colors.info,
              },
            ]}
            onPress={() =>
              updateConfig((c) => {
                c.supportHours.timezone = tz;
                return c;
              })
            }
          >
            <Text
              style={[
                s.chipText,
                config.supportHours.timezone === tz && { color: colors.card },
                { color: config.supportHours.timezone === tz ? colors.card : colors.text },
              ]}
            >
              {tz.split('/').pop()?.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Day Schedule */}
      <Text style={[s.subLabel, { color: colors.icon, marginTop: 12 }]}>Daily Schedule</Text>
      {config.supportHours.schedule.map((day, idx) => (
        <View key={day.dayOfWeek} style={[s.dayRow, { borderBottomColor: colors.border }]}>
          <View style={s.dayInfo}>
            <Switch
              value={day.isOpen}
              onValueChange={(v) =>
                updateConfig((c) => {
                  c.supportHours.schedule[idx].isOpen = v;
                  return c;
                })
              }
            />
            <Text style={[s.dayName, { color: colors.text }]}>{day.dayName}</Text>
          </View>
          {day.isOpen && (
            <View style={s.timeRow}>
              <TextInput
                style={[
                  s.timeInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={day.openTime}
                onChangeText={(v) =>
                  updateConfig((c) => {
                    c.supportHours.schedule[idx].openTime = v;
                    return c;
                  })
                }
                placeholder="09:00"
                placeholderTextColor={colors.icon}
              />
              <Text style={{ color: colors.icon }}>to</Text>
              <TextInput
                style={[
                  s.timeInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={day.closeTime}
                onChangeText={(v) =>
                  updateConfig((c) => {
                    c.supportHours.schedule[idx].closeTime = v;
                    return c;
                  })
                }
                placeholder="21:00"
                placeholderTextColor={colors.icon}
              />
            </View>
          )}
        </View>
      ))}

      {/* Holidays */}
      <Text style={[s.subLabel, { color: colors.icon, marginTop: 12 }]}>Holidays</Text>
      {config.supportHours.holidays.map((holiday, idx) => (
        <View key={idx} style={s.listItemRow}>
          <TextInput
            style={[
              s.smallInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={holiday.date}
            onChangeText={(v) =>
              updateConfig((c) => {
                c.supportHours.holidays[idx].date = v;
                return c;
              })
            }
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.icon}
          />
          <TextInput
            style={[
              s.smallInput,
              {
                flex: 1,
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={holiday.name}
            onChangeText={(v) =>
              updateConfig((c) => {
                c.supportHours.holidays[idx].name = v;
                return c;
              })
            }
            placeholder="Holiday name"
            placeholderTextColor={colors.icon}
          />
          <TouchableOpacity
            onPress={() =>
              updateConfig((c) => {
                c.supportHours.holidays.splice(idx, 1);
                return c;
              })
            }
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={s.addButton}
        onPress={() =>
          updateConfig((c) => {
            c.supportHours.holidays.push({ date: '', name: '' });
            return c;
          })
        }
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.info} />
        <Text style={s.addButtonText}>Add Holiday</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhonesSection = () => (
    <View>
      {config.phoneNumbers.map((phone, idx) => (
        <View key={idx} style={[s.itemCard, { borderColor: colors.border }]}>
          <View style={s.itemHeader}>
            <Text style={[s.itemTitle, { color: colors.text }]}>Phone #{idx + 1}</Text>
            <TouchableOpacity
              onPress={() =>
                updateConfig((c) => {
                  c.phoneNumbers.splice(idx, 1);
                  return c;
                })
              }
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
          {renderTextInput('Region', phone.region, (v) =>
            updateConfig((c) => {
              c.phoneNumbers[idx].region = v;
              return c;
            })
          )}
          {renderTextInput(
            'Number',
            phone.number,
            (v) =>
              updateConfig((c) => {
                c.phoneNumbers[idx].number = v;
                return c;
              }),
            { placeholder: '+97145551234' }
          )}
          {renderTextInput(
            'Display Number',
            phone.displayNumber,
            (v) =>
              updateConfig((c) => {
                c.phoneNumbers[idx].displayNumber = v;
                return c;
              }),
            { placeholder: '+971 4 555 1234' }
          )}
          {renderTextInput('Label', phone.label, (v) =>
            updateConfig((c) => {
              c.phoneNumbers[idx].label = v;
              return c;
            })
          )}
          {renderNumInput('Sort Order', phone.sortOrder, (v) =>
            updateConfig((c) => {
              c.phoneNumbers[idx].sortOrder = v;
              return c;
            })
          )}
          {renderSwitchRow('Active', phone.isActive, (v) =>
            updateConfig((c) => {
              c.phoneNumbers[idx].isActive = v;
              return c;
            })
          )}
        </View>
      ))}
      <TouchableOpacity
        style={s.addButton}
        onPress={() =>
          updateConfig((c) => {
            c.phoneNumbers.push({
              region: 'AE',
              number: '',
              displayNumber: '',
              label: 'Support',
              isActive: true,
              sortOrder: c.phoneNumbers.length,
            });
            return c;
          })
        }
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.info} />
        <Text style={s.addButtonText}>Add Phone Number</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCallbackSection = () => (
    <View>
      {renderSwitchRow('Callbacks Enabled', config.callbackSettings.enabled, (v) =>
        updateConfig((c) => {
          c.callbackSettings.enabled = v;
          return c;
        })
      )}
      {renderNumInput('Max Per User / Day', config.callbackSettings.maxPerUserPerDay, (v) =>
        updateConfig((c) => {
          c.callbackSettings.maxPerUserPerDay = v;
          return c;
        })
      )}
      {renderNumInput(
        'Estimated Wait',
        config.callbackSettings.estimatedWaitMinutes,
        (v) =>
          updateConfig((c) => {
            c.callbackSettings.estimatedWaitMinutes = v;
            return c;
          }),
        'minutes'
      )}
    </View>
  );

  const renderCategoriesSection = () => (
    <View>
      {config.categories.map((cat, idx) => (
        <View key={idx} style={[s.itemCard, { borderColor: colors.border }]}>
          <View style={s.itemHeader}>
            <Text style={[s.itemTitle, { color: colors.text }]}>
              {cat.name || `Category #${idx + 1}`}
            </Text>
            <TouchableOpacity
              onPress={() =>
                updateConfig((c) => {
                  c.categories.splice(idx, 1);
                  return c;
                })
              }
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
          {renderTextInput('ID', cat.id, (v) =>
            updateConfig((c) => {
              c.categories[idx].id = v;
              return c;
            })
          )}
          {renderTextInput('Name', cat.name, (v) =>
            updateConfig((c) => {
              c.categories[idx].name = v;
              return c;
            })
          )}
          {renderTextInput(
            'Icon',
            cat.icon,
            (v) =>
              updateConfig((c) => {
                c.categories[idx].icon = v;
                return c;
              }),
            { placeholder: 'cube-outline' }
          )}
          {renderNumInput(
            'SLA',
            cat.slaMinutes,
            (v) =>
              updateConfig((c) => {
                c.categories[idx].slaMinutes = v;
                return c;
              }),
            'minutes'
          )}
          {renderNumInput('Sort Order', cat.sortOrder, (v) =>
            updateConfig((c) => {
              c.categories[idx].sortOrder = v;
              return c;
            })
          )}

          {/* Priority picker */}
          <Text style={[s.subLabel, { color: colors.icon }]}>Priority</Text>
          <View style={s.chipRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  s.chip,
                  { borderColor: colors.border },
                  cat.priority === p && {
                    backgroundColor: colors.purple,
                    borderColor: colors.purple,
                  },
                ]}
                onPress={() =>
                  updateConfig((c) => {
                    c.categories[idx].priority = p;
                    return c;
                  })
                }
              >
                <Text
                  style={[
                    s.chipText,
                    { color: cat.priority === p ? colors.card : colors.text },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {renderSwitchRow('Active', cat.isActive, (v) =>
            updateConfig((c) => {
              c.categories[idx].isActive = v;
              return c;
            })
          )}
        </View>
      ))}
      <TouchableOpacity
        style={s.addButton}
        onPress={() =>
          updateConfig((c) => {
            c.categories.push({
              id: `cat-${Date.now()}`,
              name: '',
              icon: 'help-circle-outline',
              priority: 'medium',
              slaMinutes: 60,
              isActive: true,
              sortOrder: c.categories.length,
            });
            return c;
          })
        }
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.info} />
        <Text style={s.addButtonText}>Add Category</Text>
      </TouchableOpacity>
    </View>
  );

  const renderQueueSection = () => (
    <View>
      {renderSwitchRow('Manual Override', config.queueStatus.override, (v) =>
        updateConfig((c) => {
          c.queueStatus.override = v;
          return c;
        })
      )}
      {config.queueStatus.override &&
        renderTextInput('Override Message', config.queueStatus.message, (v) =>
          updateConfig((c) => {
            c.queueStatus.message = v;
            return c;
          })
        )}

      <Text style={[s.subLabel, { color: colors.icon, marginTop: 8 }]}>Severity</Text>
      <View style={s.chipRow}>
        {SEVERITY_OPTIONS.map((sev) => (
          <TouchableOpacity
            key={sev}
            style={[
              s.chip,
              { borderColor: colors.border },
              config.queueStatus.severity === sev && {
                backgroundColor:
                  sev === 'normal' ? colors.success : sev === 'busy' ? colors.warning : colors.error,
                borderColor:
                  sev === 'normal' ? colors.success : sev === 'busy' ? colors.warning : colors.error,
              },
            ]}
            onPress={() =>
              updateConfig((c) => {
                c.queueStatus.severity = sev;
                return c;
              })
            }
          >
            <Text
              style={[
                s.chipText,
                { color: config.queueStatus.severity === sev ? colors.card : colors.text },
              ]}
            >
              {sev}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <Text style={[s.headerTitle, { color: colors.text }]}>Support Config</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={() => loadConfig(true)}>
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

      {dirty && (
        <View style={s.dirtyBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.warning} />
          <Text style={s.dirtyText}>You have unsaved changes</Text>
        </View>
      )}

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadConfig(true)} />
        }
      >
        {renderSectionCard('hours', renderHoursSection())}
        {renderSectionCard('phones', renderPhonesSection())}
        {renderSectionCard('callback', renderCallbackSection())}
        {renderSectionCard('categories', renderCategoriesSection())}
        {renderSectionCard('queue', renderQueueSection())}
      </ScrollView>
    </View>
  );
}

