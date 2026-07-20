# MetaOS Upload and Sidebar Fix

## Active data behaviour

- Google Sheet remains the automatic/default source.
- `Refresh` reloads the canonical Google Sheet endpoint.
- `Upload Excel` accepts `.xlsx` and `.csv` and replaces the active in-memory dataset.
- Uploads are processed locally in the browser and are not sent to BigQuery or Google Sheets.
- Clicking `Refresh` after an upload returns the application to the Google Sheet dataset.

## Upload pipeline

`MetaFileUploadButton` → `parseMetaFile` → `normalizeMetaRows` → `enrichRows` → `metaStore`

The existing centralized Meta column aliases and data-quality corrections are reused, including campaign, ad set, ad, spend, revenue, purchase, funnel and video metrics.

## Sidebar repair

The obsolete early `display: none` rule was removed. It was overriding the newer preview-panel architecture and prevented labels from appearing even after the collapsed sidebar expanded.
