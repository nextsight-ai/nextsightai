import { useState, useEffect, useCallback } from 'react';
import {
  BellAlertIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  FireIcon,
  ClockIcon,
  XMarkIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BellSlashIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { prometheusApi, getRelativeTime } from '../../services/prometheusApi';
import { logger } from '../../utils/logger';
import type { Alert, AlertGroup, Silence, SilenceCreate, AlertsResponse, RulesResponse, SilencesResponse } from '../../types/prometheus';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

interface SilenceModalProps {
  alert: Alert;
  onClose: () => void;
  onSilence: (silence: SilenceCreate) => void;
}

const SilenceModal = ({ alert, onClose, onSilence }: SilenceModalProps) => {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [duration, setDuration] = useState('2h');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const now = new Date();
    const durationMs = parseDurationToMs(duration);
    const endsAt = new Date(now.getTime() + durationMs);

    const silence: SilenceCreate = {
      matchers: Object.entries(alert.labels).map(([name, value]) => ({
        name,
        value,
        isRegex: false,
      })),
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      created_by: 'NextSight AI User',
      comment: comment || `Silenced from NextSight AI at ${now.toLocaleString()}`,
    };

    await onSilence(silence);
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          width: '100%',
          maxWidth: 440,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0 }}>
            Silence Alert
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 6,
              padding: '4px 4px',
              cursor: 'pointer',
              color: t.textSub,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
              Alert
            </label>
            <div
              style={{
                padding: 12,
                background: t.mainBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 8,
              }}
            >
              <p style={{ fontWeight: 600, color: t.text, margin: 0, fontSize: 13 }}>
                {alert.labels.alertname}
              </p>
              <p style={{ fontSize: 12, color: t.textSub, marginTop: 4, marginBottom: 0 }}>
                {alert.annotations.summary || alert.annotations.description}
              </p>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: t.mainBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 8,
                color: t.text,
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="30m">30 minutes</option>
              <option value="1h">1 hour</option>
              <option value="2h">2 hours</option>
              <option value="4h">4 hours</option>
              <option value="8h">8 hours</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Reason for silencing..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: t.mainBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 8,
                color: t.text,
                fontSize: 13,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: 'transparent',
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 8,
                color: t.textSub,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: '#7c3aed',
                border: 'none',
                borderRadius: 8,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading && (
                <ArrowPathIcon
                  style={{
                    width: 14,
                    height: 14,
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              Silence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const parseDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)(m|h|d)$/);
  if (!match) return 2 * 60 * 60 * 1000; // Default 2h
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] || 3600000);
};

const severityIcon = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return <FireIcon style={{ width: 20, height: 20, color: '#ef4444' }} />;
    case 'warning':
      return <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#f59e0b' }} />;
    default:
      return <InformationCircleIcon style={{ width: 20, height: 20, color: '#3b82f6' }} />;
  }
};

