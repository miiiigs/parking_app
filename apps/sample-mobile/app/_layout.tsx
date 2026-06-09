import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  return (
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
  );
}

