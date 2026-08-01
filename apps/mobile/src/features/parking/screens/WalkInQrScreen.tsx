import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Car, Clock, Zap } from 'lucide-react-native';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ParkingDataStatusCard } from '../../../components/parking/ParkingDataStatusCard';
import { AppScreenHeader, AuthActionButton } from '../../auth/components/AuthPrimitives';
import { getRouteParam } from '../../auth/utils';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';

export default function WalkInQrScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string; slotId?: string }>();
  const { contentWidth, horizontalPadding, isCompact } = useResponsiveMetrics();
  const { lots, isLoading, isRefreshing, status, error: dataError, lastSyncedAt, refresh } = useMobileParkingData();
  const booking = useParkingFlowStore((state) => state.booking);
  const issueWalkInEntryPass = useParkingFlowStore((state) => state.issueWalkInEntryPass);
  const refreshSession = useParkingFlowStore((state) => state.refreshSession);
  const clearExpiredEntryPass = useParkingFlowStore((state) => state.clearExpiredEntryPass);
  const vehicle = useWalkInPreferencesStore((state) => state.vehicle);
  const lotId = getRouteParam(params.lotId);
  const slotId = getRouteParam(params.slotId);
  const lot = lots.find((entry) => entry.id === lotId) ?? null;
  const slot = lot?.slots.find((entry) => entry.id === slotId) ?? null;
  const activeWalkInBooking =
    booking?.source === 'walk_in' && booking.lotId === lotId && booking.slot.id === slotId
      ? booking
      : null;
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issueAttempt, setIssueAttempt] = useState(0);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if ((!lotId || !slotId) || !vehicle) {
      router.replace('/home');
    }
  }, [lotId, router, slotId, vehicle]);

  useEffect(() => {
    if (!lot || !slot || !vehicle || activeWalkInBooking || isIssuing) {
      return;
    }

    let active = true;

    (async () => {
      try {
        setIsIssuing(true);
        setErrorMessage(null);
        await issueWalkInEntryPass({
          lot,
          slot,
          plateNumber: vehicle.plate,
          holdMinutes: 10,
        });
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to issue the walk-in entry pass right now.');
        }
      } finally {
        if (active) {
          setIsIssuing(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [activeWalkInBooking, isIssuing, issueAttempt, issueWalkInEntryPass, lot, slot, vehicle]);

  useEffect(() => {
    const expiresAt = activeWalkInBooking?.expiresAt;

    if (!expiresAt) {
      return;
    }

    const updateRemaining = () => {
      const nextRemaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(nextRemaining);
      return nextRemaining;
    };

    updateRemaining();
    const intervalId = setInterval(() => {
      const nextRemaining = updateRemaining();
      if (nextRemaining <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeWalkInBooking?.expiresAt]);

  useEffect(() => {
    if (!activeWalkInBooking?.reservationId || isExpiredState(activeWalkInBooking?.expiresAt)) {
      return;
    }

    let active = true;

    const pollForConfirmation = async () => {
      if (!active || isPollingRef.current) {
        return;
      }

      try {
        isPollingRef.current = true;
        const confirmedSession = await refreshSession();
        if (active && confirmedSession) {
          router.replace('/session');
        }
      } catch {
        // Keep silent background polling non-disruptive; manual checks surface errors.
      } finally {
        isPollingRef.current = false;
      }
    };

    const initialTimer = setTimeout(() => {
      void pollForConfirmation();
    }, 1200);
    const intervalId = setInterval(() => {
      void pollForConfirmation();
    }, 5000);

    return () => {
      active = false;
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [activeWalkInBooking?.expiresAt, activeWalkInBooking?.reservationId, refreshSession, router]);

  if ((!lot || !slot) && isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Preparing entrance pass...</Text>
        <Text style={styles.loadingCopy}>Loading the selected parking lot and slot details.</Text>
      </View>
    );
  }

  if (!activeWalkInBooking && (isLoading || isIssuing) && lot && slot && vehicle) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Preparing entrance pass...</Text>
        <Text style={styles.loadingCopy}>Issuing the backend walk-in hold and loading your slot details.</Text>
      </View>
    );
  }

  if (!activeWalkInBooking && lot && slot && vehicle) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Entrance pass not available.</Text>
        {errorMessage ? <Text style={styles.loadingCopy}>{errorMessage}</Text> : null}
        <AuthActionButton label="Retry" onPress={() => setIssueAttempt((value) => value + 1)} style={styles.loadingButton} />
        <AuthActionButton label="Back to home" variant="secondary" onPress={() => router.replace('/home')} style={styles.loadingButton} />
      </View>
    );
  }

  if (!lot || !slot || !vehicle) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>{dataError ? 'Unable to load the entrance pass.' : 'Entrance pass not available.'}</Text>
        {dataError ? <Text style={styles.loadingCopy}>{dataError}</Text> : null}
        <AuthActionButton label="Retry" onPress={() => void refresh()} style={styles.loadingButton} />
        <AuthActionButton label="Back to home" variant="secondary" onPress={() => router.replace('/home')} style={styles.loadingButton} />
      </View>
    );
  }

  const issuedAt = new Date(activeWalkInBooking?.createdAt ?? new Date().toISOString());
  const timeLabel = issuedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateLabel = issuedAt.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const qrValue = activeWalkInBooking?.reservationId
    ? `walkin-entry-pass|${activeWalkInBooking.reservationId}`
    : activeWalkInBooking?.reservationCode ?? `walkin|${lot.id}|${slot.id}|${vehicle.plate}`;
  const minutesLabel = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
  const secondsLabel = String(secondsRemaining % 60).padStart(2, '0');
  const isUrgent = secondsRemaining <= 120;
  const isExpired = secondsRemaining <= 0;
  const progressPercent = ((600 - secondsRemaining) / 600) * 100;
  const qrSize = isCompact ? 144 : 160;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppScreenHeader title="Walk-In Entrance Pass" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingTop: isCompact ? 18 : 22 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentFrame, { maxWidth: contentWidth }]}>
        <ParkingDataStatusCard
          status={status}
          error={dataError}
          isRefreshing={isRefreshing}
          lastSyncedAt={lastSyncedAt}
          onRetry={() => void refresh()}
        />

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Zap color="#FFFFFF" size={22} strokeWidth={2.4} />
          </View>
          <View style={styles.heroCopyBlock}>
            <Text style={styles.heroTitle}>Gate Access Granted</Text>
            <Text style={styles.heroCopy}>Find your selected slot and park your vehicle before the timer runs out.</Text>
          </View>
        </View>

        <View style={[styles.countdownCard, isUrgent ? styles.countdownCardUrgent : null]}>
          <View style={styles.countdownHeader}>
            <Clock color={isUrgent ? '#DC2626' : '#0F766E'} size={15} strokeWidth={2.3} />
            <Text style={[styles.countdownLabel, isUrgent ? styles.countdownLabelUrgent : null]}>TIME TO FIND A SLOT</Text>
          </View>

          <Text style={[styles.countdownValue, isUrgent ? styles.countdownValueUrgent : null]}>
            {minutesLabel}:{secondsLabel}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }, isUrgent ? styles.progressFillUrgent : null]} />
          </View>

          <Text style={styles.countdownHint}>
            {isExpired
              ? 'This entry pass expired before gate entry was confirmed.'
              : 'Present this entry QR at the gate or to the operator before the timer reaches 00:00.'}
          </Text>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <View>
              <Text style={styles.qrHeaderTitle}>Walk-In Entrance QR</Text>
              <Text style={styles.qrHeaderSubtitle}>{dateLabel} - {timeLabel}</Text>
            </View>
            <View style={[styles.qrStatusBadge, isExpired ? styles.qrStatusBadgeExpired : styles.qrStatusBadgeActive]}>
              <Text style={[styles.qrStatusText, isExpired ? styles.qrStatusTextExpired : styles.qrStatusTextActive]}>
                {isExpired ? 'EXPIRED' : 'ENTRY PASS'}
              </Text>
            </View>
          </View>

          <View style={styles.qrBody}>
            <View style={[styles.qrFrame, styles.qrFrameFaded]}>
              <QRCode value={qrValue} size={qrSize} color="#0F766E" backgroundColor="#FFFFFF" />
            </View>

            <View style={styles.qrIdBadge}>
              <Text style={styles.qrIdText}>{activeWalkInBooking?.reservationCode ?? `WI-${lot.id}-${slot.number}`}</Text>
            </View>
          </View>

          <View style={styles.ticketSection}>
            <TicketRow label="Slot" value={`${slot.number} - ${lot.name}`} />
            <TicketRow label="Plate" value={vehicle.plate} />
            <TicketRow label="Billing" value="Metered - paid on exit" />
          </View>
        </View>

        {isUrgent ? (
          <View style={styles.urgentCard}>
            <AlertTriangle color="#DC2626" size={14} strokeWidth={2.3} />
            <Text style={styles.urgentCopy}>Running low on time. Enter the lot now to avoid losing the walk-in entry window.</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <Text style={styles.syncHint}>This screen checks for operator or gate confirmation automatically every few seconds.</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: horizontalPadding, paddingTop: isCompact ? 14 : 18 }]}>
        <AuthActionButton
          label={isExpired ? 'Entry Pass Expired' : isStarting ? 'Checking Entry...' : 'Check Gate Confirmation'}
          onPress={async () => {
            if (isExpired) {
              await clearExpiredEntryPass();
              router.replace('/home');
              return;
            }

            if (isStarting || isIssuing) {
              return;
            }

            try {
              setIsStarting(true);
              setErrorMessage(null);
              const confirmedSession = await refreshSession();
              if (confirmedSession) {
                router.replace('/session');
                return;
              }
              setErrorMessage('Entry has not been confirmed yet. Present this QR to the gate or operator, then check again.');
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : 'Unable to check the gate confirmation right now.');
            } finally {
              setIsStarting(false);
            }
          }}
          disabled={isIssuing || isStarting}
          loading={isIssuing || isStarting}
          style={styles.fullWidthButton}
        />
        <View style={styles.footerHintRow}>
          <Car color="#94A3B8" size={13} strokeWidth={2.2} />
          <Text style={styles.footerHint}>
            {isExpired
              ? 'Request a new walk-in entry pass to resume.'
              : 'Your parking session begins after the gate or operator confirms this entry pass.'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.ticketRow}>
      <Text style={styles.ticketLabel}>{label}</Text>
      <Text style={styles.ticketValue}>{value}</Text>
    </View>
  );
}

