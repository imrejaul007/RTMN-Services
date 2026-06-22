import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    marginBottom: 12,
  },
  billTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  billTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  coinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  coinLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  coinInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinInput: {
    width: 70,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  coinUnit: {
    fontSize: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  reminderOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  reminderLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderOption2: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  reminderOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    gap: 10,
  },
  noticeText: {
    fontSize: 13,
    flex: 1,
  },
});
