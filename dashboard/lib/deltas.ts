// Compute % deltas + significance + direction coloring

export type DeltaDirection = 'up-good' | 'up-bad' | 'down-good' | 'down-bad' | 'neutral';

export interface Delta {
  pct: number;        // -1 to +Infinity
  significant: boolean;
  direction: DeltaDirection;
}

// Metrics where higher is better (positive direction is green)
const HIGHER_IS_BETTER = new Set([
  'spend_no', 'revenue', 'roas', 'purchases', 'aov', 'ctr_link', 'ctr_all',
  'hook_rate', 'hold_rate', 'thru_plays', 'reach', 'impressions',
  'link_clicks', 'landing_page_views', 'adds_to_cart', 'checkouts_initiated',
  'adds_payment_info', 'performance_score', 'video_plays', 'video_3sec_plays',
  'frequency_no'
]);
// Metrics where lower is better (positive direction is red)
const LOWER_IS_BETTER = new Set([
  'cpm', 'cpc', 'cost_per_purchase', 'cost_per_result', 'fatigue_score', 'frequency'
]);

export function computeDelta(curr: number, prev: number, metric: string, sampleSize = 0): Delta {
  if (!isFinite(curr) || !isFinite(prev) || prev === 0) {
    return { pct: 0, significant: false, direction: 'neutral' };
  }
  const pct = (curr - prev) / Math.abs(prev);

  // Simple significance heuristic: >5% change AND meaningful sample size
  const significant = Math.abs(pct) >= 0.05 && sampleSize >= 50;

  let direction: DeltaDirection = 'neutral';
  if (HIGHER_IS_BETTER.has(metric)) {
    direction = pct > 0 ? 'up-good' : 'down-bad';
  } else if (LOWER_IS_BETTER.has(metric)) {
    direction = pct > 0 ? 'up-bad' : 'down-good';
  } else {
    direction = pct > 0 ? 'up-good' : 'down-bad';
  }
  if (Math.abs(pct) < 0.01) direction = 'neutral';
  return { pct, significant, direction };
}

export function deltaColorClass(d: Delta): string {
  if (!d.significant && Math.abs(d.pct) < 0.05) return 'text-slate-400';
  switch (d.direction) {
    case 'up-good':
    case 'down-good':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'up-bad':
    case 'down-bad':
      return 'text-rose-600 dark:text-rose-400';
    default:
      return 'text-slate-400';
  }
}

export function deltaArrow(d: Delta): string {
  if (Math.abs(d.pct) < 0.005) return '→';
  return d.pct > 0 ? '↑' : '↓';
}

export function deltaText(d: Delta): string {
  const sign = d.pct >= 0 ? '+' : '';
  return `${sign}${(d.pct * 100).toFixed(1)}%`;
}
