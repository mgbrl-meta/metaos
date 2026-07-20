import { useMemo, useState, useCallback } from "react";
import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";
import type { MetaV2ZeroPurchaseOutput } from "@/lib/meta-v2/engines/zeroPurchaseEngine";
import { ZeroPurchaseService } from "@/lib/meta-v2/services/zeroPurchaseService";

interface UseZeroPurchaseDataOptions {
  initialThreshold?: number;
  onError?: (error: Error) => void;
}

export function useZeroPurchaseData(
  rows: MetaV2CleanRow[],
  options: UseZeroPurchaseDataOptions = {}
) {
  const { initialThreshold = 3000, onError } = options;

  const [threshold, setThreshold] = useState(initialThreshold);
  const [error, setError] = useState<Error | null>(null);

  // Process with memoization
  const output = useMemo<MetaV2ZeroPurchaseOutput | null>(() => {
    try {
      setError(null);
      return ZeroPurchaseService.process(rows, threshold);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      onError?.(error);
      return null;
    }
  }, [rows, threshold, onError]);

  const updateThreshold = useCallback((value: number) => {
    setThreshold(Math.max(0, value));
  }, []);

  return {
    output,
    threshold,
    updateThreshold,
    error,
    isLoading: false,
  };
}
