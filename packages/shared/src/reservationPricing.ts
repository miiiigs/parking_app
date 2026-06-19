export type ReservationPricingConfig = {
  fee30Minutes: number;
  fee60Minutes: number;
  fee120Minutes: number;
};

export const DEFAULT_RESERVATION_PRICING: ReservationPricingConfig = {
  fee30Minutes: 25,
  fee60Minutes: 40,
  fee120Minutes: 60,
};

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeReservationPricingConfig(value: unknown): ReservationPricingConfig {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    fee30Minutes: Math.max(0, toFiniteNumber(raw.fee30Minutes, DEFAULT_RESERVATION_PRICING.fee30Minutes)),
    fee60Minutes: Math.max(0, toFiniteNumber(raw.fee60Minutes, DEFAULT_RESERVATION_PRICING.fee60Minutes)),
    fee120Minutes: Math.max(0, toFiniteNumber(raw.fee120Minutes, DEFAULT_RESERVATION_PRICING.fee120Minutes)),
  };
}

export function getReservationFeeForWindow(minutes: number, configInput: ReservationPricingConfig | unknown) {
  const config = normalizeReservationPricingConfig(configInput);

  if (minutes === 30) {
    return config.fee30Minutes;
  }

  if (minutes === 60) {
    return config.fee60Minutes;
  }

  if (minutes === 120) {
    return config.fee120Minutes;
  }

  return 0;
}

export function formatReservationPricingSummary(configInput: ReservationPricingConfig | unknown) {
  const config = normalizeReservationPricingConfig(configInput);

  return `30 min PHP ${config.fee30Minutes.toFixed(2)} | 1 hr PHP ${config.fee60Minutes.toFixed(2)} | 2 hrs PHP ${config.fee120Minutes.toFixed(2)}`;
}
