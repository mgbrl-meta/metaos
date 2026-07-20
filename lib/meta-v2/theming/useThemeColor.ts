/**
 * Theme-aware color utilities
 * Maps semantic colors to CSS classes that automatically respond to theme changes
 */

import { LIGHT_THEME, DARK_THEME } from './themeContract';

export type ThemeColorKey =
  | 'text-primary'
  | 'text-secondary'
  | 'text-tertiary'
  | 'text-inverse'
  | 'bg-base'
  | 'bg-surface'
  | 'bg-surface-subtle'
  | 'bg-surface-strong'
  | 'status-success'
  | 'status-success-soft'
  | 'status-error'
  | 'status-error-soft'
  | 'status-warning'
  | 'status-warning-soft'
  | 'status-info'
  | 'status-info-soft'
  | 'border'
  | 'border-strong'
  | 'border-subtle'
  | 'chart-positive'
  | 'chart-neutral'
  | 'chart-negative'
  | 'chart-warning'
  | 'button-primary'
  | 'button-primary-hover'
  | 'button-secondary'
  | 'button-secondary-hover';

/**
 * Mapping from semantic color keys to CSS custom properties
 * These variables automatically update when data-theme attribute changes
 */
const COLOR_MAPPING: Record<ThemeColorKey, string> = {
  // Text colors
  'text-primary': 'var(--theme-text-primary)',
  'text-secondary': 'var(--theme-text-secondary)',
  'text-tertiary': 'var(--theme-text-tertiary)',
  'text-inverse': 'var(--theme-text-inverse)',

  // Background colors
  'bg-base': 'var(--theme-bg-base)',
  'bg-surface': 'var(--theme-bg-surface)',
  'bg-surface-subtle': 'var(--theme-bg-surface-subtle)',
  'bg-surface-strong': 'var(--theme-bg-surface-strong)',

  // Status colors
  'status-success': 'var(--theme-status-success)',
  'status-success-soft': 'var(--theme-status-success-soft)',
  'status-error': 'var(--theme-status-error)',
  'status-error-soft': 'var(--theme-status-error-soft)',
  'status-warning': 'var(--theme-status-warning)',
  'status-warning-soft': 'var(--theme-status-warning-soft)',
  'status-info': 'var(--theme-status-info)',
  'status-info-soft': 'var(--theme-status-info-soft)',

  // Border colors
  'border': 'var(--theme-border)',
  'border-strong': 'var(--theme-border-strong)',
  'border-subtle': 'var(--theme-border-subtle)',

  // Chart colors
  'chart-positive': 'var(--theme-chart-positive)',
  'chart-neutral': 'var(--theme-chart-neutral)',
  'chart-negative': 'var(--theme-chart-negative)',
  'chart-warning': 'var(--theme-chart-warning)',

  // Component colors
  'button-primary': 'var(--theme-button-primary)',
  'button-primary-hover': 'var(--theme-button-primary-hover)',
  'button-secondary': 'var(--theme-button-secondary)',
  'button-secondary-hover': 'var(--theme-button-secondary-hover)',
};

/**
 * Get CSS custom property for a semantic color
 * Use in inline styles: style={{ color: themeColor('text-primary') }}
 */
export function themeColor(key: ThemeColorKey): string {
  return COLOR_MAPPING[key] || 'inherit';
}

/**
 * Get class name for a semantic color
 * For use with Tailwind or CSS modules
 * Fallback: uses hardcoded hex values as last resort
 */
export function getThemeColorClass(
  key: ThemeColorKey,
  isDark: boolean = false
): string {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  let colorValue: string = 'inherit';

  switch (key) {
    // Text colors
    case 'text-primary':
      colorValue = theme.colors.text.primary;
      break;
    case 'text-secondary':
      colorValue = theme.colors.text.secondary;
      break;
    case 'text-tertiary':
      colorValue = theme.colors.text.tertiary;
      break;
    case 'text-inverse':
      colorValue = theme.colors.text.inverse;
      break;

    // Status colors
    case 'status-success':
      colorValue = theme.colors.status.success;
      break;
    case 'status-error':
      colorValue = theme.colors.status.error;
      break;
    case 'status-warning':
      colorValue = theme.colors.status.warning;
      break;
    case 'status-info':
      colorValue = theme.colors.status.info;
      break;

    // Chart colors
    case 'chart-positive':
      colorValue = theme.colors.chart.positive;
      break;
    case 'chart-negative':
      colorValue = theme.colors.chart.negative;
      break;
    case 'chart-warning':
      colorValue = theme.colors.chart.warning;
      break;
  }

  return colorValue;
}

/**
 * Create inline style object with theme colors
 * Usage: <div style={themeStyles({ color: 'text-primary', backgroundColor: 'bg-surface' })} />
 */
export function themeStyles(
  colorMap: Partial<Record<keyof React.CSSProperties, ThemeColorKey>>
): React.CSSProperties {
  const styles: React.CSSProperties = {};

  for (const [cssKey, themeKey] of Object.entries(colorMap)) {
    if (themeKey && COLOR_MAPPING[themeKey as ThemeColorKey]) {
      (styles as any)[cssKey] = COLOR_MAPPING[themeKey as ThemeColorKey];
    }
  }

  return styles;
}

/**
 * React Hook: Get current theme colors
 * Automatically updates when theme changes
 */
export function useThemeColors() {
  const isDark = typeof window !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') === 'dark'
    : false;

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return {
    isDark,
    theme: theme.colors,
    color: (key: ThemeColorKey) => getThemeColorClass(key, isDark),
  };
}
