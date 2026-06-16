import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

import { MobileAuthProvider } from '../src/providers/MobileAuthProvider';
import { MobileParkingDataProvider } from '../src/providers/MobileParkingDataProvider';
import { colors } from '../src/theme/tokens';

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
        <>
          <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: colors.canvas,
              },
            }}
          />
        </>
      </MobileParkingDataProvider>
    </MobileAuthProvider>
  );
}

