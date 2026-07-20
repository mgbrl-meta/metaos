/**
 * Analytics tracking for Zero Purchase Control system
 * Tracks user interactions and performance metrics
 */

export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export class Analytics {
  private static events: AnalyticsEvent[] = [];
  private static maxEvents = 100;
  private static sessionId = this.generateSessionId();

  /**
   * Track user action
   */
  static trackAction(
    name: string,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      metadata,
      sessionId: this.sessionId,
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] ${name}`, metadata);
    }
  }

  /**
   * Track performance metric
   */
  static trackPerformance(
    name: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      name: `perf_${name}`,
      timestamp: Date.now(),
      duration,
      metadata,
      sessionId: this.sessionId,
    };

    this.events.push(event);

    // Warn if slow
    if (duration > 1000) {
      console.warn(`[Performance] ${name} took ${duration}ms`);
    }

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Track error
   */
  static trackError(
    error: Error,
    context?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      name: "error",
      timestamp: Date.now(),
      metadata: {
        message: error.message,
        stack: error.stack,
        ...context,
      },
      sessionId: this.sessionId,
    };

    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    console.error("[Analytics] Error tracked:", error.message, context);
  }

  /**
   * Get all tracked events
   */
  static getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get events of specific type
   */
  static getEventsByName(name: string): AnalyticsEvent[] {
    return this.events.filter(e => e.name === name);
  }

  /**
   * Clear all events
   */
  static clear(): void {
    this.events = [];
  }

  /**
   * Export events as JSON (for debugging/analysis)
   */
  static export(): string {
    return JSON.stringify(
      {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        events: this.events,
      },
      null,
      2
    );
  }

  /**
   * Get session summary
   */
  static getSummary(): {
    sessionId: string;
    eventCount: number;
    errorCount: number;
    avgPerformance: number;
    duration: number;
  } {
    const errors = this.events.filter(e => e.name === "error");
    const perf = this.events.filter(e => e.name.startsWith("perf_"));
    const avgDuration = perf.length > 0
      ? perf.reduce((sum, e) => sum + (e.duration || 0), 0) / perf.length
      : 0;

    const firstEvent = this.events[0];
    const lastEvent = this.events[this.events.length - 1];
    const duration = firstEvent && lastEvent
      ? lastEvent.timestamp - firstEvent.timestamp
      : 0;

    return {
      sessionId: this.sessionId,
      eventCount: this.events.length,
      errorCount: errors.length,
      avgPerformance: Math.round(avgDuration),
      duration,
    };
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Hook-friendly wrapper for tracking
 */
export function useAnalytics() {
  return {
    track: (name: string, metadata?: any) => Analytics.trackAction(name, metadata),
    trackPerf: (name: string, duration: number, metadata?: any) =>
      Analytics.trackPerformance(name, duration, metadata),
    trackError: (error: Error, context?: any) => Analytics.trackError(error, context),
    getSummary: () => Analytics.getSummary(),
    export: () => Analytics.export(),
  };
}
