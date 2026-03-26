import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon, CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import ResourceDetailWindow, { type RDWResource } from './ResourceDetailWindow';
import { kubernetesApi } from '../../services/api';
import { useNamespace } from '../../contexts/NamespaceContext';
import type { ConfigMap, Secret } from '../../types';
import K8sHeader from './K8sHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono, createCard } from '../../styles/linear-design';


type TabType = 'configmaps' | 'secrets';

export default function ConfigurationPage() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const card = createCard(t, isDark);
  const { selectedNamespace } = useNamespace();
  const [configMaps, setConfigMaps] = useState<ConfigMap[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('configmaps');
  const [searchQuery, setSearchQuery] = useState('');

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [itemData, setItemData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedNamespace]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const ns = selectedNamespace || undefined;
      const [configMapsRes, secretsRes] = await Promise.all([
        kubernetesApi.getConfigMaps(ns),
        kubernetesApi.getSecrets(ns),
      ]);
      setConfigMaps(configMapsRes.data || []);
      setSecrets(secretsRes.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load configuration data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const filteredConfigMaps = configMaps.filter(cm =>
    !searchQuery || cm.name.toLowerCase().includes(searchQuery.toLowerCase()) || cm.namespace.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSecrets = secrets.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.namespace.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = async (type: 'configmap' | 'secret', namespace: string, name: string) => {
    const key = `${type}-${namespace}/${name}`;
    if (expandedItem === key) {
      setExpandedItem(null);
      setItemData(null);
    } else {
      setExpandedItem(key);
      setLoadingData(true);
      try {
        if (type === 'configmap') {
          const response = await kubernetesApi.getConfigMap(namespace, name);
          setItemData(response.data);
        } else {
          const response = await kubernetesApi.getSecret(namespace, name);
          setItemData(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoadingData(false);
      }
    }
  };

  const copyToClipboard = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getSecretTypeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      'Opaque': { color: '#3b82f6', label: 'Opaque' },
      'kubernetes.io/tls': { color: '#22c55e', label: 'TLS' },
      'kubernetes.io/dockerconfigjson': { color: '#8b5cf6', label: 'Docker' },
      'kubernetes.io/service-account-token': { color: '#f59e0b', label: 'SA Token' },
      'kubernetes.io/basic-auth': { color: '#eab308', label: 'Basic Auth' },
      'kubernetes.io/ssh-auth': { color: '#14b8a6', label: 'SSH' },
    };
    const style = config[type] || { color: '#9ca3af', label: type };
    return { color: style.color, label: style.label };
  };

  // Detail window state — multi-tab model
  const [rdw, setRdw] = useState<{ resources: RDWResource[]; activeId: string; forceRestore: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ kind: string; name: string; namespace: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (deleteConfirm.kind === 'ConfigMap') await kubernetesApi.deleteConfigMap(deleteConfirm.namespace, deleteConfirm.name);
      else if (deleteConfirm.kind === 'Secret') await kubernetesApi.deleteSecret(deleteConfirm.namespace, deleteConfirm.name);
      setDeleteConfirm(null);
      loadData();
    } catch (e) { console.error('Delete failed', e); }
    finally { setDeleting(false); }
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
        title="Configuration"
        subtitle="ConfigMaps and Secrets management"
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
              onClick={loadData}
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
          <button
            onClick={() => setActiveTab('configmaps')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'configmaps' ? `2px solid ${t.info}` : '2px solid transparent',
              padding: '12px 0',
              marginBottom: -1,
              color: activeTab === 'configmaps' ? t.text : t.textSub,
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
            ConfigMaps
            <span style={{ ...mono, fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: activeTab === 'configmaps' ? t.infoBg : t.cardBorder, color: activeTab === 'configmaps' ? t.info : t.textMuted, fontWeight: 500 }}>{configMaps.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('secrets')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'secrets' ? `2px solid ${t.info}` : '2px solid transparent',
              padding: '12px 0',
              marginBottom: -1,
              color: activeTab === 'secrets' ? t.text : t.textSub,
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
            Secrets
            <span style={{ ...mono, fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: activeTab === 'secrets' ? t.infoBg : t.cardBorder, color: activeTab === 'secrets' ? t.info : t.textMuted, fontWeight: 500 }}>{secrets.length}</span>
          </button>
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

        {/* ConfigMaps Table */}
        {activeTab === 'configmaps' && (
          <section>
            <div style={{ ...card }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 100px 120px 70px 60px',
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
                <div style={{ textAlign: 'center' }}>Keys</div>
                <div>Age</div>
                <div></div>
                <div></div>
              </div>

              {/* Table Rows */}
              {filteredConfigMaps.length === 0 ? (
                <div style={{ padding: '48px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                  No ConfigMaps found
                </div>
              ) : (
                filteredConfigMaps.map((cm, i) => {
                  const cmKey = `configmap-${cm.namespace}/${cm.name}`;
                  const isExpanded = expandedItem === cmKey;

                  return (
                    <div key={cmKey} style={{ borderBottom: i < filteredConfigMaps.length - 1 ? `1px solid ${t.cardBorder}` : 'none' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 100px 120px 70px 60px',
                          gap: 12,
                          padding: '11px 18px',
                          fontSize: 11,
                          color: t.text,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          letterSpacing: 0.2,
                          alignItems: 'center',
                        }}
                      >
                        <div
                          onClick={() => openPanel('ConfigMap', cm.namespace, cm.name, cm)}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: t.info, fontWeight: 500 }}
                          title="Click to view details"
                        >
                          {cm.name}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cm.namespace}
                        </div>
                        <div style={{ textAlign: 'center', ...mono }}>
                          {cm.data_count}
                        </div>
                        <div>
                          {cm.age}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <button
                            title="Delete ConfigMap"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ kind: 'ConfigMap', name: cm.name, namespace: cm.namespace }); }}
                            style={iconBtn}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
                          >
                            <TrashIcon style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => toggleExpand('configmap', cm.namespace, cm.name)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: t.textSub,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {isExpanded ? <EyeSlashIcon style={{ width: 14, height: 14 }} /> : <EyeIcon style={{ width: 14, height: 14 }} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Data */}
                      {isExpanded && (
                        <div style={{ padding: '12px 18px', borderTop: `1px solid ${t.cardBorder}` }}>
                          {loadingData ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.textSub, fontSize: 11 }}>
                              <ArrowPathIcon style={{ width: 14, height: 14 }} />
                              Loading data...
                            </div>
                          ) : !itemData || Object.entries(itemData.data || {}).length === 0 ? (
                            <p style={{ color: t.textSub, fontSize: 11, fontStyle: 'italic', margin: 0 }}>No data keys</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {Object.entries(itemData.data).map(([key, value]: [string, any]) => (
                                <div key={key} style={{ padding: 8, background: t.cardBorder, borderRadius: 4 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <code style={{ fontSize: 11, color: '#3b82f6', ...mono }}>{key}</code>
                                    <button
                                      onClick={() => copyToClipboard(value, `${cmKey}-${key}`)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: t.textSub,
                                        cursor: 'pointer',
                                        padding: 2,
                                      }}
                                    >
                                      {copiedKey === `${cmKey}-${key}` ? (
                                        <CheckIcon style={{ width: 14, height: 14, color: '#22c55e' }} />
                                      ) : (
                                        <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />
                                      )}
                                    </button>
                                  </div>
                                  <pre style={{ fontSize: 10, color: t.text, ...mono, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {value}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Secrets Table */}
        {activeTab === 'secrets' && (
          <section>
            {/* Security Warning */}
            <div style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#eab308',
              fontSize: 11,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />
              Secret values are sensitive. Access is logged for audit purposes.
            </div>

            <div style={{ ...card }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 100px 150px 120px 70px 60px',
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
                <div style={{ textAlign: 'center' }}>Keys</div>
                <div>Type</div>
                <div>Age</div>
                <div></div>
                <div></div>
              </div>

              {/* Table Rows */}
              {filteredSecrets.length === 0 ? (
                <div style={{ padding: '48px 18px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                  No Secrets found
                </div>
              ) : (
                filteredSecrets.map((secret, i) => {
                  const secretKey = `secret-${secret.namespace}/${secret.name}`;
                  const isExpanded = expandedItem === secretKey;
                  const badge = getSecretTypeBadge(secret.type);

                  return (
                    <div key={secretKey} style={{ borderBottom: i < filteredSecrets.length - 1 ? `1px solid ${t.cardBorder}` : 'none' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 100px 150px 120px 70px 60px',
                          gap: 12,
                          padding: '11px 18px',
                          fontSize: 11,
                          color: t.text,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          letterSpacing: 0.2,
                          alignItems: 'center',
                        }}
                      >
                        <div
                          onClick={() => openPanel('Secret', secret.namespace, secret.name, secret)}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: '#eab308', fontWeight: 500 }}
                          title="Click to view details"
                        >
                          {secret.name}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {secret.namespace}
                        </div>
                        <div style={{ textAlign: 'center', ...mono }}>
                          {secret.data_count}
                        </div>
                        <div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            color: badge.color,
                            border: `1px solid ${badge.color}33`,
                            background: `${badge.color}11`,
                          }}>
                            {badge.label}
                          </span>
                        </div>
                        <div>
                          {secret.age}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <button
                            title="Delete Secret"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ kind: 'Secret', name: secret.name, namespace: secret.namespace }); }}
                            style={iconBtn}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
                          >
                            <TrashIcon style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => toggleExpand('secret', secret.namespace, secret.name)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: t.textSub,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {isExpanded ? <EyeSlashIcon style={{ width: 14, height: 14 }} /> : <EyeIcon style={{ width: 14, height: 14 }} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Data - Show keys only for security */}
                      {isExpanded && (
                        <div style={{ padding: '12px 18px', borderTop: `1px solid ${t.cardBorder}` }}>
                          {loadingData ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.textSub, fontSize: 11 }}>
                              <ArrowPathIcon style={{ width: 14, height: 14 }} />
                              Loading data...
                            </div>
                          ) : !secret.data_keys || secret.data_keys.length === 0 ? (
                            <p style={{ color: t.textSub, fontSize: 11, fontStyle: 'italic', margin: 0 }}>No data keys</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <p style={{ fontSize: 10, color: t.textSub, margin: '0 0 8px 0' }}>Data Keys (click to copy key name):</p>
                              {secret.data_keys.map((key) => (
                                <div key={key} style={{ padding: 8, background: t.cardBorder, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <code style={{ fontSize: 11, color: '#eab308', ...mono }}>{key}</code>
                                  <button
                                    onClick={() => copyToClipboard(key, `${secretKey}-${key}`)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: t.textSub,
                                      cursor: 'pointer',
                                      padding: 2,
                                    }}
                                  >
                                    {copiedKey === `${secretKey}-${key}` ? (
                                      <CheckIcon style={{ width: 14, height: 14, color: '#22c55e' }} />
                                    ) : (
                                      <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
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

      {/* Delete confirmation */}
      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 360, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: 24, zIndex: 70, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 8 }}>Delete {deleteConfirm.kind}?</div>
            <div style={{ fontSize: 12, color: t.textSub, marginBottom: 20, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 500, color: t.text }}>{deleteConfirm.name}</span> in <span style={{ ...mono, fontSize: 11 }}>{deleteConfirm.namespace}</span> will be permanently deleted.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', border: `1px solid ${t.cardBorder}`, borderRadius: 7, padding: '6px 16px', fontSize: 12, color: t.textSub, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ background: '#ef4444', border: 'none', borderRadius: 7, padding: '6px 16px', fontSize: 12, color: '#fff', cursor: deleting ? 'wait' : 'pointer', fontWeight: 500 }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
