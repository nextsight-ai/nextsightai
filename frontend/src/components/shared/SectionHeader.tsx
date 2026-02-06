import React from 'react';

export interface SectionHeaderProps {
  /**
   * Section title
   */
  title: string;
  /**
   * Optional subtitle/description
   */
  subtitle?: string;
  /**
   * Optional icon
   */
  icon?: React.ReactNode;
  /**
   * Optional actions (buttons, etc.)
   */
  actions?: React.ReactNode;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * SectionHeader - Consistent section header for pages
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   title="Platform Status"
 *   subtitle="Overview of all services"
 *   icon={<ServerIcon />}
 *   actions={<button>Refresh</button>}
 * />
 * ```
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  size = 'md',
}) => {
  const sizes = {
    sm: { title: 11, subtitle: 9, gap: 8 },
    md: { title: 13, subtitle: 11, gap: 12 },
    lg: { title: 16, subtitle: 12, gap: 16 },
  };

  const s = sizes[size];

  return (
    <div style={{
      display: 'flex',
      alignItems: size === 'sm' ? 'center' : 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: size === 'sm' ? 12 : 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
        {icon && <div>{icon}</div>}
        <div>
          <h2 style={{
            fontSize: s.title,
            fontWeight: 500,
            color: '#fafafa',
            margin: 0,
            marginBottom: subtitle ? 4 : 0,
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: s.subtitle, color: '#525252', margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
};

SectionHeader.displayName = 'SectionHeader';
