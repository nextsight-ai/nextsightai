import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ServerStackIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  ArrowPathIcon,
  ClockIcon,
  SparklesIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { useCluster } from '../../contexts/ClusterContext';
import useDashboardData from '../../hooks/useDashboardData';
import { logger } from '../../utils/logger';

export default function Dashboard() {
  const toast = useToast();
  const { clusters, activeCluster, setActiveCluster } = useCluster();

  // Fetch dashboard data
  const { data, isLoading, isRefetching, hardReset, error } = useDashboardData(activeCluster?.id);

  if (error) {
    logger.error('[Dashboard] Query error', error);
  }

  // Extract data
  const clusterHealth = data?.clusterHealth ?? null;
  const deployments = data?.deployments ?? [];
  const events = data?.events ?? [];
  const metrics = data?.metrics ?? null;
  const costData = data?.costData ?? null;

  // Transform events
  const recentEvents = useMemo(() => {
    return events.slice(0, 3).map((event) => {
      let severity: 'critical' | 'warning' | 'normal' = 'normal';
      if (event.type === 'Warning') severity = 'warning';
      if (
        event.reason?.toLowerCase().includes('fail') ||
        event.reason?.toLowerCase().includes('error')
      ) {
        severity = 'critical';
      }

      return {
        severity,
        message: event.message || event.reason || 'No message',
        time: '2m ago',
      };
    });
  }, [events]);

  // Mock activity
  const activity = [
    { text: `Deployed ${deployments[0]?.name || 'api-gateway'} v2.4.1`, time: '5m ago' },
    { text: 'Security scan completed - 0 critical', time: '12m ago' },
    { text: 'Cost optimization saved $234/mo', time: '1h ago' },
  ];

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await hardReset();
      toast.success('Data Refreshed', 'Dashboard data has been updated');
    } catch (err) {
      logger.error('[Dashboard] Refresh failed', err);
      toast.error('Refresh Failed', 'Could not refresh dashboard data');
    }
  };

  const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#525252', fontSize: 14 }}>Loading platform overview...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fafafa', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Improved */}
      <header style={{ padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: -0.5, marginBottom: 4 }}>
              Platform Overview
            </h1>
            <p style={{ color: '#525252', fontSize: 13, margin: 0 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} ·
              <span style={{ color: '#22c55e', marginLeft: 6 }}>All systems operational</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Cluster Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CloudIcon style={{ width: 16, height: 16, color: '#525252' }} />
              <select
                value={activeCluster?.id || ''}
                onChange={(e) => {
                  const cluster = clusters.find((c) => c.id === e.target.value);
                  if (cluster) setActiveCluster(cluster.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  padding: '4px 0',
                  fontSize: 13,
                  color: '#fafafa',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {clusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id} style={{ background: '#0a0a0a' }}>
                    {cluster.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#525252',
                cursor: isRefetching ? 'wait' : 'pointer',
                fontSize: 12,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowPathIcon style={{ width: 14, height: 14 }} />
              {isRefetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Fits screen */}
      <main style={{ flex: 1, padding: '32px 40px', overflow: 'auto' }}>
        {/* Key Metrics */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 32 }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -2, color: '#22c55e', ...mono }}>
                {clusterHealth?.total_pods || 0}
              </div>
              <div style={{ fontSize: 11, color: '#525252', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pods</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -2, color: '#3b82f6', ...mono }}>
                {metrics?.cpu_percent ? `${metrics.cpu_percent.toFixed(0)}%` : '-'}
              </div>
              <div style={{ fontSize: 11, color: '#525252', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>CPU</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -2, color: '#8b5cf6', ...mono }}>
                {metrics?.memory_percent ? `${metrics.memory_percent.toFixed(0)}%` : '-'}
              </div>
              <div style={{ fontSize: 11, color: '#525252', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Memory</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -2, color: '#ef4444', ...mono }}>
                {recentEvents.filter((e) => e.severity === 'critical').length}
              </div>
              <div style={{ fontSize: 11, color: '#525252', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Alerts</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -2, color: '#eab308', ...mono }}>
                {deployments.length}
              </div>
              <div style={{ fontSize: 11, color: '#525252', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Deploys</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -2, color: '#10b981', ...mono }}>
                ${costData?.total_monthly_estimate ? costData.total_monthly_estimate.toFixed(0) : '0'}
              </div>
              <div style={{ fontSize: 11, color: '#525252', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cost/Mo</div>
            </div>
          </div>
        </section>

        {/* Platform Sections Summary */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
            Platform Status
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {/* Kubernetes */}
            <Link to="/kubernetes" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ServerStackIcon style={{ width: 16, height: 16, color: '#3b82f6' }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Kubernetes</span>
                  <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ fontSize: 11, color: '#525252', ...mono }}>
                  {clusterHealth?.node_count || 0} nodes · {clusterHealth?.total_pods || 0} pods
                </div>
              </div>
            </Link>

            {/* Security */}
            <Link to="/security" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ShieldCheckIcon style={{ width: 16, height: 16, color: '#10b981' }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Security</span>
                  <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ fontSize: 11, color: '#525252', ...mono }}>
                  0 critical · Last scan 2h ago
                </div>
              </div>
            </Link>

            {/* Deployments */}
            <Link to="/deploy" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <RocketLaunchIcon style={{ width: 16, height: 16, color: '#8b5cf6' }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Deploy</span>
                  <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ fontSize: 11, color: '#525252', ...mono }}>
                  {deployments.length} apps · 3 helm releases
                </div>
              </div>
            </Link>

            {/* Monitoring */}
            <Link to="/monitoring" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ChartBarIcon style={{ width: 16, height: 16, color: '#f59e0b' }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Monitoring</span>
                  <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ fontSize: 11, color: '#525252', ...mono }}>
                  Prometheus · {recentEvents.length} alerts
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Bottom Grid - Alerts & Activity */}
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40 }}>
            {/* Recent Alerts */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                  Recent Alerts
                </h2>
                <Link to="/events" style={{ marginLeft: 'auto', fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>
                  View all →
                </Link>
              </div>

              {recentEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentEvents.map((alert, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: i < recentEvents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: alert.severity === 'critical' ? '#ef4444' : '#eab308',
                          boxShadow: alert.severity === 'critical' ? '0 0 8px #ef4444' : 'none',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#fafafa' }}>{alert.message}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#404040', ...mono }}>{alert.time}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '32px 0', textAlign: 'center', color: '#404040', fontSize: 12 }}>
                  No recent alerts
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div>
              <h2 style={{ fontSize: 11, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Activity
              </h2>
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                <div style={{ position: 'absolute', left: 3, top: 6, bottom: 6, width: 1, background: 'rgba(255,255,255,0.06)' }} />

                {activity.map((item, i) => (
                  <div key={i} style={{ position: 'relative', paddingBottom: i < activity.length - 1 ? 16 : 0 }}>
                    <span style={{
                      position: 'absolute',
                      left: -20,
                      top: 6,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#0a0a0a',
                      border: '2px solid #404040',
                    }} />
                    <div style={{ fontSize: 12, color: '#fafafa' }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: '#404040', marginTop: 2, ...mono }}>{item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - No boxes */}
      <footer style={{ padding: '20px 40px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 11, color: '#404040' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SparklesIcon style={{ width: 14, height: 14 }} />
              <span>NextSight v2.0</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClockIcon style={{ width: 14, height: 14 }} />
              <span>Auto-refresh: 30s</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CodeBracketIcon style={{ width: 14, height: 14 }} />
              <span>Press <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 3, ...mono }}>⌘K</kbd> for commands</span>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#404040' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </footer>
    </div>
  );
}
