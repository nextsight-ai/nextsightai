import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as yaml from 'js-yaml';
import type { HelmChartSearchResult } from '../../types';
import {
  CubeIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  DocumentTextIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CodeBracketIcon,
  SparklesIcon,
  CloudArrowUpIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';
import { useNamespace } from '../../contexts/NamespaceContext';
import { useCluster } from '../../contexts/ClusterContext';
import K8sHeader from '../kubernetes/K8sHeader';


type TabType = 'values' | 'rendered' | 'diff' | 'history';
type ChartSourceType = 'repository' | 'uploaded' | 'private';

interface ChartMetadata {
  name: string;
  version: string;
  appVersion: string;
  description: string;
  maintainers: string;
}

interface ReleaseHistoryItem {
  version: string;
  status: 'Success' | 'Failed' | 'Pending';
  time: string;
}

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  ts: Date;
}

const mockCharts: HelmChartSearchResult[] = [
  { name: 'nginx', version: '15.0.2', app_version: '1.25.1', repository: 'bitnami', description: 'Fast, reliable NGINX chart for web serving and reverse proxy' },
  { name: 'postgresql', version: '12.2.3', app_version: '15.2.0', repository: 'bitnami', description: 'PostgreSQL database chart with replication support' },
  { name: 'kube-prometheus-stack', version: '56.2.3', app_version: '0.72.0', repository: 'prometheus-community', description: 'Complete monitoring stack with Prometheus, Grafana, and Alert Manager' },
  { name: 'redis', version: '17.9.4', app_version: '7.0.11', repository: 'bitnami', description: 'Redis in-memory data structure store' },
  { name: 'mysql', version: '9.7.1', app_version: '8.0.32', repository: 'bitnami', description: 'MySQL relational database management system' },
];

const mockMetadata: ChartMetadata = {
  name: 'nginx',
  version: '15.0.2',
  appVersion: '1.23.1',
  description: 'NGINX Open Source is a web server that can be also used as a reverse proxy, load balancer, and HTTP cache.',
  maintainers: 'Bitnami',
};

const mockReleaseHistory: ReleaseHistoryItem[] = [
  { version: 'v1.0.3', status: 'Success', time: '5h ago' },
  { version: 'v1.0.2', status: 'Failed',  time: '1d ago' },
  { version: 'v1.0.1', status: 'Success', time: '3d ago' },
];

const DEFAULT_VALUES = `# Default values
replicaCount: 2

image:
  repository: nginx
  tag: stable
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi
`;

