import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Mail, Phone, ShieldCheck, UserPlus } from 'lucide-react-native';

import { Screen } from '../../../components/layout/Screen';
import { AppButton } from '../../../components/ui/AppButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SurfaceCard } from '../../../components/ui/SurfaceCard';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { colors, radius, spacing, typography } from '../../../theme/tokens';

type AuthMethod = 'phone' | 'email';
type EmailMode = 'sign-in' | 'sign-up';
type PhoneStep = 'phone' | 'code';

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const auth = useMobileAuth();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [emailMode, setEmailMode] = useState<EmailMode>('sign-in');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const returnTo = ((typeof params.returnTo === 'string' && params.returnTo.trim() ? params.returnTo : '/') as Parameters<
    typeof router.replace
  >[0]);

  const errorMessage = auth.error;

  const heading = useMemo(() => {
    if (authMethod === 'phone') {
      return phoneStep === 'phone' ? 'Sign in with phone' : 'Enter your verification code';
    }

    return emailMode === 'sign-in' ? 'Sign in with email' : 'Create your account';
  }, [authMethod, emailMode, phoneStep]);

  const subheading = useMemo(() => {
    if (authMethod === 'phone') {
      return phoneStep === 'phone'
        ? 'Use your phone number to receive a verification code.'
        : 'Enter the code sent to your phone to continue.';
    }

    return emailMode === 'sign-in'
      ? 'Use your email and password to access live parking flows.'
      : 'Create a customer account for reservation and session tracking.';
  }, [authMethod, emailMode, phoneStep]);

  const handlePhoneSubmit = async () => {
    if (busy) return;

    try {
      setBusy(true);
      if (phoneStep === 'phone') {
        const result = await auth.sendPhoneCode(phone);
        setPhoneHint(result.phone);
        setPhoneStep('code');
        return;
      }

      await auth.verifyPhoneCode({ phone, token: phoneCode });
      router.replace(returnTo);
    } catch (err) {
      Alert.alert('Sign in failed', err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (busy) return;

    try {
      setBusy(true);
      if (emailMode === 'sign-in') {
        await auth.signInEmail(email, password);
      } else {
        await auth.signUpEmail({ email, password, displayName });
      }
      router.replace(returnTo);
    } catch (err) {
      Alert.alert('Account error', err instanceof Error ? err.message : 'Unable to continue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SurfaceCard style={styles.heroCard}>
        <StatusBadge label="Real customer auth" tone="success" />
        <Text style={styles.heroTitle}>{heading}</Text>
        <Text style={styles.heroCopy}>{subheading}</Text>
      </SurfaceCard>

      <SurfaceCard>
        <View style={styles.segmentRow}>
          <Pressable style={[styles.segment, authMethod === 'phone' && styles.segmentActive]} onPress={() => setAuthMethod('phone')}>
            <Phone stroke={authMethod === 'phone' ? colors.primaryDark : colors.muted} size={16} />
            <Text style={[styles.segmentText, authMethod === 'phone' && styles.segmentTextActive]}>Phone OTP</Text>
          </Pressable>
          <Pressable style={[styles.segment, authMethod === 'email' && styles.segmentActive]} onPress={() => setAuthMethod('email')}>
            <Mail stroke={authMethod === 'email' ? colors.primaryDark : colors.muted} size={16} />
            <Text style={[styles.segmentText, authMethod === 'email' && styles.segmentTextActive]}>Email</Text>
          </Pressable>
        </View>

        {authMethod === 'phone' ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+63 912 345 6789"
                placeholderTextColor={colors.muted}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>

            {phoneStep === 'code' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  value={phoneCode}
                  onChangeText={setPhoneCode}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  keyboardType="number-pad"
                />
                {phoneHint ? <Text style={styles.helper}>Code sent to {phoneHint}.</Text> : null}
              </View>
            ) : null}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <AppButton label={phoneStep === 'phone' ? 'Send code' : 'Verify code'} onPress={handlePhoneSubmit} loading={busy} />
            {phoneStep === 'code' ? <AppButton label="Change phone number" variant="secondary" onPress={() => setPhoneStep('phone')} /> : null}
          </>
        ) : (
          <>
            {emailMode === 'sign-up' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Display name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Optional"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={colors.muted}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={colors.muted}
                style={styles.input}
                secureTextEntry
              />
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <AppButton label={emailMode === 'sign-in' ? 'Sign in' : 'Create account'} onPress={handleEmailSubmit} loading={busy} />
            <AppButton
              label={emailMode === 'sign-in' ? 'Need an account?' : 'Already have an account?'}
              variant="secondary"
              onPress={() => setEmailMode(emailMode === 'sign-in' ? 'sign-up' : 'sign-in')}
            />
          </>
        )}

        <View style={styles.guestBlock}>
          <View style={styles.guestCopyRow}>
            <ShieldCheck stroke={colors.primaryDark} size={18} />
            <Text style={styles.guestCopy}>Continue as guest to test the sample flow without live auth.</Text>
          </View>
          <AppButton
            label="Continue as guest"
            variant="secondary"
            onPress={async () => {
              await auth.continueAsGuest();
              router.replace(returnTo);
            }}
          />
        </View>
      </SurfaceCard>

      <Pressable style={styles.backLink} onPress={() => router.back()}>
        <ChevronLeft stroke={colors.muted} size={16} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: typography.title,
    fontWeight: '800',
  },
  heroCopy: {
    color: '#D7F3E8',
    fontSize: typography.body,
    lineHeight: 22,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  segmentText: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.primaryDark,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: typography.body,
  },
  helper: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.body,
  },
  guestBlock: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  guestCopyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  guestCopy: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
    flex: 1,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
  },
  backText: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '600',
  },
});
