// Centralized number/currency/percent formatting

export function fmtNum(n: number | null | undefined, opts: { decimals?: number; compact?: boolean } = {}): string {
  if (n === null || n === undefined || !isFinite(n as number)) return '0';
  const { decimals = 0, compact = false } = opts;
  const num = Number(n);
  if (compact && Math.abs(num) >= 1000) {
    if (Math.abs(num) >= 1e7) return (num / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
    if (Math.abs(num) >= 1e5) return (num / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2).replace(/\.?0+$/, '') + 'K';
  }
  return num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtCur(n: number | null | undefined, opts: { compact?: boolean; decimals?: number } = {}): string {
  return '₹' + fmtNum(n, opts);
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || !isFinite(n as number)) return '0%';
  return (Number(n) * 100).toFixed(decimals) + '%';
}

// CTR/hook/hold are stored as percent already (e.g., 2.58 means 2.58%)
export function fmtPctRaw(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || !isFinite(n as number)) return '0%';
  return Number(n).toFixed(decimals) + '%';
}

export function fmtRatio(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || !isFinite(n as number)) return '0.00';
  return Number(n).toFixed(decimals);
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateShort(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}
