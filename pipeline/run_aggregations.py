"""
Entry point for the aggregation pass.
Run after ingestion. Reads raw_meta_data, computes everything, writes back.
"""

import os
import sys
import traceback
from datetime import datetime, timezone

from pipeline.aggregator import run_all
from pipeline.supabase_client import (
    get_client, log_run_start, log_run_finish
)


def main():
    started = datetime.now(timezone.utc)
    print(f"[{started.isoformat()}] Aggregation pass starting")

    supabase_url = os.environ.get('SUPABASE_URL', '')
    supabase_key = os.environ.get('SUPABASE_SERVICE_KEY', '')
    if not supabase_url or not supabase_key:
        print("ERROR: missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        sys.exit(1)

    client = get_client(supabase_url, supabase_key)
    run_id = log_run_start(client)
    print(f"Started aggregation run #{run_id}")

    try:
        summary = run_all(client)
        total = sum(v for k, v in summary.items() if k != 'raw_rows')
        log_run_finish(client, run_id, 'success', total)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        print(f"Aggregation complete in {elapsed:.1f}s. Summary: {summary}")
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
