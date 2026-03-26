/**
 * Linear/Minimal Design System
 * Centralized design tokens and utilities for consistent UI across NextSight
 */

// ============================================================================
// DESIGN TOKENS
// ============================================================================

/**
 * Monospace font stack for data display
 */
export const mono = {
  fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
};

/**
 * Color palette - Linear/Minimal design
 */
export const colors = {
  // Base
  background: '#0a0a0a',
  text: '#fafafa',
  textSecondary: '#525252',
  textTertiary: '#404040',

  // Borders
  border: 'rgba(255,255,255,0.04)',
  borderLight: 'rgba(255,255,255,0.1)',

  // Status colors
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#3b82f6',

  // Data visualization
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  pink: '#ec4899',
  teal: '#14b8a6',
  orange: '#f59e0b',
};

/**
 * Typography scale
 */
export const typography = {
  // Large numbers (metrics)
  metricValue: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: -1.5,
    ...mono,
  },

  // Metric labels
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 3,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  // Metric subtitle
  metricSubtitle: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
    ...mono,
  },

  // Page title
  pageTitle: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    letterSpacing: -0.5,
    marginBottom: 2,
  },

  // Page subtitle
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    margin: 0,
  },

  // Section header
  sectionHeader: {
    fontSize: 10,
    fontWeight: 500,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Table header
  tableHeader: {
    fontSize: 10,
    fontWeight: 500,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  // Table cell
  tableCell: {
    fontSize: 11,
    color: colors.text,
  },

  // Body text
  body: {
    fontSize: 12,
    color: colors.text,
  },

  // Small text
  small: {
    fontSize: 10,
    color: colors.textSecondary,
  },
};

/**
 * Spacing scale
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

/**
 * Layout dimensions
 */
export const layout = {
  headerPadding: '16px 32px',
  mainPadding: '24px 32px',
  footerPadding: '12px 32px',
  gap: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create inline metric display style
 * @param value - The metric value to display
 * @param label - The metric label
 * @param color - Optional color from the color palette
 * @param subtitle - Optional subtitle text
 */
export function createMetric(
  _value: string | number,
  _label: string,
  color?: string,
  subtitle?: string
) {
  return {
    container: {},
    value: {
      ...typography.metricValue,
      color: color || colors.text,
    },
    label: typography.metricLabel,
    subtitle: subtitle ? typography.metricSubtitle : undefined,
  };
}

/**
 * Create status dot style
 * @param status - Status type
 * @param size - Optional size (default: 5)
 * @param glow - Whether to add glow effect
 */
export function createStatusDot(
  status: 'success' | 'warning' | 'error' | 'info' | 'default',
  size: number = 5,
  glow: boolean = false
): React.CSSProperties {
  const statusColors = {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    default: colors.textSecondary,
  };

  return {
    width: size,
    height: size,
    borderRadius: '50%',
    background: statusColors[status],
    boxShadow: glow && status === 'error' ? `0 0 6px ${statusColors[status]}` : 'none',
  };
}

/**
 * Create page header style
 */
export function createPageHeader() {
  return {
    container: {
      padding: layout.headerPadding,
      borderBottom: `1px solid ${colors.border}`,
      flexShrink: 0,
    },
    title: typography.pageTitle,
    subtitle: typography.pageSubtitle,
  };
}

/**
 * Create page main content style
 */
export function createPageMain() {
  return {
    padding: layout.mainPadding,
  };
}

/**
 * Create section header style
 */
export function createSectionHeader(text?: string) {
  return {
    ...typography.sectionHeader,
    ...(text && { children: text }),
  };
}

/**
 * Create table header row style
 */
export function createTableHeader() {
  return {
    display: 'grid',
    paddingBottom: 8,
    borderBottom: `1px solid ${colors.border}`,
    ...typography.tableHeader,
  };
}

/**
 * Create table row style
 * @param isLast - Whether this is the last row
 */
export function createTableRow(isLast: boolean = false): React.CSSProperties {
  return {
    display: 'grid',
    padding: '10px 0',
    borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
    ...typography.tableCell,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  };
}

/**
 * Create hover effect handler for table rows
 */
export const tableRowHoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '0.7';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
  },
};

