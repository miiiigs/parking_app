"use client";

import React, { useRef } from 'react';

import { buildRoadShape, type ParkingLotDefinition, type ParkingMapArrowDirection, type ParkingSlotStatus } from '../../lib/parkingMap';

type Props = {
  lot: ParkingLotDefinition;
  highlightedSlotId?: string | null;
  onSlotSelect?: (slotId: string) => void;
  showLegend?: boolean;
};

const slotTheme: Record<ParkingSlotStatus, { background: string; border: string; text: string }> = {
  available: { background: '#0c1a28', border: '#3dd6a5', text: '#3dd6a5' },
  reserved: { background: '#0d1a2a', border: '#7bd3ff', text: '#7bd3ff' },
  occupied: { background: '#23190c', border: '#ffb74d', text: '#ffb74d' },
  blocked: { background: '#281214', border: '#ff8a80', text: '#ff8a80' },
  disputed: { background: '#20142a', border: '#d1a3ff', text: '#d1a3ff' },
};

function directionGlyph(direction?: ParkingMapArrowDirection) {
  switch (direction) {
    case 'north':
      return '↑';
    case 'south':
      return '↓';
    case 'east':
      return '→';
    case 'west':
      return '←';
    case 'north-east':
      return '↗';
    case 'north-west':
      return '↖';
    case 'south-east':
      return '↘';
    case 'south-west':
      return '↙';
    default:
      return '→';
  }
}

function roadDirectionLabel(direction?: ParkingMapArrowDirection) {
  if (!direction) {
    return 'Drive';
  }

  return direction.replace('-', ' ');
}

