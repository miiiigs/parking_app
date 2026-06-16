export type ParkingPricingMode = 'flat_rate' | 'fixed_rate' | 'tiered';

export type ParkingPricingConfig = {
  mode: ParkingPricingMode;
  flatRateAmount: number;
  fixedHourlyRate: number;
  firstPeriodHours: number;
  firstPeriodRate: number;
  succeedingHourlyRate: number;
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
  fixedHourlyRate: 50,
  firstPeriodHours: 3,
  firstPeriodRate: 50,
  succeedingHourlyRate: 20,
  entryGraceMinutes: 15,
  exitGraceMinutes: 15,
};

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toInteger(value: unknown, fallback: number) {
  return Math.max(0, Math.round(toFiniteNumber(value, fallback)));
}

export function normalizeParkingPricingConfig(value: unknown): ParkingPricingConfig {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const mode = raw.mode;

  return {
    mode: mode === 'flat_rate' || mode === 'fixed_rate' || mode === 'tiered' ? mode : DEFAULT_PARKING_PRICING.mode,
    flatRateAmount: Math.max(0, toFiniteNumber(raw.flatRateAmount, DEFAULT_PARKING_PRICING.flatRateAmount)),
    fixedHourlyRate: Math.max(0, toFiniteNumber(raw.fixedHourlyRate, DEFAULT_PARKING_PRICING.fixedHourlyRate)),
    firstPeriodHours: Math.max(1, toInteger(raw.firstPeriodHours, DEFAULT_PARKING_PRICING.firstPeriodHours)),
    firstPeriodRate: Math.max(0, toFiniteNumber(raw.firstPeriodRate, DEFAULT_PARKING_PRICING.firstPeriodRate)),
    succeedingHourlyRate: Math.max(0, toFiniteNumber(raw.succeedingHourlyRate, DEFAULT_PARKING_PRICING.succeedingHourlyRate)),
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

  return config.fixedHourlyRate;
}

export function formatParkingPricingSummary(configInput: ParkingPricingConfig | unknown) {
  const config = normalizeParkingPricingConfig(configInput);

  if (config.mode === 'flat_rate') {
    return `Flat rate PHP ${config.flatRateAmount.toFixed(2)}`;
  }

  if (config.mode === 'tiered') {
    return `PHP ${config.firstPeriodRate.toFixed(2)} first ${config.firstPeriodHours}h, then PHP ${config.succeedingHourlyRate.toFixed(2)}/hr`;
  }

  return `PHP ${config.fixedHourlyRate.toFixed(2)}/hr`;
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
    const firstPeriodMinutes = config.firstPeriodHours * 60;
    const extraMinutes = Math.max(0, billableMinutes - firstPeriodMinutes);
    const extraHours = extraMinutes > 0 ? Math.ceil(extraMinutes / 60) : 0;
    const amount = config.firstPeriodRate + extraHours * config.succeedingHourlyRate;

    return {
      amount: Number(amount.toFixed(2)),
      billableMinutes,
      graceMinutes: config.entryGraceMinutes,
      graceRemainingSeconds,
      currentTierLabel: extraHours > 0 ? 'Succeeding rate' : `First ${config.firstPeriodHours} hours`,
    };
  }

  const chargedHours = Math.max(1, Math.ceil(Math.max(1, billableMinutes) / 60));
  const amount = chargedHours * config.fixedHourlyRate;

  return {
    amount: Number(amount.toFixed(2)),
    billableMinutes,
    graceMinutes: config.entryGraceMinutes,
    graceRemainingSeconds,
    currentTierLabel: chargedHours > 1 ? `${chargedHours} hours billed` : 'First hour billed',
  };
}
