import { useState, useEffect, useCallback } from 'react';
import { argocdApi } from '../../services/api';
import type {
  ArgoCDStatus,
  ArgoCDApplicationSummary,
  ArgoCDApplication,
  ArgoCDRevisionHistory,
  ArgoCDProjectSummary,
  ArgoCDDeploymentStatus,
} from '../../types';
import {
  ArrowPathRoundedSquareIcon,
  CodeBracketSquareIcon,
  CloudArrowUpIcon,
  CheckBadgeIcon,
  ClockIcon,
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUturnLeftIcon,
  EyeIcon,
  ServerStackIcon,
  LinkIcon,
  XMarkIcon,
  FolderIcon,
  RocketLaunchIcon,
  CubeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import K8sHeader from '../kubernetes/K8sHeader';

// Resource Tree Node Interface
interface TreeNode {
  uid: string;
  kind: string;
  name: string;
  namespace?: string;
  health?: string;
  status?: string;
  parentRefs?: Array<{ uid: string }>;
  children?: TreeNode[];
}

// Health status icons
const HealthIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'Healthy':
      return <CheckCircleIcon style={{ width: 14, height: 14 }} />;
    case 'Progressing':
      return <ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />;
    case 'Degraded':
      return <XCircleIcon style={{ width: 14, height: 14 }} />;
    case 'Suspended':
      return <ClockIcon style={{ width: 14, height: 14 }} />;
    default:
      return <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />;
  }
};

function getHealthBadgeStyle(status: string, t: ReturnType<typeof getThemeColors>): React.CSSProperties {
  switch (status) {
    case 'Healthy':
      return { background: t.successBg, color: t.success };
    case 'Progressing':
      return { background: t.infoBg, color: t.info };
    case 'Degraded':
      return { background: t.errorBg, color: t.error };
    case 'Suspended':
      return { background: t.warningBg, color: t.warning };
    default:
      return { background: t.cardBorder, color: t.textMuted };
  }
}

function getSyncBadgeStyle(status: string, t: ReturnType<typeof getThemeColors>): React.CSSProperties {
  switch (status) {
    case 'Synced':
      return { background: t.successBg, color: t.success };
    case 'OutOfSync':
      return { background: t.warningBg, color: t.warning };
    default:
      return { background: t.cardBorder, color: t.textMuted };
  }
}

