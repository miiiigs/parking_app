import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Car,
  Clock3,
  MapPin,
  Search,
  Timer,
  X,
} from 'lucide-react-native';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottomNav } from '../../../components/navigation/BottomNav';
import { ParkingDataStatusCard } from '../../../components/parking/ParkingDataStatusCard';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useMobileVehicles } from '../../../providers/MobileVehicleProvider';
import { formatParkingPricingSummary } from '@parking/shared';
import { AuthLogo } from '../../auth/components/AuthPrimitives';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { calculateBill } from '../lib/flow';
import { formatTimer, formatTime } from '../../../utils/format';

function formatCurrency(amount: number) {
  return `PHP ${amount.toFixed(2)}`;
}

export default function SessionScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const { lots, isRefreshing, status, error: dataError, lastSyncedAt, refresh } = useMobileParkingData();
  const { selectedVehicle: savedVehicle } = useMobileVehicles();
  const session = useParkingFlowStore((state) => state.session);
  const finishSession = useParkingFlowStore((state) => state.finishSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [graceRemainingSeconds, setGraceRemainingSeconds] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setElapsedSeconds(0);
      setGraceRemainingSeconds(0);
      return;
    }

    const update = () => {
      const startTime = new Date(session.startTime).getTime();
      const rawElapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const graceSeconds = Math.max(0, session.pricingConfig.entryGraceMinutes) * 60;
      setElapsedSeconds(rawElapsedSeconds);
      setGraceRemainingSeconds(Math.max(0, graceSeconds - rawElapsedSeconds));
    };

    update();
    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, [session]);

  const runningFee = useMemo(() => {
    if (!session) {
      return 0;
    }

    return calculateBill(elapsedSeconds, session.pricingConfig);
  }, [elapsedSeconds, session]);

  const activeElapsedSeconds = useMemo(() => {
    if (!session) {
      return 0;
    }

    const graceSeconds = Math.max(0, session.pricingConfig.entryGraceMinutes) * 60;
    return Math.max(0, elapsedSeconds - graceSeconds);
  }, [elapsedSeconds, session]);

  const isWalkIn = Boolean(session?.reservationCode.startsWith('WIN-'));
  const reservationFee = !session || isWalkIn ? 0 : Number(session.reservationFee ?? 0);
  const estimatedTotal = runningFee + reservationFee;
  const walkInLot = lots[0] ?? null;
  const inEntryGracePeriod = graceRemainingSeconds > 0;
  const pricingSummary = formatParkingPricingSummary(session?.pricingConfig);

  const vehicleTitle = savedVehicle?.model ?? 'Registered vehicle';
  const vehicleSubtitle = savedVehicle
    ? `${savedVehicle.color} - ${savedVehicle.plate}`
    : session
      ? session.plateNumber
      : '';

  async function handleEndSession() {
    if (!session) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await finishSession(elapsedSeconds);
      setShowModal(false);
      router.replace('/payment');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to settle the session right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <View
            style={[
              styles.header,
              {
                paddingHorizontal: horizontalPadding,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <AuthLogo height={28} />
              <Text numberOfLines={1} style={styles.emptyHeaderTitle}>Active Session</Text>
            </View>
          </View>

          <View style={styles.emptyStateWrap}>
            <View style={styles.emptyCircle}>
              <Car color="#A7F3D0" size={44} strokeWidth={1.9} />
            </View>
            <Text style={styles.emptyTitle}>No Active Session</Text>
            <Text style={styles.emptyCopy}>
              You don&apos;t have a parking session in progress. Reserve a slot or use Walk-In Parking to get started.
            </Text>

            <View style={styles.emptyActionGroup}>
              <Pressable onPress={() => router.replace('/home')} style={styles.primaryAction}>
                <Search color="#FFFFFF" size={17} strokeWidth={2.2} />
                <Text style={styles.primaryActionText}>Find Parking</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (walkInLot) {
                    router.push({ pathname: '/walkin-confirm', params: { lotId: walkInLot.id } });
                    return;
                  }
                  router.replace('/home');
                }}
                style={styles.secondaryAction}
              >
                <Car color="#0F766E" size={17} strokeWidth={2.2} />
                <Text style={styles.secondaryActionText}>Walk-In Parking</Text>
              </Pressable>
            </View>
          </View>

          <BottomNav activeTab="session" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
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
                <View style={styles.headerRow}>
                  <AuthLogo height={28} />
                  <View style={styles.headerTitleWrap}>
                    <View style={styles.activeBadgeRow}>
                      <View style={styles.activeDot} />
                      <Text numberOfLines={1} style={styles.activeBadgeText}>ACTIVE SESSION</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.headerTitle}>Active Parking Session</Text>
                  </View>
                </View>
              </View>

              <View style={styles.content}>
                <ParkingDataStatusCard
                  status={status}
                  error={dataError}
                  isRefreshing={isRefreshing}
                  lastSyncedAt={lastSyncedAt}
                  onRetry={() => void refresh()}
                />

                <View style={styles.timerCard}>
                  <Text style={styles.timerEyebrow}>{inEntryGracePeriod ? 'ENTRY GRACE PERIOD' : 'PARKING DURATION'}</Text>
                  <Text style={styles.timerValue}>{formatTimer(inEntryGracePeriod ? graceRemainingSeconds : activeElapsedSeconds)}</Text>
                  <View style={styles.timerMetaRow}>
                    <Clock3 color="rgba(255,255,255,0.7)" size={13} strokeWidth={2.2} />
                    <Text style={styles.timerMetaText}>
                      {inEntryGracePeriod
                        ? `Parking timer starts at ${formatTime(new Date(new Date(session.startTime).getTime() + Math.max(0, session.pricingConfig.entryGraceMinutes) * 60 * 1000).toISOString())}`
                        : `Started at ${formatTime(session.startTime)}`}
                    </Text>
                  </View>
                  <View style={styles.runningFeeChip}>
                    <Text style={styles.runningFeeText}>Running fee: {formatCurrency(runningFee)}</Text>
                  </View>
                  {inEntryGracePeriod ? (
                    <Text style={styles.timerHintText}>
                      Your session is already active. Use this grace period to park before the visible parking timer begins.
                    </Text>
                  ) : null}
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoHeaderRow}>
                    <MapPin color="#0F766E" size={16} strokeWidth={2.2} />
                    <Text style={styles.infoHeaderTitle}>Location</Text>
                  </View>
                  <Text style={styles.infoPrimaryText}>{session.lotName}</Text>
                  <Text style={styles.infoSecondaryText}>{session.address} · Slot {session.slot.number}</Text>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoHeaderRow}>
                    <Car color="#0F766E" size={16} strokeWidth={2.2} />
                    <Text style={styles.infoHeaderTitle}>Vehicle</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <View style={styles.vehicleIconWrap}>
                      <Car color="#0F766E" size={22} strokeWidth={2.2} />
                    </View>
                    <View style={styles.vehicleCopy}>
                      <Text style={styles.vehicleTitle}>{vehicleTitle}</Text>
                      <Text style={styles.vehicleSubtitle}>{vehicleSubtitle}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Fee Summary</Text>
                  <FeeRow label="Pricing model" amount={pricingSummary} />
                  {!isWalkIn ? <FeeRow label="Reservation Fee" amount={formatCurrency(reservationFee)} /> : null}
                  <FeeRow label="Parking Fee (running)" amount={formatCurrency(runningFee)} />
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.summaryTotalLabel}>Estimated Total</Text>
                    <Text style={styles.summaryTotalValue}>{formatCurrency(estimatedTotal)}</Text>
                  </View>
                </View>

                <Text style={styles.rateCopy}>{pricingSummary}</Text>
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <Pressable onPress={() => setShowModal(true)} style={styles.endButton}>
                  <Text style={styles.endButtonText}>End Session & Pay</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>

        <BottomNav activeTab="session" />
      </View>

      <Modal animationType="slide" transparent visible={showModal} onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ready to End Your Session?</Text>
              <Pressable onPress={() => setShowModal(false)} hitSlop={8}>
                <X color="#94A3B8" size={20} strokeWidth={2.3} />
              </Pressable>
            </View>

            <View style={styles.modalNotice}>
              <Text style={styles.modalNoticeText}>
                After ending your session, payment should be completed before exit. Your exit QR will appear on the next screen.
              </Text>
            </View>

            <View style={styles.modalActionGroup}>
              <Pressable onPress={() => void handleEndSession()} disabled={isSubmitting} style={styles.modalPrimaryButton}>
                <Text style={styles.modalPrimaryButtonText}>{isSubmitting ? 'Processing...' : 'Continue'}</Text>
              </Pressable>
              <Pressable onPress={() => setShowModal(false)} disabled={isSubmitting} style={styles.modalSecondaryButton}>
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  activeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  activeBadgeText: {
    color: '#34D399',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_500Medium',
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'right',
  },
  emptyHeaderTitle: {
    color: '#1E293B',
    fontSize: 18,
    lineHeight: 23,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
    textAlign: 'right',
  },
  content: {
    gap: 16,
    paddingTop: 20,
  },
  timerCard: {
    borderRadius: 22,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: '#0F766E',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  timerEyebrow: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.5,
  },
  timerValue: {
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 48,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 2,
    marginTop: 8,
  },
  timerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timerMetaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  timerHintText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  runningFeeChip: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  runningFeeText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoHeaderTitle: {
    color: '#0F766E',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  infoPrimaryText: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_600SemiBold',
  },
  infoSecondaryText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCopy: {
    flex: 1,
  },
  vehicleTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  vehicleSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  summaryTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 10,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    marginTop: 4,
  },
  summaryTotalLabel: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  summaryTotalValue: {
    color: '#0F766E',
    fontSize: 18,
    lineHeight: 23,
    fontFamily: 'Poppins_700Bold',
  },
  rateCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  endButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDFA',
    borderWidth: 2,
    borderColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  emptyCopy: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 32,
  },
  emptyActionGroup: {
    width: '100%',
    gap: 12,
  },
  primaryAction: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F766E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  secondaryAction: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: '#0F766E',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
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
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#1E293B',
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  modalNotice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    padding: 14,
    marginBottom: 18,
  },
  modalNoticeText: {
    color: '#9A3412',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
  },
  modalActionGroup: {
    gap: 12,
  },
  modalPrimaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  modalSecondaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
});
