export const METAOS_THEMES = [
  "light",
  "dark",
] as const;

export type MetaOSTheme =
  (typeof METAOS_THEMES)[number];

export const METAOS_TONES = [
  "neutral",
  "positive",
  "negative",
] as const;

export type MetaOSTone =
  (typeof METAOS_TONES)[number];

export const METAOS_DENSITIES = [
  "compact",
] as const;

export type MetaOSDensity =
  (typeof METAOS_DENSITIES)[number];

export interface MetaOSThemeContract {
  theme: MetaOSTheme;
  density: MetaOSDensity;
}

export const DEFAULT_METAOS_THEME_CONTRACT:
  MetaOSThemeContract = {
    theme: "light",
    density: "compact",
  };

export function isMetaOSTheme(
  value: unknown
): value is MetaOSTheme {
  return (
    typeof value === "string" &&
    METAOS_THEMES.includes(
      value as MetaOSTheme
    )
  );
}
