import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  applyLiveSlotStatuses,
  buildRoadShape,
  type ParkingLotDefinition,
  type ParkingSlotStatus,
} from '@parking/shared/parkingMap';

type LiveSlot = {
  id: string;
  label: string;
  status: ParkingSlotStatus;
  displayOrder?: number;
};

type Props = {
  lot: ParkingLotDefinition;
  slots: LiveSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
};

function renderStatusBadgeLabel(status: ParkingSlotStatus) {
  if (status === 'available') return 'Open';
  if (status === 'reserved') return 'Reserved';
  if (status === 'occupied') return 'Occupied';
  if (status === 'blocked') return 'Blocked';
  return 'Disputed';
}

function getSlotStyle(status: ParkingSlotStatus) {
  if (status === 'available') return [styles.mapSlot, styles.mapSlotAvailable];
  if (status === 'reserved') return [styles.mapSlot, styles.mapSlotReserved];
  if (status === 'occupied') return [styles.mapSlot, styles.mapSlotOccupied];
  if (status === 'blocked') return [styles.mapSlot, styles.mapSlotBlocked];
  return [styles.mapSlot, styles.mapSlotDisputed];
}

export function ParkingLotLayoutMap({ lot, slots, selectedSlotId, onSelectSlot }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const mergedLot = useMemo(
    () =>
      applyLiveSlotStatuses(
        lot,
        slots.map((slot, index) => ({
          id: slot.id,
          label: slot.label,
          status: slot.status,
          displayOrder: slot.displayOrder ?? index + 1,
        })),
      ),
    [lot, slots],
  );

  const entryNode = mergedLot.nodes.find((node) => node.kind === 'entry') ?? mergedLot.nodes[0];
  const entryGate = entryNode ? { x: entryNode.x, y: entryNode.y } : { x: mergedLot.width / 2, y: mergedLot.height - 80 };
  const initialPan = { x: screenWidth / 2 - entryGate.x, y: screenHeight * 0.72 - entryGate.y };
  const pan = useRef(new Animated.ValueXY(initialPan)).current;
  const startOffset = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

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

  function changeScale(delta: number) {
    setScale((current) => Math.max(0.75, Math.min(1.7, Number((current + delta).toFixed(2)))));
  }

  function recenterEntryGate() {
    pan.setValue({
      x: screenWidth / 2 - entryGate.x * scale,
      y: screenHeight * 0.72 - entryGate.y * scale,
    });
  }

  return (
    <View style={[styles.mapViewport, { minHeight: Math.max(420, screenHeight * 0.6) }]}>
      <View style={styles.mapHud} pointerEvents="box-none">
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={() => changeScale(0.1)}>
            <Text style={styles.mapControlButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton} onPress={recenterEntryGate}>
            <Text style={styles.mapControlButtonText}>Recenter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton} onPress={() => changeScale(-0.1)}>
            <Text style={styles.mapControlButtonText}>-</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.mapHint}>Saved lot layout from admin. Drag to pan, tap a slot to reserve.</Text>
      </View>

      <View style={styles.mapCanvasFrame} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.mapCanvas,
            {
              width: mergedLot.width,
              height: mergedLot.height,
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
            },
          ]}
        >
          <View style={styles.mapBackdrop} />

          <Svg width={mergedLot.width} height={mergedLot.height} style={styles.roadSvg}>
            {mergedLot.roads.map((road) => {
              const shape = buildRoadShape(road);
              return (
                <React.Fragment key={road.id}>
                  <Path
                    d={shape.d}
                    stroke="#0b1624"
                    strokeWidth={shape.strokeWidth + 12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.8}
                    fill="none"
                  />
                  <Path
                    d={shape.d}
                    stroke="#17283d"
                    strokeWidth={shape.strokeWidth + 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.95}
                    fill="none"
                  />
                  <Path
                    d={shape.d}
                    stroke="#09111d"
                    strokeWidth={shape.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </React.Fragment>
              );
            })}
          </Svg>

          {mergedLot.nodes.map((node) => (
            <View
              key={node.id}
              pointerEvents="none"
              style={[styles.entryPin, { left: node.x - 40, top: node.y }]}
            >
              <View style={styles.entryPinDot} />
              <Text style={styles.entryPinTitle}>{node.label.toUpperCase()}</Text>
            </View>
          ))}

          {mergedLot.slots.map((slot) => {
            const isSelected = slot.id === selectedSlotId;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  ...getSlotStyle(slot.status),
                  styles.mapSlotPlaced,
                  {
                    left: slot.x,
                    top: slot.y,
                    transform: [{ rotate: `${slot.rotation}deg` }],
                  },
                  isSelected ? styles.mapSlotSelected : null,
                ]}
                onPress={() => onSelectSlot(slot.id)}
              >
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
  mapViewport: { flex: 1, overflow: 'hidden' },
  mapHud: { position: 'absolute', left: 12, right: 12, top: 12, zIndex: 999, gap: 8 },
  mapControls: { flexDirection: 'row', gap: 8 },
  mapControlButton: {
    backgroundColor: '#0f1b2c',
    borderColor: '#24415f',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapControlButtonText: { color: '#f4f7fb', fontWeight: '800', fontSize: 14 },
  mapHint: { color: '#8ea4bd', fontSize: 11, fontWeight: '700' },
  mapCanvasFrame: { flex: 1, overflow: 'hidden' },
  mapCanvas: { position: 'relative' },
  mapBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#08111d' },
  roadSvg: { position: 'absolute', left: 0, top: 0 },
  entryPin: {
    position: 'absolute',
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 27, 44, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(123, 211, 255, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  entryPinDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#3dd6a5',
  },
  entryPinTitle: { color: '#f4f7fb', fontSize: 10, fontWeight: '900' },
  mapSlotPlaced: {
    position: 'absolute',
    zIndex: 5,
    width: 92,
    height: 76,
  },
  mapSlot: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    gap: 2,
  },
  mapSlotSelected: {
    borderColor: '#3dd6a5',
    shadowColor: '#3dd6a5',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  mapSlotAvailable: { borderColor: '#3dd6a5', backgroundColor: '#0c1a28' },
  mapSlotReserved: { borderColor: '#7bd3ff', backgroundColor: '#0d1a2a' },
  mapSlotOccupied: { borderColor: '#ffb74d', backgroundColor: '#23190c' },
  mapSlotBlocked: { borderColor: '#ff8a80', backgroundColor: '#281214' },
  mapSlotDisputed: { borderColor: '#d1a3ff', backgroundColor: '#20142a' },
  mapSlotLabel: { color: '#f4f7fb', fontSize: 12, fontWeight: '800' },
  mapSlotStatus: { color: '#b8c7da', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});
