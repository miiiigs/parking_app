import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AppScreenHeader } from '../../auth/components/AuthPrimitives';

const TERMS = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using ParkingPH, you agree to these terms and any future updates that may be posted in the app.',
  },
  {
    title: 'Use of Service',
    body: 'The app may only be used for lawful parking-related activities. You agree not to misuse the service, interfere with app operations, or provide misleading reservation details.',
  },
  {
    title: 'Reservations and Payments',
    body: 'Reservations remain subject to parking lot availability. Payment collection and provider approval may happen through integrated payment services at the appropriate step in the app flow.',
  },
  {
    title: 'Cancellations and No-Shows',
    body: 'Parking reservations, reservation fees, and any applicable hold periods are governed by the policies shown during booking and may vary by operator or parking lot.',
  },
  {
    title: 'Liability',
    body: 'ParkingPH provides software support for parking access and reservations. Responsibility for vehicle care, site operations, and facility conditions remains with the parking operator.',
  },
  {
    title: 'Changes to Terms',
    body: 'These terms may be updated from time to time. Continued use of the app after updates are published constitutes acceptance of the revised terms.',
  },
] as const;

export default function TermsScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
            <View style={[styles.header, { marginHorizontal: -horizontalPadding }]}>
              <AppScreenHeader title="Terms & Conditions" onBack={() => router.back()} />
            </View>

            <View style={styles.content}>
              {TERMS.map((section, index) => (
                <View key={section.title} style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>{index + 1}. {section.title}</Text>
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
