import { useState } from 'react';
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
  const displayPhone = formatPhilippinePhoneDisplay(normalizedPhone);
  const isValid = normalizedPhone.length === 13;

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
          helper="A 6-digit OTP will be sent via SMS to this number."
          valid={isValid}
        />

        {displayPhone && isValid ? <Text style={styles.previewCopy}>Code destination: {displayPhone}</Text> : null}
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
    paddingTop: 36,
    paddingBottom: 32,
    gap: 24,
  },
  heroBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#1E293B',
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.42,
  },
  heroCopy: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.03,
  },
  previewCopy: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
    marginTop: -8,
    letterSpacing: 0.03,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: -8,
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
