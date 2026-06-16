import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import type { ParkingLotDefinition, ParkingMapNode, ParkingMapRoad, ParkingMapSlot, ParkingSlotStatus } from '../../../../../packages/shared/src/parkingMap';
import { applyLiveSlotStatuses, buildRoadShape, resolveRoadPoints } from '../../../../../packages/shared/src/parkingMap';
import { colors, radius, spacing, typography } from '../../theme/tokens';

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
  style?: StyleProp<ViewStyle>;
};

const CANVAS_PADDING = 72;
const GRID_SIZE = 80;
const MIN_SCALE = 0.05;
const MAX_SCALE = 2.1;
const TARGET_ENTRY_Y_RATIO = 0.44;
const FIT_PADDING = 40;
const NODE_CHIP_WIDTH = 112;
const NODE_CHIP_HALF_WIDTH = NODE_CHIP_WIDTH / 2;
const NODE_CHIP_HALF_HEIGHT = 18;
const DEFAULT_SLOT_WIDTH = 92;
const DEFAULT_SLOT_HEIGHT = 76;

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

function renderStatusLabel(status: ParkingSlotStatus) {
  if (status === 'available') return 'Open';
  if (status === 'reserved') return 'Reserved';
  if (status === 'occupied') return 'Occupied';
  if (status === 'blocked') return 'Blocked';
  return 'Disputed';
}

function getSlotColors(status: ParkingSlotStatus) {
  switch (status) {
    case 'available':
      return { fill: '#E7F7EF', border: '#1D8B67', label: '#14563F', statusText: '#1D8B67' };
    case 'reserved':
      return { fill: '#E8F1FF', border: '#2F6EE5', label: '#17419B', statusText: '#2F6EE5' };
    case 'occupied':
      return { fill: '#FFF1E5', border: '#D97706', label: '#92400E', statusText: '#B45309' };
    case 'blocked':
      return { fill: '#FDECEC', border: '#C24141', label: '#8A2727', statusText: '#C24141' };
    default:
      return { fill: '#F2EAFE', border: '#8B5CF6', label: '#5B21B6', statusText: '#7C3AED' };
  }
}

function getSlotVisualOffset(slot: Pick<ParkingMapSlot, 'x' | 'y' | 'width' | 'height' | 'rotation'>) {
  const slotWidth = slot.width ?? DEFAULT_SLOT_WIDTH;
  const slotHeight = slot.height ?? DEFAULT_SLOT_HEIGHT;

  if (slot.rotation === 0) {
    return { x: 0, y: 0 };
  }

  const center = {
    x: slot.x + slotWidth / 2,
    y: slot.y + slotHeight / 2,
  };
  const radians = (slot.rotation * Math.PI) / 180;
  const anchor =
    slot.rotation < 0
      ? { x: slot.x + slotWidth, y: slot.y + slotHeight / 2 }
      : { x: slot.x, y: slot.y + slotHeight / 2 };
  const offsetX = anchor.x - center.x;
  const offsetY = anchor.y - center.y;
  const rotatedAnchor = {
    x: center.x + offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
    y: center.y + offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
  };

  return {
    x: anchor.x - rotatedAnchor.x,
    y: anchor.y - rotatedAnchor.y,
  };
}

function getSlotLabelFontSize(width: number) {
  return Math.max(10, Math.min(14, Math.floor(width * 0.17)));
}

