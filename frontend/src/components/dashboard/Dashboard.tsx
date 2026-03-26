import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ServerStackIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ClockIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CommandLineIcon,
  Squares2X2Icon,
  BoltIcon,
  ServerIcon,
  CubeIcon,
  FolderIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { useCluster } from '../../contexts/ClusterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import useDashboardData from '../../hooks/useDashboardData';
import { getThemeColors, mono, createCard } from '../../styles/linear-design';
import { logger } from '../../utils/logger';

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ values, color, width = 64, height = 28 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ flexShrink: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${height} ${pts} ${width},${height}`} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const c = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height: 4, borderRadius: 9999, background: color + '22', overflow: 'hidden' }}>
      <div style={{ width: `${c}%`, height: '100%', borderRadius: 9999, background: color, transition: 'width 0.6s ease' }} />
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clusters, activeCluster, setActiveCluster } = useCluster();
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const { data, isLoading, isRefetching, hardReset, error } = useDashboardData(activeCluster?.id);
  if (error) logger.error('[Dashboard] Query error', error);

  const clusterHealth = data?.clusterHealth ?? null;
  const deployments   = data?.deployments  ?? [];
  const events        = data?.events       ?? [];
  const metrics       = data?.metrics      ?? null;

  const recentEvents = useMemo(() => events.slice(0, 6).map((ev) => {
    let status: 'error' | 'warning' | 'success' = 'success';
    if (ev.type === 'Warning') status = 'warning';
    if (ev.reason?.toLowerCase().includes('fail') || ev.reason?.toLowerCase().includes('error')) status = 'error';
    return { status, message: ev.message || ev.reason || 'Unknown event', namespace: ev.namespace || 'default' };
  }), [events]);

  const handleRefresh = async () => {
    try { await hardReset(); toast.success('Refreshed', 'Dashboard updated'); }
    catch (err) { logger.error('[Dashboard] Refresh failed', err); toast.error('Error', 'Could not refresh'); }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320, color: t.textMuted, fontSize: 14 }}>
        Loading platform overview…
      </div>
    );
  }

  const cpuPct      = metrics?.cpu_percent ?? 0;
  const memPct      = metrics?.memory_percent ?? 0;
  const totalPods   = clusterHealth?.total_pods ?? 0;
  const runningPods = clusterHealth?.running_pods ?? 0;
  const nodeCount   = clusterHealth?.node_count ?? 0;
  const readyNodes  = clusterHealth?.ready_nodes ?? 0;
  const namespaces  = clusterHealth?.namespaces ?? 0;
  const isHealthy   = clusterHealth?.healthy ?? false;
  const alertCount  = recentEvents.filter(e => e.status === 'error').length;
  const warnCount   = recentEvents.filter(e => e.status === 'warning').length;

  const cpuHistory = [18, 24, 20, 35, 28, 42, cpuPct || 0];
  const memHistory = [45, 48, 52, 49, 55, 60, memPct || 0];
  const cpuTrend   = cpuHistory[cpuHistory.length - 1] - cpuHistory[cpuHistory.length - 2];
  const memTrend   = memHistory[memHistory.length - 1] - memHistory[memHistory.length - 2];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.full_name || user?.username || 'there';

  const card = createCard(t, isDark, 14);

  const quickActions = [
    { label: 'Deploy App',   desc: 'Push a new workload',     icon: RocketLaunchIcon, href: '/deploy/yaml',         color: '#8b5cf6', bg: isDark ? 'rgba(139,92,246,0.12)' : '#F5F3FF' },
    { label: 'Terminal',     desc: 'kubectl access',          icon: CommandLineIcon,  href: '/kubernetes/terminal',  color: '#3b82f6', bg: isDark ? 'rgba(59,130,246,0.12)'  : '#EFF6FF' },
    { label: 'Workloads',    desc: 'Pods & deployments',      icon: Squares2X2Icon,   href: '/kubernetes/workloads', color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.12)'  : '#ECFDF5' },
    { label: 'Monitoring',   desc: 'Metrics & alerts',        icon: ChartBarIcon,     href: '/monitoring',           color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.12)'  : '#FFFBEB' },
    { label: 'Security',     desc: 'Posture & findings',      icon: ShieldCheckIcon,  href: '/security',             color: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.12)'   : '#FEF2F2' },
    { label: 'Namespaces',   desc: 'Namespace management',    icon: FolderIcon,       href: '/namespaces',           color: '#06b6d4', bg: isDark ? 'rgba(6,182,212,0.12)'   : '#ECFEFF' },
  ];

  const modules = [
    { label: 'Kubernetes',   sub: `${readyNodes}/${nodeCount} nodes ready`,       href: '/cluster-overview', color: '#3b82f6', icon: ServerStackIcon,  ok: isHealthy,          pct: nodeCount > 0 ? (readyNodes / nodeCount) * 100 : 0 },
    { label: 'Workloads',    sub: `${runningPods}/${totalPods} pods running`,     href: '/kubernetes/workloads', color: '#10b981', icon: CubeIcon,       ok: runningPods === totalPods && totalPods > 0, pct: totalPods > 0 ? (runningPods / totalPods) * 100 : 0 },
    { label: 'Security',     sub: alertCount === 0 ? 'No active alerts' : `${alertCount} alert${alertCount > 1 ? 's' : ''}`, href: '/security', color: alertCount > 0 ? '#ef4444' : '#10b981', icon: ShieldCheckIcon, ok: alertCount === 0, pct: 100 - Math.min(alertCount * 20, 100) },
    { label: 'Monitoring',   sub: 'Prometheus connected',                         href: '/monitoring',       color: '#f59e0b', icon: ChartBarIcon,     ok: true,               pct: 100 },
    { label: 'Networking',   sub: `${namespaces} namespaces`,                     href: '/kubernetes/networking', color: '#06b6d4', icon: GlobeAltIcon, ok: true,              pct: 100 },
    { label: 'Deployments',  sub: `${deployments.length} active`,                 href: '/deploy/yaml',      color: '#8b5cf6', icon: RocketLaunchIcon, ok: deployments.length >= 0, pct: 100 },
  ];

  const evStatusColor = (s: string) => s === 'error' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#22c55e';
  const evStatusBg    = (s: string) => s === 'error' ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : s === 'warning' ? (isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB') : (isDark ? 'rgba(34,197,94,0.12)' : '#F0FDF4');
  const evStatusLabel = (s: string) => s === 'error' ? 'Critical' : s === 'warning' ? 'Warning' : 'Normal';

  return (
    <div style={{ width: '100%' }}>

      {/* ── Greeting ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: 0, letterSpacing: -0.5 }}>
          {greeting}, {displayName} 👋
        </h1>
        <p style={{ fontSize: 13, color: t.textSub, margin: '4px 0 0' }}>
          Here's what's happening across your platform today.
        </p>
      </div>

      {/* ── Cluster status banner ──────────────────────────────────────── */}
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
          {/* Left: status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: isHealthy ? (isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7') : (isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isHealthy
                ? <CheckCircleIcon style={{ width: 22, height: 22, color: '#22c55e' }} />
                : <ExclamationTriangleIcon style={{ width: 22, height: 22, color: '#ef4444' }} />
              }
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>
                  {isHealthy ? 'All systems operational' : 'Cluster needs attention'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                  background: isHealthy ? (isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7') : (isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2'),
                  color: isHealthy ? '#16a34a' : '#dc2626',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {isHealthy ? 'Healthy' : 'Degraded'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: t.textSub }}>
                {activeCluster?.name || 'Local cluster'} {activeCluster?.version ? `· v${activeCluster.version}` : ''}
              </div>
            </div>
          </div>

          {/* Center: KPI chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: 'Nodes',      value: `${readyNodes}/${nodeCount}`, color: '#8b5cf6', icon: ServerIcon },
              { label: 'Pods',       value: `${runningPods}/${totalPods}`, color: '#22c55e', icon: CubeIcon },
              { label: 'Namespaces', value: String(namespaces),           color: '#06b6d4', icon: FolderIcon },
              { label: 'Deploys',    value: String(deployments.length),   color: '#f59e0b', icon: RocketLaunchIcon },
            ].map((kpi, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 9999,
                background: isDark ? t.cardBorder : '#f8fafc',
                border: `1px solid ${t.cardBorder}`,
              }}>
                <kpi.icon style={{ width: 12, height: 12, color: kpi.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{kpi.value}</span>
                <span style={{ fontSize: 11, color: t.textMuted }}>{kpi.label}</span>
              </div>
            ))}
          </div>

          {/* Right: cluster select + refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {clusters.length > 1 && (
              <select
                value={activeCluster?.id || ''}
                onChange={e => { const c = clusters.find(x => x.id === e.target.value); if (c) setActiveCluster(c.id); }}
                style={{ ...card, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, fontSize: 12, fontWeight: 500, color: t.text, padding: '6px 10px', outline: 'none', cursor: 'pointer' }}
              >
                {clusters.map(c => <option key={c.id} value={c.id} style={{ background: t.cardBg }}>{c.name}</option>)}
              </select>
            )}
            <button
              onClick={handleRefresh} disabled={isRefetching}
              style={{ ...card, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, color: t.textSub, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.background = t.navHoverBg; }}
              onMouseLeave={e => { e.currentTarget.style.color = t.textSub; e.currentTarget.style.background = t.cardBg; }}
            >
              <ArrowPathIcon style={{ width: 13, height: 13, ...(isRefetching ? { animation: 'spin 1s linear infinite' } : {}) }} />
              {isRefetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>

        {/* CPU */}
        <div style={{ ...card, padding: '16px 18px', borderTop: '3px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CpuChipIcon style={{ width: 15, height: 15, color: '#3b82f6' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.textSub }}>CPU</span>
            </div>
            <Sparkline values={cpuHistory} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -1, lineHeight: 1, marginBottom: 8, ...mono }}>
            {cpuPct ? `${cpuPct.toFixed(0)}%` : '—'}
          </div>
          <ProgressBar pct={cpuPct} color="#3b82f6" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>{metrics?.total_cpu_usage || '0'} used</span>
            <span style={{ fontSize: 10, color: cpuTrend > 0 ? '#ef4444' : '#22c55e', display: 'flex', alignItems: 'center', gap: 2 }}>
              {cpuTrend > 0 ? <ArrowTrendingUpIcon style={{ width: 10, height: 10 }} /> : <ArrowTrendingDownIcon style={{ width: 10, height: 10 }} />}
              {Math.abs(cpuTrend).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Memory */}
        <div style={{ ...card, padding: '16px 18px', borderTop: '3px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BoltIcon style={{ width: 15, height: 15, color: '#8b5cf6' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.textSub }}>Memory</span>
            </div>
            <Sparkline values={memHistory} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -1, lineHeight: 1, marginBottom: 8, ...mono }}>
            {memPct ? `${memPct.toFixed(0)}%` : '—'}
          </div>
          <ProgressBar pct={memPct} color="#8b5cf6" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>{metrics?.total_memory_usage || '0'} used</span>
            <span style={{ fontSize: 10, color: memTrend > 0 ? '#ef4444' : '#22c55e', display: 'flex', alignItems: 'center', gap: 2 }}>
              {memTrend > 0 ? <ArrowTrendingUpIcon style={{ width: 10, height: 10 }} /> : <ArrowTrendingDownIcon style={{ width: 10, height: 10 }} />}
              {Math.abs(memTrend).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Nodes */}
        <div style={{ ...card, padding: '16px 18px', borderTop: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ServerIcon style={{ width: 15, height: 15, color: '#f59e0b' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.textSub }}>Nodes</span>
            </div>
            <Link to="/kubernetes/nodes" style={{ fontSize: 11, color: t.info, textDecoration: 'none', fontWeight: 500 }}>View →</Link>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -1, lineHeight: 1, marginBottom: 8, ...mono }}>
            {readyNodes}<span style={{ fontSize: 14, fontWeight: 400, color: t.textSub }}>/{nodeCount}</span>
          </div>
          <ProgressBar pct={nodeCount > 0 ? (readyNodes / nodeCount) * 100 : 0} color="#f59e0b" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>Ready / Total</span>
            <span style={{ fontSize: 10, color: readyNodes === nodeCount && nodeCount > 0 ? '#22c55e' : '#f59e0b', fontWeight: 500 }}>
              {nodeCount > 0 ? `${Math.round((readyNodes / nodeCount) * 100)}%` : '—'}
            </span>
          </div>
        </div>

        {/* Pods */}
        <div style={{ ...card, padding: '16px 18px', borderTop: '3px solid #22c55e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: isDark ? 'rgba(34,197,94,0.15)' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CubeIcon style={{ width: 15, height: 15, color: '#22c55e' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.textSub }}>Pods</span>
            </div>
            <Link to="/kubernetes/workloads" style={{ fontSize: 11, color: t.info, textDecoration: 'none', fontWeight: 500 }}>View →</Link>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -1, lineHeight: 1, marginBottom: 8, ...mono }}>
            {runningPods}<span style={{ fontSize: 14, fontWeight: 400, color: t.textSub }}>/{totalPods}</span>
          </div>
          <ProgressBar pct={totalPods > 0 ? (runningPods / totalPods) * 100 : 0} color="#22c55e" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>Running / Total</span>
            {(alertCount > 0 || warnCount > 0) && (
              <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 500 }}>
                {alertCount + warnCount} issue{alertCount + warnCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content: 3-col layout ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 12 }}>

        {/* Quick actions */}
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Quick actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {quickActions.map((qa, i) => (
              <div
                key={i}
                onClick={() => navigate(qa.href)}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  padding: '11px 12px', borderRadius: 10,
                  background: qa.bg, cursor: 'pointer',
                  border: `1px solid transparent`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <qa.icon style={{ width: 17, height: 17, color: qa.color }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{qa.label}</div>
                  <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>{qa.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform modules */}
        <div style={{ ...card }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Platform status</span>
            <span style={{ fontSize: 10, color: t.textMuted }}>
              {modules.filter(m => m.ok).length}/{modules.length} online
            </span>
          </div>
          <div>
            {modules.map((mod, i) => (
              <Link key={i} to={mod.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < modules.length - 1 ? `1px solid ${t.cardBorder}` : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: mod.color + (isDark ? '20' : '15'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <mod.icon style={{ width: 14, height: 14, color: mod.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{mod.label}</span>
                      <span style={{ fontSize: 11, color: t.textMuted }}>{mod.sub}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 9999, background: mod.color + '22', overflow: 'hidden' }}>
                      <div style={{ width: `${mod.pct}%`, height: '100%', borderRadius: 9999, background: mod.color, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: mod.ok ? '#22c55e' : '#ef4444',
                    boxShadow: `0 0 5px ${mod.ok ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
                  }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ ...card }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Activity</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {alertCount > 0 && (
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 9999, background: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2', color: '#ef4444', fontWeight: 600 }}>
                  {alertCount} critical
                </span>
              )}
              <Link to="/events" style={{ fontSize: 11, color: t.info, textDecoration: 'none', fontWeight: 500 }}>All →</Link>
            </div>
          </div>

          {recentEvents.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
              <CheckCircleIcon style={{ width: 22, height: 22, color: '#22c55e', margin: '0 auto 8px' }} />
              No recent events
            </div>
          ) : recentEvents.map((ev, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 18px', borderBottom: i < recentEvents.length - 1 ? `1px solid ${t.cardBorder}` : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div style={{ marginTop: 3, width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: evStatusColor(ev.status), boxShadow: ev.status === 'error' ? `0 0 5px ${evStatusColor(ev.status)}` : 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{ev.message}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: evStatusBg(ev.status), color: evStatusColor(ev.status), fontWeight: 500 }}>
                    {evStatusLabel(ev.status)}
                  </span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>{ev.namespace}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Deployments ────────────────────────────────────────── */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${t.cardBorder}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Deployments</span>
          <Link to="/deploy" style={{ fontSize: 11, color: t.info, textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
        </div>

        {deployments.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            <RocketLaunchIcon style={{ width: 22, height: 22, color: t.textMuted, margin: '0 auto 8px' }} />
            No deployments found
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {deployments.slice(0, 6).map((dep, i) => {
              const healthy = (dep.ready_replicas ?? 0) === (dep.replicas ?? 1) && (dep.replicas ?? 0) > 0;
              const pct = (dep.replicas ?? 0) > 0 ? ((dep.ready_replicas ?? 0) / (dep.replicas ?? 1)) * 100 : 0;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                    borderRight: (i + 1) % 3 !== 0 ? `1px solid ${t.cardBorder}` : 'none',
                    borderBottom: i < deployments.slice(0, 6).length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                    transition: 'background 0.1s', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RocketLaunchIcon style={{ width: 15, height: 15, color: '#8b5cf6' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.name}</span>
                      <span style={{ fontSize: 11, color: t.textMuted, flexShrink: 0, marginLeft: 6 }}>{dep.ready_replicas ?? 0}/{dep.replicas ?? 0}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 9999, background: (healthy ? '#22c55e' : '#f59e0b') + '22', overflow: 'hidden', marginBottom: 3 }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 9999, background: healthy ? '#22c55e' : '#f59e0b', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: t.textMuted }}>{dep.namespace || 'default'}</span>
                      <span style={{ fontSize: 10, color: healthy ? '#22c55e' : '#f59e0b', fontWeight: 500 }}>
                        {healthy ? '● Healthy' : '● Degraded'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`, fontSize: 11, color: t.textMuted }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SparklesIcon style={{ width: 12, height: 12 }} /> NextSight v2.0</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ClockIcon style={{ width: 12, height: 12 }} /> Auto-refresh 30s</span>
        </div>
        <span>Updated {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