/**
 * Create empty state style
 */
export function createEmptyState(message: string) {
  return {
    style: {
      padding: '48px 0',
      textAlign: 'center' as const,
      color: colors.textTertiary,
      fontSize: 12,
    },
    message,
  };
}

/**
 * Create error/alert box style
 */
export function createAlertBox(
  type: 'error' | 'warning' | 'info' | 'success' = 'error'
): React.CSSProperties {
  const alertColors = {
    error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: colors.error },
    warning: { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', text: colors.warning },
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: colors.info },
    success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: colors.success },
  };

  const config = alertColors[type];

  return {
    padding: 12,
    borderRadius: 8,
    background: config.bg,
    border: `1px solid ${config.border}`,
    color: config.text,
    fontSize: 12,
    marginBottom: 24,
  };
}

/**
 * Create button style
 */
export function createButton(variant: 'refresh' | 'primary' | 'secondary' = 'refresh'): React.CSSProperties {
  const variants = {
    refresh: {
      background: 'transparent',
      border: 'none',
      color: colors.textSecondary,
      cursor: 'pointer',
      fontSize: 11,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    primary: {
      background: colors.info,
      border: 'none',
      color: colors.text,
      cursor: 'pointer',
      fontSize: 12,
      padding: '8px 16px',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    secondary: {
      background: 'transparent',
      border: `1px solid ${colors.border}`,
      color: colors.text,
      cursor: 'pointer',
      fontSize: 12,
      padding: '8px 16px',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
  };

  return variants[variant];
}

/**
 * Create select/dropdown style
 */
export function createSelect(): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.borderLight}`,
    padding: '2px 0',
    fontSize: 12,
    color: colors.text,
    outline: 'none',
    cursor: 'pointer',
  };
}

/**
 * Create input style
 */
export function createInput(): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.borderLight}`,
    padding: '2px 4px',
    fontSize: 12,
    color: colors.text,
    outline: 'none',
  };
}

// ============================================================================
// LAYOUT UTILITIES
// ============================================================================

/**
 * Create full-page container (fits viewport)
 */
export function createPageContainer(): React.CSSProperties {
  return {
    height: '100vh',
    background: colors.background,
    color: colors.text,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };
}

/**
 * Create scrollable page container
 */
export function createScrollablePageContainer(): React.CSSProperties {
  return {
    minHeight: '100vh',
    background: colors.background,
    color: colors.text,
  };
}

/**
 * Create metrics grid (2-6 columns)
 */
export function createMetricsGrid(columns: number = 4, gap: number = 24): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap,
  };
}

/**
 * Create table grid
 */
export function createTableGrid(columns: string[], gap: number = 12): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: columns.join(' '),
    gap,
  };
}

// ============================================================================
// COMPONENT HELPERS
// ============================================================================

export interface InlineMetricProps {
  value: string | number;
  label: string;
  color?: string;
  subtitle?: string;
}

export interface StatusDotProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: number;
  glow?: boolean;
}

// ============================================================================
// THEME-AWARE COLOR SYSTEM (Techerly-style light + dark)
// ============================================================================

export interface ThemeColors {
  // Backgrounds
  sidebarBg: string;
  sidebarBorder: string;
  mainBg: string;
  headerBg: string;
  headerBorder: string;
  cardBg: string;
  cardBorder: string;

  // Text
  text: string;
  textSub: string;
  textMuted: string;

  // Navigation
  navActiveBg: string;
  navActiveText: string;
  navActiveIcon: string;
  navHoverBg: string;
  navDefaultText: string;
  navDefaultIcon: string;
  sectionLabel: string;

  // Status
  success: string;
  warning: string;
  error: string;
  info: string;
  successBg: string;
  warningBg: string;
  errorBg: string;
  infoBg: string;

  // Badge colors by name
  badgeColors: Record<string, { bg: string; text: string }>;
}

