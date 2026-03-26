import { useState, useEffect } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, ServerStackIcon, CubeIcon, PlayIcon, ClockIcon, CircleStackIcon, TrashIcon, BellAlertIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import ResourceDetailWindow from './ResourceDetailWindow';
import type { RDWTab, RDWResource } from './ResourceDetailWindow';
import { kubernetesApi } from '../../services/api';
import type { Deployment, StatefulSet, DaemonSet, Job, Pod, CronJob } from '../../types';
import K8sHeader from './K8sHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';
import { useNamespace } from '../../contexts/NamespaceContext';


type WorkloadType = 'deployments' | 'pods' | 'statefulsets' | 'daemonsets' | 'jobs' | 'cronjobs';

const TABS = [
  { id: 'deployments' as WorkloadType, name: 'Deployments', icon: ServerStackIcon },
  { id: 'pods' as WorkloadType, name: 'Pods', icon: CubeIcon },
  { id: 'statefulsets' as WorkloadType, name: 'StatefulSets', icon: CircleStackIcon },
  { id: 'daemonsets' as WorkloadType, name: 'DaemonSets', icon: ServerStackIcon },
  { id: 'jobs' as WorkloadType, name: 'Jobs', icon: PlayIcon },
  { id: 'cronjobs' as WorkloadType, name: 'CronJobs', icon: ClockIcon },
];

const STATUS_LABELS: Record<string, string> = {
  crashloopbackoff: 'CrashLoop',
  containercreating: 'Creating',
  imagepullbackoff: 'ImgPullErr',
  errimagepull: 'ImgPullErr',
  podscheduled: 'Scheduled',
  terminating: 'Terminating',
};

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const label = STATUS_LABELS[s] ?? status;
  let color = '#9ca3af';
  let bg = 'rgba(156,163,175,0.12)';
  let glow = 'none';

  if (s === 'healthy' || s === 'running' || s === 'complete' || s === 'succeeded') {
    color = '#22c55e'; bg = 'rgba(34,197,94,0.1)'; glow = '0 0 6px rgba(34,197,94,0.3)';
  } else if (s === 'degraded' || s === 'failed' || s === 'crashloopbackoff' || s === 'error') {
    color = '#ef4444'; bg = 'rgba(239,68,68,0.1)'; glow = '0 0 6px rgba(239,68,68,0.3)';
  } else if (s === 'progressing' || s === 'pending' || s === 'waiting' || s === 'containercreating') {
    color = '#eab308'; bg = 'rgba(234,179,8,0.1)';
  } else if (s === 'active') {
    color = '#3b82f6'; bg = 'rgba(59,130,246,0.1)';
  } else if (s === 'suspended') {
    color = '#8b5cf6'; bg = 'rgba(139,92,246,0.1)';
  } else if (s === 'imagepullbackoff' || s === 'errimagepull') {
    color = '#f97316'; bg = 'rgba(249,115,22,0.1)';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 500,
      color,
      background: bg,
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, boxShadow: glow, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function ReadyPill({ ready, total }: { ready: number; total: number }) {
  const allReady = ready === total && total > 0;
  const noneReady = ready === 0;
  const color = allReady ? '#22c55e' : noneReady ? '#ef4444' : '#eab308';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ ...mono, fontSize: 11, color }}>{ready}/{total}</span>
    </span>
  );
}

