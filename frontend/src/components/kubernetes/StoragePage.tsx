import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import ResourceDetailWindow, { type RDWResource } from './ResourceDetailWindow';
import { kubernetesApi } from '../../services/api';
import type { PVC } from '../../types';
import K8sHeader from './K8sHeader';
import { useNamespace } from '../../contexts/NamespaceContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono, createCard } from '../../styles/linear-design';


type StorageTab = 'pvcs' | 'pvs' | 'storageclasses';

interface PV {
  name: string;
  capacity: string;
  accessModes: string[];
  reclaimPolicy: string;
  status: 'Available' | 'Bound' | 'Released' | 'Failed';
  claim?: string;
  storageClass?: string;
  age: string;
}

interface StorageClass {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  isDefault: boolean;
  allowVolumeExpansion: boolean;
}

export default function StoragePage() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const card = createCard(t, isDark);
  const { selectedNamespace } = useNamespace();
  const [activeTab, setActiveTab] = useState<StorageTab>('pvcs');
  const [loading, setLoading] = useState(true);
  const [pvcs, setPVCs] = useState<PVC[]>([]);
  const [pvs, setPVs] = useState<PV[]>([]);
  const [storageClasses, setStorageClasses] = useState<StorageClass[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [pvcsRes, pvsRes, storageClassesRes] = await Promise.all([
        kubernetesApi.getPVCs().catch(() => ({ data: [] })),
        kubernetesApi.getPVs().catch(() => ({ data: [] })),
        kubernetesApi.getStorageClasses().catch(() => ({ data: [] })),
      ]);

      setPVCs(pvcsRes.data);

      // Transform PV data from backend format
      const transformedPVs: PV[] = (pvsRes.data || []).map((pv: any) => ({
        name: pv.name,
        capacity: pv.capacity || pv.storage || '0Gi',
        accessModes: pv.access_modes || pv.accessModes || [],
        reclaimPolicy: pv.reclaim_policy || pv.reclaimPolicy || 'Delete',
        status: pv.status || 'Available',
        claim: pv.claim || pv.claim_ref,
        storageClass: pv.storage_class || pv.storageClass,
        age: pv.age || calculateAge(pv.created_at || pv.createdAt),
      }));
      setPVs(transformedPVs);

      // Transform Storage Class data from backend format
      const transformedStorageClasses: StorageClass[] = (storageClassesRes.data || []).map((sc: any) => ({
        name: sc.name,
        provisioner: sc.provisioner || 'unknown',
        reclaimPolicy: sc.reclaim_policy || sc.reclaimPolicy || 'Delete',
        volumeBindingMode: sc.volume_binding_mode || sc.volumeBindingMode || 'Immediate',
        isDefault: sc.is_default || sc.isDefault || false,
        allowVolumeExpansion: sc.allow_volume_expansion || sc.allowVolumeExpansion || false,
      }));
      setStorageClasses(transformedStorageClasses);
    } catch (error) {
      console.error('Failed to fetch storage data', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateAge(timestamp?: string): string {
    if (!timestamp) return 'Unknown';
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return '1d';
    if (diffDays < 30) return `${diffDays}d`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
    return `${Math.floor(diffDays / 365)}y`;
  }

  const filteredPVCs = pvcs.filter(pvc => {
    const matchesNamespace = !selectedNamespace || pvc.namespace === selectedNamespace;
    const matchesSearch = !searchQuery || pvc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNamespace && matchesSearch;
  });

  const filteredPVs = pvs.filter(pv => {
    const matchesSearch = !searchQuery || pv.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredStorageClasses = storageClasses.filter(sc => {
    const matchesSearch = !searchQuery || sc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Bound':
      case 'Available':
        return '#22c55e';
      case 'Pending':
        return '#eab308';
      case 'Released':
        return '#9ca3af';
      case 'Failed':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const getAccessModeShort = (mode: string) => {
    if (mode === 'ReadWriteOnce') return 'RWO';
    if (mode === 'ReadOnlyMany') return 'ROX';
    if (mode === 'ReadWriteMany') return 'RWX';
    return mode;
  };

  const tabs = [
    { id: 'pvcs' as StorageTab, name: 'PVCs', count: filteredPVCs.length },
    { id: 'pvs' as StorageTab, name: 'PVs', count: filteredPVs.length },
    { id: 'storageclasses' as StorageTab, name: 'Storage Classes', count: filteredStorageClasses.length },
  ];

  const [rdw, setRdw] = useState<{ resources: RDWResource[]; activeId: string; forceRestore: number } | null>(null);

  function openPanel(kind: string, namespace: string, name: string, resourceObj?: any) {
    const id = `${kind}/${namespace || '_'}/${name}`;
    setRdw(prev => {
      if (!prev) return { resources: [{ id, kind, name, namespace, resourceObj }], activeId: id, forceRestore: 0 };
      if (prev.resources.some(r => r.id === id)) return { ...prev, activeId: id, forceRestore: prev.forceRestore + 1 };
      return { ...prev, resources: [...prev.resources, { id, kind, name, namespace, resourceObj }], activeId: id, forceRestore: prev.forceRestore + 1 };
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, overflow: 'hidden' }}>
      {/* K8s Header */}
      <K8sHeader
        title="Storage"
        subtitle="Persistent Volumes, PVCs, and Storage Classes"
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
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
              {tab.name}
              <span style={{ ...mono, fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: activeTab === tab.id ? t.infoBg : t.cardBorder, color: activeTab === tab.id ? t.info : t.textMuted, fontWeight: 500 }}>{tab.count}</span>
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
        {activeTab === 'pvcs' && (
          <section>
            <div style={{ ...card }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 80px 100px 100px 70px',
                gap: 12,
                padding: '9px 18px',
                borderBottom: `1px solid ${t.cardBorder}`,
                fontSize: 11,
                fontWeight: 400,
                color: t.textMuted,
                background: t.cardBg,
                borderRadius: '12px 12px 0 0',
              }}>
                <div>Name</div>
                <div>Namespace</div>
                <div style={{ textAlign: 'right' }}>Size</div>
                <div>Mode</div>
                <div>Status</div>
                <div></div>
              </div>

              {/* Table Rows */}
              {filteredPVCs.length === 0 ? (
                <div style={{ padding: '48px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12, letterSpacing: 0.2 }}>
                  No PVCs found
                </div>
              ) : (
                filteredPVCs.map((pvc, i) => (
                  <div
                    key={`${pvc.namespace}-${pvc.name}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 80px 100px 100px 70px',
                      gap: 12,
                      padding: '11px 18px',
                      borderBottom: i < filteredPVCs.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                      fontSize: 11,
                      color: t.text,
                      transition: 'background 0.2s',
                      letterSpacing: 0.2,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pvc.name}</div>
                      {pvc.storage_class && <div style={{ fontSize: 9, color: t.textMuted, ...mono, marginTop: 1 }}>{pvc.storage_class}</div>}
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pvc.namespace}
                    </div>
                    <div style={{ textAlign: 'right', ...mono }}>
                      {pvc.capacity || '10Gi'}
                    </div>
                    <div>
                      {pvc.access_modes.map((mode, idx) => (
                        <span key={idx} style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          fontSize: 9,
                          color: '#8b5cf6',
                          border: '1px solid #8b5cf633',
                          background: '#8b5cf611',
                          borderRadius: 4,
                          marginRight: 4,
                          ...mono,
                        }}>
                          {getAccessModeShort(mode)}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: getStatusColor(pvc.status),
                      }} />
                      <span>{pvc.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      <button
                        title="View Details"
                        onClick={(e) => { e.stopPropagation(); openPanel('PersistentVolumeClaim', pvc.namespace, pvc.name); }}
                        style={iconBtn}
                        onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
                      >
                        <DocumentTextIcon style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'pvs' && (
          <section>
            <div style={{ ...card }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 80px 100px 100px 70px',
                gap: 12,
                padding: '9px 18px',
                borderBottom: `1px solid ${t.cardBorder}`,
                fontSize: 11,
                fontWeight: 400,
                color: t.textMuted,
                background: t.cardBg,
                borderRadius: '12px 12px 0 0',
              }}>
                <div>Name</div>
                <div style={{ textAlign: 'right' }}>Size</div>
                <div>Reclaim</div>
                <div>Status</div>
                <div></div>
              </div>

              {/* Table Rows */}
              {filteredPVs.length === 0 ? (
                <div style={{ padding: '48px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12, letterSpacing: 0.2 }}>
                  No PVs found
                </div>
              ) : (
                filteredPVs.map((pv, i) => (
                  <div
                    key={pv.name}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 80px 100px 100px 70px',
                      gap: 12,
                      padding: '11px 18px',
                      borderBottom: i < filteredPVs.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                      fontSize: 11,
                      color: t.text,
                      transition: 'background 0.2s',
                      letterSpacing: 0.2,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pv.name}</div>
                      {pv.claim && <div style={{ fontSize: 9, color: t.textMuted, ...mono, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {pv.claim}</div>}
                    </div>
                    <div style={{ textAlign: 'right', ...mono }}>
                      {pv.capacity}
                    </div>
                    <div>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        fontSize: 9,
                        color: pv.reclaimPolicy === 'Retain' ? '#eab308' : '#9ca3af',
                        border: `1px solid ${pv.reclaimPolicy === 'Retain' ? '#eab30833' : '#9ca3af33'}`,
                        background: pv.reclaimPolicy === 'Retain' ? '#eab30811' : '#9ca3af11',
                        borderRadius: 4,
                        ...mono,
                      }}>
                        {pv.reclaimPolicy}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: getStatusColor(pv.status),
                      }} />
                      <span>{pv.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      <button
                        title="View Details"
                        onClick={(e) => { e.stopPropagation(); openPanel('PersistentVolume', '', pv.name); }}
                        style={iconBtn}
                        onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
                      >
                        <DocumentTextIcon style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'storageclasses' && (
          <section>
            <div style={{ ...card }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 120px 120px 80px',
                gap: 12,
                padding: '9px 18px',
                borderBottom: `1px solid ${t.cardBorder}`,
                fontSize: 11,
                fontWeight: 400,
                color: t.textMuted,
                background: t.cardBg,
                borderRadius: '12px 12px 0 0',
              }}>
                <div>Name</div>
                <div>Provisioner</div>
                <div>Reclaim Policy</div>
                <div>Binding Mode</div>
                <div style={{ textAlign: 'center' }}>Expansion</div>
              </div>

              {/* Table Rows */}
              {filteredStorageClasses.length === 0 ? (
                <div style={{ padding: '48px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12, letterSpacing: 0.2 }}>
                  No Storage Classes found
                </div>
              ) : (
                filteredStorageClasses.map((sc, i) => (
                  <div
                    key={sc.name}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 120px 120px 80px',
                      gap: 12,
                      padding: '11px 18px',
                      borderBottom: i < filteredStorageClasses.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                      fontSize: 11,
                      color: t.text,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      letterSpacing: 0.2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sc.name}
                      </span>
                      {sc.isDefault && (
                        <span style={{
                          padding: '2px 6px',
                          fontSize: 9,
                          color: '#3b82f6',
                          border: '1px solid #3b82f633',
                          background: '#3b82f611',
                          borderRadius: 4,
                          ...mono,
                        }}>
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...mono, fontSize: 10, color: t.textSub }}>
                      {sc.provisioner}
                    </div>
                    <div>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        fontSize: 9,
                        color: sc.reclaimPolicy === 'Retain' ? '#eab308' : '#9ca3af',
                        border: `1px solid ${sc.reclaimPolicy === 'Retain' ? '#eab30833' : '#9ca3af33'}`,
                        background: sc.reclaimPolicy === 'Retain' ? '#eab30811' : '#9ca3af11',
                        borderRadius: 4,
                        ...mono,
                      }}>
                        {sc.reclaimPolicy}
                      </span>
                    </div>
                    <div style={{ fontSize: 11 }}>
                      {sc.volumeBindingMode}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {sc.allowVolumeExpansion ? (
                        <CheckCircleIcon style={{ width: 16, height: 16, color: '#22c55e' }} />
                      ) : (
                        <XCircleIcon style={{ width: 16, height: 16, color: '#9ca3af' }} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
        </section>
        )}
      </main>

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
