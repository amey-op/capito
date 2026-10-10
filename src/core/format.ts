/** Display formatting. Western digits, Indian grouping (12,34,567), ₹ sign. */

const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** ₹1,23,456 (rounded to whole rupees unless `decimals` is set). */
export function formatINR(amount: number, decimals = 0): string {
  if (!Number.isFinite(amount)) return '₹–';
  const sign = amount < 0 ? '−' : '';
  const abs = Math.abs(amount);
  const body =
    decimals > 0
      ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(abs)
      : inr0.format(Math.round(abs));
  return `${sign}₹${body}`;
}

/** Signed change for outcome cards: +₹600 / −₹1,500. */
export function formatINRDelta(amount: number): string {
  if (amount === 0) return '₹0';
  return amount > 0 ? `+${formatINR(amount)}` : formatINR(amount);
}

/**
 * Compact lakh/crore form: ₹41.79 lakh, ₹3.5 crore. Below one lakh it falls back to formatINR.
 * The words stay English in every language (bank forms use them).
 */
export function formatINRCompact(amount: number): string {
  if (!Number.isFinite(amount)) return '₹–';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${inr2.format(abs / 1e7)} crore`;
  if (abs >= 1e5) return `${sign}₹${inr2.format(abs / 1e5)} lakh`;
  return formatINR(amount);
}

/** 6.5 → "6.5%" */
export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '–';
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals }).format(value)}%`;
}
