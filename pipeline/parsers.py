"""
Safe parsers for Meta Ads sheet data.
Handles ₹/$/€ symbols, commas, percent signs, blanks, mixed string/number types,
ISO dates, DD/MM/YYYY, datetime objects from gspread.
"""

import re
from datetime import datetime, date
from dateutil import parser as date_parser


def safe_str(v):
    """Return clean string, empty if None/blank/sentinel."""
    if v is None:
        return ''
    s = str(v).strip()
    if s.lower() in ('none', 'null', 'nan', '', '-'):
        return ''
    return s


def safe_float(v):
    """Parse number from any reasonable input. Returns 0.0 if unparseable."""
    if v is None or v == '':
        return 0.0
    if isinstance(v, (int, float)):
        # Filter out NaN
        try:
            if v != v:  # NaN check
                return 0.0
        except Exception:
            pass
        return float(v)
    s = str(v).strip()
    if not s or s.lower() in ('none', 'null', 'nan', '-'):
        return 0.0
    # Strip currency symbols, commas, spaces, percent signs
    s = re.sub(r'[₹$€£¥,\s]', '', s).replace('%', '')
    # Handle parentheses as negative (accounting style)
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    try:
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def safe_int(v):
    """Parse integer. Returns 0 if unparseable."""
    return int(safe_float(v))


def safe_date(v):
    """Parse date to YYYY-MM-DD string for Postgres. Returns None if unparseable."""
    if v is None or v == '':
        return None
    if isinstance(v, datetime):
        return v.strftime('%Y-%m-%d')
    if isinstance(v, date):
        return v.strftime('%Y-%m-%d')
    s = str(v).strip()
    if not s or s.lower() in ('none', 'null', '-'):
        return None
    try:
        # Indian-format-aware: DD/MM/YYYY parses correctly with dayfirst=True
        if re.match(r'^\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}$', s):
            parsed = date_parser.parse(s, dayfirst=True)
        else:
            parsed = date_parser.parse(s)
        return parsed.strftime('%Y-%m-%d')
    except (ValueError, TypeError, OverflowError):
        return None
