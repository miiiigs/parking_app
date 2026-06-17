import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  CarFront,
  ChevronDown,
  ChevronLeft,
  Check,
  Clock3,
  CreditCard,
  MapPin,
  X,
  Zap,
} from 'lucide-react-native';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ParkingLotLayoutMap } from '../../../components/parking/ParkingLotLayoutMap';
import { ParkingMap } from '../../../components/parking/ParkingMap';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { calculateParkingCharge, formatParkingPricingSummary } from '@parking/shared';
import { getRouteParam } from '../../auth/utils';
import { AuthActionButton, AuthLogo } from '../../auth/components/AuthPrimitives';
import { usePaymentMethodsStore } from '../../menu/store/usePaymentMethodsStore';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import { useWalkInPreferencesStore } from '../store/useWalkInPreferencesStore';
import type { ParkingLot, ParkingSlot } from '../types';

type ReservationMode = 'reserve' | 'walkin';

const arrivalWindows = [30, 60, 120];
const SHEET_COLLAPSED_HEIGHT = 126;
const SHEET_EXPANDED_HEIGHT_RESERVE = 360;
const SHEET_EXPANDED_HEIGHT_RESERVE_GUEST = 412;
const SHEET_EXPANDED_HEIGHT_WALKIN = 472;

function animateSheetTo(value: Animated.Value, nextValue: number) {
  Animated.spring(value, {
    toValue: nextValue,
    useNativeDriver: true,
    damping: 22,
    stiffness: 210,
    mass: 0.92,
  }).start();
}

