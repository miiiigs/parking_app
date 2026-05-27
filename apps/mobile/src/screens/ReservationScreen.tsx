import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  ARRIVAL_WINDOW_OPTIONS,
  type ArrivalWindowOption,
} from '../lib/reservationOptions';

type SlotItem = {
  id: string;
  label: string;
  status: 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';
  displayOrder?: number;
};

type Props = {
  slots: SlotItem[];
  selectedSlotId: string | null;
  selectedArrivalWindowMinutes: number;
  plateNumber: string;
  isSubmitting: boolean;
  isLiveData: boolean;
  errorMessage: string | null;
  onSelectSlot: (slotId: string) => void;
  onSelectArrivalWindow: (minutes: number) => void;
  onPlateNumberChange: (plateNumber: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

// reservation screen cleaned: removed unused helpers and UI fragments

const statusOrder: SlotItem['status'][] = ['available', 'reserved', 'occupied', 'blocked', 'disputed'];
const MAP_COLUMNS_PER_ROW = 6;
const SLOT_COLUMNS_LEFT = 3;
const MAP_SLOT_WIDTH = 88;
const MAP_SLOT_HEIGHT = 78;
const MAP_SLOT_GAP = 12;
const MAP_ROW_GAP = 18;
const MAP_SIDE_PADDING = 40;
const MAP_AISLE_WIDTH = 160;
const MAP_MIN_SCALE = 0.8;
const MAP_MAX_SCALE = 1.5;

function renderAvailability(status: SlotItem['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function renderStatusBadgeLabel(status: SlotItem['status']) {
  if (status === 'available') {
    return 'Open';
  }

  if (status === 'reserved') {
    return 'Reserved';
  }

  if (status === 'occupied') {
    return 'Occupied';
  }

  if (status === 'blocked') {
    return 'Blocked';
  }

  return 'Disputed';
}

function getSortedSlots(slots: SlotItem[]) {
  return [...slots].sort((left, right) => {
    const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftRank = statusOrder.indexOf(left.status);
    const rightRank = statusOrder.indexOf(right.status);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.label.localeCompare(right.label);
  });
}

function getSlotBadgeStyle(status: SlotItem['status']) {
  if (status === 'available') {
    return [styles.mapSlot, styles.mapSlotAvailable];
  }

  if (status === 'reserved') {
    return [styles.mapSlot, styles.mapSlotReserved];
  }

  if (status === 'occupied') {
    return [styles.mapSlot, styles.mapSlotOccupied];
  }

  if (status === 'blocked') {
    return [styles.mapSlot, styles.mapSlotBlocked];
  }

  return [styles.mapSlot, styles.mapSlotDisputed];
}

function ParkingLotMap({
  slots,
  selectedSlotId,
  onSelectSlot,
}: {
  slots: SlotItem[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const sortedSlots = useMemo(() => getSortedSlots(slots), [slots]);
  const rows = Math.max(1, Math.ceil(sortedSlots.length / MAP_COLUMNS_PER_ROW));
  const mapWidth = Math.max(860, screenWidth * 1.55);
  const mapHeight = Math.max(900, rows * (MAP_SLOT_HEIGHT + MAP_ROW_GAP) + 220);
  const mapCenterX = mapWidth / 2;
  const pan = useRef(new Animated.ValueXY({ x: -((mapWidth - screenWidth) / 4), y: -20 })).current;
  const startOffset = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const pulseValue = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          startOffset.current = { x: (pan.x as any).__getValue(), y: (pan.y as any).__getValue() };
        },
        onPanResponderMove: (_, gestureState) => {
          pan.setValue({
            x: startOffset.current.x + gestureState.dx,
            y: startOffset.current.y + gestureState.dy,
          });
        },
        onPanResponderRelease: () => {
          startOffset.current = { x: (pan.x as any).__getValue(), y: (pan.y as any).__getValue() };
        },
      }),
    [pan],
  );

  function changeScale(delta: number) {
    setScale((currentScale) => Math.max(MAP_MIN_SCALE, Math.min(MAP_MAX_SCALE, Number((currentScale + delta).toFixed(2)))));
  }

  const slotBlockWidth = SLOT_COLUMNS_LEFT * MAP_SLOT_WIDTH + (SLOT_COLUMNS_LEFT - 1) * MAP_SLOT_GAP;
  const rightBlockStart = mapWidth - MAP_SIDE_PADDING - slotBlockWidth;
  const aisleLeft = MAP_SIDE_PADDING + slotBlockWidth + MAP_SLOT_GAP;
  const aisleTop = 88;
  const slotPositions = useMemo(
    () =>
      sortedSlots.map((slot, index) => {
        const rowIndex = Math.floor(index / MAP_COLUMNS_PER_ROW);
        const columnIndex = index % MAP_COLUMNS_PER_ROW;
        const x =
          columnIndex < SLOT_COLUMNS_LEFT
            ? MAP_SIDE_PADDING + columnIndex * (MAP_SLOT_WIDTH + MAP_SLOT_GAP)
            : rightBlockStart + (columnIndex - SLOT_COLUMNS_LEFT) * (MAP_SLOT_WIDTH + MAP_SLOT_GAP);
        const y = 104 + rowIndex * (MAP_SLOT_HEIGHT + MAP_ROW_GAP);

        return {
          slot,
          x,
          y,
          centerX: x + MAP_SLOT_WIDTH / 2,
          centerY: y + MAP_SLOT_HEIGHT / 2,
        };
      }),
    [rightBlockStart, sortedSlots],
  );
  const selectedPosition = slotPositions.find((item) => item.slot.id === selectedSlotId) ?? null;
  const routeStartX = mapCenterX;
  const routeStartY = 74;
  const routeDistance = selectedPosition ? Math.hypot(selectedPosition.centerX - routeStartX, selectedPosition.centerY - routeStartY) : 0;
  const routeAngle = selectedPosition ? (Math.atan2(selectedPosition.centerY - routeStartY, selectedPosition.centerX - routeStartX) * 180) / Math.PI : 0;

  useEffect(() => {
    if (!selectedPosition) {
      pulseValue.stopAnimation();
      pulseValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      pulseValue.stopAnimation();
    };
  }, [pulseValue, selectedPosition]);

  return (
    <View style={[styles.mapViewport, { minHeight: Math.max(420, screenHeight * 0.6) }]}>
      <View style={styles.mapHud} pointerEvents="box-none">
        <View style={styles.mapLegendWrap}>
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapControlButton} onPress={() => changeScale(0.1)}>
              <Text style={styles.mapControlButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlButton} onPress={() => changeScale(-0.1)}>
              <Text style={styles.mapControlButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={() => {
                pan.setValue({ x: -((mapWidth - screenWidth) / 4), y: -20 });
                setScale(1);
              }}
            >
              <Text style={styles.mapControlButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapMiniLegend}>
            <LegendPill label="Open" style={styles.legendAvailable} />
            <LegendPill label="Reserved" style={styles.legendReserved} />
            <LegendPill label="Occupied" style={styles.legendOccupied} />
            <LegendPill label="Blocked" style={styles.legendBlocked} />
          </View>
        </View>
      </View>

      <View style={styles.mapCanvasFrame} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.mapCanvas,
            {
              width: mapWidth,
              height: mapHeight,
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
            },
          ]}
        >
          <View style={styles.mapBackdrop} />

          {selectedPosition ? (
            <View
              pointerEvents="none"
              style={[
                styles.routeLine,
                {
                  left: routeStartX,
                  top: routeStartY,
                  width: routeDistance,
                  transform: [{ rotate: `${routeAngle}deg` }],
                },
              ]}
            />
          ) : null}

          <View pointerEvents="none" style={[styles.routeStartDot, { left: routeStartX - 8, top: routeStartY - 8 }]} />
          <View pointerEvents="none" style={[styles.routeStartHalo, { left: routeStartX - 18, top: routeStartY - 18 }]} />

          <View style={[styles.entryPin, { left: routeStartX - 48, top: 18 }]}>
            <View style={styles.entryPinDot} />
            <View>
              <Text style={styles.entryPinTitle}>ENTRY GATE</Text>
              <Text style={styles.entryPinText}>Start here</Text>
            </View>
          </View>

          <View style={[styles.exitPin, { right: MAP_SIDE_PADDING, top: 18 }]}>
            <Text style={styles.exitPinTitle}>EXIT</Text>
          </View>

          <View
            style={[
              styles.mapAisle,
              {
                left: aisleLeft,
                top: aisleTop,
                width: MAP_AISLE_WIDTH,
                height: mapHeight - 150,
              },
            ]}
          >
            <Text style={styles.mapAisleText}>Main Drive Lane</Text>
            <Text style={styles.mapAisleHint}>Tap and drag to explore the lot</Text>
          </View>

          {slotPositions.map(({ slot, x, y }) => {
            const isSelected = slot.id === selectedSlotId;
            const pulseScale = pulseValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
            const pulseOpacity = pulseValue.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] });

            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  ...getSlotBadgeStyle(slot.status),
                  styles.mapSlotPlaced,
                  { left: x, top: y },
                  isSelected ? styles.mapSlotSelected : null,
                ]}
                onPress={() => onSelectSlot(slot.id)}
              >
                {isSelected ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.selectedPulseRing,
                      {
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                      },
                    ]}
                  />
                ) : null}
                {isSelected ? <View style={styles.mapSlotSelectedInner} /> : null}
                <Text style={styles.mapSlotLabel}>{slot.label}</Text>
                <Text style={styles.mapSlotStatus}>{renderStatusBadgeLabel(slot.status)}</Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

