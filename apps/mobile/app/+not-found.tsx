import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../src/components/layout/Screen';
import { AppButton } from '../src/components/ui/AppButton';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Missing screen' }} />
      <Screen>
        <View style={styles.card}>
          <Text style={styles.title}>This screen does not exist.</Text>
          <Text style={styles.copy}>The route could not be resolved in the sample mobile app.</Text>
          <Link href="/home" asChild>
            <AppButton label="Back home" />
          </Link>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
  copy: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
