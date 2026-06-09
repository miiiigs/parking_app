import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Redirect } from 'expo-router';

import { AuthScreen } from '../src/screens/AuthScreen';
import { useMobileAuth } from '../src/providers/MobileAuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    isGuest,
    isLoading,
    error,
    sendPhoneCode,
    verifyPhoneCode,
    signInEmail,
    signUpEmail,
    continueAsGuest,
    clearError,
  } = useMobileAuth();
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [emailMode, setEmailMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone');
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (isLoading) {
    return null;
  }

  if (user || isGuest) {
    return <Redirect href="/" />;
  }

  async function handlePhoneSubmit(params: { phone: string; token?: string }) {
    setIsSubmitting(true);
    setLocalError(null);
    clearError();

    try {
      if (phoneStep === 'phone') {
        const result = await sendPhoneCode(params.phone);
        setPendingPhone(result.phone);
        setPhoneStep('code');
      } else {
        await verifyPhoneCode({ phone: pendingPhone ?? params.phone, token: params.token ?? '' });
        router.replace('/');
      }
    } catch (errorValue) {
      setLocalError(errorValue instanceof Error ? errorValue.message : 'Unable to continue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendPhoneCode(phone: string) {
    setIsSubmitting(true);
    setLocalError(null);
    clearError();

    try {
      const result = await sendPhoneCode(phone);
      setPendingPhone(result.phone);
      setPhoneStep('code');
    } catch (errorValue) {
      setLocalError(errorValue instanceof Error ? errorValue.message : 'Unable to continue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEmailSubmit(params: { email: string; password: string; displayName?: string }) {
    setIsSubmitting(true);
    setLocalError(null);
    clearError();

    try {
      if (emailMode === 'sign-in') {
        await signInEmail(params.email, params.password);
        router.replace('/');
      } else {
        const result = await signUpEmail(params);
        if (result.requiresEmailConfirmation) {
          setLocalError('Account created. Check your email to confirm your account, then return here.');
        } else {
          router.replace('/');
        }
      }
    } catch (errorValue) {
      setLocalError(errorValue instanceof Error ? errorValue.message : 'Unable to continue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContinueAsGuest() {
    setIsSubmitting(true);
    setLocalError(null);
    clearError();

    try {
      await continueAsGuest();
      router.replace('/');
    } catch (errorValue) {
      setLocalError(errorValue instanceof Error ? errorValue.message : 'Unable to continue as guest.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      authMethod={authMethod}
      emailMode={emailMode}
      phoneStep={phoneStep}
      isSubmitting={isSubmitting}
      errorMessage={localError ?? error}
      phoneHint={pendingPhone}
      onSwitchAuthMethod={(method) => {
        setAuthMethod(method);
        setLocalError(null);
        clearError();
        if (method === 'phone') {
          setPhoneStep('phone');
          setPendingPhone(null);
        }
      }}
      onSwitchEmailMode={() => setEmailMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
      onPhoneSubmit={(params) => {
        void handlePhoneSubmit(params);
      }}
      onResendPhoneCode={(phone) => {
        void handleResendPhoneCode(phone);
      }}
      onEmailSubmit={(params) => {
        void handleEmailSubmit(params);
      }}
      onContinueAsGuest={() => {
        void handleContinueAsGuest();
      }}
      onBackFromPhoneCode={() => {
        setPhoneStep('phone');
        setPendingPhone(null);
        setLocalError(null);
        clearError();
      }}
    />
  );
}
