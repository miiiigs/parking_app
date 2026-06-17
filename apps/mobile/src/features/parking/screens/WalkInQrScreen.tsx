import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Car, Clock, Zap } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AuthActionButton, AuthLogo } from '../../auth/components/AuthPrimitives';
import { getRouteParam } from '../../auth/utils';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';

export default function WalkInQrScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string; slotId?: string }>();
  const { lots } = useMobileParkingData();
  const startWalkInSession = useParkingFlowStore((state) => state.startWalkInSession);
  const vehicle = useWalkInPreferencesStore((state) => state.vehicle);
  const lotId = getRouteParam(params.lotId);
  const slotId = getRouteParam(params.slotId);
  const lot = lots.find((entry) => entry.id === lotId) ?? null;
  const slot = lot?.slots.find((entry) => entry.id === slotId) ?? null;
  const issuedAt = useRef(new Date()).current;
  const qrValueRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!lot || !slot || !vehicle) {
      router.replace('/home');
    }
  }, [lot, router, slot, vehicle]);

  useEffect(() => {
    if (!lot || !slot || !vehicle || isStarting || hasStartedRef.current) {
      return;
    }

    const intervalId = setInterval(() => {
      setSecondsRemaining((value) => {
        if (value <= 1) {
          clearInterval(intervalId);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isStarting, lot, slot, vehicle]);

  useEffect(() => {
    if (secondsRemaining > 0 || isStarting || !lot || !slot || !vehicle || hasStartedRef.current) {
      return;
    }

    let active = true;
    hasStartedRef.current = true;

    (async () => {
      try {
        setIsStarting(true);
        setErrorMessage(null);
        await startWalkInSession({
          lot,
          slot,
          plateNumber: vehicle.plate,
        });

        if (active) {
          router.replace('/session');
        }
      } catch (error) {
        if (active) {
          hasStartedRef.current = false;
          setErrorMessage(error instanceof Error ? error.message : 'Unable to start the walk-in session right now.');
        }
      } finally {
        if (active) {
          setIsStarting(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isStarting, lot, router, secondsRemaining, slot, startWalkInSession, vehicle]);

  if (!lot || !slot || !vehicle) {
    return null;
  }

  if (!qrValueRef.current) {
    qrValueRef.current = `walkin|${lot.id}|${slot.id}|${vehicle.plate}|${issuedAt.getTime()}`;
  }

  const timeLabel = issuedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateLabel = issuedAt.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const qrValue = qrValueRef.current;
  const minutesLabel = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
  const secondsLabel = String(secondsRemaining % 60).padStart(2, '0');
  const isUrgent = secondsRemaining <= 120;
  const progressPercent = ((600 - secondsRemaining) / 600) * 100;

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <AuthLogo height={28} />
        <Text style={styles.headerTitle}>Walk-In Entrance Pass</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          <Text style={styles.countdownHint}>Session starts automatically when the timer reaches 00:00.</Text>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <View>
              <Text style={styles.qrHeaderTitle}>Walk-In Entrance QR</Text>
              <Text style={styles.qrHeaderSubtitle}>{dateLabel} - {timeLabel}</Text>
            </View>
            <View style={[styles.qrStatusBadge, styles.qrStatusBadgeScanned]}>
              <Text style={[styles.qrStatusText, styles.qrStatusTextScanned]}>SCANNED</Text>
            </View>
          </View>

          <View style={styles.qrBody}>
            <View style={[styles.qrFrame, styles.qrFrameFaded]}>
              <QRCode value={qrValue} size={160} color="#0F766E" backgroundColor="#FFFFFF" />
            </View>

            <View style={styles.qrIdBadge}>
              <Text style={styles.qrIdText}>WI-{lot.id}-{slot.number}</Text>
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
            <Text style={styles.urgentCopy}>Running low on time. Please park now to avoid losing the walk-in entry window.</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <AuthActionButton
          label={isStarting ? 'Starting session...' : 'I Have Parked'}
          onPress={async () => {
            if (isStarting || hasStartedRef.current) {
              return;
            }

            hasStartedRef.current = true;

            try {
              setIsStarting(true);
              setErrorMessage(null);
              await startWalkInSession({
                lot,
                slot,
                plateNumber: vehicle.plate,
              });
              router.replace('/session');
            } catch (error) {
              hasStartedRef.current = false;
              setErrorMessage(error instanceof Error ? error.message : 'Unable to start the walk-in session right now.');
            } finally {
              setIsStarting(false);
            }
          }}
          loading={isStarting}
          style={styles.fullWidthButton}
        />
        <View style={styles.footerHintRow}>
          <Car color="#94A3B8" size={13} strokeWidth={2.2} />
          <Text style={styles.footerHint}>Session activates automatically when the timer reaches 00:00.</Text>
        </View>
      </View>
    </View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 17,
    lineHeight: 21,
    fontFamily: 'Poppins_600SemiBold',
  },
  headerSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
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
  qrStatusBadgeScanned: {
    backgroundColor: '#34D399',
  },
  qrStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Poppins_700Bold',
  },
  qrStatusTextScanned: {
    color: '#064E3B',
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
  footer: {
    backgroundColor: '#FAFAF9',
    paddingTop: 4,
    paddingBottom: 26,
  },
  fullWidthButton: {
    marginHorizontal: 20,
  },
  footerHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 9,
    marginHorizontal: 20,
  },
  footerHint: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
});
