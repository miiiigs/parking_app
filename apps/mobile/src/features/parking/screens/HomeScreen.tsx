import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertTriangle,
  CarFront,
  ChevronRight,
  Clock3,
  CreditCard,
  MapPin,
  Menu,
  QrCode,
  Receipt,
  Search,
  Zap,
} from 'lucide-react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useMobileVehicles } from '../../../providers/MobileVehicleProvider';
import { formatDistance } from '../../../utils/format';
import { AuthActionButton, AuthLogo } from '../../auth/components/AuthPrimitives';
import { BottomNav } from '../../../components/navigation/BottomNav';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import type { ParkingLot } from '../types';
import { formatParkingPricingSummary } from '@parking/shared';
import { colors, radius, spacing } from '../../../theme/tokens';

type AuthGateAction = 'park_now' | 'reserve' | 'scan_ticket' | 'reserve_lot';

export default function HomeScreen() {
  const router = useRouter();
  const auth = useMobileAuth();
  const { lots, isLiveData, isLoading, isRefreshing, status, error, lastSyncedAt, refresh } = useMobileParkingData();
  const { selectedVehicle, vehicles } = useMobileVehicles();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const booking = useParkingFlowStore((state) => state.booking);
  const session = useParkingFlowStore((state) => state.session);
  const completedSession = useParkingFlowStore((state) => state.completedSession);
  const pendingPaymentIntentId = useParkingFlowStore((state) => state.pendingPaymentIntentId);
  const isRestoring = useParkingFlowStore((state) => state.isRestoring);
  const [query, setQuery] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<AuthGateAction | null>(null);
  const [pendingLot, setPendingLot] = useState<ParkingLot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredLots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return lots.filter((lot) => {
      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${lot.name} ${lot.address} ${lot.features.join(' ')}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [lots, query]);

  const featuredLot = filteredLots[0] ?? lots[0] ?? null;
  const isGuest = auth.isGuest;
  const requiresAuth = auth.isGuest || (!auth.user && !auth.isLoading);
  const isInitialLoading = isLoading && lots.length === 0;
  const isSyncing = isRestoring || isLoading || isRefreshing;
  const dataStatusLabel = isSyncing ? 'Syncing' : status === 'live' ? 'Live' : status === 'stale' ? 'Offline cache' : 'Demo';
  const lastSyncLabel = lastSyncedAt ? formatLastSyncLabel(lastSyncedAt) : null;
  const displayName = useMemo(() => {
    if (isGuest) {
      return 'Guest';
    }

    const metadataName = auth.user?.user_metadata?.display_name ?? auth.user?.user_metadata?.full_name;
    if (typeof metadataName === 'string' && metadataName.trim()) {
      return metadataName.trim().split(' ')[0] ?? 'Driver';
    }

    if (auth.user?.email) {
      return auth.user.email.split('@')[0];
    }

    return 'Driver';
  }, [auth.user?.email, auth.user?.user_metadata?.display_name, auth.user?.user_metadata?.full_name, isGuest]);
  const greetingLabel = getGreeting();
  const dateLabel = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const paymentNeedsAttention = Boolean(completedSession && completedSession.paymentStatus !== 'paid');
  const exitReady = Boolean(completedSession && completedSession.paymentStatus === 'paid');

  function routeToParkNow() {
    router.push({
      pathname: '/walkin-confirm',
      params: featuredLot ? { lotId: featuredLot.id } : undefined,
    });
  }

  function routeToReserveStart() {
    router.push('/explore');
  }

  function routeToScanTicket() {
    router.push('/scan-ticket');
  }

  function openAuthGate(action: AuthGateAction, lot?: ParkingLot | null) {
    setPendingAction(action);
    setPendingLot(lot ?? null);
    setShowGuestModal(true);
  }

  function handlePrimaryAction(action: AuthGateAction) {
    if (requiresAuth) {
      openAuthGate(action);
      return;
    }

    if (action === 'park_now') {
      routeToParkNow();
      return;
    }

    if (action === 'reserve') {
      routeToReserveStart();
      return;
    }

    routeToScanTicket();
  }

  function handleLotPress(lot: ParkingLot) {
    if (requiresAuth) {
      openAuthGate('reserve_lot', lot);
      return;
    }

    router.push({ pathname: '/reservation/[lotId]', params: { lotId: lot.id } });
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const hero = session
    ? {
        tone: 'teal' as const,
        eyebrow: 'PARKING IN PROGRESS',
        title: 'Resume your parking session',
        body: session.source === 'walk_in'
          ? `You are parked at ${session.lotName}. Open the timer and fee summary anytime.`
          : `Slot ${session.slot.number} at ${session.lotName} is active. Check the timer and running fee.`,
        primaryLabel: 'Open Session',
        onPrimaryPress: () => router.push('/session'),
        secondaryLabel: 'Payment',
        onSecondaryPress: () => router.push('/payment'),
        icon: 'car' as const,
      }
    : booking?.source === 'walk_in'
      ? {
          tone: 'teal' as const,
          eyebrow: 'ENTRY QR READY',
          title: 'Park Now is ready',
          body: 'Show your entry QR at the gate or to the operator to start your session.',
          primaryLabel: 'Open QR',
          onPrimaryPress: () => router.push('/walkin-qr'),
          secondaryLabel: 'Vehicle',
          onSecondaryPress: () => router.push('/edit-vehicle'),
          icon: 'qr' as const,
        }
      : booking
        ? {
            tone: 'blue' as const,
            eyebrow: 'RESERVATION CONFIRMED',
            title: `${booking.slot.number} is being held for you`,
            body: booking.expiresAt
              ? `Arrive before ${formatTimeOnly(booking.expiresAt)} and present your reservation QR at the gate.`
              : 'Your reserved slot is ready. Present your QR at the gate when you arrive.',
            primaryLabel: 'Open Entry QR',
            onPrimaryPress: () => router.push('/arrival'),
            secondaryLabel: 'View Session',
            onSecondaryPress: () => router.push('/session'),
            icon: 'map' as const,
          }
        : paymentNeedsAttention
          ? {
              tone: 'amber' as const,
              eyebrow: pendingPaymentIntentId ? 'PAYMENT IN PROGRESS' : 'PAYMENT NEEDED',
              title: pendingPaymentIntentId ? 'Continue your payment' : 'Complete payment to exit',
              body: pendingPaymentIntentId
                ? 'Your payment was started already. Return to payment to finish and unlock the exit QR.'
                : 'Your parking session is finished. Pay in the app to generate the exit QR.',
              primaryLabel: 'Continue Payment',
              onPrimaryPress: () => router.push('/payment'),
              secondaryLabel: 'Receipt Details',
              onSecondaryPress: () => router.push('/receipt'),
              icon: 'card' as const,
            }
          : exitReady
            ? {
                tone: 'teal' as const,
                eyebrow: 'EXIT QR READY',
                title: 'You can exit now',
                body: 'Your payment is confirmed. Present the exit QR at the gate, then keep the receipt for reference.',
                primaryLabel: 'Open Exit QR',
                onPrimaryPress: () => router.push('/exit'),
                secondaryLabel: 'View Receipt',
                onSecondaryPress: () => router.push('/receipt'),
                icon: 'receipt' as const,
              }
            : completedSession
              ? {
                  tone: 'slate' as const,
                  eyebrow: 'LATEST RECEIPT',
                  title: 'Your last parking trip is saved',
                  body: `Open receipt ${completedSession.receiptNumber} from ${completedSession.lotName}.`,
                  primaryLabel: 'Open Receipt',
                  onPrimaryPress: () => router.push('/receipt'),
                  secondaryLabel: 'History',
                  onSecondaryPress: () => router.push('/history'),
                  icon: 'receipt' as const,
                }
              : {
                  tone: 'slate' as const,
                  eyebrow: 'READY TO PARK',
                  title: 'Choose how you want to start',
                  body: 'Park now, reserve ahead, or claim a paper ticket session and pay in the app.',
                  primaryLabel: '',
                  onPrimaryPress: () => undefined,
                  icon: 'zap' as const,
                };

  const authModalCopy = getAuthModalCopy(pendingAction);
  const authReturnTo = getAuthReturnTo({ action: pendingAction, lot: pendingLot, featuredLot });

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingPage}>
          <View style={styles.loadingHeader}>
            <AuthLogo />
          </View>
          <View style={styles.loadingBody}>
            <ActivityIndicator size="small" color="#0F766E" />
            <Text style={styles.loadingTitle}>Loading parking options</Text>
            <Text style={styles.loadingCopy}>Syncing live parking availability, pricing, and active workflow state.</Text>
          </View>
          <BottomNav activeTab="home" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor="#0F766E" />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
              <View
                style={[
                  styles.headerShell,
                  {
                    marginHorizontal: -horizontalPadding,
                    paddingHorizontal: horizontalPadding,
                  },
                ]}
              >
                <View style={styles.headerTopRow}>
                  <View style={styles.headerBrandRow}>
                    <AuthLogo />
                    {isGuest ? <GuestBadge label="Guest" /> : null}
                  </View>

                  <Pressable onPress={() => router.push('/menu')} style={styles.headerIconButton} hitSlop={8}>
                    <Menu color="#1E293B" size={22} strokeWidth={2.2} />
                  </Pressable>
                </View>

                <View style={styles.greetingBlock}>
                  <Text style={styles.greetingTitle}>{`${greetingLabel}, ${displayName}`}</Text>
                  <Text style={styles.greetingDate}>{dateLabel}</Text>
                </View>
              </View>

              <StatusHero
                tone={hero.tone}
                eyebrow={hero.eyebrow}
                title={hero.title}
                body={hero.body}
                icon={hero.icon}
                primaryLabel={hero.primaryLabel}
                onPrimaryPress={hero.onPrimaryPress}
                secondaryLabel={hero.secondaryLabel}
                onSecondaryPress={hero.onSecondaryPress}
                defaultActions={session || booking || completedSession ? null : (
                  <View style={styles.heroDefaultActionRow}>
                    <HeroShortcut label="Park Now" onPress={() => handlePrimaryAction('park_now')} />
                    <HeroShortcut label="Reserve" onPress={() => handlePrimaryAction('reserve')} />
                    <HeroShortcut label="Scan Ticket" onPress={() => handlePrimaryAction('scan_ticket')} />
                  </View>
                )}
              />

              <Pressable onPress={() => router.push('/edit-vehicle')} style={styles.vehicleCard}>
                <View style={styles.vehicleCardLeading}>
                  <View style={[styles.vehicleIconWrap, selectedVehicle ? styles.vehicleIconWrapActive : styles.vehicleIconWrapMuted]}>
                    <CarFront color={selectedVehicle ? '#FFFFFF' : '#0F766E'} size={18} strokeWidth={2.2} />
                  </View>
                  <View style={styles.vehicleCardCopy}>
                    <Text style={styles.vehicleCardEyebrow}>DEFAULT VEHICLE</Text>
                    <Text style={styles.vehicleCardTitle}>{selectedVehicle ? selectedVehicle.plate : 'Add your vehicle details'}</Text>
                    <Text style={styles.vehicleCardMeta}>
                      {selectedVehicle
                        ? `${selectedVehicle.model} - ${selectedVehicle.color}${vehicles.length > 1 ? ` - ${vehicles.length} saved` : ''}`
                        : 'Save a vehicle once so Park Now and reservations are faster.'}
                    </Text>
                  </View>
                </View>
                <ChevronRight color="#94A3B8" size={18} strokeWidth={2.2} />
              </Pressable>

              <View style={styles.actionSection}>
                <Text style={styles.sectionEyebrow}>START A PARKING TASK</Text>
                <View style={styles.actionStack}>
                  <PrimaryActionCard
                    accentColor="#0F766E"
                    icon="zap"
                    title="Park Now"
                    body="Get an entry QR in seconds for drivers already at the parking facility."
                    ctaLabel="Start Park Now"
                    onPress={() => handlePrimaryAction('park_now')}
                  />
                  <PrimaryActionCard
                    accentColor="#1D4ED8"
                    icon="map"
                    title="Reserve Parking"
                    body="Choose a lot, pick a slot, and secure your arrival window before you leave."
                    ctaLabel="Reserve a Slot"
                    onPress={() => handlePrimaryAction('reserve')}
                  />
                  <PrimaryActionCard
                    accentColor="#D97706"
                    icon="receipt"
                    title="Scan Ticket"
                    body="Claim a paper-ticket parking session and continue payment and exit inside the app."
                    ctaLabel="Open Scan Ticket"
                    onPress={() => handlePrimaryAction('scan_ticket')}
                  />
                </View>
              </View>

              <View style={styles.quickLinksRow}>
                <QuickLinkCard
                  icon="history"
                  label="History"
                  helper="Recent sessions"
                  onPress={() => router.push('/history')}
                />
                <QuickLinkCard
                  icon="card"
                  label="Payments"
                  helper="Methods and checkout"
                  onPress={() => router.push('/payment-methods')}
                />
                <QuickLinkCard
                  icon="support"
                  label="Support"
                  helper="Report an issue"
                  onPress={() => router.push('/contact-support')}
                />
              </View>

              {error ? (
                <View style={styles.syncAlertCard}>
                  <View style={styles.syncAlertHeader}>
                    <AlertTriangle color="#D97706" size={16} strokeWidth={2.2} />
                    <Text style={styles.syncAlertTitle}>Live sync interrupted</Text>
                  </View>
                  <Text style={styles.syncAlertCopy}>
                    {lastSyncLabel ? `Showing the last synced parking data from ${lastSyncLabel}.` : 'We could not refresh parking data right now.'}
                  </Text>
                  <Text style={styles.syncAlertMeta}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.browseSection}>
                <View style={styles.browseHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Browse Nearby Parking</Text>
                    <Text style={styles.resultsCopy}>
                      <Text style={styles.resultsCount}>{filteredLots.length}</Text> {filteredLots.length === 1 ? 'lot' : 'lots'} near you
                    </Text>
                  </View>
                  <View style={styles.browseMeta}>
                    <View
                      style={[
                        styles.dataModeBadge,
                        status === 'live' ? styles.dataModeLive : status === 'stale' ? styles.dataModeStale : styles.dataModeFallback,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dataModeText,
                          status === 'live' ? styles.dataModeTextLive : status === 'stale' ? styles.dataModeTextStale : styles.dataModeTextFallback,
                        ]}
                      >
                        {dataStatusLabel}
                      </Text>
                    </View>
                    <Pressable onPress={() => router.push('/explore')} style={styles.seeAllButton}>
                      <Text style={styles.seeAllText}>See all</Text>
                      <ChevronRight color="#0F766E" size={13} strokeWidth={2.2} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.searchBox}>
                  <Search color="#94A3B8" size={17} strokeWidth={2.2} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search parking locations"
                    placeholderTextColor="#94A3B8"
                    style={styles.searchInput}
                  />
                  {query ? (
                    <Pressable onPress={() => setQuery('')} hitSlop={8}>
                      <Text style={styles.clearSearchText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.listSection}>
                  {filteredLots.slice(0, 4).map((lot) => (
                    <NearbyLotCard key={lot.id} lot={lot} onPress={() => handleLotPress(lot)} />
                  ))}

                  {filteredLots.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>
                        {lots.length === 0 ? (isLiveData ? 'No parking lots available.' : status === 'demo' ? 'Demo parking lots only.' : 'Parking data unavailable.') : 'No parking lots matched.'}
                      </Text>
                      <Text style={styles.emptyCopy}>
                        {lots.length === 0
                          ? error
                            ? 'Pull to refresh when the connection is back.'
                            : isLiveData
                              ? 'No active parking lots are available for this account yet.'
                              : status === 'demo'
                                ? 'Connect the mobile app to Supabase to load the real operator-managed parking lots.'
                                : 'We could not load parking lots right now.'
                          : 'Try a different location name or keyword.'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <BottomNav activeTab="home" />
      </View>

      <Modal animationType="slide" transparent visible={showGuestModal} onRequestClose={() => setShowGuestModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIconWrap}>
              <View style={styles.modalIconBubble}>
                <MapPin color="#F97316" size={24} strokeWidth={2.2} />
              </View>
            </View>

            <Text style={styles.modalTitle}>Sign In Required</Text>
            <Text style={styles.modalCopy}>{authModalCopy}</Text>

            <View style={styles.modalActions}>
              <AuthActionButton
                label="Log In"
                onPress={() => {
                  setShowGuestModal(false);
                  router.push({ pathname: '/login', params: { returnTo: authReturnTo } });
                }}
              />
              <AuthActionButton
                label="Register"
                variant="secondary"
                onPress={() => {
                  setShowGuestModal(false);
                  router.push({ pathname: '/register', params: { returnTo: authReturnTo } });
                }}
              />
              <Pressable onPress={() => setShowGuestModal(false)} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatusHero({
  tone,
  eyebrow,
  title,
  body,
  icon,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  defaultActions,
}: {
  tone: 'teal' | 'blue' | 'amber' | 'slate';
  eyebrow: string;
  title: string;
  body: string;
  icon: 'car' | 'qr' | 'map' | 'card' | 'receipt' | 'zap';
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  defaultActions?: React.ReactNode | null;
}) {
  const toneStyles = getHeroToneStyles(tone);

  return (
    <View style={[styles.heroCard, toneStyles.shell]}>
      <View style={styles.heroTopRow}>
        <View style={[styles.heroIcon, toneStyles.iconWrap]}>
          <HeroIcon name={icon} color={toneStyles.iconColor} />
        </View>
        <View style={styles.heroCopyBlock}>
          <Text style={[styles.heroEyebrow, toneStyles.eyebrow]}>{eyebrow}</Text>
          <Text style={[styles.heroTitle, toneStyles.title]}>{title}</Text>
          <Text style={[styles.heroBody, toneStyles.body]}>{body}</Text>
        </View>
      </View>

      {defaultActions ?? (
        <View style={styles.heroActionRow}>
          {primaryLabel ? (
            <Pressable onPress={onPrimaryPress} style={[styles.heroPrimaryButton, toneStyles.primaryButton]}>
              <Text style={[styles.heroPrimaryButtonText, toneStyles.primaryButtonText]}>{primaryLabel}</Text>
            </Pressable>
          ) : null}
          {secondaryLabel && onSecondaryPress ? (
            <Pressable onPress={onSecondaryPress} style={[styles.heroSecondaryButton, toneStyles.secondaryButton]}>
              <Text style={[styles.heroSecondaryButtonText, toneStyles.secondaryButtonText]}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function HeroShortcut({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.heroShortcutButton}>
      <Text style={styles.heroShortcutText}>{label}</Text>
    </Pressable>
  );
}

function PrimaryActionCard({
  accentColor,
  icon,
  title,
  body,
  ctaLabel,
  onPress,
}: {
  accentColor: string;
  icon: 'zap' | 'map' | 'receipt';
  title: string;
  body: string;
  ctaLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.primaryActionCard}>
      <View style={[styles.primaryActionAccent, { backgroundColor: accentColor }]} />
      <View style={styles.primaryActionContent}>
        <View style={[styles.primaryActionIconWrap, { backgroundColor: `${accentColor}18` }]}>
          <HeroIcon name={icon} color={accentColor} />
        </View>
        <View style={styles.primaryActionCopy}>
          <Text style={styles.primaryActionTitle}>{title}</Text>
          <Text style={styles.primaryActionBody}>{body}</Text>
          <View style={styles.primaryActionFooter}>
            <Text style={[styles.primaryActionCta, { color: accentColor }]}>{ctaLabel}</Text>
            <ChevronRight color={accentColor} size={16} strokeWidth={2.2} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function QuickLinkCard({
  icon,
  label,
  helper,
  onPress,
}: {
  icon: 'history' | 'card' | 'support';
  label: string;
  helper: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickLinkCard}>
      <View style={styles.quickLinkIconWrap}>
        <QuickLinkIcon name={icon} />
      </View>
      <Text style={styles.quickLinkLabel}>{label}</Text>
      <Text style={styles.quickLinkHelper}>{helper}</Text>
    </Pressable>
  );
}

function NearbyLotCard({ lot, onPress }: { lot: ParkingLot; onPress: () => void }) {
  const availabilityColor = getAvailabilityColor(lot.availableSlots, lot.totalSlots);
  const pricingSummary = formatParkingPricingSummary(lot.pricingConfig);

  return (
    <Pressable onPress={onPress} style={styles.lotCard}>
      <View style={styles.lotCardAccent} />
      <View style={styles.lotCardBody}>
        <View style={styles.lotCardTopRow}>
          <View style={styles.lotCardCopy}>
            <Text style={styles.lotCardTitle}>{lot.name}</Text>
            <View style={styles.lotAddressRow}>
              <MapPin color="#94A3B8" size={10} strokeWidth={2.2} />
              <Text style={styles.lotAddress}>{lot.address}</Text>
            </View>
            <Text style={styles.lotMetaText}>
              {pricingSummary} • {formatDistance(lot.distanceKm)}
            </Text>
          </View>

          <View style={styles.availabilityBlock}>
            <Text style={styles.availabilityLabel}>Available</Text>
            <Text style={[styles.availabilityValue, { color: availabilityColor }]}>{lot.availableSlots}</Text>
            <Text style={styles.availabilityMeta}>reserve lots</Text>
          </View>
        </View>

        <View style={styles.lotFooterRow}>
          <Text style={styles.lotFooterText}>Reserve from this lot</Text>
          <ChevronRight color="#94A3B8" size={15} strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}

function GuestBadge({ label }: { label: string }) {
  return (
    <View style={styles.guestBadge}>
      <Text style={styles.guestBadgeText}>{label}</Text>
    </View>
  );
}

function HeroIcon({ name, color }: { name: 'car' | 'qr' | 'map' | 'card' | 'receipt' | 'zap'; color: string }) {
  if (name === 'car') {
    return <CarFront color={color} size={22} strokeWidth={2.2} />;
  }

  if (name === 'qr') {
    return <QrCode color={color} size={22} strokeWidth={2.2} />;
  }

  if (name === 'map') {
    return <MapPin color={color} size={22} strokeWidth={2.2} />;
  }

  if (name === 'card') {
    return <CreditCard color={color} size={22} strokeWidth={2.2} />;
  }

  if (name === 'receipt') {
    return <Receipt color={color} size={22} strokeWidth={2.2} />;
  }

  return <Zap color={color} size={22} strokeWidth={2.2} />;
}

function QuickLinkIcon({ name }: { name: 'history' | 'card' | 'support' }) {
  if (name === 'history') {
    return <Clock3 color="#0F766E" size={18} strokeWidth={2.2} />;
  }

  if (name === 'card') {
    return <CreditCard color="#0F766E" size={18} strokeWidth={2.2} />;
  }

  return <AlertTriangle color="#0F766E" size={18} strokeWidth={2.2} />;
}

function getHeroToneStyles(tone: 'teal' | 'blue' | 'amber' | 'slate') {
  if (tone === 'teal') {
    return {
      shell: styles.heroToneTeal,
      iconWrap: styles.heroToneTealIcon,
      iconColor: '#FFFFFF',
      eyebrow: styles.heroToneLightEyebrow,
      title: styles.heroToneLightTitle,
      body: styles.heroToneLightBody,
      primaryButton: styles.heroToneLightPrimaryButton,
      primaryButtonText: styles.heroToneLightPrimaryButtonText,
      secondaryButton: styles.heroToneLightSecondaryButton,
      secondaryButtonText: styles.heroToneLightSecondaryButtonText,
    };
  }

  if (tone === 'blue') {
    return {
      shell: styles.heroToneBlue,
      iconWrap: styles.heroToneBlueIcon,
      iconColor: '#1D4ED8',
      eyebrow: styles.heroToneDarkEyebrow,
      title: styles.heroToneDarkTitle,
      body: styles.heroToneDarkBody,
      primaryButton: styles.heroToneDarkPrimaryButton,
      primaryButtonText: styles.heroToneDarkPrimaryButtonText,
      secondaryButton: styles.heroToneDarkSecondaryButton,
      secondaryButtonText: styles.heroToneDarkSecondaryButtonText,
    };
  }

  if (tone === 'amber') {
    return {
      shell: styles.heroToneAmber,
      iconWrap: styles.heroToneAmberIcon,
      iconColor: '#B45309',
      eyebrow: styles.heroToneDarkEyebrow,
      title: styles.heroToneDarkTitle,
      body: styles.heroToneDarkBody,
      primaryButton: styles.heroToneAmberPrimaryButton,
      primaryButtonText: styles.heroToneAmberPrimaryButtonText,
      secondaryButton: styles.heroToneDarkSecondaryButton,
      secondaryButtonText: styles.heroToneDarkSecondaryButtonText,
    };
  }

  return {
    shell: styles.heroToneSlate,
    iconWrap: styles.heroToneSlateIcon,
    iconColor: '#0F766E',
    eyebrow: styles.heroToneDarkEyebrow,
    title: styles.heroToneDarkTitle,
    body: styles.heroToneDarkBody,
    primaryButton: styles.heroToneDarkPrimaryButton,
    primaryButtonText: styles.heroToneDarkPrimaryButtonText,
    secondaryButton: styles.heroToneDarkSecondaryButton,
    secondaryButtonText: styles.heroToneDarkSecondaryButtonText,
  };
}

function getAuthModalCopy(action: AuthGateAction | null) {
  if (action === 'park_now') {
    return 'Sign in to generate a secure Park Now QR.';
  }

  if (action === 'scan_ticket') {
    return 'Sign in to claim a paper-ticket session and pay in the app.';
  }

  return 'Sign in to reserve a parking space.';
}

function getAuthReturnTo({
  action,
  lot,
  featuredLot,
}: {
  action: AuthGateAction | null;
  lot: ParkingLot | null;
  featuredLot: ParkingLot | null;
}) {
  if (action === 'park_now') {
    return featuredLot ? `/walkin-confirm?lotId=${featuredLot.id}` : '/walkin-confirm';
  }

  if (action === 'scan_ticket') {
    return '/scan-ticket';
  }

  if (action === 'reserve_lot' && lot) {
    return `/reservation/${lot.id}`;
  }

  return '/explore';
}

function formatLastSyncLabel(value: number) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - value) / 1000));

  if (elapsedSeconds < 60) {
    return 'just now';
  }

  if (elapsedSeconds < 3600) {
    return `${Math.floor(elapsedSeconds / 60)} min ago`;
  }

  return `${Math.floor(elapsedSeconds / 3600)} hr ago`;
}

function formatTimeOnly(value: string) {
  return new Date(value).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getGreeting() {
  const hours = new Date().getHours();

  if (hours < 12) {
    return 'Good morning';
  }

  if (hours < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

function getAvailabilityColor(available: number, total: number) {
  const ratio = total > 0 ? available / total : 0;

  if (ratio > 0.5) {
    return '#16A34A';
  }

  if (ratio > 0.2) {
    return '#D97706';
  }

  return '#DC2626';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  loadingPage: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  loadingHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.canvasMuted,
  },
  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  loadingCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  page: {
    flex: 1,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  maxWidth: {
    width: '100%',
    gap: 16,
    paddingTop: 0,
  },
  headerShell: {
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.canvasMuted,
    gap: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  guestBadgeText: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.05,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingBlock: {
    gap: 4,
  },
  greetingTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.25,
  },
  greetingDate: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: 20,
    gap: 16,
    overflow: 'hidden',
  },
  heroToneTeal: {
    backgroundColor: colors.primaryDark,
  },
  heroToneBlue: {
    backgroundColor: '#F4F1EB',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroToneAmber: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: '#E7D7C1',
  },
  heroToneSlate: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroToneTealIcon: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroToneBlueIcon: {
    backgroundColor: '#EDE7DE',
  },
  heroToneAmberIcon: {
    backgroundColor: '#EFDCC0',
  },
  heroToneSlateIcon: {
    backgroundColor: colors.primarySoft,
  },
  heroCopyBlock: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.6,
  },
  heroToneLightEyebrow: {
    color: 'rgba(255,255,255,0.72)',
  },
  heroToneDarkEyebrow: {
    color: colors.mutedSoft,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontFamily: 'Poppins_700Bold',
  },
  heroToneLightTitle: {
    color: '#FFFFFF',
  },
  heroToneDarkTitle: {
    color: colors.text,
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  heroToneLightBody: {
    color: 'rgba(255,255,255,0.82)',
  },
  heroToneDarkBody: {
    color: colors.muted,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPrimaryButton: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  heroToneLightPrimaryButton: {
    backgroundColor: '#FFFFFF',
  },
  heroToneLightPrimaryButtonText: {
    color: '#0F766E',
  },
  heroToneDarkPrimaryButton: {
    backgroundColor: colors.primaryDark,
  },
  heroToneDarkPrimaryButtonText: {
    color: colors.surface,
  },
  heroToneAmberPrimaryButton: {
    backgroundColor: colors.accent,
  },
  heroToneAmberPrimaryButtonText: {
    color: '#FFFFFF',
  },
  heroPrimaryButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_600SemiBold',
  },
  heroSecondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  heroSecondaryButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  heroToneLightSecondaryButton: {
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroToneLightSecondaryButtonText: {
    color: '#FFFFFF',
  },
  heroToneDarkSecondaryButton: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heroToneDarkSecondaryButtonText: {
    color: colors.muted,
  },
  heroDefaultActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroShortcutButton: {
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroShortcutText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  vehicleCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleCardLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vehicleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconWrapActive: {
    backgroundColor: colors.primary,
  },
  vehicleIconWrapMuted: {
    backgroundColor: colors.primarySoft,
  },
  vehicleCardCopy: {
    flex: 1,
  },
  vehicleCardEyebrow: {
    color: colors.mutedSoft,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
  },
  vehicleCardTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 2,
  },
  vehicleCardMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
  },
  actionSection: {
    gap: 12,
  },
  sectionEyebrow: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.6,
  },
  actionStack: {
    gap: 12,
  },
  primaryActionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  primaryActionAccent: {
    height: 4,
  },
  primaryActionContent: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  primaryActionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionCopy: {
    flex: 1,
  },
  primaryActionTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
  },
  primaryActionBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  primaryActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  primaryActionCta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickLinkCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  quickLinkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLabel: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  quickLinkHelper: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
  },
  syncAlertCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8D9C5',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  syncAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncAlertTitle: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  syncAlertCopy: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
  },
  syncAlertMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  browseSection: {
    gap: 12,
  },
  browseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  resultsCopy: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  resultsCount: {
    color: colors.text,
    fontFamily: 'Poppins_700Bold',
  },
  browseMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_500Medium',
  },
  dataModeBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dataModeLive: {
    backgroundColor: colors.primarySoft,
  },
  dataModeFallback: {
    backgroundColor: colors.surfaceMuted,
  },
  dataModeStale: {
    backgroundColor: colors.accentSoft,
  },
  dataModeText: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.05,
  },
  dataModeTextLive: {
    color: colors.primaryDark,
  },
  dataModeTextFallback: {
    color: colors.accent,
  },
  dataModeTextStale: {
    color: colors.accent,
  },
  searchBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 0,
  },
  clearSearchText: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  listSection: {
    gap: 12,
  },
  lotCard: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  lotCardAccent: {
    height: 4,
    backgroundColor: colors.primary,
  },
  lotCardBody: {
    padding: 16,
    gap: 12,
  },
  lotCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  lotCardCopy: {
    flex: 1,
  },
  lotCardTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_600SemiBold',
  },
  lotAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  lotAddress: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  lotMetaText: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 6,
  },
  availabilityBlock: {
    minWidth: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 1,
  },
  availabilityLabel: {
    color: colors.mutedSoft,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.4,
  },
  availabilityValue: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'Poppins_700Bold',
  },
  availabilityMeta: {
    color: colors.mutedSoft,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Poppins_400Regular',
  },
  lotFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lotFooterText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_500Medium',
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
  },
  viewDetailsButton: {
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  modalIconWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modalIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
    marginBottom: 20,
  },
  modalActions: {
    gap: 12,
  },
  modalCancelButton: {
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
});
