/**
 * Performance utilities for optimization and monitoring
 */

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();

  static start(label: string): void {
    this.marks.set(label, performance.now());
  }

  static end(label: string): number {
    const start = this.marks.get(label);
    if (!start) {
      console.warn(`No start mark for "${label}"`);
      return 0;
    }

    const duration = performance.now() - start;
    this.marks.delete(label);

    if (duration > 100) {
      console.warn(`Slow operation "${label}": ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      return fn();
    } finally {
      this.end(label);
    }
  }
}

/**
 * Batch updates to reduce re-renders
 */
export function batchUpdates<T>(fn: () => T): T {
  // In React 18+, updates are batched automatically
  // This is a no-op but kept for explicit intent
  return fn();
}

/**
 * Check if data has changed (for optimization)
 */
export function hasChanged<T>(prev: T, next: T): boolean {
  if (prev === next) return false;
  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return true;
    return !prev.every((item, idx) => item === next[idx]);
  }
  return true;
}

/**
 * Get size of object in bytes (for monitoring)
 */
export function getObjectSize(obj: any): number {
  const objectList: any[] = [];
  const stack = [obj];
  let bytes = 0;

  while (stack.length) {
    const value = stack.pop();

    if (typeof value === "boolean") {
      bytes += 4;
    } else if (typeof value === "string") {
      bytes += value.length * 2;
    } else if (typeof value === "number") {
      bytes += 8;
    } else if (typeof value === "object" && value !== null) {
      if (objectList.indexOf(value) === -1) {
        objectList.push(value);

        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            stack.push(value[i]);
          }
        } else {
          for (const key in value) {
            if (value.hasOwnProperty(key)) {
              stack.push(value[key]);
            }
          }
        }
      }
    }
  }
  return bytes;
}
