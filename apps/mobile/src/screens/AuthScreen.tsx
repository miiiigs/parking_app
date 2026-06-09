import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  authMethod: 'phone' | 'email';
  emailMode: 'sign-in' | 'sign-up';
  phoneStep: 'phone' | 'code';
  isSubmitting: boolean;
  errorMessage: string | null;
  phoneHint: string | null;
  onSwitchAuthMethod: (method: 'phone' | 'email') => void;
  onSwitchEmailMode: () => void;
  onPhoneSubmit: (params: { phone: string; token?: string }) => void;
  onResendPhoneCode: (phone: string) => void;
  onEmailSubmit: (params: { email: string; password: string; displayName?: string }) => void;
  onContinueAsGuest: () => void;
  onBackFromPhoneCode: () => void;
};

export function AuthScreen({
  authMethod,
  emailMode,
  phoneStep,
  isSubmitting,
  errorMessage,
  phoneHint,
  onSwitchAuthMethod,
  onSwitchEmailMode,
  onPhoneSubmit,
  onResendPhoneCode,
  onEmailSubmit,
  onContinueAsGuest,
  onBackFromPhoneCode,
}: Props) {
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const phoneSubmitLabel = phoneStep === 'phone' ? 'Send Verification Code' : 'Verify Code';
  const emailSubmitLabel = emailMode === 'sign-in' ? 'Sign In' : 'Create Account';

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Parking Account</Text>
      <Text style={styles.title}>
        {authMethod === 'phone'
          ? phoneStep === 'phone'
            ? 'Sign in with your phone.'
            : 'Enter the verification code.'
          : emailMode === 'sign-in'
            ? 'Sign in with email.'
            : 'Create your parking account.'}
      </Text>
      <Text style={styles.subtitle}>
        {authMethod === 'phone'
          ? phoneStep === 'phone'
            ? 'Enter your phone number and we will send a verification code.'
            : 'Enter the SMS code to continue.'
          : emailMode === 'sign-in'
            ? 'Use your email and password to access your account.'
            : 'Create a customer account with email and password.'}
      </Text>

      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segmentButton, authMethod === 'phone' ? styles.segmentButtonActive : null]}
          onPress={() => onSwitchAuthMethod('phone')}
          disabled={isSubmitting}
        >
          <Text style={[styles.segmentText, authMethod === 'phone' ? styles.segmentTextActive : null]}>Phone OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, authMethod === 'email' ? styles.segmentButtonActive : null]}
          onPress={() => onSwitchAuthMethod('email')}
          disabled={isSubmitting}
        >
          <Text style={[styles.segmentText, authMethod === 'email' ? styles.segmentTextActive : null]}>Email</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {authMethod === 'phone' ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+63 912 345 6789"
                placeholderTextColor="#5e7490"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
              />
            </View>

            {phoneStep === 'code' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  value={phoneCode}
                  onChangeText={setPhoneCode}
                  placeholder="6-digit code"
                  placeholderTextColor="#5e7490"
                  style={styles.input}
                  keyboardType="number-pad"
                />
                {phoneHint ? <Text style={styles.helperText}>Code sent to {phoneHint}.</Text> : null}
              </View>
            ) : null}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
              onPress={() =>
                onPhoneSubmit({
                  phone,
                  token: phoneStep === 'code' ? phoneCode : undefined,
                })
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#071018" />
              ) : (
                <Text style={styles.primaryButtonText}>{phoneSubmitLabel}</Text>
              )}
            </TouchableOpacity>

            {phoneStep === 'code' ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={onBackFromPhoneCode} disabled={isSubmitting}>
                <Text style={styles.secondaryButtonText}>Change Phone Number</Text>
              </TouchableOpacity>
            ) : null}

            {phoneStep === 'code' ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={() => onResendPhoneCode(phone)} disabled={isSubmitting}>
                <Text style={styles.secondaryButtonText}>Resend Code</Text>
              </TouchableOpacity>
            ) : null}
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
                  placeholderTextColor="#5e7490"
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#5e7490"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#5e7490"
                style={styles.input}
                secureTextEntry
              />
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
              onPress={() =>
                onEmailSubmit({
                  email,
                  password,
                  displayName: displayName.trim() || undefined,
                })
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#071018" /> : <Text style={styles.primaryButtonText}>{emailSubmitLabel}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchEmailMode} disabled={isSubmitting}>
              <Text style={styles.secondaryButtonText}>
                {emailMode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={[styles.secondaryButton, styles.guestButton]} onPress={onContinueAsGuest} disabled={isSubmitting}>
          <Text style={styles.secondaryButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#08111f',
    gap: 12,
  },
  kicker: {
    color: '#7bd3ff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f4f7fb',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: '#b8c7da',
    fontSize: 15,
    lineHeight: 22,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    backgroundColor: '#0f1b2c',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#18283f',
  },
  segmentButtonActive: {
    backgroundColor: '#1a2e49',
    borderColor: '#3dd6a5',
  },
  segmentText: {
    color: '#b8c7da',
    fontWeight: '700',
    fontSize: 14,
  },
  segmentTextActive: {
    color: '#f4f7fb',
  },
  card: {
    backgroundColor: '#0f1b2c',
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#18283f',
  },
  field: {
    gap: 6,
  },
  label: {
    color: '#8ea4bd',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  helperText: {
    color: '#8ea4bd',
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#08111d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    color: '#f4f7fb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  guestButton: {
    backgroundColor: '#13253d',
  },
  secondaryButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 14,
    lineHeight: 20,
  },
});
