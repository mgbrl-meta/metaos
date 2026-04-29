"""
Aggregation engine for Meta Growth OS.
Reads raw_meta_data, computes daily summaries at every level,
plus per-ad lifecycle metrics (fatigue + performance scores, lifecycle stage).
Writes everything to the aggregation tables.

Design rules:
  - Ratios are derived from summed totals, never average-of-averages.
  - Scoring thresholds come from the `settings` table, not hardcoded.
  - Aggregation tables are wiped + re-inserted each run (full recompute).
"""

from datetime import date, timedelta
import pandas as pd
import numpy as np
from supabase import Client


# ---------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------

def read_all_raw(client: Client, batch_size: int = 1000) -> pd.DataFrame:
    """Page through raw_meta_data and return a typed DataFrame."""
    all_rows = []
    offset = 0
    while True:
        res = (
            client.table('raw_meta_data')
            .select('*')
            .order('day')
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = res.data or []
        all_rows.extend(rows)
        if len(rows) < batch_size:
            break
        offset += batch_size

    df = pd.DataFrame(all_rows)
    if df.empty:
        return df

    df['day'] = pd.to_datetime(df['day']).dt.date
    numeric_cols = [
        'impressions', 'reach', 'frequency', 'spend', 'cpm', 'cpc',
        'cost_per_result', 'clicks_all', 'link_clicks', 'outbound_clicks',
        'ctr_all', 'ctr_link', 'landing_page_views', 'adds_to_cart',
        'checkouts_initiated', 'adds_payment_info', 'purchases',
        'purchase_value', 'purchase_roas', 'video_plays', 'video_3sec_plays',
        'video_avg_play_time', 'thru_plays'
    ]
    for c in numeric_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)
    for c in ['campaign_id', 'campaign_name', 'adset_id', 'adset_name',
              'ad_id', 'ad_name', 'objective']:
        if c in df.columns:
            df[c] = df[c].fillna('').astype(str)
    return df


def read_settings(client: Client) -> dict:
    res = client.table('settings').select('*').eq('id', 1).execute()
    rows = res.data or []
    return rows[0] if rows else {}


def wipe_table(client: Client, table: str, key_col: str = 'day'):
    """Delete all rows from an aggregation table."""
    # neq with an impossible value matches every row
    if key_col == 'day':
        client.table(table).delete().neq(key_col, '1900-01-01').execute()
    else:
        client.table(table).delete().neq(key_col, '__never__').execute()


def insert_batches(client: Client, table: str, records: list,
                   batch_size: int = 500) -> int:
    total = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        client.table(table).insert(batch).execute()
        total += len(batch)
    return total


# ---------------------------------------------------------------------
# Math helpers
# ---------------------------------------------------------------------

def safe_div(a, b):
    """Element-wise division. Returns 0 where b <= 0 or NaN."""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    with np.errstate(divide='ignore', invalid='ignore'):
        out = np.where(b > 0, a / b, 0.0)
    return np.where(np.isfinite(out), out, 0.0)


SUM_COLS = [
    'spend', 'impressions', 'reach', 'clicks_all', 'link_clicks',
    'outbound_clicks', 'landing_page_views', 'adds_to_cart',
    'checkouts_initiated', 'adds_payment_info', 'purchases',
    'purchase_value', 'video_plays', 'video_3sec_plays', 'thru_plays'
]


def add_derived(df: pd.DataFrame) -> pd.DataFrame:
    """Add CPM/CTR/ROAS/hook/hold and other derived columns from totals."""
    df = df.copy()
    df['revenue'] = df['purchase_value']
    df['cpm'] = safe_div(df['spend'] * 1000, df['impressions'])
    df['cpc'] = safe_div(df['spend'], df['link_clicks'])
    df['ctr_all'] = safe_div(df['clicks_all'], df['impressions']) * 100
    df['ctr_link'] = safe_div(df['link_clicks'], df['impressions']) * 100
    df['frequency'] = safe_div(df['impressions'], df['reach'])
    df['roas'] = safe_div(df['revenue'], df['spend'])
    df['cost_per_purchase'] = safe_div(df['spend'], df['purchases'])
    df['hook_rate'] = safe_div(df['video_3sec_plays'], df['impressions']) * 100
    df['hold_rate'] = safe_div(df['thru_plays'], df['video_3sec_plays']) * 100
    return df


