import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as NativeSplashScreen from 'expo-splash-screen';

import SplashScreen from '../src/features/onboarding/screens/SplashScreen';
import { useMobileAuth } from '../src/providers/MobileAuthProvider';
import { MobileAuthProvider } from '../src/providers/MobileAuthProvider';
import { MobileParkingDataProvider } from '../src/providers/MobileParkingDataProvider';
import { colors } from '../src/theme/tokens';

const APP_SPLASH_DURATION_MS = 1650;

NativeSplashScreen.preventAutoHideAsync().catch(() => {
  // Native splash may already be controlled by the runtime during fast refresh.
});

NativeSplashScreen.setOptions({
  duration: 260,
  fade: true,
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  return (
    <MobileAuthProvider>
      <MobileParkingDataProvider>
        <AppBootstrap />
      </MobileParkingDataProvider>
    </MobileAuthProvider>
  );
}

function AppBootstrap() {
  const auth = useMobileAuth();
  const [isMinimumSplashComplete, setIsMinimumSplashComplete] = useState(false);
  const hasHiddenNativeSplash = useRef(false);
  const showLaunchSplash = !isMinimumSplashComplete || auth.isLoading;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimumSplashComplete(true);
    }, APP_SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleLaunchSplashLayout = useCallback(() => {
    if (hasHiddenNativeSplash.current) {
      return;
    }

    hasHiddenNativeSplash.current = true;
    void NativeSplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      {showLaunchSplash ? (
        <View style={{ flex: 1 }} onLayout={handleLaunchSplashLayout}>
          <SplashScreen launchOnly durationMs={APP_SPLASH_DURATION_MS} />
        </View>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: {
              backgroundColor: colors.canvas,
            },
          }}
        />
      )}
    </>
  );
}