// Resource Tree View Component
function ResourceTreeView({ tree, loading }: { tree: any; loading: boolean }) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
        <ArrowPathIcon style={{ width: 20, height: 20, color: t.info, animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: 8, fontSize: 12, color: t.textSub }}>Loading resource tree...</span>
      </div>
    );
  }

  if (!tree || !tree.nodes || tree.nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: t.textMuted }}>
        <CubeIcon style={{ width: 40, height: 40, margin: '0 auto 8px', opacity: 0.4 }} />
        <p style={{ fontSize: 12 }}>No resources found</p>
      </div>
    );
  }

  const buildTree = (nodes: TreeNode[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];
    nodes.forEach(node => {
      nodeMap.set(node.uid, { ...node, children: [] });
    });
    nodes.forEach(node => {
      const treeNode = nodeMap.get(node.uid);
      if (!treeNode) return;
      if (node.parentRefs && node.parentRefs.length > 0) {
        node.parentRefs.forEach(parentRef => {
          const parent = nodeMap.get(parentRef.uid);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(treeNode);
          }
        });
      } else {
        rootNodes.push(treeNode);
      }
    });
    return rootNodes;
  };

  const toggleNode = (uid: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(uid)) {
      newExpanded.delete(uid);
    } else {
      newExpanded.add(uid);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.uid);
    const paddingLeft = depth * 16 + 8;

    return (
      <div key={node.uid}>
        <div
          onClick={() => hasChildren && toggleNode(node.uid)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            paddingLeft,
            cursor: hasChildren ? 'pointer' : 'default',
            borderRadius: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = t.cardBorder)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            {hasChildren ? (
              <ChevronRightIcon
                style={{
                  width: 14,
                  height: 14,
                  color: t.textMuted,
                  flexShrink: 0,
                  transform: isExpanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                }}
              />
            ) : (
              <div style={{ width: 14, height: 14, flexShrink: 0 }} />
            )}
            <CubeIcon style={{ width: 14, height: 14, color: t.textMuted, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{node.kind}</span>
              <span style={{ fontSize: 12, color: t.textSub, marginLeft: 4 }}>/ {node.name}</span>
              {node.namespace && (
                <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 8 }}>({node.namespace})</span>
              )}
            </div>
          </div>
          {node.health && (
            <span
              style={{
                ...getHealthBadgeStyle(node.health, t),
                padding: '2px 7px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {node.health}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>{node.children?.map(child => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const treeNodes = buildTree(tree.nodes);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{treeNodes.map(node => renderNode(node))}</div>;
}

const inputStyle = (t: ReturnType<typeof getThemeColors>): React.CSSProperties => ({
  width: '100%',
  background: 'transparent',
  border: `1px solid ${t.cardBorder}`,
  borderRadius: 6,
  padding: '6px 10px',
  color: t.text,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
});

const labelStyle = (t: ReturnType<typeof getThemeColors>): React.CSSProperties => ({
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  color: t.textSub,
  marginBottom: 4,
});

export default function ArgoCDDeploy() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ArgoCDStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    serverUrl: '',
    token: '',
    username: '',
    password: '',
    insecure: false,
    authMethod: 'token' as 'token' | 'basic',
  });

  // Deployment state
  const [deploymentStatus, setDeploymentStatus] = useState<ArgoCDDeploymentStatus | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployForm, setDeployForm] = useState({
    namespace: 'argocd',
    release_name: 'argocd',
    expose_type: 'ClusterIP' as 'ClusterIP' | 'LoadBalancer' | 'NodePort',
    ha_enabled: false,
    insecure: true,
  });
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    admin_password?: string;
    server_url?: string;
  } | null>(null);

  // Application state
  const [applications, setApplications] = useState<ArgoCDApplicationSummary[]>([]);
  const [selectedApp, setSelectedApp] = useState<ArgoCDApplication | null>(null);
  const [selectedAppHistory, setSelectedAppHistory] = useState<ArgoCDRevisionHistory[]>([]);
  const [resourceTree, setResourceTree] = useState<any>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [projects, setProjects] = useState<ArgoCDProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Create application form
  const [createForm, setCreateForm] = useState({
    name: '',
    project: 'default',
    repoURL: '',
    path: '',
    targetRevision: 'HEAD',
    destServer: 'https://kubernetes.default.svc',
    destNamespace: 'default',
    autoSync: false,
    selfHeal: false,
    prune: false,
  });

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([checkConnectionStatus(), checkDeploymentStatus()]);
    };
    initialize();
  }, []);

  useEffect(() => {
    logger.debug('[ArgoCDDeploy] Auto-connect check', {
      deployed: deploymentStatus?.deployed,
      connected: connectionStatus?.connected,
      serverUrl: deploymentStatus?.server_url,
    });

    if (deploymentStatus?.deployed && !connectionStatus?.connected && deploymentStatus.server_url) {
      logger.debug('[ArgoCDDeploy] Conditions met - triggering auto-connect modal');
      const autoConnect = async () => {
        try {
          let serverUrl: string = deploymentStatus.server_url ?? '';
          if (serverUrl.includes('.svc.cluster.local')) {
            serverUrl = 'http://localhost:8080';
            logger.debug('[ArgoCDDeploy] Detected internal cluster URL, using localhost:8080 instead');
          }
          setConfigForm(prev => ({
            ...prev,
            serverUrl: serverUrl,
            username: 'admin',
            authMethod: 'basic',
            insecure: true,
          }));
          logger.debug('[ArgoCDDeploy] Config form pre-filled, showing modal');
          setShowConfigModal(true);
        } catch (err) {
          logger.error('Auto-connect setup failed', err);
        }
      };
      autoConnect();
    } else {
      logger.debug('[ArgoCDDeploy] Auto-connect conditions NOT met');
    }
  }, [deploymentStatus, connectionStatus]);

  const checkConnectionStatus = async () => {
    try {
      const response = await argocdApi.getStatus();
      logger.debug('[ArgoCDDeploy] Connection status response', response.data);
      setConnectionStatus(response.data);
      if (response.data.connected) {
        loadApplications();
        loadProjects();
      }
    } catch (error) {
      logger.error('[ArgoCDDeploy] Failed to check connection status', error);
      setConnectionStatus({ connected: false, message: 'Unable to check status' });
    }
  };

  const checkDeploymentStatus = async () => {
    try {
      const response = await argocdApi.getDeploymentStatus();
      logger.debug('[ArgoCDDeploy] Deployment status response', response.data);
      setDeploymentStatus(response.data);
    } catch (error) {
      logger.error('[ArgoCDDeploy] Failed to check deployment status', error);
      setDeploymentStatus({ deployed: false });
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setError(null);
    try {
      const response = await argocdApi.deployArgoCD(deployForm);
      if (response.data.success) {
        setDeployResult({
          success: true,
          admin_password: response.data.admin_password,
          server_url: response.data.server_url,
        });
        if (response.data.server_url && response.data.admin_password) {
          try {
            const configResponse = await argocdApi.configure({
              serverUrl: response.data.server_url,
              username: 'admin',
              password: response.data.admin_password,
              insecure: deployForm.insecure,
            });
            setConnectionStatus(configResponse.data);
            if (configResponse.data.connected) {
              await Promise.all([loadApplications(), loadProjects()]);
            }
          } catch (configErr) {
            logger.warn('Auto-configuration failed, but deployment succeeded', configErr);
          }
        }
        await checkDeploymentStatus();
        await checkConnectionStatus();
      } else {
        setError(response.data.message);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Deployment failed';
      setError(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleUninstall = async () => {
    if (!confirm('Are you sure you want to uninstall ArgoCD? This will remove all applications and data.')) {
      return;
    }
    try {
      await argocdApi.uninstallArgoCD(deployForm.namespace, deployForm.release_name, true);
      setDeploymentStatus({ deployed: false });
      setConnectionStatus({ connected: false, message: 'ArgoCD uninstalled' });
      setApplications([]);
      setProjects([]);
    } catch (err) {
      logger.error('Failed to uninstall ArgoCD', err);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const config = {
        serverUrl: configForm.serverUrl,
        token: configForm.authMethod === 'token' ? configForm.token : undefined,
        username: configForm.authMethod === 'basic' ? configForm.username : undefined,
        password: configForm.authMethod === 'basic' ? configForm.password : undefined,
        insecure: configForm.insecure,
      };
      const response = await argocdApi.configure(config);
      setConnectionStatus(response.data);
      if (response.data.connected) {
        setShowConfigModal(false);
        loadApplications();
        loadProjects();
      } else {
        setError(response.data.message || 'Failed to connect');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await argocdApi.disconnect();
      setConnectionStatus({ connected: false, message: 'Disconnected' });
      setApplications([]);
      setProjects([]);
    } catch (err) {
      logger.error('Failed to disconnect', err);
    }
  };

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    const timeoutId = setTimeout(() => {
      logger.warn('[ArgoCDDeploy] Loading timeout - forcing loading state to false');
      setLoading(false);
      setError('Request timed out. Please try again.');
    }, 35000);
    try {
      const response = await argocdApi.listApplications(selectedProject || undefined);
      clearTimeout(timeoutId);
      setApplications(response.data.applications);
      setError(null);
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error('Failed to load applications', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load applications';
      setError(errorMessage);
      setApplications([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const response = await argocdApi.listProjects();
      setProjects(response.data.projects);
    } catch (err) {
      logger.error('Failed to load projects', err);
    }
  };

  useEffect(() => {
    if (connectionStatus?.connected) {
      loadApplications();
    }
  }, [selectedProject, connectionStatus?.connected, loadApplications]);

  const handleViewApplication = async (name: string) => {
    try {
      setLoadingTree(true);
      const [appResponse, historyResponse, treeResponse] = await Promise.all([
        argocdApi.getApplication(name),
        argocdApi.getApplicationHistory(name),
        argocdApi.getResourceTree(name),
      ]);
      setSelectedApp(appResponse.data);
      setSelectedAppHistory(historyResponse.data.history);
      setResourceTree(treeResponse.data);
      setShowDetailModal(true);
    } catch (err) {
      logger.error('Failed to load application', err);
      setResourceTree(null);
    } finally {
      setLoadingTree(false);
    }
  };

  const handleSyncApplication = async (name: string) => {
    setSyncing(name);
    try {
      await argocdApi.syncApplication(name);
      await loadApplications();
    } catch (err) {
      logger.error('Failed to sync application', err);
    } finally {
      setSyncing(null);
    }
  };

  const handleRefreshApplication = async (name: string) => {
    setRefreshing(name);
    try {
      await argocdApi.refreshApplication(name);
      await loadApplications();
    } catch (err) {
      logger.error('Failed to refresh application', err);
    } finally {
      setRefreshing(null);
    }
  };

  const handleDeleteApplication = async (name: string) => {
    if (!confirm(`Are you sure you want to delete application "${name}"?`)) {
      return;
    }
    try {
      await argocdApi.deleteApplication(name);
      await loadApplications();
      setShowDetailModal(false);
    } catch (err) {
      logger.error('Failed to delete application', err);
    }
  };

  const handleRollback = async (name: string, revisionId: number) => {
    if (!confirm(`Rollback "${name}" to revision ${revisionId}?`)) {
      return;
    }
    try {
      await argocdApi.rollbackApplication(name, { id: revisionId });
      await loadApplications();
      if (selectedApp?.name === name) {
        handleViewApplication(name);
      }
    } catch (err) {
      logger.error('Failed to rollback application', err);
    }
  };

  const handleCreateApplication = async () => {
    try {
      await argocdApi.createApplication(createForm);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        project: 'default',
        repoURL: '',
        path: '',
        targetRevision: 'HEAD',
        destServer: 'https://kubernetes.default.svc',
        destNamespace: 'default',
        autoSync: false,
        selfHeal: false,
        prune: false,
      });
      await loadApplications();
    } catch (err) {
      logger.error('Failed to create application', err);
    }
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'rgba(0,0,0,0.6)',
  };

  const modalCardStyle: React.CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 480,
  };

  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
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
    padding: '8px 16px',
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
    padding: '8px 16px',
    background: 'transparent',
    color: t.error,
    border: `1px solid ${t.error}`,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  };

  // ─── Not connected view ────────────────────────────────────────────────────
  if (!connectionStatus?.connected) {
    return (
      <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', background: t.mainBg, color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <K8sHeader
          title="ArgoCD"
          subtitle="GitOps continuous deployment"
        />

        {/* Main content */}
        <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          {/* Deploy result */}
          {deployResult?.success && (
            <div
              style={{
                background: t.successBg,
                border: `1px solid ${t.success}`,
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
                display: 'flex',
                gap: 16,
              }}
            >
              <CheckCircleIcon style={{ width: 20, height: 20, color: t.success, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: t.success }}>
                  ArgoCD Deployed Successfully!
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: t.textSub }}>
                  {deployResult.server_url && (
                    <p style={{ margin: 0 }}>
                      <span style={{ fontWeight: 500 }}>Server URL:</span>{' '}
                      <span style={{ fontFamily: 'monospace' }}>{deployResult.server_url}</span>
                    </p>
                  )}
                  <p style={{ margin: 0 }}>
                    <span style={{ fontWeight: 500 }}>Username:</span> admin
                  </p>
                  {deployResult.admin_password && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>Password:</span>
                      <code
                        style={{
                          background: t.cardBorder,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 12,
                        }}
                      >
                        {deployResult.admin_password}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(deployResult.admin_password!)}
                        style={{ background: 'none', border: 'none', color: t.info, cursor: 'pointer', fontSize: 12 }}
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: t.warning }}>
                  Save these credentials — the password won't be shown again after you close this.
                </p>
              </div>
            </div>
          )}

          {/* Banner */}
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                background: t.infoBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <ArrowPathRoundedSquareIcon style={{ width: 36, height: 36, color: t.info }} />
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: t.text }}>
              ArgoCD Integration
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: t.textSub, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              Deploy a new ArgoCD instance or connect to an existing one to manage GitOps deployments.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowDeployModal(true)}
                style={{ ...btnPrimary, padding: '10px 20px', fontSize: 14 }}
              >
                <RocketLaunchIcon style={{ width: 18, height: 18 }} />
                Deploy ArgoCD
              </button>
              <span style={{ color: t.textMuted, fontSize: 12 }}>or</span>
              <button
                onClick={() => setShowConfigModal(true)}
                style={{ ...btnSecondary, padding: '10px 20px', fontSize: 14 }}
              >
                <LinkIcon style={{ width: 18, height: 18 }} />
                Connect Existing
              </button>
            </div>

            {deploymentStatus?.deployed && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 20,
                  padding: '6px 14px',
                  background: t.infoBg,
                  color: t.info,
                  borderRadius: 999,
                  fontSize: 12,
                }}
              >
                <CubeIcon style={{ width: 14, height: 14 }} />
                ArgoCD is deployed (v{deploymentStatus.app_version || deploymentStatus.chart_version})
                <span style={{ margin: '0 4px', color: t.textMuted }}>•</span>
                <button
                  onClick={() => {
                    if (deploymentStatus.server_url) {
                      setConfigForm(prev => ({
                        ...prev,
                        serverUrl: deploymentStatus.server_url!,
                        authMethod: 'basic',
                        username: 'admin',
                      }));
                      setShowConfigModal(true);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: t.info, cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}
                >
                  Connect
                </button>
              </div>
            )}
          </div>

          {/* Features grid */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 500, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
              Features
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[
                {
                  icon: CodeBracketSquareIcon,
                  title: 'GitOps Workflows',
                  description: 'Declarative continuous delivery with Git as the source of truth',
                },
                {
                  icon: ArrowPathRoundedSquareIcon,
                  title: 'Automated Sync',
                  description: 'Automatic synchronization of application state with Git repository',
                },
                {
                  icon: CheckBadgeIcon,
                  title: 'Health Monitoring',
                  description: 'Real-time health status and drift detection for all applications',
                },
                {
                  icon: ClockIcon,
                  title: 'Rollback & History',
                  description: 'Easy rollback to any previous version with full deployment history',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  style={{
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: t.infoBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <feature.icon style={{ width: 18, height: 18, color: t.info }} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: t.text }}>{feature.title}</h4>
                    <p style={{ margin: 0, fontSize: 12, color: t.textSub }}>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Config Modal */}
        {showConfigModal && (
          <div style={modalOverlayStyle} onClick={() => setShowConfigModal(false)}>
            <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>Connect to ArgoCD</h3>
                <button
                  onClick={() => setShowConfigModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
                >
                  <XMarkIcon style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {error && (
                <div style={{ background: t.errorBg, border: `1px solid ${t.error}`, borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: t.error }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle(t)}>Server URL</label>
                  <input
                    type="url"
                    value={configForm.serverUrl}
                    onChange={(e) => setConfigForm({ ...configForm, serverUrl: e.target.value })}
                    placeholder="https://argocd.example.com"
                    style={inputStyle(t)}
                  />
                </div>

                <div>
                  <label style={labelStyle(t)}>Authentication Method</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="token"
                        checked={configForm.authMethod === 'token'}
                        onChange={(e) => setConfigForm({ ...configForm, authMethod: e.target.value as 'token' | 'basic' })}
                      />
                      API Token
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="basic"
                        checked={configForm.authMethod === 'basic'}
                        onChange={(e) => setConfigForm({ ...configForm, authMethod: e.target.value as 'token' | 'basic' })}
                      />
                      Username/Password
                    </label>
                  </div>
                </div>

                {configForm.authMethod === 'token' ? (
                  <div>
                    <label style={labelStyle(t)}>API Token</label>
                    <input
                      type="password"
                      value={configForm.token}
                      onChange={(e) => setConfigForm({ ...configForm, token: e.target.value })}
                      placeholder="Enter API token"
                      style={inputStyle(t)}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={labelStyle(t)}>Username</label>
                      <input
                        type="text"
                        value={configForm.username}
                        onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                        placeholder="admin"
                        style={inputStyle(t)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle(t)}>Password</label>
                      <input
                        type="password"
                        value={configForm.password}
                        onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                        placeholder="Enter password"
                        style={inputStyle(t)}
                      />
                    </div>
                  </>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={configForm.insecure}
                    onChange={(e) => setConfigForm({ ...configForm, insecure: e.target.checked })}
                  />
                  Skip TLS verification (insecure)
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowConfigModal(false)} style={{ ...btnSecondary, flex: 1 }}>
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || !configForm.serverUrl}
                  style={{ ...btnPrimary, flex: 1, opacity: isConnecting || !configForm.serverUrl ? 0.5 : 1 }}
                >
                  {isConnecting ? (
                    <>
                      <ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deploy Modal */}
        {showDeployModal && (
          <div style={modalOverlayStyle} onClick={() => setShowDeployModal(false)}>
            <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>Deploy ArgoCD</h3>
                <button
                  onClick={() => setShowDeployModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
                >
                  <XMarkIcon style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {error && (
                <div style={{ background: t.errorBg, border: `1px solid ${t.error}`, borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: t.error }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle(t)}>Namespace</label>
                    <input
                      type="text"
                      value={deployForm.namespace}
                      onChange={(e) => setDeployForm({ ...deployForm, namespace: e.target.value })}
                      placeholder="argocd"
                      style={inputStyle(t)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle(t)}>Release Name</label>
                    <input
                      type="text"
                      value={deployForm.release_name}
                      onChange={(e) => setDeployForm({ ...deployForm, release_name: e.target.value })}
                      placeholder="argocd"
                      style={inputStyle(t)}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle(t)}>Service Type</label>
                  <select
                    value={deployForm.expose_type}
                    onChange={(e) => setDeployForm({ ...deployForm, expose_type: e.target.value as 'ClusterIP' | 'LoadBalancer' | 'NodePort' })}
                    style={{ ...inputStyle(t), background: t.cardBg }}
                  >
                    <option value="ClusterIP">ClusterIP (Internal only)</option>
                    <option value="LoadBalancer">LoadBalancer (External IP)</option>
                    <option value="NodePort">NodePort</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={deployForm.ha_enabled}
                      onChange={(e) => setDeployForm({ ...deployForm, ha_enabled: e.target.checked })}
                    />
                    Enable High Availability
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={deployForm.insecure}
                      onChange={(e) => setDeployForm({ ...deployForm, insecure: e.target.checked })}
                    />
                    Disable TLS (for development)
                  </label>
                </div>

                <div style={{ background: t.infoBg, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: t.info }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600 }}>What this will do:</p>
                  <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <li>Install ArgoCD via Helm chart</li>
                    <li>Create namespace "{deployForm.namespace}"</li>
                    <li>Generate admin credentials</li>
                    <li>Auto-connect after deployment</li>
                  </ul>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowDeployModal(false)} style={{ ...btnSecondary, flex: 1 }}>
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  style={{ ...btnPrimary, flex: 1, opacity: isDeploying ? 0.5 : 1 }}
                >
                  {isDeploying ? (
                    <>
                      <ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                      Deploy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Connected view ────────────────────────────────────────────────────────
  return (
    <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', background: t.mainBg, color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <K8sHeader
        title="ArgoCD"
        subtitle={`Connected · ${connectionStatus.serverUrl}${connectionStatus.version ? ` · v${connectionStatus.version}` : ''}`}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => loadApplications()} style={{ background: 'none', border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: t.textSub, display: 'flex' }} title="Refresh">
              <ArrowPathIcon style={{ width: 14, height: 14, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
            </button>
            <button onClick={() => setShowCreateModal(true)} style={btnPrimary}>
              <PlusIcon style={{ width: 13, height: 13 }} />
              New App
            </button>
            <button onClick={handleDisconnect} style={btnSecondary}>
              Disconnect
            </button>
            {deploymentStatus?.deployed && (
              <button onClick={handleUninstall} style={btnDanger}>
                <TrashIcon style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        }
      />

      {/* Main */}
      <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
        {/* Project filter */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <FolderIcon style={{ width: 16, height: 16, color: t.textMuted }} />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{ ...inputStyle(t), width: 'auto', background: t.cardBg }}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.name} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: t.textSub }}>
              {applications.length} application{applications.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: t.errorBg, border: `1px solid ${t.error}`, borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: t.error }}>
            {error}
          </div>
        )}

        {/* Applications */}
        {loading && applications.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
            <ArrowPathIcon style={{ width: 28, height: 28, color: t.textMuted, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : applications.length === 0 ? (
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <CloudArrowUpIcon style={{ width: 40, height: 40, color: t.textMuted, margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: t.text }}>No Applications</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: t.textSub }}>
              Create your first ArgoCD application to get started
            </p>
            <button onClick={() => setShowCreateModal(true)} style={btnPrimary}>
              <PlusIcon style={{ width: 14, height: 14 }} />
              Create Application
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {applications.map((app) => (
              <div
                key={app.name}
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* App header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ServerStackIcon style={{ width: 16, height: 16, color: t.info, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.name}
                    </span>
                  </div>
                  <span
                    style={{
                      ...getHealthBadgeStyle(app.healthStatus, t),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 7px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    <HealthIcon status={app.healthStatus} />
                    {app.healthStatus}
                  </span>
                </div>

                {/* App meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    <LinkIcon style={{ width: 13, height: 13, color: t.textMuted, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: t.textSub, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.repoURL}
                    </span>
                  </div>
                  {app.path && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FolderIcon style={{ width: 13, height: 13, color: t.textMuted, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: t.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.path}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        ...getSyncBadgeStyle(app.syncStatus, t),
                        padding: '2px 7px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {app.syncStatus}
                    </span>
                    {app.syncRevision && (
                      <span style={{ fontSize: 11, color: t.textMuted, fontFamily: 'monospace' }}>
                        @ {app.syncRevision.substring(0, 7)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    paddingTop: 12,
                    borderTop: `1px solid ${t.cardBorder}`,
                  }}
                >
                  <button
                    onClick={() => handleViewApplication(app.name)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '6px 8px',
                      background: 'transparent',
                      border: `1px solid ${t.cardBorder}`,
                      borderRadius: 6,
                      fontSize: 12,
                      color: t.textSub,
                      cursor: 'pointer',
                    }}
                  >
                    <EyeIcon style={{ width: 13, height: 13 }} />
                    View
                  </button>
                  <button
                    onClick={() => handleSyncApplication(app.name)}
                    disabled={syncing === app.name}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '6px 8px',
                      background: t.infoBg,
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      color: t.info,
                      cursor: 'pointer',
                      opacity: syncing === app.name ? 0.5 : 1,
                    }}
                  >
                    <ArrowPathIcon
                      style={{
                        width: 13,
                        height: 13,
                        ...(syncing === app.name ? { animation: 'spin 1s linear infinite' } : {}),
                      }}
                    />
                    Sync
                  </button>
                  <button
                    onClick={() => handleRefreshApplication(app.name)}
                    disabled={refreshing === app.name}
                    style={{
                      padding: '6px 8px',
                      background: 'transparent',
                      border: `1px solid ${t.cardBorder}`,
                      borderRadius: 6,
                      color: t.textMuted,
                      cursor: 'pointer',
                      opacity: refreshing === app.name ? 0.5 : 1,
                    }}
                    title="Refresh"
                  >
                    <ArrowPathIcon
                      style={{
                        width: 13,
                        height: 13,
                        ...(refreshing === app.name ? { animation: 'spin 1s linear infinite' } : {}),
                      }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Application Modal */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div
            style={{ ...modalCardStyle, maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>Create Application</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle(t)}>Application Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="my-app"
                    style={inputStyle(t)}
                  />
                </div>
                <div>
                  <label style={labelStyle(t)}>Project</label>
                  <select
                    value={createForm.project}
                    onChange={(e) => setCreateForm({ ...createForm, project: e.target.value })}
                    style={{ ...inputStyle(t), background: t.cardBg }}
                  >
                    <option value="default">default</option>
                    {projects.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle(t)}>Repository URL</label>
                <input
                  type="url"
                  value={createForm.repoURL}
                  onChange={(e) => setCreateForm({ ...createForm, repoURL: e.target.value })}
                  placeholder="https://github.com/org/repo"
                  style={{ ...inputStyle(t), fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle(t)}>Path</label>
                  <input
                    type="text"
                    value={createForm.path}
                    onChange={(e) => setCreateForm({ ...createForm, path: e.target.value })}
                    placeholder="./manifests"
                    style={inputStyle(t)}
                  />
                </div>
                <div>
                  <label style={labelStyle(t)}>Target Revision</label>
                  <input
                    type="text"
                    value={createForm.targetRevision}
                    onChange={(e) => setCreateForm({ ...createForm, targetRevision: e.target.value })}
                    placeholder="HEAD"
                    style={inputStyle(t)}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle(t)}>Destination Server</label>
                <input
                  type="text"
                  value={createForm.destServer}
                  onChange={(e) => setCreateForm({ ...createForm, destServer: e.target.value })}
                  placeholder="https://kubernetes.default.svc"
                  style={{ ...inputStyle(t), fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={labelStyle(t)}>Destination Namespace</label>
                <input
                  type="text"
                  value={createForm.destNamespace}
                  onChange={(e) => setCreateForm({ ...createForm, destNamespace: e.target.value })}
                  placeholder="default"
                  style={inputStyle(t)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={createForm.autoSync}
                    onChange={(e) => setCreateForm({ ...createForm, autoSync: e.target.checked })}
                  />
                  Enable Auto-Sync
                </label>
                {createForm.autoSync && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={createForm.selfHeal}
                        onChange={(e) => setCreateForm({ ...createForm, selfHeal: e.target.checked })}
                      />
                      Self Heal
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24, fontSize: 13, color: t.text, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={createForm.prune}
                        onChange={(e) => setCreateForm({ ...createForm, prune: e.target.checked })}
                      />
                      Prune Resources
                    </label>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowCreateModal(false)} style={{ ...btnSecondary, flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={handleCreateApplication}
                disabled={!createForm.name || !createForm.repoURL}
                style={{ ...btnPrimary, flex: 1, opacity: !createForm.name || !createForm.repoURL ? 0.5 : 1 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {showDetailModal && selectedApp && (
        <div style={modalOverlayStyle} onClick={() => setShowDetailModal(false)}>
          <div
            style={{ ...modalCardStyle, maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ServerStackIcon style={{ width: 20, height: 20, color: t.info }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>{selectedApp.name}</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Status badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span
                style={{
                  ...getHealthBadgeStyle(selectedApp.status.health.status, t),
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <HealthIcon status={selectedApp.status.health.status} />
                {selectedApp.status.health.status}
              </span>
              <span
                style={{
                  ...getSyncBadgeStyle(selectedApp.status.sync.status, t),
                  padding: '4px 10px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {selectedApp.status.sync.status}
              </span>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: t.textMuted }}>Project</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: t.text }}>{selectedApp.project}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: t.textMuted }}>Namespace</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: t.text }}>{selectedApp.spec.destination.namespace}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: t.textMuted }}>Repository</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: t.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedApp.spec.source.repoURL}
                </p>
              </div>
              {selectedApp.spec.source.path && (
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: t.textMuted }}>Path</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: t.text }}>{selectedApp.spec.source.path}</p>
                </div>
              )}
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: t.textMuted }}>Target Revision</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: t.text, fontFamily: 'monospace' }}>
                  {selectedApp.spec.source.targetRevision}
                </p>
              </div>
            </div>

            {/* History */}
            {selectedAppHistory.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: t.text }}>Revision History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {selectedAppHistory.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: t.mainBg,
                        borderRadius: 6,
                      }}
                    >
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 500, color: t.text }}>
                          Revision {entry.id}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: t.textMuted, fontFamily: 'monospace' }}>
                          {entry.revision.substring(0, 7)} • {entry.deployedAt || 'N/A'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRollback(selectedApp.name, entry.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          background: t.warningBg,
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          color: t.warning,
                          cursor: 'pointer',
                        }}
                      >
                        <ArrowUturnLeftIcon style={{ width: 11, height: 11 }} />
                        Rollback
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resource tree */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: t.text }}>
                Resource Tree
                {resourceTree?.nodes && (
                  <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, color: t.textMuted }}>
                    ({resourceTree.nodes.length} resources)
                  </span>
                )}
              </h4>
              <div
                style={{
                  maxHeight: 320,
                  overflowY: 'auto',
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <ResourceTreeView tree={resourceTree} loading={loadingTree} />
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                paddingTop: 16,
                borderTop: `1px solid ${t.cardBorder}`,
              }}
            >
              <button
                onClick={() => handleSyncApplication(selectedApp.name)}
                disabled={syncing === selectedApp.name}
                style={{ ...btnPrimary, flex: 1, opacity: syncing === selectedApp.name ? 0.5 : 1 }}
              >
                <ArrowPathIcon
                  style={{
                    width: 14,
                    height: 14,
                    ...(syncing === selectedApp.name ? { animation: 'spin 1s linear infinite' } : {}),
                  }}
                />
                Sync
              </button>
              <button
                onClick={() => handleRefreshApplication(selectedApp.name)}
                disabled={refreshing === selectedApp.name}
                style={{ ...btnSecondary, opacity: refreshing === selectedApp.name ? 0.5 : 1 }}
              >
                <ArrowPathIcon style={{ width: 14, height: 14 }} />
              </button>
              <button
                onClick={() => handleDeleteApplication(selectedApp.name)}
                style={btnDanger}
              >
                <TrashIcon style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
