import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { extractPhoneDigits, formatPhoneInput, formatPhilippinePhoneDisplay, formatPhilippinePhoneE164 } from '../../auth/utils';
import { AppScreenHeader } from '../../auth/components/AuthPrimitives';

export default function ChangePhoneScreen() {
  const router = useRouter();
  const auth = useMobileAuth();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const digits = extractPhoneDigits(phone);
  const isValid = digits.length === 10;
  const currentNumberLabel = useMemo(() => {
    if (auth.user?.phone) {
      return formatPhilippinePhoneDisplay(auth.user.phone);
    }

    return 'No phone number on file';
  }, [auth.user?.phone]);

  async function handleSendCode() {
    if (!isValid || busy) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage(null);
      const normalizedPhone = formatPhilippinePhoneE164(digits);
      const phoneLabel = formatPhilippinePhoneDisplay(normalizedPhone);
      await auth.requestPhoneChange(normalizedPhone);
      router.push({
        pathname: '/otp',
        params: {
          phone: normalizedPhone,
          phoneLabel,
          returnTo: '/menu',
          mode: 'change-phone',
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send the verification code right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
              <View
                style={[
                styles.header,
                {
                  marginHorizontal: -horizontalPadding,
                },
              ]}
            >
              <AppScreenHeader title="Change Phone Number" onBack={() => router.back()} />
            </View>

            <View style={styles.content}>
              <View style={styles.currentCard}>
                <Text style={styles.currentLabel}>Current Number</Text>
                <Text style={styles.currentValue}>{currentNumberLabel}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>New Phone Number</Text>
                <View style={[styles.phoneShell, isValid ? styles.phoneShellActive : null]}>
                  <View style={styles.countryBlock}>
                    <Text style={styles.countryBadge}>PH</Text>
                    <Text style={styles.countryCode}>+63</Text>
                  </View>
                  <Phone color="#94A3B8" size={16} strokeWidth={2.2} />
                  <TextInput
                    value={formatPhoneInput(phone)}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="9XX XXX XXXX"
                    placeholderTextColor="#94A3B8"
                    style={styles.phoneInput}
                  />
                  <Text style={[styles.counter, isValid ? styles.counterActive : null]}>{digits.length}/10</Text>
                </View>
                <Text style={styles.fieldHint}>A verification OTP will be sent to your new number.</Text>
              </View>

              {auth.isGuest ? <Text style={styles.errorText}>Sign in first before you can change the phone number for this account.</Text> : null}
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Pressable onPress={() => void handleSendCode()} disabled={!isValid || busy || auth.isGuest || !auth.user} style={[styles.ctaButton, (!isValid || busy || auth.isGuest || !auth.user) ? styles.ctaButtonDisabled : null]}>
                <Text style={[styles.ctaText, (!isValid || busy || auth.isGuest || !auth.user) ? styles.ctaTextDisabled : null]}>
                  {busy ? 'Sending...' : 'Send Verification Code'}
                </Text>
              </Pressable>
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
    gap: 20,
    paddingTop: 24,
  },
  currentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDFA',
    padding: 16,
  },
  currentLabel: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  currentValue: {
    color: '#0F766E',
    fontSize: 18,
    lineHeight: 23,
    fontFamily: 'Poppins_700Bold',
    marginTop: 3,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  phoneShell: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  phoneShellActive: {
    borderColor: '#0F766E',
  },
  countryBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  countryBadge: {
    minWidth: 28,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8FBF2',
    color: '#0F766E',
    fontSize: 11,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  countryCode: {
    color: '#64748B',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
  },
  phoneInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    paddingVertical: 0,
  },
  counter: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
  },
  counterActive: {
    color: '#0F766E',
  },
  fieldHint: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  ctaButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Poppins_500Medium',
  },
  ctaTextDisabled: {
    color: '#94A3B8',
  },
});


