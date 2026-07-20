import { buildMetaV2ZeroPurchase, type MetaV2ZeroPurchaseOutput } from "@/lib/meta-v2/engines/zeroPurchaseEngine";
import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";
import { RowValidator } from "@/lib/meta-v2/validation/rowValidator";

/**
 * Business logic layer - orchestrates validation, processing, and formatting
 * Pure function, testable, reusable across UI/API/workers
 */
export class ZeroPurchaseService {
  /**
   * Process rows with validation
   */
  static process(
    rows: MetaV2CleanRow[],
    threshold = 3000
  ): MetaV2ZeroPurchaseOutput {
    // Validate input
    RowValidator.throwIfInvalid(rows);

    if (rows.length === 0) {
      throw new Error("No data rows provided");
    }

    if (threshold < 0) {
      throw new Error("Threshold must be non-negative");
    }

    // Process
    return buildMetaV2ZeroPurchase(rows, threshold);
  }

  /**
   * Extract handles from ad names (duplicate-free)
   */
  static extractHandles(adNames: string[]): string[] {
    const handles = adNames
      .map(name => this.extractHandle(name))
      .filter(Boolean);

    return Array.from(new Set(handles));
  }

  /**
   * Extract single handle from ad name
   */
  private static extractHandle(adName: string): string {
    const value = String(adName || "").trim();

    // Try @mention format first
    const match = value.match(/@[a-zA-Z0-9._]+/);
    if (match?.[0]) return match[0];

    // Fall back to first segment (before " - ")
    return value
      .split(/\s+-\s+/)[0]
      .replace(/[|·,\s]+$/g, "")
      .trim();
  }
}
