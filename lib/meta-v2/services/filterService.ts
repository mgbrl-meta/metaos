/**
 * Advanced filtering service for Zero Purchase data
 * Supports date range, threshold, severity, and campaign filters
 */

import type { MetaV2ZeroPurchaseItem } from '@/lib/meta-v2/engines/zeroPurchaseEngine';

export interface FilterCriteria {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  threshold?: number;
  severity?: 'critical' | 'high' | 'medium';
  campaign?: string;
  adSet?: string;
  searchTerm?: string;
}

export class FilterService {
  /**
   * Filter items by date range
   */
  static filterByDateRange(
    items: MetaV2ZeroPurchaseItem[],
    startDate: Date,
    endDate: Date
  ): MetaV2ZeroPurchaseItem[] {
    return items.filter((item) => {
      const itemDate = new Date(item.latestDate);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }

  /**
   * Filter items by waste threshold
   */
  static filterByThreshold(
    items: MetaV2ZeroPurchaseItem[],
    minThreshold: number
  ): MetaV2ZeroPurchaseItem[] {
    return items.filter((item) => item.lifetime.spend >= minThreshold);
  }

  /**
   * Filter items by severity level
   */
  static filterBySeverity(
    items: MetaV2ZeroPurchaseItem[],
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): MetaV2ZeroPurchaseItem[] {
    const severityOrder: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const minSeverity = severityOrder[severity];
    return items.filter((item) => severityOrder[item.severity] >= minSeverity);
  }

  /**
   * Filter items by campaign name (partial match)
   */
  static filterByCampaign(items: MetaV2ZeroPurchaseItem[], campaignName: string): MetaV2ZeroPurchaseItem[] {
    if (!campaignName.trim()) return items;
    const lowerCampaign = campaignName.toLowerCase();
    return items.filter((item) => item.campaignName.toLowerCase().includes(lowerCampaign));
  }

  /**
   * Filter items by ad set name (partial match)
   */
  static filterByAdSet(items: MetaV2ZeroPurchaseItem[], adSetName: string): MetaV2ZeroPurchaseItem[] {
    if (!adSetName.trim()) return items;
    const lowerAdSet = adSetName.toLowerCase();
    return items.filter((item) => item.adSetName.toLowerCase().includes(lowerAdSet));
  }

  /**
   * Filter items by ad name (partial match)
   */
  static filterBySearchTerm(items: MetaV2ZeroPurchaseItem[], searchTerm: string): MetaV2ZeroPurchaseItem[] {
    if (!searchTerm.trim()) return items;
    const lowerTerm = searchTerm.toLowerCase();
    return items.filter((item) => item.adName.toLowerCase().includes(lowerTerm));
  }

  /**
   * Apply multiple filters at once
   */
  static applyFilters(items: MetaV2ZeroPurchaseItem[], criteria: FilterCriteria): MetaV2ZeroPurchaseItem[] {
    let filtered = items;

    if (criteria.dateRange) {
      filtered = this.filterByDateRange(
        filtered,
        criteria.dateRange.startDate,
        criteria.dateRange.endDate
      );
    }

    if (criteria.threshold !== undefined) {
      filtered = this.filterByThreshold(filtered, criteria.threshold);
    }

    if (criteria.severity) {
      filtered = this.filterBySeverity(filtered, criteria.severity);
    }

    if (criteria.campaign) {
      filtered = this.filterByCampaign(filtered, criteria.campaign);
    }

    if (criteria.adSet) {
      filtered = this.filterByAdSet(filtered, criteria.adSet);
    }

    if (criteria.searchTerm) {
      filtered = this.filterBySearchTerm(filtered, criteria.searchTerm);
    }

    return filtered;
  }

  /**
   * Get filter statistics
   */
  static getFilterStats(items: MetaV2ZeroPurchaseItem[], originalCount: number) {
    const percentageFiltered = originalCount > 0 ? ((originalCount - items.length) / originalCount) * 100 : 0;

    return {
      originalCount,
      filteredCount: items.length,
      removedCount: originalCount - items.length,
      percentageRemoved: percentageFiltered.toFixed(1),
    };
  }

  /**
   * Get unique campaigns for filter dropdown
   */
  static getUniqueCampaigns(items: MetaV2ZeroPurchaseItem[]): string[] {
    return Array.from(new Set(items.map((item) => item.campaignName))).sort();
  }

  /**
   * Get unique ad sets for filter dropdown
   */
  static getUniqueAdSets(items: MetaV2ZeroPurchaseItem[]): string[] {
    return Array.from(new Set(items.map((item) => item.adSetName))).sort();
  }

  /**
   * Get severity distribution
   */
  static getSeverityDistribution(items: MetaV2ZeroPurchaseItem[]) {
    return {
      critical: items.filter((item) => item.severity === 'critical').length,
      high: items.filter((item) => item.severity === 'high').length,
      medium: items.filter((item) => item.severity === 'medium').length,
    };
  }
}
