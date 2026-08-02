import { useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import { Check, CreditCard, Download, QrCode, Smartphone } from 'lucide-react-native';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { getResolvedSupabaseConfig } from '../../../lib/supabaseConfig';
import {
  attachPayMongoPaymentMethodToIntent,
  createPayMongoCardPaymentMethod,
  createPayMongoPaymentIntent,
  createPayMongoSimplePaymentMethod,
  mapWalletMethodToPayMongoType,
  syncPayMongoPaymentIntent,
  type PayMongoMethodType,
} from '../../../lib/payments';
import { FlowScreenHeader } from '../../auth/components/AuthPrimitives';
import { usePaymentMethodsStore } from '../../menu/store/usePaymentMethodsStore';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { formatDuration } from '../../../utils/format';
import { formatParkingPricingSummary } from '@parking/shared';

type PaymentMethodOption = {
  id: string;
  label: string;
  sublabel: string;
  type: 'card' | 'wallet' | 'qr';
};

function formatCurrency(amount: number) {
  return `PHP ${amount.toFixed(2)}`;
}

function resolveInitialMethodSelection(savedPaymentMethod: string | null, methodOptions: PaymentMethodOption[]) {
  if (savedPaymentMethod) {
    const matchedMethod = methodOptions.find(
      (method) => method.id === savedPaymentMethod || method.label === savedPaymentMethod,
    );

    if (matchedMethod) {
      return matchedMethod.id;
    }
  }

  return methodOptions[0]?.id ?? '';
}

function normalizeCardDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 16);
}

function formatCardDigits(value: string) {
  return normalizeCardDigits(value).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function normalizeExpiryDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 4);
}

