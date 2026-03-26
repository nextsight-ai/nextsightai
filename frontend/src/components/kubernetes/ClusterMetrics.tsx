import { useEffect, useState } from 'react';
import { Skeleton, SkeletonRow } from '../common/Skeleton';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import type { ClusterMetrics as ClusterMetricsType, PodMetrics, Namespace } from '../../types';
import { useNamespace } from '../../contexts/NamespaceContext';
import K8sHeader from './K8sHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

function parseMemoryToMi(mem: string): number {
  if (!mem) return 0;
  const value = parseInt(mem);
  if (mem.includes('Gi')) return value * 1024;
  if (mem.includes('Mi')) return value;
  if (mem.includes('Ki')) return value / 1024;
  return value / (1024 * 1024);
}

function parseCpuToMillicores(cpu: string): number {
  if (!cpu) return 0;
  return parseInt(cpu.replace('m', '')) || 0;
}

export default function ClusterMetrics() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const { selectedNamespace } = useNamespace();
  const [clusterMetrics, setClusterMetrics] = useState<ClusterMetricsType | null>(null);
  const [podMetrics, setPodMetrics] = useState<PodMetrics[]>([]);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedNamespace]);

  async function fetchData() {
    setLoading(true);
    try {
      const [metricsRes, podMetricsRes, nsRes] = await Promise.all([
        kubernetesApi.getClusterMetrics().catch(() => null),
        kubernetesApi.getPodMetrics(selectedNamespace || undefined).catch(() => ({ data: [] })),
        kubernetesApi.getNamespaces().catch(() => ({ data: [] })),
      ]);
      if (metricsRes?.data) setClusterMetrics(metricsRes.data);
      setPodMetrics(podMetricsRes.data);
      setNamespaces(nsRes.data);
      setError(null);
    } catch {
      setError('Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }

  const topPodsByCpu = [...podMetrics]
    .sort((a, b) => parseCpuToMillicores(b.total_cpu) - parseCpuToMillicores(a.total_cpu))
    .slice(0, 8);

  const topPodsByMemory = [...podMetrics]
    .sort((a, b) => parseMemoryToMi(b.total_memory) - parseMemoryToMi(a.total_memory))
    .slice(0, 8);

  const namespaceStats = Object.entries(
    podMetrics.reduce((acc, pod) => {
      if (!acc[pod.namespace]) acc[pod.namespace] = { cpu: 0, memory: 0, pods: 0 };
      acc[pod.namespace].cpu += parseCpuToMillicores(pod.total_cpu);
      acc[pod.namespace].memory += parseMemoryToMi(pod.total_memory);
      acc[pod.namespace].pods += 1;
      return acc;
    }, {} as Record<string, { cpu: number; memory: number; pods: 0 }>)
  ).sort((a, b) => b[1].cpu - a[1].cpu).slice(0, 10);

  const maxCpu = topPodsByCpu[0] ? parseCpuToMillicores(topPodsByCpu[0].total_cpu) : 1;
  const maxMem = topPodsByMemory[0] ? parseMemoryToMi(topPodsByMemory[0].total_memory) : 1;

  if (loading && !clusterMetrics) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', background: t.mainBg, overflow: 'hidden' }}>
        {/* Header skeleton */}
        <div style={{ padding: '16px 32px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Skeleton width={160} height={14} style={{ marginBottom: 6 }} />
            <Skeleton width={240} height={9} />
          </div>
          <Skeleton width={60} height={9} />
        </div>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {/* 4 stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 32 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ padding: '16px 20px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <Skeleton width={70} height={9} />
                  <Skeleton width={48} height={22} />
                </div>
                <Skeleton width="100%" height={3} style={{ marginBottom: 6 }} />
                <Skeleton width={100} height={8} />
              </div>
            ))}
          </div>
          {/* Two table sections */}
          {[...Array(2)].map((_, s) => (
            <div key={s} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.cardBorder}` }}>
                <Skeleton width={140} height={12} />
              </div>
              {[...Array(5)].map((_, r) => (
                <SkeletonRow key={r} cols={['30%', '15%', '15%', '15%', '15%']} />
              ))}
            </div>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', color: t.text, overflow: 'hidden' }}>
      {/* K8s Header */}
      <K8sHeader
        title="Cluster Metrics"
        subtitle="Resource usage and performance monitoring"
        rightContent={
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: t.textSub,
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 11,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              letterSpacing: 0.2,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.color = t.text)}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.color = t.textSub)}
          >
            <ArrowPathIcon style={{ width: 12, height: 12 }} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        {/* Error State */}
        {error && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            color: '#eab308',
            fontSize: 12,
            marginBottom: 24,
          }}>
            {error}. Make sure metrics-server is installed.
          </div>
        )}

        {/* Cluster Overview Metrics */}
        {clusterMetrics && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
              {/* CPU */}
              <div style={{ padding: '16px 20px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}>CPU Usage</span>
                  <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -1, color: '#3b82f6', ...mono }}>{clusterMetrics.cpu_percent}%</span>
                </div>
                <div style={{ height: 3, background: t.cardBorder, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(clusterMetrics.cpu_percent, 100)}%`, background: clusterMetrics.cpu_percent > 80 ? '#ef4444' : clusterMetrics.cpu_percent > 60 ? '#eab308' : '#3b82f6', borderRadius: 2, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 6, ...mono }}>{clusterMetrics.total_cpu_usage} / {clusterMetrics.total_cpu_capacity}</div>
              </div>
              {/* Memory */}
              <div style={{ padding: '16px 20px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}>Memory</span>
                  <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -1, color: '#8b5cf6', ...mono }}>{clusterMetrics.memory_percent}%</span>
                </div>
                <div style={{ height: 3, background: t.cardBorder, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(clusterMetrics.memory_percent, 100)}%`, background: clusterMetrics.memory_percent > 80 ? '#ef4444' : clusterMetrics.memory_percent > 60 ? '#eab308' : '#8b5cf6', borderRadius: 2, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 6, ...mono }}>{clusterMetrics.total_memory_usage} / {clusterMetrics.total_memory_capacity}</div>
              </div>
              {/* Nodes */}
              <div style={{ padding: '16px 20px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500, marginBottom: 6 }}>Nodes</div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#22c55e', ...mono }}>{clusterMetrics.nodes?.length || 0}</div>
              </div>
              {/* Pods */}
              <div style={{ padding: '16px 20px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500, marginBottom: 6 }}>Active Pods</div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#eab308', ...mono }}>{podMetrics.length}</div>
              </div>
            </div>
          </section>
        )}

        {/* Top Consumers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 32, marginBottom: 32 }}>
          {/* CPU */}
          <section>
            <h2 style={{ fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Top CPU Consumers
            </h2>
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 60px',
                gap: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${t.cardBorder}`,
                fontSize: 10,
                fontWeight: 500,
                color: t.textSub,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                <div>Pod</div>
                <div style={{ textAlign: 'right' }}>CPU</div>
                <div style={{ textAlign: 'right' }}>%</div>
              </div>

              {topPodsByCpu.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                  No data available
                </div>
              ) : (
                topPodsByCpu.map((pod, i) => {
                  const cpu = parseCpuToMillicores(pod.total_cpu);
                  const percent = Math.round((cpu / maxCpu) * 100);
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 60px',
                        gap: 12,
                        padding: '8px 0',
                        borderBottom: i < topPodsByCpu.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                        fontSize: 11,
                        color: t.text,
                        letterSpacing: 0.2,
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pod.name}
                      </div>
                      <div style={{ textAlign: 'right', ...mono }}>{cpu}m</div>
                      <div style={{ textAlign: 'right', color: t.textSub, ...mono }}>{percent}%</div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Memory */}
          <section>
            <h2 style={{ fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Top Memory Consumers
            </h2>
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 60px',
                gap: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${t.cardBorder}`,
                fontSize: 10,
                fontWeight: 500,
                color: t.textSub,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                <div>Pod</div>
                <div style={{ textAlign: 'right' }}>Memory</div>
                <div style={{ textAlign: 'right' }}>%</div>
              </div>

              {topPodsByMemory.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                  No data available
                </div>
              ) : (
                topPodsByMemory.map((pod, i) => {
                  const mem = parseMemoryToMi(pod.total_memory);
                  const percent = Math.round((mem / maxMem) * 100);
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 60px',
                        gap: 12,
                        padding: '8px 0',
                        borderBottom: i < topPodsByMemory.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                        fontSize: 11,
                        color: t.text,
                        letterSpacing: 0.2,
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pod.name}
                      </div>
                      <div style={{ textAlign: 'right', ...mono }}>{Math.round(mem)} Mi</div>
                      <div style={{ textAlign: 'right', color: t.textSub, ...mono }}>{percent}%</div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Namespace Breakdown */}
        {namespaceStats.length > 0 && (
          <section>
            <h2 style={{ fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Resource Usage by Namespace
            </h2>
            <div>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                gap: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${t.cardBorder}`,
                fontSize: 10,
                fontWeight: 500,
                color: t.textSub,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                <div>Namespace</div>
                <div style={{ textAlign: 'right' }}>CPU</div>
                <div style={{ textAlign: 'right' }}>Memory</div>
                <div style={{ textAlign: 'right' }}>Pods</div>
              </div>

              {/* Table Rows */}
              {namespaceStats.map(([name, stats], i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: i < namespaceStats.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                    fontSize: 11,
                    color: t.text,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                    letterSpacing: 0.2,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </div>
                  <div style={{ textAlign: 'right', ...mono }}>
                    {stats.cpu}m
                  </div>
                  <div style={{ textAlign: 'right', ...mono }}>
                    {Math.round(stats.memory)} Mi
                  </div>
                  <div style={{ textAlign: 'right', ...mono }}>
                    {stats.pods}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && !clusterMetrics && podMetrics.length === 0 && !error && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            No metrics available. Install metrics-server.
          </div>
        )}
      </main>
    </div>
  );
}
