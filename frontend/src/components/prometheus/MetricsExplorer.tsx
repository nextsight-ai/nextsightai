import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  PlayIcon,
  ClockIcon,
  ChartBarIcon,
  TableCellsIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';
import { prometheusApi, getRelativeTime } from '../../services/prometheusApi';
import type { QueryResult, MetricSample, MetricMetadata, StackStatus } from '../../types/prometheus';

// Time range options
const TIME_RANGES = [
  { label: '15m', value: 15 * 60 },
  { label: '1h', value: 60 * 60 },
  { label: '3h', value: 3 * 60 * 60 },
  { label: '6h', value: 6 * 60 * 60 },
  { label: '12h', value: 12 * 60 * 60 },
  { label: '24h', value: 24 * 60 * 60 },
  { label: '2d', value: 2 * 24 * 60 * 60 },
  { label: '7d', value: 7 * 24 * 60 * 60 },
];

// Common PromQL queries
const EXAMPLE_QUERIES = [
  { label: 'CPU Usage by Pod', query: 'sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (pod)' },
  { label: 'Memory Usage by Pod', query: 'sum(container_memory_usage_bytes{container!=""}) by (pod)' },
  { label: 'Node CPU Usage', query: '100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)' },
  { label: 'Node Memory Usage', query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100' },
  { label: 'HTTP Request Rate', query: 'sum(rate(http_requests_total[5m])) by (method, status)' },
  { label: 'Pod Restart Count', query: 'sum(kube_pod_container_status_restarts_total) by (pod)' },
];

// Color palette for chart lines
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface ChartData {
  timestamp: number;
  [key: string]: number | string;
}

export default function MetricsExplorer() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [query, setQuery] = useState('');
  const [timeRange, setTimeRange] = useState(TIME_RANGES[1].value); // Default 1h
  const [step, setStep] = useState('60s');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [stackStatus, setStackStatus] = useState<StackStatus | null>(null);
  const [metrics, setMetrics] = useState<MetricMetadata[]>([]);
  const [showMetricBrowser, setShowMetricBrowser] = useState(false);
  const [metricSearch, setMetricSearch] = useState('');

  // Check Prometheus status on mount
  useEffect(() => {
    checkPrometheusStatus();
    loadMetrics();
  }, []);

  const checkPrometheusStatus = async () => {
    try {
      const response = await prometheusApi.getStackStatus();
      setStackStatus(response.data.status);
    } catch {
      setStackStatus('not_installed');
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await prometheusApi.getMetricMetadata();
      setMetrics(response.data.metrics);
    } catch {
      // Ignore error
    }
  };

  const executeQuery = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const now = new Date();
      const start = new Date(now.getTime() - timeRange * 1000);

      const response = await prometheusApi.queryRange({
        query: query.trim(),
        start: start.toISOString(),
        end: now.toISOString(),
        step,
      });

      setResult(response.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed';
      setResult({
        status: 'error',
        result_type: '',
        result: [],
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [query, timeRange, step]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      executeQuery();
    }
  };

  const selectMetric = (metricName: string) => {
    setQuery(metricName);
    setShowMetricBrowser(false);
  };

  const selectExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  // Transform query result to chart data
  const getChartData = (): ChartData[] => {
    if (!result || result.result_type !== 'matrix' || result.result.length === 0) {
      return [];
    }

    // Get all unique timestamps
    const timestampSet = new Set<number>();
    result.result.forEach((sample) => {
      sample.values?.forEach((v) => {
        timestampSet.add(v.timestamp);
      });
    });

    const timestamps = Array.from(timestampSet).sort((a, b) => a - b);

    // Build chart data
    return timestamps.map((ts) => {
      const dataPoint: ChartData = {
        timestamp: ts,
        time: new Date(ts * 1000).toLocaleTimeString(),
      };

      result.result.forEach((sample, idx) => {
        const label = getMetricLabel(sample, idx);
        const value = sample.values?.find((v) => v.timestamp === ts);
        dataPoint[label] = value ? parseFloat(value.value) : 0;
      });

      return dataPoint;
    });
  };

  // Get a label for a metric series
  const getMetricLabel = (sample: MetricSample, index: number): string => {
    const labels = sample.metric;
    if (Object.keys(labels).length === 0) {
      return `series-${index}`;
    }

    // Try common label combinations
    const labelParts: string[] = [];
    ['pod', 'container', 'instance', 'job', 'namespace', 'method', 'status'].forEach((key) => {
      if (labels[key]) {
        labelParts.push(`${key}=${labels[key]}`);
      }
    });

    if (labelParts.length === 0) {
      // Use first available label
      const firstKey = Object.keys(labels).find((k) => k !== '__name__');
      if (firstKey) {
        labelParts.push(`${firstKey}=${labels[firstKey]}`);
      }
    }

    return labelParts.join(', ') || `series-${index}`;
  };

  // Filter metrics for browser
  const filteredMetrics = metrics.filter((m) =>
    m.metric_name.toLowerCase().includes(metricSearch.toLowerCase()) ||
    m.help.toLowerCase().includes(metricSearch.toLowerCase())
  );

  const selectStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '4px 8px',
    color: t.text,
    fontSize: 11,
    cursor: 'pointer',
  };

  // If Prometheus is not installed, show message
  if (stackStatus === 'not_installed') {
    return (
      <div style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        padding: 20,
      }}>
        <div style={{ padding: 32, textAlign: 'center' }}>
          <ExclamationTriangleIcon style={{ width: 48, height: 48, color: t.warning, margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: t.text, marginBottom: 8 }}>
            Prometheus Not Installed
          </h3>
          <p style={{ color: t.textSub, marginBottom: 16 }}>
            Please deploy the Prometheus stack first to use the Metrics Explorer.
          </p>
          <a
            href="/monitoring/prometheus/setup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: t.info,
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Deploy Prometheus
          </a>
        </div>
      </div>
    );
  }

  const chartData = getChartData();
  const seriesLabels = result?.result.map((sample, idx) => getMetricLabel(sample, idx)) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Query Input */}
      <div style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <MagnifyingGlassIcon style={{ width: 20, height: 20, color: t.textMuted }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: t.text }}>PromQL Query</h3>
        </div>

        {/* Query Editor */}
        <div style={{ position: 'relative' }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter PromQL query... (Ctrl+Enter to execute)"
            style={{
              width: '100%',
              height: 96,
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 8,
              padding: '8px 40px 8px 12px',
              color: t.text,
              fontSize: 13,
              fontFamily: mono.fontFamily,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => setShowMetricBrowser(!showMetricBrowser)}
            title="Browse metrics"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: t.textMuted,
            }}
          >
            <ChartBarIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 16 }}>
          {/* Time Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockIcon style={{ width: 16, height: 16, color: t.textMuted }} />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(parseInt(e.target.value))}
              style={selectStyle}
            >
              {TIME_RANGES.map((range) => (
                <option key={range.label} value={range.value}>
                  Last {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Step */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: t.textSub }}>Step:</span>
            <select
              value={step}
              onChange={(e) => setStep(e.target.value)}
              style={selectStyle}
            >
              <option value="15s">15s</option>
              <option value="30s">30s</option>
              <option value="60s">1m</option>
              <option value="300s">5m</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: 3,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 8,
          }}>
            <button
              onClick={() => setViewMode('chart')}
              title="Chart view"
              style={{
                padding: 6,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'chart' ? t.info : 'transparent',
                color: viewMode === 'chart' ? '#fff' : t.textMuted,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ChartBarIcon style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table view"
              style={{
                padding: 6,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'table' ? t.info : 'transparent',
                color: viewMode === 'table' ? '#fff' : t.textMuted,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <TableCellsIcon style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <div style={{ flex: 1 }} />

          {/* Execute Button */}
          <button
            onClick={executeQuery}
            disabled={loading || !query.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: t.info,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !query.trim() ? 0.5 : 1,
            }}
          >
            {loading ? (
              <ArrowPathIcon style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            ) : (
              <PlayIcon style={{ width: 16, height: 16 }} />
            )}
            Execute
          </button>
        </div>

        {/* Example Queries */}
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${t.cardBorder}`,
        }}>
          <p style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>Example queries:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXAMPLE_QUERIES.map((eq) => (
              <button
                key={eq.label}
                onClick={() => selectExampleQuery(eq.query)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 6,
                  color: t.textSub,
                  cursor: 'pointer',
                }}
              >
                {eq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Browser Modal */}
      {showMetricBrowser && (
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
          onClick={() => setShowMetricBrowser(false)}
        >
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12,
              width: '100%',
              maxWidth: 640,
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: 16,
              borderBottom: `1px solid ${t.cardBorder}`,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 8 }}>Metric Browser</h3>
              <input
                type="text"
                value={metricSearch}
                onChange={(e) => setMetricSearch(e.target.value)}
                placeholder="Search metrics..."
                autoFocus
                style={{
                  width: '100%',
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: t.text,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              {filteredMetrics.length === 0 ? (
                <p style={{ color: t.textMuted, textAlign: 'center', padding: '16px 0' }}>No metrics found</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredMetrics.slice(0, 100).map((metric) => {
                    const typeBadgeStyle: React.CSSProperties = {
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '2px 8px',
                      fontSize: 10,
                      borderRadius: 4,
                      ...(metric.type === 'counter'
                        ? { background: 'rgba(59,130,246,0.15)', color: '#60A5FA' }
                        : metric.type === 'gauge'
                        ? { background: 'rgba(34,197,94,0.15)', color: '#4ADE80' }
                        : metric.type === 'histogram'
                        ? { background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }
                        : { background: t.cardBorder, color: t.textSub }),
                    };
                    return (
                      <button
                        key={metric.metric_name}
                        onClick={() => selectMetric(metric.metric_name)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: 12,
                          borderRadius: 8,
                          border: `1px solid ${t.cardBorder}`,
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <p style={{ ...mono, fontSize: 13, color: t.text }}>
                          {metric.metric_name}
                        </p>
                        <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {metric.help}
                        </p>
                        <span style={typeBadgeStyle}>{metric.type}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 12,
          padding: 20,
        }}>
          {result.status === 'error' ? (
            <div style={{
              padding: 16,
              background: 'rgba(239,68,68,0.1)',
              border: `1px solid rgba(239,68,68,0.2)`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <ExclamationTriangleIcon style={{ width: 20, height: 20, color: t.error, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 500, color: t.error }}>Query Error</p>
                  <p style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>{result.error}</p>
                </div>
              </div>
            </div>
          ) : result.result.length === 0 ? (
            <div style={{
              padding: 16,
              background: t.cardBg,
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <InformationCircleIcon style={{ width: 32, height: 32, color: t.textMuted, margin: '0 auto 8px' }} />
              <p style={{ color: t.textSub }}>No data returned for this query</p>
            </div>
          ) : viewMode === 'chart' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h4 style={{ fontWeight: 500, color: t.text, fontSize: 14 }}>
                  {result.result.length} series returned
                </h4>
                <span style={{ fontSize: 11, color: t.textMuted }}>
                  {chartData.length} data points
                </span>
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickLine={{ stroke: '#4b5563' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickLine={{ stroke: '#4b5563' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}G`;
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                        return value.toFixed(2);
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {seriesLabels.slice(0, 10).map((label, idx) => (
                      <Line
                        key={label}
                        type="monotone"
                        dataKey={label}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {seriesLabels.length > 10 && (
                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 8, textAlign: 'center' }}>
                  Showing first 10 of {seriesLabels.length} series
                </p>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: t.textSub }}>Labels</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: t.textSub }}>Value</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 500, color: t.textSub }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {result.result.map((sample, idx) => {
                    const lastValue = sample.values?.[sample.values.length - 1] || sample.value;
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                        <td style={{ padding: '8px 12px' }}>
                          <code style={{ fontSize: 11, color: t.textSub, ...mono }}>
                            {JSON.stringify(sample.metric)}
                          </code>
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', ...mono, color: t.text }}>
                          {lastValue ? parseFloat(lastValue.value).toFixed(4) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', color: t.textMuted }}>
                          {lastValue ? getRelativeTime(new Date(lastValue.timestamp * 1000)) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
