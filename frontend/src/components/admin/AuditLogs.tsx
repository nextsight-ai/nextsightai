import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  KeyIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionDenied } from '../common/LoadingStates';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';

type AuditAction =
  | 'login' | 'logout' | 'create' | 'update' | 'delete'
  | 'view' | 'deploy' | 'sync' | 'rollback' | 'scale'
  | 'secret_access' | 'permission_change' | 'config_change';

type AuditResource =
  | 'user' | 'deployment' | 'pod' | 'service' | 'secret'
  | 'configmap' | 'cluster' | 'namespace' | 'role' | 'session';

interface AuditLog {
  id: string;
  timestamp: Date;
  user: {
    id: string;
    username: string;
    role: string;
  };
  action: AuditAction;
  resource: AuditResource;
  resourceName: string;
  resourceNamespace?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

// Transform backend audit log to frontend format
function transformAuditLog(backendLog: any): AuditLog {
  return {
    id: backendLog.id || String(Math.random()),
    timestamp: new Date(backendLog.timestamp),
    user: {
      id: backendLog.user_id || '',
      username: backendLog.username || 'unknown',
      role: backendLog.user_role || 'unknown',
    },
    action: (backendLog.action || 'view') as AuditAction,
    resource: (backendLog.resource_type || 'session') as AuditResource,
    resourceName: backendLog.resource_name || '',
    resourceNamespace: backendLog.namespace,
    details: backendLog.details || '',
    ipAddress: backendLog.ip_address || '',
    userAgent: backendLog.user_agent || '',
    status: backendLog.status === 'success' ? 'success' : 'failure',
    metadata: backendLog.metadata,
  };
}

const actionIcons: Record<AuditAction, typeof UserIcon> = {
  login: ArrowRightOnRectangleIcon,
  logout: ArrowRightOnRectangleIcon,
  create: PlusIcon,
  update: PencilIcon,
  delete: TrashIcon,
  view: EyeIcon,
  deploy: RocketLaunchIcon,
  sync: ArrowPathIcon,
  rollback: ArrowPathIcon,
  scale: ServerStackIcon,
  secret_access: KeyIcon,
  permission_change: ShieldCheckIcon,
  config_change: DocumentTextIcon,
};

// Action badge color map — theme-aware
function getActionBadgeColors(action: AuditAction, isDark: boolean): { bg: string; text: string } {
  const dark: Record<AuditAction, { bg: string; text: string }> = {
    login:            { bg: 'rgba(34,197,94,0.15)',   text: '#4ADE80' },
    logout:           { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' },
    create:           { bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' },
    update:           { bg: 'rgba(234,179,8,0.15)',   text: '#FBBF24' },
    delete:           { bg: 'rgba(239,68,68,0.15)',   text: '#F87171' },
    view:             { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' },
    deploy:           { bg: 'rgba(139,92,246,0.15)',  text: '#A78BFA' },
    sync:             { bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' },
    rollback:         { bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D' },
    scale:            { bg: 'rgba(20,184,166,0.15)',  text: '#2DD4BF' },
    secret_access:    { bg: 'rgba(234,179,8,0.15)',   text: '#FBBF24' },
    permission_change:{ bg: 'rgba(239,68,68,0.15)',   text: '#F87171' },
    config_change:    { bg: 'rgba(99,102,241,0.15)',  text: '#818CF8' },
  };
  const light: Record<AuditAction, { bg: string; text: string }> = {
    login:            { bg: '#DCFCE7', text: '#15803D' },
    logout:           { bg: '#F3F4F6', text: '#4B5563' },
    create:           { bg: '#DBEAFE', text: '#1D4ED8' },
    update:           { bg: '#FEF3C7', text: '#B45309' },
    delete:           { bg: '#FEE2E2', text: '#DC2626' },
    view:             { bg: '#F3F4F6', text: '#4B5563' },
    deploy:           { bg: '#EDE9FE', text: '#6D28D9' },
    sync:             { bg: '#DBEAFE', text: '#1D4ED8' },
    rollback:         { bg: '#FEF3C7', text: '#B45309' },
    scale:            { bg: '#CCFBF1', text: '#0F766E' },
    secret_access:    { bg: '#FEF3C7', text: '#B45309' },
    permission_change:{ bg: '#FEE2E2', text: '#DC2626' },
    config_change:    { bg: '#E0E7FF', text: '#4338CA' },
  };
  const map = isDark ? dark : light;
  return map[action] || (isDark ? { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' } : { bg: '#F3F4F6', text: '#4B5563' });
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function AuditLogs() {
  const { hasRole } = useAuth();
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsPerPage = 10;

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/auth/audit-logs', { params: { page: currentPage, limit: logsPerPage } });
      const transformedLogs = (response.data.logs || []).map(transformAuditLog);
      setLogs(transformedLogs);
      setTotalLogs(response.data.total || transformedLogs.length);
    } catch (err: any) {
      logger.error('Failed to fetch audit logs', err);
      setError(err?.response?.data?.detail || 'Failed to fetch audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesAction && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  // Calculate stats
  const stats = {
    total: totalLogs,
    success: logs.filter(l => l.status === 'success').length,
    failure: logs.filter(l => l.status === 'failure').length,
    today: logs.filter(l => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return l.timestamp >= today;
    }).length,
  };

  const inputStyle: React.CSSProperties = {
    background: t.mainBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '7px 10px',
    color: t.text,
    fontSize: 12,
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    background: t.mainBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '7px 10px',
    color: t.text,
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 10,
    fontWeight: 600,
    color: t.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: `1px solid ${t.cardBorder}`,
    background: t.mainBg,
  };

  const tdStyle: React.CSSProperties = {
    padding: '11px 14px',
    fontSize: 12,
    color: t.text,
    borderBottom: `1px solid ${t.cardBorder}`,
    verticalAlign: 'middle',
  };

  // Show error if any
  if (error && !loading) {
    return (
      <div style={{ color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 400 }}>
          <XCircleIcon style={{ width: 40, height: 40, color: t.error, margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: t.text }}>
            Failed to Load Audit Logs
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: t.textSub }}>{error}</p>
          <button
            onClick={fetchAuditLogs}
            style={{
              padding: '8px 20px',
              background: t.info,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!hasRole('admin')) {
    return (
      <div style={{ color: t.text }}>
        <PermissionDenied resource="Audit Logs" requiredRole="Administrator" />
      </div>
    );
  }

  return (
    <div style={{ color: t.text }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <ClipboardDocumentListIcon style={{ width: 20, height: 20, color: t.info }} />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: t.text }}>Audit Logs</h1>
          </div>
          <div style={{ fontSize: 13, color: t.textSub }}>Track all user actions and system events</div>
        </div>
        <button onClick={fetchAuditLogs} disabled={loading} style={{ background: 'none', border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '5px 8px', cursor: loading ? 'wait' : 'pointer', color: t.textSub, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <ArrowPathIcon style={{ width: 12, height: 12 }} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Events', value: stats.total, icon: ClipboardDocumentListIcon, color: t.info },
            { label: 'Successful', value: stats.success, icon: CheckCircleIcon, color: t.success },
            { label: 'Failed', value: stats.failure, icon: XCircleIcon, color: t.error },
            { label: 'Today', value: stats.today, icon: ClockIcon, color: t.warning },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              style={{
                background: t.cardBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: color + (isDark ? '22' : '18'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 14, height: 14, color }} />
                </div>
                <span style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
                  {label}
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: -1, ...mono }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 16,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <MagnifyingGlassIcon
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 15,
                height: 15,
                color: t.textMuted,
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search logs by user, resource, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FunnelIcon style={{ width: 15, height: 15, color: t.textMuted, flexShrink: 0 }} />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="deploy">Deploy</option>
              <option value="sync">Sync</option>
              <option value="rollback">Rollback</option>
              <option value="secret_access">Secret Access</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div style={{ marginBottom: 12, fontSize: 12, color: t.textMuted }}>
          Showing {paginatedLogs.length} of {filteredLogs.length} logs
        </div>

        {/* Logs Table */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: `3px solid ${t.cardBorder}`, borderTop: `3px solid ${t.info}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ fontSize: 13, color: t.textSub, margin: 0 }}>Loading audit logs...</p>
              </div>
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <ClockIcon style={{ width: 32, height: 32, color: t.textMuted, margin: '0 auto 12px' }} />
              <p style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 500, color: t.text }}>No audit logs found</p>
              <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Timestamp</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Resource</th>
                    <th style={thStyle}>Details</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => {
                    const ActionIcon = actionIcons[log.action];
                    const badgeColors = getActionBadgeColors(log.action, isDark);
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = t.mainBg; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ClockIcon style={{ width: 13, height: 13, color: t.textMuted, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>
                                {formatTimeAgo(log.timestamp)}
                              </div>
                              <div style={{ fontSize: 10, color: t.textMuted, ...mono, marginTop: 2 }}>
                                {formatTimestamp(log.timestamp)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: t.mainBg,
                                border: `1px solid ${t.cardBorder}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <UserIcon style={{ width: 15, height: 15, color: t.textSub }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{log.user.username}</div>
                              <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'capitalize' }}>{log.user.role}</div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                background: badgeColors.bg,
                                borderRadius: 6,
                                padding: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <ActionIcon style={{ width: 13, height: 13, color: badgeColors.text }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: badgeColors.text, textTransform: 'capitalize' }}>
                              {log.action.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{log.resourceName}</div>
                          {log.resourceNamespace && (
                            <div
                              style={{
                                display: 'inline-block',
                                marginTop: 3,
                                fontSize: 10,
                                color: t.textMuted,
                                background: t.mainBg,
                                border: `1px solid ${t.cardBorder}`,
                                borderRadius: 4,
                                padding: '1px 6px',
                              }}
                            >
                              {log.resourceNamespace}
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 220 }}>
                          <div style={{ fontSize: 12, color: t.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.details}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 9999,
                              fontSize: 11,
                              fontWeight: 600,
                              background: log.status === 'success' ? t.successBg : t.errorBg,
                              color: log.status === 'success' ? t.success : t.error,
                            }}
                          >
                            {log.status === 'success' ? (
                              <CheckCircleIcon style={{ width: 12, height: 12 }} />
                            ) : (
                              <XCircleIcon style={{ width: 12, height: 12 }} />
                            )}
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderTop: `1px solid ${t.cardBorder}`,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>
                Showing {(currentPage - 1) * logsPerPage + 1} to{' '}
                {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: 6,
                    background: t.mainBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderRadius: 6,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    color: t.textSub,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronLeftIcon style={{ width: 16, height: 16 }} />
                </button>
                <span style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, color: t.text, background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 6 }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: 6,
                    background: t.mainBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderRadius: 6,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    color: t.textSub,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronRightIcon style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 14,
              width: '100%',
              maxWidth: 620,
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: t.cardBg,
                padding: '16px 20px',
                borderBottom: `1px solid ${t.cardBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 1,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                <DocumentTextIcon style={{ width: 17, height: 17, color: t.info }} />
                Audit Log Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: t.textMuted,
                  padding: 4,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Status Badge */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 16px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: selectedLog.status === 'success' ? t.successBg : t.errorBg,
                    color: selectedLog.status === 'success' ? t.success : t.error,
                  }}
                >
                  {selectedLog.status === 'success' ? (
                    <CheckCircleIcon style={{ width: 16, height: 16 }} />
                  ) : (
                    <XCircleIcon style={{ width: 16, height: 16 }} />
                  )}
                  {selectedLog.status.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {[
                  {
                    label: 'Timestamp',
                    value: selectedLog.timestamp.toLocaleString(),
                    mono: true,
                  },
                  {
                    label: 'User',
                    value: `${selectedLog.user.username} (${selectedLog.user.role})`,
                    mono: false,
                  },
                  {
                    label: 'Resource',
                    value: `${selectedLog.resource}: ${selectedLog.resourceName}`,
                    mono: false,
                  },
                  {
                    label: 'Namespace',
                    value: selectedLog.resourceNamespace || 'N/A',
                    mono: false,
                  },
                  {
                    label: 'IP Address',
                    value: selectedLog.ipAddress,
                    mono: true,
                  },
                  {
                    label: 'Action',
                    value: selectedLog.action.replace('_', ' '),
                    mono: false,
                    capitalize: true,
                  },
                ].map(({ label, value, mono, capitalize }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: t.text,
                        ...(mono ? { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" } : {}),
                        textTransform: capitalize ? 'capitalize' : undefined,
                        background: mono ? t.mainBg : undefined,
                        border: mono ? `1px solid ${t.cardBorder}` : undefined,
                        borderRadius: mono ? 4 : undefined,
                        padding: mono ? '3px 8px' : undefined,
                        display: mono ? 'inline-block' : undefined,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Details
                </div>
                <div style={{ fontSize: 12, color: t.text, background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: '12px 16px', lineHeight: 1.6 }}>
                  {selectedLog.details}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  User Agent
                </div>
                <div style={{ fontSize: 11, color: t.textSub, background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: '10px 14px', ...mono, wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {selectedLog.userAgent}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
