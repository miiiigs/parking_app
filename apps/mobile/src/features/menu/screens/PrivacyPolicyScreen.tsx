import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AppScreenHeader } from '../../auth/components/AuthPrimitives';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect the information you provide when creating an account, saving vehicle details, requesting support, or making a parking reservation. This can include your name, phone number, vehicle details, and payment preferences.',
  },
  {
    title: 'How We Use Your Information',
    body: 'We use your data to provide parking reservations, maintain session state, improve parking operations, send service notifications, and respond to support requests.',
  },
  {
    title: 'Location Data',
    body: 'If you allow location access, the app can use your device location to help surface nearby parking facilities. You can disable that permission at any time in your device settings.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell your personal information. Data may be shared with parking facility operators and payment providers only when needed to deliver the parking service.',
  },
  {
    title: 'Data Security',
    body: 'We use standard security controls and authenticated service access to help protect your information against unauthorized access or misuse.',
  },
  {
    title: 'Your Rights',
    body: 'You may request access, correction, or deletion of your personal information through our support channels, subject to operational and legal requirements.',
  },
] as const;

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
            <View style={[styles.header, { marginHorizontal: -horizontalPadding }]}>
              <AppScreenHeader title="Privacy Policy" onBack={() => router.back()} />
            </View>

            <View style={styles.content}>
              <View style={styles.heroCard}>
                <Text style={styles.heroTitle}>Privacy Policy</Text>
                <Text style={styles.heroSubtitle}>Last updated: August 2, 2026</Text>
              </View>

              {SECTIONS.map((section) => (
                <View key={section.title} style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionBody}>{section.body}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    gap: 14,
    paddingTop: 20,
  },
  heroCard: {
    borderRadius: 18,
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_700Bold',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  sectionTitle: {
    color: '#0F766E',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
  },
  sectionBody: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
});
