import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleAlert, User } from 'lucide-react-native';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { getRouteParam, formatPhoneInput, formatPhilippinePhoneDisplay, formatPhilippinePhoneE164 } from '../utils';
import { AuthActionButton, AuthHeaderBar, AuthPhoneField } from '../components/AuthPrimitives';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const auth = useMobileAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const returnTo = getRouteParam(params.returnTo, '/home');
  const normalizedPhone = formatPhilippinePhoneE164(phone);
  const isValid = displayName.trim().length >= 2 && normalizedPhone.length === 13;

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
          mode: 'register',
          displayName: displayName.trim(),
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
      <AuthHeaderBar title="Create Account" onBack={() => router.replace({ pathname: '/auth', params: { returnTo } })} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>Create your account</Text>
          <Text style={styles.heroCopy}>Start parking smarter today</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={[styles.nameField, displayName.trim().length >= 2 ? styles.nameFieldValid : null]}>
            <User color="#94A3B8" size={16} strokeWidth={2.1} />
            <TextInput
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                setErrorMessage(null);
              }}
              placeholder="Juan dela Cruz"
              placeholderTextColor="#94A3B8"
              style={styles.nameInput}
            />
          </View>
        </View>

        <AuthPhoneField
          value={phone}
          onChangeText={(nextValue) => {
            setPhone(formatPhoneInput(nextValue));
            setErrorMessage(null);
          }}
          helper="Enter your 10-digit PH mobile number (e.g. 9171234567)"
          valid={normalizedPhone.length === 13}
        />

        <View style={styles.infoCard}>
          <CircleAlert color="#0F766E" size={16} strokeWidth={2.1} style={{ marginTop: 1 }} />
          <View style={styles.infoCopyGroup}>
            <Text style={styles.infoTitle}>Vehicle details added later</Text>
            <Text style={styles.infoCopy}>
              Add your vehicle model, color, and plate number in your Profile after signing up.
            </Text>
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <AuthActionButton label="Send OTP to Verify" onPress={handleContinue} disabled={!isValid} loading={busy} />

        <Text style={styles.footerCopy}>
          Already have an account?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => router.replace({ pathname: '/login', params: { returnTo } })}
          >
            Log In
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
    gap: 20,
  },
  heroBlock: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  heroTitle: {
    color: '#1E293B',
    fontSize: 24,
    lineHeight: 29,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.28,
  },
  heroCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.03,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  nameField: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  nameFieldValid: {
    borderColor: '#0F766E',
  },
  nameInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    paddingVertical: 0,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDFA',
    padding: 16,
  },
  infoCopyGroup: {
    flex: 1,
  },
  infoTitle: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.03,
  },
  infoCopy: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
    opacity: 0.82,
    letterSpacing: 0.03,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.02,
  },
  footerCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
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
