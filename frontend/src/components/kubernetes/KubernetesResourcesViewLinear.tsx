import { useState, useEffect } from 'react';
import { Skeleton, SkeletonRow } from '../common/Skeleton';
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import K8sHeader from './K8sHeader';
import { useNamespace } from '../../contexts/NamespaceContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

type ResourceType = 'deployments' | 'pods' | 'services' | 'ingress' | 'configmaps' | 'secrets';

interface Tab {
  id: ResourceType;
  label: string;
  count: number;
}

export default function KubernetesResourcesViewLinear() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const { selectedNamespace } = useNamespace();
  const [activeTab, setActiveTab] = useState<ResourceType>('deployments');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Data state
  const [deployments, setDeployments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [ingresses, setIngresses] = useState<any[]>([]);
  const [configmaps, setConfigmaps] = useState<any[]>([]);
  const [secrets, setSecrets] = useState<any[]>([]);
  const [pods, setPods] = useState<any[]>([]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'deployments') {
        const res = await kubernetesApi.getDeployments().catch(() => ({ data: [] }));
        setDeployments(res.data);
      }
      if (activeTab === 'pods') {
        const res = await kubernetesApi.getPods().catch(() => ({ data: [] }));
        setPods(res.data);
      }
      if (activeTab === 'services') {
        const res = await kubernetesApi.getServices().catch(() => ({ data: [] }));
        setServices(res.data);
      }
      if (activeTab === 'ingress') {
        const res = await kubernetesApi.getIngresses().catch(() => ({ data: [] }));
        setIngresses(res.data);
      }
      if (activeTab === 'configmaps') {
        const res = await kubernetesApi.getConfigMaps().catch(() => ({ data: [] }));
        setConfigmaps(res.data);
      }
      if (activeTab === 'secrets') {
        const res = await kubernetesApi.getSecrets().catch(() => ({ data: [] }));
        setSecrets(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch resources', error);
    } finally {
      setLoading(false);
    }
  }

  const tabs: Tab[] = [
    { id: 'deployments', label: 'Deployments', count: deployments.length },
    { id: 'pods', label: 'Pods', count: pods.length },
    { id: 'services', label: 'Services', count: services.length },
    { id: 'ingress', label: 'Ingress', count: ingresses.length },
    { id: 'configmaps', label: 'ConfigMaps', count: configmaps.length },
    { id: 'secrets', label: 'Secrets', count: secrets.length },
  ];

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'healthy' || s === 'running' || s === 'ready') return '#22c55e';
    if (s === 'warning' || s === 'pending') return '#eab308';
    if (s === 'critical' || s === 'crashloopbackoff' || s === 'error' || s === 'failed') return '#ef4444';
    if (s === 'progressing') return '#3b82f6';
    return '#71717a';
  };

  const filterItems = <T extends { name: string; namespace?: string }>(items: T[]) => {
    return items.filter(item => {
      const matchesNamespace = !selectedNamespace || item.namespace === selectedNamespace;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesNamespace && matchesSearch;
    });
  };

  const getDeploymentStatus = (d: any): 'Healthy' | 'Degraded' | 'Progressing' => {
    if (d.replicas_ready === d.replicas_desired && d.replicas_desired > 0) return 'Healthy';
    if (d.replicas_ready === 0) return 'Degraded';
    return 'Progressing';
  };

  const renderDeployments = () => {
    const filtered = filterItems(deployments);
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 80px 60px 100px', gap: 12, paddingBottom: 8, borderBottom: `1px solid ${t.cardBorder}`, fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>
          {['NAME', 'NAMESPACE', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE', 'STATUS'].map(h => (
            <div key={h}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            No deployments found
          </div>
        ) : (
          filtered.map((d, i) => {
            const status = getDeploymentStatus(d);
            return (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 80px 80px 80px 60px 100px',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                  fontSize: 11,
                  color: t.text,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: getStatusColor(status), boxShadow: status === 'Degraded' ? '0 0 6px #ef4444' : 'none' }} />
                  <span style={{ ...mono, fontSize: 12 }}>{d.name}</span>
                </div>
                <span>{d.namespace}</span>
                <span style={{ ...mono, color: d.replicas_ready === 0 ? '#ef4444' : t.textSub }}>
                  {d.replicas_ready}/{d.replicas_desired}
                </span>
                <span style={{ ...mono, color: t.textSub }}>{d.replicas_ready}</span>
                <span style={{ ...mono, color: d.replicas_ready === 0 ? '#ef4444' : t.textSub }}>{d.replicas_ready}</span>
                <span style={{ color: t.textSub }}>{d.created_at}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: getStatusColor(status) }} />
                  <span>{status}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderPods = () => {
    const filtered = filterItems(pods);
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 100px 70px 60px 100px', gap: 12, paddingBottom: 8, borderBottom: `1px solid ${t.cardBorder}`, fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>
          {['NAME', 'NAMESPACE', 'STATUS', 'RESTARTS', 'AGE', 'NODE'].map(h => (
            <div key={h}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            No pods found
          </div>
        ) : (
          filtered.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 100px 70px 60px 100px',
                gap: 12,
                padding: '10px 0',
                borderBottom: i < filtered.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                fontSize: 11,
                color: t.text,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: getStatusColor(p.status), boxShadow: p.status === 'CrashLoopBackOff' ? '0 0 6px #ef4444' : 'none' }} />
                <span style={{ ...mono, fontSize: 12 }}>{p.name}</span>
              </div>
              <span>{p.namespace}</span>
              <span style={{ color: getStatusColor(p.status) }}>{p.status}</span>
              <span style={{ ...mono, color: p.restarts > 10 ? '#ef4444' : t.textSub }}>{p.restarts || 0}</span>
              <span style={{ color: t.textSub }}>{p.created_at}</span>
              <span style={{ color: t.textSub }}>{p.node_name || '-'}</span>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderServices = () => {
    const filtered = filterItems(services);
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 120px 120px 2fr', gap: 12, paddingBottom: 8, borderBottom: `1px solid ${t.cardBorder}`, fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>
          {['NAME', 'NAMESPACE', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORTS'].map(h => (
            <div key={h}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            No services found
          </div>
        ) : (
          filtered.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 120px 120px 2fr', gap: 12, padding: '10px 0', borderBottom: i < filtered.length - 1 ? `1px solid ${t.cardBorder}` : 'none', fontSize: 11, color: t.text, transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ ...mono, fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              <span style={{ fontSize: 13, color: t.textSub }}>{s.namespace}</span>
              <span style={{ fontSize: 12, color: s.type === 'LoadBalancer' ? '#3b82f6' : t.textMuted }}>{s.type}</span>
              <span style={{ ...mono, fontSize: 12, color: t.textSub }}>{s.cluster_ip || '-'}</span>
              <span style={{ ...mono, fontSize: 12, color: s.external_ip ? '#22c55e' : t.textMuted }}>{s.external_ip || '—'}</span>
              <span style={{ ...mono, fontSize: 11, color: t.textSub }}>{s.ports?.join(', ') || '-'}</span>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderIngress = () => {
    const filtered = filterItems(ingresses);
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 2fr 120px 60px', gap: 12, paddingBottom: 8, borderBottom: `1px solid ${t.cardBorder}`, fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>
          {['NAME', 'NAMESPACE', 'CLASS', 'HOSTS', 'ADDRESS', 'AGE'].map(h => (
            <div key={h}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            No ingress resources found
          </div>
        ) : (
          filtered.map((ing, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 2fr 120px 60px', gap: 12, padding: '10px 0', borderBottom: i < filtered.length - 1 ? `1px solid ${t.cardBorder}` : 'none', fontSize: 11, color: t.text, transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ ...mono, fontSize: 13, fontWeight: 500 }}>{ing.name}</span>
              <span style={{ fontSize: 13, color: t.textSub }}>{ing.namespace}</span>
              <span style={{ fontSize: 12, color: t.textMuted }}>{ing.class_name || '-'}</span>
              <span style={{ ...mono, fontSize: 12, color: '#3b82f6' }}>{ing.hosts?.join(', ') || '-'}</span>
              <span style={{ ...mono, fontSize: 12, color: t.textSub }}>{ing.load_balancer_ip || '-'}</span>
              <span style={{ fontSize: 12, color: t.textSub }}>{ing.created_at}</span>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderConfigMaps = () => {
    const filtered = filterItems(configmaps);
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px', gap: 12, paddingBottom: 8, borderBottom: `1px solid ${t.cardBorder}`, fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>
          {['NAME', 'NAMESPACE', 'DATA', 'AGE'].map(h => (
            <div key={h}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            No configmaps found
          </div>
        ) : (
          filtered.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px', gap: 12, padding: '10px 0', borderBottom: i < filtered.length - 1 ? `1px solid ${t.cardBorder}` : 'none', fontSize: 11, color: t.text, transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ ...mono, fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              <span style={{ fontSize: 13, color: t.textSub }}>{c.namespace}</span>
              <span style={{ ...mono, fontSize: 13, color: t.textMuted }}>{c.data ? Object.keys(c.data).length : 0}</span>
              <span style={{ fontSize: 12, color: t.textSub }}>{c.created_at}</span>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderSecrets = () => {
    const filtered = filterItems(secrets);
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 80px 80px', gap: 12, paddingBottom: 8, borderBottom: `1px solid ${t.cardBorder}`, fontSize: 10, fontWeight: 500, color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>
          {['NAME', 'NAMESPACE', 'TYPE', 'DATA', 'AGE'].map(h => (
            <div key={h}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
            No secrets found
          </div>
        ) : (
          filtered.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 80px 80px', gap: 12, padding: '10px 0', borderBottom: i < filtered.length - 1 ? `1px solid ${t.cardBorder}` : 'none', fontSize: 11, color: t.text, transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ ...mono, fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              <span style={{ fontSize: 13, color: t.textSub }}>{s.namespace}</span>
              <span style={{ fontSize: 12, color: t.textMuted }}>{s.type || 'Opaque'}</span>
              <span style={{ ...mono, fontSize: 13, color: t.textMuted }}>{s.data ? Object.keys(s.data).length : 0}</span>
              <span style={{ fontSize: 12, color: t.textSub }}>{s.created_at}</span>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'deployments': return renderDeployments();
      case 'pods': return renderPods();
      case 'services': return renderServices();
      case 'ingress': return renderIngress();
      case 'configmaps': return renderConfigMaps();
      case 'secrets': return renderSecrets();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', background: t.mainBg, overflow: 'hidden' }}>
        {/* Header skeleton */}
        <div style={{ padding: '16px 32px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Skeleton width={180} height={14} style={{ marginBottom: 6 }} />
            <Skeleton width={220} height={9} />
          </div>
          <Skeleton width={120} height={26} radius={8} />
        </div>
        {/* Tab bar skeleton */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
          {[80, 70, 60, 75, 90, 65].map((w, i) => (
            <Skeleton key={i} width={w} height={24} radius={6} />
          ))}
        </div>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ padding: '10px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', gap: 12 }}>
              {['30%', '15%', '12%', '10%', '12%', '10%'].map((w, i) => (
                <Skeleton key={i} width={w} height={9} />
              ))}
            </div>
            {[...Array(8)].map((_, i) => (
              <SkeletonRow key={i} cols={['30%', '15%', '12%', '10%', '12%', '10%']} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', color: t.text, overflow: 'hidden' }}>
      {/* K8s Header */}
      <K8sHeader
        title="Kubernetes Resources"
        subtitle="Cluster resources and workloads"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: t.textSub }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ flexShrink: 0, padding: '0 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #60a5fa' : '2px solid transparent',
                padding: '12px 0',
                marginBottom: -1,
                color: activeTab === tab.id ? t.text : t.textSub,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                letterSpacing: 0.2,
              }}
            >
              {tab.label}
              <span style={{ ...mono, fontSize: 10, color: t.textMuted }}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        {renderContent()}
      </main>
    </div>
  );
}
