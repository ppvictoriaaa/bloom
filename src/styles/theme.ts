export const theme = {
  colors: {
    // Core palette
    primary: '#4a7c59',
    primaryLight: '#6a9e76',
    bg: '#f5f7f4',
    surface: '#ffffff',
    border: '#e2e8e0',
    text: '#1a1f1b',
    textMuted: '#6b7c6e',
    error: '#d94f4f',
    success: '#3a8f5a',

    // Plant visualization
    plantAreaBg: 'rgba(80, 160, 80, 0.08)',
    plantAreaBorder: 'rgba(50, 130, 50, 0.25)',
    plantText: '#2a5a2a',

    // Grid canvas
    gridBg: '#ffffff',
    gridViewportBg: '#fafaf8',
    gridLineMajor: '#b8b8b0',
    gridLineMajorLarge: '#555550',
    gridLineMinor: '#e2e2dc',
    gridOver: '#f0f8f0',

    // Warning banners
    warningText: '#7a5200',
    warningBg: '#fff8e1',
    warningBorder: '#f0c040',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.35)',

    // SVG distance lines
    lineStroke: '#555555',
    lineLabel: '#222222',
  },
} as const;

export type Theme = typeof theme;
export type ThemeColors = (typeof theme)['colors'];