function LegendPill({ label, style }: { label: string; style: any }) {
  return (
    <View style={[styles.legendPill, style]}>
      <Text style={styles.legendPillText}>{label}</Text>
    </View>
  );
}

function ArrivalWindowCard({
  option,
  isSelected,
  onPress,
}: {
  option: ArrivalWindowOption;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.windowCard, isSelected ? styles.windowCardSelected : null]}>
      <Text style={styles.windowCardPrice}>PHP {option.fee}</Text>
      <Text style={styles.windowCardLabel}>{option.label}</Text>
    </TouchableOpacity>
  );
}

function ReservationBottomSheet({
  selectedSlot,
  selectedSlotId,
  selectedArrivalWindowMinutes,
  plateNumber,
  isSubmitting,
  isLiveData,
  errorMessage,
  onSelectArrivalWindow,
  onPlateNumberChange,
  onSubmit,
  onBack,
  screenHeight,
  autoExpandCounter,
}: {
  selectedSlot: SlotItem | undefined;
  selectedSlotId: string | null;
  selectedArrivalWindowMinutes: number;
  plateNumber: string;
  isSubmitting: boolean;
  isLiveData: boolean;
  errorMessage: string | null;
  // cleaned params
  onSelectArrivalWindow: (minutes: number) => void;
  onPlateNumberChange: (plateNumber: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  screenHeight: number;
  autoExpandCounter?: number;
}) {
  const hasSelection = Boolean(selectedSlotId);
  const sheetHeight = Math.round(screenHeight * (hasSelection ? 0.48 : 0.1));
  const peekHeight = 62;
  const expandedOffset = 0;
  const collapsedOffset = sheetHeight - peekHeight;
  const translateY = useRef(new Animated.Value(collapsedOffset)).current;
  const dragStartY = useRef(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function animateSheet(toValue: number) {
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      friction: 10,
      tension: 80,
    }).start();
  }

  useEffect(() => {
    if (hasSelection) {
      setIsExpanded(true);
      animateSheet(expandedOffset);
      return;
    }

    setIsExpanded(false);
    animateSheet(collapsedOffset);
  }, [collapsedOffset, expandedOffset, hasSelection]);

  // autoExpandCounter triggers an immediate expand when a slot is tapped on the map
  useEffect(() => {
    if (typeof autoExpandCounter !== 'undefined' && hasSelection) {
      setIsExpanded(true);
      animateSheet(expandedOffset);
    }
  }, [autoExpandCounter]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          dragStartY.current = isExpanded ? expandedOffset : collapsedOffset;
          setIsDragging(true);
        },
        onPanResponderMove: (_, gestureState) => {
          const nextOffset = Math.min(collapsedOffset, Math.max(expandedOffset, dragStartY.current + gestureState.dy));
          translateY.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          setIsDragging(false);
          const shouldExpand = gestureState.dy < -28 || gestureState.vy < -0.35;
          const shouldCollapse = gestureState.dy > 28 || gestureState.vy > 0.35;
          const nextExpanded = shouldCollapse ? false : shouldExpand ? true : isExpanded;

          setIsExpanded(nextExpanded);
          animateSheet(nextExpanded ? expandedOffset : collapsedOffset);
        },
      }),
    [collapsedOffset, expandedOffset, isExpanded, translateY],
  );
  return (
    <Animated.View style={[styles.bottomSheet, { height: sheetHeight, transform: [{ translateY }] }]}>
      <View style={styles.bottomSheetHandleWrap} {...sheetPanResponder.panHandlers}>
        <View style={styles.bottomSheetHandle} />
        <Text style={styles.bottomSheetGripLabel}>{hasSelection ? (isExpanded ? 'Swipe down to hide' : 'Swipe up to expand') : 'Select a slot to open'}</Text>
      </View>

      <View style={styles.bottomSheetBody}>
        {hasSelection ? (
          <>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>{selectedSlot ? selectedSlot.label : 'Select a parking slot'}</Text>
                <Text style={styles.bottomSheetSubtitle}>
                  {selectedSlot ? `${renderStatusBadgeLabel(selectedSlot.status)} slot • ${selectedSlotId ?? 'No slot selected'}` : 'Tap a slot on the map to open the reservation menu.'}
                </Text>
              </View>
            </View>

            {!isLiveData ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Backend data is offline</Text>
                <Text style={styles.warningText}>
                  You are viewing fallback demo slots. Connect to Supabase before creating a real reservation.
                </Text>
              </View>
            ) : null}

            <View style={styles.bottomSheetSection}>
              <Text style={styles.bottomSheetSectionTitle}>Arrival Window</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ARRIVAL_WINDOW_OPTIONS.map((option, idx) => (
                  <View key={option.minutes} style={{ flex: 1, marginRight: idx < ARRIVAL_WINDOW_OPTIONS.length - 1 ? 8 : 0 }}>
                    <ArrivalWindowCard
                      option={option}
                      isSelected={option.minutes === selectedArrivalWindowMinutes}
                      onPress={() => onSelectArrivalWindow(option.minutes)}
                    />
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.bottomSheetSection}>
              <Text style={styles.bottomSheetSectionTitle}>Vehicle Plate Number</Text>
              <TextInput
                value={plateNumber}
                onChangeText={onPlateNumberChange}
                placeholder="ABC-1234"
                placeholderTextColor="#5e7490"
                autoCapitalize="characters"
                style={styles.input}
              />
              <Text style={styles.helperText}>This helps guards confirm the booking on arrival.</Text>
            </View>

            {/* Expected parking duration removed per request */}

            {/* notes removed */}

            {/* Reservation summary moved to Validation screen per request */}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isSubmitting || !isLiveData || !selectedSlotId ? styles.primaryButtonDisabled : null,
                ]}
                onPress={onSubmit}
                disabled={isSubmitting || !isLiveData || !selectedSlotId}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Creating...' : !isLiveData ? 'Connect Backend First' : 'Confirm Reservation'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.bottomSheetCollapsedHint} />
        )}
      </View>
    </Animated.View>
  );
}

 

