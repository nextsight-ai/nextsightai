import { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import {
  ServerStackIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CloudIcon,
  XMarkIcon,
  KeyIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  SignalIcon,
  PencilSquareIcon,
  HeartIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import { clustersApi, ClusterTestResult } from '../../services/api';
import { useCluster } from '../../contexts/ClusterContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { ClusterInfo } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

type AuthType = 'kubeconfig' | 'kubeconfig_file' | 'token';

interface ClusterHealthData {
  cluster_id: string;
  healthy: boolean;
  status: string;
  node_count: number;
  ready_nodes: number;
  total_pods: number;
  running_pods: number;
  namespaces: number;
  warnings: string[];
  error?: string;
  checked_at: string;
}

interface KubeContext {
  name: string;
  cluster: string;
  user: string;
  namespace?: string;
}

export default function ClusterManagement() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const { clusters, setActiveCluster, refreshClusters } = useCluster();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [contexts, setContexts] = useState<KubeContext[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    id: '',
    name: '',
    context: '',
    kubeconfig_path: '',
    kubeconfig_content: '',
    is_default: false,
    auth_type: 'kubeconfig' as AuthType,
    api_server: '',
    bearer_token: '',
    ca_cert: '',
    skip_tls_verify: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [testingCluster, setTestingCluster] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ClusterTestResult | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCluster, setEditingCluster] = useState<ClusterInfo | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthData, setHealthData] = useState<ClusterHealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadContexts();
  }, []);

  const loadContexts = async () => {
    try {
      const response = await clustersApi.getContexts();
      setContexts(response.data);
    } catch (err) {
      logger.error('Failed to load contexts', err);
    }
  };

  const handleSetActive = async (clusterId: string) => {
    try {
      setLoading(true);
      setError(null);
      await setActiveCluster(clusterId);
      setSuccess(`Switched to cluster: ${clusterId}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to switch cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const payload: Record<string, unknown> = {
        id: addForm.id.toLowerCase().replace(/\s+/g, '-'),
        name: addForm.name,
        is_default: addForm.is_default,
        auth_type: addForm.auth_type === 'kubeconfig_file' ? 'kubeconfig' : addForm.auth_type,
      };

      if (addForm.auth_type === 'kubeconfig') {
        payload.context = addForm.context || undefined;
        payload.kubeconfig_path = addForm.kubeconfig_path || undefined;
      } else if (addForm.auth_type === 'kubeconfig_file') {
        payload.kubeconfig_content = addForm.kubeconfig_content;
        payload.context = addForm.context || undefined;
      } else {
        payload.api_server = addForm.api_server;
        payload.bearer_token = addForm.bearer_token;
        payload.ca_cert = addForm.ca_cert || undefined;
        payload.skip_tls_verify = addForm.skip_tls_verify;
      }

      await clustersApi.create(payload);

      setSuccess('Cluster added successfully');
      setShowAddModal(false);
      setAddForm({
        id: '',
        name: '',
        context: '',
        kubeconfig_path: '',
        kubeconfig_content: '',
        is_default: false,
        auth_type: 'kubeconfig',
        api_server: '',
        bearer_token: '',
        ca_cert: '',
        skip_tls_verify: false,
      });
      await refreshClusters();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to add cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCluster = async (clusterId: string) => {
    if (!confirm(`Are you sure you want to delete cluster "${clusterId}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await clustersApi.delete(clusterId);
      setSuccess('Cluster deleted successfully');
      await refreshClusters();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (clusterId: string) => {
    try {
      setTestingCluster(clusterId);
      setTestResult(null);
      const response = await clustersApi.testConnection(clusterId);
      setTestResult(response.data);
      if (response.data.success) {
        setSuccess(`Connection to ${clusterId} successful! Latency: ${response.data.latency_ms}ms`);
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setTestResult({
        success: false,
        cluster_id: clusterId,
        error: error.response?.data?.detail || 'Connection test failed',
        latency_ms: 0,
      });
    } finally {
      setTestingCluster(null);
    }
  };

  const handleEditCluster = (cluster: ClusterInfo) => {
    setEditingCluster(cluster);
    setAddForm({
      id: cluster.id,
      name: cluster.name,
      context: cluster.context || '',
      kubeconfig_path: '',
      kubeconfig_content: '',
      is_default: cluster.is_default,
      auth_type: 'kubeconfig',
      api_server: '',
      bearer_token: '',
      ca_cert: '',
      skip_tls_verify: false,
    });
    setShowEditModal(true);
  };

  const handleUpdateCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCluster) return;

    try {
      setLoading(true);
      setError(null);

      const payload: Record<string, unknown> = {
        id: addForm.id.toLowerCase().replace(/\s+/g, '-'),
        name: addForm.name,
        is_default: addForm.is_default,
        auth_type: addForm.auth_type === 'kubeconfig_file' ? 'kubeconfig' : addForm.auth_type,
      };

      if (addForm.auth_type === 'kubeconfig') {
        payload.context = addForm.context || undefined;
        payload.kubeconfig_path = addForm.kubeconfig_path || undefined;
      } else if (addForm.auth_type === 'kubeconfig_file') {
        payload.kubeconfig_content = addForm.kubeconfig_content;
        payload.context = addForm.context || undefined;
      } else {
        payload.api_server = addForm.api_server;
        payload.bearer_token = addForm.bearer_token;
        payload.ca_cert = addForm.ca_cert || undefined;
        payload.skip_tls_verify = addForm.skip_tls_verify;
      }

      await clustersApi.update(editingCluster.id, payload);

      setSuccess('Cluster updated successfully');
      setShowEditModal(false);
      setEditingCluster(null);
      setAddForm({
        id: '',
        name: '',
        context: '',
        kubeconfig_path: '',
        kubeconfig_content: '',
        is_default: false,
        auth_type: 'kubeconfig',
        api_server: '',
        bearer_token: '',
        ca_cert: '',
        skip_tls_verify: false,
      });
      await refreshClusters();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to update cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHealth = async (clusterId: string) => {
    try {
      setLoadingHealth(true);
      setShowHealthModal(true);
      const response = await clustersApi.getHealth(clusterId);
      setHealthData(response.data as unknown as ClusterHealthData);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setHealthData({
        cluster_id: clusterId,
        healthy: false,
        status: 'error',
        node_count: 0,
        ready_nodes: 0,
        total_pods: 0,
        running_pods: 0,
        namespaces: 0,
        warnings: [],
        error: error.response?.data?.detail || 'Failed to fetch health data',
        checked_at: new Date().toISOString(),
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const getStatusDotColor = (status: string): string => {
    switch (status) {
      case 'connected': return t.success;
      case 'disconnected': return t.warning;
      case 'error': return t.error;
      default: return t.textMuted;
    }
  };

  const getStatusBadgeStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'connected': return { background: t.successBg, color: t.success };
      case 'disconnected': return { background: t.warningBg, color: t.warning };
      case 'error': return { background: t.errorBg, color: t.error };
      default: return { background: t.cardBorder, color: t.textMuted };
    }
  };

  // ─── Shared styles ──────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '6px 10px',
    color: t.text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: t.textSub,
    marginBottom: 4,
  };

  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    background: t.info,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  };

  const btnSecondary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    background: 'transparent',
    color: t.textSub,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  };

  const btnDanger: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 10px',
    background: 'transparent',
    color: t.error,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    overflow: 'auto',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
  };

  const modalCardStyle: React.CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    position: 'relative',
  };

  const authBtnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 8px',
    borderRadius: 8,
    border: `1px solid ${active ? t.info : t.cardBorder}`,
    background: active ? t.infoBg : 'transparent',
    color: active ? t.info : t.textSub,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500,
    flex: 1,
  });

  return (
    <div style={{ color: t.text }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 32px',
          borderBottom: `1px solid ${t.cardBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ServerStackIcon style={{ width: 20, height: 20, color: t.info }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: t.text }}>Cluster Management</h1>
            <p style={{ margin: 0, fontSize: 11, color: t.textSub }}>
              {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} configured
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => refreshClusters()}
            disabled={loading}
            style={{ ...btnSecondary, opacity: loading ? 0.5 : 1 }}
          >
            <ArrowPathIcon style={{ width: 14, height: 14, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
            Refresh
          </button>
          {isAdmin && (
            <button onClick={() => setShowAddModal(true)} style={btnPrimary}>
              <PlusIcon style={{ width: 14, height: 14 }} />
              Add Cluster
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '24px 32px' }}>
        {/* Alerts */}
        {error && (
          <div
            style={{
              background: t.errorBg,
              border: `1px solid ${t.error}`,
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: t.error,
            }}
          >
            <ExclamationCircleIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              background: t.successBg,
              border: `1px solid ${t.success}`,
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: t.success,
            }}
          >
            <CheckCircleIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
            {success}
          </div>
        )}

        {/* Clusters grid */}
        {clusters.length === 0 ? (
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              padding: '56px 32px',
              textAlign: 'center',
            }}
          >
            <CloudIcon style={{ width: 40, height: 40, color: t.textMuted, margin: '0 auto 16px', opacity: 0.4 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: t.text }}>No clusters configured</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: t.textSub }}>Add a cluster to get started</p>
            {isAdmin && (
              <button onClick={() => setShowAddModal(true)} style={btnPrimary}>
                <PlusIcon style={{ width: 14, height: 14 }} />
                Add Cluster
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {clusters.map((cluster) => (
              <div
                key={cluster.id}
                style={{
                  background: t.cardBg,
                  border: `1px solid ${cluster.is_active ? t.info : t.cardBorder}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Status dot */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: getStatusBadgeStyle(cluster.status).background,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ServerStackIcon style={{ width: 18, height: 18, color: getStatusDotColor(cluster.status) }} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: t.text }}>{cluster.name}</h3>
                      <p style={{ margin: 0, fontSize: 11, color: t.textMuted, fontFamily: 'monospace' }}>{cluster.id}</p>
                    </div>
                  </div>
                  {cluster.is_active && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 9999,
                        fontSize: 10,
                        fontWeight: 500,
                        background: t.infoBg,
                        color: t.info,
                        flexShrink: 0,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>

                {/* Cluster meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, flex: 1 }}>
                  {[
                    { label: 'Status', value: cluster.status, mono: false, badge: true },
                    cluster.version ? { label: 'Version', value: cluster.version, mono: true, badge: false } : null,
                    cluster.context ? { label: 'Context', value: cluster.context, mono: false, badge: false } : null,
                    { label: 'Nodes', value: String(cluster.node_count), mono: false, badge: false },
                    { label: 'Namespaces', value: String(cluster.namespace_count), mono: false, badge: false },
                  ]
                    .filter(Boolean)
                    .map((row: any) => (
                      <div
                        key={row.label}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}
                      >
                        <span style={{ color: t.textMuted }}>{row.label}</span>
                        {row.badge ? (
                          <span
                            style={{
                              ...getStatusBadgeStyle(row.value),
                              padding: '1px 7px',
                              borderRadius: 9999,
                              fontSize: 11,
                              fontWeight: 500,
                              textTransform: 'capitalize',
                            }}
                          >
                            {row.value}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontWeight: 500,
                              color: t.text,
                              fontFamily: row.mono ? 'monospace' : 'inherit',
                              maxWidth: 140,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.value}
                          </span>
                        )}
                      </div>
                    ))}
                </div>

                {/* Test result */}
                {testResult && testResult.cluster_id === cluster.id && (
                  <div
                    style={{
                      background: testResult.success ? t.successBg : t.errorBg,
                      border: `1px solid ${testResult.success ? t.success : t.error}`,
                      borderRadius: 6,
                      padding: '8px 10px',
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    {testResult.success ? (
                      <CheckCircleIcon style={{ width: 14, height: 14, color: t.success, flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <ExclamationCircleIcon style={{ width: 14, height: 14, color: t.error, flexShrink: 0, marginTop: 1 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {testResult.success ? (
                        <>
                          <p style={{ margin: '0 0 2px', color: t.success, fontWeight: 500 }}>Connected</p>
                          <p style={{ margin: 0, color: t.textMuted }}>
                            {testResult.version} • {testResult.latency_ms}ms
                          </p>
                        </>
                      ) : (
                        <p style={{ margin: 0, color: t.error, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {testResult.error}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setTestResult(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 0, flexShrink: 0 }}
                    >
                      <XMarkIcon style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div style={{ paddingTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
                  {/* Primary action */}
                  <div style={{ marginBottom: 10 }}>
                    {!cluster.is_active ? (
                      <button
                        onClick={() => handleSetActive(cluster.id)}
                        disabled={loading}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: t.info,
                          fontSize: 12,
                          fontWeight: 500,
                          padding: 0,
                          opacity: loading ? 0.5 : 1,
                        }}
                      >
                        Switch to this cluster
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: t.textMuted }}>Currently active</span>
                    )}
                  </div>

                  {/* Secondary action row */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleTestConnection(cluster.id)}
                      disabled={testingCluster === cluster.id}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        padding: '5px 8px',
                        background: t.mainBg,
                        border: `1px solid ${t.cardBorder}`,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        color: t.textSub,
                        cursor: 'pointer',
                        opacity: testingCluster === cluster.id ? 0.5 : 1,
                      }}
                      title="Test connection"
                    >
                      {testingCluster === cluster.id ? (
                        <ArrowPathIcon style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <SignalIcon style={{ width: 12, height: 12 }} />
                      )}
                      Test
                    </button>

                    <button
                      onClick={() => handleViewHealth(cluster.id)}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        padding: '5px 8px',
                        background: t.mainBg,
                        border: `1px solid ${t.cardBorder}`,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        color: t.textSub,
                        cursor: 'pointer',
                      }}
                      title="View health details"
                    >
                      <HeartIcon style={{ width: 12, height: 12 }} />
                      Health
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleEditCluster(cluster)}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          padding: '5px 8px',
                          background: t.mainBg,
                          border: `1px solid ${t.cardBorder}`,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          color: t.textSub,
                          cursor: 'pointer',
                        }}
                        title="Edit cluster"
                      >
                        <PencilSquareIcon style={{ width: 12, height: 12 }} />
                        Edit
                      </button>
                    )}

                    {isAdmin && !cluster.is_default && (
                      <button
                        onClick={() => handleDeleteCluster(cluster.id)}
                        disabled={loading || cluster.is_active}
                        style={{
                          ...btnDanger,
                          padding: '5px 8px',
                          opacity: loading || cluster.is_active ? 0.4 : 1,
                          cursor: cluster.is_active ? 'not-allowed' : 'pointer',
                        }}
                        title={cluster.is_active ? 'Cannot delete active cluster' : 'Delete cluster'}
                      >
                        <TrashIcon style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Contexts table */}
        {contexts.length > 0 && (
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              marginTop: 24,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.cardBorder}` }}>
              <h3 style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: t.text }}>Available Kubeconfig Contexts</h3>
              <p style={{ margin: 0, fontSize: 11, color: t.textSub }}>Contexts found in your kubeconfig file</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Context Name', 'Cluster', 'User', 'Namespace'].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '8px 20px',
                          textAlign: 'left',
                          fontSize: 10,
                          fontWeight: 500,
                          color: t.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          borderBottom: `1px solid ${t.cardBorder}`,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contexts.map((ctx, index) => (
                    <tr
                      key={ctx.name}
                      style={{ borderBottom: index < contexts.length - 1 ? `1px solid ${t.cardBorder}` : 'none' }}
                    >
                      <td style={{ padding: '10px 20px', fontWeight: 500, color: t.text }}>{ctx.name}</td>
                      <td style={{ padding: '10px 20px', color: t.textSub }}>{ctx.cluster}</td>
                      <td style={{ padding: '10px 20px', color: t.textSub }}>{ctx.user}</td>
                      <td style={{ padding: '10px 20px', color: t.textSub }}>{ctx.namespace || 'default'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Cluster Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>Add New Cluster</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {error && (
              <div style={{ background: t.errorBg, border: `1px solid ${t.error}`, borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: t.error }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddCluster} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Cluster ID *</label>
                <input
                  type="text"
                  value={addForm.id}
                  onChange={(e) => setAddForm({ ...addForm, id: e.target.value })}
                  style={inputStyle}
                  placeholder="my-cluster"
                  required
                />
                <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Unique identifier for this cluster</p>
              </div>

              <div>
                <label style={labelStyle}>Display Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  style={inputStyle}
                  placeholder="My Production Cluster"
                  required
                />
              </div>

              {/* Auth type selector */}
              <div>
                <label style={labelStyle}>Authentication Method</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, auth_type: 'kubeconfig' })}
                    style={authBtnStyle(addForm.auth_type === 'kubeconfig')}
                  >
                    <DocumentTextIcon style={{ width: 18, height: 18 }} />
                    Context
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, auth_type: 'kubeconfig_file' })}
                    style={authBtnStyle(addForm.auth_type === 'kubeconfig_file')}
                  >
                    <ArrowUpTrayIcon style={{ width: 18, height: 18 }} />
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, auth_type: 'token' })}
                    style={authBtnStyle(addForm.auth_type === 'token')}
                  >
                    <KeyIcon style={{ width: 18, height: 18 }} />
                    Token
                  </button>
                </div>
              </div>

              {/* Kubeconfig context fields */}
              {addForm.auth_type === 'kubeconfig' && (
                <>
                  <div>
                    <label style={labelStyle}>Kubeconfig Context</label>
                    <select
                      value={addForm.context}
                      onChange={(e) => setAddForm({ ...addForm, context: e.target.value })}
                      style={{ ...inputStyle, background: t.cardBg }}
                    >
                      <option value="">Select a context...</option>
                      {contexts.map((ctx) => (
                        <option key={ctx.name} value={ctx.name}>{ctx.name}</option>
                      ))}
                    </select>
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Select from available kubeconfig contexts</p>
                  </div>

                  <div>
                    <label style={labelStyle}>Kubeconfig Path</label>
                    <input
                      type="text"
                      value={addForm.kubeconfig_path}
                      onChange={(e) => setAddForm({ ...addForm, kubeconfig_path: e.target.value })}
                      style={inputStyle}
                      placeholder="~/.kube/config"
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Leave empty to use default kubeconfig</p>
                  </div>
                </>
              )}

              {/* Kubeconfig file upload */}
              {addForm.auth_type === 'kubeconfig_file' && (
                <>
                  <div>
                    <label style={labelStyle}>Upload Kubeconfig File</label>
                    <input
                      type="file"
                      accept=".yaml,.yml,.config,*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            setAddForm({ ...addForm, kubeconfig_content: content });
                          };
                          reader.readAsText(file);
                        }
                      }}
                      style={{ ...inputStyle, paddingTop: 4 }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Upload your kubeconfig file from your machine</p>
                  </div>

                  <div>
                    <label style={labelStyle}>Or Paste Kubeconfig Content</label>
                    <textarea
                      value={addForm.kubeconfig_content}
                      onChange={(e) => setAddForm({ ...addForm, kubeconfig_content: e.target.value })}
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11, minHeight: 100, resize: 'vertical' }}
                      placeholder={`apiVersion: v1\nkind: Config\nclusters:\n- cluster:\n    server: https://...`}
                      rows={6}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Paste the full kubeconfig YAML content</p>
                  </div>

                  <div>
                    <label style={labelStyle}>Context Name (Optional)</label>
                    <input
                      type="text"
                      value={addForm.context}
                      onChange={(e) => setAddForm({ ...addForm, context: e.target.value })}
                      style={inputStyle}
                      placeholder="my-cluster-context"
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Specify which context to use (leave empty for default)</p>
                  </div>
                </>
              )}

              {/* Token-based fields */}
              {addForm.auth_type === 'token' && (
                <>
                  <div>
                    <label style={labelStyle}>API Server URL *</label>
                    <input
                      type="text"
                      value={addForm.api_server}
                      onChange={(e) => setAddForm({ ...addForm, api_server: e.target.value })}
                      style={{ ...inputStyle, fontFamily: 'monospace' }}
                      placeholder="https://kubernetes.example.com:6443"
                      required={addForm.auth_type === 'token'}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Kubernetes API server endpoint</p>
                  </div>

                  <div>
                    <label style={labelStyle}>Bearer Token *</label>
                    <textarea
                      value={addForm.bearer_token}
                      onChange={(e) => setAddForm({ ...addForm, bearer_token: e.target.value })}
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11, minHeight: 64, resize: 'vertical' }}
                      placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                      rows={3}
                      required={addForm.auth_type === 'token'}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Service account token from the cluster</p>
                  </div>

                  <div>
                    <label style={labelStyle}>CA Certificate (Base64)</label>
                    <textarea
                      value={addForm.ca_cert}
                      onChange={(e) => setAddForm({ ...addForm, ca_cert: e.target.value })}
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11, minHeight: 48, resize: 'vertical' }}
                      placeholder="LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS..."
                      rows={2}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textMuted }}>Optional: Base64-encoded CA certificate</p>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      id="skip_tls"
                      checked={addForm.skip_tls_verify}
                      onChange={(e) => setAddForm({ ...addForm, skip_tls_verify: e.target.checked })}
                    />
                    Skip TLS verification{' '}
                    <span style={{ color: t.warning, fontSize: 12 }}>(not recommended)</span>
                  </label>
                </>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addForm.is_default}
                  onChange={(e) => setAddForm({ ...addForm, is_default: e.target.checked })}
                />
                Set as default cluster
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !addForm.id || !addForm.name || (addForm.auth_type === 'token' && (!addForm.api_server || !addForm.bearer_token)) || (addForm.auth_type === 'kubeconfig_file' && !addForm.kubeconfig_content)}
                  style={{
                    ...btnPrimary,
                    opacity: loading || !addForm.id || !addForm.name ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Adding...' : 'Add Cluster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cluster Modal */}
      {showEditModal && editingCluster && (
        <div
          style={modalOverlayStyle}
          onClick={() => { setShowEditModal(false); setEditingCluster(null); }}
        >
          <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>Edit Cluster</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditingCluster(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {error && (
              <div style={{ background: t.errorBg, border: `1px solid ${t.error}`, borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: t.error }}>
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateCluster} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Cluster ID</label>
                <input
                  type="text"
                  value={addForm.id}
                  onChange={(e) => setAddForm({ ...addForm, id: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Display Name</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Context</label>
                <select
                  value={addForm.context}
                  onChange={(e) => setAddForm({ ...addForm, context: e.target.value })}
                  style={{ ...inputStyle, background: t.cardBg }}
                >
                  <option value="">Select a context...</option>
                  {contexts.map((ctx) => (
                    <option key={ctx.name} value={ctx.name}>{ctx.name}</option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="edit_is_default"
                  checked={addForm.is_default}
                  onChange={(e) => setAddForm({ ...addForm, is_default: e.target.checked })}
                />
                Set as default cluster
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingCluster(null); }}
                  style={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !addForm.id || !addForm.name}
                  style={{ ...btnPrimary, opacity: loading || !addForm.id || !addForm.name ? 0.5 : 1 }}
                >
                  {loading ? 'Updating...' : 'Update Cluster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health Modal */}
      {showHealthModal && (
        <div
          style={modalOverlayStyle}
          onClick={() => { setShowHealthModal(false); setHealthData(null); }}
        >
          <div
            style={{ ...modalCardStyle, maxWidth: 520 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: healthData?.healthy ? t.successBg : t.errorBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HeartIcon style={{ width: 18, height: 18, color: healthData?.healthy ? t.success : t.error }} />
                </div>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: t.text }}>Cluster Health</h2>
                  <p style={{ margin: 0, fontSize: 11, color: t.textSub, fontFamily: 'monospace' }}>{healthData?.cluster_id}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowHealthModal(false); setHealthData(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {loadingHealth ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                <ArrowPathIcon style={{ width: 24, height: 24, color: t.info, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : healthData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Overall badge */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 16px',
                      borderRadius: 9999,
                      fontSize: 13,
                      fontWeight: 500,
                      background: healthData.healthy ? t.successBg : t.errorBg,
                      color: healthData.healthy ? t.success : t.error,
                    }}
                  >
                    {healthData.healthy ? (
                      <CheckCircleIcon style={{ width: 16, height: 16 }} />
                    ) : (
                      <ExclamationCircleIcon style={{ width: 16, height: 16 }} />
                    )}
                    {healthData.healthy ? 'Healthy' : 'Unhealthy'}
                  </span>
                </div>

                {/* Metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { icon: CpuChipIcon, label: 'Nodes', value: `${healthData.ready_nodes}/${healthData.node_count}`, sub: 'Ready' },
                    { icon: CircleStackIcon, label: 'Pods', value: `${healthData.running_pods}/${healthData.total_pods}`, sub: 'Running' },
                    { icon: ServerStackIcon, label: 'Namespaces', value: String(healthData.namespaces), sub: 'Total' },
                    {
                      icon: ClockIcon,
                      label: 'Checked',
                      value: new Date(healthData.checked_at).toLocaleTimeString(),
                      sub: new Date(healthData.checked_at).toLocaleDateString(),
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      style={{
                        background: t.mainBg,
                        border: `1px solid ${t.cardBorder}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <metric.icon style={{ width: 14, height: 14, color: t.info }} />
                        <span style={{ fontSize: 10, fontWeight: 500, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {metric.label}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: t.text, fontFamily: 'monospace' }}>
                        {metric.value}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: t.textMuted }}>{metric.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {healthData.warnings && healthData.warnings.length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: t.text }}>Warnings</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {healthData.warnings.map((warning, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            padding: '8px 12px',
                            background: t.warningBg,
                            border: `1px solid ${t.warning}`,
                            borderRadius: 6,
                          }}
                        >
                          <ExclamationCircleIcon style={{ width: 14, height: 14, color: t.warning, flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 12, color: t.warning }}>{warning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {healthData.error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '10px 12px',
                      background: t.errorBg,
                      border: `1px solid ${t.error}`,
                      borderRadius: 6,
                    }}
                  >
                    <ExclamationCircleIcon style={{ width: 14, height: 14, color: t.error, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: t.error }}>{healthData.error}</span>
                  </div>
                )}

                {/* Refresh */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => healthData && handleViewHealth(healthData.cluster_id)}
                    disabled={loadingHealth}
                    style={{ ...btnSecondary, opacity: loadingHealth ? 0.5 : 1 }}
                  >
                    <ArrowPathIcon style={{ width: 14, height: 14, ...(loadingHealth ? { animation: 'spin 1s linear infinite' } : {}) }} />
                    Refresh
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
