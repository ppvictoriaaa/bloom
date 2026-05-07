import { useEffect } from 'react';
import { theme } from '../styles/theme';

const cssVars: Record<string, string> = {
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
