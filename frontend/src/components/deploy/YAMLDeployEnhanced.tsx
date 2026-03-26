import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as yaml from 'js-yaml';
import { kubernetesApi, aiApi } from '../../services/api';
import { logger } from '../../utils/logger';
import {
  PlayIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  SparklesIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BeakerIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import { useNamespace } from '../../contexts/NamespaceContext';
import { useCluster } from '../../contexts/ClusterContext';
import K8sHeader from '../kubernetes/K8sHeader';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

type EditorTab = 'editor' | 'preview' | 'diff' | 'ai-review';

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  ts: Date;
}

interface AIReview {
  score: number;
  securityScore: number;
  bestPracticeScore: number;
  issues: Array<{ severity: 'critical' | 'high' | 'medium' | 'low'; type: string; message: string; suggestion?: string }>;
  suggestions: string[];
}

interface DeploySummary {
  success: boolean;
  duration: number;
  resources: Array<{ kind: string; name: string; namespace?: string; status: 'created' | 'updated' | 'unchanged' }>;
}

const SAMPLE_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi`;

const SK = { content: 'nextsight_yaml_content' };

export default function YAMLDeployEnhanced() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const { selectedNamespace } = useNamespace();
  const { activeCluster } = useCluster();

  const [editorTab, setEditorTab] = useState<EditorTab>('editor');
  const [yaml_content, setYamlContent] = useState(() => localStorage.getItem(SK.content) || '');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [aiReview, setAiReview] = useState<AIReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [deployedYAML, setDeployedYAML] = useState('');
  const [fetchingDiff, setFetchingDiff] = useState(false);
  const [summary, setSummary] = useState<DeploySummary | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(SK.content, yaml_content); }, [yaml_content]);
  useEffect(() => { logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight }); }, [logs]);
  useEffect(() => {
    if (!yaml_content.trim()) { setParsed(null); return; }
    try { setParsed(yaml.loadAll(yaml_content) as any[]); } catch { setParsed(null); }
  }, [yaml_content]);

  const addLog = (type: LogEntry['type'], message: string) =>
    setLogs(p => [...p, { type, message, ts: new Date() }]);

  async function handleApply(dryRun: boolean) {
    if (!yaml_content.trim()) { addLog('error', 'No YAML content'); return; }
    setLoading(true);
    const t0 = Date.now();
    addLog('info', dryRun ? 'Validating manifest…' : `Deploying to ${selectedNamespace || 'default'}…`);
    try {
      const res = await kubernetesApi.applyYAML({
        yaml_content,
        namespace: selectedNamespace || 'default',
        dry_run: dryRun,
      });
      const dur = Date.now() - t0;
      if (res.data.success) {
        addLog('success', dryRun ? 'Validation passed ✓' : `Deployed in ${(dur / 1000).toFixed(2)}s`);
        res.data.resources?.forEach((r: any) => addLog('success', `  ${r.kind}/${r.name} — ${r.action}`));
        if (!dryRun && res.data.resources) {
          setSummary({
            success: true,
            duration: dur,
            resources: res.data.resources.map((r: any) => ({
              kind: r.kind, name: r.name, namespace: r.namespace, status: r.action,
            })),
          });
        }
      } else {
        addLog('error', res.data.message || 'Deploy failed');
        res.data.errors?.forEach((e: string) => addLog('error', `  ${e}`));
      }
    } catch (e: any) {
      addLog('error', e?.message || 'Request failed');
    } finally { setLoading(false); }
  }

  async function handleAIReview() {
    if (!yaml_content.trim()) return;
    setReviewing(true);
    setEditorTab('ai-review');
    addLog('info', 'AI analyzing YAML…');
    try {
      const res = await aiApi.yamlReview({ yaml_content, namespace: selectedNamespace || undefined });
      if (res.data.success) {
        setAiReview({
          score: res.data.score,
          securityScore: res.data.security_score,
          bestPracticeScore: res.data.best_practice_score,
          issues: res.data.issues,
          suggestions: res.data.suggestions,
        });
        addLog('success', `AI review complete — score ${res.data.score}/100`);
      } else { addLog('error', 'AI review failed'); }
    } catch (e: any) { addLog('error', `AI review unavailable: ${e?.message}`); }
    finally { setReviewing(false); }
  }

  async function handleFetchDiff() {
    if (!parsed?.length) return;
    setFetchingDiff(true);
    setEditorTab('diff');
    addLog('info', 'Fetching live cluster state…');
    try {
      const parts: string[] = [];
      for (const doc of parsed) {
        if (!doc?.kind || !doc?.metadata?.name) continue;
        try {
          const r = await kubernetesApi.getResourceYAML({
            kind: doc.kind, name: doc.metadata.name,
            namespace: doc.metadata.namespace || selectedNamespace || undefined,
          });
          if (r.data.yaml_content) parts.push(r.data.yaml_content);
        } catch {
          parts.push(`# Not found: ${doc.kind}/${doc.metadata.name}`);
        }
      }
      setDeployedYAML(parts.join('\n---\n'));
      addLog('success', `Fetched ${parts.length} resource(s)`);
    } catch (e) {
      logger.error('Fetch diff failed', e);
      addLog('error', 'Failed to fetch live state');
    } finally { setFetchingDiff(false); }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setYamlContent(ev.target?.result as string);
      addLog('info', `Loaded: ${file.name}`);
    };
    reader.readAsText(file);
  }

  function exportYAML() {
    if (!yaml_content.trim()) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([yaml_content], { type: 'text/yaml' }));
    a.download = `manifest-${Date.now()}.yaml`;
    a.click();
    addLog('success', `Exported ${a.download}`);
  }

  // ── styles ──────────────────────────────────────────────────────────────────

  const btn = (active = false, danger = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 6,
    border: danger ? '1px solid rgba(239,68,68,0.4)' : active ? 'none' : `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`,
    background: active ? '#3b82f6' : danger ? (isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)') : (isDark ? t.navHoverBg : '#F9FAFB'),
    color: active ? '#fff' : danger ? '#ef4444' : (isDark ? t.text : '#1F2937'),
    fontSize: 11, fontWeight: 500, cursor: 'pointer', width: '100%',
    transition: 'all 0.1s',
  });

  const severityColor = (s: string) =>
    s === 'critical' ? '#ef4444' : s === 'high' ? '#f97316' : s === 'medium' ? '#eab308' : '#22c55e';

  const logColor = (type: LogEntry['type']) =>
    type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#eab308' : '#60a5fa';

  const lineCount = yaml_content.split('\n').length;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 68px)', overflow: 'hidden', color: t.text }}>

      <K8sHeader
        title="YAML Deploy"
        subtitle="Deploy Kubernetes manifests · AI-powered review"
        rightContent={
          parsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6 }}>
              <CheckCircleIcon style={{ width: 11, height: 11, color: '#22c55e' }} />
              <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 500 }}>{parsed.length} resource{parsed.length !== 1 ? 's' : ''} parsed</span>
            </div>
          ) : yaml_content.trim() ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6 }}>
              <ExclamationTriangleIcon style={{ width: 11, height: 11, color: '#ef4444' }} />
              <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 500 }}>Invalid YAML</span>
            </div>
          ) : undefined
        }
      />

      {/* ── 3-column body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Editor area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: `1px solid ${t.cardBorder}` }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2, padding: '0 14px',
            height: 38, borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0,
            background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
          }}>
            {([
              { id: 'editor',    label: 'Editor',    Icon: CodeBracketIcon },
              { id: 'preview',   label: 'Preview',   Icon: EyeIcon },
              { id: 'diff',      label: 'Diff',      Icon: ArrowPathIcon },
              { id: 'ai-review', label: 'AI Review', Icon: SparklesIcon },
            ] as { id: EditorTab; label: string; Icon: any }[]).map(({ id, label, Icon }) => {
              const active = editorTab === id;
              return (
                <button key={id} onClick={() => setEditorTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  background: active ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
                  color: active ? t.text : t.textMuted, fontSize: 11, fontWeight: active ? 500 : 400,
                }}>
                  <Icon style={{ width: 12, height: 12 }} />
                  {label}
                </button>
              );
            })}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {yaml_content.trim() && (
                <span style={{ fontSize: 10, color: t.textMuted, ...mono }}>{lineCount} lines</span>
              )}
              {/* Inline AI review trigger on the AI Review tab */}
              {editorTab === 'ai-review' && !aiReview && (
                <button onClick={handleAIReview} disabled={reviewing || !yaml_content.trim()} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 5,
                  border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)',
                  color: '#a78bfa', fontSize: 10, fontWeight: 500, cursor: 'pointer',
                  opacity: reviewing || !yaml_content.trim() ? 0.4 : 1,
                }}>
                  <SparklesIcon style={{ width: 11, height: 11 }} />
                  {reviewing ? 'Analyzing…' : 'Run Review'}
                </button>
              )}
              {/* Fetch diff trigger on Diff tab */}
              {editorTab === 'diff' && !deployedYAML && (
                <button onClick={handleFetchDiff} disabled={fetchingDiff || !parsed} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 5,
                  border: `1px solid ${t.cardBorder}`, background: 'transparent',
                  color: t.textSub, fontSize: 10, fontWeight: 500, cursor: 'pointer',
                  opacity: !parsed ? 0.4 : 1,
                }}>
                  <ArrowPathIcon style={{ width: 11, height: 11 }} />
                  {fetchingDiff ? 'Fetching…' : 'Fetch live state'}
                </button>
              )}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {editorTab === 'editor' && (
              <Editor
                height="100%"
                defaultLanguage="yaml"
                value={yaml_content}
                onChange={v => setYamlContent(v || '')}
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

            {editorTab === 'preview' && (
              <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
                {parsed && parsed.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {parsed.map((doc, idx) => doc && (
                      <div key={idx} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${t.cardBorder}` }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#1d4ed8', color: '#bfdbfe', fontWeight: 700 }}>{doc?.kind}</span>
                          {doc?.metadata?.name && <span style={{ fontSize: 12, fontWeight: 500, color: t.text, ...mono }}>{doc.metadata.name}</span>}
                          {doc?.metadata?.namespace && <span style={{ fontSize: 11, color: t.textMuted }}>{doc.metadata.namespace}</span>}
                          {doc?.spec?.replicas !== undefined && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: t.textMuted }}>
                              replicas: <span style={{ color: '#3b82f6', fontWeight: 600 }}>{doc.spec.replicas}</span>
                            </span>
                          )}
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
                    <span style={{ fontSize: 12, color: t.textMuted }}>Enter valid YAML to preview resources</span>
                  </div>
                )}
              </div>
            )}

            {editorTab === 'diff' && (
              <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
                {deployedYAML ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%' }}>
                    {[
                      { label: 'Live (cluster)', content: deployedYAML, color: '#22c55e' },
                      { label: 'Local (editor)',  content: yaml_content,  color: '#3b82f6' },
                    ].map(({ label, content, color }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
                        <div style={{ flex: 1, background: isDark ? '#080a0e' : '#f8f9fb', border: `1px solid ${t.cardBorder}`, borderRadius: 8, overflow: 'auto', padding: '10px 12px' }}>
                          <pre style={{ margin: 0, fontSize: 11, color: t.text, ...mono, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.65 }}>{content}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <ArrowPathIcon style={{ width: 28, height: 28, color: t.textMuted }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>Compare with live cluster</span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>Use "Fetch live state" in the tab bar above</span>
                  </div>
                )}
              </div>
            )}

            {editorTab === 'ai-review' && (
              <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
                {!aiReview ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <SparklesIcon style={{ width: 32, height: 32, color: '#8b5cf6' }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>AI-Powered YAML Review</span>
                    <span style={{ fontSize: 11, color: t.textMuted, textAlign: 'center', maxWidth: 340 }}>
                      {reviewing
                        ? 'Analyzing your manifest for security issues and best practices…'
                        : 'Click "Run Review" in the tab bar to analyze your manifest'}
                    </span>
                    {reviewing && (
                      <ArrowPathIcon style={{ width: 18, height: 18, color: '#8b5cf6', animation: 'spin 1s linear infinite', marginTop: 4 }} />
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Score row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {[
                        { label: 'Overall',       value: aiReview.score,              color: '#3b82f6' },
                        { label: 'Security',       value: aiReview.securityScore,      color: '#ef4444' },
                        { label: 'Best Practices', value: aiReview.bestPracticeScore,  color: '#22c55e' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color, ...mono, lineHeight: 1 }}>{value}</div>
                          <div style={{ fontSize: 9, color: t.textMuted, marginTop: 1 }}>/100</div>
                          <div style={{ marginTop: 6, height: 3, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, transition: 'width 0.6s' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Issues */}
                    {aiReview.issues.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 6 }}>
                          Issues <span style={{ color: t.textMuted, fontWeight: 400 }}>({aiReview.issues.length})</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {aiReview.issues.map((issue, i) => (
                            <div key={i} style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${severityColor(issue.severity)}18`, color: severityColor(issue.severity), textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  {issue.severity}
                                </span>
                                <span style={{ fontSize: 10, color: t.textMuted }}>{issue.type}</span>
                              </div>
                              <p style={{ fontSize: 11, color: t.text, margin: 0, lineHeight: 1.5 }}>{issue.message}</p>
                              {issue.suggestion && (
                                <p style={{ fontSize: 10, color: t.textMuted, margin: '4px 0 0 0', lineHeight: 1.5 }}>→ {issue.suggestion}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {aiReview.suggestions.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginBottom: 6 }}>Recommendations</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {aiReview.suggestions.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, alignItems: 'flex-start' }}>
                              <CheckCircleIcon style={{ width: 12, height: 12, color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                              <p style={{ margin: 0, fontSize: 11, color: t.text, lineHeight: 1.5 }}>{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={() => setAiReview(null)} style={{ ...btn(), width: 'auto', alignSelf: 'flex-start', padding: '4px 12px', fontSize: 10 }}>
                      Run again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Controls sidebar ── */}
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${t.cardBorder}`, flexShrink: 0, overflow: 'hidden' }}>

          {/* Section header */}
          <div style={{ padding: '0 14px', height: 38, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Actions</span>
            {parsed && (
              <span style={{ marginLeft: 'auto', fontSize: 9, color: t.textMuted, ...mono }}>{parsed.length} doc{parsed.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Scrollable middle section */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

            {/* File ops */}
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.cardBorder}` }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 }}>File</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input id="yaml-upload" type="file" accept=".yaml,.yml" onChange={handleFileUpload} style={{ display: 'none' }} />
                <label htmlFor="yaml-upload" style={{ ...btn(), cursor: 'pointer', justifyContent: 'flex-start' }}>
                  <DocumentArrowUpIcon style={{ width: 12, height: 12 }} /> Import
                </label>
                <button onClick={exportYAML} disabled={!yaml_content.trim()} style={{ ...btn(), justifyContent: 'flex-start', opacity: !yaml_content.trim() ? 0.4 : 1 }}>
                  <ArrowDownTrayIcon style={{ width: 12, height: 12 }} /> Export
                </button>
                <button onClick={() => { navigator.clipboard.writeText(yaml_content); addLog('success', 'Copied to clipboard'); }} disabled={!yaml_content.trim()} style={{ ...btn(), justifyContent: 'flex-start', opacity: !yaml_content.trim() ? 0.4 : 1 }}>
                  <ClipboardDocumentIcon style={{ width: 12, height: 12 }} /> Copy
                </button>
                <button onClick={() => { setYamlContent(SAMPLE_YAML); addLog('info', 'Sample YAML loaded'); }} style={{ ...btn(), justifyContent: 'flex-start' }}>
                  <CodeBracketIcon style={{ width: 12, height: 12 }} /> Load sample
                </button>
                {yaml_content.trim() && (
                  <button onClick={() => { setYamlContent(''); setAiReview(null); setDeployedYAML(''); addLog('info', 'Editor cleared'); }} style={{ ...btn(false, true), justifyContent: 'flex-start' }}>
                    <XMarkIcon style={{ width: 12, height: 12 }} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Analysis shortcuts */}
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 }}>Analysis</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={handleAIReview} disabled={reviewing || !yaml_content.trim()} style={{ ...btn(), justifyContent: 'flex-start', background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.07)', border: `1px solid ${isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.3)'}`, color: isDark ? '#a78bfa' : '#7c3aed', opacity: reviewing || !yaml_content.trim() ? 0.4 : 1 }}>
                  <SparklesIcon style={{ width: 12, height: 12 }} />
                  {reviewing ? 'Analyzing…' : 'AI Review'}
                </button>
                <button onClick={handleFetchDiff} disabled={fetchingDiff || !parsed} style={{ ...btn(), justifyContent: 'flex-start', opacity: !parsed ? 0.4 : 1 }}>
                  <ArrowPathIcon style={{ width: 12, height: 12 }} />
                  {fetchingDiff ? 'Fetching…' : 'Diff vs cluster'}
                </button>
              </div>
            </div>

          </div>{/* end scrollable */}

          {/* Deploy — always visible at bottom */}
          <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${t.cardBorder}`, flexShrink: 0 }}>
            {/* Target indicator */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <button onClick={() => handleApply(true)} disabled={loading || !yaml_content.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, width: '100%', cursor: 'pointer',
                  border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`,
                  background: isDark ? t.navHoverBg : '#F9FAFB',
                  color: isDark ? t.textSub : '#374151',
                  fontSize: 11, fontWeight: 500, transition: 'all 0.1s',
                  opacity: loading || !yaml_content.trim() ? 0.45 : 1,
                }}>
                <BeakerIcon style={{ width: 12, height: 12 }} /> Validate
              </button>
              <button onClick={() => handleApply(false)} disabled={loading || !yaml_content.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '9px 12px', borderRadius: 7, width: '100%', cursor: 'pointer',
                  border: 'none',
                  background: loading || !yaml_content.trim() ? (isDark ? 'rgba(59,130,246,0.4)' : '#93C5FD') : '#3b82f6',
                  color: '#fff',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  boxShadow: loading || !yaml_content.trim() ? 'none' : '0 2px 8px rgba(59,130,246,0.35)',
                }}>
                {loading
                  ? <><ArrowPathIcon style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Deploying…</>
                  : <><PlayIcon style={{ width: 13, height: 13 }} /> Deploy</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Console ── */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 38, borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Console</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {logs.length > 0 && <span style={{ fontSize: 9, color: t.textMuted }}>{logs.length} entries</span>}
              <button onClick={() => setLogs([])} style={{ fontSize: 10, color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}>Clear</button>
            </div>
          </div>
          <div ref={logsRef} style={{ flex: 1, overflow: 'auto', padding: '10px 12px', background: isDark ? '#070810' : '#f1f5f9', ...mono, fontSize: 10.5, lineHeight: 1.65 }}>
            {logs.length === 0 ? (
              <div style={{ color: t.textMuted, paddingTop: 8, fontSize: 11 }}>Ready — waiting for input.</div>
            ) : logs.map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                <span style={{ color: t.textMuted, flexShrink: 0, fontSize: 9.5 }}>
                  {log.ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span style={{ color: logColor(log.type), flexShrink: 0, fontSize: 9.5, fontWeight: 700, minWidth: 42 }}>
                  {log.type.toUpperCase()}
                </span>
                <span style={{ color: t.text, wordBreak: 'break-word' }}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>

      </div>{/* end 3-column body */}

      {/* ── Deploy success modal ── */}
      {summary && (
        <>
          <div onClick={() => setSummary(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 500, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14,
            boxShadow: '0 24px 80px rgba(0,0,0,0.25)', zIndex: 70, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon style={{ width: 13, height: 13, color: '#22c55e' }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Deployment Successful</span>
              </div>
              <button onClick={() => setSummary(null)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', display: 'flex', padding: 4 }}>
                <XMarkIcon style={{ width: 15, height: 15 }} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 20px', borderBottom: `1px solid ${t.cardBorder}` }}>
              {[
                { label: 'Duration',  value: `${(summary.duration / 1000).toFixed(2)}s`, color: '#3b82f6' },
                { label: 'Resources', value: String(summary.resources.length),            color: '#22c55e' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: t.mainBg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${t.cardBorder}` }}>
                  <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color, ...mono }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 20px', maxHeight: 240, overflow: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Deployed Resources</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {summary.resources.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ ...mono, fontSize: 12, color: t.text }}>{r.kind}/{r.name}</span>
                      {r.namespace && <span style={{ fontSize: 10, color: t.textMuted }}>{r.namespace}</span>}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.3, background: r.status === 'created' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)', color: r.status === 'created' ? '#22c55e' : '#3b82f6' }}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '10px 20px', borderTop: `1px solid ${t.cardBorder}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSummary(null)} style={{ background: '#3b82f6', border: 'none', borderRadius: 7, padding: '7px 20px', fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
