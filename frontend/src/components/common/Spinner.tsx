import React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size of the spinner
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Color variant of the spinner
   */
  variant?: 'primary' | 'white' | 'gray';
  /**
   * Optional label for accessibility
   */
  label?: string;
}

/**
 * Spinner component - Loading indicator
 *
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner size="lg" variant="primary" />
 * <Spinner label="Loading data..." />
 * ```
 */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'primary',
      label = 'Loading...',
      className = '',
      ...props
    },
    ref
  ) => {
    // Size styles
    const sizeStyles = {
      sm: 'w-4 h-4 border-2',
      md: 'w-8 h-8 border-2',
      lg: 'w-12 h-12 border-3',
      xl: 'w-16 h-16 border-4',
    };

    // Variant styles - glass design
    const variantStyles = {
      primary: 'border-white/20 border-t-blue-400',
      white: 'border-white/20 border-t-white',
      gray: 'border-white/10 border-t-gray-400',
    };

    const spinnerClasses = `inline-block rounded-full animate-spin ${sizeStyles[size]} ${variantStyles[variant]} ${className}`.trim();

    return (
      <div ref={ref} role="status" aria-label={label} {...props}>
        <div className={spinnerClasses} />
        <span className="sr-only">{label}</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

/**
 * FullPageSpinner - Centered spinner for full page loading states
 */
export const FullPageSpinner: React.FC<Omit<SpinnerProps, 'className'>> = (props) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" {...props} />
    </div>
  );
};

FullPageSpinner.displayName = 'FullPageSpinner';
