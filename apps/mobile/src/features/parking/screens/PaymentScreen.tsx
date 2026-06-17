import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, CreditCard, Smartphone } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AuthLogo } from '../../auth/components/AuthPrimitives';
import { usePaymentMethodsStore } from '../../menu/store/usePaymentMethodsStore';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { formatDuration } from '../../../utils/format';

type PaymentMethodOption = {
  id: string;
  label: string;
  sublabel: string;
  type: 'card' | 'wallet';
};

function formatCurrency(amount: number) {
  return `PHP ${amount.toFixed(2)}`;
}

export default function PaymentScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const completedSession = useParkingFlowStore((state) => state.completedSession);
  const wallets = usePaymentMethodsStore((state) => state.wallets);
  const cards = usePaymentMethodsStore((state) => state.cards);
  const savedPaymentMethod = useWalkInPreferencesStore((state) => state.paymentMethod);
  const setPaymentMethod = useWalkInPreferencesStore((state) => state.setPaymentMethod);
  const methodOptions = useMemo<PaymentMethodOption[]>(() => {
    const walletOptions = wallets.map((wallet) => ({
      id: wallet.id,
      label: wallet.name,
      sublabel: wallet.detail,
      type: 'wallet' as const,
    }));

    const cardOptions = cards.map((card) => ({
      id: card.id,
      label: card.label,
      sublabel: 'Saved card',
      type: 'card' as const,
    }));

    const combined = [...cardOptions, ...walletOptions];

    if (combined.length > 0) {
      return combined;
    }

    return [
      { id: 'card-fallback', label: 'Credit / Debit Card', sublabel: 'Tap to pay', type: 'card' },
      { id: 'gcash-fallback', label: 'GCash', sublabel: '+63 912 345 6789', type: 'wallet' },
      { id: 'maya-fallback', label: 'Maya', sublabel: '+63 912 345 6789', type: 'wallet' },
    ];
  }, [cards, wallets]);

  const [selectedMethod, setSelectedMethod] = useState<string>(savedPaymentMethod ?? methodOptions[0]?.label ?? '');

  useEffect(() => {
    if (!completedSession) {
      router.replace('/home');
    }
  }, [completedSession, router]);

  useEffect(() => {
    if (!selectedMethod && methodOptions[0]) {
      setSelectedMethod(methodOptions[0].label);
    }
  }, [methodOptions, selectedMethod]);

  if (!completedSession) {
    return null;
  }

  const isWalkIn = completedSession.reservationCode.startsWith('WIN-');
  const reservationFee = isWalkIn ? 0 : Number(completedSession.pricePerHour ?? 0);
  const parkingFee = completedSession.totalBill;
  const totalAmount = reservationFee + parkingFee;

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
                  paddingHorizontal: horizontalPadding,
                },
              ]}
            >
              <View style={styles.headerLeading}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                  <ChevronLeft color="#1E293B" size={20} strokeWidth={2.2} />
                </Pressable>
                <AuthLogo height={28} />
              </View>
              <Text style={styles.headerTitle}>Complete Payment</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownTitle}>Fee Breakdown</Text>
                  <Text style={styles.breakdownMeta}>{formatDuration(completedSession.durationSeconds)}</Text>
                </View>

                <FeeRow label={`Parking Fee (${formatDuration(completedSession.durationSeconds)})`} amount={formatCurrency(parkingFee)} />
                {!isWalkIn ? <FeeRow label="Reservation Fee" amount={formatCurrency(reservationFee)} /> : null}

                <View style={styles.totalBanner}>
                  <Text style={styles.totalBannerLabel}>Total Amount</Text>
                  <Text style={styles.totalBannerValue}>{formatCurrency(totalAmount)}</Text>
                </View>
              </View>

              <View>
                <Text style={styles.methodsTitle}>Payment Method</Text>
                <View style={styles.methodsStack}>
                  {methodOptions.map((method) => {
                    const active = selectedMethod === method.label;
                    const Icon = method.type === 'card' ? CreditCard : Smartphone;

                    return (
                      <Pressable
                        key={`${method.id}-${method.label}`}
                        onPress={() => setSelectedMethod(method.label)}
                        style={[styles.methodCard, active ? styles.methodCardActive : null]}
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

              <Pressable
                onPress={() => {
                  setPaymentMethod(selectedMethod || null);
                  router.replace('/payment-success');
                }}
                style={styles.payButton}
              >
                <Text style={styles.payButtonText}>Pay {formatCurrency(totalAmount)}</Text>
              </Pressable>
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
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 20,
    paddingBottom: 16,
    gap: 14,
  },
  headerLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 18,
    lineHeight: 23,
    fontFamily: 'Poppins_600SemiBold',
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
  },
  feeAmount: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
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
  },
  methodIconWrapActive: {
    backgroundColor: '#0F766E',
  },
  methodCopy: {
    flex: 1,
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
  },
  methodCheckWrapActive: {
    borderColor: '#0F766E',
    backgroundColor: '#0F766E',
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
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 21,
    fontFamily: 'Poppins_500Medium',
  },
});
