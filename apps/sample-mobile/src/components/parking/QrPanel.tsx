import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../../theme/tokens';
import { SurfaceCard } from '../ui/SurfaceCard';

interface QrPanelProps {
  title: string;
  caption: string;
  code: string;
}

export function QrPanel({ title, caption, code }: QrPanelProps) {
  return (
    <SurfaceCard>
      <View style={styles.codeFrame}>
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          <Rect x="0" y="0" width="200" height="200" fill="#FFFFFF" />
          <Rect x="10" y="10" width="42" height="42" fill="#0F172A" />
          <Rect x="148" y="10" width="42" height="42" fill="#0F172A" />
          <Rect x="10" y="148" width="42" height="42" fill="#0F172A" />
          <Rect x="72" y="72" width="56" height="56" fill="#0F172A" />
          <Rect x="34" y="78" width="16" height="16" fill="#0F172A" />
          <Rect x="150" y="92" width="14" height="14" fill="#0F172A" />
          <Rect x="92" y="28" width="14" height="14" fill="#0F172A" />
          <Rect x="94" y="156" width="18" height="18" fill="#0F172A" />
        </Svg>
      </View>
      <View style={styles.copyBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.caption}>{caption}</Text>
        <Text style={styles.code}>{code}</Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  codeFrame: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 280,
    alignSelf: 'center',
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: '#0F172A',
    backgroundColor: colors.surface,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  copyBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '700',
  },
  caption: {
    color: colors.muted,
    fontSize: typography.body,
    textAlign: 'center',
  },
  code: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
