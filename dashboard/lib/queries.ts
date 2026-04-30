import { createServerSupabase } from './supabase-server';

export interface DateWindow {
  start: string;
  end: string;
}

export function previousWindow(w: DateWindow): DateWindow {
  const start = new Date(w.start);
  const end = new Date(w.end);
  const len = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (len - 1));
  return { start: prevStart.toISOString().slice(0, 10), end: prevEnd.toISOString().slice(0, 10) };
}

export function defaultWindow(days = 7): DateWindow {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function sumRows(rows: any[]): any {
  const t: any = {
    spend: 0, impressions: 0, reach: 0, clicks_all: 0, link_clicks: 0,
    outbound_clicks: 0, landing_page_views: 0, adds_to_cart: 0,
    checkouts_initiated: 0, adds_payment_info: 0, purchases: 0,
    revenue: 0, video_plays: 0, video_3sec_plays: 0, thru_plays: 0,
  };
  for (const r of rows) {
    for (const k of Object.keys(t)) t[k] += Number(r[k] || 0);
  }
  t.cpm = t.impressions > 0 ? (t.spend * 1000) / t.impressions : 0;
  t.cpc = t.link_clicks > 0 ? t.spend / t.link_clicks : 0;
  t.ctr_link = t.impressions > 0 ? (t.link_clicks / t.impressions) * 100 : 0;
  t.ctr_all = t.impressions > 0 ? (t.clicks_all / t.impressions) * 100 : 0;
  t.frequency = t.reach > 0 ? t.impressions / t.reach : 0;
  t.roas = t.spend > 0 ? t.revenue / t.spend : 0;
  t.cost_per_purchase = t.purchases > 0 ? t.spend / t.purchases : 0;
  t.aov = t.purchases > 0 ? t.revenue / t.purchases : 0;
  t.atc_rate = t.landing_page_views > 0 ? t.adds_to_cart / t.landing_page_views : 0;
  t.checkout_rate = t.adds_to_cart > 0 ? t.checkouts_initiated / t.adds_to_cart : 0;
  t.payment_info_rate = t.checkouts_initiated > 0 ? t.adds_payment_info / t.checkouts_initiated : 0;
  t.purchase_conv_rate = t.link_clicks > 0 ? t.purchases / t.link_clicks : 0;
  t.hook_rate = t.impressions > 0 ? (t.video_3sec_plays / t.impressions) * 100 : 0;
  t.hold_rate = t.video_3sec_plays > 0 ? (t.thru_plays / t.video_3sec_plays) * 100 : 0;
  t.cost_per_thruplay = t.thru_plays > 0 ? t.spend / t.thru_plays : 0;
  return t;
}

async function fetchAll(table: string, select: string = '*', filters: Array<[string, string, any]> = []): Promise<any[]> {
  const supabase = createServerSupabase();
  let all: any[] = [];
  let offset = 0;
  const batch = 1000;
  while (true) {
    let q: any = supabase.from(table).select(select);
    for (const [col, op, val] of filters) {
      if (op === 'gte') q = q.gte(col, val);
      else if (op === 'lte') q = q.lte(col, val);
      else if (op === 'eq') q = q.eq(col, val);
    }
    q = q.range(offset, offset + batch - 1);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < batch) break;
    offset += batch;
  }
  return all;
}

export async function getAccountTotals(window: DateWindow) {
  const rows = await fetchAll('daily_account', '*', [
    ['day', 'gte', window.start],
    ['day', 'lte', window.end],
  ]);
  return sumRows(rows);
}

export async function getAccountDailySeries(window: DateWindow): Promise<any[]> {
  const rows = await fetchAll('daily_account', '*', [
    ['day', 'gte', window.start],
    ['day', 'lte', window.end],
  ]);
  return rows.sort((a, b) => a.day.localeCompare(b.day));
}

export async function getCampaignBreakdown(window: DateWindow) {
  const rows = await fetchAll('daily_campaign', '*', [
    ['day', 'gte', window.start],
    ['day', 'lte', window.end],
  ]);
  const map = new Map<string, any[]>();
  for (const r of rows) {
    const k = r.campaign_id || 'unknown';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  const out: any[] = [];
  map.forEach((rs, key) => {
    const agg = sumRows(rs);
    agg.campaign_id = key;
    agg.campaign_name = rs[0]?.campaign_name || '(unknown)';
    agg.objective = rs[0]?.objective || '';
    out.push(agg);
  });
  return out.sort((a, b) => b.spend - a.spend);
}

export async function getAdSetBreakdown(window: DateWindow) {
  const rows = await fetchAll('daily_adset', '*', [
    ['day', 'gte', window.start],
    ['day', 'lte', window.end],
  ]);
  const map = new Map<string, any[]>();
  for (const r of rows) {
    const k = r.adset_id || 'unknown';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  const out: any[] = [];
  map.forEach((rs, key) => {
    const agg = sumRows(rs);
    agg.adset_id = key;
    agg.adset_name = rs[0]?.adset_name || '(unknown)';
    agg.campaign_name = rs[0]?.campaign_name || '';
    out.push(agg);
  });
  return out.sort((a, b) => b.spend - a.spend);
}

export async function getAdBreakdown(window: DateWindow) {
  const rows = await fetchAll('daily_ad', '*', [
    ['day', 'gte', window.start],
    ['day', 'lte', window.end],
  ]);
  const map = new Map<string, any[]>();
  for (const r of rows) {
    const k = r.ad_id || 'unknown';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  const out: any[] = [];
  map.forEach((rs, key) => {
    const agg = sumRows(rs);
    agg.ad_id = key;
    agg.ad_name = rs[0]?.ad_name || '(unknown)';
    agg.adset_name = rs[0]?.adset_name || '';
    agg.campaign_name = rs[0]?.campaign_name || '';
    out.push(agg);
  });
  return out.sort((a, b) => b.spend - a.spend);
}

export async function getLifecycle() {
  return await fetchAll('ad_lifecycle');
}

export async function getSettings() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  return data || {};
}

export async function getDateRange(): Promise<{ minDay: string; maxDay: string }> {
  const supabase = createServerSupabase();
  const { data: minRow } = await supabase
    .from('daily_account').select('day').order('day', { ascending: true }).limit(1).single();
  const { data: maxRow } = await supabase
    .from('daily_account').select('day').order('day', { ascending: false }).limit(1).single();
  return { minDay: minRow?.day || '', maxDay: maxRow?.day || '' };
}