export default function ReservationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string; mode?: string }>();
  const auth = useMobileAuth();
  const { lots, isLoading } = useMobileParkingData();
  const storedPaymentMethod = useWalkInPreferencesStore((state) => state.paymentMethod);
  const storedVehicle = useWalkInPreferencesStore((state) => state.vehicle);
  const setPaymentMethod = useWalkInPreferencesStore((state) => state.setPaymentMethod);
  const wallets = usePaymentMethodsStore((state) => state.wallets);
  const cards = usePaymentMethodsStore((state) => state.cards);
  const reserveSlot = useParkingFlowStore((state) => state.reserveSlot);
  const reservationDraft = useParkingFlowStore((state) => state.reservationDraft);
  const setReservationDraft = useParkingFlowStore((state) => state.setReservationDraft);
  const clearReservationDraft = useParkingFlowStore((state) => state.clearReservationDraft);
  const [mode, setMode] = useState<ReservationMode>(getRouteParam(params.mode) === 'walkin' ? 'walkin' : 'reserve');
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [arrivalWindowMinutes, setArrivalWindowMinutes] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const lot = lots.find((entry) => entry.id === String(params.lotId ?? '')) ?? lots[0] ?? null;
  const lotId = lot?.id ?? null;
  const selectedSlotId = selectedSlot?.id ?? null;
  const normalizedPlateNumber = (storedVehicle?.plate ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const requiresAuth = !auth.user || auth.isGuest;
  const currentExpandedHeight =
    mode === 'reserve'
      ? requiresAuth
        ? SHEET_EXPANDED_HEIGHT_RESERVE_GUEST
        : SHEET_EXPANDED_HEIGHT_RESERVE
      : SHEET_EXPANDED_HEIGHT_WALKIN;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_EXPANDED_HEIGHT_WALKIN)).current;
  const sheetStartOffset = useRef(SHEET_EXPANDED_HEIGHT_WALKIN);
  const hydratedScreenKeyRef = useRef<string | null>(null);
  const sheetVisible = Boolean(selectedSlot);
  const collapsedOffset = Math.max(0, currentExpandedHeight - SHEET_COLLAPSED_HEIGHT);
  const slotStatusLabel = selectedSlot?.status === 'available' || selectedSlot?.isAvailable ? 'Open now' : 'Unavailable';
  const hourlyRateLabel = useMemo(() => (lot ? formatParkingPricingSummary(lot.pricingConfig) : 'PHP 0/hr'), [lot]);
  const displayHours = useMemo(() => getHoursLabel(lot), [lot]);
  const arrivalWindowOptions = useMemo(
    () =>
      arrivalWindows.map((minutes) => ({
        minutes,
        label: minutes === 30 ? '30 min' : minutes === 60 ? '1 Hour' : '2 Hours',
        fee: lot ? calculateParkingCharge(minutes * 60, lot.pricingConfig).amount : 0,
      })),
    [lot],
  );
  const selectedWindowOption = arrivalWindowOptions.find((option) => option.minutes === arrivalWindowMinutes) ?? arrivalWindowOptions[1];
  const paymentOptions = useMemo(() => {
    const cardOptions = cards.map((card) => ({
      id: `card-${card.id}`,
      label: `${card.type} **** ${card.last4}`,
      detail: 'Saved card',
    }));
    const walletOptions = wallets
      .filter((wallet) => wallet.linked)
      .map((wallet) => ({
        id: `wallet-${wallet.id}`,
        label: wallet.name,
        detail: wallet.detail,
      }));
    const fallbackOptions = ['Credit / Debit Card', 'GCash', 'Maya']
      .filter((label) => ![...cardOptions, ...walletOptions].some((option) => option.label === label))
      .map((label) => ({
        id: `fallback-${label}`,
        label,
        detail: 'Select as default',
      }));

    return [...cardOptions, ...walletOptions, ...fallbackOptions];
  }, [cards, wallets]);

  const clearSelectedSlot = () => {
    setErrorMessage(null);
    setSelectedSlot(null);
    if (mode === 'reserve' && lotId) {
      setReservationDraft({
        lotId,
        slotId: null,
        arrivalWindowMinutes,
        plateNumber: normalizedPlateNumber,
      });
    }
  };

  useEffect(() => {
    if (!lotId) {
      return;
    }

    const screenKey = `${mode}:${lotId}`;
    if (hydratedScreenKeyRef.current === screenKey) {
      return;
    }

    hydratedScreenKeyRef.current = screenKey;

    if (mode === 'reserve' && reservationDraft?.lotId === lotId && lot) {
      const draftSlot = reservationDraft.slotId
        ? lot.slots.find((slot) => slot.id === reservationDraft.slotId) ?? null
        : null;

      setArrivalWindowMinutes(reservationDraft.arrivalWindowMinutes);
      setSelectedSlot(draftSlot);
      return;
    }

    setSelectedSlot(null);
    setArrivalWindowMinutes(60);

    if (mode === 'reserve' && reservationDraft && reservationDraft.lotId !== lotId) {
      clearReservationDraft();
    }
  }, [lot, lotId, mode, reservationDraft]);

  useEffect(() => {
    if (!selectedSlotId) {
      if (!sheetExpanded) {
        setSheetExpanded(true);
      }

      animateSheetTo(sheetTranslateY, currentExpandedHeight);
      return;
    }

    if (!sheetExpanded) {
      setSheetExpanded(true);
    }

    animateSheetTo(sheetTranslateY, 0);
  }, [currentExpandedHeight, selectedSlotId, sheetExpanded, sheetTranslateY]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => sheetVisible,
        onMoveShouldSetPanResponder: (_, gestureState) => sheetVisible && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          sheetStartOffset.current = (sheetTranslateY as unknown as { __getValue: () => number }).__getValue();
        },
        onPanResponderMove: (_, gestureState) => {
          const nextValue = Math.min(collapsedOffset, Math.max(0, sheetStartOffset.current + gestureState.dy));
          sheetTranslateY.setValue(nextValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentValue = (sheetTranslateY as unknown as { __getValue: () => number }).__getValue();
          const shouldCollapse = gestureState.dy > 36 || currentValue > collapsedOffset / 2;
          const nextValue = shouldCollapse ? collapsedOffset : 0;
          setSheetExpanded(!shouldCollapse);
          animateSheetTo(sheetTranslateY, nextValue);
        },
      }),
    [collapsedOffset, sheetTranslateY, sheetVisible],
  );

  if (!lot && isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Loading parking lot...</Text>
      </View>
    );
  }

  if (!lot) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingTitle}>Parking lot not found.</Text>
        <AuthActionButton label="Back to home" onPress={() => router.replace('/home')} style={styles.loadingButton} />
      </View>
    );
  }

  const handleConfirmReservation = async () => {
    if (!selectedSlot || normalizedPlateNumber.length < 5) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await reserveSlot({ lot, slot: selectedSlot, arrivalWindowMinutes, plateNumber: normalizedPlateNumber });
      await clearReservationDraft();
      router.replace('/arrival');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create the reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          animation: 'none',
          gestureEnabled: true,
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => router.replace('/home')} style={styles.backButton}>
            <ChevronLeft color="#1E293B" size={20} strokeWidth={2.2} />
          </Pressable>
          <AuthLogo />
          <View style={styles.headerTitleBlock}>
            <Text numberOfLines={1} style={styles.headerTitle}>{lot.name}</Text>
            <View style={styles.headerAddressRow}>
              <MapPin color="#94A3B8" size={9} strokeWidth={2.2} />
              <Text numberOfLines={1} style={styles.headerAddress}>{lot.address}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.modeTabsSection}>
        <View style={styles.modeTabsShell}>
          <Pressable
            onPress={() => {
              setMode('reserve');
              clearSelectedSlot();
              setErrorMessage(null);
            }}
            style={[styles.modeTab, mode === 'reserve' ? styles.modeTabActive : null]}
          >
            <Text style={[styles.modeTabText, mode === 'reserve' ? styles.modeTabTextActive : null]}>Reserve in Advance</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (reservationDraft !== null) {
                clearReservationDraft();
              }
              router.push({
                pathname: '/walkin-confirm',
                params: {
                  lotId: lot.id,
                  ...(selectedSlot ? { slotId: selectedSlot.id } : {}),
                },
              });
            }}
            style={[styles.modeTab, mode === 'walkin' ? styles.modeTabActive : null]}
          >
            <Zap color={mode === 'walkin' ? '#0F766E' : '#64748B'} size={12} strokeWidth={2.3} />
            <Text style={[styles.modeTabText, mode === 'walkin' ? styles.modeTabTextActive : null]}>Walk-In Parking</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsShell}>
          <View style={styles.statsRow}>
            <StatBlock label="Total Slots" value={String(lot.totalSlots)} />
            <StatBlock label="Available" value={String(lot.availableSlots)} valueColor="#16A34A" />
          </View>
          <View style={styles.hoursRow}>
            <Clock3 color="#64748B" size={12} strokeWidth={2.2} />
            <Text style={styles.hoursText}>
              <Text style={styles.hoursLabel}>Hours: </Text>
              {displayHours}
            </Text>
          </View>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.legendRow}>
            <LegendChip label="available" tone="available" />
            <LegendChip label="occupied" tone="occupied" />
            <LegendChip label="reserved" tone="reserved" />
          </View>

          <View style={styles.mapShell}>
            {lot.lotLayout ? (
              <ParkingLotLayoutMap
                style={styles.mapViewport}
                lot={lot.lotLayout}
                slots={lot.slots.map((slot, index) => ({
                  id: slot.id,
                  label: slot.number,
                  status: slot.status ?? (slot.isAvailable ? 'available' : 'occupied'),
                  displayOrder: index + 1,
                }))}
                selectedSlotId={selectedSlotId}
                onSelectSlot={(slotId) => {
                  const nextSlot = lot.slots.find((slot) => slot.id === slotId) ?? null;
                  setErrorMessage(null);
                  const nextSelectedSlot = nextSlot && nextSlot.isAvailable ? nextSlot : null;
                  setSelectedSlot(nextSelectedSlot);
                  if (mode === 'reserve' && lotId) {
                    setReservationDraft({
                      lotId,
                      slotId: nextSelectedSlot?.id ?? null,
                      arrivalWindowMinutes,
                      plateNumber: normalizedPlateNumber,
                    });
                  }
                }}
              />
            ) : (
              <View style={styles.fallbackMapFrame}>
                <ParkingMap
                  slots={lot.slots}
                  selectedSlotId={selectedSlotId ?? undefined}
                  onSelectSlot={(slot) => {
                    setErrorMessage(null);
                    const nextSelectedSlot = slot?.isAvailable ? slot : null;
                    setSelectedSlot(nextSelectedSlot);
                    if (mode === 'reserve' && lotId) {
                      setReservationDraft({
                        lotId,
                        slotId: nextSelectedSlot?.id ?? null,
                        arrivalWindowMinutes,
                        plateNumber: normalizedPlateNumber,
                      });
                    }
                  }}
                />
              </View>
            )}

            {!selectedSlot ? (
              <View style={styles.mapHint}>
                <Text style={styles.mapHintText}>Tap an available slot to continue.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {selectedSlot ? (
        <Animated.View style={[styles.bottomSheet, { height: currentExpandedHeight, transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.sheetHeaderZone} {...sheetPanResponder.panHandlers}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Pressable
                style={styles.sheetSummaryRow}
                onPress={() => {
                  const nextExpanded = !sheetExpanded;
                  setSheetExpanded(nextExpanded);
                  animateSheetTo(sheetTranslateY, nextExpanded ? 0 : collapsedOffset);
                }}
              >
                <View>
                  <Text style={styles.sheetEyebrow}>Selected Slot</Text>
                  <View style={styles.sheetSlotRow}>
                    <Text style={styles.sheetSlotTitle}>{selectedSlot.number}</Text>
                    {mode === 'walkin' ? (
                      <View style={styles.walkInBadge}>
                        <Zap color="#0F766E" size={10} strokeWidth={2.3} />
                        <Text style={styles.walkInBadgeText}>Walk-In</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.sheetMetaBlock}>
                  <Text style={styles.sheetMeta}>{slotStatusLabel}</Text>
                  <ChevronDown color="#64748B" size={18} strokeWidth={2.2} style={{ transform: [{ rotate: sheetExpanded ? '0deg' : '180deg' }] }} />
                </View>
              </Pressable>

              <Pressable hitSlop={8} onPress={clearSelectedSlot} style={styles.sheetCloseButton}>
                <X color="#64748B" size={18} strokeWidth={2.3} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.selectorGrid}>
              <Pressable
                onPress={() => setShowPaymentSheet(true)}
                style={[
                  styles.selectorSummaryCard,
                  storedPaymentMethod ? styles.selectorSummaryCardActive : styles.selectorSummaryCardWarning,
                ]}
              >
                <View style={styles.selectorSummaryLeading}>
                  <View
                    style={[
                      styles.selectorSummaryIconWrap,
                      storedPaymentMethod ? styles.selectorSummaryIconWrapActive : styles.selectorSummaryIconWrapWarning,
                    ]}
                  >
                    <CreditCard color={storedPaymentMethod ? '#0F766E' : '#F97316'} size={15} strokeWidth={2.2} />
                  </View>
                  <View style={styles.selectorSummaryCopy}>
                    <Text style={styles.selectorSummaryLabel}>Payment</Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.selectorSummaryValue,
                        storedPaymentMethod ? styles.selectorSummaryValueActive : styles.selectorSummaryValueWarning,
                      ]}
                    >
                      {storedPaymentMethod ?? 'Tap to set'}
                    </Text>
                  </View>
                </View>
                <ChevronDown color="#94A3B8" size={16} strokeWidth={2.2} />
              </Pressable>

              <Pressable onPress={() => router.push('/edit-vehicle')} style={[styles.selectorSummaryCard, styles.selectorSummaryCardActive]}>
                <View style={styles.selectorSummaryLeading}>
                  <View style={[styles.selectorSummaryIconWrap, styles.selectorSummaryIconWrapActive]}>
                    <CarFront color="#0F766E" size={15} strokeWidth={2.2} />
                  </View>
                  <View style={styles.selectorSummaryCopy}>
                    <Text style={styles.selectorSummaryLabel}>Vehicle</Text>
                    <Text numberOfLines={1} style={styles.selectorSummaryValueActive}>
                      {storedVehicle ? storedVehicle.plate : 'Add vehicle'}
                    </Text>
                  </View>
                </View>
                <ChevronDown color="#94A3B8" size={16} strokeWidth={2.2} />
              </Pressable>
            </View>

            {mode === 'walkin' ? (
              <View style={styles.walkInRateCard}>
                <Text style={styles.walkInRateLabel}>Parking Rate</Text>
                <Text style={styles.walkInRateValue}>{hourlyRateLabel}</Text>
                <View style={styles.walkInRateDivider} />
                <View style={styles.walkInRateRow}>
                  <Text style={styles.walkInRateTitle}>Billed on exit</Text>
                  <Text style={styles.walkInRateMeta}>Metered billing</Text>
                </View>
              </View>
            ) : null}

            {mode === 'reserve' ? (
              <>
                <Text style={styles.sectionEyebrow}>RESERVATION WINDOW</Text>
                <View style={styles.windowGrid}>
                  {arrivalWindows.map((minutes) => {
                    const active = arrivalWindowMinutes === minutes;
                    const label = minutes === 30 ? '30 min' : minutes === 60 ? '1 Hour' : '2 Hours';
                    return (
                      <Pressable
                        key={minutes}
                        onPress={() => {
                          setArrivalWindowMinutes(minutes);
                          if (mode === 'reserve' && lotId) {
                            setReservationDraft({
                              lotId,
                              slotId: selectedSlot?.id ?? null,
                              arrivalWindowMinutes: minutes,
                              plateNumber: normalizedPlateNumber,
                            });
                          }
                        }}
                        style={[styles.windowChip, active ? styles.windowChipActive : null]}
                      >
                        <Text style={[styles.windowChipTitle, active ? styles.windowChipTitleActive : null]}>{label}</Text>
                        <Text style={[styles.windowChipSubtitle, active ? styles.windowChipSubtitleActive : null]}>
                          PHP {arrivalWindowOptions.find((option) => option.minutes === minutes)?.fee.toFixed(2) ?? '0.00'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.walkInInfoCard}>
                <CreditCard color="#0F766E" size={16} strokeWidth={2.2} style={{ marginTop: 1 }} />
                <View style={styles.walkInInfoCopy}>
                  <Text style={styles.walkInInfoTitle}>Metered billing</Text>
                  <Text style={styles.walkInInfoText}>
                    Continue to confirm payment method and vehicle details, then generate your entrance QR.
                  </Text>
                </View>
              </View>
            )}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            {requiresAuth ? (
              <>
                <AuthActionButton
                  label="Log in or sign up"
                  onPress={() => router.push({ pathname: '/auth', params: { returnTo: `/reservation/${lot.id}` } })}
                />
                <Text style={styles.guestNotice}>
                  Guest mode can browse availability, but {mode === 'walkin' ? 'walk-in entry' : 'slot reservation'} needs a signed-in account.
                </Text>
              </>
            ) : mode === 'reserve' ? (
              <AuthActionButton
                label={`Reserve Slot - PHP ${selectedWindowOption?.fee.toFixed(2) ?? '0.00'}`}
                onPress={() => void handleConfirmReservation()}
                disabled={!selectedSlot || normalizedPlateNumber.length < 5}
                loading={isSubmitting}
              />
            ) : (
              <AuthActionButton
                label="Continue to Walk-In"
                onPress={() =>
                  router.push({
                    pathname: '/walkin-confirm',
                    params: {
                      lotId: lot.id,
                      slotId: selectedSlot.id,
                    },
                  })
                }
                disabled={!selectedSlot}
              />
            )}
          </ScrollView>
        </Animated.View>
      ) : null}

      <Modal animationType="slide" transparent visible={showPaymentSheet} onRequestClose={() => setShowPaymentSheet(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={() => setShowPaymentSheet(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Payment Method</Text>
            <View style={styles.modalOptionList}>
              {paymentOptions.map((option) => {
                const active = storedPaymentMethod === option.label;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      setPaymentMethod(option.label);
                      setShowPaymentSheet(false);
                    }}
                    style={[styles.modalOptionCard, active ? styles.modalOptionCardActive : null]}
                  >
                    <View style={styles.modalOptionCopy}>
                      <Text style={[styles.modalOptionTitle, active ? styles.modalOptionTitleActive : null]}>{option.label}</Text>
                      <Text style={styles.modalOptionDetail}>{option.detail}</Text>
                    </View>
                    {active ? (
                      <View style={styles.modalCheckBadge}>
                        <Check color="#FFFFFF" size={12} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatBlock({ label, value, valueColor = '#1E293B' }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LegendChip({ label, tone }: { label: string; tone: 'available' | 'occupied' | 'reserved' }) {
  const palette =
    tone === 'available'
      ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
      : tone === 'occupied'
        ? { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }
        : { backgroundColor: '#FEF9C3', borderColor: '#FDE047' };

  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendSwatch, palette]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function getHoursLabel(lot: ParkingLot | null) {
  if (!lot) {
    return 'Open daily';
  }

  if (lot.features.some((feature) => feature.toLowerCase().includes('24/7'))) {
    return '24/7 access';
  }

  return 'Open daily';
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
    gap: 16,
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
  loadingButton: {
    alignSelf: 'stretch',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
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
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'right',
  },
  headerAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  headerAddress: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'right',
  },
  modeTabsSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modeTabsShell: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  modeTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modeTabText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  modeTabTextActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingTop: 0,
    paddingBottom: 140,
    gap: 0,
  },
  statsShell: {
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
    paddingTop: 2,
  },
  contentSection: {
    paddingHorizontal: 0,
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  hoursText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  hoursLabel: {
    color: '#1E293B',
    fontFamily: 'Poppins_600SemiBold',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  legendText: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
    textTransform: 'capitalize',
  },
  mapShell: {
    minHeight: 430,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  mapViewport: {
    flex: 1,
    minHeight: undefined,
  },
  fallbackMapFrame: {
    flex: 1,
    minHeight: 430,
  },
  mapHint: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mapHintText: {
    color: '#0F766E',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  sheetHeaderZone: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 10,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sheetSummaryRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  sheetEyebrow: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  sheetSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  sheetSlotTitle: {
    color: '#0F766E',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Poppins_700Bold',
  },
  walkInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  walkInBadgeText: {
    color: '#0F766E',
    fontSize: 11,
    lineHeight: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  sheetMetaBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
  },
  sheetMeta: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_500Medium',
  },
  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 14,
    gap: 20,
  },
  selectorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorSummaryCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectorSummaryCardActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#A7F3D0',
  },
  selectorSummaryCardWarning: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  selectorSummaryLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorSummaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorSummaryIconWrapActive: {
    backgroundColor: '#D1FAE5',
  },
  selectorSummaryIconWrapWarning: {
    backgroundColor: '#FFEDD5',
  },
  selectorSummaryCopy: {
    flex: 1,
  },
  selectorSummaryLabel: {
    color: '#64748B',
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Poppins_400Regular',
  },
  selectorSummaryValue: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
  },
  selectorSummaryValueActive: {
    color: '#0F766E',
  },
  selectorSummaryValueWarning: {
    color: '#F97316',
  },
  walkInRateCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  walkInRateLabel: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  walkInRateValue: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  walkInRateDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  walkInRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  walkInRateTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_600SemiBold',
  },
  walkInRateMeta: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  sectionEyebrow: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.6,
  },
  windowGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  windowChip: {
    flex: 1,
    minHeight: 66,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  windowChipActive: {
    backgroundColor: '#0F766E',
  },
  windowChipTitle: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  windowChipTitleActive: {
    color: '#FFFFFF',
  },
  windowChipSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  windowChipSubtitleActive: {
    color: 'rgba(255,255,255,0.82)',
  },
  walkInInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDFA',
    padding: 14,
  },
  walkInInfoCopy: {
    flex: 1,
  },
  walkInInfoTitle: {
    color: '#0F766E',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_600SemiBold',
  },
  walkInInfoText: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
    opacity: 0.84,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  guestNotice: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  modalBackdropPressable: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 14,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  modalTitle: {
    color: '#1E293B',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalOptionList: {
    gap: 10,
  },
  modalOptionCard: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalOptionCardActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0F766E',
  },
  modalOptionCopy: {
    flex: 1,
  },
  modalOptionTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
  },
  modalOptionTitleActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalOptionDetail: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  modalCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
