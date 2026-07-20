/**
 * Export service for Zero Purchase data
 * Supports CSV and JSON exports with date range filtering
 */

import type { MetaV2ZeroPurchaseItem } from '@/lib/meta-v2/engines/zeroPurchaseEngine';

export interface ExportOptions {
  filename?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeColumns?: (keyof MetaV2ZeroPurchaseItem)[];
}

export class ExportService {
  /**
   * Export items to CSV format
   */
  static exportToCSV(items: MetaV2ZeroPurchaseItem[], options: ExportOptions = {}) {
    const {
      filename = `zero-purchase-${new Date().toISOString().split('T')[0]}.csv`,
      dateRange,
    } = options;

    // Filter by date range if provided
    let dataToExport = items;
    if (dateRange) {
      dataToExport = items.filter((item) => {
        const itemDate = new Date(item.latestDate);
        return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
      });
    }

    // Define columns to export
    const columns = [
      'adName',
      'campaignName',
      'adSetName',
      'severity',
      'reason',
      'lifetimeSpend',
      'latestSpend',
      'last7Spend',
      'clicks',
      'lpv',
      'atc',
      'purchases',
      'roas',
      'date',
    ];

    // Create CSV header
    const header = columns.join(',');

    // Create CSV rows
    const rows = dataToExport.map((item) => {
      const values = [
        this.escapeCSV(item.adName),
        this.escapeCSV(item.campaignName),
        this.escapeCSV(item.adSetName),
        item.severity,
        this.escapeCSV(item.reason),
        item.lifetime.spend.toFixed(2),
        item.latest.spend.toFixed(2),
        item.last7.spend.toFixed(2),
        item.lifetime.clicks,
        item.lifetime.lpv,
        item.lifetime.atc,
        item.lifetime.purchases,
        item.lifetime.roas.toFixed(2),
        new Date(item.latestDate).toISOString().split('T')[0],
      ];
      return values.join(',');
    });

    // Combine header and rows
    const csv = [header, ...rows].join('\n');

    // Download
    this.downloadFile(csv, filename, 'text/csv');
  }

  /**
   * Export items to JSON format
   */
  static exportToJSON(items: MetaV2ZeroPurchaseItem[], options: ExportOptions = {}) {
    const {
      filename = `zero-purchase-${new Date().toISOString().split('T')[0]}.json`,
      dateRange,
    } = options;

    // Filter by date range if provided
    let dataToExport = items;
    if (dateRange) {
      dataToExport = items.filter((item) => {
        const itemDate = new Date(item.latestDate);
        return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
      });
    }

    // Create JSON object with metadata
    const jsonData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalItems: dataToExport.length,
        dateRange: dateRange
          ? {
              startDate: dateRange.startDate.toISOString(),
              endDate: dateRange.endDate.toISOString(),
            }
          : null,
      },
      data: dataToExport,
    };

    const json = JSON.stringify(jsonData, null, 2);
    this.downloadFile(json, filename, 'application/json');
  }

  /**
   * Export items to TSV (Tab-Separated Values) for Excel
   */
  static exportToTSV(items: MetaV2ZeroPurchaseItem[], options: ExportOptions = {}) {
    const {
      filename = `zero-purchase-${new Date().toISOString().split('T')[0]}.tsv`,
      dateRange,
    } = options;

    // Filter by date range if provided
    let dataToExport = items;
    if (dateRange) {
      dataToExport = items.filter((item) => {
        const itemDate = new Date(item.latestDate);
        return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
      });
    }

    const columns = [
      'Ad Name',
      'Campaign',
      'Ad Set',
      'Severity',
      'Reason',
      'Lifetime Spend (₹)',
      'Latest Spend (₹)',
      'Last 7D Spend (₹)',
      'Clicks',
      'LPV',
      'ATC',
      'Purchases',
      'ROAS',
      'Date',
    ];

    const header = columns.join('\t');

    const rows = dataToExport.map((item) => {
      const values = [
        item.adName,
        item.campaignName,
        item.adSetName,
        item.severity,
        item.reason,
        item.lifetime.spend.toFixed(2),
        item.latest.spend.toFixed(2),
        item.last7.spend.toFixed(2),
        item.lifetime.clicks,
        item.lifetime.lpv,
        item.lifetime.atc,
        item.lifetime.purchases,
        item.lifetime.roas.toFixed(2),
        new Date(item.latestDate).toISOString().split('T')[0],
      ];
      return values.join('\t');
    });

    const tsv = [header, ...rows].join('\n');
    this.downloadFile(tsv, filename, 'text/tab-separated-values');
  }

  /**
   * Generate summary statistics for export
   */
  static generateSummary(items: MetaV2ZeroPurchaseItem[]) {
    const totalSpend = items.reduce((sum, item) => sum + item.lifetime.spend, 0);
    const totalWaste = items.filter((item) => item.lifetime.purchases === 0).length;
    const avgSpend = items.length > 0 ? totalSpend / items.length : 0;

    const severityCount = {
      critical: items.filter((item) => item.severity === 'critical').length,
      high: items.filter((item) => item.severity === 'high').length,
      medium: items.filter((item) => item.severity === 'medium').length,
    };

    return {
      totalItems: items.length,
      totalSpend: totalSpend.toFixed(2),
      avgSpend: avgSpend.toFixed(2),
      totalWaste,
      wastePercentage: items.length > 0 ? ((totalWaste / items.length) * 100).toFixed(1) : 0,
      severity: severityCount,
    };
  }

  /**
   * Escape CSV special characters
   */
  private static escapeCSV(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Trigger file download
   */
  private static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
