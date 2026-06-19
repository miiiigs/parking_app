import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { Check, Printer } from 'lucide-react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';
import { formatDateTime, formatDuration } from '../../../utils/format';
import { AppScreenHeader } from '../../auth/components/AuthPrimitives';
import { formatParkingPricingSummary } from '@parking/shared';

function formatCurrency(amount: number) {
  return `PHP ${amount.toFixed(2)}`;
}

export default function ReceiptScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const completedSession = useParkingFlowStore((state) => state.completedSession);
  const hasHydrated = useParkingFlowStore((state) => state.hasHydrated);
  const resetFlow = useParkingFlowStore((state) => state.resetFlow);
  const paymentMethod = useWalkInPreferencesStore((state) => state.paymentMethod);
  const receiptRef = useRef<View>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && !completedSession) {
      router.replace('/home');
    }
  }, [completedSession, hasHydrated, router]);

  if (!hasHydrated || !completedSession) {
    return null;
  }

  const isWalkIn = completedSession.reservationCode.startsWith('WIN-');
  const reservationFee = isWalkIn ? 0 : Number(completedSession.reservationFee ?? 0);
  const totalPaid = completedSession.totalBill + reservationFee;
  const pricingSummary = formatParkingPricingSummary(completedSession.pricingConfig);

  async function saveReceipt() {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setActionMessage(null);

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      const granted = permission.granted || permission.status === 'granted';

      if (!granted) {
        setActionMessage('Permission to save to photos was denied.');
        return;
      }

      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 0.95,
        result: 'tmpfile',
      });

      const asset = await MediaLibrary.createAssetAsync(uri);

      try {
        await MediaLibrary.createAlbumAsync('ParkingReceipts', asset, false);
      } catch {
        // album may already exist
      }

      setActionMessage('Receipt saved to your photos.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to save receipt right now.');
    } finally {
      setIsWorking(false);
    }
  }

  async function handleBackHome() {
    await resetFlow();
    router.replace('/home');
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
              <AppScreenHeader
                title="Official Receipt"
                rightAccessory={
                  <Pressable onPress={() => void saveReceipt()} disabled={isWorking} style={styles.printButton}>
                    <Printer color="#0F766E" size={18} strokeWidth={2.2} />
                  </Pressable>
                }
              />
            </View>

            <View style={styles.content}>
              <View ref={receiptRef} collapsable={false} style={styles.receiptCard}>
                <View style={styles.receiptHero}>
                  <View style={styles.logoBubble}>
                    <Text style={styles.logoBubbleText}>P</Text>
                  </View>
                  <Text style={styles.receiptBrand}>ParkingPH</Text>
                  <Text style={styles.receiptBrandSub}>Official Parking Receipt</Text>
                </View>

                <View style={styles.dashedDivider} />

                <View style={styles.receiptSection}>
                  <View style={styles.metaRow}>
                    <View>
                      <Text style={styles.metaLabel}>RECEIPT NO.</Text>
                      <Text style={styles.metaValue}>{completedSession.receiptNumber}</Text>
                    </View>
                    <View style={styles.metaRight}>
                      <Text style={styles.metaLabel}>DATE & TIME</Text>
                      <Text style={styles.metaDate}>{formatDateTime(completedSession.endTime)}</Text>
                    </View>
                  </View>

                  <ReceiptRow label="Parking Lot" value={completedSession.lotName} />
                  <ReceiptRow label="Slot Number" value={completedSession.slot.number} />
                  <ReceiptRow label="Parking Duration" value={formatDuration(completedSession.durationSeconds)} />
                  <ReceiptRow label="Start Time" value={formatDateTime(completedSession.startTime)} />
                  <ReceiptRow label="End Time" value={formatDateTime(completedSession.endTime)} last />
                </View>

                <View style={styles.dashedDivider} />

                <View style={styles.receiptSection}>
                  <ReceiptAmountRow label="Pricing Model" amount={pricingSummary} />
                  {!isWalkIn ? <ReceiptAmountRow label="Reservation Fee" amount={formatCurrency(reservationFee)} /> : null}
                  <ReceiptAmountRow label={`Parking Fee (${formatDuration(completedSession.durationSeconds)})`} amount={formatCurrency(completedSession.totalBill)} />

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Paid</Text>
                    <Text style={styles.totalValue}>{formatCurrency(totalPaid)}</Text>
                  </View>
                  <View style={styles.paymentMethodRow}>
                    <Text style={styles.paymentMethodLabel}>Payment Method</Text>
                    <Text style={styles.paymentMethodValue}>{paymentMethod ?? 'Mobile payment'}</Text>
                  </View>
                </View>

                <View style={styles.dashedDivider} />

                <View style={styles.footerSection}>
                  <View style={styles.footerCheckBubble}>
                    <Check color="#0F766E" size={15} strokeWidth={2.8} />
                  </View>
                  <Text style={styles.footerCopy}>
                    Thank you for using our parking platform. We hope to serve you again soon.
                  </Text>
                </View>
              </View>

              <Pressable onPress={() => void handleBackHome()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Back to Home</Text>
              </Pressable>

              {actionMessage ? <Text style={styles.actionMessage}>{actionMessage}</Text> : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReceiptRow({
  label,
  last = false,
  value,
}: {
  label: string;
  last?: boolean;
  value: string;
}) {
  return (
    <View style={[styles.receiptRow, !last ? styles.receiptRowBorder : null]}>
      <Text style={styles.receiptRowLabel}>{label}</Text>
      <Text style={styles.receiptRowValue}>{value}</Text>
    </View>
  );
}

function ReceiptAmountRow({ amount, label }: { amount: string; label: string }) {
  return (
    <View style={styles.amountRow}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={styles.amountValue}>{amount}</Text>
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
  header: {},
  printButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: 16,
    paddingTop: 20,
  },
  receiptCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  receiptHero: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#0F766E',
  },
  logoBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoBubbleText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
  },
  receiptBrand: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Poppins_700Bold',
  },
  receiptBrandSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  dashedDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  receiptSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  metaRight: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  metaLabel: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
  },
  metaValue: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
    marginTop: 1,
  },
  metaDate: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 1,
    textAlign: 'right',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
  },
  receiptRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  receiptRowLabel: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  receiptRowValue: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'right',
    flexShrink: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  amountLabel: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  amountValue: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
  },
  totalValue: {
    color: '#0F766E',
    fontSize: 20,
    lineHeight: 25,
    fontFamily: 'Poppins_700Bold',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  paymentMethodLabel: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  paymentMethodValue: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
  },
  footerSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  footerCheckBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  footerCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  primaryButton: {
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
  },
  actionMessage: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
});