export function ParkingMapCanvas({ lot, highlightedSlotId, onSlotSelect, showLegend = true }: Props) {
  return (
    <section style={styles.shell}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.kicker}>Parking Map</div>
          <h2 style={styles.title}>{lot.name}</h2>
        </div>
        {showLegend ? (
          <div style={styles.legendRow}>
            {Object.entries(slotTheme).map(([status, palette]) => (
              <span key={status} style={{ ...styles.legendPill, borderColor: palette.border, background: palette.background, color: palette.text }}>
                {status}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div style={styles.canvasWrap}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 999 }}>
            <button
              type="button"
              onClick={() => {
                const wrap = (document.querySelector('[data-admin-canvas-wrap]') as HTMLElement) ?? null;
                if (!wrap) return;
                const entry = lot.nodes.find((n) => n.kind === 'entry');
                if (!entry) return;
                const left = Math.max(0, entry.x - wrap.clientWidth / 2);
                const top = Math.max(0, entry.y - wrap.clientHeight * 0.75);
                wrap.scrollTo({ left, top, behavior: 'smooth' });
              }}
              style={{ background: '#0f1b2c', border: '1px solid #24415f', color: '#f4f7fb', padding: '8px 10px', borderRadius: 12, fontWeight: 800 }}
            >
              Recenter
            </button>
          </div>
        
        <div data-admin-canvas-wrap style={{ ...styles.canvas, width: lot.width, height: lot.height }}>
          <div style={styles.grid} />
          <div style={styles.asphaltGlow} />

          <svg width={lot.width} height={lot.height} style={styles.roadSvg}>
            {lot.roads.map((road) => {
              const shape = buildRoadShape(road);

              return (
                <g key={road.id}>
                  <path d={shape.d} fill="none" stroke="#0b1624" strokeWidth={shape.strokeWidth + 12} strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                  <path d={shape.d} fill="none" stroke="#17283d" strokeWidth={shape.strokeWidth + 4} strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                  <path d={shape.d} fill="none" stroke="#09111d" strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                  {shape.anchors.map((anchor, index) => (
                    <circle key={`${road.id}-anchor-${index}`} cx={anchor.x} cy={anchor.y} r={shape.strokeWidth * 0.22} fill="#0f1b2c" stroke="#7bd3ff" strokeWidth="2" />
                  ))}
                  {shape.bendHandles.map((handle, index) => (
                    <circle key={`${road.id}-bend-${index}`} cx={handle.x} cy={handle.y} r={10} fill="#3dd6a5" stroke="#0f1b2c" strokeWidth="3" opacity="0.95" />
                  ))}
                  <line x1={shape.labelX - 48} y1={shape.labelY} x2={shape.labelX + 48} y2={shape.labelY} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeLinecap="round" />
                </g>
              );
            })}
          </svg>

          {lot.roads.map((road) => {
            const shape = buildRoadShape(road);

            return (
              <div key={`${road.id}-label`} style={{ ...styles.roadLabelWrap, left: shape.labelX, top: shape.labelY }}>
                <span style={styles.roadLabel}>{road.label}</span>
                <span style={styles.roadGlyph}>{directionGlyph(road.direction)}</span>
              </div>
            );
          })}

          {lot.nodes.map((node) => (
            <div key={node.id} style={{ ...styles.node, left: node.x, top: node.y }}>
              <div style={styles.nodeDot} />
              <div>
                <div style={styles.nodeLabel}>{node.label}</div>
                <div style={styles.nodeMeta}>{roadDirectionLabel(node.direction)}</div>
              </div>
            </div>
          ))}

          {lot.arrows.map((arrow) => (
            <div key={arrow.id} style={{ ...styles.arrow, left: arrow.x, top: arrow.y, transform: `rotate(${arrow.rotation}deg)` }}>
              <span style={styles.arrowGlyph}>{directionGlyph(arrow.rotation >= 45 ? 'south' : arrow.rotation <= -45 ? 'north' : 'east')}</span>
              <span style={styles.arrowLabel}>{arrow.label}</span>
            </div>
          ))}

          {lot.slots.map((slot) => {
            const palette = slotTheme[slot.status];
            const isHighlighted = highlightedSlotId === slot.id;

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => onSlotSelect?.(slot.id)}
                style={{
                  ...styles.slot,
                  left: slot.x,
                  top: slot.y,
                  width: 92,
                  height: 76,
                  transform: `rotate(${slot.rotation}deg)`,
                  borderColor: palette.border,
                  background: palette.background,
                  color: palette.text,
                  boxShadow: isHighlighted ? `0 0 0 3px ${palette.border}40, 0 0 24px ${palette.border}20` : 'none',
                }}
              >
                <span style={styles.slotTop}>{slot.label}</span>
                <span style={styles.slotBottom}>{slot.status}</span>
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    borderRadius: 28,
    border: '1px solid #18283f',
    background: 'linear-gradient(180deg, rgba(15,27,44,0.95), rgba(8,17,29,0.98))',
    padding: 20,
    display: 'grid',
    gap: 16,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  kicker: {
    color: '#7bd3ff',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontSize: 12,
    fontWeight: 800,
  },
  title: {
    margin: '6px 0 0',
    fontSize: 24,
    lineHeight: 1.1,
  },
  legendRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  legendPill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  canvasWrap: {
    overflow: 'auto',
    borderRadius: 22,
    border: '1px solid #1a2c43',
    background: '#08111d',
    padding: 12,
  },
  canvas: {
    position: 'relative',
    background: 'radial-gradient(circle at 30% 20%, rgba(123,211,255,0.08), transparent 30%), linear-gradient(180deg, #08111d, #07101a)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    opacity: 0.35,
  },
  asphaltGlow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 50%, rgba(61,214,165,0.05), transparent 45%)',
  },
  road: {
    position: 'absolute',
    color: '#a9bdd6',
  },
  roadSvg: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  roadLabelWrap: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(15,27,44,0.88)',
    border: '1px solid rgba(123,211,255,0.22)',
    boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
  },
  roadLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 800,
  },
  roadGlyph: {
    fontSize: 18,
    fontWeight: 900,
    color: '#7bd3ff',
  },
  node: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 999,
    background: 'rgba(15,27,44,0.92)',
    border: '1px solid rgba(123,211,255,0.28)',
    boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
  },
  nodeDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#3dd6a5',
    boxShadow: '0 0 0 6px rgba(61,214,165,0.15)',
  },
  nodeLabel: {
    fontSize: 12,
    fontWeight: 800,
  },
  nodeMeta: {
    fontSize: 10,
    color: '#a9bdd6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  arrow: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 14,
    background: '#102033',
    border: '1px solid #24415f',
    color: '#7bd3ff',
  },
  arrowGlyph: {
    fontSize: 16,
    fontWeight: 900,
  },
  arrowLabel: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  slot: {
    position: 'absolute',
    border: '1px solid',
    borderRadius: 16,
    cursor: 'pointer',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    textAlign: 'left',
    outline: 'none',
  },
  slotTop: {
    fontSize: 13,
    fontWeight: 900,
  },
  slotBottom: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.92,
  },
};