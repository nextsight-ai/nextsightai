/**
 * Design Tokens - NextSight v2.0
 * Glassy Black Design System - Dark Glassmorphism
 */

// Color Palette - Minimal & Dark
export const colors = {
  // Primary - Subtle white/gray for dark theme
  primary: {
    50: '#ffffff',
    100: '#f9fafb',
    200: '#f3f4f6',
    300: '#e5e7eb',
    400: '#d1d5db',
    500: '#9ca3af',  // Subtle gray accent
    600: '#6b7280',
    700: '#4b5563',
    800: '#374151',
    900: '#1f2937',
    950: '#111827',
  },

  // Accent - Minimal blue for subtle highlights
  accent: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // Subtle blue accent
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Gray - Neutral shades for text, borders, backgrounds
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Semantic Colors
  success: {
    light: '#d1fae5',
    DEFAULT: '#10b981',
    dark: '#065f46',
  },
  warning: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark: '#92400e',
  },
  error: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark: '#991b1b',
  },
  info: {
    light: '#dbeafe',
    DEFAULT: '#3b82f6',
    dark: '#1e40af',
  },
};

// Spacing Scale (based on 4px grid)
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
};

// Typography Scale
export const typography = {
  // Headings
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold',
  h4: 'text-xl font-medium',
  h5: 'text-lg font-medium',

  // Body text
  body: 'text-base font-normal',
  bodyLarge: 'text-lg font-normal',
  bodySmall: 'text-sm font-normal',

  // Special text
  caption: 'text-sm text-gray-600',
  overline: 'text-xs uppercase tracking-wide font-semibold',
  code: 'font-mono text-sm',
};

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
};

// Glassmorphism - Glass effect styles
export const glass = {
  background: 'rgba(0, 0, 0, 0.6)',  // Dark glass
  backgroundLight: 'rgba(0, 0, 0, 0.4)',  // Lighter glass
  backgroundHeavy: 'rgba(0, 0, 0, 0.8)',  // Heavier glass
  border: 'rgba(255, 255, 255, 0.1)',  // Subtle border
  borderHover: 'rgba(255, 255, 255, 0.2)',  // Hover border
};

// Shadows (for elevation) - Dark glassmorphism
export const shadows = {
  none: 'none',
  sm: '0 2px 8px 0 rgba(0, 0, 0, 0.4)',
  md: '0 4px 16px 0 rgba(0, 0, 0, 0.5)',
  lg: '0 8px 24px 0 rgba(0, 0, 0, 0.6)',
  xl: '0 16px 48px 0 rgba(0, 0, 0, 0.7)',
  '2xl': '0 24px 64px 0 rgba(0, 0, 0, 0.8)',
  inner: 'inset 0 2px 8px 0 rgba(0, 0, 0, 0.3)',
  glow: '0 0 16px rgba(14, 165, 233, 0.3)',  // Subtle blue glow
  glowWhite: '0 0 16px rgba(255, 255, 255, 0.1)',  // Subtle white glow
};

// Z-Index Scale (for layering)
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// Transitions
export const transitions = {
  fast: '150ms ease-in-out',
  normal: '250ms ease-in-out',
  slow: '350ms ease-in-out',
};

// Breakpoints (for responsive design)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Status Colors (for badges, indicators)
export const statusColors = {
  running: colors.success.DEFAULT,
  pending: colors.warning.DEFAULT,
  failed: colors.error.DEFAULT,
  succeeded: colors.success.DEFAULT,
  unknown: colors.gray[400],
  terminating: colors.warning.DEFAULT,
  active: colors.success.DEFAULT,
  inactive: colors.gray[400],
};

// Export combined theme object
export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  glass,
  shadows,
  zIndex,
  transitions,
  breakpoints,
  statusColors,
};

export default theme;
