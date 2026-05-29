import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

type ParkingSlotStatus = 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';

export type ParkingLotSlot = {
  id: string;
  label: string;
  status: ParkingSlotStatus;
  displayOrder?: number;
};

export type ParkingLotMapLayout = {
  columnsPerRow: number;
  leftSlotColumns: number;
  slotWidth: number;
  slotHeight: number;
  slotGap: number;
  rowGap: number;
  sidePadding: number;
  aisleWidth: number;
  routeThickness: number;
};

type ParkingLotMapProps = {
  slots: ParkingLotSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  layout?: Partial<ParkingLotMapLayout>;
};

type StraightRoadState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = { x: number; y: number };

const defaultLayout: ParkingLotMapLayout = {
  columnsPerRow: 6,
  leftSlotColumns: 3,
  slotWidth: 98,
  slotHeight: 86,
  slotGap: 12,
  rowGap: 18,
  sidePadding: 52,
  aisleWidth: 220,
  routeThickness: 8,
};

const statusOrder: ParkingSlotStatus[] = ['available', 'reserved', 'occupied', 'blocked', 'disputed'];

function renderStatusBadgeLabel(status: ParkingSlotStatus) {
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

function getSortedSlots(slots: ParkingLotSlot[]) {
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

function getSlotBadgeStyle(status: ParkingLotSlot['status']) {
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

function LegendPill({ label, style }: { label: string; style: any }) {
  return (
    <View style={[styles.legendPill, style]}>
      <Text style={styles.legendPillText}>{label}</Text>
    </View>
  );
}

export function ParkingLotMap({ slots, selectedSlotId, onSelectSlot, layout }: ParkingLotMapProps) {
  const resolvedLayout = { ...defaultLayout, ...layout };
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const sortedSlots = useMemo(() => getSortedSlots(slots), [slots]);
  const rows = Math.max(1, Math.ceil(sortedSlots.length / resolvedLayout.columnsPerRow));
  const mapWidth = Math.max(1600, screenWidth * 2.4);
  const mapHeight = Math.max(1400, rows * (resolvedLayout.slotHeight + resolvedLayout.rowGap) + 520);
  const entryGate: Point = { x: mapWidth / 2, y: Math.max(220, mapHeight - 260) };
  const initialPan = { x: screenWidth / 2 - entryGate.x, y: screenHeight * 0.75 - entryGate.y };
  const pan = useRef(new Animated.ValueXY(initialPan)).current;
  const startOffset = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const pulseValue = useRef(new Animated.Value(0)).current;
  const [showStraightRoad, setShowStraightRoad] = useState(false);
  const roadMoveStart = useRef({ x: 0, y: 0 });
  const roadResizeStart = useRef(0);
  const [straightRoad, setStraightRoad] = useState<StraightRoadState>(() => ({
    x: mapWidth / 2 - 220,
    y: 160,
    width: 440,
    height: 24,
  }));
  const viewportRef = useRef<View | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: screenWidth, height: screenHeight });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
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

  useEffect(() => {
    setStraightRoad((current) => ({
      ...current,
      x: mapWidth / 2 - current.width / 2,
      y: 160,
    }));
  }, [mapWidth]);

  function changeScale(delta: number) {
    setScale((currentScale) => Math.max(0.75, Math.min(1.7, Number((currentScale + delta).toFixed(2)))));
  }

  function recenterEntryGate() {
    pan.setValue({
      x: viewportSize.width / 2 - entryGate.x * scale,
      y: viewportSize.height * 0.75 - entryGate.y * scale,
    });
  }

  const slotBlockWidth = resolvedLayout.leftSlotColumns * resolvedLayout.slotWidth + (resolvedLayout.leftSlotColumns - 1) * resolvedLayout.slotGap;
  const aisleLeft = resolvedLayout.sidePadding + slotBlockWidth + resolvedLayout.slotGap;
  const aisleTop = 88;
  const roadLeftEdge = aisleLeft - resolvedLayout.slotGap;
  const roadRightEdge = aisleLeft + resolvedLayout.aisleWidth + resolvedLayout.slotGap;
  const leftBayStart = roadLeftEdge - slotBlockWidth;
  const rightBayStart = roadRightEdge;
  const routeStartX = resolvedLayout.sidePadding + 24;
  const routeStartY = 58;
  const roadCenterX = aisleLeft + resolvedLayout.aisleWidth / 2;
  const roundaboutCenterX = roadCenterX;
  const roundaboutCenterY = 130;
  const roundaboutRadius = 46;

  const slotPositions = useMemo(
    () =>
      sortedSlots.map((slot, index) => {
        const rowIndex = Math.floor(index / resolvedLayout.columnsPerRow);
        const columnIndex = index % resolvedLayout.columnsPerRow;
        const rowProgress = rows > 1 ? rowIndex / (rows - 1) : 0;
        const curveOffset = Math.sin(rowProgress * Math.PI) * 24;
        const sideBend = Math.sin((rowProgress * Math.PI) / 2) * 12;
        const isLeftSide = columnIndex < resolvedLayout.leftSlotColumns;
        const x =
          isLeftSide
            ? leftBayStart + columnIndex * (resolvedLayout.slotWidth + resolvedLayout.slotGap) + curveOffset * 0.12
            : rightBayStart + (columnIndex - resolvedLayout.leftSlotColumns) * (resolvedLayout.slotWidth + resolvedLayout.slotGap) - curveOffset * 0.12;
        const y = 104 + rowIndex * (resolvedLayout.slotHeight + resolvedLayout.rowGap) + sideBend;

        return {
          slot,
          columnIndex,
          isLeftSide,
          curveOffset,
          x,
          y,
          centerX: x + resolvedLayout.slotWidth / 2,
          centerY: y + resolvedLayout.slotHeight / 2,
        };
      }),
    [leftBayStart, rightBayStart, resolvedLayout.leftSlotColumns, resolvedLayout.columnsPerRow, resolvedLayout.rowGap, resolvedLayout.slotGap, resolvedLayout.slotHeight, resolvedLayout.slotWidth, rows, sortedSlots],
  );

  const selectedPosition = slotPositions.find((item) => item.slot.id === selectedSlotId) ?? null;

  const roadBodyResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          roadMoveStart.current = { x: straightRoad.x, y: straightRoad.y };
        },
        onPanResponderMove: (_, gestureState) => {
          setStraightRoad((current) => ({
            ...current,
            x: roadMoveStart.current.x + gestureState.dx,
            y: roadMoveStart.current.y + gestureState.dy,
          }));
        },
        onPanResponderRelease: () => {
          roadMoveStart.current = { x: straightRoad.x, y: straightRoad.y };
        },
      }),
    [straightRoad.x, straightRoad.y],
  );

  const roadResizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2,
        onPanResponderGrant: () => {
          roadResizeStart.current = straightRoad.width;
        },
        onPanResponderMove: (_, gestureState) => {
          setStraightRoad((current) => ({
            ...current,
            width: Math.max(180, roadResizeStart.current + gestureState.dx),
          }));
        },
        onPanResponderRelease: () => {
          roadResizeStart.current = straightRoad.width;
        },
      }),
    [straightRoad.width],
  );

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
    <View
      ref={viewportRef}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewportSize({ width, height });
      }}
      style={[styles.mapViewport, { minHeight: Math.max(420, screenHeight * 0.6) }]}
    >
      <View style={styles.mapHud} pointerEvents="box-none">
        <View style={styles.mapLegendWrap}>
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapControlButton} onPress={() => changeScale(0.1)}>
              <Text style={styles.mapControlButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={recenterEntryGate}
              accessibilityLabel="Recenter entry gate"
            >
              <Text style={styles.mapControlButtonText}>Recenter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlButton} onPress={() => changeScale(-0.1)}>
              <Text style={styles.mapControlButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlButton} onPress={() => setShowStraightRoad(true)}>
              <Text style={styles.mapControlButtonText}>Straight Road</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapControlButton}
              onPress={() => {
                pan.setValue(initialPan);
                setScale(1);
                setShowStraightRoad(false);
                setStraightRoad({ x: mapWidth / 2 - 220, y: 160, width: 440, height: 24 });
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
          <Text style={styles.mapHint}>Drag the lot to move around. Use + / - to scale the layout. Tap ◎ to center the entry gate near the bottom of the view. Tap Straight Road to place a draggable road.</Text>
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

          <View pointerEvents="none" style={[styles.entryPin, { left: entryGate.x - 76, top: entryGate.y }]}>
            <View style={styles.entryPinDot} />
            <View>
              <Text style={styles.entryPinTitle}>ENTRY GATE</Text>
              <Text style={styles.entryPinText}>Bottom center focus</Text>
            </View>
          </View>

          {showStraightRoad ? (
            <View
              style={[
                styles.straightRoad,
                {
                  left: straightRoad.x,
                  top: straightRoad.y,
                  width: straightRoad.width,
                  height: straightRoad.height,
                },
              ]}
              {...roadBodyResponder.panHandlers}
            >
              <View style={styles.straightRoadCenterLine} />
              <View
                style={styles.straightRoadHandle}
                {...roadResizeResponder.panHandlers}
              >
                <View style={styles.straightRoadHandleKnob} />
              </View>
            </View>
          ) : null}

          {slotPositions.map(({ slot, x, y, isLeftSide, curveOffset }) => {
            const isSelected = slot.id === selectedSlotId;
            const pulseScale = pulseValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
            const pulseOpacity = pulseValue.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] });
            const slotRotation = '0deg';

            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  ...getSlotBadgeStyle(slot.status),
                  styles.mapSlotPlaced,
                  { left: x, top: y, transform: [{ rotate: slotRotation }, { translateY: curveOffset * 0.03 }] },
                  isSelected ? styles.mapSlotSelected : null,
                ]}
                onPress={() => onSelectSlot(slot.id)}
              >
                <View pointerEvents="none" style={styles.mapSlotCurb} />
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

