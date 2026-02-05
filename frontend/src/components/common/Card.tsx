import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Padding size for the card
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Whether to show a border
   */
  bordered?: boolean;
  /**
   * Whether to show a shadow
   */
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Whether the card is hoverable (shows hover effect)
   */
  hoverable?: boolean;
}

/**
 * Card component - Container with consistent spacing, border, and shadow
 *
 * @example
 * ```tsx
 * <Card>
 *   <h3>Card Title</h3>
 *   <p>Card content goes here</p>
 * </Card>
 *
 * <Card shadow="lg" hoverable>
 *   <p>Interactive card with large shadow</p>
 * </Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = 'md',
      bordered = true,
      shadow = 'sm',
      hoverable = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Base styles - clean and professional
    const baseStyles = 'bg-white dark:bg-gray-900 rounded-lg transition-all duration-200';

    // Padding styles
    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    // Border styles - subtle
    const borderStyles = bordered
      ? 'border border-gray-200 dark:border-gray-800'
      : '';

    // Shadow styles - soft and professional
    const shadowStyles = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow',
      lg: 'shadow-md',
    };

    // Hoverable styles - subtle effect
    const hoverStyles = hoverable
      ? 'hover:shadow-md hover:border-gray-300 cursor-pointer dark:hover:border-gray-700'
      : '';

    // Combine all styles
    const cardClasses = `${baseStyles} ${paddingStyles[padding]} ${borderStyles} ${shadowStyles[shadow]} ${hoverStyles} ${className}`.trim();

    return (
      <div ref={ref} className={cardClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader - Header section for cards
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show a bottom border
   */
  bordered?: boolean;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ bordered = false, className = '', children, ...props }, ref) => {
    const borderClass = bordered ? 'border-b border-gray-200 dark:border-gray-700 pb-4 mb-4' : '';
    const headerClasses = `${borderClass} ${className}`.trim();

    return (
      <div ref={ref} className={headerClasses} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardBody - Body section for cards
 */
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

/**
 * CardFooter - Footer section for cards
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show a top border
   */
  bordered?: boolean;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ bordered = false, className = '', children, ...props }, ref) => {
    const borderClass = bordered ? 'border-t border-gray-200 dark:border-gray-700 pt-4 mt-4' : '';
    const footerClasses = `${borderClass} ${className}`.trim();

    return (
      <div ref={ref} className={footerClasses} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
