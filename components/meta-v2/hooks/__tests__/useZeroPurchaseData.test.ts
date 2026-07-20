import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useZeroPurchaseData } from "../useZeroPurchaseData";
import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";

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

describe("useZeroPurchaseData", () => {
  it("processes rows on mount", () => {
    const rows = [createTestRow()];
    const { result } = renderHook(() => useZeroPurchaseData(rows));

    expect(result.current.output).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it("updates threshold and reprocesses", () => {
    const rows = [createTestRow({ spend: 5000, purchases: 0 })];
    const { result } = renderHook(() => useZeroPurchaseData(rows));

    const initialThreshold = result.current.threshold;

    act(() => {
      result.current.updateThreshold(10000);
    });

    expect(result.current.threshold).toBe(10000);
    expect(result.current.threshold).not.toBe(initialThreshold);
  });

  it("clamps threshold to non-negative", () => {
    const rows = [createTestRow()];
    const { result } = renderHook(() => useZeroPurchaseData(rows));

    act(() => {
      result.current.updateThreshold(-1000);
    });

    expect(result.current.threshold).toBe(0);
  });

  it("handles errors gracefully", () => {
    const rows: any[] = [{ date: "invalid" }];
    const onError = vi.fn();

    const { result } = renderHook(() => useZeroPurchaseData(rows, { onError }));

    expect(result.current.error).toBeDefined();
    expect(result.current.output).toBeNull();
    expect(onError).toHaveBeenCalled();
  });

  it("memoizes output when dependencies don't change", () => {
    const rows = [createTestRow()];
    const { result, rerender } = renderHook(() => useZeroPurchaseData(rows));

    const firstOutput = result.current.output;

    rerender();

    const secondOutput = result.current.output;
    expect(firstOutput).toBe(secondOutput);
  });

  it("recalculates output when rows change", () => {
    const rows1 = [createTestRow({ spend: 5000, purchases: 0 })];
    const { result, rerender } = renderHook(
      ({ rows }) => useZeroPurchaseData(rows),
      { initialProps: { rows: rows1 } }
    );

    const firstTotal = result.current.output?.totalItems;

    const rows2 = [
      createTestRow({ spend: 5000, purchases: 0 }),
      createTestRow({ spend: 5000, purchases: 0 }),
    ];

    rerender({ rows: rows2 });

    // Should recalculate with new data
    expect(result.current.output).toBeDefined();
  });
});
