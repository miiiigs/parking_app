import { useRouter } from 'expo-router';
import { Check, CreditCard, QrCode, Receipt } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { AuthActionButton, FlowScreenHeader } from '../../auth/components/AuthPrimitives';

export default function ScanTicketScreen() {
  const router = useRouter();
  const auth = useMobileAuth();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const requiresAuth = auth.isGuest || (!auth.user && !auth.isLoading);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.contentFrame, { maxWidth: contentWidth }]}>
          <FlowScreenHeader title="Scan Ticket" onBack={() => router.back()} />

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Receipt color="#D97706" size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>TRADITIONAL PARKING TO APP FLOW</Text>
              <Text style={styles.heroTitle}>Claim paper-ticket sessions in the app</Text>
              <Text style={styles.heroBody}>
                This flow will let drivers scan the QR from a paper parking ticket, confirm the session, pay in-app, and receive an exit QR.
              </Text>
            </View>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.sectionTitle}>How this flow will work</Text>
            <FlowStep
              icon={<QrCode color="#0F766E" size={18} strokeWidth={2.2} />}
              title="1. Scan the ticket QR"
              body="Use the camera to scan the QR printed on the paper parking receipt or entry ticket."
            />
            <FlowStep
              icon={<Check color="#0F766E" size={18} strokeWidth={2.2} />}
              title="2. Confirm the session"
              body="Review the matched parking lot, session start time, and vehicle details before claiming it."
            />
            <FlowStep
              icon={<CreditCard color="#0F766E" size={18} strokeWidth={2.2} />}
              title="3. Pay and get the exit QR"
              body="Once the session is claimed, the app continues through payment, exit QR, and receipt just like the other flows."
            />
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Implementation status</Text>
            <Text style={styles.noticeBody}>
              The entry screen is now in place, but camera scanning and ticket-claim resolution are the next implementation slice.
            </Text>
          </View>

          {requiresAuth ? (
            <View style={styles.authCard}>
              <Text style={styles.authTitle}>Sign in to use Scan Ticket</Text>
              <Text style={styles.authBody}>
                Paper-ticket claim, payment, and exit access will require an account so the parking session can be attached securely to the customer.
              </Text>
              <View style={styles.authActions}>
                <AuthActionButton
                  label="Log In"
                  onPress={() => router.push({ pathname: '/login', params: { returnTo: '/scan-ticket' } })}
                />
                <AuthActionButton
                  label="Register"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/register', params: { returnTo: '/scan-ticket' } })}
                />
              </View>
            </View>
          ) : (
            <View style={styles.nextCard}>
              <Text style={styles.nextTitle}>Next implementation target</Text>
              <Text style={styles.nextBody}>
                Camera scanning, manual fallback entry, and session claim confirmation will be connected here next.
              </Text>
              <Pressable onPress={() => router.replace('/home')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Back to Home</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FlowStep({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.flowStep}>
      <View style={styles.flowStepIcon}>{icon}</View>
      <View style={styles.flowStepCopy}>
        <Text style={styles.flowStepTitle}>{title}</Text>
        <Text style={styles.flowStepBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  contentFrame: {
    width: '100%',
    gap: 16,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#B45309',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: '#1E293B',
    fontSize: 20,
    lineHeight: 25,
    fontFamily: 'Poppins_700Bold',
    marginTop: 4,
  },
  heroBody: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  stepsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  flowStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowStepCopy: {
    flex: 1,
  },
  flowStepTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  flowStepBody: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
  },
  noticeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 16,
    gap: 4,
  },
  noticeTitle: {
    color: '#1D4ED8',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  noticeBody: {
    color: '#1E3A8A',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  authCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  authTitle: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
  },
  authBody: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  authActions: {
    gap: 12,
    marginTop: 2,
  },
  nextCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  nextTitle: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
  },
  nextBody: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
});