export default function HelmDeploy() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const { selectedNamespace } = useNamespace();
  const { activeCluster } = useCluster();

  const [activeTab, setActiveTab] = useState<TabType>('values');
  const [chartSource, setChartSource] = useState<ChartSourceType>('repository');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartSearchResults, setChartSearchResults] = useState<HelmChartSearchResult[]>(mockCharts);
  const [selectedChart, setSelectedChart] = useState<HelmChartSearchResult | null>(null);
  const [valuesYaml, setValuesYaml] = useState(DEFAULT_VALUES);
  const [renderedOutput, setRenderedOutput] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingCharts, setSearchingCharts] = useState(false);
  const [releaseName, setReleaseName] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight }); }, [logs]);

  useEffect(() => {
    try { setRenderedOutput(yaml.loadAll(valuesYaml) as any[]); }
    catch { setRenderedOutput([]); }
  }, [valuesYaml]);

  const addLog = (type: LogEntry['type'], message: string) =>
    setLogs(p => [...p, { type, message, ts: new Date() }]);

  const logColor = (type: LogEntry['type']) =>
    type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#eab308' : '#60a5fa';

  const handleSearch = () => {
    if (!searchQuery.trim()) { setChartSearchResults(mockCharts); return; }
    setSearchingCharts(true);
    setTimeout(() => {
      setChartSearchResults(mockCharts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      ));
      setSearchingCharts(false);
    }, 400);
  };

  const handleInstall = () => {
    if (!selectedChart) return;
    setLoading(true);
    const name = releaseName || selectedChart.name;
    addLog('info', `Installing ${selectedChart.repository}/${selectedChart.name} as "${name}" in ${selectedNamespace || 'default'}…`);
    setTimeout(() => {
      addLog('success', `Release "${name}" installed successfully ✓`);
      addLog('success', `  Deployment/${name} — created`);
      addLog('success', `  Service/${name} — created`);
      setLoading(false);
    }, 1500);
  };

  const handleUpgrade = () => {
    if (!selectedChart) return;
    setLoading(true);
    const name = releaseName || selectedChart.name;
    addLog('info', `Upgrading release "${name}" to v${selectedChart.version}…`);
    setTimeout(() => {
      addLog('success', `Release "${name}" upgraded successfully ✓`);
      setLoading(false);
    }, 1500);
  };

  const handleRollback = () => {
    setLoading(true);
    addLog('warning', 'Rolling back to previous revision…');
    setTimeout(() => {
      addLog('success', 'Rollback completed ✓');
      setLoading(false);
    }, 1200);
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  const tabBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
    background: active ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
    color: active ? t.text : t.textMuted, fontSize: 11, fontWeight: active ? 500 : 400,
  });

  const sideBtn = (variant: 'default' | 'primary' | 'danger' = 'default'): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 6, width: '100%', cursor: 'pointer',
    fontSize: 11, fontWeight: 500, transition: 'all 0.1s',
    ...(variant === 'primary' ? {
      border: 'none',
      background: loading || !selectedChart ? (isDark ? 'rgba(59,130,246,0.4)' : '#93C5FD') : '#3b82f6',
      color: '#fff',
      boxShadow: loading || !selectedChart ? 'none' : '0 2px 8px rgba(59,130,246,0.35)',
    } : variant === 'danger' ? {
      border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.4)'}`,
      background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
      color: '#ef4444',
    } : {
      border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`,
      background: isDark ? t.navHoverBg : '#F9FAFB',
      color: isDark ? t.textSub : '#374151',
    }),
  });

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`,
    borderRadius: 6,
    padding: '5px 9px',
    color: t.text,
    fontSize: 11,
    outline: 'none',
    width: '100%',
    ...mono,
  };

  const tabs = [
    { id: 'values'   as TabType, label: 'Values',    Icon: DocumentTextIcon },
    { id: 'rendered' as TabType, label: 'Rendered',  Icon: EyeIcon },
    { id: 'diff'     as TabType, label: 'Diff',      Icon: CodeBracketIcon },
    { id: 'history'  as TabType, label: 'History',   Icon: ClockIcon },
  ];

  const releaseNamePlaceholder = selectedChart ? selectedChart.name : 'release-name';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 68px)', overflow: 'hidden', color: t.text }}>

      <K8sHeader
        title="Helm Deploy"
        subtitle="Install and manage Helm charts"
        rightContent={
          selectedChart ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, borderRadius: 6 }}>
              <CubeIcon style={{ width: 11, height: 11, color: '#3b82f6' }} />
              <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 500, ...mono }}>{selectedChart.repository}/{selectedChart.name} v{selectedChart.version}</span>
            </div>
          ) : undefined
        }
      />

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left: Chart list ── */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${t.cardBorder}`, flexShrink: 0 }}>

          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: t.textMuted }} />
              <input
                type="text"
                placeholder="Search charts…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ ...inputStyle, paddingLeft: 26 }}
              />
            </div>
          </div>

          {/* Source tabs */}
          <div style={{ display: 'flex', gap: 2, padding: '6px 10px', borderBottom: `1px solid ${t.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', flexShrink: 0 }}>
            {(['repository', 'uploaded', 'private'] as ChartSourceType[]).map(src => (
              <button
                key={src}
                onClick={() => setChartSource(src)}
                style={{
                  flex: 1, padding: '3px 6px', borderRadius: 5, fontSize: 10, fontWeight: 500,
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  background: chartSource === src ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
                  color: chartSource === src ? t.text : t.textMuted,
                }}
              >
                {src}
              </button>
            ))}
          </div>

          {/* Chart cards */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {searchingCharts ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
                <ArrowPathIcon style={{ width: 18, height: 18, color: t.textMuted, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : chartSearchResults.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 40, color: t.textMuted, fontSize: 12 }}>No charts found</div>
            ) : chartSearchResults.map(chart => {
              const isSelected = selectedChart?.name === chart.name;
              return (
                <div
                  key={`${chart.repository}-${chart.name}`}
                  onClick={() => setSelectedChart(chart)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${isSelected ? '#3b82f6' : (isDark ? t.cardBorder : '#D1D5DB')}`,
                    background: isSelected ? (isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF') : (isDark ? t.cardBg : '#FAFAFA'),
                    transition: 'border-color 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: isSelected ? '#3b82f6' : (isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CubeIcon style={{ width: 11, height: 11, color: isSelected ? '#fff' : '#3b82f6' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chart.name}
                      </div>
                      <div style={{ fontSize: 9, color: t.textMuted, ...mono }}>{chart.repository} · v{chart.version}</div>
                    </div>
                    {isSelected && <CheckIcon style={{ width: 11, height: 11, color: '#3b82f6', flexShrink: 0, marginLeft: 'auto' }} />}
                  </div>
                  <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                    {chart.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upload footer */}
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${t.cardBorder}`, flexShrink: 0 }}>
            <button style={{ ...sideBtn(), justifyContent: 'flex-start' }}>
              <CloudArrowUpIcon style={{ width: 12, height: 12 }} />
              Upload Chart (.tgz)
            </button>
          </div>
        </div>

        {/* ── Center: Editor + tabs ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: `1px solid ${t.cardBorder}` }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2, padding: '0 14px',
            height: 38, borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0,
            background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
          }}>
            {tabs.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={tabBtn(activeTab === id)}>
                <Icon style={{ width: 12, height: 12 }} />
                {label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: 10, color: t.textMuted }}>
              {activeTab === 'values' && valuesYaml.split('\n').length + ' lines'}
              {activeTab === 'rendered' && renderedOutput.length > 0 && `${renderedOutput.filter(Boolean).length} docs`}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {activeTab === 'values' && (
              <Editor
                height="100%"
                defaultLanguage="yaml"
                value={valuesYaml}
                onChange={v => setValuesYaml(v || '')}
                theme={isDark ? 'vs-dark' : 'light'}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12.5,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                  lineHeight: 1.75,
                  padding: { top: 12 },
                  renderLineHighlight: 'gutter',
                }}
              />
            )}

            {activeTab === 'rendered' && (
              <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
                {renderedOutput.filter(Boolean).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {renderedOutput.filter(Boolean).map((doc, idx) => (
                      <div key={idx} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: `1px solid ${t.cardBorder}` }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE', color: '#3b82f6', fontWeight: 700 }}>
                            Doc {idx + 1}
                          </span>
                          {doc?.kind && <span style={{ fontSize: 11, fontWeight: 500, color: t.text }}>{doc.kind}</span>}
                          {doc?.metadata?.name && <span style={{ fontSize: 11, color: t.textMuted, ...mono }}>{doc.metadata.name}</span>}
                        </div>
                        <pre style={{ margin: 0, padding: '12px 14px', fontSize: 11, color: t.textSub, ...mono, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
                          {JSON.stringify(doc, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <EyeIcon style={{ width: 32, height: 32, color: t.textMuted }} />
                    <span style={{ fontSize: 12, color: t.textMuted }}>Enter valid YAML to render templates</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diff' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: isDark ? 'rgba(234,179,8,0.1)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(234,179,8,0.2)' : '#FDE68A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CodeBracketIcon style={{ width: 22, height: 22, color: '#eab308' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Diff vs live release</span>
                <span style={{ fontSize: 11, color: t.textMuted, textAlign: 'center', maxWidth: 340 }}>
                  Select a chart and install/upgrade to compare local values with the deployed release.
                </span>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['Side-by-side', 'Inline diff'].map(label => (
                    <div key={label} style={{ padding: '5px 12px', borderRadius: 6, background: t.cardBg, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, fontSize: 11, color: t.textSub }}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
                <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 4 }}>Release History</div>
                  {mockReleaseHistory.map((release, idx) => (
                    <div
                      key={idx}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 9, background: t.cardBg, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}` }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {release.status === 'Success' && <CheckCircleIcon style={{ width: 14, height: 14, color: t.success }} />}
                        {release.status === 'Failed'  && <XCircleIcon     style={{ width: 14, height: 14, color: t.error   }} />}
                        {release.status === 'Pending' && <ExclamationTriangleIcon style={{ width: 14, height: 14, color: t.warning }} />}
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.text, ...mono }}>{release.version}</span>
                        <span style={{ fontSize: 10, color: t.textMuted }}>{release.time}</span>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        textTransform: 'uppercase', letterSpacing: 0.3,
                        background: release.status === 'Success' ? (isDark ? 'rgba(34,197,94,0.12)' : '#F0FDF4') : release.status === 'Failed' ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : (isDark ? 'rgba(234,179,8,0.12)' : '#FFFBEB'),
                        color: release.status === 'Success' ? t.success : release.status === 'Failed' ? t.error : t.warning,
                        border: `1px solid ${release.status === 'Success' ? (isDark ? 'rgba(34,197,94,0.2)' : '#BBF7D0') : release.status === 'Failed' ? (isDark ? 'rgba(239,68,68,0.2)' : '#FECACA') : (isDark ? 'rgba(234,179,8,0.2)' : '#FDE68A')}`,
                      }}>
                        {release.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Right: Actions sidebar ── */}
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* Header */}
          <div style={{ padding: '0 14px', height: 38, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Actions</span>
            {selectedChart && (
              <span style={{ marginLeft: 'auto', fontSize: 9, color: t.textMuted, ...mono }}>v{selectedChart.version}</span>
            )}
          </div>

          {/* Scrollable middle */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

            {/* Chart metadata */}
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.cardBorder}` }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 }}>Chart</div>
              {selectedChart ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Name',       value: selectedChart.name },
                    { label: 'Repo',       value: selectedChart.repository },
                    { label: 'Version',    value: `v${selectedChart.version}` },
                    { label: 'App Ver',    value: `v${selectedChart.app_version}` },
                    { label: 'Maintainer', value: mockMetadata.maintainers },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 9, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600, flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: 10, color: t.text, ...mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, lineHeight: 1.5 }}>{mockMetadata.description}</div>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: t.textMuted, textAlign: 'center', padding: '12px 0' }}>Select a chart</div>
              )}
            </div>

            {/* AI tip */}
            {selectedChart && (
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.cardBorder}` }}>
                <div style={{ padding: '8px 10px', borderRadius: 7, background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.06)', border: `1px solid ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.25)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <SparklesIcon style={{ width: 11, height: 11, color: isDark ? '#a78bfa' : '#7c3aed' }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: isDark ? '#a78bfa' : '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Tip</span>
                  </div>
                  <div style={{ fontSize: 10, color: t.textSub, lineHeight: 1.5 }}>
                    Set resource limits for production. Consider HPA for auto-scaling.
                  </div>
                </div>
              </div>
            )}

            {/* Console */}
            <div style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Console</span>
                {logs.length > 0 && (
                  <button onClick={() => setLogs([])} style={{ fontSize: 9, color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                )}
              </div>
              <div ref={logsRef} style={{ background: isDark ? '#070810' : '#F3F4F6', borderRadius: 6, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, padding: '7px 9px', maxHeight: 120, overflowY: 'auto', ...mono, fontSize: 9.5, lineHeight: 1.6 }}>
                {logs.length === 0 ? (
                  <span style={{ color: t.textMuted }}>Ready — waiting for input.</span>
                ) : logs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 2 }}>
                    <span style={{ color: t.textMuted, flexShrink: 0, fontSize: 9 }}>
                      {log.ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span style={{ color: logColor(log.type), wordBreak: 'break-word' }}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* end scrollable */}

          {/* Deploy pinned at bottom */}
          <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${t.cardBorder}`, flexShrink: 0 }}>
            {/* Target */}
            <div style={{ marginBottom: 8, padding: '7px 10px', background: isDark ? 'rgba(255,255,255,0.03)' : '#F3F4F6', borderRadius: 7, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Cluster</span>
                <span style={{ fontSize: 10, color: '#16a34a', ...mono, fontWeight: 600, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeCluster?.name || 'default'}</span>
              </div>
              <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.05)' : '#E5E7EB' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Namespace</span>
                <span style={{ fontSize: 10, color: isDark ? '#60a5fa' : '#2563eb', ...mono, fontWeight: 600 }}>{selectedNamespace || 'default'}</span>
              </div>
            </div>

            {/* Release name input */}
            <input
              type="text"
              placeholder={releaseNamePlaceholder}
              value={releaseName}
              onChange={e => setReleaseName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 7, fontSize: 10, padding: '5px 9px' }}
            />

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={handleUpgrade} disabled={loading || !selectedChart}
                  style={{ ...sideBtn(), flex: 1, opacity: loading || !selectedChart ? 0.45 : 1, fontSize: 10 }}>
                  <ArrowUpTrayIcon style={{ width: 11, height: 11 }} /> Upgrade
                </button>
                <button onClick={handleRollback} disabled={loading}
                  style={{ ...sideBtn('danger'), flex: 1, opacity: loading ? 0.45 : 1, fontSize: 10 }}>
                  <ArrowUturnLeftIcon style={{ width: 11, height: 11 }} /> Rollback
                </button>
              </div>
              <button onClick={handleInstall} disabled={loading || !selectedChart}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '9px 12px', borderRadius: 7, width: '100%', cursor: 'pointer',
                  border: 'none',
                  background: loading || !selectedChart ? (isDark ? 'rgba(59,130,246,0.4)' : '#93C5FD') : '#3b82f6',
                  color: '#fff', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  boxShadow: loading || !selectedChart ? 'none' : '0 2px 8px rgba(59,130,246,0.35)',
                }}>
                {loading
                  ? <><ArrowPathIcon style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Installing…</>
                  : <><RocketLaunchIcon style={{ width: 13, height: 13 }} /> Install</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
