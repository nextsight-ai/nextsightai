import NamespaceFilter from '../common/NamespaceFilter';
import ClusterSwitcher from '../common/ClusterSwitcher';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

interface K8sHeaderProps {
  title: string;
  subtitle: string;
  rightContent?: React.ReactNode;
}

export default function K8sHeader({ title, subtitle, rightContent }: K8sHeaderProps) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  return (
    <header style={{
      flexShrink: 0,
      background: t.cardBg,
      borderBottom: `1px solid ${t.cardBorder}`,
      padding: '0 32px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
    }}>
      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: t.text, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
            {title}
          </h1>
          <span style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: t.cardBorder, flexShrink: 0 }} />

      {/* Cluster switcher */}
      <div style={{ flexShrink: 0 }}>
        <ClusterSwitcher />
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: t.cardBorder, flexShrink: 0 }} />

      {/* Namespace filter */}
      <div style={{ flexShrink: 0 }}>
        <NamespaceFilter />
      </div>

      {/* Right content */}
      {rightContent && (
        <>
          <div style={{ width: 1, height: 20, background: t.cardBorder, flexShrink: 0 }} />
          <div style={{ flexShrink: 0 }}>
            {rightContent}
          </div>
        </>
      )}
    </header>
  );
}
