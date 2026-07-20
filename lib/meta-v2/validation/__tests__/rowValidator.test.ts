import { describe, it, expect } from "vitest";
import { RowValidator } from "../rowValidator";
import type { MetaV2CleanRow } from "../../schema";

describe("RowValidator", () => {
  describe("validateRow", () => {
    it("accepts valid row", () => {
      const row: Partial<MetaV2CleanRow> = {
        date: "2026-07-20",
        spend: 5000,
        purchases: 10,
        impressions: 1000,
        clicks: 50,
        revenue: 10000,
      };

      const errors = RowValidator.validateRow(row, 0);
      expect(errors).toHaveLength(0);
    });

    it("detects missing required fields", () => {
      const row: Partial<MetaV2CleanRow> = {
        spend: 5000,
        // missing date, purchases, impressions, clicks
      };

      const errors = RowValidator.validateRow(row, 0);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === "date")).toBe(true);
    });

    it("detects invalid numeric values", () => {
      const row: Partial<MetaV2CleanRow> = {
        date: "2026-07-20",
        spend: "invalid",
        purchases: 10,
        impressions: 1000,
        clicks: 50,
        revenue: 0,
      };

      const errors = RowValidator.validateRow(row, 0);
      expect(errors.some(e => e.field === "spend")).toBe(true);
    });

    it("detects negative numeric values", () => {
      const row: Partial<MetaV2CleanRow> = {
        date: "2026-07-20",
        spend: -5000,
        purchases: 10,
        impressions: 1000,
        clicks: 50,
        revenue: 10000,
      };

      const errors = RowValidator.validateRow(row, 0);
      expect(errors.some(e => e.field === "spend")).toBe(true);
    });

    it("detects invalid date format", () => {
      const row: Partial<MetaV2CleanRow> = {
        date: "2026/07/20",
        spend: 5000,
        purchases: 10,
        impressions: 1000,
        clicks: 50,
        revenue: 10000,
      };

      const errors = RowValidator.validateRow(row, 0);
      expect(errors.some(e => e.field === "date")).toBe(true);
    });

    it("includes row index in errors", () => {
      const row: Partial<MetaV2CleanRow> = {
        date: "invalid",
      };

      const errors = RowValidator.validateRow(row, 42);
      expect(errors.every(e => e.rowIndex === 42)).toBe(true);
    });
  });

  describe("validateRows", () => {
    it("validates multiple rows", () => {
      const rows: Partial<MetaV2CleanRow>[] = [
        {
          date: "2026-07-20",
          spend: 5000,
          purchases: 10,
          impressions: 1000,
          clicks: 50,
          revenue: 10000,
        },
        {
          date: "invalid",
          spend: 5000,
          purchases: 10,
          impressions: 1000,
          clicks: 50,
          revenue: 10000,
        },
      ];

      const errors = RowValidator.validateRows(rows);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.rowIndex === 1)).toBe(true);
    });
  });

  describe("throwIfInvalid", () => {
    it("throws on invalid data", () => {
      const rows: Partial<MetaV2CleanRow>[] = [
        {
          date: "invalid",
        },
      ];

      expect(() => RowValidator.throwIfInvalid(rows)).toThrow("Data validation failed");
    });

    it("does not throw on valid data", () => {
      const rows: Partial<MetaV2CleanRow>[] = [
        {
          date: "2026-07-20",
          spend: 5000,
          purchases: 10,
          impressions: 1000,
          clicks: 50,
          revenue: 10000,
        },
      ];

      expect(() => RowValidator.throwIfInvalid(rows)).not.toThrow();
    });

    it("shows up to 3 errors in message", () => {
      const rows: Partial<MetaV2CleanRow>[] = [
        {
          date: "invalid",
          spend: "invalid",
          purchases: "invalid",
          impressions: 1000,
          clicks: 50,
          revenue: 10000,
        },
      ];

      expect(() => RowValidator.throwIfInvalid(rows)).toThrow(/Row 0:/);
    });
  });
});
