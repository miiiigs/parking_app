export function formatCurrency(amount: number | string, opts?: { cents?: boolean; currency?: string }) {
  const currency = opts?.currency ?? 'PHP';
  const cents = opts?.cents ?? false; // default: amount already in pesos
  const num = typeof amount === 'string' ? Number(amount || 0) : (amount ?? 0);
  const value = cents ? num / 100 : num;
  try {
    return value.toLocaleString('en-PH', { style: 'currency', currency });
  } catch (err) {
    return `₱${value.toFixed(cents ? 2 : 0)}`;
  }
}

export default formatCurrency;