const styles = StyleSheet.create({
  mapViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  mapHud: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    zIndex: 999,
    elevation: 20,
    paddingTop: 6,
  },
  mapLegendWrap: {
    gap: 10,
  },
  mapControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapControlButton: {
    backgroundColor: '#0f1b2c',
    borderColor: '#24415f',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  mapControlButtonText: {
    color: '#f4f7fb',
    fontWeight: '800',
    fontSize: 14,
  },
  mapMiniLegend: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mapHint: {
    color: '#8ea4bd',
    fontSize: 11,
    fontWeight: '700',
  },
  mapCanvasFrame: {
    flex: 1,
    overflow: 'hidden',
  },
  mapCanvas: {
    position: 'relative',
  },
  mapBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#08111d',
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
  straightRoad: {
    position: 'absolute',
    zIndex: 7,
    borderRadius: 14,
    backgroundColor: '#102133',
    borderWidth: 1,
    borderColor: '#3a5c7f',
    overflow: 'visible',
    justifyContent: 'center',
  },
  straightRoadCenterLine: {
    position: 'absolute',
    left: 10,
    right: 22,
    top: '50%',
    marginTop: -2,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#7bd3ff',
    opacity: 0.9,
  },
  straightRoadHandle: {
    position: 'absolute',
    right: -10,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#7bd3ff',
    backgroundColor: '#0f1b2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  straightRoadHandleKnob: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#3dd6a5',
  },
  mapSlotCurb: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 8,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  mapSlotPlaced: {
    position: 'absolute',
    zIndex: 2,
    width: 100,
    height: 84,
  },
  mapSlot: {
    borderRadius: 10,
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
    borderRadius: 10,
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
});