function formatExpiry(value: string) {
  const digits = normalizeExpiryDigits(value);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}` : digits;
}

function resolvePayMongoMethodType(option: PaymentMethodOption | null): PayMongoMethodType | null {
  if (!option) {
    return null;
  }

  if (option.type === 'card') {
    return 'card';
  }

  if (option.type === 'qr') {
    return 'qrph';
  }

  return mapWalletMethodToPayMongoType(option.id);
}

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    paymongo_status?: string | string[];
    payment_intent_id?: string | string[];
  }>();
  const { contentWidth, horizontalPadding, isCompact } = useResponsiveMetrics();
  const completedSession = useParkingFlowStore((state) => state.completedSession);
  const hasHydrated = useParkingFlowStore((state) => state.hasHydrated);
  const pendingPaymentIntentId = useParkingFlowStore((state) => state.pendingPaymentIntentId);
  const pendingPaymentMethodType = useParkingFlowStore((state) => state.pendingPaymentMethodType);
  const pendingPaymentQrImageUrl = useParkingFlowStore((state) => state.pendingPaymentQrImageUrl);
  const setPendingPaymentAttempt = useParkingFlowStore((state) => state.setPendingPaymentAttempt);
  const clearPendingPaymentAttempt = useParkingFlowStore((state) => state.clearPendingPaymentAttempt);
  const markCompletedSessionPaymentStatus = useParkingFlowStore((state) => state.markCompletedSessionPaymentStatus);
  const wallets = usePaymentMethodsStore((state) => state.wallets);
  const cards = usePaymentMethodsStore((state) => state.cards);
  const savedPaymentMethod = useWalkInPreferencesStore((state) => state.paymentMethod);
  const setPaymentMethod = useWalkInPreferencesStore((state) => state.setPaymentMethod);

  const methodOptions = useMemo<PaymentMethodOption[]>(() => {
    const cardOptions = cards.map((card) => ({
      id: card.id,
      label: card.label,
      sublabel: 'Enter card details securely',
      type: 'card' as const,
    }));

    const walletOptions = wallets.map((wallet) => ({
      id: wallet.id,
      label: wallet.name,
      sublabel: wallet.linked ? 'Preferred method - authorization may still be required' : 'Authorize in the wallet app',
      type: 'wallet' as const,
    }));

    const qrOption: PaymentMethodOption = {
      id: 'qrph',
      label: 'QR Ph',
      sublabel: 'Scan or save the QR, then pay in your wallet or banking app',
      type: 'qr',
    };

    const combined = [...cardOptions, ...walletOptions, qrOption];

    if (cardOptions.length > 0) {
      return combined;
    }

    return [
      { id: 'card-fallback', label: 'Credit / Debit Card', sublabel: 'Enter card details securely', type: 'card' },
      ...walletOptions,
      qrOption,
    ];
  }, [cards, wallets]);

  const [selectedMethod, setSelectedMethod] = useState<string>(() => resolveInitialMethodSelection(savedPaymentMethod, methodOptions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const handledReturnKeyRef = useRef<string | null>(null);
  const qrCardRef = useRef<View>(null);
  const payMongoStatus = Array.isArray(params.paymongo_status) ? params.paymongo_status[0] : params.paymongo_status;
  const returnedPaymentIntentId = Array.isArray(params.payment_intent_id) ? params.payment_intent_id[0] : params.payment_intent_id;

  useEffect(() => {
    if (hasHydrated && !completedSession) {
      router.replace('/home');
    }
  }, [completedSession, hasHydrated, router]);

  useEffect(() => {
    if (!selectedMethod || !methodOptions.some((method) => method.id === selectedMethod)) {
      setSelectedMethod(resolveInitialMethodSelection(savedPaymentMethod, methodOptions));
    }
  }, [methodOptions, savedPaymentMethod, selectedMethod]);

  async function syncPaymentState(paymentIntentIdOverride?: string) {
    if (!completedSession) {
      return;
    }

    const reservationId = completedSession.reservationId ?? completedSession.reservationCode;
    const paymentIntentId = paymentIntentIdOverride ?? pendingPaymentIntentId;

    if (!paymentIntentId) {
      setStatusMessage('Start a PayMongo payment first so we can check the latest status.');
      return;
    }

    try {
      setIsVerifying(true);
      setStatusMessage(null);

      const syncResult = await syncPayMongoPaymentIntent({
        reservationId,
        paymentIntentId,
      });

      markCompletedSessionPaymentStatus(syncResult.paymentStatus);

      if (syncResult.paymentStatus === 'paid') {
        clearPendingPaymentAttempt();
        router.replace('/payment-success');
        return;
      }

      if (syncResult.paymentStatus === 'failed') {
        clearPendingPaymentAttempt();
        setStatusMessage(syncResult.errorMessage ?? 'The payment was not completed. You can try again when ready.');
        return;
      }

      setPendingPaymentAttempt({
        paymentIntentId,
        paymentMethodType: pendingPaymentMethodType,
        qrImageUrl: syncResult.qrImageUrl ?? pendingPaymentQrImageUrl,
      });

      if (syncResult.errorMessage) {
        setStatusMessage(syncResult.errorMessage);
      } else if (pendingPaymentMethodType === 'qrph') {
        setStatusMessage('QR Ph is still waiting for payment. Scan or save the QR, then check again after paying.');
      } else {
        setStatusMessage('Payment is still pending. Complete the wallet or bank approval, then check again.');
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to verify the PayMongo payment right now.');
    } finally {
      setIsVerifying(false);
    }
  }

  useEffect(() => {
    if (!payMongoStatus || !completedSession) {
      return;
    }

    if (payMongoStatus === 'cancelled') {
      setStatusMessage('Payment was cancelled. You can retry whenever you are ready.');
      return;
    }

    if (payMongoStatus !== 'return') {
      return;
    }

    const handledKey = `${payMongoStatus}:${returnedPaymentIntentId ?? pendingPaymentIntentId ?? 'missing'}`;
    if (handledReturnKeyRef.current === handledKey) {
      return;
    }

    handledReturnKeyRef.current = handledKey;
    void syncPaymentState(returnedPaymentIntentId ?? undefined);
  }, [completedSession, payMongoStatus, pendingPaymentIntentId, returnedPaymentIntentId]);

  useEffect(() => {
    if (!completedSession || pendingPaymentMethodType !== 'qrph' || !pendingPaymentIntentId || completedSession.paymentStatus === 'paid') {
      return;
    }

    const intervalId = setInterval(() => {
      void syncPaymentState();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [completedSession, pendingPaymentIntentId, pendingPaymentMethodType]);

  if (!hasHydrated || !completedSession) {
    return null;
  }

  const selectedMethodOption = methodOptions.find((method) => method.id === selectedMethod) ?? methodOptions[0] ?? null;
  const payMongoMethodType = resolvePayMongoMethodType(selectedMethodOption);
  const isWalkIn = completedSession.reservationCode.startsWith('WIN-');
  const reservationFee = isWalkIn ? 0 : Number(completedSession.reservationFee ?? 0);
  const parkingFee = completedSession.totalBill;
  const totalAmount = reservationFee + parkingFee;
  const pricingSummary = formatParkingPricingSummary(completedSession.pricingConfig);
  const reservationId = completedSession.reservationId ?? completedSession.reservationCode;
  const canUsePayMongo = Boolean(completedSession.reservationId);
  const paymentIsSettled = completedSession.paymentStatus === 'paid';
  const normalizedCardNumber = normalizeCardDigits(cardNumber);
  const expiryDigits = normalizeExpiryDigits(expiry);
  const cvcDigits = cvc.replace(/\D/g, '').slice(0, 4);
  const isCardFormValid =
    normalizedCardNumber.length >= 12
    && cardholderName.trim().length >= 3
    && expiryDigits.length === 4
    && cvcDigits.length >= 3;
  const showingCardForm = selectedMethodOption?.type === 'card';
  const qrImageUrl = pendingPaymentMethodType === 'qrph' ? pendingPaymentQrImageUrl : null;

  async function saveQrImage() {
    if (!qrCardRef.current) {
      setStatusMessage('Generate the QR first before saving it.');
      return;
    }

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      const granted = permission.granted || permission.status === 'granted';

      if (!granted) {
        setStatusMessage('Permission to save to photos was denied.');
        return;
      }

      const uri = await captureRef(qrCardRef, {
        format: 'png',
        quality: 0.95,
        result: 'tmpfile',
      });

      const asset = await MediaLibrary.createAssetAsync(uri);

      try {
        await MediaLibrary.createAlbumAsync('ParkEasyPayments', asset, false);
      } catch {
        // album may already exist
      }

      setStatusMessage('QR Ph image saved to your photos.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to save the QR image right now.');
    }
  }

  function fillSuccessTestCard() {
    setCardNumber('4343434343434345');
    setCardholderName('Juan dela Cruz');
    setExpiry('1230');
    setCvc('123');
  }

  async function handleAttachResult({
    paymentIntentId,
    paymentIntentStatus,
    nextActionRedirectUrl,
    qrImageUrl: nextQrImageUrl,
    errorMessage,
    methodType,
  }: {
    paymentIntentId: string;
    paymentIntentStatus: string;
    nextActionRedirectUrl: string | null;
    qrImageUrl: string | null;
    errorMessage: string | null;
    methodType: PayMongoMethodType;
  }) {
    if (paymentIntentStatus === 'succeeded') {
      await syncPaymentState(paymentIntentId);
      return;
    }

    if (paymentIntentStatus === 'processing') {
      setPendingPaymentAttempt({
        paymentIntentId,
        paymentMethodType: methodType,
        qrImageUrl: nextQrImageUrl,
      });
      setStatusMessage('Payment is processing. We will keep checking for the final result.');
      return;
    }

    if (paymentIntentStatus === 'awaiting_next_action') {
      setPendingPaymentAttempt({
        paymentIntentId,
        paymentMethodType: methodType,
        qrImageUrl: nextQrImageUrl,
      });

      if (methodType === 'qrph' && nextQrImageUrl) {
        setStatusMessage('Show this QR to another device, or save it and pay with your preferred wallet or bank app.');
        return;
      }

      if (nextActionRedirectUrl) {
        setStatusMessage('Opening the payment authorization step.');
        await Linking.openURL(nextActionRedirectUrl);
        return;
      }
    }

    if (paymentIntentStatus === 'awaiting_payment_method') {
      setPendingPaymentAttempt({
        paymentIntentId,
        paymentMethodType: methodType,
        qrImageUrl: null,
      });
      setStatusMessage(errorMessage ?? 'PayMongo rejected that payment method. Please review the details and try again.');
      return;
    }

    setPendingPaymentAttempt({
      paymentIntentId,
      paymentMethodType: methodType,
      qrImageUrl: nextQrImageUrl,
    });
    setStatusMessage(errorMessage ?? 'Payment status updated. Check the latest status after completing any required action.');
  }

  async function handlePay() {
    if (!selectedMethodOption || !payMongoMethodType) {
      setStatusMessage('Select a payment method to continue.');
      return;
    }

    if (!canUsePayMongo) {
      setStatusMessage('A live Supabase-backed reservation is required before PayMongo payment can be used.');
      return;
    }

    if (paymentIsSettled) {
      router.replace('/payment-success');
      return;
    }

    if (payMongoMethodType === 'card' && !isCardFormValid) {
      setStatusMessage('Enter valid card details before continuing.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      setPaymentMethod(selectedMethodOption.label);

      const intent = await createPayMongoPaymentIntent({
        reservationId,
        paymentMethodType: payMongoMethodType,
      });

      const supabaseUrl = getResolvedSupabaseConfig().supabaseUrl;

      if (!supabaseUrl) {
        throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      }

      const returnUrl = new URL('/functions/v1/paymongo-return', supabaseUrl);
      returnUrl.searchParams.set('paymongo_status', 'return');
      returnUrl.searchParams.set('payment_intent_id', intent.paymentIntentId);

      let paymentMethodId: string;

      if (payMongoMethodType === 'card') {
        const expMonth = Number(expiryDigits.slice(0, 2));
        const expYearShort = Number(expiryDigits.slice(2, 4));
        const expYear = expYearShort >= 70 ? 1900 + expYearShort : 2000 + expYearShort;

        paymentMethodId = await createPayMongoCardPaymentMethod({
          cardNumber: normalizedCardNumber,
          expMonth,
          expYear,
          cvc: cvcDigits,
          cardholderName: cardholderName.trim(),
        });
      } else {
        paymentMethodId = await createPayMongoSimplePaymentMethod(payMongoMethodType);
      }

      const attachResult = await attachPayMongoPaymentMethodToIntent({
        paymentIntentId: intent.paymentIntentId,
        paymentMethodId,
        clientKey: intent.clientKey,
        returnUrl: payMongoMethodType === 'qrph' ? undefined : returnUrl.toString(),
      });

      await handleAttachResult({
        paymentIntentId: attachResult.paymentIntentId,
        paymentIntentStatus: attachResult.paymentIntentStatus,
        nextActionRedirectUrl: attachResult.nextActionRedirectUrl,
        qrImageUrl: attachResult.qrImageUrl,
        errorMessage: attachResult.errorMessage,
        methodType: payMongoMethodType,
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to start the PayMongo payment right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
            <View style={styles.content}>
              <FlowScreenHeader title="Payment" onBack={() => router.back()} />

              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownTitle}>Fee Breakdown</Text>
                  <Text style={styles.breakdownMeta}>{formatDuration(completedSession.durationSeconds)}</Text>
                </View>

                <FeeRow label="Pricing model" amount={pricingSummary} />
                <FeeRow label={`Parking Fee (${formatDuration(completedSession.durationSeconds)})`} amount={formatCurrency(parkingFee)} />
                {!isWalkIn ? <FeeRow label="Reservation Fee" amount={formatCurrency(reservationFee)} /> : null}

                <View style={[styles.totalBanner, isCompact ? styles.totalBannerCompact : null]}>
                  <Text style={styles.totalBannerLabel}>Total Amount</Text>
                  <Text style={[styles.totalBannerValue, isCompact ? styles.totalBannerValueCompact : null]}>{formatCurrency(totalAmount)}</Text>
                </View>
              </View>

              <View>
                <Text style={styles.methodsTitle}>Payment Method</Text>
                <View style={styles.methodsStack}>
                  {methodOptions.map((method) => {
                    const active = selectedMethod === method.id;
                    const Icon = method.type === 'card' ? CreditCard : method.type === 'qr' ? QrCode : Smartphone;

                    return (
                      <Pressable
                        key={`${method.id}-${method.label}`}
                        onPress={() => setSelectedMethod(method.id)}
                        style={[styles.methodCard, isCompact ? styles.methodCardCompact : null, active ? styles.methodCardActive : null]}
                      >
                        <View style={[styles.methodIconWrap, active ? styles.methodIconWrapActive : null]}>
                          <Icon color={active ? '#FFFFFF' : '#64748B'} size={20} strokeWidth={2.2} />
                        </View>
                        <View style={styles.methodCopy}>
                          <Text style={styles.methodLabel}>{method.label}</Text>
                          <Text style={styles.methodSubLabel}>{method.sublabel}</Text>
                        </View>
                        <View style={[styles.methodCheckWrap, active ? styles.methodCheckWrapActive : null]}>
                          {active ? <Check color="#FFFFFF" size={13} strokeWidth={3} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {showingCardForm ? (
                <View style={styles.cardPanel}>
                  <View style={styles.cardPanelHeader}>
                    <Text style={styles.cardPanelTitle}>Card Details</Text>
                    <Pressable onPress={fillSuccessTestCard} style={styles.cardShortcut}>
                      <Text style={styles.cardShortcutText}>Use success test card</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.cardPanelCopy}>
                    Card details stay client-side with PayMongo tokenization. Test card `4343 4343 4343 4345` succeeds without 3DS.
                  </Text>
                  <Field label="Card Number">
                    <TextInput
                      value={formatCardDigits(cardNumber)}
                      onChangeText={setCardNumber}
                      keyboardType="number-pad"
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#94A3B8"
                      style={styles.textField}
                    />
                  </Field>
                  <Field label="Cardholder Name">
                    <TextInput
                      value={cardholderName}
                      onChangeText={setCardholderName}
                      placeholder="Juan dela Cruz"
                      placeholderTextColor="#94A3B8"
                      style={styles.textField}
                    />
                  </Field>
                  <View style={[styles.splitRow, isCompact ? styles.splitRowCompact : null]}>
                    <Field label="Expiry" style={styles.splitField}>
                      <TextInput
                        value={formatExpiry(expiry)}
                        onChangeText={setExpiry}
                        keyboardType="number-pad"
                        placeholder="MM/YY"
                        placeholderTextColor="#94A3B8"
                        style={styles.textField}
                      />
                    </Field>
                    <Field label="CVC" style={styles.splitField}>
                      <TextInput
                        value={cvcDigits}
                        onChangeText={setCvc}
                        keyboardType="number-pad"
                        placeholder="123"
                        placeholderTextColor="#94A3B8"
                        style={styles.textField}
                      />
                    </Field>
                  </View>
                </View>
              ) : null}

              {qrImageUrl ? (
                <View ref={qrCardRef} collapsable={false} style={styles.qrPanel}>
                  <View style={styles.qrPanelHeader}>
                    <Text style={styles.qrPanelTitle}>QR Ph Payment</Text>
                    <Text style={styles.qrPanelCopy}>Scan using GCash, Maya, or a supported banking app.</Text>
                  </View>
                  <View style={styles.qrImageWrap}>
                    <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
                  </View>
                  <View style={styles.qrHintChip}>
                    <Text style={styles.qrHintText}>This dynamic QR is single-use and expires if not paid in time.</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.noticePanel}>
                <Text style={styles.noticeTitle}>
                  {paymentIsSettled ? 'Payment Verified' : selectedMethodOption?.type === 'card' ? 'Card Flow' : 'PayMongo Payment Intent'}
                </Text>
                <Text style={styles.noticeCopy}>
                  {paymentIsSettled
                    ? 'Your payment has been confirmed. Continue to your exit QR code.'
                    : selectedMethodOption?.type === 'card'
                      ? 'Cards stay in-app unless PayMongo or the issuing bank requires a 3DS challenge.'
                      : selectedMethodOption?.type === 'qr'
                        ? 'Generate a dynamic QR Ph code, then scan or save it to pay using your wallet or banking app.'
                        : 'Wallet payments still require an approval step in the provider app, then return here automatically.'}
                </Text>
              </View>

              {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}

              <Pressable
                onPress={() => void handlePay()}
                disabled={isSubmitting || isVerifying}
                style={[styles.payButton, isSubmitting || isVerifying ? styles.payButtonDisabled : null]}
              >
                <Text style={styles.payButtonText}>
                  {paymentIsSettled
                    ? 'Continue to Exit QR'
                    : isSubmitting
                      ? 'Starting Payment...'
                      : qrImageUrl
                        ? 'Regenerate Payment'
                        : `Pay ${formatCurrency(totalAmount)}`}
                </Text>
              </Pressable>

              {pendingPaymentIntentId ? (
                <Pressable
                  onPress={() => void syncPaymentState()}
                  disabled={isSubmitting || isVerifying}
                  style={[styles.secondaryButton, isSubmitting || isVerifying ? styles.secondaryButtonDisabled : null]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isVerifying ? 'Checking Payment...' : 'Check Payment Status'}
                  </Text>
                </Pressable>
              ) : null}

              {qrImageUrl ? (
                <Pressable
                  onPress={() => void saveQrImage()}
                  style={styles.downloadButton}
                >
                  <Download color="#0F766E" size={16} strokeWidth={2.2} />
                  <Text style={styles.downloadButtonText}>Save QR Ph Image</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeeRow({ label, amount }: { label: string; amount: string }) {
  return (
    <View style={styles.feeRow}>
      <Text style={styles.feeLabel}>{label}</Text>
      <Text style={styles.feeAmount}>{amount}</Text>
    </View>
  );
}

function Field({
  children,
  label,
  style,
}: {
  children: React.ReactNode;
  label: string;
  style?: object;
}) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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
  content: {
    gap: 18,
    paddingTop: 20,
  },
  breakdownCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  breakdownHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  breakdownTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  breakdownMeta: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  feeLabel: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
    minWidth: 0,
  },
  feeAmount: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
    flexShrink: 1,
    textAlign: 'right',
  },
  totalBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  totalBannerCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 4,
  },
  totalBannerLabel: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
  },
  totalBannerValue: {
    color: '#0F766E',
    fontSize: 20,
    lineHeight: 25,
    fontFamily: 'Poppins_700Bold',
    flexShrink: 1,
    textAlign: 'right',
  },
  totalBannerValueCompact: {
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'left',
  },
  methodsTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 12,
  },
  methodsStack: {
    gap: 10,
  },
  methodCard: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  methodCardCompact: {
    alignItems: 'flex-start',
    paddingHorizontal: 14,
  },
  methodCardActive: {
    borderColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodIconWrapActive: {
    backgroundColor: '#0F766E',
  },
  methodCopy: {
    flex: 1,
    minWidth: 0,
  },
  methodLabel: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  methodSubLabel: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  methodCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  methodCheckWrapActive: {
    borderColor: '#0F766E',
    backgroundColor: '#0F766E',
  },
  cardPanel: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  cardPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardPanelTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  cardShortcut: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardShortcutText: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  cardPanelCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 4,
  },
  textField: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    color: '#1E293B',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  splitRowCompact: {
    flexDirection: 'column',
  },
  splitField: {
    flex: 1,
  },
  qrPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
    alignItems: 'center',
  },
  qrPanelHeader: {
    width: '100%',
    gap: 4,
  },
  qrPanelTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  qrPanelCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  qrImageWrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  qrImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
  qrHintChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  qrHintText: {
    color: '#1D4ED8',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  noticePanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  noticeTitle: {
    color: '#1D4ED8',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  noticeCopy: {
    color: '#1E3A8A',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  statusMessage: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  payButton: {
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
    marginTop: 4,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 21,
    fontFamily: 'Poppins_500Medium',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  downloadButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadButtonText: {
    color: '#0F766E',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
});