export default function AlertsView() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ruleGroups, setRuleGroups] = useState<AlertGroup[]>([]);
  const [silences, setSilences] = useState<Silence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'alerts' | 'rules' | 'silences'>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('firing');
  const [silenceModal, setSilenceModal] = useState<Alert | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshHover, setRefreshHover] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, rulesRes, silencesRes] = await Promise.all([
        prometheusApi.getAlerts(),
        prometheusApi.getRules(),
        prometheusApi.getSilences(),
      ]);

      setAlerts((alertsRes.data as AlertsResponse).alerts || []);
      setRuleGroups((rulesRes.data as RulesResponse).groups || []);
      setSilences((silencesRes.data as SilencesResponse).silences || []);
      setError(null);
    } catch (err: unknown) {
      logger.error('Failed to fetch alert data', err);
      setError('Failed to load alert data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSilence = async (silence: SilenceCreate) => {
    try {
      await prometheusApi.createSilence(silence);
      setSilenceModal(null);
      fetchData();
    } catch (err) {
      logger.error('Failed to create silence', err);
    }
  };

  const handleDeleteSilence = async (silenceId: string) => {
    try {
      await prometheusApi.deleteSilence(silenceId);
      fetchData();
    } catch (err) {
      logger.error('Failed to delete silence', err);
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = searchQuery === '' ||
      alert.labels.alertname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.annotations.summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'all' ||
      alert.labels.severity?.toLowerCase() === severityFilter;

    const matchesState = stateFilter === 'all' ||
      alert.state === stateFilter;

    return matchesSearch && matchesSeverity && matchesState;
  });

  // Count alerts by severity
  const alertCounts = {
    critical: alerts.filter(a => a.labels.severity === 'critical' && a.state === 'firing').length,
    warning: alerts.filter(a => a.labels.severity === 'warning' && a.state === 'firing').length,
    info: alerts.filter(a => a.labels.severity === 'info' && a.state === 'firing').length,
    pending: alerts.filter(a => a.state === 'pending').length,
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
          color: '#8b5cf6',
        }}
      >
        <ArrowPathIcon
          style={{
            width: 32,
            height: 32,
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: t.text,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              letterSpacing: -0.5,
            }}
          >
            <BellAlertIcon style={{ width: 24, height: 24, color: '#8b5cf6' }} />
            Alerts &amp; Rules
          </h1>
          <p style={{ fontSize: 12, color: t.textSub, margin: '4px 0 0 0' }}>
            Monitor active alerts, manage rules, and configure silences
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          onMouseEnter={() => setRefreshHover(true)}
          onMouseLeave={() => setRefreshHover(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: refreshHover ? '#6d28d9' : '#7c3aed',
            border: 'none',
            borderRadius: 8,
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 500,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.6 : 1,
            transition: 'background 0.15s',
          }}
        >
          <ArrowPathIcon
            style={{
              width: 16,
              height: 16,
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          Refresh
        </button>
      </div>

      {/* Alert Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        {/* Critical */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 16,
            borderTop: `3px solid ${t.error}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FireIcon style={{ width: 28, height: 28, color: t.error }} />
            <div>
              <p style={{ fontSize: 24, fontWeight: 700, color: t.error, margin: 0, letterSpacing: -1 }}>
                {alertCounts.critical}
              </p>
              <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>Critical</p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 16,
            borderTop: `3px solid ${t.warning}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ExclamationTriangleIcon style={{ width: 28, height: 28, color: t.warning }} />
            <div>
              <p style={{ fontSize: 24, fontWeight: 700, color: t.warning, margin: 0, letterSpacing: -1 }}>
                {alertCounts.warning}
              </p>
              <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>Warning</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 16,
            borderTop: `3px solid ${t.info}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <InformationCircleIcon style={{ width: 28, height: 28, color: t.info }} />
            <div>
              <p style={{ fontSize: 24, fontWeight: 700, color: t.info, margin: 0, letterSpacing: -1 }}>
                {alertCounts.info}
              </p>
              <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>Info</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 16,
            borderTop: '3px solid #8b5cf6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ClockIcon style={{ width: 28, height: 28, color: '#8b5cf6' }} />
            <div>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6', margin: 0, letterSpacing: -1 }}>
                {alertCounts.pending}
              </p>
              <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: `1px solid ${t.cardBorder}`,
        }}
      >
        {[
          { id: 'alerts', label: 'Active Alerts', icon: BellAlertIcon, count: filteredAlerts.length },
          { id: 'rules', label: 'Alert Rules', icon: ExclamationTriangleIcon, count: ruleGroups.reduce((acc, g) => acc + g.rules.length, 0) },
          { id: 'silences', label: 'Silences', icon: BellSlashIcon, count: silences.filter(s => s.status?.state === 'active').length },
        ].map(tab => {
          const isActive = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as 'alerts' | 'rules' | 'silences')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                marginBottom: -1,
                color: isActive ? '#3b82f6' : t.textSub,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              <tab.icon style={{ width: 16, height: 16 }} />
              {tab.label}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 500,
                  background: isActive ? t.infoBg : t.mainBg,
                  color: isActive ? t.info : t.textMuted,
                  border: `1px solid ${t.cardBorder}`,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {view === 'alerts' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <MagnifyingGlassIcon
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: t.textMuted,
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts..."
              style={{
                width: '100%',
                paddingLeft: 36,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                background: t.cardBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 8,
                color: t.text,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FunnelIcon style={{ width: 16, height: 16, color: t.textMuted }} />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                background: t.cardBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 8,
                color: t.text,
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                background: t.cardBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 8,
                color: t.text,
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All States</option>
              <option value="firing">Firing</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: t.errorBg,
            border: `1px solid ${t.error}`,
            borderRadius: 8,
            color: t.error,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Alerts List */}
      {view === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <CheckCircleIcon
                style={{ width: 56, height: 56, color: t.success, margin: '0 auto 16px' }}
              />
              <p style={{ fontSize: 16, fontWeight: 500, color: t.text, margin: '0 0 6px 0' }}>
                All Clear!
              </p>
              <p style={{ fontSize: 13, color: t.textSub, margin: 0 }}>
                No active alerts matching your filters
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => {
              const isCritical = alert.labels.severity === 'critical';
              const isPending = alert.state === 'pending';

              let leftBorderColor = t.warning;
              if (isPending) leftBorderColor = '#8b5cf6';
              else if (isCritical) leftBorderColor = t.error;

              return (
                <div
                  key={alert.fingerprint || index}
                  style={{
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderLeft: `4px solid ${leftBorderColor}`,
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      {severityIcon(alert.labels.severity || 'info')}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, margin: 0 }}>
                            {alert.labels.alertname}
                          </h3>
                          {/* State badge */}
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 9999,
                              fontSize: 11,
                              fontWeight: 500,
                              background: isPending ? 'rgba(139,92,246,0.12)' : t.errorBg,
                              color: isPending ? '#8b5cf6' : t.error,
                            }}
                          >
                            {alert.state}
                          </span>
                          {/* Severity badge */}
                          {alert.labels.severity && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 9999,
                                fontSize: 11,
                                fontWeight: 500,
                                background: isCritical
                                  ? t.errorBg
                                  : alert.labels.severity === 'warning'
                                  ? t.warningBg
                                  : t.infoBg,
                                color: isCritical
                                  ? t.error
                                  : alert.labels.severity === 'warning'
                                  ? t.warning
                                  : t.info,
                              }}
                            >
                              {alert.labels.severity}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: t.textSub, margin: '6px 0 8px 0' }}>
                          {alert.annotations.summary || alert.annotations.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                          {alert.labels.namespace && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                background: t.mainBg,
                                border: `1px solid ${t.cardBorder}`,
                                color: t.textSub,
                                fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                              }}
                            >
                              ns: {alert.labels.namespace}
                            </span>
                          )}
                          {alert.labels.pod && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                background: t.mainBg,
                                border: `1px solid ${t.cardBorder}`,
                                color: t.textSub,
                                fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                              }}
                            >
                              pod: {alert.labels.pod}
                            </span>
                          )}
                          {alert.labels.instance && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                background: t.mainBg,
                                border: `1px solid ${t.cardBorder}`,
                                color: t.textSub,
                                fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                              }}
                            >
                              {alert.labels.instance}
                            </span>
                          )}
                          {alert.active_at && (
                            <span style={{ fontSize: 11, color: t.textMuted }}>
                              Active {getRelativeTime(alert.active_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <SilenceButton alert={alert} onSilence={setSilenceModal} t={t} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Rules View */}
      {view === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ruleGroups.map((group) => (
            <div
              key={group.name}
              style={{
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => toggleGroup(group.name)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: t.mainBg,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {expandedGroups.has(group.name) ? (
                    <ChevronDownIcon style={{ width: 16, height: 16, color: t.textMuted }} />
                  ) : (
                    <ChevronRightIcon style={{ width: 16, height: 16, color: t.textMuted }} />
                  )}
                  <span style={{ fontWeight: 500, color: t.text, fontSize: 14 }}>{group.name}</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: 'rgba(139,92,246,0.12)',
                      color: '#8b5cf6',
                    }}
                  >
                    {group.rules.length} rules
                  </span>
                </div>
                <span style={{ fontSize: 12, color: t.textMuted, fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" }}>
                  {group.file}
                </span>
              </button>

              {expandedGroups.has(group.name) && (
                <div>
                  {group.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 16,
                        background: t.cardBg,
                        borderTop: `1px solid ${t.cardBorder}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <h4 style={{ fontWeight: 600, color: t.text, fontSize: 13, margin: 0 }}>
                              {rule.name}
                            </h4>
                            {rule.state && (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 9999,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background:
                                    rule.state === 'firing'
                                      ? t.errorBg
                                      : rule.state === 'pending'
                                      ? t.warningBg
                                      : t.successBg,
                                  color:
                                    rule.state === 'firing'
                                      ? t.error
                                      : rule.state === 'pending'
                                      ? t.warning
                                      : t.success,
                                }}
                              >
                                {rule.state}
                              </span>
                            )}
                            {rule.labels.severity && (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 9999,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background:
                                    rule.labels.severity === 'critical'
                                      ? t.errorBg
                                      : rule.labels.severity === 'warning'
                                      ? t.warningBg
                                      : t.infoBg,
                                  color:
                                    rule.labels.severity === 'critical'
                                      ? t.error
                                      : rule.labels.severity === 'warning'
                                      ? t.warning
                                      : t.info,
                                }}
                              >
                                {rule.labels.severity}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: t.textSub, margin: '6px 0 8px 0' }}>
                            {rule.annotations.summary || rule.annotations.description}
                          </p>
                          <code
                            style={{
                              display: 'block',
                              padding: '8px 12px',
                              background: t.mainBg,
                              border: `1px solid ${t.cardBorder}`,
                              borderRadius: 6,
                              fontSize: 11,
                              color: t.textSub,
                              fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                              wordBreak: 'break-all',
                            }}
                          >
                            {rule.query}
                          </code>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 12, color: t.textMuted }}>
                            <span>For: {rule.duration}</span>
                            {rule.alerts.length > 0 && (
                              <span style={{ color: t.error }}>{rule.alerts.length} firing</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Silences View */}
      {view === 'silences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {silences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <BellSlashIcon
                style={{ width: 56, height: 56, color: t.textMuted, margin: '0 auto 16px' }}
              />
              <p style={{ fontSize: 16, fontWeight: 500, color: t.text, margin: '0 0 6px 0' }}>
                No Active Silences
              </p>
              <p style={{ fontSize: 13, color: t.textSub, margin: 0 }}>
                Silence alerts from the Active Alerts tab
              </p>
            </div>
          ) : (
            silences.map((silence) => {
              const isActive = silence.status?.state === 'active';
              return (
                <div
                  key={silence.id}
                  style={{
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                    borderLeft: isActive ? '4px solid #8b5cf6' : `4px solid ${t.cardBorder}`,
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BellSlashIcon style={{ width: 18, height: 18, color: '#8b5cf6' }} />
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 9999,
                            fontSize: 11,
                            fontWeight: 500,
                            background: isActive ? 'rgba(139,92,246,0.12)' : t.mainBg,
                            color: isActive ? '#8b5cf6' : t.textMuted,
                            border: `1px solid ${t.cardBorder}`,
                          }}
                        >
                          {silence.status?.state || 'unknown'}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: t.textSub, margin: '8px 0' }}>
                        {silence.comment}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {silence.matchers.map((m, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              background: t.mainBg,
                              border: `1px solid ${t.cardBorder}`,
                              color: t.textSub,
                              fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                            }}
                          >
                            {m.name}={m.value}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: t.textMuted }}>
                        <span>By: {silence.created_by}</span>
                        <span>Ends: {new Date(silence.ends_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {isActive && (
                      <DeleteSilenceButton silenceId={silence.id} onDelete={handleDeleteSilence} t={t} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Silence Modal */}
      {silenceModal && (
        <SilenceModal
          alert={silenceModal}
          onClose={() => setSilenceModal(null)}
          onSilence={handleSilence}
        />
      )}
    </div>
  );
}

// Small helper button components to avoid inline hook-in-callback patterns
function SilenceButton({
  alert,
  onSilence,
  t,
}: {
  alert: Alert;
  onSilence: (alert: Alert) => void;
  t: ReturnType<typeof getThemeColors>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => onSilence(alert)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: hover ? t.mainBg : t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 8,
        color: t.textSub,
        fontSize: 12,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <BellSlashIcon style={{ width: 14, height: 14 }} />
      Silence
    </button>
  );
}

function DeleteSilenceButton({
  silenceId,
  onDelete,
  t,
}: {
  silenceId: string;
  onDelete: (id: string) => void;
  t: ReturnType<typeof getThemeColors>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => onDelete(silenceId)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flexShrink: 0,
        padding: 8,
        background: hover ? t.errorBg : 'transparent',
        border: 'none',
        borderRadius: 8,
        color: t.error,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.15s',
      }}
    >
      <XMarkIcon style={{ width: 18, height: 18 }} />
    </button>
  );
}
