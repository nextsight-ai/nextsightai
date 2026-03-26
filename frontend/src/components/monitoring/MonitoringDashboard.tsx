import { useState, useEffect } from 'react';
import { Skeleton, SkeletonCard } from '../common/Skeleton';
import { Link } from 'react-router-dom';
import { ChartBarIcon, BellAlertIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, ArrowPathIcon, CpuChipIcon, CircleStackIcon, ServerIcon } from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import { prometheusApi } from '../../services/prometheusApi';
import type { ClusterMetrics, K8sEvent } from '../../types';
import type { PrometheusStackStatus, Alert as PrometheusAlert } from '../../types/prometheus';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

interface Alert {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  timestamp: string;
  status: 'firing' | 'resolved';
  description: string;
}

export default function MonitoringDashboard() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [metrics, setMetrics] = useState<ClusterMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<K8sEvent[]>([]);
  const [prometheusStatus, setPrometheusStatus] = useState<PrometheusStackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [metricsRes, eventsRes, prometheusRes, prometheusAlerts] = await Promise.all([
        kubernetesApi.getClusterMetrics().catch(() => null),
        kubernetesApi.getEvents().catch(() => ({ data: [] })),
        prometheusApi.getStatus().catch(() => null),
        prometheusApi.getAlerts().catch(() => ({ data: [] })),
      ]);

      if (metricsRes?.data) setMetrics(metricsRes.data);
      setEvents(eventsRes.data || []);
      setPrometheusStatus(prometheusRes?.data || null);

      // Convert events to alerts
      const eventAlerts: Alert[] = (eventsRes.data || [])
        .filter((e: K8sEvent) => e.type === 'Warning')
        .slice(0, 10)
        .map((e: K8sEvent, idx: number) => ({
          id: `event-${idx}`,
          title: `${e.reason}: ${e.involved_object?.name || 'Unknown'}`,
          severity: e.reason?.includes('Failed') ? 'critical' : 'warning',
          source: e.involved_object?.kind || 'Kubernetes',
          timestamp: e.last_timestamp || e.first_timestamp || 'Unknown',
          status: 'firing' as const,
          description: e.message,
        }));

      // Convert Prometheus alerts
      const promAlerts: Alert[] = (prometheusAlerts.data || [])
        .slice(0, 10)
        .map((a: PrometheusAlert, idx: number) => ({
          id: `prom-${idx}`,
          title: a.labels?.alertname || 'Alert',
          severity: a.labels?.severity === 'critical' ? 'critical' : 'warning',
          source: 'Prometheus',
          timestamp: a.activeAt || new Date().toISOString(),
          status: a.state === 'firing' ? 'firing' : 'resolved',
          description: a.annotations?.description || a.annotations?.summary || 'No description',
        }));

      setAlerts([...eventAlerts, ...promAlerts].slice(0, 15));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#eab308';
      case 'info':
        return '#3b82f6';
      default:
        return t.textMuted;
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'firing');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning').length;

  if (loading && !metrics) {
    return (
      <div style={{ minHeight: '100vh', background: t.mainBg, color: t.text }}>
        {/* Header skeleton */}
        <header style={{ padding: '16px 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Skeleton width={200} height={16} style={{ marginBottom: 6 }} />
              <Skeleton width={260} height={9} />
            </div>
            <Skeleton width={60} height={9} />
          </div>
        </header>
        <div style={{ padding: '24px 32px' }}>
          {/* Stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 28 }}>
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} height={82} />)}
          </div>
          {/* Two content cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 20 }}>
                <Skeleton width={120} height={12} style={{ marginBottom: 16 }} />
                {[...Array(5)].map((_, r) => (
                  <div key={r} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <Skeleton width={8} height={8} radius={4} />
                    <Skeleton width="60%" height={10} />
                    <Skeleton width="20%" height={10} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: t.mainBg, color: t.text }}>
      {/* Header */}
      <header style={{ padding: '16px 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: -0.5, marginBottom: 2 }}>
              Monitoring Dashboard
            </h1>
            <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>
              Cluster metrics, alerts, and system health
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: t.textMuted,
                cursor: loading ? 'wait' : 'pointer',
                fontSize: 11,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ArrowPathIcon style={{ width: 12, height: 12 }} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '24px 32px' }}>
        {/* Error State */}
        {error && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: 12,
            marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {/* Cluster Metrics */}
        {metrics && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 10, fontWeight: 500, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Cluster Overview
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#3b82f6', ...mono }}>
                  {metrics.cpu_percent}%
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  CPU Usage
                </div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2, ...mono }}>
                  {metrics.total_cpu_usage} / {metrics.total_cpu_capacity}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#8b5cf6', ...mono }}>
                  {metrics.memory_percent}%
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Memory Usage
                </div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2, ...mono }}>
                  {metrics.total_memory_usage} / {metrics.total_memory_capacity}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#22c55e', ...mono }}>
                  {metrics.nodes?.length || 0}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Nodes
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#eab308', ...mono }}>
                  {activeAlerts.length}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Active Alerts
                </div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2, ...mono }}>
                  {criticalAlerts} critical
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: prometheusStatus?.prometheus?.status === 'healthy' ? '#22c55e' : '#ef4444', ...mono }}>
                  {prometheusStatus?.prometheus?.status === 'healthy' ? 'UP' : 'DOWN'}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Prometheus
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Active Alerts */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 10, fontWeight: 500, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Active Alerts · {activeAlerts.length} firing
          </h2>

          <div>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 120px 150px 100px',
              gap: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${t.cardBorder}`,
              fontSize: 10,
              fontWeight: 500,
              color: t.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              <div>Alert</div>
              <div>Source</div>
              <div>Time</div>
              <div>Description</div>
              <div>Severity</div>
            </div>

            {/* Table Rows */}
            {activeAlerts.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                <CheckCircleIcon style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#22c55e', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No active alerts</p>
                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>All systems running normally</p>
              </div>
            ) : (
              activeAlerts.map((alert, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 120px 150px 100px',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: i < activeAlerts.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                    fontSize: 11,
                    color: t.text,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {alert.title}
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {alert.source}
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, color: t.textMuted }}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>
                    {alert.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: getSeverityColor(alert.severity),
                      boxShadow: alert.severity === 'critical' ? '0 0 6px #ef4444' : 'none',
                    }} />
                    <span style={{ color: getSeverityColor(alert.severity) }}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Events */}
        <section>
          <h2 style={{ fontSize: 10, fontWeight: 500, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Recent Events · {events.length} events
          </h2>

          <div>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 2fr 1fr 150px 100px',
              gap: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${t.cardBorder}`,
              fontSize: 10,
              fontWeight: 500,
              color: t.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              <div>Time</div>
              <div>Message</div>
              <div>Resource</div>
              <div>Namespace</div>
              <div>Type</div>
            </div>

            {/* Table Rows */}
            {events.slice(0, 20).map((event, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 2fr 1fr 150px 100px',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < Math.min(events.length, 20) - 1 ? `1px solid ${t.cardBorder}` : 'none',
                  fontSize: 11,
                  color: t.text,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ fontSize: 10, color: t.textMuted, ...mono }}>
                  {new Date(event.last_timestamp || event.first_timestamp).toLocaleTimeString()}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.message}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.involved_object?.name || '-'}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.namespace}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: event.type === 'Warning' ? '#eab308' : '#3b82f6',
                  }} />
                  <span style={{ color: event.type === 'Warning' ? '#eab308' : '#3b82f6' }}>
                    {event.type}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {events.length > 20 && (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: t.textMuted }}>
                Showing 20 of {events.length} events
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
