import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Phone } from 'lucide-react-native';

import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { getRouteParam } from '../utils';
import { AuthActionButton, AuthHeaderBar } from '../components/AuthPrimitives';

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone?: string;
    phoneLabel?: string;
    returnTo?: string;
    mode?: string;
    displayName?: string;
  }>();
  const auth = useMobileAuth();
  const phone = getRouteParam(params.phone);
  const phoneLabel = getRouteParam(params.phoneLabel, '+63 9XX XXX XXXX');
  const returnTo = getRouteParam(params.returnTo, '/home');
  const mode = getRouteParam(params.mode, 'login');
  const displayName = getRouteParam(params.displayName);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (auth.user || auth.isGuest) {
      router.replace(returnTo as Parameters<typeof router.replace>[0]);
    }
  }, [auth.isGuest, auth.isLoading, auth.user, returnTo, router]);

  useEffect(() => {
    if (!phone) {
      router.replace(mode === 'register' ? '/register' : '/login');
      return;
    }

    const timerId = setTimeout(() => {
      setTimer((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [mode, phone, router, timer]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const filledCount = digits.filter(Boolean).length;
  const canResend = timer === 0;

  const handleDigitChange = (index: number, value: string) => {
    const nextDigit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = nextDigit;
    setDigits(nextDigits);
    setErrorMessage(null);

    if (nextDigit && index < nextDigits.length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (busy || filledCount < 6) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage(null);
      if (mode === 'change-phone') {
        await auth.verifyPhoneChange({ phone, token: digits.join('') });
      } else {
        await auth.verifyPhoneCode({ phone, token: digits.join('') });
      }

      if (mode === 'register' && displayName.trim()) {
        await auth.updateProfile({ displayName: displayName.trim() });
      }
      router.replace(returnTo as Parameters<typeof router.replace>[0]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify the code right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) {
      return;
    }

    try {
      setResending(true);
      setErrorMessage(null);
      if (mode === 'change-phone') {
        await auth.requestPhoneChange(phone);
      } else {
        await auth.sendPhoneCode(phone);
      }
      setDigits(['', '', '', '', '', '']);
      setTimer(60);
      inputs.current[0]?.focus();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to resend the code right now.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthHeaderBar title="Verify Phone" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}>
          <Phone color="#FFFFFF" size={30} strokeWidth={2} />
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>Enter Verification Code</Text>
          <Text style={styles.heroCopy}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.heroPhone}>{phoneLabel}</Text>
          </Text>
        </View>

        <View style={styles.codeRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={`otp-${index}`}
              ref={(node) => {
                inputs.current[index] = node;
              }}
              value={digit}
              keyboardType="number-pad"
              maxLength={1}
              onChangeText={(value) => handleDigitChange(index, value)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
                  inputs.current[index - 1]?.focus();
                }
              }}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              textAlign="center"
            />
          ))}
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(filledCount / 6) * 100}%` }]} />
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <AuthActionButton
          label="Verify & Continue"
          onPress={handleVerify}
          disabled={filledCount < 6}
          loading={busy}
        />

        <View style={styles.resendBlock}>
          {canResend ? (
            <Text style={styles.resendLink} onPress={() => void handleResend()}>
              {resending ? 'Resending...' : 'Resend Code'}
            </Text>
          ) : (
            <Text style={styles.resendCopy}>
              Resend code in <Text style={styles.resendTimer}>{String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}</Text>
            </Text>
          )}
          <Text style={styles.resendHint}>Didn&apos;t receive a code? Check your SMS inbox.</Text>
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
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 32,
    gap: 20,
    alignItems: 'center',
  },
  heroBlock: {
    alignItems: 'center',
    gap: 6,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroTitle: {
    color: '#1E293B',
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.2,
  },
  heroCopy: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.03,
  },
  heroPhone: {
    color: '#1E293B',
    fontFamily: 'Poppins_600SemiBold',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.25,
  },
  codeInputFilled: {
    borderColor: '#0F766E',
    backgroundColor: '#F0FDFA',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#0F766E',
  },
  errorText: {
    alignSelf: 'stretch',
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.02,
  },
  resendBlock: {
    alignItems: 'center',
    gap: 8,
  },
  resendLink: {
    color: '#0F766E',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.04,
  },
  resendCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.03,
  },
  resendTimer: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  resendHint: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.03,
  },
});

