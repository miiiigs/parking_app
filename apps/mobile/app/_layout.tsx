import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

import { MobileAuthProvider } from '../src/providers/MobileAuthProvider';
import { MobileParkingDataProvider } from '../src/providers/MobileParkingDataProvider';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
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

