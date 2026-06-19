export type ParkingPricingMode = 'flat_rate' | 'fixed_rate' | 'tiered';

export type ParkingPricingConfig = {
  mode: ParkingPricingMode;
  flatRateAmount: number;
  fixedRateAmount: number;
  fixedRateIntervalMinutes: number;
  firstPeriodMinutes: number;
  firstPeriodRate: number;
  succeedingRateAmount: number;
  succeedingRateIntervalMinutes: number;
  entryGraceMinutes: number;
  exitGraceMinutes: number;
};

export type ParkingChargeQuote = {
  amount: number;
  billableMinutes: number;
  graceMinutes: number;
  graceRemainingSeconds: number;
  currentTierLabel: string;
};

export const DEFAULT_PARKING_PRICING: ParkingPricingConfig = {
  mode: 'fixed_rate',
  flatRateAmount: 50,
  fixedRateAmount: 50,
  fixedRateIntervalMinutes: 60,
  firstPeriodMinutes: 180,
  firstPeriodRate: 50,
  succeedingRateAmount: 20,
  succeedingRateIntervalMinutes: 60,
  entryGraceMinutes: 15,
  exitGraceMinutes: 15,
};

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toInteger(value: unknown, fallback: number) {
  return Math.max(0, Math.round(toFiniteNumber(value, fallback)));
}

function toPositiveInteger(value: unknown, fallback: number) {
  return Math.max(1, Math.round(toFiniteNumber(value, fallback)));
}

function formatMinutesLabel(minutes: number) {
  if (minutes === 60) {
    return '1 hr';
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }

  return `${minutes} min`;
}

export function normalizeParkingPricingConfig(value: unknown): ParkingPricingConfig {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const mode = raw.mode;
  const legacyFirstPeriodHours = toPositiveInteger(raw.firstPeriodHours, DEFAULT_PARKING_PRICING.firstPeriodMinutes / 60);

  return {
    mode: mode === 'flat_rate' || mode === 'fixed_rate' || mode === 'tiered' ? mode : DEFAULT_PARKING_PRICING.mode,
    flatRateAmount: Math.max(0, toFiniteNumber(raw.flatRateAmount, DEFAULT_PARKING_PRICING.flatRateAmount)),
    fixedRateAmount: Math.max(
      0,
      toFiniteNumber(
        raw.fixedRateAmount,
        toFiniteNumber(raw.fixedHourlyRate, DEFAULT_PARKING_PRICING.fixedRateAmount),
      ),
    ),
    fixedRateIntervalMinutes: toPositiveInteger(raw.fixedRateIntervalMinutes, DEFAULT_PARKING_PRICING.fixedRateIntervalMinutes),
    firstPeriodMinutes: toPositiveInteger(
      raw.firstPeriodMinutes,
      legacyFirstPeriodHours * 60,
    ),
    firstPeriodRate: Math.max(0, toFiniteNumber(raw.firstPeriodRate, DEFAULT_PARKING_PRICING.firstPeriodRate)),
    succeedingRateAmount: Math.max(
      0,
      toFiniteNumber(
        raw.succeedingRateAmount,
        toFiniteNumber(raw.succeedingHourlyRate, DEFAULT_PARKING_PRICING.succeedingRateAmount),
      ),
    ),
    succeedingRateIntervalMinutes: toPositiveInteger(
      raw.succeedingRateIntervalMinutes,
      DEFAULT_PARKING_PRICING.succeedingRateIntervalMinutes,
    ),
    entryGraceMinutes: Math.max(0, toInteger(raw.entryGraceMinutes, DEFAULT_PARKING_PRICING.entryGraceMinutes)),
    exitGraceMinutes: Math.max(0, toInteger(raw.exitGraceMinutes, DEFAULT_PARKING_PRICING.exitGraceMinutes)),
  };
}

export function getParkingPricingBaseAmount(config: ParkingPricingConfig) {
  if (config.mode === 'flat_rate') {
    return config.flatRateAmount;
  }

  if (config.mode === 'tiered') {
    return config.firstPeriodRate;
  }

  return config.fixedRateAmount;
}

export function formatParkingPricingSummary(configInput: ParkingPricingConfig | unknown) {
  const config = normalizeParkingPricingConfig(configInput);

  if (config.mode === 'flat_rate') {
    return `Flat rate PHP ${config.flatRateAmount.toFixed(2)}`;
  }

  if (config.mode === 'tiered') {
    return `PHP ${config.firstPeriodRate.toFixed(2)} first ${formatMinutesLabel(config.firstPeriodMinutes)}, then PHP ${config.succeedingRateAmount.toFixed(2)}/${formatMinutesLabel(config.succeedingRateIntervalMinutes)}`;
  }

  return `PHP ${config.fixedRateAmount.toFixed(2)}/${formatMinutesLabel(config.fixedRateIntervalMinutes)}`;
}

export function calculateParkingCharge(durationSeconds: number, configInput: ParkingPricingConfig | unknown): ParkingChargeQuote {
  const config = normalizeParkingPricingConfig(configInput);
  const elapsedSeconds = Math.max(0, Math.floor(durationSeconds));
  const graceSeconds = config.entryGraceMinutes * 60;
  const graceRemainingSeconds = Math.max(0, graceSeconds - elapsedSeconds);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const billableMinutes = Math.max(0, elapsedMinutes - config.entryGraceMinutes);

  if (config.mode === 'flat_rate') {
    return {
      amount: Number(config.flatRateAmount.toFixed(2)),
      billableMinutes,
      graceMinutes: config.entryGraceMinutes,
      graceRemainingSeconds,
      currentTierLabel: 'Flat rate',
    };
  }

  if (config.mode === 'tiered') {
    const extraMinutes = Math.max(0, billableMinutes - config.firstPeriodMinutes);
    const extraUnits = extraMinutes > 0 ? Math.ceil(extraMinutes / config.succeedingRateIntervalMinutes) : 0;
    const amount = config.firstPeriodRate + extraUnits * config.succeedingRateAmount;

    return {
      amount: Number(amount.toFixed(2)),
      billableMinutes,
      graceMinutes: config.entryGraceMinutes,
      graceRemainingSeconds,
      currentTierLabel: extraUnits > 0 ? `Succeeding ${formatMinutesLabel(config.succeedingRateIntervalMinutes)}` : `First ${formatMinutesLabel(config.firstPeriodMinutes)}`,
    };
  }

  const chargedUnits = Math.max(1, Math.ceil(Math.max(1, billableMinutes) / config.fixedRateIntervalMinutes));
  const amount = chargedUnits * config.fixedRateAmount;

  return {
    amount: Number(amount.toFixed(2)),
    billableMinutes,
    graceMinutes: config.entryGraceMinutes,
    graceRemainingSeconds,
    currentTierLabel:
      chargedUnits > 1
        ? `${chargedUnits} x ${formatMinutesLabel(config.fixedRateIntervalMinutes)} billed`
        : `First ${formatMinutesLabel(config.fixedRateIntervalMinutes)} billed`,
  };
}
