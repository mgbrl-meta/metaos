"""
Main ingestion pipeline.
Reads Google Sheet → parses → upserts into Supabase raw_meta_data.
Designed to run via GitHub Actions hourly cron.
"""

import os
import sys
import json
import traceback
from datetime import datetime, timezone

from pipeline.sheets_reader import read_sheet
from pipeline.supabase_client import (
    get_client, upsert_raw_data, log_run_start, log_run_finish
)
from pipeline.parsers import safe_str, safe_int, safe_float, safe_date


# Map: Sheet header → (DB column, parser kind)
COLUMN_MAP = {
    'Day':                                   ('day', 'date'),
    'Campaign ID':                           ('campaign_id', 'str'),
    'Campaign name':                         ('campaign_name', 'str'),
    'Ad set ID':                             ('adset_id', 'str'),
    'Ad set name':                           ('adset_name', 'str'),
    'Ad ID':                                 ('ad_id', 'str'),
    'Ad name':                               ('ad_name', 'str'),
    'Objective':                             ('objective', 'str'),
    'Impressions':                           ('impressions', 'int'),
    'Reach':                                 ('reach', 'int'),
    'Frequency':                             ('frequency', 'float'),
    'Amount spent (INR)':                    ('spend', 'float'),
    'CPM (cost per 1,000 impressions)':      ('cpm', 'float'),
    'CPC (cost per link click)':             ('cpc', 'float'),
    'Cost per result':                       ('cost_per_result', 'float'),
    'Clicks (all)':                          ('clicks_all', 'int'),
    'Link clicks':                           ('link_clicks', 'int'),
    'Outbound clicks':                       ('outbound_clicks', 'int'),
    'CTR (all)':                             ('ctr_all', 'float'),
    'CTR (link click-through rate)':         ('ctr_link', 'float'),
    'Landing page views':                    ('landing_page_views', 'int'),
    'Adds to cart':                          ('adds_to_cart', 'int'),
    'Checkouts initiated':                   ('checkouts_initiated', 'int'),
    'Adds of payment info':                  ('adds_payment_info', 'int'),
    'Purchases':                             ('purchases', 'int'),
    'Purchases conversion value':            ('purchase_value', 'float'),
    'Purchase ROAS (return on ad spend)':    ('purchase_roas', 'float'),
    'Video plays':                           ('video_plays', 'int'),
    '3-second video plays':                  ('video_3sec_plays', 'int'),
    'Video average play time':               ('video_avg_play_time', 'float'),
    'ThruPlays':                             ('thru_plays', 'int'),
    'Reporting starts':                      ('reporting_starts', 'date'),
    'Reporting ends':                        ('reporting_ends', 'date'),
}

PARSERS = {
    'str':   safe_str,
    'int':   safe_int,
    'float': safe_float,
    'date':  safe_date,
}

DEFAULTS = {
    'str':   '',
    'int':   0,
    'float': 0.0,
    'date':  None,
}


def transform_row(raw_row: dict) -> dict:
    """Convert one sheet row dict to DB-shaped dict."""
    out = {}
    for sheet_col, (db_col, kind) in COLUMN_MAP.items():
        if sheet_col in raw_row:
            out[db_col] = PARSERS[kind](raw_row[sheet_col])
        else:
            out[db_col] = DEFAULTS[kind]
    return out


def main():
    started = datetime.now(timezone.utc)
    print(f"[{started.isoformat()}] Meta OS ingestion starting")

    # Required env vars
    sa_json       = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '')
    sheet_id      = os.environ.get('GOOGLE_SHEET_ID', '')
    supabase_url  = os.environ.get('SUPABASE_URL', '')
    supabase_key  = os.environ.get('SUPABASE_SERVICE_KEY', '')

    missing = [k for k, v in {
        'GOOGLE_SERVICE_ACCOUNT_JSON': sa_json,
        'GOOGLE_SHEET_ID': sheet_id,
        'SUPABASE_URL': supabase_url,
        'SUPABASE_SERVICE_KEY': supabase_key,
    }.items() if not v]
    if missing:
        print(f"ERROR: missing env vars: {missing}")
        sys.exit(1)

    try:
        sa_info = json.loads(sa_json)
    except json.JSONDecodeError as e:
        print(f"ERROR: GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: {e}")
        sys.exit(1)

    client = get_client(supabase_url, supabase_key)
    run_id = log_run_start(client)
    print(f"Started pipeline run #{run_id}")

    try:
        print(f"Reading sheet {sheet_id} ...")
        headers, rows = read_sheet(sa_info, sheet_id)
        print(f"  -> {len(headers)} columns, {len(rows)} data rows")

        if not rows:
            log_run_finish(client, run_id, 'success', 0)
            print("Sheet has no data rows. Exiting cleanly.")
            return

        print("Parsing and transforming rows ...")
        transformed = []
        skipped = 0
        for r in rows:
            t = transform_row(r)
            if not t.get('day') or not t.get('ad_id'):
                skipped += 1
                continue
            transformed.append(t)
        print(f"  -> {len(transformed)} valid, {skipped} skipped (no day/ad_id)")

        if not transformed:
            log_run_finish(client, run_id, 'success', 0)
            print("No valid rows to upsert. Exiting cleanly.")
            return

        print("Upserting to Supabase ...")
        count = upsert_raw_data(client, transformed)
        print(f"  -> {count} rows upserted")

        log_run_finish(client, run_id, 'success', count)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        print(f"Pipeline completed in {elapsed:.1f}s")

    except Exception as e:
        err = f"{type(e).__name__}: {str(e)}"
        print(f"ERROR: {err}")
        traceback.print_exc()
        try:
            log_run_finish(client, run_id, 'failed', 0, err)
        except Exception:
            pass
        sys.exit(1)


if __name__ == '__main__':
    main()
