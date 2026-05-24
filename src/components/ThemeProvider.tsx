import { useEffect } from 'react';
import { theme } from '../styles/theme';

const cssVars: Record<string, string> = {
  // Typography — font families
  '--font-family-sans': theme.typography.fontFamily.sans,

  // Typography — font sizes
  '--font-size-2xs':  theme.typography.fontSize['2xs'],
  '--font-size-xs':   theme.typography.fontSize.xs,
  '--font-size-sm':   theme.typography.fontSize.sm,
  '--font-size-md':   theme.typography.fontSize.md,
  '--font-size-base': theme.typography.fontSize.base,
  '--font-size-lg':   theme.typography.fontSize.lg,
  '--font-size-heading': theme.typography.fontSize.heading,
  '--font-size-body':    theme.typography.fontSize.body,
  '--font-size-xl':      theme.typography.fontSize.xl,
  '--font-size-2xl':     theme.typography.fontSize['2xl'],
  '--font-size-icon':    theme.typography.fontSize.icon,
  '--font-size-3xl':     theme.typography.fontSize['3xl'],
  '--font-size-4xl':     theme.typography.fontSize['4xl'],
  '--font-size-page-xs': theme.typography.fontSize['page-xs'],
  '--font-size-page-sm': theme.typography.fontSize['page-sm'],

  // Typography — font weights
  '--font-weight-light':    theme.typography.fontWeight.light,
  '--font-weight-normal':   theme.typography.fontWeight.normal,
  '--font-weight-medium':   theme.typography.fontWeight.medium,
  '--font-weight-semibold': theme.typography.fontWeight.semibold,
  '--font-weight-bold':     theme.typography.fontWeight.bold,

  // Typography — line heights
  '--line-height-none':    theme.typography.lineHeight.none,
  '--line-height-tight':   theme.typography.lineHeight.tight,
  '--line-height-normal':  theme.typography.lineHeight.normal,
  '--line-height-relaxed': theme.typography.lineHeight.relaxed,

  // Typography — letter spacing
  '--letter-spacing-normal':  theme.typography.letterSpacing.normal,
  '--letter-spacing-wide':    theme.typography.letterSpacing.wide,
  '--letter-spacing-wider':   theme.typography.letterSpacing.wider,
  '--letter-spacing-widest':  theme.typography.letterSpacing.widest,

  // Core palette
  '--color-primary': theme.colors.primary,
  '--color-primary-light': theme.colors.primaryLight,
  '--color-bg': theme.colors.bg,
  '--color-surface': theme.colors.surface,
  '--color-border': theme.colors.border,
  '--color-text': theme.colors.text,
  '--color-text-muted': theme.colors.textMuted,
  '--color-error': theme.colors.error,
  '--color-success': theme.colors.success,

  // Plant visualization
  '--color-plant-area-bg': theme.colors.plantAreaBg,
  '--color-plant-area-border': theme.colors.plantAreaBorder,
  '--color-plant-text': theme.colors.plantText,

  // Grid canvas
  '--color-grid-bg': theme.colors.gridBg,
  '--color-grid-viewport-bg': theme.colors.gridViewportBg,
  '--color-grid-line-major': theme.colors.gridLineMajor,
  '--color-grid-line-major-large': theme.colors.gridLineMajorLarge,
  '--color-grid-line-minor': theme.colors.gridLineMinor,
  '--color-grid-over': theme.colors.gridOver,

  // Warning banners
  '--color-warning-text': theme.colors.warningText,
  '--color-warning-bg': theme.colors.warningBg,
  '--color-warning-border': theme.colors.warningBorder,

  // Overlays
  '--color-overlay': theme.colors.overlay,

  // SVG distance lines
  '--color-line-stroke': theme.colors.lineStroke,
  '--color-line-label': theme.colors.lineLabel,
};

interface Props {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: Props) => {
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }
  }, []);

  return <>{children}</>;
};
