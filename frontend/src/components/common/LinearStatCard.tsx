import { type ComponentType } from 'react';
import { mono, type ThemeColors } from '../../styles/linear-design';

interface LinearStatCardProps {
  icon: ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color: string;
  t: ThemeColors;
  isDark: boolean;
  card: React.CSSProperties;
}

export default function LinearStatCard({ icon: Icon, label, value, color, t, isDark, card }: LinearStatCardProps) {
  return (
    <div style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: color + (isDark ? '22' : '18'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon style={{ width: 16, height: 16, color }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: t.text, lineHeight: 1, marginBottom: 2, ...mono }}>{value}</div>
        <div style={{ fontSize: 11, color: t.textMuted }}>{label}</div>
      </div>
    </div>
  );
}