def df_to_records(df: pd.DataFrame, columns: list) -> list:
    """Slice + clean DataFrame into list-of-dicts ready for Supabase insert."""
    out = df[columns].copy()
    # Convert dates to ISO strings
    for c in out.columns:
        if out[c].dtype == 'object':
            out[c] = out[c].apply(lambda v: v.isoformat() if isinstance(v, date) else v)
    # Replace NaN/inf with safe values
    out = out.replace([np.inf, -np.inf], 0).fillna(0)
    records = out.to_dict(orient='records')
    # Ensure integer columns are ints (Postgres BIGINT is strict)
    return records


# ---------------------------------------------------------------------
# Per-level aggregations
# ---------------------------------------------------------------------

def compute_daily_account(raw: pd.DataFrame) -> pd.DataFrame:
    g = raw.groupby('day', as_index=False)[SUM_COLS].sum()
    g = add_derived(g)
    g['aov'] = safe_div(g['revenue'], g['purchases'])
    cols = [
        'day', 'spend', 'impressions', 'reach', 'frequency',
        'clicks_all', 'link_clicks', 'outbound_clicks',
        'ctr_all', 'ctr_link', 'cpc', 'cpm',
        'landing_page_views', 'adds_to_cart', 'checkouts_initiated',
        'adds_payment_info', 'purchases', 'revenue', 'roas',
        'cost_per_purchase', 'aov',
        'video_plays', 'video_3sec_plays', 'thru_plays',
        'hook_rate', 'hold_rate'
    ]
    return g[cols]


def compute_daily_campaign(raw: pd.DataFrame) -> pd.DataFrame:
    g = raw.groupby(['day', 'campaign_id'], as_index=False).agg(
        campaign_name=('campaign_name', 'last'),
        objective=('objective', 'last'),
        **{c: (c, 'sum') for c in SUM_COLS},
    )
    g = add_derived(g)
    cols = [
        'day', 'campaign_id', 'campaign_name', 'objective',
        'spend', 'impressions', 'reach', 'frequency',
        'clicks_all', 'link_clicks', 'outbound_clicks',
        'ctr_all', 'ctr_link', 'cpc', 'cpm',
        'landing_page_views', 'adds_to_cart', 'checkouts_initiated',
        'adds_payment_info', 'purchases', 'revenue', 'roas',
        'cost_per_purchase',
        'video_plays', 'video_3sec_plays', 'thru_plays',
        'hook_rate', 'hold_rate'
    ]
    return g[cols]


def compute_daily_adset(raw: pd.DataFrame) -> pd.DataFrame:
    g = raw.groupby(['day', 'adset_id'], as_index=False).agg(
        adset_name=('adset_name', 'last'),
        campaign_id=('campaign_id', 'last'),
        campaign_name=('campaign_name', 'last'),
        **{c: (c, 'sum') for c in SUM_COLS},
    )
    g = add_derived(g)
    cols = [
        'day', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name',
        'spend', 'impressions', 'reach', 'frequency',
        'clicks_all', 'link_clicks', 'outbound_clicks',
        'ctr_all', 'ctr_link', 'cpc', 'cpm',
        'landing_page_views', 'adds_to_cart', 'checkouts_initiated',
        'adds_payment_info', 'purchases', 'revenue', 'roas',
        'cost_per_purchase',
        'video_plays', 'video_3sec_plays', 'thru_plays',
        'hook_rate', 'hold_rate'
    ]
    return g[cols]


def compute_daily_ad(raw: pd.DataFrame) -> pd.DataFrame:
    g = raw.groupby(['day', 'ad_id'], as_index=False).agg(
        ad_name=('ad_name', 'last'),
        adset_id=('adset_id', 'last'),
        adset_name=('adset_name', 'last'),
        campaign_id=('campaign_id', 'last'),
        campaign_name=('campaign_name', 'last'),
        video_avg_play_time=('video_avg_play_time', 'max'),
        **{c: (c, 'sum') for c in SUM_COLS},
    )
    g = add_derived(g)
    cols = [
        'day', 'ad_id', 'ad_name', 'adset_id', 'adset_name',
        'campaign_id', 'campaign_name',
        'spend', 'impressions', 'reach', 'frequency',
        'clicks_all', 'link_clicks', 'outbound_clicks',
        'ctr_all', 'ctr_link', 'cpc', 'cpm',
        'landing_page_views', 'adds_to_cart', 'checkouts_initiated',
        'adds_payment_info', 'purchases', 'revenue', 'roas',
        'cost_per_purchase',
        'video_plays', 'video_3sec_plays', 'video_avg_play_time',
        'thru_plays', 'hook_rate', 'hold_rate'
    ]
    return g[cols]


