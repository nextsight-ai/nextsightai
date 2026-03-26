import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  CloudIcon,
  FolderIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { argocdApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';
import K8sHeader from '../kubernetes/K8sHeader';
import type { ArgoCDApplicationSummary, ArgoCDStatus, ArgoCDSyncStatus, ArgoCDHealthStatus } from '../../types';


function syncBadge(status: ArgoCDSyncStatus): React.CSSProperties {
  if (status === 'Synced') return { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' };
  if (status === 'OutOfSync') return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' };
  return { background: 'rgba(107,114,128,0.1)', color: '#6B7280', border: '1px solid rgba(107,114,128,0.25)' };
}

function healthBadge(status: ArgoCDHealthStatus): React.CSSProperties {
  if (status === 'Healthy') return { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' };
  if (status === 'Degraded') return { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' };
  if (status === 'Progressing') return { background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)' };
  if (status === 'Missing') return { background: 'rgba(249,115,22,0.1)', color: '#F97316', border: '1px solid rgba(249,115,22,0.25)' };
  return { background: 'rgba(107,114,128,0.1)', color: '#6B7280', border: '1px solid rgba(107,114,128,0.25)' };
}

function SyncIcon({ status }: { status: ArgoCDSyncStatus }) {
  if (status === 'Synced') return <CheckCircleIcon style={{ width: 18, height: 18, color: '#10B981' }} />;
  if (status === 'OutOfSync') return <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#F59E0B' }} />;
  return <ClockIcon style={{ width: 18, height: 18, color: '#6B7280' }} />;
}

function HealthIcon({ status }: { status: ArgoCDHealthStatus }) {
  if (status === 'Healthy') return <CheckCircleIcon style={{ width: 13, height: 13, color: '#10B981' }} />;
  if (status === 'Degraded') return <XCircleIcon style={{ width: 13, height: 13, color: '#EF4444' }} />;
  if (status === 'Progressing') return <ArrowPathIcon style={{ width: 13, height: 13, color: '#3b82f6' }} />;
  return <ClockIcon style={{ width: 13, height: 13, color: '#6B7280' }} />;
}

export default function GitOpsStatus() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [applications, setApplications] = useState<ArgoCDApplicationSummary[]>([]);
  const [argocdStatus, setArgocdStatus] = useState<ArgoCDStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<string>('all');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [syncingApps, setSyncingApps] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const statusResponse = await argocdApi.getStatus();
      setArgocdStatus(statusResponse.data);
      if (statusResponse.data.connected) {
        const appsResponse = await argocdApi.listApplications(projectFilter !== 'all' ? projectFilter : undefined);
        setApplications(appsResponse.data.applications || []);
      }
    } catch (err) {
      logger.error('Failed to fetch ArgoCD data', err);
      setError('Failed to connect to ArgoCD. Please check your ArgoCD configuration in Deploy settings.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const projects = useMemo(() => {
    const projectSet = new Set(applications.map(a => a.project));
    return ['all', ...Array.from(projectSet).sort()];
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.namespace.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.repoURL.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = projectFilter === 'all' || app.project === projectFilter;
      const matchesSync = syncFilter === 'all' ||
        (syncFilter === 'synced' && app.syncStatus === 'Synced') ||
        (syncFilter === 'out_of_sync' && app.syncStatus === 'OutOfSync');
      return matchesSearch && matchesProject && matchesSync;
    });
  }, [applications, searchQuery, projectFilter, syncFilter]);

  const stats = useMemo(() => ({
    total: applications.length,
    synced: applications.filter(a => a.syncStatus === 'Synced').length,
    outOfSync: applications.filter(a => a.syncStatus === 'OutOfSync').length,
    healthy: applications.filter(a => a.healthStatus === 'Healthy').length,
    degraded: applications.filter(a => a.healthStatus === 'Degraded').length,
    progressing: applications.filter(a => a.healthStatus === 'Progressing').length,
  }), [applications]);

  const handleRefresh = async () => { setIsRefreshing(true); await fetchData(); };

  const handleSync = async (appName: string) => {
    setSyncingApps(prev => new Set(prev).add(appName));
    try {
      await argocdApi.syncApplication(appName);
      await fetchData();
    } catch (err) {
      logger.error('Failed to sync application', err);
    } finally {
      setSyncingApps(prev => { const next = new Set(prev); next.delete(appName); return next; });
    }
  };

  const border = `1px solid ${t.cardBorder}`;
  const sectionBg = isDark ? 'rgba(0,0,0,0.15)' : '#F9FAFB';
  const subText = isDark ? '#9CA3AF' : '#4B5563';

  const selectStyle: React.CSSProperties = {
    padding: '7px 12px', fontSize: 12, border, borderRadius: 8,
    background: isDark ? 'rgba(0,0,0,0.2)' : '#fff',
    color: t.text, outline: 'none', cursor: 'pointer',
  };

  // Loading
  if (loading) {
    return (
      <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.cardBg, color: t.text }}>
        <K8sHeader title="GitOps Status" subtitle="ArgoCD application sync and health" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.textMuted }}>
            <ArrowPathIcon style={{ width: 20, height: 20 }} />
            <span style={{ fontSize: 14 }}>Loading ArgoCD applications...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not connected
  if (!argocdStatus?.connected) {
    return (
      <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.cardBg, color: t.text }}>
        <K8sHeader title="GitOps Status" subtitle="ArgoCD application sync and health" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 420 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <LinkIcon style={{ width: 32, height: 32, color: '#F97316' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 10 }}>ArgoCD Not Connected</h2>
            <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
              To view GitOps status, you need to configure and connect to your ArgoCD instance. Go to the Deploy page to set up ArgoCD integration.
            </p>
            <Link
              to="/deploy"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: '#F97316', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              <CloudIcon style={{ width: 16, height: 16 }} />
              Configure ArgoCD
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.cardBg, color: t.text }}>

      {/* Header */}
      <K8sHeader
        title="GitOps Status"
        subtitle="ArgoCD application sync and health"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: isDark ? t.navHoverBg : '#F3F4F6', color: t.text, border, opacity: isRefreshing ? 0.6 : 1 }}
            >
              <ArrowPathIcon style={{ width: 13, height: 13 }} />
              Refresh
            </button>
            <Link
              to="/deploy"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#F97316', color: '#fff', textDecoration: 'none', border: 'none' }}
            >
              <CloudIcon style={{ width: 13, height: 13 }} />
              Manage ArgoCD
            </Link>
          </div>
        }
      />

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <ExclamationTriangleIcon style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>Error</p>
              <p style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', background: sectionBg, border, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>Connected to ArgoCD</span>
          </div>
          {argocdStatus?.serverUrl && (
            <a href={argocdStatus.serverUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: subText, textDecoration: 'none', ...mono }}>
              {argocdStatus.serverUrl}
              <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
            </a>
          )}
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total Apps', value: stats.total, color: t.text },
            { label: 'Synced', value: stats.synced, color: '#10B981' },
            { label: 'Out of Sync', value: stats.outOfSync, color: '#F59E0B' },
            { label: 'Healthy', value: stats.healthy, color: '#10B981' },
            { label: 'Degraded', value: stats.degraded, color: '#EF4444' },
            { label: 'Progressing', value: stats.progressing, color: '#3b82f6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '12px 14px', background: sectionBg, border, borderRadius: 9 }}>
              <p style={{ fontSize: 11, color: subText, marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: t.textMuted }} />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, fontSize: 12, border, borderRadius: 8, background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', color: t.text, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
              onBlur={e => { e.currentTarget.style.borderColor = t.cardBorder; }}
            />
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={selectStyle}>
            {projects.map(p => <option key={p} value={p}>{p === 'all' ? 'All Projects' : p}</option>)}
          </select>
          <select value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Status</option>
            <option value="synced">Synced</option>
            <option value="out_of_sync">Out of Sync</option>
          </select>
        </div>

        {/* Application list */}
        {filteredApplications.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', color: t.textMuted }}>
            <CloudIcon style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 14 }}>{applications.length === 0 ? 'No applications found in ArgoCD' : 'No applications match your filters'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredApplications.map((app) => {
              const isExpanded = expandedApp === app.name;
              const isSyncing = syncingApps.has(app.name);
              return (
                <div
                  key={app.name}
                  style={{ padding: '12px 16px', background: t.cardBg, border, borderRadius: 10, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.borderColor = isDark ? '#374151' : '#D1D5DB'; }}
                  onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.borderColor = t.cardBorder; }}
                >
                  {/* App header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <SyncIcon status={app.syncStatus} />
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.name}</h3>
                        <p style={{ fontSize: 11, color: subText }}>{app.namespace} · {app.project}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {/* Sync badge */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500, ...syncBadge(app.syncStatus) }}>
                        {app.syncStatus}
                      </span>
                      {/* Health badge */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500, ...healthBadge(app.healthStatus) }}>
                        <HealthIcon status={app.healthStatus} />
                        {app.healthStatus}
                      </span>
                      {/* Sync button */}
                      <button
                        onClick={() => handleSync(app.name)}
                        disabled={isSyncing}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: 'rgba(249,115,22,0.1)', color: '#F97316', border: '1px solid rgba(249,115,22,0.25)', opacity: isSyncing ? 0.6 : 1 }}
                      >
                        <ArrowPathIcon style={{ width: 12, height: 12 }} />
                        {isSyncing ? 'Syncing...' : 'Sync'}
                      </button>
                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedApp(isExpanded ? null : app.name)}
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'transparent', border: `1px solid ${t.cardBorder}`, cursor: 'pointer', color: t.textMuted }}
                        onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
                      >
                        <ChevronRightIcon style={{ width: 14, height: 14, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: border }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <CodeBracketIcon style={{ width: 15, height: 15, color: t.textMuted, flexShrink: 0, marginTop: 2 }} />
                            <div>
                              <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Repository</p>
                              <a href={app.repoURL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{app.repoURL}</span>
                                <ArrowTopRightOnSquareIcon style={{ width: 11, height: 11, flexShrink: 0 }} />
                              </a>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <FolderIcon style={{ width: 15, height: 15, color: t.textMuted, flexShrink: 0, marginTop: 2 }} />
                            <div>
                              <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Path</p>
                              <p style={{ fontSize: 12, color: t.text, ...mono }}>{app.path || '/'}</p>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <CloudIcon style={{ width: 15, height: 15, color: t.textMuted, flexShrink: 0, marginTop: 2 }} />
                            <div>
                              <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Target Revision</p>
                              <p style={{ fontSize: 12, color: t.text, ...mono }}>{app.targetRevision}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <CloudIcon style={{ width: 15, height: 15, color: t.textMuted, flexShrink: 0, marginTop: 2 }} />
                            <div>
                              <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Destination</p>
                              <p style={{ fontSize: 12, color: t.text }}>{app.destNamespace} @ {app.destServer}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {app.syncRevision && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: t.textMuted }}>Current Revision:</span>
                          <code style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: sectionBg, color: subText, border, ...mono }}>{app.syncRevision.substring(0, 8)}</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
