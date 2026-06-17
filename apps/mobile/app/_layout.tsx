import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

import SplashScreen from '../src/features/onboarding/screens/SplashScreen';
import { MobileAuthProvider } from '../src/providers/MobileAuthProvider';
import { MobileParkingDataProvider } from '../src/providers/MobileParkingDataProvider';
import { colors } from '../src/theme/tokens';

const APP_SPLASH_DURATION_MS = 1650;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
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
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLaunchSplash(false);
    }, APP_SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      {showLaunchSplash ? (
        <SplashScreen launchOnly durationMs={APP_SPLASH_DURATION_MS} />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.canvas,
            },
          }}
        />
      )}
    </>
  );
}

