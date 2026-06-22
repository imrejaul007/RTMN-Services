/**
 * NeXha Mobile - Main App Component
 * B2B Commerce Network for distributors, franchises, and suppliers
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Screens
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { DistributorsScreen } from './src/screens/DistributorsScreen';
import { FranchisesScreen } from './src/screens/FranchisesScreen';
import { RFQScreen } from './src/screens/RFQScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SuppliersScreen } from './src/screens/SuppliersScreen';
import { CreditScreen } from './src/screens/CreditScreen';

// Types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Distributors: undefined;
  Franchises: undefined;
  Suppliers: undefined;
  Credit: undefined;
  RFQ: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: '#0a0a0f' },
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'NeXha' }}
          />
          <Stack.Screen
            name="Distributors"
            component={DistributorsScreen}
            options={{ title: 'Find Distributors' }}
          />
          <Stack.Screen
            name="Franchises"
            component={FranchisesScreen}
            options={{ title: 'Browse Franchises' }}
          />
          <Stack.Screen
            name="Suppliers"
            component={SuppliersScreen}
            options={{ title: 'Find Suppliers' }}
          />
          <Stack.Screen
            name="Credit"
            component={CreditScreen}
            options={{ title: 'Business Credit' }}
          />
          <Stack.Screen
            name="RFQ"
            component={RFQScreen}
            options={{ title: 'My RFQs' }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