function getSlotStatusFontSize(width: number) {
  return Math.max(9, Math.min(11, Math.floor(width * 0.12)));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getCurrentAnimatedValue(value: Animated.Value) {
  return (value as unknown as { __getValue: () => number }).__getValue();
}

function rotatePoint(x: number, y: number, centerX: number, centerY: number, rotationDegrees: number) {
  if (!rotationDegrees) {
    return { x, y };
  }

  const radians = (rotationDegrees * Math.PI) / 180;
  const offsetX = x - centerX;
  const offsetY = y - centerY;

  return {
    x: centerX + offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
    y: centerY + offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
  };
}

function getSlotBounds(slot: ParkingMapSlot): Bounds {
  const slotWidth = slot.width ?? DEFAULT_SLOT_WIDTH;
  const slotHeight = slot.height ?? DEFAULT_SLOT_HEIGHT;
  const offset = getSlotVisualOffset(slot);
  const left = slot.x + offset.x;
  const top = slot.y + offset.y;
  const centerX = left + slotWidth / 2;
  const centerY = top + slotHeight / 2;
  const corners = [
    rotatePoint(left, top, centerX, centerY, slot.rotation),
    rotatePoint(left + slotWidth, top, centerX, centerY, slot.rotation),
    rotatePoint(left + slotWidth, top + slotHeight, centerX, centerY, slot.rotation),
    rotatePoint(left, top + slotHeight, centerX, centerY, slot.rotation),
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxX = Math.max(...corners.map((point) => point.x));
  const maxY = Math.max(...corners.map((point) => point.y));

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildBounds(points: Array<{ x: number; y: number }>, fallback: Bounds): Bounds {
  if (points.length === 0) {
    return fallback;
  }

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function ParkingLotLayoutMap({ lot, slots, selectedSlotId, onSelectSlot, style }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const viewportHeight = Math.max(360, Math.min(540, screenHeight * 0.54));
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
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

  const rawBounds = useMemo(() => {
    const points: Array<{ x: number; y: number }> = [];
    const fallback: Bounds = {
      minX: 0,
      minY: 0,
      maxX: Math.max(mergedLot.width, 1),
      maxY: Math.max(mergedLot.height, 1),
      centerX: Math.max(mergedLot.width, 1) / 2,
      centerY: Math.max(mergedLot.height, 1) / 2,
      width: Math.max(mergedLot.width, 1),
      height: Math.max(mergedLot.height, 1),
    };

    mergedLot.slots.forEach((slot) => {
      const bounds = getSlotBounds(slot);
      points.push(
        { x: bounds.minX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.maxY },
      );
    });

    mergedLot.nodes.forEach((node) => {
      points.push(
        { x: node.x - NODE_CHIP_HALF_WIDTH, y: node.y - NODE_CHIP_HALF_HEIGHT },
        { x: node.x + NODE_CHIP_HALF_WIDTH, y: node.y + NODE_CHIP_HALF_HEIGHT },
      );
    });

    mergedLot.roads.forEach((road) => {
      const roadStrokeInset = buildRoadShape(road).strokeWidth / 2 + 8;
      resolveRoadPoints(road).forEach((point) => {
        points.push(
          { x: point.x - roadStrokeInset, y: point.y - roadStrokeInset },
          { x: point.x + roadStrokeInset, y: point.y + roadStrokeInset },
        );
      });
    });

    return buildBounds(points, fallback);
  }, [mergedLot]);

  const renderOrigin = useMemo(
    () => ({
      x: rawBounds.minX - CANVAS_PADDING,
      y: rawBounds.minY - CANVAS_PADDING,
    }),
    [rawBounds.minX, rawBounds.minY],
  );
  const worldWidth = Math.max(1, rawBounds.width + CANVAS_PADDING * 2);
  const worldHeight = Math.max(1, rawBounds.height + CANVAS_PADDING * 2);
  const contentBounds = useMemo(
    () => ({
      minX: CANVAS_PADDING,
      minY: CANVAS_PADDING,
      maxX: worldWidth - CANVAS_PADDING,
      maxY: worldHeight - CANVAS_PADDING,
      centerX: worldWidth / 2,
      centerY: worldHeight / 2,
      width: Math.max(1, worldWidth - CANVAS_PADDING * 2),
      height: Math.max(1, worldHeight - CANVAS_PADDING * 2),
    }),
    [worldHeight, worldWidth],
  );
  const entryNode = mergedLot.nodes.find((node: ParkingMapNode) => node.kind === 'entry') ?? mergedLot.nodes[0];
  const entryGate = entryNode
    ? { x: entryNode.x - renderOrigin.x, y: entryNode.y - renderOrigin.y }
    : { x: contentBounds.centerX, y: contentBounds.centerY };
  const viewportWidth = frameSize.width || screenWidth;
  const frameHeight = frameSize.height || viewportHeight;
  const fitScale = useMemo(() => {
    const horizontal = Math.max(1, viewportWidth - FIT_PADDING) / Math.max(worldWidth, 1);
    const vertical = Math.max(1, frameHeight - FIT_PADDING) / Math.max(worldHeight, 1);
    return clamp(Number(Math.min(horizontal, vertical).toFixed(3)), MIN_SCALE, 1.25);
  }, [frameHeight, viewportWidth, worldHeight, worldWidth]);
  const entryScale = useMemo(() => {
    return clamp(Number(Math.max(fitScale * 1.65, 0.65).toFixed(3)), fitScale, 1.15);
  }, [fitScale]);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const startOffset = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(fitScale);

  function getScaledWorldPoint(point: { x: number; y: number }, targetScale: number) {
    return {
      x: ((1 - targetScale) * worldWidth) / 2 + point.x * targetScale,
      y: ((1 - targetScale) * worldHeight) / 2 + point.y * targetScale,
    };
  }

  function centerAt(
    targetScale: number,
    focus = entryGate,
    targetScreenPoint = { x: viewportWidth / 2, y: frameHeight * TARGET_ENTRY_Y_RATIO },
  ) {
    const scaledPoint = getScaledWorldPoint(focus, targetScale);
    const nextX = targetScreenPoint.x - scaledPoint.x;
    const nextY = targetScreenPoint.y - scaledPoint.y;
    pan.setValue({ x: nextX, y: nextY });
    startOffset.current = { x: nextX, y: nextY };
  }

  useEffect(() => {
    setScale(fitScale);
    centerAt(fitScale, { x: contentBounds.centerX, y: contentBounds.centerY }, { x: viewportWidth / 2, y: frameHeight / 2 });
  }, [contentBounds.centerX, contentBounds.centerY, fitScale, viewportWidth, frameHeight, worldWidth, worldHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          startOffset.current = {
            x: getCurrentAnimatedValue(pan.x),
            y: getCurrentAnimatedValue(pan.y),
          };
        },
        onPanResponderMove: (_, gestureState) => {
          pan.setValue({
            x: startOffset.current.x + gestureState.dx,
            y: startOffset.current.y + gestureState.dy,
          });
        },
        onPanResponderRelease: () => {
          startOffset.current = {
            x: getCurrentAnimatedValue(pan.x),
            y: getCurrentAnimatedValue(pan.y),
          };
        },
      }),
    [pan],
  );

  function changeScale(delta: number) {
    const nextScale = clamp(Number((scale + delta).toFixed(3)), MIN_SCALE, MAX_SCALE);
    const currentPanX = getCurrentAnimatedValue(pan.x);
    const currentPanY = getCurrentAnimatedValue(pan.y);
    const focus = {
      x: (viewportWidth / 2 - currentPanX - ((1 - scale) * worldWidth) / 2) / scale,
      y: (frameHeight / 2 - currentPanY - ((1 - scale) * worldHeight) / 2) / scale,
    };
    setScale(nextScale);
    centerAt(nextScale, focus, { x: viewportWidth / 2, y: frameHeight / 2 });
  }

  function handleCanvasLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;

    setFrameSize((current) => {
      if (Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1) {
        return current;
      }

      return {
        width,
        height,
      };
    });
  }

  return (
    <View style={[styles.viewport, { minHeight: viewportHeight }, style]}>
      <View style={styles.hud} pointerEvents="box-none">
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlButton} onPress={() => changeScale(0.14)}>
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButtonWide}
            onPress={() => {
              setScale(entryScale);
              centerAt(entryScale, entryGate, { x: viewportWidth / 2, y: frameHeight * TARGET_ENTRY_Y_RATIO });
            }}
          >
            <Text style={styles.controlButtonLabel}>Entry View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButtonWide}
            onPress={() => {
              setScale(fitScale);
              centerAt(fitScale, { x: contentBounds.centerX, y: contentBounds.centerY }, { x: viewportWidth / 2, y: frameHeight / 2 });
            }}
          >
            <Text style={styles.controlButtonLabel}>Fit Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => changeScale(-0.14)}>
            <Text style={styles.controlButtonText}>-</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>Drag to explore the lot. Tap an open slot to reserve it.</Text>
          <Text style={styles.zoomPill}>{Math.round(scale * 100)}%</Text>
        </View>
      </View>

      <View style={styles.canvasFrame} onLayout={handleCanvasLayout} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.canvasPanLayer,
            {
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
            },
          ]}
        >
          <View
            style={[
              styles.canvasScaleLayer,
              {
                width: worldWidth,
                height: worldHeight,
                transform: [{ scale }],
              },
            ]}
          >
            <View style={styles.backdrop} />

            <Svg width={worldWidth} height={worldHeight} style={styles.svgLayer}>
              {Array.from({ length: Math.ceil(worldWidth / GRID_SIZE) + 1 }).map((_, index) => (
                <Line
                  key={`grid-x-${index}`}
                  x1={index * GRID_SIZE}
                  y1={0}
                  x2={index * GRID_SIZE}
                  y2={worldHeight}
                  stroke="#E7EFEA"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: Math.ceil(worldHeight / GRID_SIZE) + 1 }).map((_, index) => (
                <Line
                  key={`grid-y-${index}`}
                  x1={0}
                  y1={index * GRID_SIZE}
                  x2={worldWidth}
                  y2={index * GRID_SIZE}
                  stroke="#E7EFEA"
                  strokeWidth={1}
                />
              ))}

              {mergedLot.roads.map((road: ParkingMapRoad) => {
                const shape = buildRoadShape(road);
                const offsetPath = shape.d.replace(
                  /([0-9]+(?:\.[0-9]+)?) ([0-9]+(?:\.[0-9]+)?)/g,
                  (_, x, y) => `${Number(x) - renderOrigin.x} ${Number(y) - renderOrigin.y}`,
                );
                return (
                  <React.Fragment key={road.id}>
                    <Path
                      d={offsetPath}
                      stroke="#B7C6BC"
                      strokeWidth={shape.strokeWidth + 8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <Path
                      d={offsetPath}
                      stroke="#DCE6E0"
                      strokeWidth={shape.strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <Path
                      d={offsetPath}
                      stroke="#FFFFFF"
                      strokeWidth={2.5}
                      strokeDasharray="16 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.95}
                      fill="none"
                    />
                  </React.Fragment>
                );
              })}
            </Svg>

            {mergedLot.nodes.map((node: ParkingMapNode) => {
              const tone =
                node.kind === 'entry'
                  ? styles.nodeEntry
                  : node.kind === 'exit'
                    ? styles.nodeExit
                    : styles.nodeJunction;

              return (
                <View
                  key={node.id}
                  pointerEvents="none"
                  style={[
                    styles.nodeChip,
                    tone,
                    {
                      left: node.x - renderOrigin.x - NODE_CHIP_HALF_WIDTH,
                      top: node.y - renderOrigin.y - NODE_CHIP_HALF_HEIGHT,
                    },
                  ]}
                >
                  <Text style={styles.nodeText}>{node.label}</Text>
                </View>
              );
            })}

            {mergedLot.slots.map((slot: ParkingMapSlot) => {
              const slotWidth = slot.width ?? DEFAULT_SLOT_WIDTH;
              const slotHeight = slot.height ?? DEFAULT_SLOT_HEIGHT;
              const offset = getSlotVisualOffset(slot);
              const isSelected = slot.id === selectedSlotId;
              const isSelectable = slot.status === 'available';
              const slotColors = getSlotColors(slot.status);
              const labelFontSize = getSlotLabelFontSize(slotWidth);
              const statusFontSize = getSlotStatusFontSize(slotWidth);

              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slot,
                    {
                      width: slotWidth,
                      height: slotHeight,
                      left: slot.x - renderOrigin.x + offset.x,
                      top: slot.y - renderOrigin.y + offset.y,
                      backgroundColor: slotColors.fill,
                      borderColor: isSelected ? colors.primaryDark : slotColors.border,
                      transform: [{ rotate: `${slot.rotation}deg` }],
                    },
                    isSelected ? styles.slotSelected : null,
                  ]}
                  disabled={!isSelectable}
                  onPress={() => {
                    if (isSelectable) {
                      onSelectSlot(slot.id);
                    }
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.slotLabel,
                      {
                        color: slotColors.label,
                        fontSize: labelFontSize,
                      },
                    ]}
                  >
                    {slot.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.slotStatus,
                      {
                        color: slotColors.statusText,
                        fontSize: statusFontSize,
                      },
                    ]}
                  >
                    {renderStatusLabel(slot.status)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F7FBF8',
  },
  hud: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: spacing.md,
    zIndex: 10,
    gap: spacing.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  controlButton: {
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  controlButtonWide: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  controlButtonText: {
    color: colors.text,
    fontSize: typography.section,
    fontWeight: '800',
  },
  controlButtonLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hintText: {
    flex: 1,
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  zoomPill: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: '700',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  canvasFrame: {
    flex: 1,
    overflow: 'hidden',
  },
  canvasPanLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  canvasScaleLayer: {
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FCF9',
  },
  svgLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  nodeChip: {
    position: 'absolute',
    minWidth: NODE_CHIP_WIDTH,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nodeEntry: {
    backgroundColor: '#E7F7EF',
    borderColor: '#A7D5BE',
  },
  nodeExit: {
    backgroundColor: '#FCEBEB',
    borderColor: '#E8B5B5',
  },
  nodeJunction: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  nodeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  slot: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  slotSelected: {
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  slotLabel: {
    fontWeight: '800',
  },
  slotStatus: {
    fontWeight: '700',
  },
});
