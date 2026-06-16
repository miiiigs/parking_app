import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Clock3, MapPinned } from 'lucide-react-native';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../../components/layout/Screen';
import { ParkingLotLayoutMap } from '../../../components/parking/ParkingLotLayoutMap';
import { ParkingMap } from '../../../components/parking/ParkingMap';
import { AppButton } from '../../../components/ui/AppButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useParkingFlowStore } from '../store/useParkingFlowStore';
import type { ParkingSlot } from '../types';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { useMobileParkingData } from '../../../providers/MobileParkingDataProvider';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { formatParkingPricingSummary } from '@parking/shared';

const arrivalWindows = [30, 60, 120];
const SHEET_COLLAPSED_HEIGHT = 112;
const SHEET_EXPANDED_HEIGHT = 372;

function animateSheetTo(value: Animated.Value, nextValue: number) {
  Animated.spring(value, {
    toValue: nextValue,
    useNativeDriver: true,
    damping: 22,
    stiffness: 210,
    mass: 0.9,
  }).start();
}

export default function ReservationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lotId?: string }>();
  const auth = useMobileAuth();
  const { lots, isLoading } = useMobileParkingData();
  const reserveSlot = useParkingFlowStore((state) => state.reserveSlot);
  const reservationDraft = useParkingFlowStore((state) => state.reservationDraft);
  const setReservationDraft = useParkingFlowStore((state) => state.setReservationDraft);
  const clearReservationDraft = useParkingFlowStore((state) => state.clearReservationDraft);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [arrivalWindowMinutes, setArrivalWindowMinutes] = useState(30);
  const [plateNumber, setPlateNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const lot = lots.find((entry) => entry.id === String(params.lotId ?? '')) ?? lots[0] ?? null;
  const normalizedPlateNumber = plateNumber.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const selectedSlotId = selectedSlot?.id ?? null;
  const requiresAuth = !auth.user || auth.isGuest;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_EXPANDED_HEIGHT)).current;
  const sheetStartOffset = useRef(SHEET_EXPANDED_HEIGHT);
  const sheetVisible = Boolean(selectedSlot);
  const collapsedOffset = Math.max(0, SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT);
  const slotStatusLabel = selectedSlot?.status === 'available' || selectedSlot?.isAvailable ? 'Open now' : 'Unavailable';
  const hourlyRateLabel = useMemo(() => (lot ? formatParkingPricingSummary(lot.pricingConfig) : 'PHP 0/hr'), [lot]);

  useEffect(() => {
    if (reservationDraft?.lotId === lot?.id) {
      setArrivalWindowMinutes(reservationDraft.arrivalWindowMinutes);
      setPlateNumber(reservationDraft.plateNumber);

      if (reservationDraft.slotId) {
        setSelectedSlot(lot?.slots.find((slot) => slot.id === reservationDraft.slotId) ?? null);
      } else {
        setSelectedSlot(null);
      }

      return;
    }

    setSelectedSlot(null);
    setArrivalWindowMinutes(30);
    setPlateNumber('');
  }, [lot?.id, reservationDraft]);

  useEffect(() => {
    if (!lot) {
      return;
    }

    setReservationDraft({
      lotId: lot.id,
      slotId: selectedSlot?.id ?? null,
      arrivalWindowMinutes,
      plateNumber: normalizedPlateNumber,
    });
  }, [arrivalWindowMinutes, lot, normalizedPlateNumber, selectedSlot, setReservationDraft]);

  useEffect(() => {
    if (!selectedSlot) {
      setSheetExpanded(true);
      animateSheetTo(sheetTranslateY, SHEET_EXPANDED_HEIGHT);
      return;
    }

    setSheetExpanded(true);
    animateSheetTo(sheetTranslateY, 0);
  }, [selectedSlot, sheetTranslateY]);

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
      <Screen>
        <View style={styles.loadingCard}>
          <StatusBadge label="Loading parking lot" tone="info" />
          <Text style={styles.title}>Loading live slot map...</Text>
        </View>
      </Screen>
    );
  }

  if (!lot) {
    return (
      <Screen>
        <View style={styles.loadingCard}>
          <Text style={styles.title}>Parking lot not found.</Text>
          <AppButton label="Back to home" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  const handleConfirm = async () => {
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
    <Screen scrollEnabled={false} contentStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft stroke={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Select parking slot</Text>
          <Text style={styles.subtitle}>{lot.name}</Text>
        </View>
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
              setSelectedSlot(nextSlot && nextSlot.isAvailable ? nextSlot : null);
            }}
          />
        ) : (
          <View style={styles.fallbackMapFrame}>
            <ParkingMap slots={lot.slots} selectedSlotId={selectedSlotId ?? undefined} onSelectSlot={setSelectedSlot} />
          </View>
        )}

        <View style={styles.topInfoRow} pointerEvents="box-none">
          <StatusBadge label={`${lot.availableSlots} live slots available`} tone="success" />
        </View>

        {!selectedSlot ? (
          <View style={styles.emptySheetHint} pointerEvents="none">
            <MapPinned stroke={colors.primaryDark} size={18} />
            <Text style={styles.emptySheetHintText}>Tap an open slot to view reservation details.</Text>
          </View>
        ) : null}

        {selectedSlot ? (
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.sheetHandleZone} {...sheetPanResponder.panHandlers}>
              <View style={styles.sheetHandle} />
              <Pressable
                style={styles.sheetSummaryRow}
                onPress={() => {
                  const nextExpanded = !sheetExpanded;
                  setSheetExpanded(nextExpanded);
                  animateSheetTo(sheetTranslateY, nextExpanded ? 0 : collapsedOffset);
                }}
              >
                <View style={styles.sheetSlotBlock}>
                  <Text style={styles.sheetEyebrow}>Selected slot</Text>
                  <Text style={styles.sheetSlotTitle}>{selectedSlot.number}</Text>
                </View>
                <View style={styles.sheetMetaBlock}>
                  <Text style={styles.sheetMeta}>{slotStatusLabel}</Text>
                  <ChevronDown
                    stroke={colors.muted}
                    size={18}
                    style={{ transform: [{ rotate: sheetExpanded ? '0deg' : '180deg' }] }}
                  />
                </View>
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetExpandedContent}
              contentContainerStyle={styles.sheetExpandedContentInner}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Rate</Text>
                  <Text style={styles.detailValue}>{hourlyRateLabel}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Window</Text>
                  <Text style={styles.detailValue}>{arrivalWindowMinutes} min</Text>
                </View>
              </View>

              <View style={styles.windowGroup}>
                {arrivalWindows.map((minutes) => {
                  const selected = arrivalWindowMinutes === minutes;
                  return (
                    <Pressable
                      key={minutes}
                      onPress={() => setArrivalWindowMinutes(minutes)}
                      style={[styles.windowChip, selected && styles.windowChipSelected]}
                    >
                      <Clock3 stroke={selected ? colors.primaryDark : colors.muted} size={16} />
                      <Text style={[styles.windowLabel, selected && styles.windowLabelSelected]}>
                        {minutes === 30 ? '30 min' : `${minutes / 60} hr`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Plate number</Text>
                <TextInput
                  value={normalizedPlateNumber}
                  onChangeText={setPlateNumber}
                  placeholder="ABC-1234"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                />
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              {requiresAuth ? (
                <>
                  <AppButton
                    label="Log in or sign up"
                    onPress={() => router.push({ pathname: '/login', params: { returnTo: `/reservation/${lot.id}` } })}
                  />
                  <Text style={styles.guestNotice}>
                    Guest mode is available for testing, but booking requires a signed-in customer account.
                  </Text>
                </>
              ) : (
                <AppButton
                  label="Confirm booking"
                  onPress={handleConfirm}
                  disabled={!selectedSlot || normalizedPlateNumber.length < 5}
                  loading={isSubmitting}
                />
              )}
            </ScrollView>
          </Animated.View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: 0,
  },
  loadingCard: {
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
  },
  mapShell: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.xl,
  },
  mapViewport: {
    flex: 1,
    minHeight: undefined,
  },
  fallbackMapFrame: {
    flex: 1,
  },
  topInfoRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'flex-start',
  },
  emptySheetHint: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CBE8DA',
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptySheetHintText: {
    color: colors.primaryDark,
    fontSize: typography.body,
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_EXPANDED_HEIGHT,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 6,
  },
  sheetHandleZone: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sheetSlotBlock: {
    gap: 2,
  },
  sheetEyebrow: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  sheetSlotTitle: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '800',
  },
  sheetMetaBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sheetMeta: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  sheetExpandedContent: {
    flex: 1,
  },
  sheetExpandedContentInner: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  windowGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  windowChip: {
    minWidth: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  windowChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  windowLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  windowLabelSelected: {
    color: colors.primaryDark,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: typography.body,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.body,
    lineHeight: 20,
  },
  guestNotice: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