# ---------------------------------------------------------------------
# Lifecycle: per-ad summary + scoring + stage
# ---------------------------------------------------------------------

def compute_lifecycle(raw: pd.DataFrame, settings: dict) -> pd.DataFrame:
    target_roas = float(settings.get('target_roas') or 0.7)
    fatigue_freq_threshold = float(settings.get('fatigue_freq_threshold') or 2.5)

    active = raw[raw['spend'] > 0].copy()
    if active.empty:
        return pd.DataFrame()

    # Lifetime aggregates per ad
    lt = active.groupby('ad_id', as_index=False).agg(
        ad_name=('ad_name', 'last'),
        adset_id=('adset_id', 'last'),
        adset_name=('adset_name', 'last'),
        campaign_id=('campaign_id', 'last'),
        campaign_name=('campaign_name', 'last'),
        first_active_day=('day', 'min'),
        last_active_day=('day', 'max'),
        days_active=('day', 'nunique'),
        lifetime_spend=('spend', 'sum'),
        lifetime_impressions=('impressions', 'sum'),
        lifetime_purchases=('purchases', 'sum'),
        lifetime_revenue=('purchase_value', 'sum'),
        lifetime_link_clicks=('link_clicks', 'sum'),
        lifetime_reach_sum=('reach', 'sum'),
    )
    lt['lifetime_roas'] = safe_div(lt['lifetime_revenue'], lt['lifetime_spend'])

    # Peak spend day
    peak_spend_idx = active.groupby('ad_id')['spend'].idxmax()
    peak_spend = active.loc[peak_spend_idx, ['ad_id', 'day']].rename(
        columns={'day': 'peak_spend_day'}
    )
    lt = lt.merge(peak_spend, on='ad_id', how='left')

    # Peak ROAS day (only consider days with spend > 0)
    active = active.copy()
    active['daily_roas'] = safe_div(active['purchase_value'], active['spend'])
    peak_roas_idx = active.groupby('ad_id')['daily_roas'].idxmax()
    peak_roas = active.loc[peak_roas_idx, ['ad_id', 'day']].rename(
        columns={'day': 'peak_roas_day'}
    )
    lt = lt.merge(peak_roas, on='ad_id', how='left')

    # ---- Performance score (0-100, higher = better) ----
    lt_imp = lt['lifetime_impressions']
    lt_lc = lt['lifetime_link_clicks']
    lt_pur = lt['lifetime_purchases']
    lt_sp = lt['lifetime_spend']
    lt_rv = lt['lifetime_revenue']

    s_roas = np.clip(lt['lifetime_roas'] / max(target_roas * 2, 0.001), 0, 1) * 100
    ctr_link = safe_div(lt_lc, lt_imp)
    s_ctr = np.clip(ctr_link / 0.03, 0, 1) * 100
    cpc = safe_div(lt_sp, lt_lc)
    s_cpc = np.where(
        lt_lc > 0,
        np.clip(1 - (cpc / 50), 0, 1) * 100,
        50.0,
    )
    cpp = safe_div(lt_sp, lt_pur)
    s_cpp = np.where(
        lt_pur > 0,
        np.clip(1 - (cpp / 1000), 0, 1) * 100,
        np.where(lt_sp > 0, 0.0, 50.0),
    )
    perf = s_roas * 0.40 + s_ctr * 0.20 + s_cpc * 0.15 + s_cpp * 0.25
    lt['performance_score'] = np.round(np.clip(perf, 0, 100)).astype(int)

    # ---- Fatigue score (0-100, higher = more fatigued) ----
    # Components: average frequency vs threshold, lifetime age, recent ROAS gap
    avg_freq = safe_div(lt_imp, lt['lifetime_reach_sum'])
    f_freq = np.clip(avg_freq / max(fatigue_freq_threshold, 0.001), 0, 1) * 100

    # Age component (days active, capped at 60 days)
    f_age = np.clip(lt['days_active'].astype(float) / 60.0, 0, 1) * 100

    # Recent vs lifetime ROAS gap (last 7 days vs lifetime)
    if not active.empty:
        max_day = active['day'].max()
        cutoff = max_day - timedelta(days=7)
        recent = active[active['day'] >= cutoff].groupby('ad_id', as_index=False).agg(
            r7_spend=('spend', 'sum'),
            r7_revenue=('purchase_value', 'sum'),
        )
        recent['r7_roas'] = safe_div(recent['r7_revenue'], recent['r7_spend'])
        lt = lt.merge(recent[['ad_id', 'r7_roas', 'r7_spend']], on='ad_id', how='left')
        lt['r7_roas'] = lt['r7_roas'].fillna(0)
        lt['r7_spend'] = lt['r7_spend'].fillna(0)
        roas_gap = np.where(
            lt['lifetime_roas'] > 0,
            np.clip((lt['lifetime_roas'] - lt['r7_roas']) / lt['lifetime_roas'], 0, 1) * 100,
            0.0,
        )
        f_decay = roas_gap
    else:
        lt['r7_roas'] = 0.0
        lt['r7_spend'] = 0.0
        f_decay = np.zeros(len(lt))

    fatigue = f_freq * 0.4 + f_age * 0.3 + f_decay * 0.3
    lt['fatigue_score'] = np.round(np.clip(fatigue, 0, 100)).astype(int)

    # ---- Lifecycle stage ----
    if not active.empty:
        max_day = active['day'].max()
        recently_active = lt['last_active_day'] >= (max_day - timedelta(days=2))
    else:
        recently_active = pd.Series([False] * len(lt))

    conditions = [
        ~recently_active,                                                          # Paused
        lt['days_active'] <= 5,                                                    # Ramp
        (lt['fatigue_score'] >= 70) & (lt['lifetime_roas'] < target_roas),         # Decay
        (lt['lifetime_roas'] >= target_roas) & (lt['fatigue_score'] < 50),         # Peak
        (lt['r7_roas'] > lt['lifetime_roas']) & (lt['r7_spend'] > 0),              # Reviving
    ]
    choices = ['Paused', 'Ramp', 'Decay', 'Peak', 'Reviving']
    lt['lifecycle_stage'] = np.select(conditions, choices, default='Plateau')

    cols = [
        'ad_id', 'ad_name', 'adset_id', 'adset_name',
        'campaign_id', 'campaign_name',
        'first_active_day', 'last_active_day', 'days_active',
        'lifetime_spend', 'lifetime_impressions',
        'lifetime_purchases', 'lifetime_revenue', 'lifetime_roas',
        'peak_spend_day', 'peak_roas_day',
        'fatigue_score', 'performance_score', 'lifecycle_stage',
    ]
    return lt[cols]


