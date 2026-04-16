import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store';
import { COLORS } from '@/constants';

/**
 * Root Layout
 * Handles authentication state and main navigation
 */
export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated
    // If not, redirect to login (handled by initial route)
  }, [isAuthenticated]);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: COLORS.background,
          },
          cardStyle: {
            backgroundColor: COLORS.background,
          },
          animationEnabled: true,
        }}
      >
        {/* Auth flow */}
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />

        {/* Main app tabs */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        {/* Booking flow */}
        <Stack.Screen
          name="booking"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
