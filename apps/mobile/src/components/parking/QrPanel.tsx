import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors, radius, spacing, typography } from '../../theme/tokens';
import { SurfaceCard } from '../ui/SurfaceCard';

interface QrPanelProps {
  title: string;
  caption: string;
  code: string;
  qrRef?: { current: any };
}

export function QrPanel({ title, caption, code, qrRef }: QrPanelProps) {
  return (
    <SurfaceCard>
      <View style={styles.codeFrame}>
        <QRCode
          getRef={(ref: any) => {
            if (qrRef) {
              qrRef.current = ref;
            }
          }}
          value={code || 'parking-qrcode-unavailable'}
          size={200}
          color="#0F172A"
          backgroundColor="#FFFFFF"
        />
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
    alignItems: 'center',
    justifyContent: 'center',
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