export const lightThemeColors: ThemeColors = {
  sidebarBg: '#FFFFFF',
  sidebarBorder: '#E5E7EB',
  mainBg: '#F8F9FA',
  headerBg: '#FFFFFF',
  headerBorder: '#E5E7EB',
  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',

  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',

  navActiveBg: '#EBEBEB',
  navActiveText: '#111827',
  navActiveIcon: '#374151',
  navHoverBg: '#F3F4F6',
  navDefaultText: '#374151',
  navDefaultIcon: '#6B7280',
  sectionLabel: '#9CA3AF',

  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#3B82F6',
  successBg: '#F0FDF4',
  warningBg: '#FFFBEB',
  errorBg: '#FEF2F2',
  infoBg: '#EFF6FF',

  badgeColors: {
    blue: { bg: '#EFF6FF', text: '#3B82F6' },
    red: { bg: '#FEF2F2', text: '#EF4444' },
    purple: { bg: '#F5F3FF', text: '#7C3AED' },
    amber: { bg: '#FFFBEB', text: '#D97706' },
    green: { bg: '#F0FDF4', text: '#16A34A' },
  },
};

export const darkThemeColors: ThemeColors = {
  sidebarBg: '#111111',
  sidebarBorder: 'rgba(255,255,255,0.06)',
  mainBg: '#0a0a0a',
  headerBg: '#111111',
  headerBorder: 'rgba(255,255,255,0.06)',
  cardBg: '#111111',
  cardBorder: 'rgba(255,255,255,0.08)',

  text: '#F9FAFB',
  textSub: '#9CA3AF',
  textMuted: '#6B7280',

  navActiveBg: 'rgba(255,255,255,0.08)',
  navActiveText: '#F9FAFB',
  navActiveIcon: '#60A5FA',
  navHoverBg: 'rgba(255,255,255,0.04)',
  navDefaultText: '#9CA3AF',
  navDefaultIcon: '#6B7280',
  sectionLabel: '#4B5563',

  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  successBg: 'rgba(34,197,94,0.12)',
  warningBg: 'rgba(234,179,8,0.12)',
  errorBg: 'rgba(239,68,68,0.12)',
  infoBg: 'rgba(59,130,246,0.12)',

  badgeColors: {
    blue: { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA' },
    red: { bg: 'rgba(239,68,68,0.15)', text: '#F87171' },
    purple: { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA' },
    amber: { bg: 'rgba(234,179,8,0.15)', text: '#FBBF24' },
    green: { bg: 'rgba(34,197,94,0.15)', text: '#4ADE80' },
  },
};

/**
 * Get theme-aware color tokens based on current theme
 */
export function getThemeColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'light' ? lightThemeColors : darkThemeColors;
}

/**
 * Create a theme-aware card style
 */
export function createCard(themeColors: ThemeColors) {
  return {
    background: themeColors.cardBg,
    border: `1px solid ${themeColors.cardBorder}`,
    borderRadius: 12,
    padding: 20,
  };
}

/**
 * Create a theme-aware status badge
 */
export function createStatusBadge(
  status: 'success' | 'warning' | 'error' | 'info',
  themeColors: ThemeColors
) {
  const map = {
    success: { bg: themeColors.successBg, text: themeColors.success },
    warning: { bg: themeColors.warningBg, text: themeColors.warning },
    error: { bg: themeColors.errorBg, text: themeColors.error },
    info: { bg: themeColors.infoBg, text: themeColors.info },
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 500,
    background: map[status].bg,
    color: map[status].text,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Design tokens
  mono,
  colors,
  typography,
  spacing,
  layout,

  // Utilities
  createMetric,
  createStatusDot,
  createPageHeader,
  createPageMain,
  createSectionHeader,
  createTableHeader,
  createTableRow,
  tableRowHoverHandlers,
  createEmptyState,
  createAlertBox,
  createButton,
  createSelect,
  createInput,

  // Layout
  createPageContainer,
  createScrollablePageContainer,
  createMetricsGrid,
  createTableGrid,

};
