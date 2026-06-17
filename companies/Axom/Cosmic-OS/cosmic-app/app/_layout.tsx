import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../src/constants';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="mood-checkin"
          options={{ title: 'Mood Check-In', presentation: 'modal' }}
        />
        <Stack.Screen
          name="insight/[id]"
          options={{ title: 'Insight' }}
        />
        <Stack.Screen
          name="domain/[id]"
          options={{ title: 'Guidance' }}
        />
      </Stack>
    </>
  );
}
