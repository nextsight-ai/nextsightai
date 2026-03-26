import { useState } from 'react';
import { ArrowPathIcon, ServerStackIcon, CubeIcon, CpuChipIcon, CircleStackIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Skeleton, SkeletonRow } from '../common/Skeleton';
import useNodesData from '../../hooks/useNodesData';
import K8sHeader from './K8sHeader';
import ResourceDetailWindow, { type RDWResource } from './ResourceDetailWindow';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

function NodeBar({ pct, color }: { pct: number; color: string }) {
  const barColor = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 9999, background: barColor + '22', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 9999, background: barColor, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 10, ...mono, color: barColor, fontWeight: 600, flexShrink: 0, width: 30, textAlign: 'right' }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export default function NodesViewLinear() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const { data, isLoading, error, refresh } = useNodesData();
  const [rdw, setRdw] = useState<{ resources: RDWResource[]; activeId: string; forceRestore: number } | null>(null);

  const openNode = (node: typeof nodeData[0]) => {
    const id = `Node/_/${node.name}`;
    setRdw(prev => {
      if (!prev) return { resources: [{ id, kind: 'Node', name: node.name, namespace: '', resourceObj: node }], activeId: id, forceRestore: 0 };
      if (prev.resources.some(r => r.id === id)) return { ...prev, activeId: id, forceRestore: prev.forceRestore + 1 };
      return { ...prev, resources: [...prev.resources, { id, kind: 'Node', name: node.name, namespace: '', resourceObj: node }], activeId: id, forceRestore: prev.forceRestore + 1 };
    });
  };

  const closeRdwTab = (id: string) => setRdw(prev => {
    if (!prev) return null;
    const resources = prev.resources.filter(r => r.id !== id);
    if (!resources.length) return null;
    return { ...prev, resources, activeId: prev.activeId === id ? resources[resources.length - 1].id : prev.activeId };
  });

  const nodes = data?.nodes || [];
  const metrics = data?.metrics || [];
  const pods = data?.nodePods ? Object.values(data.nodePods).flatMap(np => np.pods) : [];

  const totalNodes = nodes.length;
  const readyNodes = nodes.filter(n => n.status === 'Ready').length;
  const totalPods  = pods.length;
  const avgCpu     = metrics.length > 0 ? Math.round(metrics.reduce((s, m) => s + m.cpu_percent, 0) / metrics.length) : 0;
  const avgMemory  = metrics.length > 0 ? Math.round(metrics.reduce((s, m) => s + m.memory_percent, 0) / metrics.length) : 0;

  const podCountByNode = pods.reduce((acc, pod) => {
    const n = pod.node || '';
    if (n) acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const nodeData = nodes.map(node => {
    const nm = metrics.find(m => m.name === node.name);
    return {
      name: node.name,
      status: node.status,
      roles: node.roles.join(', ') || 'worker',
      cpu: nm?.cpu_percent || 0,
      memory: nm?.memory_percent || 0,
      pods: podCountByNode[node.name] || 0,
      ip: node.internal_ip,
      version: node.version,
      os: node.os_image,
      runtime: node.container_runtime,
      age: node.age,
    };
  });

  const card = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 14,
    boxShadow: isDark ? 'none' : '0 1px 6px rgba(0,0,0,0.05)',
  };

  if (isLoading && nodes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', color: t.text, overflow: 'hidden' }}>
        <K8sHeader title="Cluster Nodes" subtitle="Infrastructure and resource allocation" />
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {/* Stat strip skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton width={34} height={34} radius={8} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="55%" height={20} style={{ marginBottom: 6 }} />
                  <Skeleton width="70%" height={9} />
                </div>
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '9px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', gap: 12 }}>
              {['30%','12%','8%','8%','14%','10%','10%'].map((w, i) => (
                <Skeleton key={i} width={w} height={9} />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} cols={['30%','12%','8%','8%','14%','10%','10%']} heights={[13,10,10,10,8,10,10]} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', color: t.text, overflow: 'hidden' }}>

      <K8sHeader
        title="Cluster Nodes"
        subtitle="Infrastructure and resource allocation"
        rightContent={
          <button
            onClick={refresh} disabled={isLoading}
            style={{ background: 'transparent', border: 'none', color: t.textSub, cursor: isLoading ? 'wait' : 'pointer', fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', gap: 4, letterSpacing: 0.2 }}
            onMouseEnter={e => !isLoading && (e.currentTarget.style.color = t.text)}
            onMouseLeave={e => !isLoading && (e.currentTarget.style.color = t.textSub)}
          >
            <ArrowPathIcon style={{ width: 12, height: 12 }} />
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <main style={{ flex: 1, overflow: 'auto', padding: '20px 32px' }}>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 12, marginBottom: 16 }}>
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {/* ── Stats strip ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { icon: ServerStackIcon, label: 'Total Nodes',  value: String(totalNodes), color: '#3b82f6' },
            { icon: CheckCircleIcon, label: 'Ready',        value: String(readyNodes),  color: '#22c55e' },
            { icon: CubeIcon,        label: 'Total Pods',   value: String(totalPods),   color: '#f59e0b' },
            { icon: CpuChipIcon,     label: 'Avg CPU',      value: `${avgCpu}%`,        color: '#8b5cf6' },
            { icon: CircleStackIcon, label: 'Avg Memory',   value: `${avgMemory}%`,     color: '#ec4899' },
          ].map((s, i) => (
            <div key={i} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: s.color + (isDark ? '22' : '18'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 16, height: 16, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.text, lineHeight: 1, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Node table ───────────────────────────────────────────────── */}
        <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ServerStackIcon style={{ width: 14, height: 14, color: t.textSub }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Nodes</span>
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 9999, background: t.cardBorder, color: t.textMuted }}>{readyNodes}/{totalNodes} ready</span>
            </div>

            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 90px 110px 1fr 1fr 60px 90px', gap: 12, padding: '8px 18px', fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${t.cardBorder}` }}>
              <span>Node</span><span>Status</span><span>Role</span><span>CPU</span><span>Memory</span><span style={{ textAlign: 'center' }}>Pods</span><span>Version</span>
            </div>

            {nodeData.length === 0 ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>No nodes found</div>
            ) : nodeData.map((node, i) => {
              const isSelected = rdw?.activeId === `Node/_/${node.name}`;
              const isControl  = node.roles.includes('control') || node.roles.includes('master');
              const isReady    = node.status === 'Ready';
              return (
                <div
                  key={node.name}
                  onClick={() => openNode(node)}
                  style={{ display: 'grid', gridTemplateColumns: '1.8fr 90px 110px 1fr 1fr 60px 90px', gap: 12, padding: '11px 18px', alignItems: 'center', borderBottom: i < nodeData.length - 1 ? `1px solid ${t.cardBorder}` : 'none', cursor: 'pointer', background: isSelected ? (isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF') : 'transparent', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</div>
                    {node.ip && <div style={{ fontSize: 10, color: t.textMuted, ...mono }}>{node.ip}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: isReady ? '#22c55e' : '#ef4444', boxShadow: `0 0 4px ${isReady ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}` }} />
                    <span style={{ fontSize: 11, color: isReady ? '#22c55e' : '#ef4444', fontWeight: 500 }}>{node.status}</span>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 9999, fontWeight: 500, width: 'fit-content', background: isControl ? (isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE') : (isDark ? t.cardBorder : '#F3F4F6'), color: isControl ? '#3b82f6' : t.textSub }}>
                    {isControl ? 'control-plane' : 'worker'}
                  </span>
                  <NodeBar pct={node.cpu}    color="#8b5cf6" />
                  <NodeBar pct={node.memory} color="#3b82f6" />
                  <span style={{ fontSize: 11, textAlign: 'center', color: t.textSub, ...mono }}>{node.pods}</span>
                  <span style={{ fontSize: 10, color: t.textMuted, ...mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.version}</span>
                </div>
              );
            })}
        </div>
      </main>

      {rdw && (
        <ResourceDetailWindow
          resources={rdw.resources}
          activeId={rdw.activeId}
          onActiveChange={id => setRdw(prev => prev ? { ...prev, activeId: id } : null)}
          onCloseTab={closeRdwTab}
          onClose={() => setRdw(null)}
          forceRestore={rdw.forceRestore}
        />
      )}
    </div>
  );
}
