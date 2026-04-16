import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants';

/**
 * Booking Flow Layout
 * Manages the multi-step booking process
 */
export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
