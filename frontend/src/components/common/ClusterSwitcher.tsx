import { useState, useRef, useEffect } from 'react';
import { useCluster } from '../../contexts/ClusterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';
import { logger } from '../../utils/logger';
import { ServerStackIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';


function statusColor(status: string) {
  if (status === 'connected') return '#22c55e';
  if (status === 'error') return '#ef4444';
  if (status === 'disconnected') return '#6b7280';
  return '#eab308';
}

export default function ClusterSwitcher() {
  const { clusters, activeCluster, loading, setActiveCluster } = useCluster();
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSwitch = async (clusterId: string) => {
    if (clusterId === activeCluster?.id) { setIsOpen(false); return; }
    try {
      setSwitching(true);
      await setActiveCluster(clusterId);
      setIsOpen(false);
      window.location.reload();
    } catch (err) {
      logger.error('Failed to switch cluster', err);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.textMuted }}>
        <ServerStackIcon style={{ width: 13, height: 13 }} />
        Loading…
      </div>
    );
  }

  if (clusters.length === 0) return null;

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '3px 0',
          fontSize: 12, fontWeight: 500, color: t.text,
        }}
      >
        <ServerStackIcon style={{ width: 13, height: 13, color: '#3b82f6', flexShrink: 0 }} />
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: statusColor(activeCluster?.status || 'unknown'),
          boxShadow: `0 0 5px ${statusColor(activeCluster?.status || 'unknown')}`,
        }} />
        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeCluster?.name || 'Select cluster'}
        </span>
        <ChevronDownIcon style={{ width: 12, height: 12, color: t.textMuted, flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 9999,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 10,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 240, overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${t.cardBorder}` }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
              Clusters
            </span>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {clusters.map((cluster) => {
              const active = cluster.id === activeCluster?.id;
              return (
                <button
                  key={cluster.id}
                  onClick={() => handleSwitch(cluster.id)}
                  disabled={switching}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', background: active ? (isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF') : 'transparent',
                    border: 'none', borderBottom: `1px solid ${t.cardBorder}`,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.navHoverBg; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: statusColor(cluster.status), boxShadow: `0 0 5px ${statusColor(cluster.status)}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cluster.name}
                      </span>
                      {cluster.is_default && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: isDark ? 'rgba(59,130,246,0.2)' : '#DBEAFE', color: '#3b82f6', ...mono }}>
                          default
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1, ...mono }}>
                      {cluster.version && <span style={{ marginRight: 6 }}>{cluster.version}</span>}
                      {cluster.node_count} nodes · {cluster.namespace_count} ns
                    </div>
                  </div>
                  {active && <CheckIcon style={{ width: 13, height: 13, color: '#3b82f6', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
