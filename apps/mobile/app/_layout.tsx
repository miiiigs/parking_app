import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileAuthProvider } from '../src/providers/MobileAuthProvider';
import { MobileWorkflowProvider } from '../src/providers/MobileWorkflowProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MobileAuthProvider>
        <MobileWorkflowProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </MobileWorkflowProvider>
      </MobileAuthProvider>
    </SafeAreaProvider>
  );
}
