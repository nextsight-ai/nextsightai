import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Visual variant of the badge
   */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary';
  /**
   * Size of the badge
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether the badge has a dot indicator
   */
  dot?: boolean;
}

/**
 * Badge component - Status indicators and labels
 *
 * @example
 * ```tsx
 * <Badge variant="success">Running</Badge>
 * <Badge variant="error" dot>Failed</Badge>
 * <Badge variant="warning" size="sm">Pending</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Base styles - glassy design
    const baseStyles =
      'inline-flex items-center font-medium rounded-full transition-all duration-200 backdrop-blur-xl border';

    // Variant styles - minimal glass with subtle colors
    const variantStyles = {
      success:
        'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      warning:
        'bg-amber-500/10 text-amber-300 border-amber-500/30',
      error:
        'bg-red-500/10 text-red-300 border-red-500/30',
      info:
        'bg-blue-500/10 text-blue-300 border-blue-500/30',
      primary:
        'bg-blue-500/10 text-blue-300 border-blue-500/30',
      default:
        'bg-white/5 text-gray-300 border-white/20',
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-1 text-sm gap-1.5',
      lg: 'px-3 py-1.5 text-base gap-2',
    };

    // Dot styles (if enabled)
    const dotSize = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
    };

    const dotColor = {
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      error: 'bg-error-500',
      info: 'bg-info-500',
      primary: 'bg-primary-500',
      default: 'bg-gray-500',
    };

    // Combine all styles
    const badgeClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

    return (
      <span ref={ref} className={badgeClasses} {...props}>
        {dot && (
          <span
            className={`${dotSize[size]} ${dotColor[variant]} rounded-full`}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/**
 * Specialized badge for Kubernetes resource statuses
 */
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  /**
   * Status value - automatically maps to appropriate variant
   */
  status:
    | 'Running'
    | 'Pending'
    | 'Failed'
    | 'Succeeded'
    | 'Unknown'
    | 'Terminating'
    | 'Active'
    | 'Inactive'
    | string;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    // Map status to variant
    const statusToVariant = (status: string): BadgeProps['variant'] => {
      const normalized = status.toLowerCase();

      if (
        normalized === 'running' ||
        normalized === 'active' ||
        normalized === 'succeeded' ||
        normalized === 'healthy'
      ) {
        return 'success';
      }

      if (
        normalized === 'pending' ||
        normalized === 'terminating' ||
        normalized === 'warning'
      ) {
        return 'warning';
      }

      if (
        normalized === 'failed' ||
        normalized === 'error' ||
        normalized === 'unhealthy'
      ) {
        return 'error';
      }

      if (normalized === 'unknown' || normalized === 'inactive') {
        return 'default';
      }

      return 'info';
    };

    return (
      <Badge ref={ref} variant={statusToVariant(status)} {...props}>
        {status}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
