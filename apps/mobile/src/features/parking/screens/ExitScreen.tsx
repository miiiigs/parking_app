import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Check } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';
import { formatParkingPricingSummary } from '@parking/shared';

function formatCurrency(amount: number) {
  return `PHP ${amount.toFixed(2)}`;
}

export default function ExitScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding, isCompact } = useResponsiveMetrics();
  const completedSession = useParkingFlowStore((state) => state.completedSession);
  const hasHydrated = useParkingFlowStore((state) => state.hasHydrated);
  const paymentMethod = useWalkInPreferencesStore((state) => state.paymentMethod);

  useEffect(() => {
    if (hasHydrated && !completedSession) {
      router.replace('/home');
    }
  }, [completedSession, hasHydrated, router]);

  if (!hasHydrated || !completedSession) {
    return null;
  }

  const isWalkIn = completedSession.reservationCode.startsWith('WIN-');
  const totalPaid = completedSession.totalBill + (isWalkIn ? 0 : Number(completedSession.reservationFee ?? 0));
  const pricingSummary = formatParkingPricingSummary(completedSession.pricingConfig);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
            <View style={[styles.heroHeader, { marginHorizontal: -horizontalPadding }, isCompact ? styles.heroHeaderCompact : null]}>
              <View style={styles.successBubble}>
                <Check color="#FFFFFF" size={30} strokeWidth={2.8} />
              </View>
              <Text style={styles.successTitle}>Payment Successful</Text>
              <Text style={styles.successCopy}>Your parking session is now complete</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.qrCard}>
                <View style={styles.qrFrame}>
                  <QRCode value={completedSession.exitCode} size={isCompact ? 118 : 130} color="#0F766E" backgroundColor="#FFFFFF" />
                </View>

                <View style={styles.exitCodeBadge}>
                  <Text style={styles.exitCodeText}>{completedSession.exitCode}</Text>
                </View>

                <View style={styles.noticeChip}>
                  <Text style={styles.noticeChipText}>Present this QR code at the exit gate.</Text>
                </View>
              </View>

              <View style={styles.ticketCard}>
                <Text style={styles.ticketTitle}>Parking Ticket</Text>
                <TicketRow label="Parking Lot" value={completedSession.lotName} />
                <TicketRow label="Slot Number" value={completedSession.slot.number} />
                <TicketRow label="Pricing Model" value={pricingSummary} />
                <TicketRow label="Payment Method" value={paymentMethod ?? 'Mobile payment'} />
                <TicketRow label="Total Paid" value={formatCurrency(totalPaid)} highlight last />
              </View>

              <Pressable onPress={() => router.replace('/receipt')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>View Receipt</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TicketRow({
  highlight = false,
  label,
  last = false,
  value,
}: {
  highlight?: boolean;
  label: string;
  last?: boolean;
  value: string;
}) {
  return (
    <View style={[styles.ticketRow, !last ? styles.ticketRowBorder : null]}>
      <Text style={styles.ticketLabel}>{label}</Text>
      <Text style={[styles.ticketValue, highlight ? styles.ticketValueHighlight : null]}>{value}</Text>
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
  heroHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#D1FAE5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  heroHeaderCompact: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  successBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    marginBottom: 12,
  },
  successTitle: {
    color: '#0F766E',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  successCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    marginTop: 6,
    textAlign: 'center',
  },
  content: {
    gap: 16,
    paddingTop: 20,
  },
  qrCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    padding: 20,
  },
  qrFrame: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  exitCodeBadge: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  exitCodeText: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  noticeChip: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeChipText: {
    color: '#1D4ED8',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  ticketCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  ticketTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ticketRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  ticketLabel: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
    minWidth: 0,
  },
  ticketValue: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'right',
    flexShrink: 1,
  },
  ticketValueHighlight: {
    color: '#0F766E',
    fontFamily: 'Poppins_700Bold',
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
});
