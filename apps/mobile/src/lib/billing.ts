const INITIAL_PARKING_FEE = 50;
const INCLUDED_PARKING_MINUTES = 180;
const SUCCEEDING_HOURLY_FEE = 20;

export type ParkingBillBreakdown = {
  elapsedMinutes: number;
  parkingFee: number;
  reservationFee: number;
  total: number;
};

export function getElapsedMinutes(startedAt: string | null | undefined, now: Date = new Date()) {
  if (!startedAt) {
    return 0;
  }

  const startedTime = new Date(startedAt).getTime();
  const nowTime = now.getTime();
  if (Number.isNaN(startedTime) || Number.isNaN(nowTime) || nowTime <= startedTime) {
    return 0;
  }

  return Math.max(1, Math.floor((nowTime - startedTime) / 60000));
}

export function calculateParkingFee(elapsedMinutes: number) {
  const safeElapsedMinutes = Math.max(0, elapsedMinutes);

  if (safeElapsedMinutes <= 0) {
    return INITIAL_PARKING_FEE;
  }

  if (safeElapsedMinutes <= INCLUDED_PARKING_MINUTES) {
    return INITIAL_PARKING_FEE;
  }

  const overageMinutes = safeElapsedMinutes - INCLUDED_PARKING_MINUTES;
  const extraHours = Math.ceil(overageMinutes / 60);

  return INITIAL_PARKING_FEE + extraHours * SUCCEEDING_HOURLY_FEE;
}

export function buildParkingBillBreakdown({
  startedAt,
  reservationFee,
  now = new Date(),
}: {
  startedAt: string | null | undefined;
  reservationFee: number;
  now?: Date;
}): ParkingBillBreakdown {
  const elapsedMinutes = getElapsedMinutes(startedAt, now);
  const parkingFee = calculateParkingFee(elapsedMinutes);

  return {
    elapsedMinutes,
    parkingFee,
    reservationFee,
    total: reservationFee + parkingFee,
  };
}

export function formatElapsedTime(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

export function formatSecondsToHMS(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}
