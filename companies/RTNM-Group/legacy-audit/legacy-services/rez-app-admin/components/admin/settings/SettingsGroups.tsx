import React from 'react';
import { View } from 'react-native';

export type SettingSection = {
  key: string;
  title: string;
  icon: string;
  items: SettingItem[];
};

export type SettingItem = {
  key: string;
  label: string;
  description?: string;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  route?: string;
};

export const SETTINGS_SECTIONS: SettingSection[] = [];

export const REZ_TRY_ITEMS: SettingItem[] = [];

export function SettingsGroups() { return <View />; }
