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
    // Base styles
    const baseStyles =
      'inline-flex items-center font-medium rounded-full transition-colors';

    // Variant styles
    const variantStyles = {
      success:
        'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400',
      warning:
        'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400',
      error:
        'bg-error-100 text-error-800 dark:bg-error-900/20 dark:text-error-400',
      info:
        'bg-info-100 text-info-800 dark:bg-info-900/20 dark:text-info-400',
      primary:
        'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400',
      default:
        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
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
