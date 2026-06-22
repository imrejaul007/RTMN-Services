/**
 * CorpPerks Employee Form
 *
 * Enroll/Edit employee form
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { Card } from './index';
import { corpPerksApi, type EnrollEmployeeRequest, type Employee } from '../../services/api/corpPerks';

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess?: (employee: Employee) => void;
  onCancel?: () => void;
}

const CORP_ROLES: Array<{ value: Employee['corpRole']; label: string }> = [
  { value: 'corp_employee', label: 'Employee' },
  { value: 'corp_manager', label: 'Manager' },
  { value: 'corp_hr', label: 'HR' },
  { value: 'corp_finance', label: 'Finance' },
  { value: 'corp_admin', label: 'Admin' },
];

const EMPLOYMENT_TYPES: Array<{ value: Employee['employmentType']; label: string }> = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contractor', label: 'Contractor' },
];

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Finance',
  'HR',
  'Operations',
  'Legal',
  'Admin',
];

export default function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EnrollEmployeeRequest>({
    userId: employee?.userId?._id || '',
    employeeId: employee?.employeeId || '',
    department: employee?.department || '',
    level: employee?.level || '',
    designation: employee?.designation || '',
    employmentType: employee?.employmentType || 'full_time',
    corpRole: employee?.corpRole || 'corp_employee',
  });

  const updateField = (field: keyof EnrollEmployeeRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.userId.trim()) {
      Alert.alert('Error', 'Please enter the user ID');
      return;
    }
    if (!formData.employeeId.trim()) {
      Alert.alert('Error', 'Please enter an employee ID');
      return;
    }
    if (!formData.department) {
      Alert.alert('Error', 'Please select a department');
      return;
    }
    if (!formData.level.trim()) {
      Alert.alert('Error', 'Please enter the employee level');
      return;
    }

    setLoading(true);
    try {
      const result = await corpPerksApi.enrollEmployee(formData);
      Alert.alert('Success', 'Employee enrolled successfully');
      onSuccess?.(result);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to enroll employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={onCancel || (() => router.back())}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {employee ? 'Edit Employee' : 'Enroll Employee'}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>User Information</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>User ID *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.userId}
                onChangeText={(v) => updateField('userId', v)}
                placeholder="ReZ User ID or phone number"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Employee ID *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.employeeId}
                onChangeText={(v) => updateField('employeeId', v)}
                placeholder="e.g., EMP001"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </Card>

          {/* Employment Details */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Employment Details</Text>

            {/* Department */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Department *</Text>
              <View style={styles.chipGrid}>
                {DEPARTMENTS.map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      formData.department === dept && { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
                    ]}
                    onPress={() => updateField('department', dept)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: formData.department === dept ? colors.tint : colors.text },
                      ]}
                    >
                      {dept}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Level *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.level}
                  onChangeText={(v) => updateField('level', v)}
                  placeholder="e.g., L5"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Designation</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.designation}
                  onChangeText={(v) => updateField('designation', v)}
                  placeholder="e.g., Senior Engineer"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Employment Type */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Employment Type</Text>
              <View style={styles.typeButtons}>
                {EMPLOYMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      formData.employmentType === type.value && { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
                    ]}
                    onPress={() => updateField('employmentType', type.value)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: formData.employmentType === type.value ? colors.tint : colors.text },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>

          {/* Corp Role */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>CorpPerks Role</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Determines what actions the employee can perform in CorpPerks
            </Text>

            <View style={styles.roleGrid}>
              {CORP_ROLES.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleButton,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    formData.corpRole === role.value && { borderColor: colors.tint, backgroundColor: colors.tint + '15' },
                  ]}
                  onPress={() => updateField('corpRole', role.value)}
                >
                  <Ionicons
                    name={
                      role.value === 'corp_admin' ? 'shield-checkmark' :
                      role.value === 'corp_hr' ? 'people' :
                      role.value === 'corp_finance' ? 'cash' :
                      role.value === 'corp_manager' ? 'person' : 'person-outline'
                    }
                    size={20}
                    color={formData.corpRole === role.value ? colors.tint : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleLabel,
                      { color: formData.corpRole === role.value ? colors.tint : colors.text },
                    ]}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleButton: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
