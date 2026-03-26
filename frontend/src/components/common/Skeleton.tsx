import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ANIM = `
@keyframes skshimmer {
  0%   { background-position: -400px 0 }
  100% { background-position:  400px 0 }
}`;

let injected = false;
function injectStyle() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = ANIM;
  document.head.appendChild(s);
}

export function Skeleton({
  width = '100%',
  height = 12,
  radius = 6,
  style,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  injectStyle();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const base = isDark ? '#1f2937' : '#e5e7eb';
  const shine = isDark ? '#374151' : '#f3f4f6';

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${base} 25%, ${shine} 50%, ${base} 75%)`,
        backgroundSize: '800px 100%',
        animation: 'skshimmer 1.5s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** A row of skeletons with varying widths — mimics a table row */
export function SkeletonRow({
  cols,
  heights,
}: {
  cols: (string | number)[];
  heights?: number[];
}) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 18px', alignItems: 'center' }}>
      {cols.map((w, i) => (
        <Skeleton key={i} width={w} height={heights?.[i] ?? 12} />
      ))}
    </div>
  );
}

/** Shimmer card block */
export function SkeletonCard({
  height = 80,
  style,
}: {
  height?: number;
  style?: React.CSSProperties;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div style={{
      background: isDark ? '#111111' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'}`,
      borderRadius: 12,
      padding: 16,
      height,
      overflow: 'hidden',
      ...style,
    }}>
      <Skeleton width="40%" height={10} style={{ marginBottom: 10 }} />
      <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={8} />
    </div>
  );
}
