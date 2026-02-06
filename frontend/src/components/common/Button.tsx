import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant of the button
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /**
   * Size of the button
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean;
  /**
   * Whether the button is in a loading state
   */
  loading?: boolean;
}

/**
 * Button component with consistent styling and variants
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="outline" loading>Loading...</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles - glassy and minimal
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-xl';

    // Variant-specific styles - lighter glass with minimal colors
    const variantStyles = {
      primary:
        'bg-white/15 hover:bg-white/25 text-white border border-white/30 hover:border-white/40 shadow-glass hover:shadow-glow-white',
      secondary:
        'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/20 hover:border-white/30 shadow-glass',
      outline:
        'bg-transparent hover:bg-white/10 text-gray-300 hover:text-white border border-white/30 hover:border-white/50',
      ghost:
        'bg-transparent hover:bg-white/10 text-gray-300 hover:text-white',
      danger:
        'bg-error-500/20 hover:bg-error-500/30 text-error-200 hover:text-error-100 border border-error-500/40 hover:border-error-500/60 shadow-glass',
    };

    // Size-specific styles
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm rounded-lg gap-1.5',
      md: 'px-5 py-2.5 text-base rounded-lg gap-2',
      lg: 'px-6 py-3 text-lg rounded-xl gap-2',
    };

    // Full width style
    const fullWidthStyle = fullWidth ? 'w-full' : '';

    // Combine all styles
    const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidthStyle} ${className}`.trim();

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