export function ReservationScreen({
  slots,
  selectedSlotId,
  selectedArrivalWindowMinutes,
  plateNumber,
  isSubmitting,
  isLiveData,
  errorMessage,
  onSelectSlot,
  onSelectArrivalWindow,
  onPlateNumberChange,
  onSubmit,
  onBack,
}: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const [localSelectedSlotId, setLocalSelectedSlotId] = useState<string | null>(null);
  const [ignoreInitialSelection, setIgnoreInitialSelection] = useState(true);

  const displayedSelectedSlotId = ignoreInitialSelection ? localSelectedSlotId : localSelectedSlotId ?? selectedSlotId;
  const selectedSlot = slots.find((slot) => slot.id === displayedSelectedSlotId);
  // don't precompute slot counts here; bottom sheet no longer displays them
  const [autoExpandCounter, setAutoExpandCounter] = useState(0);

  function handleMapSelectSlot(slotId: string) {
    // honor local selection first so initial screen has no selection until user taps
    setLocalSelectedSlotId(slotId);
    setIgnoreInitialSelection(false);
    onSelectSlot(slotId);
    setAutoExpandCounter((c) => c + 1);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerBarTitle}>Reserve a Slot</Text>
      </View>

      <View style={styles.mapShell}>
        <ParkingLotMap slots={slots} selectedSlotId={displayedSelectedSlotId} onSelectSlot={handleMapSelectSlot} />
      </View>

      <ReservationBottomSheet
        selectedSlot={selectedSlot}
        selectedSlotId={displayedSelectedSlotId}
        selectedArrivalWindowMinutes={selectedArrivalWindowMinutes}
        plateNumber={plateNumber}
        isSubmitting={isSubmitting}
        isLiveData={isLiveData}
        errorMessage={errorMessage}
        // slot counts removed
        onSelectArrivalWindow={onSelectArrivalWindow}
        onPlateNumberChange={onPlateNumberChange}
        onSubmit={onSubmit}
        onBack={onBack}
        screenHeight={screenHeight}
        autoExpandCounter={autoExpandCounter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f1b2c',
    position: 'relative',
  },
  headerBar: {
    height: 58,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: '#0c1828',
    borderBottomWidth: 1,
    borderBottomColor: '#17304a',
  },
  headerBarTitle: {
    color: '#f4f7fb',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mapShell: {
    flex: 1,
    minHeight: 0,
  },
  mapViewport: {
    flex: 1,
    backgroundColor: '#08111d',
    overflow: 'hidden',
  },
  mapHud: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  mapLegendWrap: {
    flex: 1,
    gap: 10,
  },
  mapControls: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  mapControlButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#13253d',
    borderWidth: 1,
    borderColor: '#27435f',
    minWidth: 48,
    alignItems: 'center',
  },
  mapControlButtonText: {
    color: '#f4f7fb',
    fontSize: 12,
    fontWeight: '800',
  },
  mapMiniLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  mapCanvasFrame: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#0a1522',
  },
  mapCanvas: {
    position: 'relative',
  },
  mapBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#08111d',
  },
  routeLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#7bd3ff',
    borderRadius: 999,
    opacity: 0.85,
    transformOrigin: '0 50%',
  },
  routeStartDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#3dd6a5',
    borderWidth: 3,
    borderColor: '#0a1522',
    zIndex: 4,
  },
  routeStartHalo: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(61, 214, 165, 0.28)',
    zIndex: 3,
  },
  mapLabelBlock: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: '#0f1b2c',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#234061',
  },
  mapLabelTitle: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  mapLabelText: {
    color: '#c5d4e6',
    fontSize: 11,
    lineHeight: 15,
  },
  entryPin: {
    position: 'absolute',
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 27, 44, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(123, 211, 255, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  entryPinDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#3dd6a5',
    borderWidth: 2,
    borderColor: '#e9fbf4',
  },
  entryPinTitle: {
    color: '#f4f7fb',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  entryPinText: {
    color: '#b8c7da',
    fontSize: 10,
  },
  exitPin: {
    position: 'absolute',
    zIndex: 6,
    backgroundColor: 'rgba(15, 27, 44, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exitPinTitle: {
    color: '#ffb74d',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  mapAisleHint: {
    color: '#8ea4bd',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  mapSlotPlaced: {
    position: 'absolute',
    zIndex: 2,
    width: MAP_SLOT_WIDTH,
    height: MAP_SLOT_HEIGHT,
  },
  warningBox: {
    backgroundColor: '#2a220f',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#8a6b2f',
    gap: 6,
  },
  warningTitle: {
    color: '#ffcf66',
    fontWeight: '800',
    fontSize: 14,
  },
  warningText: {
    color: '#f5e6bf',
    fontSize: 13,
    lineHeight: 18,
  },
  mapTitle: {
    color: '#f4f7fb',
    fontSize: 15,
    fontWeight: '800',
  },
  mapSubtitle: {
    color: '#8ea4bd',
    fontSize: 12,
    lineHeight: 16,
  },
  legendPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  legendPillText: {
    color: '#f4f7fb',
    fontSize: 11,
    fontWeight: '700',
  },
  legendAvailable: {
    borderColor: '#3dd6a5',
    backgroundColor: '#0c1a28',
  },
  legendReserved: {
    borderColor: '#7bd3ff',
    backgroundColor: '#0d1a2a',
  },
  legendOccupied: {
    borderColor: '#ffb74d',
    backgroundColor: '#23190c',
  },
  legendBlocked: {
    borderColor: '#ff8a80',
    backgroundColor: '#281214',
  },
  mapAisle: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f3956',
    backgroundColor: '#07111d',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  mapAisleText: {
    color: '#5e7490',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mapSlot: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    gap: 2,
  },
  mapSlotSelected: {
    borderColor: '#3dd6a5',
    shadowColor: '#3dd6a5',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  mapSlotSelectedInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    backgroundColor: 'rgba(61, 214, 165, 0.08)',
  },
  selectedPulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3dd6a5',
  },
  mapSlotAvailable: {
    borderColor: '#3dd6a5',
    backgroundColor: '#0c1a28',
  },
  mapSlotReserved: {
    borderColor: '#7bd3ff',
    backgroundColor: '#0d1a2a',
  },
  mapSlotOccupied: {
    borderColor: '#ffb74d',
    backgroundColor: '#23190c',
  },
  mapSlotBlocked: {
    borderColor: '#ff8a80',
    backgroundColor: '#281214',
  },
  mapSlotDisputed: {
    borderColor: '#d1a3ff',
    backgroundColor: '#20142a',
  },
  mapSlotLabel: {
    color: '#f4f7fb',
    fontSize: 12,
    fontWeight: '800',
  },
  mapSlotStatus: {
    color: '#b8c7da',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0b1624',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#17304a',
    padding: 16,
    gap: 12,
  },
  bottomSheetHandleWrap: {
    alignItems: 'center',
    gap: 6,
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#27435f',
    marginTop: 4,
  },
  bottomSheetGripLabel: {
    color: '#8ea4bd',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  bottomSheetTitle: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '800',
  },
  bottomSheetSubtitle: {
    color: '#8ea4bd',
    fontSize: 12,
    lineHeight: 18,
  },
  bottomSheetCountPill: {
    backgroundColor: '#0f1b2c',
    borderColor: '#27435f',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomSheetCountText: {
    color: '#7bd3ff',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomSheetStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bottomSheetBody: {
    gap: 8,
  },
  bottomSheetOverlaySpacer: {
    height: 8,
  },
  bottomSheetCollapsedHint: {
    height: 8,
  },
  bottomSheetDragOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  /* stat pills removed */
  bottomSheetSection: {
    gap: 10,
  },
  bottomSheetSectionTitle: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  rowLabel: {
    color: '#f4f7fb',
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
    color: '#7bd3ff',
    fontSize: 14,
    fontWeight: '700',
  },
  slotLeftColumn: {
    flex: 1,
    gap: 4,
  },
  slotLabel: {
    color: '#f4f7fb',
    fontSize: 15,
    fontWeight: '700',
  },
  slotStatus: {
    color: '#b8c7da',
    fontSize: 12,
  },
  slotCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  slotCardSelected: {
    backgroundColor: '#12233a',
    borderColor: '#3dd6a5',
    shadowColor: '#3dd6a5',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#263b56',
    backgroundColor: '#08111d',
  },
  badgeAvailable: {
    borderColor: '#3dd6a5',
    backgroundColor: '#0c1a28',
  },
  badgeReserved: {
    borderColor: '#7bd3ff',
    backgroundColor: '#0d1a2a',
  },
  badgeOccupied: {
    borderColor: '#ffb74d',
    backgroundColor: '#23190c',
  },
  badgeBlocked: {
    borderColor: '#ff8a80',
    backgroundColor: '#281214',
  },
  badgeDisputed: {
    borderColor: '#d1a3ff',
    backgroundColor: '#20142a',
  },
  badgeText: {
    color: '#f4f7fb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  windowCard: {
    backgroundColor: '#08111d',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#18283f',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  /* compact arrival window styles kept; detailed window description removed */
  windowCardPrice: {
    color: '#7bd3ff',
    fontSize: 16,
    fontWeight: '900',
  },
  windowCardLabel: {
    color: '#f4f7fb',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '800',
  },
  windowCardSelected: {
    borderColor: '#3dd6a5',
    backgroundColor: '#0c1a28',
  },
  input: {
    backgroundColor: '#08111d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#18283f',
    color: '#f4f7fb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    letterSpacing: 1.1,
  },
  
  /* stepper styles removed */
  helperText: {
    color: '#b8c7da',
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    color: '#b8c7da',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  secondaryButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
  },
});