function isExpiredState(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {},
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 24,
  },
  loadingTitle: {
    color: '#1E293B',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  loadingCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  loadingButton: {
    alignSelf: 'stretch',
  },
  scrollContent: {
    paddingTop: 22,
    paddingBottom: 24,
    gap: 16,
  },
  contentFrame: {
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopyBlock: {
    flex: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  countdownCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  countdownCardUrgent: {
    borderColor: '#FECACA',
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  countdownLabel: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
  countdownLabelUrgent: {
    color: '#DC2626',
  },
  countdownValue: {
    color: '#0F766E',
    fontSize: 48,
    lineHeight: 52,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 2.6,
    marginTop: 12,
  },
  countdownValueUrgent: {
    color: '#DC2626',
  },
  qrCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  qrHeaderTitle: {
    color: '#0F766E',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_700Bold',
  },
  qrHeaderSubtitle: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  qrStatusBadge: {
    borderRadius: 8,
    backgroundColor: '#0F766E',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qrStatusBadgeActive: {
    backgroundColor: '#34D399',
  },
  qrStatusBadgeExpired: {
    backgroundColor: '#FECACA',
  },
  qrStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Poppins_700Bold',
  },
  qrStatusTextActive: {
    color: '#064E3B',
  },
  qrStatusTextExpired: {
    color: '#B91C1C',
  },
  qrBody: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  qrFrame: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAF9',
    padding: 14,
  },
  qrFrameFaded: {
    opacity: 0.42,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#0F766E',
  },
  progressFillUrgent: {
    backgroundColor: '#EF4444',
  },
  countdownHint: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 12,
  },
  qrIdBadge: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  qrIdText: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.4,
  },
  ticketSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
  },
  ticketLabel: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  ticketValue: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'right',
    flex: 1,
  },
  urgentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  urgentCopy: {
    flex: 1,
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  syncHint: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#FAFAF9',
    paddingTop: 4,
    paddingBottom: 26,
  },
  fullWidthButton: {
    width: '100%',
  },
  footerHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 9,
  },
  footerHint: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
});
