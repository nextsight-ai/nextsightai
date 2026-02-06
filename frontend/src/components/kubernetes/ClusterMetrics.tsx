import { useEffect, useState } from 'react';
import { ArrowPathIcon, CloudIcon } from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import type { ClusterMetrics as ClusterMetricsType, PodMetrics, Namespace } from '../../types';
import { MetricCard, DataTable, SectionHeader } from '../shared';

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
  const [clusterMetrics, setClusterMetrics] = useState<ClusterMetricsType | null>(null);
  const [podMetrics, setPodMetrics] = useState<PodMetrics[]>([]);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
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
      <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#525252', fontSize: 14 }}>Loading cluster metrics...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fafafa' }}>
      {/* Header */}
      <header style={{ padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: -0.5, marginBottom: 2 }}>
              Cluster Metrics
            </h1>
            <p style={{ color: '#525252', fontSize: 11, margin: 0 }}>
              Resource usage and performance monitoring
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CloudIcon style={{ width: 14, height: 14, color: '#525252' }} />
              <select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  padding: '2px 0',
                  fontSize: 12,
                  color: '#fafafa',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ background: '#0a0a0a' }}>All namespaces</option>
                {namespaces.map((ns) => (
                  <option key={ns.name} value={ns.name} style={{ background: '#0a0a0a' }}>
                    {ns.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#525252',
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              <MetricCard
                value={`${clusterMetrics.cpu_percent}%`}
                label="CPU Usage"
                color="#3b82f6"
                subtitle={`${clusterMetrics.total_cpu_usage} / ${clusterMetrics.total_cpu_capacity}`}
              />
              <MetricCard
                value={`${clusterMetrics.memory_percent}%`}
                label="Memory Usage"
                color="#8b5cf6"
                subtitle={`${clusterMetrics.total_memory_usage} / ${clusterMetrics.total_memory_capacity}`}
              />
              <MetricCard
                value={clusterMetrics.nodes?.length || 0}
                label="Nodes"
                color="#22c55e"
              />
              <MetricCard
                value={podMetrics.length}
                label="Pods"
                color="#eab308"
              />
            </div>
          </section>
        )}

        {/* Top Consumers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
          {/* CPU */}
          <section>
            <SectionHeader title="Top CPU Consumers" size="sm" />
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 60px',
                gap: 12,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                fontSize: 10,
                fontWeight: 500,
                color: '#525252',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                <div>Pod</div>
                <div style={{ textAlign: 'right' }}>CPU</div>
                <div style={{ textAlign: 'right' }}>%</div>
              </div>

              {topPodsByCpu.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#404040', fontSize: 12 }}>
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
                        borderBottom: i < topPodsByCpu.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        fontSize: 11,
                        color: '#fafafa',
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pod.name}
                      </div>
                      <div style={{ textAlign: 'right', ...mono }}>{cpu}m</div>
                      <div style={{ textAlign: 'right', color: '#525252', ...mono }}>{percent}%</div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Memory */}
          <section>
            <SectionHeader title="Top Memory Consumers" size="sm" />
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 60px',
                gap: 12,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                fontSize: 10,
                fontWeight: 500,
                color: '#525252',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                <div>Pod</div>
                <div style={{ textAlign: 'right' }}>Memory</div>
                <div style={{ textAlign: 'right' }}>%</div>
              </div>

              {topPodsByMemory.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#404040', fontSize: 12 }}>
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
                        borderBottom: i < topPodsByMemory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        fontSize: 11,
                        color: '#fafafa',
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pod.name}
                      </div>
                      <div style={{ textAlign: 'right', ...mono }}>{Math.round(mem)} Mi</div>
                      <div style={{ textAlign: 'right', color: '#525252', ...mono }}>{percent}%</div>
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
            <SectionHeader title="Resource Usage by Namespace" size="sm" />
            <DataTable
              columns={[
                { label: 'Namespace', key: 'name', width: '2fr' },
                { label: 'CPU', key: 'cpu', align: 'right', render: (row) => `${row.cpu}m` },
                { label: 'Memory', key: 'memory', align: 'right', render: (row) => `${Math.round(row.memory)} Mi` },
                { label: 'Pods', key: 'pods', align: 'right' },
              ]}
              data={namespaceStats.map(([name, stats]) => ({ name, ...stats }))}
              hoverable
            />
          </section>
        )}

        {/* Empty State */}
        {!loading && !clusterMetrics && podMetrics.length === 0 && !error && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#404040', fontSize: 12 }}>
            No metrics available. Install metrics-server.
          </div>
        )}
      </main>
    </div>
  );
}
