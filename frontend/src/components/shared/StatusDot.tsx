import React from 'react';

export interface StatusDotProps {
  /**
   * Status type
   */
  status: 'success' | 'warning' | 'error' | 'info' | 'default';
  /**
   * Size of the dot
   */
  size?: number;
  /**
   * Whether to show glow effect for critical states
   */
  glow?: boolean;
  /**
   * Additional class names
   */
  className?: string;
}

/**
 * StatusDot - Minimal status indicator dot
 *
 * @example
 * ```tsx
 * <StatusDot status="success" size={6} />
 * <StatusDot status="error" size={6} glow />
 * ```
 */
export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  size = 5,
  glow = false,
  className = '',
}) => {
  const colors = {
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
    default: '#525252',
  };

  const color = colors[status];

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: glow && status === 'error' ? `0 0 6px ${color}` : 'none',
        flexShrink: 0,
      }}
    />
  );
};

StatusDot.displayName = 'StatusDot';
