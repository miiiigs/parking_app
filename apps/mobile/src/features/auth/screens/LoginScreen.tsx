import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { getRouteParam, formatPhoneInput, formatPhilippinePhoneDisplay, formatPhilippinePhoneE164 } from '../utils';
import { AuthActionButton, AuthHeaderBar, AuthPhoneField } from '../components/AuthPrimitives';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const auth = useMobileAuth();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const returnTo = getRouteParam(params.returnTo, '/home');
  const normalizedPhone = formatPhilippinePhoneE164(phone);
  const isValid = normalizedPhone.length === 13;

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (auth.user || auth.isGuest) {
      router.replace(returnTo as Parameters<typeof router.replace>[0]);
    }
  }, [auth.isGuest, auth.isLoading, auth.user, returnTo, router]);

  const handleContinue = async () => {
    if (!isValid || busy) {
      return;
    }

    try {
      setBusy(true);
      setErrorMessage(null);
      const result = await auth.sendPhoneCode(normalizedPhone);
      router.push({
        pathname: '/otp',
        params: {
          phone: result.phone,
          phoneLabel: formatPhilippinePhoneDisplay(result.phone),
          returnTo,
          mode: 'login',
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send the OTP right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthHeaderBar title="Log In" onBack={() => router.replace({ pathname: '/auth', params: { returnTo } })} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroCopy}>Enter your phone number to continue</Text>
        </View>

        <AuthPhoneField
          value={phone}
          onChangeText={(nextValue) => {
            setPhone(formatPhoneInput(nextValue));
            setErrorMessage(null);
          }}
          helper="Enter your 10-digit PH mobile number (e.g. 9171234567)"
          valid={isValid}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <AuthActionButton label="Send OTP" onPress={handleContinue} disabled={!isValid} loading={busy} />

        <Text style={styles.footerCopy}>
          Don&apos;t have an account?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => router.replace({ pathname: '/register', params: { returnTo } })}
          >
            Create an Account
          </Text>
        </Text>
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
    paddingTop: 32,
    paddingBottom: 32,
    gap: 22,
  },
  heroBlock: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  heroTitle: {
    color: '#1E293B',
    fontSize: 26,
    lineHeight: 31,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.28,
  },
  heroCopy: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.03,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: -6,
    letterSpacing: 0.02,
  },
  footerCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    marginTop: 6,
    letterSpacing: 0.03,
  },
  footerLink: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
});

