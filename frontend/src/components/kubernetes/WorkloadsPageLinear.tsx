import { useState, useEffect } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, ServerStackIcon, CubeIcon, PlayIcon } from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import { MetricCard, DataTable, SectionHeader, StatusDot } from '../shared';
import type { Deployment, StatefulSet, DaemonSet, Job } from '../../types';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

type WorkloadType = 'deployments' | 'statefulsets' | 'daemonsets' | 'jobs';

const tabs = [
  { id: 'deployments' as WorkloadType, name: 'Deployments', icon: ServerStackIcon },
  { id: 'statefulsets' as WorkloadType, name: 'StatefulSets', icon: CubeIcon },
  { id: 'daemonsets' as WorkloadType, name: 'DaemonSets', icon: ServerStackIcon },
  { id: 'jobs' as WorkloadType, name: 'Jobs', icon: PlayIcon },
];

export default function WorkloadsPage() {
  const [activeTab, setActiveTab] = useState<WorkloadType>('deployments');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [statefulsets, setStatefulsets] = useState<StatefulSet[]>([]);
  const [daemonsets, setDaemonsets] = useState<DaemonSet[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetchWorkloads();
  }, [activeTab]);

  async function fetchWorkloads() {
    setLoading(true);
    try {
      if (activeTab === 'deployments') {
        const res = await kubernetesApi.getDeployments();
        setDeployments(res.data);
      } else if (activeTab === 'statefulsets') {
        const res = await kubernetesApi.getStatefulSets();
        setStatefulsets(res.data);
      } else if (activeTab === 'daemonsets') {
        const res = await kubernetesApi.getDaemonSets();
        setDaemonsets(res.data);
      } else if (activeTab === 'jobs') {
        const res = await kubernetesApi.getJobs();
        setJobs(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch workloads', error);
    } finally {
      setLoading(false);
    }
  }

  // Get current workload data
  const getCurrentData = () => {
    if (activeTab === 'deployments') {
      return deployments.map(d => ({
        name: d.name,
        namespace: d.namespace,
        ready: `${d.replicas_ready}/${d.replicas_desired}`,
        status: getStatus(d.replicas_ready, d.replicas_desired),
        age: d.created_at,
        image: d.image || '-',
      }));
    } else if (activeTab === 'statefulsets') {
      return statefulsets.map(s => ({
        name: s.name,
        namespace: s.namespace,
        ready: `${s.replicas_ready}/${s.replicas_desired}`,
        status: getStatus(s.replicas_ready, s.replicas_desired),
        age: s.created_at,
        image: '-',
      }));
    } else if (activeTab === 'daemonsets') {
      return daemonsets.map(d => ({
        name: d.name,
        namespace: d.namespace,
        ready: `${d.replicas_ready}/${d.replicas_desired}`,
        status: getStatus(d.replicas_ready, d.replicas_desired),
        age: d.created_at,
        image: '-',
      }));
    } else {
      return jobs.map(j => ({
        name: j.name,
        namespace: j.namespace,
        ready: `${j.succeeded}/${j.desired}`,
        status: j.succeeded >= j.desired ? 'Healthy' : 'Progressing',
        age: j.created_at,
        image: '-',
      }));
    }
  };

  function getStatus(ready: number, desired: number): 'Healthy' | 'Degraded' | 'Progressing' {
    if (ready === desired && desired > 0) return 'Healthy';
    if (ready === 0) return 'Degraded';
    return 'Progressing';
  }

  const data = getCurrentData().filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.namespace.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalCount = getCurrentData().length;
  const healthyCount = data.filter(d => d.status === 'Healthy').length;
  const degradedCount = data.filter(d => d.status === 'Degraded').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fafafa' }}>
      {/* Header */}
      <header style={{ padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: -0.5, marginBottom: 2 }}>
              Workloads
            </h1>
            <p style={{ color: '#525252', fontSize: 11, margin: 0 }}>
              Deployments, StatefulSets, DaemonSets, and Jobs
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#525252' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  paddingLeft: 24,
                  paddingRight: 4,
                  paddingTop: 2,
                  paddingBottom: 2,
                  fontSize: 12,
                  color: '#fafafa',
                  outline: 'none',
                  width: 200,
                }}
              />
            </div>

            <button
              onClick={fetchWorkloads}
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
        {/* Tabs */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  padding: '8px 0',
                  marginBottom: -1,
                  color: activeTab === tab.id ? '#fafafa' : '#525252',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <tab.icon style={{ width: 14, height: 14 }} />
                {tab.name}
              </button>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <MetricCard
              value={totalCount}
              label={`Total ${tabs.find(t => t.id === activeTab)?.name}`}
              color="#3b82f6"
            />
            <MetricCard
              value={healthyCount}
              label="Healthy"
              color="#22c55e"
            />
            <MetricCard
              value={degradedCount}
              label="Degraded"
              color="#ef4444"
            />
          </div>
        </section>

        {/* Workloads Table */}
        <section>
          <SectionHeader
            title={tabs.find(t => t.id === activeTab)?.name || 'Workloads'}
            subtitle={`${data.length} ${data.length === 1 ? 'resource' : 'resources'}`}
            size="sm"
          />

          <DataTable
            columns={[
              {
                label: 'Name',
                key: 'name',
                width: '2fr',
              },
              {
                label: 'Namespace',
                key: 'namespace',
                width: '1fr',
              },
              {
                label: 'Ready',
                key: 'ready',
                width: '100px',
                align: 'center',
              },
              {
                label: 'Status',
                key: 'status',
                width: '120px',
                render: (row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot
                      status={
                        row.status === 'Healthy' ? 'success' :
                        row.status === 'Degraded' ? 'error' : 'warning'
                      }
                      size={5}
                    />
                    <span style={{ fontSize: 11 }}>{row.status}</span>
                  </div>
                ),
              },
              {
                label: 'Age',
                key: 'age',
                width: '120px',
              },
            ]}
            data={data}
            onRowClick={(row) => console.log('Selected:', row.name)}
            hoverable
            emptyMessage={`No ${tabs.find(t => t.id === activeTab)?.name.toLowerCase()} found`}
          />
        </section>
      </main>
    </div>
  );
}
