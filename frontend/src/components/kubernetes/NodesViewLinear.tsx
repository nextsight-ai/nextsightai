import { useState } from 'react';
import { ArrowPathIcon, ServerIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { MetricCard, DataTable, SectionHeader, StatusDot } from '../shared';
import useNodesData from '../../hooks/useNodesData';
import type { NodeInfo, NodeMetrics } from '../../types';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

export default function NodesView() {
  const { nodes, metrics, pods, loading, error, refetch } = useNodesData();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Calculate node stats
  const totalNodes = nodes.length;
  const readyNodes = nodes.filter(n => n.status === 'Ready').length;
  const totalPods = pods.length;
  const avgCpu = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.cpu_percent, 0) / metrics.length)
    : 0;
  const avgMemory = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.memory_percent, 0) / metrics.length)
    : 0;

  // Get pod count per node
  const podCountByNode = pods.reduce((acc, pod) => {
    acc[pod.node_name] = (acc[pod.node_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Combine node data with metrics
  const nodeData = nodes.map(node => {
    const nodeMetrics = metrics.find(m => m.node_name === node.name);
    return {
      name: node.name,
      status: node.status,
      roles: node.roles.join(', '),
      cpu: nodeMetrics?.cpu_percent || 0,
      memory: nodeMetrics?.memory_percent || 0,
      pods: podCountByNode[node.name] || 0,
      ip: node.internal_ip,
      version: node.kubelet_version,
    };
  });

  if (loading && nodes.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#525252', fontSize: 14 }}>Loading nodes...</div>
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
              Cluster Nodes
            </h1>
            <p style={{ color: '#525252', fontSize: 11, margin: 0 }}>
              Infrastructure and resource allocation
            </p>
          </div>

          <button
            onClick={refetch}
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

        {/* Overview Metrics */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24 }}>
            <MetricCard
              value={totalNodes}
              label="Total Nodes"
              color="#3b82f6"
            />
            <MetricCard
              value={readyNodes}
              label="Ready Nodes"
              color="#22c55e"
            />
            <MetricCard
              value={totalPods}
              label="Total Pods"
              color="#eab308"
            />
            <MetricCard
              value={`${avgCpu}%`}
              label="Avg CPU"
              color="#8b5cf6"
            />
            <MetricCard
              value={`${avgMemory}%`}
              label="Avg Memory"
              color="#ec4899"
            />
          </div>
        </section>

        {/* Nodes Table */}
        <section>
          <SectionHeader title="Nodes" subtitle={`${readyNodes}/${totalNodes} ready`} size="sm" />

          <DataTable
            columns={[
              {
                label: 'Node',
                key: 'name',
                width: '2fr',
                render: (row) => (
                  <div>
                    <div style={{ fontSize: 12, color: '#fafafa', marginBottom: 2 }}>{row.name}</div>
                    <div style={{ fontSize: 10, color: '#525252', ...mono }}>{row.ip}</div>
                  </div>
                ),
              },
              {
                label: 'Status',
                key: 'status',
                width: '100px',
                render: (row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot
                      status={row.status === 'Ready' ? 'success' : 'error'}
                      size={5}
                    />
                    <span style={{ fontSize: 11 }}>{row.status}</span>
                  </div>
                ),
              },
              {
                label: 'Roles',
                key: 'roles',
                width: '120px',
              },
              {
                label: 'CPU',
                key: 'cpu',
                width: '80px',
                align: 'right',
                render: (row) => {
                  const color = row.cpu >= 90 ? '#ef4444' : row.cpu >= 70 ? '#eab308' : '#525252';
                  return <span style={{ color }}>{row.cpu}%</span>;
                },
              },
              {
                label: 'Memory',
                key: 'memory',
                width: '80px',
                align: 'right',
                render: (row) => {
                  const color = row.memory >= 90 ? '#ef4444' : row.memory >= 70 ? '#eab308' : '#525252';
                  return <span style={{ color }}>{row.memory}%</span>;
                },
              },
              {
                label: 'Pods',
                key: 'pods',
                width: '60px',
                align: 'right',
              },
              {
                label: 'Version',
                key: 'version',
                width: '100px',
              },
            ]}
            data={nodeData}
            onRowClick={(row) => setSelectedNode(row.name)}
            hoverable
          />
        </section>

        {/* Empty State */}
        {!loading && nodes.length === 0 && !error && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#404040', fontSize: 12 }}>
            No nodes found in the cluster.
          </div>
        )}
      </main>
    </div>
  );
}
