import { useState, useEffect, useCallback } from 'react';
import ResourceDetailWindow, { type RDWResource } from '../kubernetes/ResourceDetailWindow';
import { useSearchParams } from 'react-router-dom';
import { kubernetesApi } from '../../services/api';
import { useNamespace } from '../../contexts/NamespaceContext';
import type { K8sService, Ingress } from '../../types';
import K8sHeader from '../kubernetes/K8sHeader';
import {
  ArrowPathIcon,
  GlobeAltIcon,
  ServerStackIcon,
  ArrowsRightLeftIcon,
  LinkIcon,
  CloudIcon,
  CubeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

type TabType = 'services' | 'ingresses' | 'topology';

interface NetworkStats {
  services: number;
  ingresses: number;
  loadBalancers: number;
  clusterIPs: number;
  nodePort: number;
}

function ServiceTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    ClusterIP: '#3b82f6',
    NodePort: '#8b5cf6',
    LoadBalancer: '#22c55e',
    ExternalName: '#f97316',
  };
  const color = colors[type] || colors.ClusterIP;
  return (
    <span style={{ padding: '4px 8px', fontSize: 10, fontWeight: 500, background: `${color}20`, color, borderRadius: 4 }}>
      {type}
    </span>
  );
}

// Services Table
function ServicesTable({
  services,
  loading,
  onDelete,
  onOpen,
  t,
}: {
  services: K8sService[];
  loading: boolean;
  onDelete: (namespace: string, name: string) => void;
  onOpen: (namespace: string, name: string, kind: string) => void;
  t: ReturnType<typeof getThemeColors>;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)' };

  if (loading) {
    return (
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <ArrowPathIcon style={{ width: 20, height: 20, color: t.textSub, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: 48, fontSize: 11, color: t.textSub }}>
        No services found
      </div>
    );
  }

  return (
    <div style={{ ...card }}>
      {/* Table Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1fr 1fr 100px', gap: 12, padding: '9px 18px', borderBottom: `1px solid ${t.cardBorder}` }}>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Name</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Namespace</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Type</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Cluster IP</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>External IP</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Ports</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, textAlign: 'right' }}>Actions</div>
      </div>

      {/* Table Rows */}
      {services.map((svc) => (
        <div
          key={`${svc.namespace}/${svc.name}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 0.8fr 1fr 1fr 1fr 100px',
            gap: 12,
            padding: '11px 18px',
            borderBottom: `1px solid ${t.cardBorder}`,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CubeIcon style={{ width: 14, height: 14, color: t.textSub }} />
            <button onClick={() => onOpen(svc.namespace, svc.name, 'Service')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, fontWeight: 500, color: t.text }} onMouseEnter={e => (e.currentTarget.style.color = t.info)} onMouseLeave={e => (e.currentTarget.style.color = t.text)}>{svc.name}</button>
          </div>
          <div style={{ fontSize: 11, color: t.textSub, ...mono }}>{svc.namespace}</div>
          <div>
            <ServiceTypeBadge type={svc.type} />
          </div>
          <div style={{ fontSize: 11, color: t.text, ...mono }}>{svc.cluster_ip || '-'}</div>
          <div style={{ fontSize: 11, color: svc.external_ip ? '#22c55e' : t.textSub, ...mono }}>{svc.external_ip || '-'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {svc.ports?.map((port: any, idx: number) => (
              <span key={idx} style={{ padding: '2px 6px', fontSize: 9, background: t.cardBorder, color: t.textSub, borderRadius: 4, ...mono }}>
                {port.port}/{port.protocol}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <button
              onClick={() => onDelete(svc.namespace, svc.name)}
              style={{ padding: 6, background: 'transparent', border: 'none', color: t.textSub, cursor: 'pointer', borderRadius: 4, transition: 'color 0.15s' }}
              title="Delete"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = t.textSub)}
            >
              <TrashIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Ingresses Table
function IngressesTable({
  ingresses,
  loading,
  onDelete,
  onOpen,
  t,
}: {
  ingresses: Ingress[];
  loading: boolean;
  onDelete: (namespace: string, name: string) => void;
  onOpen: (namespace: string, name: string, kind: string) => void;
  t: ReturnType<typeof getThemeColors>;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)' };

  if (loading) {
    return (
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <ArrowPathIcon style={{ width: 20, height: 20, color: t.textSub, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (ingresses.length === 0) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: 48, fontSize: 11, color: t.textSub }}>
        No ingresses found
      </div>
    );
  }

  return (
    <div style={{ ...card }}>
      {/* Table Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 1.5fr 1fr 80px 100px', gap: 12, padding: '9px 18px', borderBottom: `1px solid ${t.cardBorder}` }}>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Name</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Namespace</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Class</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Hosts</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted }}>Address</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, textAlign: 'center' }}>TLS</div>
        <div style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, textAlign: 'right' }}>Actions</div>
      </div>

      {/* Table Rows */}
      {ingresses.map((ing) => (
        <div
          key={`${ing.namespace}/${ing.name}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 0.8fr 1.5fr 1fr 80px 100px',
            gap: 12,
            padding: '11px 18px',
            borderBottom: `1px solid ${t.cardBorder}`,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlobeAltIcon style={{ width: 14, height: 14, color: t.textSub }} />
            <button onClick={() => onOpen(ing.namespace, ing.name, 'Ingress')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, fontWeight: 500, color: t.text }} onMouseEnter={e => (e.currentTarget.style.color = t.info)} onMouseLeave={e => (e.currentTarget.style.color = t.text)}>{ing.name}</button>
          </div>
          <div style={{ fontSize: 11, color: t.textSub, ...mono }}>{ing.namespace}</div>
          <div style={{ fontSize: 11, color: '#8b5cf6', ...mono }}>{ing.class_name || 'default'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ing.hosts?.map((host: string, idx: number) => (
              <a
                key={idx}
                href={`https://${host}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 9, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 4, textDecoration: 'none', ...mono }}
              >
                <LinkIcon style={{ width: 10, height: 10 }} />
                {host}
              </a>
            ))}
          </div>
          <div style={{ fontSize: 11, color: ing.address ? t.text : '#eab308', ...mono }}>
            {ing.address || 'Pending'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {ing.tls && ing.tls.length > 0 ? (
              <CheckCircleIcon style={{ width: 16, height: 16, color: '#22c55e' }} />
            ) : (
              <ExclamationCircleIcon style={{ width: 16, height: 16, color: '#eab308' }} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <button
              onClick={() => onDelete(ing.namespace, ing.name)}
              style={{ padding: 6, background: 'transparent', border: 'none', color: t.textSub, cursor: 'pointer', borderRadius: 4, transition: 'color 0.15s' }}
              title="Delete"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = t.textSub)}
            >
              <TrashIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Network Topology
function NetworkTopology({ services, ingresses, t }: { services: K8sService[]; ingresses: Ingress[]; t: ReturnType<typeof getThemeColors> }) {
  const lbServices = services.filter(s => s.type === 'LoadBalancer');

  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <ArrowsRightLeftIcon style={{ width: 16, height: 16, color: '#22c55e' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Network Topology</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {/* Internet */}
        <div style={{ padding: '12px 20px', background: '#3b82f6', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudIcon style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Internet</span>
        </div>

        <div style={{ width: 1, height: 32, background: t.sidebarBorder }} />

        {/* Ingresses */}
        {ingresses.length > 0 && (
          <>
            <div style={{ padding: '12px 20px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <GlobeAltIcon style={{ width: 18, height: 18 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Ingress Controller</div>
                <div style={{ fontSize: 10, color: t.textSub, ...mono }}>{ingresses.length} rules</div>
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: t.sidebarBorder }} />
          </>
        )}

        {/* Load Balancers */}
        {lbServices.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {lbServices.slice(0, 4).map((svc) => (
                <div key={svc.name} style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ServerStackIcon style={{ width: 14, height: 14 }} />
                  <span style={{ fontSize: 10, ...mono }}>{svc.name}</span>
                </div>
              ))}
              {lbServices.length > 4 && (
                <span style={{ fontSize: 10, color: t.textSub, alignSelf: 'center' }}>+{lbServices.length - 4} more</span>
              )}
            </div>
            <div style={{ width: 1, height: 32, background: t.sidebarBorder }} />
          </>
        )}

        {/* Services */}
        <div style={{ padding: '12px 20px', background: t.cardBorder, border: `1px solid ${t.cardBorder}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CubeIcon style={{ width: 18, height: 18, color: t.textSub }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>Cluster Services</div>
            <div style={{ fontSize: 10, color: t.textSub, ...mono }}>{services.length} services</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function NetworkingDashboard() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedNamespace } = useNamespace();

  const getInitialTab = (): TabType => {
    const tabParam = searchParams.get('tab');
    const validTabs: TabType[] = ['services', 'ingresses', 'topology'];
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      return tabParam as TabType;
    }
    return 'services';
  };

  const [services, setServices] = useState<K8sService[]>([]);
  const [ingresses, setIngresses] = useState<Ingress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [deleteModal, setDeleteModal] = useState<{ type: string; namespace: string; name: string } | null>(null);
  const [rdw, setRdw] = useState<{ resources: RDWResource[]; activeId: string; forceRestore: number } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTabs: TabType[] = ['services', 'ingresses', 'topology'];
    if (tabParam && validTabs.includes(tabParam as TabType) && tabParam !== activeTab) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    loadData();
  }, [selectedNamespace]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const ns = selectedNamespace || undefined;
      const [servicesRes, ingressesRes] = await Promise.all([
        kubernetesApi.getServices(ns),
        kubernetesApi.getIngresses(ns),
      ]);
      setServices(servicesRes.data || []);
      setIngresses(ingressesRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load networking data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      if (deleteModal.type === 'Service') {
        await kubernetesApi.deleteService(deleteModal.namespace, deleteModal.name);
      } else {
        await kubernetesApi.deleteIngress(deleteModal.namespace, deleteModal.name);
      }
      loadData();
      setDeleteModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openPanel = (namespace: string, name: string, kind: string, resourceObj?: any) => {
    const id = `${kind}/${namespace || '_'}/${name}`;
    setRdw(prev => {
      if (!prev) return { resources: [{ id, kind, name, namespace, resourceObj }], activeId: id, forceRestore: 0 };
      if (prev.resources.some(r => r.id === id)) return { ...prev, activeId: id, forceRestore: prev.forceRestore + 1 };
      return { ...prev, resources: [...prev.resources, { id, kind, name, namespace, resourceObj }], activeId: id, forceRestore: prev.forceRestore + 1 };
    });
  };

  const closeRdwTab = (id: string) => setRdw(prev => {
    if (!prev) return null;
    const resources = prev.resources.filter(r => r.id !== id);
    if (!resources.length) return null;
    return { ...prev, resources, activeId: prev.activeId === id ? resources[resources.length - 1].id : prev.activeId };
  });

  const stats: NetworkStats = {
    services: services.length,
    ingresses: ingresses.length,
    loadBalancers: services.filter((s) => s.type === 'LoadBalancer').length,
    clusterIPs: services.filter((s) => s.type === 'ClusterIP').length,
    nodePort: services.filter((s) => s.type === 'NodePort').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', color: t.text, overflow: 'hidden' }}>
      {/* K8s Header */}
      <K8sHeader
        title="Networking"
        subtitle="Services, Ingresses, and Network Topology"
        rightContent={
          <button
            onClick={loadData}
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

      {/* Tabs */}
      <div style={{ flexShrink: 0, padding: '0 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { id: 'services', label: 'Services', count: stats.services },
            { id: 'ingresses', label: 'Ingresses', count: stats.ingresses },
            { id: 'topology', label: 'Topology' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `2px solid ${t.info}` : '2px solid transparent',
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
              {tab.count !== undefined && (
                <span style={{ ...mono, fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: activeTab === tab.id ? t.infoBg : t.cardBorder, color: activeTab === tab.id ? t.info : t.textMuted, fontWeight: 500 }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px', position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${t.info}, transparent)`,
            animation: 'slideProgress 1s ease-in-out infinite',
          }} />
        )}
        <style>{`@keyframes slideProgress { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>

        {/* Error */}
        {error && (
          <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 11, marginBottom: 24 }}>
            {error}
            <button onClick={loadData} style={{ marginLeft: 12, textDecoration: 'underline', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {activeTab === 'services' && (
          <ServicesTable services={services} loading={loading} onDelete={(ns, name) => setDeleteModal({ type: 'Service', namespace: ns, name })} onOpen={openPanel} t={t} />
        )}
        {activeTab === 'ingresses' && (
          <IngressesTable ingresses={ingresses} loading={loading} onDelete={(ns, name) => setDeleteModal({ type: 'Ingress', namespace: ns, name })} onOpen={openPanel} t={t} />
        )}
        {activeTab === 'topology' && <NetworkTopology services={services} ingresses={ingresses} t={t} />}
      </main>

      {/* Delete Modal */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={() => setDeleteModal(null)}>
          <div style={{ width: '100%', maxWidth: 400, margin: '0 16px', background: t.cardBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 8, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Delete {deleteModal.type}</h2>
              <button onClick={() => setDeleteModal(null)} style={{ background: 'transparent', border: 'none', color: t.textSub, cursor: 'pointer' }}>
                <XMarkIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 11, color: t.text, marginBottom: 8 }}>
                Are you sure you want to delete <span style={{ color: '#ef4444', fontWeight: 500 }}>{deleteModal.name}</span>?
              </p>
              <p style={{ fontSize: 10, color: t.textSub }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button
                  onClick={() => setDeleteModal(null)}
                  style={{ padding: '8px 16px', fontSize: 11, fontWeight: 500, background: 'transparent', color: t.text, border: `1px solid ${t.sidebarBorder}`, borderRadius: 4, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  style={{ padding: '8px 16px', fontSize: 11, fontWeight: 500, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: deleteLoading ? 'wait' : 'pointer', opacity: deleteLoading ? 0.5 : 1 }}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Detail Window */}
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
