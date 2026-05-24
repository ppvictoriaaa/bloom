export const theme = {
  typography: {
    fontFamily: {
      sans: "'Share Tech', sans-serif",
    },
    // Pixel-based scale for dense editor UI; rem values for page-level headings
    fontSize: {
      '2xs':     '11px',   // micro labels, grid annotations
      xs:        '12px',   // tiny labels, day numbers
      sm:        '13px',   // hints, tags, secondary
      md:        '14px',   // labels, small buttons
      base:      '15px',   // primary body text
      lg:        '16px',   // medium body, inputs
      heading:   '17px',   // calendar date headers, tabs
      body:      '1.05rem',// standard full-page body
      xl:        '19px',   // subheadings
      '2xl':     '21px',   // modal headings
      icon:      '28px',   // large emoji / icon display
      '3xl':     '1.6rem', // section headings
      '4xl':     '1.85rem',// page headings
      'page-xs': '0.9rem', // small page meta text
      'page-sm': '1.35rem',// page card titles
    },
    fontWeight: {
      light:    '300',
      normal:   '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
    },
    lineHeight: {
      none:    '1',
      tight:   '1.3',
      normal:  '1.4',
      relaxed: '1.5',
    },
    letterSpacing: {
      normal:  '0',
      wide:    '0.04em',
      wider:   '0.05em',
      widest:  '0.06em',
    },
  },
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
