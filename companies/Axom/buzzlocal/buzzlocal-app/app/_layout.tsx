import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../src/constants';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Details' }} />
        <Stack.Screen name="business/[id]" options={{ title: 'Business' }} />
        <Stack.Screen name="society/index" options={{ title: 'My Society' }} />
        <Stack.Screen name="safety/index" options={{ title: 'Safety' }} />
      </Stack>
    </>
  );
}
