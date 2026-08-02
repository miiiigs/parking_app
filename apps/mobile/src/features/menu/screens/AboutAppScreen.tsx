import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AppScreenHeader, AuthLogo } from '../../auth/components/AuthPrimitives';

const APP_VERSION = '1.0.0';
const APP_SCHEME = 'parkeasymobile';

export default function AboutAppScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
            <View style={[styles.header, { marginHorizontal: -horizontalPadding }]}>
              <AppScreenHeader title="About the App" onBack={() => router.back()} />
            </View>

            <View style={styles.content}>
              <View style={styles.heroCard}>
                <AuthLogo stacked size={72} showTagline />
                <Text style={styles.heroVersion}>Version {APP_VERSION}</Text>
              </View>

              <View style={styles.infoCard}>
                <InfoRow label="Developer" value="ParkingPH" />
                <InfoRow label="Platform" value="iOS & Android" />
                <InfoRow label="App Version" value={APP_VERSION} />
                <InfoRow label="App Scheme" value={APP_SCHEME} last />
              </View>

              <View style={styles.linkGroup}>
                <LinkRow label="Contact Support" sublabel="support@parkingph.com" onPress={() => router.push('/contact-support')} />
              </View>

              <Text style={styles.footerText}>Copyright 2026 ParkingPH. All rights reserved.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, last = false, value }: { label: string; last?: boolean; value: string }) {
  return (
    <View style={[styles.infoRow, !last ? styles.infoRowBorder : null]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LinkRow({
  label,
  onPress,
  sublabel,
}: {
  label: string;
  onPress: () => void;
  sublabel?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <View>
        <Text style={styles.linkLabel}>{label}</Text>
        {sublabel ? <Text style={styles.linkSubLabel}>{sublabel}</Text> : null}
      </View>
      <ChevronRight color="#CBD5E1" size={18} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  maxWidth: {
    width: '100%',
  },
  header: {},
  content: {
    gap: 18,
    paddingTop: 20,
  },
  heroCard: {
    borderRadius: 20,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 26,
    gap: 12,
  },
  heroVersion: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  infoValue: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'right',
    flexShrink: 1,
  },
  linkGroup: {
    gap: 10,
  },
  linkRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkLabel: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
  },
  linkSubLabel: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
});
