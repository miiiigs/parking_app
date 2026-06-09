import type { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useResponsiveMetrics } from '../../hooks/useResponsive';
import { colors, spacing } from '../../theme/tokens';

interface ScreenProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
}

export function Screen({ children, style, contentStyle, scrollEnabled = true }: ScreenProps) {
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();

  const content = (
    <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.maxWidth, { maxWidth: contentWidth }, contentStyle]}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      {scrollEnabled ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  maxWidth: {
    width: '100%',
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
});
