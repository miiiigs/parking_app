export function getRouteParam(value: string | string[] | undefined, fallback = '') {
  if (typeof value === 'string') {
    return value;
  }

  return fallback;
}

export function extractPhoneDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function formatPhoneInput(value: string) {
  const digits = extractPhoneDigits(value);
  const first = digits.slice(0, 3);
  const second = digits.slice(3, 6);
  const third = digits.slice(6, 10);

  return [first, second, third].filter(Boolean).join(' ');
}

export function formatPhilippinePhoneE164(value: string) {
  const digits = extractPhoneDigits(value);

  if (!digits) {
    return '';
  }

  return `+63${digits}`;
}

export function formatPhilippinePhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^63/, '').slice(-10);
  const first = digits.slice(0, 3);
  const second = digits.slice(3, 6);
  const third = digits.slice(6, 10);
  return ['+63', first, second, third].filter(Boolean).join(' ');
}
