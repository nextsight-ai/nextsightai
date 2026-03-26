import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  ServerIcon,
  CpuChipIcon,
  FolderIcon,
  CubeIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CircleStackIcon,
  GlobeAltIcon,
  TagIcon,
  ServerStackIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useCluster } from '../../contexts/ClusterContext';
import { useClusterOverviewData } from '../../hooks/useClusterOverviewData';
import { kubernetesApi } from '../../services/api';
import type { NodeInfo } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { Skeleton, SkeletonCard } from '../common/Skeleton';
import { getThemeColors } from '../../styles/linear-design';
import ClusterSwitcher from '../common/ClusterSwitcher';

// ─── Node CPU/memory bar (color-shifts at thresholds) ────────────────────────
function NodeBar({ pct, color }: { pct: number; color: string }) {
  const c = Math.min(100, Math.max(0, pct));
  const barColor = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 9999, background: barColor + '22', overflow: 'hidden' }}>
        <div style={{ width: `${c}%`, height: '100%', borderRadius: 9999, background: barColor, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace", color: barColor, fontWeight: 600, flexShrink: 0, width: 28, textAlign: 'right' }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Cluster Overview ─────────────────────────────────────────────────────────
export default function ClusterOverviewLinear() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

  const { activeCluster } = useCluster();
  const { data, isLoading, isRefetching, error, refresh } = useClusterOverviewData(activeCluster?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);

  useEffect(() => {
    kubernetesApi.getNodes().then(r => setNodes(r.data)).catch(() => {});
  }, [activeCluster?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    kubernetesApi.getNodes().then(r => setNodes(r.data)).catch(() => {});
    setRefreshing(false);
  };

  const clusterHealth  = data?.clusterHealth;
  const metrics        = data?.metrics;
  const namespacesData = data?.namespacesData || [];
  const aiInsights     = data?.aiInsights || [];
  const events         = data?.events || [];

  const isHealthy   = clusterHealth?.healthy ?? false;
  const nodeCount   = clusterHealth?.node_count ?? 0;
  const readyNodes  = clusterHealth?.ready_nodes ?? 0;
  const totalPods   = clusterHealth?.total_pods ?? 0;
  const runningPods = clusterHealth?.running_pods ?? 0;
  // Prefer the detailed namespace list count — it's the actual data being shown.
  // Fall back to clusterHealth.namespaces only when the list hasn't loaded yet.
  const nsCount = namespacesData.length > 0 ? namespacesData.length : (clusterHealth?.namespaces ?? 0);

  const cpuPct = metrics?.cpu_percent ?? 0;
  const memPct = metrics?.memory_percent ?? 0;
  const nodeMetrics = metrics?.nodes ?? [];

  const maxNsPods = Math.max(...(namespacesData.map(n => n.pods ?? 0)), 1);

  const clusterEvents = useMemo(() => events.slice(0, 8).map(ev => {
    let status: 'error' | 'warning' | 'info' = 'info';
    if (ev.type === 'Warning') status = 'warning';
    if (ev.reason?.toLowerCase().includes('fail') || ev.reason?.toLowerCase().includes('error')) status = 'error';
    const ts = ev.last_timestamp || ev.first_timestamp;
    const timeAgo = ts ? (() => {
      const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return `${Math.floor(diff / 3600)}h ago`;
    })() : null;
    return { status, message: ev.message || ev.reason || 'Unknown event', namespace: ev.namespace || '—', reason: ev.reason, timeAgo, count: ev.count };
  }), [events]);

  const card = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 14,
    boxShadow: isDark ? 'none' : '0 1px 6px rgba(0,0,0,0.05)',
  };

  const evColor = (s: string) => s === 'error' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#3b82f6';
  const evBg    = (s: string) => s === 'error' ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : s === 'warning' ? (isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB') : (isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF');

  if (isLoading) {
    return (
      <div style={{ width: '100%' }}>
        {/* Health banner skeleton */}
        <div style={{ ...card, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Skeleton width={40} height={40} radius={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Skeleton width="25%" height={13} style={{ marginBottom: 8 }} />
              <Skeleton width="45%" height={9} />
            </div>
            <Skeleton width={90} height={28} radius={7} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Stat cards row skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} height={88} />
          ))}
        </div>

        {/* Two-col skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ ...card, padding: 16 }}>
              <Skeleton width="35%" height={11} style={{ marginBottom: 14 }} />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <Skeleton width={28} height={28} radius={6} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="50%" height={10} style={{ marginBottom: 5 }} />
                    <Skeleton width="35%" height={8} />
                  </div>
                  <Skeleton width={48} height={18} radius={5} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom wide card skeleton */}
        <div style={{ ...card, padding: 16 }}>
          <Skeleton width="20%" height={11} style={{ marginBottom: 14 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
              <Skeleton width={8} height={8} radius={99} style={{ flexShrink: 0 }} />
              <Skeleton width="40%" height={10} />
              <Skeleton width="20%" height={10} style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
        {error instanceof Error ? error.message : 'Failed to load cluster data'}
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>

      {/* ── Cluster health banner ─────────────────────────────────────── */}
      <div style={{
        ...card,
        padding: '16px 20px',
        marginBottom: 16,
        background: isHealthy
          ? isDark ? 'rgba(34,197,94,0.06)' : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%)'
          : isDark ? 'rgba(239,68,68,0.06)' : 'linear-gradient(135deg, #fef2f2 0%, #ffffff 60%)',
        borderColor: isHealthy ? (isDark ? 'rgba(34,197,94,0.2)' : '#bbf7d0') : (isDark ? 'rgba(239,68,68,0.2)' : '#fecaca'),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

          {/* Left: cluster identity + switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: isHealthy ? (isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7') : (isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isHealthy
                ? <CheckCircleIcon style={{ width: 22, height: 22, color: '#22c55e' }} />
                : <ExclamationTriangleIcon style={{ width: 22, height: 22, color: '#ef4444' }} />
              }
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: '3px 10px' }}>
                  <ClusterSwitcher />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: isHealthy ? (isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7') : (isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2'), color: isHealthy ? '#16a34a' : '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {isHealthy ? 'Healthy' : 'Degraded'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: t.textSub, display: 'flex', alignItems: 'center', gap: 10 }}>
                {activeCluster?.version && <span style={{ ...mono }}>k8s {activeCluster.version}</span>}
                {nodes[0]?.container_runtime && <><span style={{ color: t.cardBorder }}>·</span><span>{nodes[0].container_runtime}</span></>}
                {nodes[0]?.os_image && <><span style={{ color: t.cardBorder }}>·</span><span>{nodes[0].os_image.split(' ').slice(0, 2).join(' ')}</span></>}
              </div>
            </div>
          </div>

          {/* Center: node/pod chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { icon: ServerIcon,      label: 'Nodes',      value: `${readyNodes}/${nodeCount}`,   color: '#f59e0b' },
              { icon: CubeIcon,        label: 'Pods',       value: `${runningPods}/${totalPods}`,  color: '#22c55e' },
              { icon: FolderIcon,      label: 'Namespaces', value: String(nsCount),               color: '#06b6d4' },
              { icon: CpuChipIcon,     label: 'CPU',        value: cpuPct ? `${cpuPct.toFixed(0)}%` : '—', color: '#8b5cf6' },
              { icon: CircleStackIcon, label: 'Memory',     value: memPct ? `${memPct.toFixed(0)}%` : '—', color: '#3b82f6' },
            ].map((kpi, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9999, background: isDark ? t.cardBorder : '#f8fafc', border: `1px solid ${t.cardBorder}` }}>
                <kpi.icon style={{ width: 12, height: 12, color: kpi.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{kpi.value}</span>
                <span style={{ fontSize: 11, color: t.textMuted }}>{kpi.label}</span>
              </div>
            ))}
          </div>

          {/* Right: refresh */}
          <button
            onClick={handleRefresh} disabled={refreshing || isRefetching}
            style={{ ...card, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, color: t.textSub, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.background = t.navHoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.color = t.textSub; e.currentTarget.style.background = t.cardBg; }}
          >
            <ArrowPathIcon style={{ width: 13, height: 13 }} />
            {refreshing || isRefetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Nodes table ───────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ padding: '13px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ServerStackIcon style={{ width: 14, height: 14, color: t.textSub }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Node Details</span>
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 9999, background: t.cardBorder, color: t.textMuted, fontWeight: 500 }}>{nodeCount}</span>
          </div>
          {activeCluster?.version && (
            <span style={{ fontSize: 11, color: t.textMuted, ...mono }}>k8s {activeCluster.version}</span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 110px 80px 1fr 1fr 90px 70px', gap: 12, padding: '8px 18px', fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${t.cardBorder}`, minWidth: 560 }}>
          <span>Node</span><span>Role</span><span>Status</span><span>CPU</span><span>Memory</span><span>Version</span><span>Age</span>
        </div>

        {nodes.length === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            {isLoading ? 'Loading nodes…' : `${nodeCount} node${nodeCount !== 1 ? 's' : ''} detected — loading details…`}
          </div>
        ) : nodes.map((node, i) => {
          const nm = nodeMetrics.find(m => m.name === node.name);
          const isReady = node.status === 'Ready';
          const roles = node.roles.length > 0 ? node.roles.join(', ') : 'worker';
          const isControl = roles.includes('control') || roles.includes('master');
          return (
            <div
              key={node.name}
              style={{ display: 'grid', gridTemplateColumns: '1.8fr 110px 80px 1fr 1fr 90px 70px', gap: 12, padding: '11px 18px', alignItems: 'center', borderBottom: i < nodes.length - 1 ? `1px solid ${t.cardBorder}` : 'none', transition: 'background 0.1s', minWidth: 560 }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</div>
                {node.internal_ip && <div style={{ fontSize: 10, color: t.textMuted, ...mono }}>{node.internal_ip}</div>}
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, fontWeight: 500, width: 'fit-content', background: isControl ? (isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE') : (isDark ? t.cardBorder : '#F3F4F6'), color: isControl ? '#3b82f6' : t.textSub }}>
                {isControl ? 'control-plane' : 'worker'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: isReady ? '#22c55e' : '#ef4444', boxShadow: `0 0 4px ${isReady ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}` }} />
                <span style={{ fontSize: 11, color: isReady ? '#22c55e' : '#ef4444', fontWeight: 500 }}>{node.status}</span>
              </div>
              <NodeBar pct={nm?.cpu_percent ?? 0} color="#8b5cf6" />
              <NodeBar pct={nm?.memory_percent ?? 0} color="#3b82f6" />
              <span style={{ fontSize: 10, color: t.textMuted, ...mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.version}</span>
              <span style={{ fontSize: 11, color: t.textSub }}>{node.age}</span>
            </div>
          );
        })}
        </div>
      </div>

      {/* ── Namespaces + Events ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 12, marginBottom: 12 }}>

        {/* Namespace breakdown */}
        <div style={{ ...card }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderIcon style={{ width: 14, height: 14, color: t.textSub }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Namespaces</span>
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 9999, background: t.cardBorder, color: t.textMuted, fontWeight: 500 }}>{nsCount}</span>
            </div>
            <Link to="/namespaces" style={{ fontSize: 11, color: t.info, textDecoration: 'none', fontWeight: 500 }}>All →</Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 60px 1fr 50px 50px 50px', gap: 8, padding: '7px 18px', fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${t.cardBorder}`, minWidth: 400 }}>
            <span>Name</span>
            <span>Status</span>
            <span>Pods</span>
            <span style={{ textAlign: 'center' }}>Deploy</span>
            <span style={{ textAlign: 'center' }}>Svc</span>
            <span style={{ textAlign: 'right' }}>Age</span>
          </div>

          {namespacesData.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>Loading namespace data…</div>
          ) : namespacesData.slice(0, 9).map((ns, i) => {
            const isActive = ns.status === 'Active';
            const pods = ns.pods ?? 0;
            return (
            <div
              key={ns.name}
              style={{ display: 'grid', gridTemplateColumns: '1.6fr 60px 1fr 50px 50px 50px', gap: 8, padding: '9px 18px', alignItems: 'center', borderBottom: i < Math.min(namespacesData.length, 9) - 1 ? `1px solid ${t.cardBorder}` : 'none', transition: 'background 0.1s', minWidth: 400 }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <FolderIcon style={{ width: 11, height: 11, color: '#3b82f6', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: t.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ns.name}</span>
              </div>
              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: isActive ? '#22c55e' : '#f59e0b', boxShadow: isActive ? '0 0 4px rgba(34,197,94,0.5)' : 'none' }} />
                <span style={{ fontSize: 10, color: isActive ? '#22c55e' : '#f59e0b', fontWeight: 500 }}>{ns.status || '—'}</span>
              </div>
              {/* Pods: count + mini bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: t.textSub, ...mono, flexShrink: 0, width: 20, textAlign: 'right' }}>{pods}</span>
                <div style={{ flex: 1, height: 3, borderRadius: 9999, background: '#3b82f622', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((pods / maxNsPods) * 100)}%`, height: '100%', background: '#3b82f6', borderRadius: 9999 }} />
                </div>
              </div>
              {/* Deployments */}
              <span style={{ fontSize: 11, color: t.textSub, textAlign: 'center', ...mono }}>{ns.deployments ?? 0}</span>
              {/* Services */}
              <span style={{ fontSize: 11, color: t.textSub, textAlign: 'center', ...mono }}>{ns.services ?? 0}</span>
              {/* Age */}
              <span style={{ fontSize: 10, color: t.textMuted, textAlign: 'right', ...mono, whiteSpace: 'nowrap' }}>{ns.age || '—'}</span>
            </div>
            );
          })}
          </div>
        </div>

        {/* Cluster events */}
        <div style={{ ...card }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockIcon style={{ width: 14, height: 14, color: t.textSub }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Cluster Events</span>
              {clusterEvents.filter(e => e.status !== 'info').length > 0 && (
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 9999, background: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB', color: '#f59e0b', fontWeight: 600 }}>
                  {clusterEvents.filter(e => e.status !== 'info').length}
                </span>
              )}
            </div>
            <Link to="/events" style={{ fontSize: 11, color: t.info, textDecoration: 'none', fontWeight: 500 }}>All →</Link>
          </div>

          {clusterEvents.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
              <CheckCircleIcon style={{ width: 22, height: 22, color: '#22c55e', margin: '0 auto 8px' }} />
              No recent events
            </div>
          ) : clusterEvents.map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 18px', borderBottom: i < clusterEvents.length - 1 ? `1px solid ${t.cardBorder}` : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
              <div style={{ marginTop: 3, width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: evColor(ev.status), boxShadow: ev.status !== 'info' ? `0 0 5px ${evColor(ev.status)}` : 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{ fontSize: 12, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.message}</div>
                  {ev.timeAgo && <span style={{ fontSize: 10, color: t.textMuted, flexShrink: 0, marginLeft: 8 }}>{ev.timeAgo}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: evBg(ev.status), color: evColor(ev.status), fontWeight: 500 }}>
                    {ev.status === 'error' ? 'Error' : ev.status === 'warning' ? 'Warning' : 'Normal'}
                  </span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>{ev.namespace}</span>
                  {ev.count > 1 && <span style={{ fontSize: 10, color: t.textMuted }}>×{ev.count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Insights ───────────────────────────────────────────────── */}
      <div style={{ ...card }}>
        <div style={{ padding: '13px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LightBulbIcon style={{ width: 14, height: 14, color: '#f59e0b' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>AI Insights</span>
          </div>
          <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 9999, background: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB', color: '#f59e0b', fontWeight: 600 }}>
            {aiInsights.length}
          </span>
        </div>

        {aiInsights.length === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            <CheckCircleIcon style={{ width: 22, height: 22, color: '#22c55e', margin: '0 auto 8px' }} />
            No insights — cluster looks great
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {aiInsights.map((insight, i) => {
              const impactColor = insight.impact === 'high' ? '#ef4444' : insight.impact === 'medium' ? '#f59e0b' : '#22c55e';
              const impactBg    = insight.impact === 'high' ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : insight.impact === 'medium' ? (isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB') : (isDark ? 'rgba(34,197,94,0.12)' : '#F0FDF4');
              return (
                <div key={i} style={{ padding: '14px 18px', borderRight: i % 2 === 0 && aiInsights.length > 1 ? `1px solid ${t.cardBorder}` : 'none', borderBottom: i < aiInsights.length - 2 ? `1px solid ${t.cardBorder}` : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: impactBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {insight.impact === 'high'
                        ? <ExclamationTriangleIcon style={{ width: 13, height: 13, color: impactColor }} />
                        : <WrenchScrewdriverIcon style={{ width: 13, height: 13, color: impactColor }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{insight.title}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, background: impactBg, color: impactColor, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0, marginLeft: 8 }}>
                          {insight.impact}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: t.textSub, lineHeight: 1.5 }}>{insight.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <TagIcon style={{ width: 10, height: 10, color: t.textMuted }} />
                        <span style={{ fontSize: 10, color: t.textMuted }}>{insight.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Runtime footer */}
        {nodes.length > 0 && (
          <div style={{ padding: '10px 18px', borderTop: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', gap: 20 }}>
            {[
              { icon: CircleStackIcon, label: 'Runtime', value: nodes[0]?.container_runtime || '—' },
              { icon: GlobeAltIcon,    label: 'OS',      value: nodes[0]?.os_image?.split(' ').slice(0, 3).join(' ') || '—' },
              { icon: ServerStackIcon, label: 'k8s',     value: activeCluster?.version || '—' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <item.icon style={{ width: 12, height: 12, color: t.textMuted, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: t.textMuted }}>{item.label}:</span>
                <span style={{ fontSize: 11, color: t.textSub, ...mono }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
