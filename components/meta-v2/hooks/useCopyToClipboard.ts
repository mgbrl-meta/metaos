import { useCallback, useState, useRef } from "react";

interface UseCopyToClipboardOptions {
  duration?: number;
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { duration = 1800 } = options;
  const [copied, setCopied] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string | string[], message?: string) => {
      try {
        const content = Array.isArray(text) ? text.join("\n") : text;
        await navigator.clipboard.writeText(content);

        const msg = message || `Copied ${Array.isArray(text) ? text.length : 1} item(s)`;
        setCopied(msg);

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          setCopied("");
          timerRef.current = null;
        }, duration);
      } catch (error) {
        console.error("Copy failed:", error);
        setCopied("Failed to copy");
      }
    },
    [duration]
  );

  return { copied, copy };
}
