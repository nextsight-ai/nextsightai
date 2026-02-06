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
    // Base styles - lighter glassmorphism
    const baseStyles = 'bg-white/5 backdrop-blur-xl rounded-2xl transition-all duration-300';

    // Padding styles
    const paddingStyles = {
      none: '',
      sm: 'p-5',
      md: 'p-6',
      lg: 'p-8',
    };

    // Border styles - subtle glass border
    const borderStyles = bordered
      ? 'border border-white/10'
      : '';

    // Shadow styles - dark glass shadows
    const shadowStyles = {
      none: '',
      sm: 'shadow-glass',
      md: 'shadow-glass',
      lg: 'shadow-glass-lg',
    };

    // Hoverable styles - subtle glow
    const hoverStyles = hoverable
      ? 'hover:bg-white/10 hover:border-white/20 cursor-pointer hover:shadow-glow-white'
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
    const borderClass = bordered ? 'border-b border-white/10 pb-4 mb-4' : '';
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
    const borderClass = bordered ? 'border-t border-white/10 pt-4 mt-4' : '';
    const footerClasses = `${borderClass} ${className}`.trim();

    return (
      <div ref={ref} className={footerClasses} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
