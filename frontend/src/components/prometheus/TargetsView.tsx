import { useState, useEffect, useCallback } from 'react';
import {
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { prometheusApi, getRelativeTime } from '../../services/prometheusApi';
import { logger } from '../../utils/logger';
import type { TargetGroup, ScrapeTarget, TargetsResponse } from '../../types/prometheus';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

const healthIcon = (health: string) => {
  switch (health.toLowerCase()) {
    case 'up':
      return <CheckCircleIcon style={{ width: 20, height: 20, color: '#22c55e' }} />;
    case 'down':
      return <XCircleIcon style={{ width: 20, height: 20, color: '#ef4444' }} />;
    default:
      return <QuestionMarkCircleIcon style={{ width: 20, height: 20, color: '#9ca3af' }} />;
  }
};

export default function TargetsView() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [downCount, setDownCount] = useState(0);
  const [refreshHover, setRefreshHover] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await prometheusApi.getTargets();
      const data = response.data as TargetsResponse;
      setTargetGroups(data.targets || []);
      setActiveCount(data.active_count || 0);
      setDownCount(data.down_count || 0);
      setError(null);

      // Auto-expand all jobs on first load
      if (expandedJobs.size === 0 && data.targets.length > 0) {
        setExpandedJobs(new Set(data.targets.map(tg => tg.job)));
      }
    } catch (err: unknown) {
      logger.error('Failed to fetch targets', err);
      setError('Failed to load scrape targets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [expandedJobs.size]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleJob = (jobName: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobName)) {
        newSet.delete(jobName);
      } else {
        newSet.add(jobName);
      }
      return newSet;
    });
  };

  // Filter targets
  const filteredGroups = targetGroups.map(group => {
    const filteredTargets = group.targets.filter(target => {
      const matchesSearch = searchQuery === '' ||
        target.instance.toLowerCase().includes(searchQuery.toLowerCase()) ||
        target.job.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(target.labels).some(v => v.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesHealth = healthFilter === 'all' || target.health === healthFilter;

      return matchesSearch && matchesHealth;
    });

    return {
      ...group,
      targets: filteredTargets,
      active_count: filteredTargets.filter(tg => tg.health === 'up').length,
      down_count: filteredTargets.filter(tg => tg.health === 'down').length,
    };
  }).filter(group => group.targets.length > 0);

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
            <ServerIcon style={{ width: 24, height: 24, color: '#8b5cf6' }} />
            Scrape Targets
          </h1>
          <p style={{ fontSize: 12, color: t.textSub, margin: '4px 0 0 0' }}>
            Monitor Prometheus scrape targets and their health status
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {/* Jobs */}
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
            <ServerIcon style={{ width: 28, height: 28, color: '#8b5cf6' }} />
            <div>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#8b5cf6',
                  margin: 0,
                  letterSpacing: -1,
                }}
              >
                {targetGroups.length}
              </p>
              <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>Jobs</p>
            </div>
          </div>
        </div>

        {/* Targets Up */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 16,
            borderTop: `3px solid ${t.success}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircleIcon style={{ width: 28, height: 28, color: t.success }} />
            <div>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: t.success,
                  margin: 0,
                  letterSpacing: -1,
                }}
              >
                {activeCount}
              </p>
              <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>Targets Up</p>
            </div>
          </div>
        </div>

        {/* Targets Down */}
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
            <XCircleIcon style={{ width: 28, height: 28, color: t.error }} />
            <div>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: t.error,
                  margin: 0,
                  letterSpacing: -1,
                }}
              >
                {downCount}
              </p>
              <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>Targets Down</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
            placeholder="Search targets..."
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
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
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
            <option value="all">All Health</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

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

      {/* Target Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <ServerIcon
              style={{ width: 56, height: 56, color: t.textMuted, margin: '0 auto 16px' }}
            />
            <p style={{ fontSize: 16, fontWeight: 500, color: t.text, margin: '0 0 6px 0' }}>
              No Targets Found
            </p>
            <p style={{ fontSize: 13, color: t.textSub, margin: 0 }}>
              {searchQuery || healthFilter !== 'all'
                ? 'No targets match your filters'
                : 'Prometheus is not scraping any targets'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.job}
              style={{
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Group header */}
              <button
                onClick={() => toggleJob(group.job)}
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
                  {expandedJobs.has(group.job) ? (
                    <ChevronDownIcon style={{ width: 16, height: 16, color: t.textMuted }} />
                  ) : (
                    <ChevronRightIcon style={{ width: 16, height: 16, color: t.textMuted }} />
                  )}
                  <ServerIcon style={{ width: 16, height: 16, color: '#8b5cf6' }} />
                  <span style={{ fontWeight: 500, color: t.text, fontSize: 14 }}>{group.job}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 500,
                      background: t.successBg,
                      color: t.success,
                    }}
                  >
                    <CheckCircleIcon style={{ width: 12, height: 12 }} />
                    {group.active_count} up
                  </span>
                  {group.down_count > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 500,
                        background: t.errorBg,
                        color: t.error,
                      }}
                    >
                      <XCircleIcon style={{ width: 12, height: 12 }} />
                      {group.down_count} down
                    </span>
                  )}
                </div>
              </button>

              {/* Target rows */}
              {expandedJobs.has(group.job) && (
                <div>
                  {group.targets.map((target, idx) => (
                    <TargetRow
                      key={`${target.instance}-${idx}`}
                      target={target}
                      isLast={idx === group.targets.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface TargetRowProps {
  target: ScrapeTarget;
  isLast?: boolean;
}

function TargetRow({ target, isLast }: TargetRowProps) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [expanded, setExpanded] = useState(false);
  const [rowHover, setRowHover] = useState(false);

  const isDown = target.health === 'down';

  return (
    <div
      style={{
        background: isDown
          ? theme === 'dark'
            ? 'rgba(239,68,68,0.04)'
            : 'rgba(239,68,68,0.03)'
          : t.cardBg,
        borderTop: `1px solid ${t.cardBorder}`,
        borderBottom: isLast ? 'none' : undefined,
      }}
    >
      {/* Main row */}
      <div
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setRowHover(true)}
        onMouseLeave={() => setRowHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          background: rowHover
            ? theme === 'dark'
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(0,0,0,0.02)'
            : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {healthIcon(target.health)}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontWeight: 500,
                  color: t.text,
                  fontSize: 13,
                  fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                }}
              >
                {target.instance}
              </span>
              {/* Health badge */}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 500,
                  background: isDown
                    ? t.errorBg
                    : target.health === 'up'
                    ? t.successBg
                    : t.cardBorder,
                  color: isDown
                    ? t.error
                    : target.health === 'up'
                    ? t.success
                    : t.textMuted,
                }}
              >
                {target.health}
              </span>
            </div>
            {target.last_error && (
              <p
                style={{
                  fontSize: 12,
                  color: t.error,
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />
                {target.last_error}
              </p>
            )}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 12,
            color: t.textSub,
          }}
        >
          {target.last_scrape && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ClockIcon style={{ width: 14, height: 14 }} />
              {getRelativeTime(target.last_scrape)}
            </span>
          )}
          {target.last_scrape_duration && (
            <span style={{ fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" }}>
              {(target.last_scrape_duration * 1000).toFixed(0)}ms
            </span>
          )}
          {expanded ? (
            <ChevronDownIcon style={{ width: 16, height: 16, color: t.textMuted }} />
          ) : (
            <ChevronRightIcon style={{ width: 16, height: 16, color: t.textMuted }} />
          )}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${t.cardBorder}`,
            padding: '16px 16px 16px 48px',
            background:
              theme === 'dark'
                ? 'rgba(255,255,255,0.02)'
                : 'rgba(0,0,0,0.015)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Scrape URL */}
          {target.scrape_url && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: t.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  margin: '0 0 6px 0',
                }}
              >
                Scrape URL
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlobeAltIcon style={{ width: 14, height: 14, color: t.textSub, flexShrink: 0 }} />
                <code
                  style={{
                    fontSize: 12,
                    color: t.text,
                    fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                    wordBreak: 'break-all',
                  }}
                >
                  {target.scrape_url}
                </code>
              </div>
            </div>
          )}

          {/* Labels */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: t.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                margin: '0 0 8px 0',
              }}
            >
              Labels
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(target.labels).map(([key, value]) => (
                <span
                  key={key}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    background: t.mainBg,
                    border: `1px solid ${t.cardBorder}`,
                    color: t.textSub,
                    fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                  }}
                >
                  <span style={{ color: '#8b5cf6' }}>{key}</span>
                  <span style={{ color: t.textMuted, margin: '0 2px' }}>=</span>
                  <span style={{ color: t.text }}>{value}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Timing info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              paddingTop: 12,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: t.textMuted,
                  margin: '0 0 4px 0',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Last Scrape
              </p>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.text,
                  margin: 0,
                  fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                }}
              >
                {target.last_scrape ? new Date(target.last_scrape).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: t.textMuted,
                  margin: '0 0 4px 0',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Scrape Duration
              </p>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.text,
                  margin: 0,
                  fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                }}
              >
                {target.last_scrape_duration
                  ? `${(target.last_scrape_duration * 1000).toFixed(2)}ms`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
