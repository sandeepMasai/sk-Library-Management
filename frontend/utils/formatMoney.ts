/** Format INR amount returned from API (already in rupees). */
export function formatInr(rupees: number, opts?: { decimals?: number }) {
  const n = Number(rupees || 0);
  const decimals = opts?.decimals ?? (Number.isInteger(n) ? 0 : 2);
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
