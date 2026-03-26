import { useState, useEffect, useCallback } from 'react';
import { kubernetesApi } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useNamespace } from '../../contexts/NamespaceContext';
import { getThemeColors, mono } from '../../styles/linear-design';
import K8sHeader from '../kubernetes/K8sHeader';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  CubeIcon,
  ServerIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  DocumentTextIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';

// Types
interface K8sEvent {
  uid: string;
  name: string;
  namespace: string;
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  count: number;
  first_timestamp: string;
  last_timestamp: string;
  involved_object: {
    kind: string;
    name: string;
    namespace?: string;
  };
  source?: {
    component: string;
    host?: string;
  };
}

// Time formatting
function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

// Event Card Component
function EventCard({
  event,
  isExpanded,
  onToggle,
}: {
  event: K8sEvent;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const isWarning = event.type === 'Warning';
  const accentColor = isWarning ? t.warning : t.info;
  const iconBg = isWarning ? t.warningBg : t.infoBg;
  const Icon = isWarning ? ExclamationTriangleIcon : InformationCircleIcon;

  return (
    <div style={{
      background: t.cardBg,
      border: `1px solid ${t.cardBorder}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div
        style={{ padding: '12px 16px', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            padding: 8,
            borderRadius: 8,
            background: iconBg,
            flexShrink: 0,
          }}>
            <Icon style={{ width: 16, height: 16, color: accentColor }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 9999,
                background: iconBg,
                color: accentColor,
              }}>
                {event.type}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{event.reason}</span>
              {event.count > 1 && (
                <span style={{
                  padding: '1px 6px',
                  fontSize: 11,
                  background: t.cardBorder,
                  color: t.textSub,
                  borderRadius: 9999,
                }}>
                  x{event.count}
                </span>
              )}
            </div>
            <p style={{
              fontSize: 13,
              color: t.text,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {event.message}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 11, color: t.textMuted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CubeIcon style={{ width: 13, height: 13 }} />
                {event.involved_object.kind}/{event.involved_object.name}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ServerIcon style={{ width: 13, height: 13 }} />
                {event.namespace}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClockIcon style={{ width: 13, height: 13 }} />
                {formatTimeAgo(event.last_timestamp)}
              </span>
            </div>
          </div>
          <button style={{
            padding: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: t.textMuted,
          }}>
            {isExpanded ? (
              <ChevronDownIcon style={{ width: 18, height: 18 }} />
            ) : (
              <ChevronRightIcon style={{ width: 18, height: 18 }} />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.cardBorder}`, background: t.mainBg }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Full Message</div>
              <div style={{ fontSize: 12, color: t.text, lineHeight: 1.5 }}>{event.message}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>First Seen</div>
                <div style={{ fontSize: 12, color: t.text, ...mono }}>{formatTimestamp(event.first_timestamp)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Last Seen</div>
                <div style={{ fontSize: 12, color: t.text, ...mono }}>{formatTimestamp(event.last_timestamp)}</div>
              </div>
              {event.source && (
                <div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Source</div>
                  <div style={{ fontSize: 12, color: t.text }}>
                    {event.source.component}
                    {event.source.host && ` (${event.source.host})`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Filter Badge Component
function FilterBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      background: t.infoBg,
      color: t.info,
      fontSize: 11,
      fontWeight: 500,
      borderRadius: 9999,
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', padding: 0 }}
      >
        <XMarkIcon style={{ width: 12, height: 12 }} />
      </button>
    </span>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: typeof InformationCircleIcon;
  color: 'blue' | 'yellow' | 'red' | 'green';
  index: number;
}) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const colorMap = {
    blue: { bg: t.infoBg, text: t.info },
    yellow: { bg: t.warningBg, text: t.warning },
    red: { bg: t.errorBg, text: t.error },
    green: { bg: t.successBg, text: t.success },
  };
  const c = colorMap[color];

  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon style={{ width: 16, height: 16, color: c.text }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: c.text, lineHeight: 1, marginBottom: 2, ...mono }}>{value}</div>
        <div style={{ fontSize: 11, color: t.textMuted }}>{title}</div>
      </div>
    </div>
  );
}

// Main Component
export default function EventLogs() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const { selectedNamespace } = useNamespace();

  const [events, setEvents] = useState<K8sEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Normal' | 'Warning'>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const ns = selectedNamespace || undefined;
      const res = await kubernetesApi.getEvents(ns);

      if (res.data) {
        // Transform API response to our format
        const transformedEvents: K8sEvent[] = res.data.map((event: any) => ({
          uid: event.name + event.namespace,
          name: event.name,
          namespace: event.namespace,
          type: event.type || 'Normal',
          reason: event.reason,
          message: event.message,
          count: event.count || 1,
          first_timestamp: event.first_timestamp || new Date().toISOString(),
          last_timestamp: event.last_timestamp || new Date().toISOString(),
          involved_object: event.involved_object || { kind: 'Unknown', name: 'Unknown' },
          source: event.source,
        }));

        // Sort by last timestamp descending
        transformedEvents.sort((a, b) =>
          new Date(b.last_timestamp).getTime() - new Date(a.last_timestamp).getTime()
        );

        setEvents(transformedEvents);
      }
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [selectedNamespace]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadEvents, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadEvents]);

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (typeFilter !== 'all' && event.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        event.message.toLowerCase().includes(query) ||
        event.reason.toLowerCase().includes(query) ||
        event.involved_object.name.toLowerCase().includes(query) ||
        event.namespace.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: events.length,
    normal: events.filter((e) => e.type === 'Normal').length,
    warning: events.filter((e) => e.type === 'Warning').length,
    lastHour: events.filter((e) => {
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      return new Date(e.last_timestamp) > hourAgo;
    }).length,
  };

  // Toggle event expansion
  const toggleEvent = (uid: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  // Clear filters
  const hasActiveFilters = typeFilter !== 'all' || searchQuery !== '';

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px',
    background: t.mainBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    color: t.text,
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, overflow: 'hidden' }}>

      <K8sHeader
        title="Event Logs"
        subtitle="Real-time Kubernetes cluster events and notifications"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: `1px solid ${autoRefresh ? t.success + '60' : t.cardBorder}`, background: autoRefresh ? t.successBg : 'none', color: autoRefresh ? t.success : t.textSub, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
            >
              {autoRefresh ? (
                <>
                  <PauseIcon style={{ width: 12, height: 12 }} />
                  <span>Live</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.success, flexShrink: 0 }} />
                </>
              ) : (
                <>
                  <PlayIcon style={{ width: 12, height: 12 }} />
                  <span>Auto-refresh</span>
                </>
              )}
            </button>
            <button
              onClick={loadEvents}
              disabled={loading}
              style={{ background: 'none', border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '5px 8px', cursor: loading ? 'wait' : 'pointer', color: t.textSub, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              <ArrowPathIcon style={{ width: 12, height: 12 }} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        }
      />

      <main style={{ flex: 1, overflow: 'auto', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatsCard title="Total Events" value={stats.total} icon={DocumentTextIcon} color="blue" index={0} />
        <StatsCard title="Normal" value={stats.normal} icon={InformationCircleIcon} color="green" index={1} />
        <StatsCard title="Warnings" value={stats.warning} icon={ExclamationTriangleIcon} color="yellow" index={2} />
        <StatsCard title="Last Hour" value={stats.lastHour} icon={ClockIcon} color="blue" index={3} />
      </div>

      {/* Filters */}
      <div style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 10,
        padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MagnifyingGlassIcon style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: t.textMuted,
            }} />
            <input
              type="text"
              placeholder="Search events by message, reason, resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 34,
                paddingRight: 12,
                paddingTop: 7,
                paddingBottom: 7,
                background: t.mainBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 6,
                color: t.text,
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'Normal' | 'Warning')}
            style={selectStyle}
          >
            <option value="all">All Types</option>
            <option value="Normal">Normal</option>
            <option value="Warning">Warning</option>
          </select>

        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
            <FunnelIcon style={{ width: 14, height: 14, color: t.textMuted }} />
            <span style={{ fontSize: 11, color: t.textMuted }}>Active filters:</span>
            {typeFilter !== 'all' && (
              <FilterBadge label={`Type: ${typeFilter}`} onRemove={() => setTypeFilter('all')} />
            )}
            {searchQuery && (
              <FilterBadge label={`Search: "${searchQuery}"`} onRemove={() => setSearchQuery('')} />
            )}
          </div>
        )}
      </div>

      {/* Results Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: t.textSub }}>
        <span>Showing {filteredEvents.length} of {events.length} events</span>
        <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
      </div>

      {/* Events List */}
      {error ? (
        <div style={{
          background: t.errorBg,
          border: `1px solid rgba(239,68,68,0.2)`,
          borderRadius: 10,
          padding: 16,
          color: t.error,
        }}>
          <div style={{ fontSize: 12, marginBottom: 8 }}>{error}</div>
          <button
            onClick={loadEvents}
            style={{ fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: t.error, textDecoration: 'underline', padding: 0 }}
          >
            Retry
          </button>
        </div>
      ) : loading && events.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: t.textSub }}>
            <ArrowPathIcon style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Loading events...</span>
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 10,
          padding: 32,
          textAlign: 'center',
        }}>
          <DocumentTextIcon style={{ width: 48, height: 48, color: t.textMuted, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 4 }}>No events found</div>
          {hasActiveFilters && (
            <div style={{ fontSize: 12, color: t.textMuted }}>Try adjusting your filters</div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredEvents.map((event, index) => (
            <EventCard
              key={event.uid}
              event={event}
              isExpanded={expandedEvents.has(event.uid)}
              onToggle={() => toggleEvent(event.uid)}
              index={index}
            />
          ))}
        </div>
      )}
      </main>
    </div>
  );
}
