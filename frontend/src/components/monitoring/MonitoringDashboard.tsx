import { useState, useEffect } from 'react';
import { Skeleton, SkeletonCard } from '../common/Skeleton';
import K8sHeader from '../kubernetes/K8sHeader';
import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import { prometheusApi } from '../../services/prometheusApi';
import type { ClusterMetrics, K8sEvent } from '../../types';
import type { PrometheusStackStatus, Alert as PrometheusAlert } from '../../types/prometheus';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';


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
        prometheusApi.getStackStatus().catch(() => null),
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
      const promAlerts: Alert[] = (Array.isArray(prometheusAlerts.data) ? prometheusAlerts.data : [])
        .slice(0, 10)
        .map((a: PrometheusAlert, idx: number) => ({
          id: `prom-${idx}`,
          title: a.labels?.alertname || 'Alert',
          severity: a.labels?.severity === 'critical' ? 'critical' : 'warning',
          source: 'Prometheus',
          timestamp: a.active_at || new Date().toISOString(),
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

  if (loading && !metrics) {
    return (
      <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <K8sHeader title="Monitoring" subtitle="Cluster metrics, alerts, and system health" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
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
    <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <K8sHeader
        title="Monitoring"
        subtitle="Cluster metrics, alerts, and system health"
        rightContent={
          <button onClick={fetchData} disabled={loading} style={{ background: 'none', border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: t.textSub, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <ArrowPathIcon style={{ width: 13, height: 13 }} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
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
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Cluster Overview
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {/* CPU */}
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#3b82f6', ...mono }}>
                  {metrics.cpu_percent}%
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>CPU Usage</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3, ...mono }}>
                  {metrics.total_cpu_usage} / {metrics.total_cpu_capacity}
                </div>
              </div>
              {/* Memory */}
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#8b5cf6', ...mono }}>
                  {metrics.memory_percent}%
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Memory Usage</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3, ...mono }}>
                  {metrics.total_memory_usage} / {metrics.total_memory_capacity}
                </div>
              </div>
              {/* Nodes */}
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#22c55e', ...mono }}>
                  {metrics.nodes?.length || 0}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nodes</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>in cluster</div>
              </div>
              {/* Alerts */}
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#eab308', ...mono }}>
                  {activeAlerts.length}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Alerts</div>
                <div style={{ fontSize: 9, color: '#ef4444', marginTop: 3, ...mono }}>{criticalAlerts} critical</div>
              </div>
              {/* Prometheus */}
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: prometheusStatus?.status === 'running' ? '#22c55e' : '#ef4444', ...mono }}>
                  {prometheusStatus?.status === 'running' ? 'UP' : 'DOWN'}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prometheus</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>
                  {prometheusStatus?.status || 'unknown'}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Active Alerts */}
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Active Alerts · {activeAlerts.length} firing
          </h2>

          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 120px 150px 100px',
              gap: 12,
              padding: '10px 20px',
              borderBottom: `1px solid ${t.cardBorder}`,
              fontSize: 10,
              fontWeight: 600,
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
              <div style={{ padding: '40px 24px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                <CheckCircleIcon style={{ width: 40, height: 40, margin: '0 auto 10px', color: '#22c55e', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No active alerts</p>
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
                    padding: '11px 20px',
                    borderBottom: i < activeAlerts.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                    fontSize: 11,
                    color: t.text,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.title}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.source}</div>
                  <div style={{ fontSize: 10, color: t.textMuted, ...mono }}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, color: t.textSub }}>
                    {alert.description}
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontSize: 10,
                      fontWeight: 500,
                      background: `${getSeverityColor(alert.severity)}18`,
                      color: getSeverityColor(alert.severity),
                      border: `1px solid ${getSeverityColor(alert.severity)}30`,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: getSeverityColor(alert.severity), boxShadow: alert.severity === 'critical' ? `0 0 5px ${getSeverityColor(alert.severity)}` : 'none' }} />
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
          <h2 style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Recent Events · {events.length} events
          </h2>

          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 2fr 1fr 150px 100px',
              gap: 12,
              padding: '10px 20px',
              borderBottom: `1px solid ${t.cardBorder}`,
              fontSize: 10,
              fontWeight: 600,
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
            {events.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                No recent events
              </div>
            ) : events.slice(0, 20).map((event, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 2fr 1fr 150px 100px',
                  gap: 12,
                  padding: '11px 20px',
                  borderBottom: i < Math.min(events.length, 20) - 1 ? `1px solid ${t.cardBorder}` : 'none',
                  fontSize: 11,
                  color: t.text,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: 10, color: t.textMuted, ...mono }}>
                  {new Date(event.last_timestamp || event.first_timestamp || '').toLocaleTimeString()}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.message}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.involved_object?.name || '-'}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.textSub }}>
                  {event.namespace}
                </div>
                <div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: 10,
                    fontWeight: 500,
                    background: event.type === 'Warning' ? 'rgba(234,179,8,0.12)' : 'rgba(59,130,246,0.12)',
                    color: event.type === 'Warning' ? '#eab308' : '#3b82f6',
                    border: `1px solid ${event.type === 'Warning' ? 'rgba(234,179,8,0.25)' : 'rgba(59,130,246,0.25)'}`,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: event.type === 'Warning' ? '#eab308' : '#3b82f6' }} />
                    {event.type}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {events.length > 20 && (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: t.textMuted }}>Showing 20 of {events.length} events</div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
