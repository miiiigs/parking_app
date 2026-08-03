import { useRouter } from 'expo-router';
import { Clock3, LayoutList, MapPin, Receipt, Timer, Zap } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomNav } from '../../../components/navigation/BottomNav';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AuthLogo } from '../../auth/components/AuthPrimitives';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { formatDateTime, formatDuration } from '../../../utils/format';

type ActivityCard = {
  title: string;
  subtitle: string;
  meta: string;
  kind: 'active' | 'pending' | 'completed';
  onPress: () => void;
  amount?: string | null;
};

function formatPhp(value: number) {
  return `PHP ${value.toFixed(2)}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const booking = useParkingFlowStore((state) => state.booking);
  const session = useParkingFlowStore((state) => state.session);
  const completedSession = useParkingFlowStore((state) => state.completedSession);

  const cards: ActivityCard[] = [];

  if (session) {
    cards.push({
      title: session.lotName,
      subtitle: session.source === 'walk_in' ? 'Walk-in session in progress' : `Slot ${session.slot.number} currently active`,
      meta: `Started ${formatDateTime(session.startTime)}`,
      kind: 'active',
      onPress: () => router.push('/session'),
    });
  }

  if (booking) {
    cards.push({
      title: booking.lotName,
      subtitle: booking.source === 'walk_in' ? 'Park Now entry QR ready' : `Reservation for slot ${booking.slot.number}`,
      meta: booking.expiresAt ? `Valid until ${formatDateTime(booking.expiresAt)}` : `Created ${formatDateTime(booking.createdAt)}`,
      kind: 'pending',
      onPress: () => router.push(booking.source === 'walk_in' ? '/walkin-qr' : '/arrival'),
    });
  }

  if (completedSession) {
    cards.push({
      title: completedSession.lotName,
      subtitle: `Receipt ${completedSession.receiptNumber}`,
      meta: `${formatDuration(completedSession.durationSeconds)} • ${formatDateTime(completedSession.endTime)}`,
      kind: 'completed',
      amount: formatPhp(completedSession.totalBill + (completedSession.reservationCode.startsWith('WIN-') ? 0 : Number(completedSession.reservationFee ?? 0))),
      onPress: () => router.push('/receipt'),
    });
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
                <AuthLogo height={28} />
                <Text style={styles.headerTitle}>History</Text>
                <Text style={styles.headerSubtitle}>Your latest parking activity</Text>
              </View>

              {cards.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <LayoutList color="#94A3B8" size={26} strokeWidth={2} />
                  </View>
                  <Text style={styles.emptyTitle}>No sessions yet</Text>
                  <Text style={styles.emptyCopy}>Completed sessions and active workflow checkpoints will appear here.</Text>
                  <Pressable onPress={() => router.replace('/home')} style={styles.ctaButton}>
                    <Text style={styles.ctaButtonText}>Find Parking</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.list}>
                  {cards.map((card) => (
                    <Pressable key={`${card.kind}-${card.meta}`} onPress={card.onPress} style={styles.card}>
                      <View style={styles.cardTop}>
                        <View style={styles.cardCopy}>
                          <Text style={styles.cardTitle}>{card.title}</Text>
                          <View style={styles.cardRow}>
                            <MapPin color="#94A3B8" size={10} strokeWidth={2.2} />
                            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            card.kind === 'active' ? styles.badgeActive : null,
                            card.kind === 'pending' ? styles.badgePending : null,
                            card.kind === 'completed' ? styles.badgeComplete : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              card.kind === 'active' ? styles.badgeTextActive : null,
                              card.kind === 'pending' ? styles.badgeTextPending : null,
                              card.kind === 'completed' ? styles.badgeTextComplete : null,
                            ]}
                          >
                            {card.kind === 'active' ? 'Active' : card.kind === 'pending' ? 'Pending' : 'Receipt'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardFooter}>
                        <View style={styles.cardMeta}>
                          {card.kind === 'active' ? <Zap color="#0F766E" size={12} strokeWidth={2.2} /> : null}
                          {card.kind === 'pending' ? <Timer color="#B45309" size={12} strokeWidth={2.2} /> : null}
                          {card.kind === 'completed' ? <Clock3 color="#64748B" size={12} strokeWidth={2.2} /> : null}
                          <Text style={styles.cardMetaText}>{card.meta}</Text>
                        </View>

                        {card.amount ? (
                          <View style={styles.amountRow}>
                            <Receipt color="#0F172A" size={12} strokeWidth={2.2} />
                            <Text style={styles.amountText}>{card.amount}</Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <BottomNav activeTab="history" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F9',
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
    borderBottomColor: 'rgba(15,23,42,0.07)',
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Poppins_700Bold',
    marginTop: 14,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  list: {
    gap: 10,
    paddingTop: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  cardSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeActive: {
    backgroundColor: '#F0FDFA',
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
  },
  badgeComplete: {
    backgroundColor: '#F8FAFC',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  badgeTextActive: {
    color: '#0F766E',
  },
  badgeTextPending: {
    color: '#B45309',
  },
  badgeTextComplete: {
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.05)',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  cardMetaText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  amountText: {
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_700Bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyCopy: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  ctaButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
});
