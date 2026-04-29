"""
Supabase client + upsert/log helpers.
"""

from datetime import datetime, timezone
from supabase import create_client, Client


def get_client(url: str, service_key: str) -> Client:
    """Create Supabase client with service-role key (bypasses RLS)."""
    return create_client(url, service_key)


def log_run_start(client: Client) -> int:
    """Insert a 'running' row in pipeline_runs and return its id."""
    res = (
        client.table('pipeline_runs')
        .insert({'status': 'running'})
        .execute()
    )
    return res.data[0]['id']


def log_run_finish(client: Client, run_id: int, status: str,
                   count: int = 0, error: str = None):
    """Update the pipeline_runs row with final status."""
    update = {
        'status': status,
        'finished_at': datetime.now(timezone.utc).isoformat(),
        'rows_ingested': count,
        'error_message': (error[:500] if error else None),
    }
    client.table('pipeline_runs').update(update).eq('id', run_id).execute()


def upsert_raw_data(client: Client, rows: list, batch_size: int = 500) -> int:
    """
    Upsert rows into raw_meta_data.
    Returns total rows upserted.
    Conflict key: (day, ad_id) — duplicate rows update in place.
    """
    # Filter rows missing the unique key (defensive)
    clean = [r for r in rows if r.get('day') and r.get('ad_id')]

    total = 0
    for i in range(0, len(clean), batch_size):
        batch = clean[i:i + batch_size]
        client.table('raw_meta_data').upsert(
            batch, on_conflict='day,ad_id'
        ).execute()
        total += len(batch)

    return total