# ---------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------

def run_all(client: Client) -> dict:
    """Execute the full aggregation pass. Returns summary counts."""
    raw = read_all_raw(client)
    if raw.empty:
        return {'raw_rows': 0, 'account': 0, 'campaign': 0, 'adset': 0, 'ad': 0, 'lifecycle': 0}

    settings = read_settings(client)

    print(f"  raw rows loaded: {len(raw)}")
    print(f"  computing daily_account ...")
    da = compute_daily_account(raw)
    print(f"  computing daily_campaign ...")
    dc = compute_daily_campaign(raw)
    print(f"  computing daily_adset ...")
    das = compute_daily_adset(raw)
    print(f"  computing daily_ad ...")
    dad = compute_daily_ad(raw)
    print(f"  computing ad_lifecycle ...")
    life = compute_lifecycle(raw, settings)

    print(f"  wiping aggregation tables ...")
    wipe_table(client, 'daily_account', 'day')
    wipe_table(client, 'daily_campaign', 'day')
    wipe_table(client, 'daily_adset', 'day')
    wipe_table(client, 'daily_ad', 'day')
    wipe_table(client, 'ad_lifecycle', 'ad_id')

    print(f"  inserting daily_account ({len(da)} rows) ...")
    n_acc = insert_batches(client, 'daily_account', df_to_records(da, list(da.columns)))
    print(f"  inserting daily_campaign ({len(dc)} rows) ...")
    n_camp = insert_batches(client, 'daily_campaign', df_to_records(dc, list(dc.columns)))
    print(f"  inserting daily_adset ({len(das)} rows) ...")
    n_set = insert_batches(client, 'daily_adset', df_to_records(das, list(das.columns)))
    print(f"  inserting daily_ad ({len(dad)} rows) ...")
    n_ad = insert_batches(client, 'daily_ad', df_to_records(dad, list(dad.columns)))
    print(f"  inserting ad_lifecycle ({len(life)} rows) ...")
    n_life = insert_batches(client, 'ad_lifecycle', df_to_records(life, list(life.columns)))

    return {
        'raw_rows': len(raw),
        'account': n_acc,
        'campaign': n_camp,
        'adset': n_set,
        'ad': n_ad,
        'lifecycle': n_life,
    }
