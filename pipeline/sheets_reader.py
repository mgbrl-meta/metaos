"""
Read Meta Ads data from Google Sheet via service account.
"""

import gspread
from google.oauth2.service_account import Credentials


SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']


def read_sheet(service_account_info: dict, sheet_id: str):
    """
    Connect to the sheet and return (headers, rows) from the first worksheet.

    Returns:
        headers: list[str] — column names from row 1
        rows: list[dict]   — one dict per data row, keyed by header. Empty rows skipped.
    """
    creds = Credentials.from_service_account_info(
        service_account_info, scopes=SCOPES
    )
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(sheet_id)
    worksheet = spreadsheet.get_worksheet(0)  # first tab

    # get_all_values is faster than get_all_records for 60K+ row sheets
    all_values = worksheet.get_all_values()
    if not all_values or len(all_values) < 2:
        return [], []

    headers = [h.strip() for h in all_values[0]]

    rows = []
    for raw_row in all_values[1:]:
        # Skip fully empty rows
        if all((c is None or c == '') for c in raw_row):
            continue
        # Pad short rows to header length
        while len(raw_row) < len(headers):
            raw_row.append('')
        # Build dict, skipping any blank header columns
        row = {}
        for i, h in enumerate(headers):
            if h:
                row[h] = raw_row[i] if i < len(raw_row) else ''
        rows.append(row)

    return headers, rows
