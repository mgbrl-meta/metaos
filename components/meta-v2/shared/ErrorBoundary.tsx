"use client";

import { AlertCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface ErrorBoundaryProps {
  error: Error;
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorBoundary({
  error,
  title,
  description,
  onRetry,
}: ErrorBoundaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rounded-[24px] border border-red-600/30 bg-red-500/10 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />

        <div className="flex-1">
          <h3 className="text-lg font-black text-red-300">
            {title || "Error Processing Data"}
          </h3>

          <p className="mt-2 text-sm text-red-200/80">
            {description || error.message}
          </p>

          {/* Details Toggle */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-black text-red-300 hover:text-red-200"
          >
            {showDetails ? "Hide" : "Show"} Technical Details
            <ChevronDown className={`h-3 w-3 transition ${showDetails ? "rotate-180" : ""}`} />
          </button>

          {showDetails && (
            <pre className="mt-3 max-h-40 overflow-auto rounded bg-red-950/50 p-2 text-xs text-red-200/60 font-mono whitespace-pre-wrap break-words">
              {error.stack}
            </pre>
          )}

          {/* Action Button */}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex px-4 py-2 rounded-full bg-red-600 text-white text-xs font-black hover:bg-red-700 transition"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