function ImageCell({ image }: { image?: string }) {
  if (!image || image === '-') return <span style={{ color: '#6b7280', fontSize: 11 }}>—</span>;
  const parts = image.split('/');
  const nameTag = parts[parts.length - 1];
  const [imgName, tag] = nameTag.split(':');
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
      <span style={{ ...mono, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imgName}</span>
      {tag && <span style={{ ...mono, fontSize: 9, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>{tag}</span>}
    </span>
  );
}



export default function WorkloadsPage() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const { selectedNamespace } = useNamespace();
  const [activeTab, setActiveTab] = useState<WorkloadType>('deployments');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [statefulsets, setStatefulsets] = useState<StatefulSet[]>([]);
  const [daemonsets, setDaemonsets] = useState<DaemonSet[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cronjobs, setCronjobs] = useState<CronJob[]>([]);

  // Resource detail window (non-pod resources) — multi-tab model
  const [rdw, setRdw] = useState<{ resources: RDWResource[]; activeId: string; forceRestore: number } | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ kind: string; name: string; namespace: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWorkloads();
  }, [activeTab]);

  async function fetchWorkloads() {
    setLoading(true);
    try {
      if (activeTab === 'deployments') {
        const res = await kubernetesApi.getDeployments();
        setDeployments(res.data);
      } else if (activeTab === 'pods') {
        const res = await kubernetesApi.getPods();
        setPods(res.data);
      } else if (activeTab === 'statefulsets') {
        const res = await kubernetesApi.getStatefulSets();
        setStatefulsets(res.data);
      } else if (activeTab === 'daemonsets') {
        const res = await kubernetesApi.getDaemonSets();
        setDaemonsets(res.data);
      } else if (activeTab === 'jobs') {
        const res = await kubernetesApi.getJobs();
        setJobs(res.data);
      } else if (activeTab === 'cronjobs') {
        const res = await kubernetesApi.getCronJobs();
        setCronjobs(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch workloads', error);
    } finally {
      setLoading(false);
    }
  }

  function getReplicaStatus(ready: number, desired: number): string {
    if (ready === desired && desired > 0) return 'Healthy';
    if (ready === 0) return 'Degraded';
    return 'Progressing';
  }

  function nsFilter<T extends { namespace?: string }>(items: T[]): T[] {
    return items.filter(item => {
      const matchNs = !selectedNamespace || item.namespace === selectedNamespace;
      const matchSearch = !searchQuery || (item as any).name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchNs && matchSearch;
    });
  }

  const tabCounts = {
    deployments: deployments.length,
    pods: pods.length,
    statefulsets: statefulsets.length,
    daemonsets: daemonsets.length,
    jobs: jobs.length,
    cronjobs: cronjobs.length,
  };

  const kindMap: Record<WorkloadType, string> = {
    deployments: 'Deployment',
    pods: 'Pod',
    statefulsets: 'StatefulSet',
    daemonsets: 'DaemonSet',
    jobs: 'Job',
    cronjobs: 'CronJob',
  };
  const deletableKinds = new Set(['Deployment', 'StatefulSet', 'DaemonSet', 'Job']);

  function openDetailWindow(kind: string, name: string, namespace: string, initialTab: RDWTab = 'info', resourceObj?: any) {
    const id = `${kind}/${namespace || '_'}/${name}`;
    setRdw(prev => {
      if (!prev) return { resources: [{ id, kind, name, namespace, resourceObj, initialTab }], activeId: id, forceRestore: 0 };
      if (prev.resources.some(r => r.id === id)) return { ...prev, activeId: id, forceRestore: prev.forceRestore + 1 };
      return { ...prev, resources: [...prev.resources, { id, kind, name, namespace, resourceObj, initialTab }], activeId: id, forceRestore: prev.forceRestore + 1 };
    });
  }

  function closeRdwTab(id: string) {
    setRdw(prev => {
      if (!prev) return null;
      const resources = prev.resources.filter(r => r.id !== id);
      if (!resources.length) return null;
      return { ...prev, resources, activeId: prev.activeId === id ? resources[resources.length - 1].id : prev.activeId };
    });
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const { kind, name, namespace } = deleteConfirm;
    try {
      if (kind === 'Deployment') await kubernetesApi.deleteDeployment(namespace, name);
      else if (kind === 'StatefulSet') await kubernetesApi.deleteStatefulSet(namespace, name);
      else if (kind === 'DaemonSet') await kubernetesApi.deleteDaemonSet(namespace, name);
      else if (kind === 'Job') await kubernetesApi.deleteJob(namespace, name);
      setDeleteConfirm(null);
      fetchWorkloads();
    } catch (e) {
      console.error('Delete failed', e);
    } finally {
      setDeleting(false);
    }
  }

  const isDark = theme === 'dark';

  const card: React.CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
    // no overflow:hidden — it breaks position:sticky on the header row
  };

  // Column header — plain case, light weight (matches reference screenshot)
  const colHdr: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 400,
    color: t.textMuted,
    letterSpacing: 0,
  };

  const rowStyle = (i: number, total: number): React.CSSProperties => ({
    padding: '11px 18px',
    borderBottom: i < total - 1 ? `1px solid ${t.cardBorder}` : 'none',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.1s',
  });

  // Inter font for names — NOT mono
  const nameCell = (name: string) => (
    <span style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{name}</span>
  );

  const nsCell = (ns?: string) => (
    <span style={{ fontSize: 12, color: t.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{ns || '—'}</span>
  );

  const ageCell = (age?: string) => (
    <span style={{ ...mono, fontSize: 11, color: t.textMuted }}>{age || '—'}</span>
  );

  const tableHeader = (cols: string, labels: string[]) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 12,
      padding: '9px 18px',
      borderBottom: `1px solid ${t.cardBorder}`,
      background: t.cardBg,
      borderRadius: '12px 12px 0 0',
      flexShrink: 0,
    }}>
      {labels.map(l => <span key={l} style={colHdr}>{l}</span>)}
    </div>
  );

  const tableBody = (children: React.ReactNode) => (
    <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
      {children}
    </div>
  );

  const empty = (label: string) => (
    <div style={{ padding: '56px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
      No {label} found{selectedNamespace ? ` in "${selectedNamespace}"` : ''}
    </div>
  );

  const iconBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 5px',
    borderRadius: 6,
    color: t.textMuted,
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'background 0.12s, color 0.12s',
  };

  const ib = (title: string, onClick: (e: React.MouseEvent) => void, icon: React.ReactNode, hoverColor?: string) => (
    <button
      title={title}
      onClick={onClick}
      style={iconBtn}
      onMouseEnter={e => { e.currentTarget.style.background = hoverColor ? `rgba(${hoverColor},0.08)` : t.navHoverBg; e.currentTarget.style.color = hoverColor ? `rgb(${hoverColor})` : t.text; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
    >
      {icon}
    </button>
  );

  const actionBtns = (name: string, namespace: string, resourceObj?: any) => {
    const kind = kindMap[activeTab];
    const canDelete = deletableKinds.has(kind);
    const s = { width: 14, height: 14 };
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
        {ib('View Manifest', e => { e.stopPropagation(); openDetailWindow(kind, name, namespace, 'manifest', resourceObj); }, <DocumentTextIcon style={s} />)}
        {ib('Events', e => { e.stopPropagation(); openDetailWindow(kind, name, namespace, 'events', resourceObj); }, <BellAlertIcon style={s} />)}
        {canDelete && ib('Delete', e => { e.stopPropagation(); setDeleteConfirm({ kind, name, namespace }); }, <TrashIcon style={s} />, '239,68,68')}
      </div>
    );
  };

  const row = (cols: string, i: number, total: number, cells: React.ReactNode, onClick?: () => void) => (
    <div
      onClick={onClick}
      style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, ...rowStyle(i, total), cursor: onClick ? 'pointer' : 'default' }}
    >
      {cells}
    </div>
  );

  // ── Deployments ─────────────────────────────────────────────────────────────
  const renderDeployments = () => {
    const cols = 'minmax(0,2fr) minmax(0,1fr) 80px minmax(0,1.8fr) 65px 85px 80px';
    const items = nsFilter(deployments);
    return (
      <div style={card}>
        {tableHeader(cols, ['Name', 'Namespace', 'Ready', 'Image', 'Age', 'Status', ''])}
        {tableBody(items.length === 0 ? empty('deployments') : items.map((d, i) =>
          row(cols, i, items.length, <>
            {nameCell(d.name)}
            {nsCell(d.namespace)}
            <ReadyPill ready={d.ready_replicas ?? 0} total={d.replicas ?? 0} />
            <ImageCell image={d.image} />
            {ageCell(d.age)}
            <StatusBadge status={getReplicaStatus(d.ready_replicas ?? 0, d.replicas ?? 0)} />
            {actionBtns(d.name, d.namespace || '', d)}
          </>, () => openDetailWindow('Deployment', d.name, d.namespace || '', 'info', d))
        ))}
      </div>
    );
  };

  // ── Pods ─────────────────────────────────────────────────────────────────────
  const renderPods = () => {
    const cols = 'minmax(0,2.5fr) minmax(0,1fr) 95px 65px minmax(0,1.2fr) 65px';
    const items = nsFilter(pods);
    return (
      <div style={card}>
        {tableHeader(cols, ['Name', 'Namespace', 'Status', 'Restarts', 'Node', 'Age'])}
        {tableBody(items.length === 0 ? empty('pods') : items.map((p, i) => {
          const restartHigh = (p.restarts || 0) > 10;
          const podStatus = p.status === 'Running' && p.ready ? 'Healthy' : p.status === 'Failed' ? 'Degraded' : p.status || 'Unknown';
          return (
            <div
              key={p.name}
              onClick={() => openDetailWindow('Pod', p.name, p.namespace || '', 'logs', p)}
              style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, ...rowStyle(i, items.length), cursor: 'pointer' }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{p.name}</span>
                {p.ip && <span style={{ fontSize: 10, color: t.textMuted, ...mono }}>{p.ip}</span>}
              </div>
              {nsCell(p.namespace)}
              <StatusBadge status={podStatus} />
              <span style={{ ...mono, fontSize: 12, color: restartHigh ? '#ef4444' : t.textSub, fontWeight: restartHigh ? 600 : 400 }}>{p.restarts ?? 0}</span>
              <span style={{ fontSize: 12, color: t.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.node || '—'}</span>
              {ageCell(p.age)}
            </div>
          );
        }))}
      </div>
    );
  };

  // ── StatefulSets ─────────────────────────────────────────────────────────────
  const renderStatefulSets = () => {
    const cols = 'minmax(0,2fr) minmax(0,1fr) 80px minmax(0,1.8fr) 65px 85px 80px';
    const items = nsFilter(statefulsets);
    return (
      <div style={card}>
        {tableHeader(cols, ['Name', 'Namespace', 'Ready', 'Image', 'Age', 'Status', ''])}
        {tableBody(items.length === 0 ? empty('statefulsets') : items.map((s, i) =>
          row(cols, i, items.length, <>
            {nameCell(s.name)}
            {nsCell(s.namespace)}
            <ReadyPill ready={s.ready_replicas ?? 0} total={s.replicas ?? 0} />
            <ImageCell image={s.image} />
            {ageCell(s.age)}
            <StatusBadge status={getReplicaStatus(s.ready_replicas ?? 0, s.replicas ?? 0)} />
            {actionBtns(s.name, s.namespace || '', s)}
          </>, () => openDetailWindow('StatefulSet', s.name, s.namespace || '', 'info', s))
        ))}
      </div>
    );
  };

  // ── DaemonSets ───────────────────────────────────────────────────────────────
  const renderDaemonSets = () => {
    const cols = 'minmax(0,2fr) minmax(0,1fr) 80px 65px minmax(0,1.8fr) 65px 85px 80px';
    const items = nsFilter(daemonsets);
    return (
      <div style={card}>
        {tableHeader(cols, ['Name', 'Namespace', 'Ready', 'Desired', 'Image', 'Age', 'Status', ''])}
        {tableBody(items.length === 0 ? empty('daemonsets') : items.map((d, i) =>
          row(cols, i, items.length, <>
            {nameCell(d.name)}
            {nsCell(d.namespace)}
            <ReadyPill ready={d.ready ?? 0} total={d.desired ?? 0} />
            <span style={{ ...mono, fontSize: 12, color: t.textSub }}>{d.desired ?? 0}</span>
            <ImageCell image={d.image} />
            {ageCell(d.age)}
            <StatusBadge status={getReplicaStatus(d.ready ?? 0, d.desired ?? 0)} />
            {actionBtns(d.name, d.namespace || '', d)}
          </>, () => openDetailWindow('DaemonSet', d.name, d.namespace || '', 'info', d))
        ))}
      </div>
    );
  };

  // ── Jobs ─────────────────────────────────────────────────────────────────────
  const renderJobs = () => {
    const cols = 'minmax(0,2fr) minmax(0,1fr) 100px 90px 65px 85px 80px';
    const items = nsFilter(jobs);
    return (
      <div style={card}>
        {tableHeader(cols, ['Name', 'Namespace', 'Completions', 'Duration', 'Age', 'Status', ''])}
        {tableBody(items.length === 0 ? empty('jobs') : items.map((j, i) => {
          const jobStatus = j.completions && j.succeeded >= j.completions ? 'Complete' : j.failed > 0 ? 'Degraded' : 'Progressing';
          return row(cols, i, items.length, <>
            {nameCell(j.name)}
            {nsCell(j.namespace)}
            <span style={{ ...mono, fontSize: 12, color: t.textSub }}>{j.completions ? `${j.succeeded}/${j.completions}` : `${j.succeeded ?? 0}`}</span>
            <span style={{ fontSize: 12, color: t.textSub }}>{j.duration || '—'}</span>
            {ageCell(j.age)}
            <StatusBadge status={jobStatus} />
            {actionBtns(j.name, j.namespace || '', j)}
          </>, () => openDetailWindow('Job', j.name, j.namespace || '', 'info', j));
        }))}
      </div>
    );
  };

  // ── CronJobs ─────────────────────────────────────────────────────────────────
  const renderCronJobs = () => {
    const cols = 'minmax(0,2fr) minmax(0,1fr) 150px 75px 110px 70px 60px';
    const items = nsFilter(cronjobs);
    return (
      <div style={card}>
        {tableHeader(cols, ['Name', 'Namespace', 'Schedule', 'Active', 'Last Run', 'Age', ''])}
        {tableBody(items.length === 0 ? empty('cronjobs') : items.map((c, i) =>
          row(cols, i, items.length, <>
            {nameCell(c.name)}
            {nsCell(c.namespace)}
            <span style={{ ...mono, fontSize: 12, color: t.info }}>{c.schedule || '—'}</span>
            <span style={{ ...mono, fontSize: 12, color: t.textSub }}>{(c as any).active ?? 0}</span>
            <span style={{ fontSize: 12, color: t.textSub }}>{(c as any).last_schedule || '—'}</span>
            {ageCell(c.age)}
            {actionBtns(c.name, c.namespace || '', c)}
          </>, () => openDetailWindow('CronJob', c.name, c.namespace || '', 'info', c))
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'deployments': return renderDeployments();
      case 'pods': return renderPods();
      case 'statefulsets': return renderStatefulSets();
      case 'daemonsets': return renderDaemonSets();
      case 'jobs': return renderJobs();
      case 'cronjobs': return renderCronJobs();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, overflow: 'hidden' }}>
      {/* K8s Header */}
      <K8sHeader
        title="Workloads"
        subtitle="Deployments, Pods, StatefulSets, DaemonSets, Jobs, CronJobs"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: t.textSub }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${t.sidebarBorder}`,
                  paddingLeft: 24,
                  paddingRight: 4,
                  paddingTop: 2,
                  paddingBottom: 2,
                  fontSize: 12,
                  color: t.text,
                  outline: 'none',
                  width: 200,
                  letterSpacing: 0.2,
                }}
              />
            </div>
            <button
              onClick={fetchWorkloads}
              disabled={loading}
              style={{
              background: 'none',
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 6,
              padding: '5px 8px',
              cursor: loading ? 'wait' : 'pointer',
              color: t.textSub,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
            }}
            >
              <ArrowPathIcon style={{ width: 12, height: 12 }} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ flexShrink: 0, padding: '0 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {TABS.map(tab => {
            const count = tabCounts[tab.id];
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? `2px solid ${t.info}` : '2px solid transparent',
                  padding: '12px 0',
                  marginBottom: -1,
                  color: active ? t.text : t.textSub,
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  letterSpacing: 0.2,
                  whiteSpace: 'nowrap',
                }}
              >
                <tab.icon style={{ width: 13, height: 13 }} />
                {tab.name}
                {count > 0 && (
                  <span style={{
                    ...mono,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: active ? t.infoBg : t.cardBorder,
                    color: active ? t.info : t.textMuted,
                    fontWeight: 500,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px', position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, #3b82f6, transparent)`,
            animation: 'slideProgress 1s ease-in-out infinite',
          }} />
        )}
        <style>{`@keyframes slideProgress { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
        {renderContent()}
      </main>

      {/* ── Resource Detail Window ────────────────────────────────────────────── */}
      {rdw && (
        <ResourceDetailWindow
          resources={rdw.resources}
          activeId={rdw.activeId}
          onActiveChange={id => setRdw(prev => prev ? { ...prev, activeId: id } : null)}
          onCloseTab={closeRdwTab}
          onClose={() => setRdw(null)}
          forceRestore={rdw.forceRestore}
          onOpenPod={pod => openDetailWindow('Pod', pod.name, pod.namespace || '', 'logs', pod)}
        />
      )}


      {/* ── Delete confirmation ────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <>
          <div
            onClick={() => setDeleteConfirm(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 380, background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderRadius: 14, padding: 24, zIndex: 70,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 8 }}>
              Delete {deleteConfirm.kind}?
            </div>
            <div style={{ fontSize: 12, color: t.textSub, marginBottom: 20, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 500, color: t.text }}>{deleteConfirm.name}</span> in{' '}
              <span style={{ ...mono, fontSize: 11 }}>{deleteConfirm.namespace}</span> will be permanently deleted. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ background: 'transparent', border: `1px solid ${t.cardBorder}`, borderRadius: 7, padding: '6px 16px', fontSize: 12, color: t.textSub, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: '#ef4444', border: 'none', borderRadius: 7, padding: '6px 16px', fontSize: 12, color: '#fff', cursor: deleting ? 'wait' : 'pointer', fontWeight: 500 }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
