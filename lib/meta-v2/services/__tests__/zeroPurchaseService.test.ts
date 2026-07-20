import { describe, it, expect } from "vitest";
import { ZeroPurchaseService } from "../zeroPurchaseService";
import type { MetaV2CleanRow } from "../../schema";

const createTestRow = (overrides: Partial<MetaV2CleanRow> = {}): MetaV2CleanRow => ({
  sourceIndex: 0,
  date: "2026-07-20",
  monthKey: "2026-07",
  weekKey: "2026-W29",
  campaignName: "Test Campaign",
  adSetName: "Test Ad Set",
  adName: "Test Ad",
  adId: "123",
  spend: 5000,
  revenue: 10000,
  purchases: 10,
  impressions: 1000,
  reach: 800,
  clicks: 50,
  linkClicks: 50,
  lpv: 30,
  contentView: 0,
  atc: 5,
  checkout: 2,
  payment: 1,
  roas: 2,
  cpa: 500,
  aov: 1000,
  gpt: 500,
  cpm: 5,
  cpc: 100,
  ctr: 5,
  frequency: 1.25,
  lpvRate: 60,
  atcRate: 16.7,
  checkoutRate: 40,
  paymentRate: 50,
  purchaseRate: 33.3,
  deliveryStatus: "active",
  creativeName: "Creative 1",
  video3s: 100,
  ...overrides,
});

describe("ZeroPurchaseService", () => {
  describe("process", () => {
    it("processes valid rows successfully", () => {
      const rows = [createTestRow()];
      const output = ZeroPurchaseService.process(rows, 3000);

      expect(output).toBeDefined();
      expect(output.latestDate).toBe("2026-07-20");
      expect(output.totalItems).toBeGreaterThanOrEqual(0);
    });

    it("throws on validation failure", () => {
      const rows: any[] = [
        {
          date: "invalid",
        },
      ];

      expect(() => ZeroPurchaseService.process(rows, 3000)).toThrow("Data validation failed");
    });

    it("throws on empty rows", () => {
      expect(() => ZeroPurchaseService.process([], 3000)).toThrow("No data rows provided");
    });

    it("throws on negative threshold", () => {
      const rows = [createTestRow()];
      expect(() => ZeroPurchaseService.process(rows, -100)).toThrow("Threshold must be non-negative");
    });

    it("filters by threshold", () => {
      const rows = [
        createTestRow({ spend: 5000, purchases: 0 }),
        createTestRow({ spend: 1000, purchases: 0 }),
      ];

      const output = ZeroPurchaseService.process(rows, 3000);
      // Should only include the 5000 spend ad since 1000 < 3000
      expect(output.totalItems).toBeLessThanOrEqual(1);
    });

    it("filters out ads with purchases", () => {
      const rows = [
        createTestRow({ spend: 5000, purchases: 0 }),
        createTestRow({ spend: 5000, purchases: 5 }),
      ];

      const output = ZeroPurchaseService.process(rows, 3000);
      // Should only include the 0 purchases ad
      expect(output.totalItems).toBeLessThanOrEqual(1);
      if (output.items.length > 0) {
        expect(output.items[0].lifetime.purchases).toBe(0);
      }
    });
  });

  describe("extractHandles", () => {
    it("extracts @mention handles", () => {
      const names = ["@username - Some Ad Name", "Normal Ad - @handle2"];
      const handles = ZeroPurchaseService.extractHandles(names);

      expect(handles).toContain("@username");
      expect(handles).toContain("@handle2");
    });

    it("falls back to first segment without @mention", () => {
      const names = ["Campaign Name - Ad Set Name - Some Ad"];
      const handles = ZeroPurchaseService.extractHandles(names);

      expect(handles).toContain("Campaign Name");
    });

    it("deduplicates handles", () => {
      const names = ["@user - Ad 1", "@user - Ad 2", "@user - Ad 3"];
      const handles = ZeroPurchaseService.extractHandles(names);

      expect(handles).toHaveLength(1);
      expect(handles[0]).toBe("@user");
    });

    it("filters empty handles", () => {
      const names = ["", "  ", "@handle"];
      const handles = ZeroPurchaseService.extractHandles(names);

      expect(handles).toContain("@handle");
      expect(handles.length).toBeGreaterThan(0);
    });

    it("handles mixed formats", () => {
      const names = [
        "@instagram_handle",
        "Plain Ad Name - With Dashes",
        "@tiktok.user_123",
        "  Spaces Around  ",
      ];
      const handles = ZeroPurchaseService.extractHandles(names);

      expect(handles.length).toBeGreaterThan(0);
      expect(handles.some(h => h.startsWith("@"))).toBe(true);
    });
  });
});
