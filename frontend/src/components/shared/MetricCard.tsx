import React from 'react';

export interface MetricCardProps {
  /**
   * The metric value to display
   */
  value: string | number;
  /**
   * Label for the metric
   */
  label: string;
  /**
   * Color for the value (hex color)
   */
  color?: string;
  /**
   * Optional subtitle/secondary info
   */
  subtitle?: string;
  /**
   * Optional icon
   */
  icon?: React.ReactNode;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

/**
 * MetricCard - Displays a single metric with linear/minimal design
 *
 * @example
 * ```tsx
 * <MetricCard
 *   value="247"
 *   label="Pods"
 *   color="#22c55e"
 *   subtitle="23 pending"
 * />
 * ```
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  color = '#fafafa',
  subtitle,
  icon,
  size = 'md',
}) => {
  const sizes = {
    sm: { value: 20, label: 9, subtitle: 8, gap: 2 },
    md: { value: 28, label: 10, subtitle: 9, gap: 3 },
    lg: { value: 36, label: 11, subtitle: 10, gap: 4 },
  };

  const s = sizes[size];

  return (
    <div>
      {icon && <div style={{ marginBottom: s.gap }}>{icon}</div>}
      <div style={{ fontSize: s.value, fontWeight: 700, letterSpacing: -1.5, color, ...mono }}>
        {value}
      </div>
      <div style={{ fontSize: s.label, color: '#525252', marginTop: s.gap, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      {subtitle && (
        <div style={{ fontSize: s.subtitle, color: '#404040', marginTop: 2, ...mono }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

MetricCard.displayName = 'MetricCard';
