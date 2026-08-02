import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Zap } from 'lucide-react-native';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ParkingDataStatusCard } from '../../../components/parking/ParkingDataStatusCard';
import { FlowScreenHeader, AuthActionButton } from '../../auth/components/AuthPrimitives';
import { getRouteParam } from '../../auth/utils';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { buildWalkInEntryPass } from '@parking/shared';

export default function WalkInQrScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string }>();
  const { contentWidth, horizontalPadding, isCompact } = useResponsiveMetrics();
  const { lots, isLoading, isRefreshing, status, error: dataError, lastSyncedAt, refresh } = useMobileParkingData();
  const booking = useParkingFlowStore((state) => state.booking);
  const issueWalkInEntryPass = useParkingFlowStore((state) => state.issueWalkInEntryPass);
  const refreshSession = useParkingFlowStore((state) => state.refreshSession);
  const vehicle = useWalkInPreferencesStore((state) => state.vehicle);
  const preferredLotId = getRouteParam(params.lotId);
  const preferredLot = lots.find((entry) => entry.id === preferredLotId) ?? lots[0] ?? null;
  const activeWalkInBooking = booking?.source === 'walk_in' ? booking : null;
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [isIssuing, setIsIssuing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issueAttempt, setIssueAttempt] = useState(0);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!vehicle) {
      router.replace('/home');
    }
  }, [router, vehicle]);

  useEffect(() => {
    if (!vehicle || (activeWalkInBooking && activeWalkInBooking.entryPassToken) || isIssuing) {
      return;
    }

    let active = true;

    (async () => {
      try {
        setIsIssuing(true);
        setErrorMessage(null);
        await issueWalkInEntryPass({
          lot: preferredLot ?? undefined,
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
  }, [activeWalkInBooking, isIssuing, issueAttempt, issueWalkInEntryPass, preferredLot, vehicle]);

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
        // Keep silent background polling non-disruptive.
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

  if (isLoading && !preferredLot) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Preparing walk-in QR...</Text>
        <Text style={styles.loadingCopy}>Loading the supported parking locations.</Text>
      </View>
    );
  }

  if (!activeWalkInBooking && (isLoading || isIssuing) && vehicle) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Preparing walk-in QR...</Text>
        <Text style={styles.loadingCopy}>Issuing your backend walk-in access pass.</Text>
      </View>
    );
  }

  if (!activeWalkInBooking && vehicle) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Walk-in QR not available.</Text>
        {errorMessage ? <Text style={styles.loadingCopy}>{errorMessage}</Text> : null}
        <AuthActionButton label="Retry" onPress={() => setIssueAttempt((value) => value + 1)} style={styles.loadingButton} />
        <AuthActionButton label="Back to home" variant="secondary" onPress={() => router.replace('/home')} style={styles.loadingButton} />
      </View>
    );
  }

  if (!activeWalkInBooking || !vehicle) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>{dataError ? 'Unable to load the walk-in QR.' : 'Walk-in QR not available.'}</Text>
        {dataError ? <Text style={styles.loadingCopy}>{dataError}</Text> : null}
        <AuthActionButton label="Retry" onPress={() => void refresh()} style={styles.loadingButton} />
        <AuthActionButton label="Back to home" variant="secondary" onPress={() => router.replace('/home')} style={styles.loadingButton} />
      </View>
    );
  }

  const issuedAt = new Date(activeWalkInBooking.createdAt ?? new Date().toISOString());
  const timeLabel = issuedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateLabel = issuedAt.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const qrValue = activeWalkInBooking.reservationId
    ? buildWalkInEntryPass({
        reservationId: activeWalkInBooking.reservationId,
        entryToken: activeWalkInBooking.entryPassToken ?? null,
      })
    : activeWalkInBooking.reservationCode;
  const isExpired = secondsRemaining <= 0;
  const qrSize = isCompact ? 220 : 256;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingTop: isCompact ? 18 : 22 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentFrame, { maxWidth: contentWidth }]}>
          <FlowScreenHeader title="Entrance Pass" onBack={() => router.back()} />

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
              <Text style={styles.heroTitle}>Universal walk-in access</Text>
              <Text style={styles.heroCopy}>Present this QR at any supported parking lot. The operator will identify your vehicle and confirm entry at the actual location.</Text>
            </View>
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
              <View style={styles.qrFrame}>
                <QRCode value={qrValue} size={qrSize} color="#0F766E" backgroundColor="#FFFFFF" />
              </View>
            </View>

            <View style={styles.ticketSection}>
              <TicketRow label="Access" value="Any supported parking lot" />
              <TicketRow label="Vehicle" value={vehicle.plate} />
              <TicketRow label="Preview lot" value={preferredLot?.name ?? 'Assigned on entry'} />
              <TicketRow label="Billing" value="Metered - paid on exit" />
            </View>
          </View>

          <View style={styles.noticeCardInfo}>
            <MapPin color="#1D4ED8" size={14} strokeWidth={2.2} />
            <Text style={styles.noticeCopyInfo}>
              {isExpired
                ? 'This walk-in pass expired before entry was confirmed.'
                : 'The final rate follows the operator location that confirms your entry.'}
            </Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <Text style={styles.syncHint}>This screen checks for operator or gate confirmation automatically every few seconds.</Text>
        </View>
      </ScrollView>
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
    padding: 10,
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
  noticeCardInfo: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeCopyInfo: {
    flex: 1,
    color: '#1D4ED8',
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
});
