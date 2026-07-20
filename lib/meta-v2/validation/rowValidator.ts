import type { MetaV2CleanRow, MetaV2RawValue } from "@/lib/meta-v2/schema";
import { safeNumber } from "@/lib/meta-v2/calculationCore";

export interface ValidationError {
  rowIndex: number;
  field: string;
  value: MetaV2RawValue;
  message: string;
}

export class RowValidator {
  static validateRow(row: any, rowIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required fields exist
    const required = ["date", "spend", "purchases", "impressions", "clicks"];
    for (const field of required) {
      const value = row[field];
      if (value === null || value === undefined || value === "") {
        errors.push({
          rowIndex,
          field,
          value,
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Check numeric fields are valid
    const numeric = ["spend", "revenue", "purchases", "impressions", "clicks", "lpv", "atc"];
    for (const field of numeric) {
      const value = row[field];
      if (value !== null && value !== undefined && value !== "") {
        const num = safeNumber(value);
        if (!Number.isFinite(num) || num < 0) {
          errors.push({
            rowIndex,
            field,
            value,
            message: `Invalid ${field}: expected non-negative number, got "${value}"`,
          });
        }
      }
    }

    // Validate date format
    if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(row.date))) {
      errors.push({
        rowIndex,
        field: "date",
        value: row.date,
        message: `Invalid date format: expected YYYY-MM-DD, got "${row.date}"`,
      });
    }

    return errors;
  }

  static validateRows(rows: any[]): ValidationError[] {
    const allErrors: ValidationError[] = [];
    for (let i = 0; i < rows.length; i++) {
      allErrors.push(...this.validateRow(rows[i], i));
    }
    return allErrors;
  }

  static throwIfInvalid(rows: any[]): void {
    const errors = this.validateRows(rows);
    if (errors.length > 0) {
      const sample = errors.slice(0, 3)
        .map(e => `Row ${e.rowIndex}: ${e.field} - ${e.message}`)
        .join("; ");
      const msg = errors.length > 3 ? `${sample}... (${errors.length} total errors)` : sample;
      throw new Error(`Data validation failed: ${msg}`);
    }
  }
}
