import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateParkingCharge, formatParkingPricingSummary } from '../../../packages/shared/src/parkingPricing.ts';

test('fixed pricing supports custom billing intervals', () => {
  const quote = calculateParkingCharge(45 * 60, {
    mode: 'fixed_rate',
    flatRateAmount: 0,
    fixedRateAmount: 25,
    fixedRateIntervalMinutes: 30,
    firstPeriodMinutes: 180,
    firstPeriodRate: 0,
    succeedingRateAmount: 0,
    succeedingRateIntervalMinutes: 60,
    entryGraceMinutes: 0,
    exitGraceMinutes: 0,
  });

  assert.equal(quote.amount, 50);
});

test('tiered pricing supports custom first and succeeding intervals', () => {
  const quote = calculateParkingCharge(100 * 60, {
    mode: 'tiered',
    flatRateAmount: 0,
    fixedRateAmount: 0,
    fixedRateIntervalMinutes: 60,
    firstPeriodMinutes: 90,
    firstPeriodRate: 70,
    succeedingRateAmount: 25,
    succeedingRateIntervalMinutes: 30,
    entryGraceMinutes: 0,
    exitGraceMinutes: 0,
  });

  assert.equal(quote.amount, 95);
  assert.equal(formatParkingPricingSummary({
    mode: 'tiered',
    flatRateAmount: 0,
    fixedRateAmount: 0,
    fixedRateIntervalMinutes: 60,
    firstPeriodMinutes: 90,
    firstPeriodRate: 70,
    succeedingRateAmount: 25,
    succeedingRateIntervalMinutes: 30,
    entryGraceMinutes: 0,
    exitGraceMinutes: 0,
  }), 'PHP 70.00 first 90 min, then PHP 25.00/30 min');
});
