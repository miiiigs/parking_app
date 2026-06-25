import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AuthActionButton } from '../../auth/components/AuthPrimitives';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { formatParkingPricingSummary } from '@parking/shared';
import { formatTime } from '../../../utils/format';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';

type ArrivalStage = 'qr' | 'cancelled';

function formatCurrency(amount: number) {
  return `PHP ${amount.toFixed(2)}`;
}

export default function ArrivalScreen() {
  const router = useRouter();
  const { horizontalPadding, isCompact } = useResponsiveMetrics();
  const booking = useParkingFlowStore((state) => state.booking);
  const session = useParkingFlowStore((state) => state.session);
  const hasHydrated = useParkingFlowStore((state) => state.hasHydrated);
  const refreshSession = useParkingFlowStore((state) => state.refreshSession);
  const cancelReservation = useParkingFlowStore((state) => state.cancelReservation);
  const [stage, setStage] = useState<ArrivalStage>('qr');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && !booking && !session) {
      router.replace('/home');
    }
  }, [booking, hasHydrated, router, session]);

  useEffect(() => {
    if (session) {
      router.replace('/session');
    }
  }, [router, session]);
  const reservation = booking ?? session;

  const entryQrValue = useMemo(() => {
    if (!reservation) {
      return 'parking-entry-unavailable';
    }

    return `reservation-entry|${reservation.reservationId ?? reservation.reservationCode}`;
  }, [reservation]);

  if (!reservation) {
    return null;
  }

  const reservationFee = Number(reservation.reservationFee ?? 0);
  const cancellationCharge = reservationFee / 2;
  const releaseAmount = reservationFee - cancellationCharge;
  const pricingSummary = formatParkingPricingSummary(reservation.pricingConfig);
  const qrSize = isCompact ? 148 : 164;
  const reservationStartTime = formatTime(reservation.createdAt);
  const reservationExpiryTime = reservation.expiresAt
    ? formatTime(reservation.expiresAt)
    : formatTime(new Date(new Date(reservation.createdAt).getTime() + reservation.arrivalWindowMinutes * 60 * 1000).toISOString());

  async function handleRefreshArrival() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const confirmedSession = await refreshSession();
      if (confirmedSession) {
        router.replace('/session');
        return;
      }
      setErrorMessage('Entry has not been confirmed yet. Present this QR to the gate or operator, then check again.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to check the gate confirmation right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelReservation() {
    try {
      setShowCancelModal(false);
      setIsSubmitting(true);
      setErrorMessage(null);
      await cancelReservation();
      setStage('cancelled');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to cancel the reservation right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage === 'cancelled') {
    return (
      <SafeAreaView style={styles.cancelledRoot}>
        <View style={styles.cancelledIcon}>
          <X color="#DC2626" size={32} strokeWidth={2.4} />
        </View>
        <Text style={styles.cancelledTitle}>Reservation Cancelled</Text>
        <Text style={styles.cancelledCopy}>
          Your reservation has been cleared from the mobile flow.
        </Text>
        <View style={styles.cancelledBreakdown}>
          <InfoRow label="Reserved slot" value={reservation.slot.number} />
          <InfoRow label="Rate reference" value={formatParkingPricingSummary(reservation.pricingConfig)} />
          <InfoRow label="Status" value="Released" valueTone="danger" />
        </View>
        <AuthActionButton label="Back to Home" onPress={() => router.replace('/home')} style={styles.fullWidthButton} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.confirmScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.confirmHeader, { paddingHorizontal: horizontalPadding, paddingTop: isCompact ? 20 : 24 }]}>
          <View style={styles.confirmHeaderIcon}>
            <Check color="#FFFFFF" size={24} strokeWidth={2.8} />
          </View>
          <Text style={styles.confirmHeaderTitle}>Reservation Confirmed</Text>
          <Text style={styles.confirmHeaderCopy}>Your slot is secured and your entry pass is ready for gate validation.</Text>
        </View>

        <View style={[styles.confirmContent, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.qrCard}>
            <View style={styles.qrFrame}>
              <QRCode value={entryQrValue} size={qrSize} color="#1E293B" backgroundColor="#FFFFFF" />
            </View>
            <View style={styles.qrCodeBadge}>
              <Text style={styles.qrCodeBadgeText}>{reservation.reservationCode}</Text>
            </View>
            <Text style={styles.qrCaption}>Present this QR at the gate or to the operator so they can confirm your entry.</Text>
          </View>

          <View style={styles.detailCard}>
            <InfoRow label="Parking Lot" value={reservation.lotName} />
            <InfoRow label="Parking Slot" value={reservation.slot.number} />
            <InfoRow label="Reservation Window" value={`${reservation.arrivalWindowMinutes} min`} />
            <InfoRow label="Pricing" value={pricingSummary} />
            <InfoRow label="Start Time" value={reservationStartTime} />
            <InfoRow label="Expiration Time" value={reservationExpiryTime} />
            <InfoRow label="Reservation Fee" value={`${formatCurrency(reservationFee)} held`} valueTone="success" last />
          </View>

          <View style={styles.noticeCardSuccess}>
            <Text style={styles.noticeCopySuccess}>
              No payment is collected here yet. Final billing continues through the mobile session flow.
            </Text>
          </View>

          <View style={styles.noticeCardWarning}>
            <Text style={styles.noticeCopyWarning}>
              After entry is confirmed, your active session begins immediately and uses the lot&apos;s entry grace period while you proceed to your slot.
            </Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <AuthActionButton
            label={isSubmitting ? 'Checking Entry...' : 'Check Gate Confirmation'}
            onPress={() => void handleRefreshArrival()}
            loading={isSubmitting}
          />

          <Pressable onPress={() => setShowCancelModal(true)} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={showCancelModal} onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIcon}>
              <X color="#DC2626" size={24} strokeWidth={2.4} />
            </View>
            <Text style={styles.modalTitle}>Cancel Reservation?</Text>
            <Text style={styles.modalCopy}>
              This will release your reserved slot from the current mobile workflow.
            </Text>

            <View style={styles.modalBreakdown}>
              <InfoRow label="Reference" value={reservation.reservationCode} />
              <InfoRow label="Rate reference" value={pricingSummary} />
              <InfoRow label="Partial hold preview" value={`PHP ${cancellationCharge.toFixed(2)}`} valueTone="danger" />
              <InfoRow label="Release preview" value={`PHP ${releaseAmount.toFixed(2)}`} valueTone="success" />
            </View>

            <View style={styles.modalActions}>
              <AuthActionButton label="Yes, Cancel Reservation" onPress={() => void handleCancelReservation()} />
              <AuthActionButton label="Keep My Reservation" variant="muted" onPress={() => setShowCancelModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  last = false,
  label,
  value,
  valueTone,
}: {
  last?: boolean;
  label: string;
  value: string;
  valueTone?: 'danger' | 'success';
}) {
  return (
    <View style={[styles.infoRow, !last ? styles.infoRowBorder : null]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          valueTone === 'danger' ? styles.infoValueDanger : null,
          valueTone === 'success' ? styles.infoValueSuccess : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 16,
  },
  confirmScroll: {
    paddingBottom: 28,
  },
  confirmContent: {
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  confirmHeader: {
    alignItems: 'center',
    paddingBottom: 18,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  confirmHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmHeaderTitle: {
    color: '#0F766E',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Poppins_700Bold',
  },
  confirmHeaderCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  qrCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  qrFrame: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  qrCodeBadge: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  qrCodeBadgeText: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_700Bold',
  },
  qrCaption: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  detailCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  infoValue: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'right',
  },
  infoValueDanger: {
    color: '#DC2626',
  },
  infoValueSuccess: {
    color: '#16A34A',
  },
  noticeCardSuccess: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    padding: 16,
  },
  noticeCopySuccess: {
    color: '#065F46',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  noticeCardWarning: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    padding: 16,
  },
  noticeCopyWarning: {
    color: '#9A3412',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  fullWidthButton: {
    width: '100%',
  },
  cancelButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  graceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  graceBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graceBannerCopy: {
    flex: 1,
  },
  graceBannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
  },
  graceBannerText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  graceTimerCard: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  graceTimerCardUrgent: {
    borderColor: '#FECACA',
  },
  graceTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  graceTimerLabel: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.6,
  },
  graceTimerLabelUrgent: {
    color: '#DC2626',
  },
  graceTimerValue: {
    color: '#0F766E',
    fontSize: 48,
    lineHeight: 50,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 2,
  },
  graceTimerValueUrgent: {
    color: '#DC2626',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginTop: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  graceTimerCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 12,
  },
  assignedSlotCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  assignedSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 18,
    fontFamily: 'Poppins_700Bold',
  },
  assignedSlotCopy: {
    flex: 1,
  },
  assignedSlotTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  assignedSlotAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  assignedSlotAddress: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  assignedSlotStatus: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  assignedSlotStatusText: {
    color: '#0F766E',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 14,
  },
  warningCopy: {
    flex: 1,
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  footerArea: {
    paddingBottom: 26,
  },
  footerHint: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    marginTop: 10,
    marginHorizontal: 20,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#1E293B',
    fontSize: 19,
    lineHeight: 25,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  modalCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
    marginBottom: 18,
  },
  modalBreakdown: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 18,
  },
  modalActions: {
    gap: 12,
  },
  cancelledRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 24,
  },
  cancelledIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cancelledTitle: {
    color: '#1E293B',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  cancelledCopy: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  cancelledBreakdown: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 24,
  },
});
