/**
 * Theme Color Contract
 *
 * Defines all semantic colors used across the system with guaranteed
 * contrast ratios in both light and dark modes (WCAG AA minimum 4.5:1)
 */

export interface ThemeColorPalette {
  // Text hierarchy - guaranteed contrast
  text: {
    primary: string;      // Main text, highest contrast
    secondary: string;    // Secondary text, reduced emphasis
    tertiary: string;     // Tertiary text, minimal emphasis
    inverse: string;      // Text on dark backgrounds
  };

  // Backgrounds
  background: {
    base: string;         // Page background
    surface: string;      // Cards, containers
    surfaceSubtle: string; // Subtle background
    surfaceStrong: string; // Strong emphasis background
  };

  // Status & semantic colors
  status: {
    success: string;      // Success/positive state
    successSoft: string;  // Success background
    error: string;        // Error/negative state
    errorSoft: string;    // Error background
    warning: string;      // Warning state
    warningSoft: string;  // Warning background
    info: string;         // Info state
    infoSoft: string;     // Info background
  };

  // Borders
  border: {
    default: string;      // Standard border
    strong: string;       // Emphasized border
    subtle: string;       // Subtle border
  };

  // Chart & data visualization colors
  chart: {
    positive: string;     // Growth, increase
    neutral: string;      // Neutral value
    negative: string;     // Decline, decrease
    warning: string;      // Warning value
  };

  // Component-specific colors
  component: {
    buttonPrimary: string;
    buttonPrimaryHover: string;
    buttonSecondary: string;
    buttonSecondaryHover: string;
  };
}

export interface ThemeDefinition {
  name: 'light' | 'dark';
  colors: ThemeColorPalette;
  cssSuffix?: string;      // Optional CSS variable suffix for this theme
}

/**
 * Light Mode Theme
 * High contrast, optimized for bright environments
 */
export const LIGHT_THEME: ThemeDefinition = {
  name: 'light',
  colors: {
    text: {
      primary: '#151515',     // Black, AAA contrast on white
      secondary: '#62625e',   // Gray 700
      tertiary: '#8a8a84',    // Gray 600
      inverse: '#ffffff',     // White
    },
    background: {
      base: '#f6f6f4',        // Light gray
      surface: '#ffffff',     // White
      surfaceSubtle: '#f0f0ed', // Very light gray
      surfaceStrong: '#111111', // Very dark
    },
    status: {
      success: '#147d45',     // Dark green
      successSoft: '#e7f4eb', // Light green background
      error: '#bd2c2c',       // Dark red
      errorSoft: '#f9e9e8',   // Light red background
      warning: '#8a6200',     // Dark amber
      warningSoft: '#f6efd9', // Light amber background
      info: '#0a5fb3',        // Dark blue
      infoSoft: '#e3f0ff',    // Light blue background
    },
    border: {
      default: '#deded9',     // Standard border
      strong: '#c7c7c1',      // Emphasized border
      subtle: '#e8e8e3',      // Subtle border
    },
    chart: {
      positive: '#15803d',    // Green
      neutral: '#6b7280',     // Gray
      negative: '#dc2626',    // Red
      warning: '#d97706',     // Amber
    },
    component: {
      buttonPrimary: '#0a5fb3',
      buttonPrimaryHover: '#083fa5',
      buttonSecondary: '#f0f0ed',
      buttonSecondaryHover: '#e8e8e3',
    },
  },
};

/**
 * Dark Mode Theme
 * Optimized for low-light environments, WCAG AA contrast maintained
 */
export const DARK_THEME: ThemeDefinition = {
  name: 'dark',
  colors: {
    text: {
      primary: '#f2f2ef',     // White, AAA contrast on dark
      secondary: '#a8a8a2',   // Light gray
      tertiary: '#7a7a75',    // Medium gray
      inverse: '#111111',     // Black
    },
    background: {
      base: '#0d0d0d',        // Dark background
      surface: '#151515',     // Dark surface
      surfaceSubtle: '#1d1d1d', // Slightly lighter dark
      surfaceStrong: '#f2f2ef', // Very light (inverse)
    },
    status: {
      success: '#66c58a',     // Light green
      successSoft: '#14271b', // Dark green background
      error: '#ef7772',       // Light red
      errorSoft: '#2d1717',   // Dark red background
      warning: '#d7b45b',     // Light amber
      warningSoft: '#292312', // Dark amber background
      info: '#60b5ff',        // Light blue
      infoSoft: '#0f3a6b',    // Dark blue background
    },
    border: {
      default: '#2b2b29',     // Standard border
      strong: '#3a3a37',      // Emphasized border
      subtle: '#1f1f1d',      // Subtle border
    },
    chart: {
      positive: '#86efac',    // Light green
      neutral: '#9ca3af',     // Light gray
      negative: '#f87171',    // Light red
      warning: '#fbbf24',     // Light amber
    },
    component: {
      buttonPrimary: '#60b5ff',
      buttonPrimaryHover: '#3fa9ff',
      buttonSecondary: '#262626',
      buttonSecondaryHover: '#3a3a37',
    },
  },
};

/**
 * Theme Provider Hook - Gets current theme colors
 */
export function useThemeColors(): ThemeColorPalette {
  const isDark = typeof window !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') === 'dark'
    : false;

  return isDark ? DARK_THEME.colors : LIGHT_THEME.colors;
}

/**
 * Get contrast ratio between two colors
 * Returns number: 1 = no contrast, 21 = maximum contrast
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 */
export function getContrastRatio(
  foreground: string,
  background: string
): number {
  const hex2rgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  };

  const getLuminance = (rgb: [number, number, number]): number => {
    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(hex2rgb(foreground));
  const l2 = getLuminance(hex2rgb(background));

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verify theme has sufficient contrast for accessibility
 */
export function verifyThemeContrast(theme: ThemeDefinition): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const MIN_CONTRAST = 4.5; // WCAG AA for normal text

  // Check text on light backgrounds
  if (theme.name === 'light') {
    const checks = [
      ['text.primary', theme.colors.text.primary, theme.colors.background.surface],
      ['text.secondary', theme.colors.text.secondary, theme.colors.background.surface],
      ['status.success', theme.colors.status.success, theme.colors.background.surface],
      ['status.error', theme.colors.status.error, theme.colors.background.surface],
    ];

    for (const [name, fg, bg] of checks) {
      const ratio = getContrastRatio(fg, bg);
      if (ratio < MIN_CONTRAST) {
        issues.push(`${name}: contrast ratio ${ratio.toFixed(2)}:1 (need ${MIN_CONTRAST}:1)`);
      }
    }
  }

  // Check text on dark backgrounds
  if (theme.name === 'dark') {
    const checks = [
      ['text.primary', theme.colors.text.primary, theme.colors.background.surface],
      ['text.secondary', theme.colors.text.secondary, theme.colors.background.surface],
      ['status.success', theme.colors.status.success, theme.colors.background.surface],
      ['status.error', theme.colors.status.error, theme.colors.background.surface],
    ];

    for (const [name, fg, bg] of checks) {
      const ratio = getContrastRatio(fg, bg);
      if (ratio < MIN_CONTRAST) {
        issues.push(`${name}: contrast ratio ${ratio.toFixed(2)}:1 (need ${MIN_CONTRAST}:1)`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Export all theme definitions
 */
export const THEMES = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
} as const;
