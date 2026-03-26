import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, EyeIcon, EyeSlashIcon, ArrowPathIcon, CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import type { K8sEvent } from '../../types';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };
const DEFAULT_W = 700;

export type RDWTab = 'info' | 'manifest' | 'events' | 'decode' | 'pods' | 'logs' | 'terminal';
type WinState = 'normal' | 'minimized' | 'maximized';

// ── Public types ──────────────────────────────────────────────────────────────
export interface RDWResource {
  id: string;           // unique key, e.g. `${kind}/${namespace||'_'}/${name}`
  kind: string;
  name: string;
  namespace: string;
  resourceObj?: any;
  initialTab?: RDWTab;
}

export interface ResourceDetailWindowProps {
  resources: RDWResource[];
  activeId: string;
  onActiveChange: (id: string) => void;
  onCloseTab: (id: string) => void;
  onClose: () => void;
  forceRestore?: number;
  onOpenPod?: (pod: any) => void; // optional: open a pod from the Pods tab
}

// ── Per-resource lazy state ───────────────────────────────────────────────────
interface YamlState  { content: string; loaded: boolean; loading: boolean; editing: boolean; saving: boolean; copyDone: boolean }
interface EventState { list: K8sEvent[]; loaded: boolean; loading: boolean }

const defaultYaml  = (): YamlState  => ({ content: '', loaded: false, loading: false, editing: false, saving: false, copyDone: false });
const defaultEvent = (): EventState => ({ list: [], loaded: false, loading: false });

interface PodLogsState { content: string; loaded: boolean; loading: boolean; container: string; tailLines: number }
interface PodTermState { history: Array<{ cmd: string; out: string; err: string }>; cmdHistory: string[]; shell: 'sh' | 'bash' }
const defaultPodLogs = (): PodLogsState => ({ content: '', loaded: false, loading: false, container: '', tailLines: 300 });
const defaultPodTerm = (): PodTermState => ({ history: [], cmdHistory: [], shell: 'sh' });

// ── Mini usage bar (for Node info) ────────────────────────────────────────────
function MiniBar({ pct, color }: { pct: number; color: string }) {
  const c = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 9999, background: c + '22', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 9999, background: c, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 10, ...mono, color: c, fontWeight: 600, flexShrink: 0, width: 30, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ── Secret value row ──────────────────────────────────────────────────────────
function SecretValueRow({ secretKey, value, t, isDark }: { secretKey: string; value: string; t: any; isDark: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${t.cardBorder}`, borderRadius: 7, padding: '10px 14px', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: t.textSub }}>{secretKey}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setVisible(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: visible ? '#3b82f6' : t.textMuted, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
            {visible ? <EyeSlashIcon style={{ width: 10, height: 10 }} /> : <EyeIcon style={{ width: 10, height: 10 }} />}
            {visible ? 'Hide' : 'Show'}
          </button>
          <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#22c55e' : t.textMuted, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
            {copied ? <CheckIcon style={{ width: 10, height: 10 }} /> : <ClipboardDocumentIcon style={{ width: 10, height: 10 }} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      {visible
        ? <pre style={{ margin: 0, ...mono, fontSize: 11.5, color: isDark ? '#86efac' : '#14532d', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>{value}</pre>
        : <div style={{ ...mono, fontSize: 12, color: t.textMuted, letterSpacing: 2 }}>{'•'.repeat(Math.min(value.length, 28))}</div>
      }
    </div>
  );
}

function decodeSecretData(yaml: string): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];
  let inData = false;
  for (const line of yaml.split('\n')) {
    if (/^data:\s*$/.test(line)) { inData = true; continue; }
    if (inData) {
      if (/^\s/.test(line)) {
        const m = line.match(/^\s+([^:]+):\s*(.+)?$/);
        if (m) {
          const b64 = (m[2] || '').trim();
          let dec = b64;
          try { dec = atob(b64); } catch { dec = b64; }
          result.push({ key: m[1].trim(), value: dec });
        }
      } else { inData = false; }
    }
  }
  return result;
}

// ── YAML syntax highlight ─────────────────────────────────────────────────────
function YamlView({ content, editing, onChange, isDark }: { content: string; editing: boolean; onChange?: (v: string) => void; isDark: boolean; t?: any }) {
  if (editing) {
    return (
      <textarea value={content} onChange={e => onChange?.(e.target.value)} spellCheck={false}
        style={{ width: '100%', height: '100%', minHeight: 300, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: isDark ? '#e5e7eb' : '#1f2937', ...mono, fontSize: 12.5, lineHeight: 1.75, padding: 0 }} />
    );
  }
  return (
    <div style={{ ...mono, fontSize: 12.5, lineHeight: 1.75 }}>
      {content.split('\n').map((line, i) => {
        const trimmed = line.trimStart();
        const pad = line.substring(0, line.length - trimmed.length);
        let node: React.ReactNode;
        if (trimmed.startsWith('#')) {
          node = <span style={{ color: isDark ? '#4b5563' : '#9ca3af', fontStyle: 'italic' }}>{line}</span>;
        } else {
          const km = trimmed.match(/^(-\s+)?([\w./%-]+)\s*:/);
          if (km) {
            const rest = trimmed.slice(km[0].length);
            let valueColor = isDark ? '#86efac' : '#15803d';
            if (rest.trim() === '' || rest.trim() === '{}' || rest.trim() === '[]') valueColor = isDark ? '#94a3b8' : '#6b7280';
            else if (/^\s*(true|false|null)/.test(rest)) valueColor = isDark ? '#f59e0b' : '#d97706';
            else if (/^\s*\d/.test(rest)) valueColor = isDark ? '#c084fc' : '#7c3aed';
            node = (<>
              <span>{pad}</span>
              {km[1] && <span style={{ color: '#f59e0b' }}>{km[1]}</span>}
              <span style={{ color: isDark ? '#93c5fd' : '#2563eb', fontWeight: 500 }}>{km[2]}</span>
              <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>:</span>
              <span style={{ color: valueColor }}>{rest}</span>
            </>);
          } else if (trimmed.startsWith('- ')) {
            node = (<><span>{pad}</span><span style={{ color: '#f59e0b' }}>{'- '}</span><span style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>{trimmed.slice(2)}</span></>);
          } else if (trimmed === '-') {
            node = <><span>{pad}</span><span style={{ color: '#f59e0b' }}>-</span></>;
          } else {
            node = <span style={{ color: isDark ? '#d1d5db' : '#374151' }}>{line}</span>;
          }
        }
        return (
          <div key={i} style={{ display: 'flex', minHeight: '1.75em' }}>
            <span style={{ display: 'inline-block', width: 36, textAlign: 'right', paddingRight: 14, color: isDark ? '#2d3748' : '#cbd5e1', fontSize: 10.5, userSelect: 'none', flexShrink: 0, lineHeight: 1.75 }}>{i + 1}</span>
            <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{node}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Info tab ──────────────────────────────────────────────────────────────────
function InfoTab({ kind, resourceObj, t, isDark }: { kind: string; resourceObj: any; t: any; isDark: boolean }) {
  const obj = resourceObj || {};

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 8 }}>{title}</div>
      <div style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderRadius: 8, border: `1px solid ${t.cardBorder}`, overflow: 'hidden' }}>{children}</div>
    </div>
  );

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${t.cardBorder}` }}>
      <span style={{ fontSize: 11, color: t.textMuted, minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: t.text, wordBreak: 'break-all' as const, flex: 1 }}>{value ?? <span style={{ color: t.textMuted }}>—</span>}</span>
    </div>
  );

  const badge = (val: string, bg: string, color: string) => (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: bg, color, fontWeight: 600 }}>{val}</span>
  );

  const statusColor = (s: string) => {
    const sl = (s || '').toLowerCase();
    if (sl === 'running' || sl === 'bound' || sl === 'available' || sl === 'healthy' || sl === 'active' || sl === 'ready') return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
    if (sl === 'failed' || sl === 'error' || sl === 'lost') return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (sl === 'pending' || sl === 'progressing') return { color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
    return { color: t.textSub, bg: t.cardBorder };
  };

  return (
    <div style={{ padding: 20 }}>

      {/* Metadata */}
      {section('Metadata', <>
        <div style={{ padding: '7px 12px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: t.textMuted, minWidth: 120, flexShrink: 0 }}>Name</span>
          <span style={{ ...mono, fontSize: 12, fontWeight: 500, color: t.text }}>{obj.name || '—'}</span>
        </div>
        {obj.namespace && row('Namespace', obj.namespace)}
        {row('Kind', badge(kind, t.infoBg, t.info))}
        {obj.age && row('Age', <span style={{ ...mono, fontSize: 12 }}>{obj.age}</span>)}
      </>)}

      {/* Node: resource usage */}
      {kind === 'Node' && obj.cpu !== undefined && section('Resource Usage', <>
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.cardBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>CPU</span>
            <span style={{ fontSize: 11, ...mono, fontWeight: 600, color: obj.cpu > 85 ? '#ef4444' : obj.cpu > 65 ? '#f59e0b' : '#8b5cf6' }}>{(obj.cpu || 0).toFixed(0)}%</span>
          </div>
          <MiniBar pct={obj.cpu || 0} color="#8b5cf6" />
        </div>
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.cardBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>Memory</span>
            <span style={{ fontSize: 11, ...mono, fontWeight: 600, color: obj.memory > 85 ? '#ef4444' : obj.memory > 65 ? '#f59e0b' : '#3b82f6' }}>{(obj.memory || 0).toFixed(0)}%</span>
          </div>
          <MiniBar pct={obj.memory || 0} color="#3b82f6" />
        </div>
        {obj.pods !== undefined && (
          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>Pods running</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', ...mono }}>{obj.pods}</span>
          </div>
        )}
      </>)}

      {/* Node: system info */}
      {kind === 'Node' && (obj.ip || obj.roles || obj.version) && section('System', <>
        {obj.ip && row('IP Address', <span style={{ ...mono, fontSize: 12 }}>{obj.ip}</span>)}
        {obj.roles && row('Role', <span style={{ ...mono, fontSize: 12 }}>{obj.roles}</span>)}
        {obj.version && row('Kubernetes', <span style={{ ...mono, fontSize: 12 }}>{obj.version}</span>)}
        {obj.runtime && row('Runtime', <span style={{ ...mono, fontSize: 12 }}>{obj.runtime}</span>)}
        {obj.os && row('OS', obj.os)}
      </>)}

      {/* Namespace: resource counts */}
      {kind === 'Namespace' && obj.pods !== undefined && section('Resources', <>
        {row('Pods',        <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', ...mono }}>{obj.pods ?? 0}</span>)}
        {row('Deployments', <span style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6', ...mono }}>{obj.deployments ?? 0}</span>)}
        {row('Services',    <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', ...mono }}>{obj.services ?? 0}</span>)}
        {row('ConfigMaps',  <span style={{ fontSize: 14, fontWeight: 700, color: '#8b5cf6', ...mono }}>{obj.configmaps ?? 0}</span>)}
        {row('Secrets',     <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', ...mono }}>{obj.secrets ?? 0}</span>)}
      </>)}

      {/* Status (generic) */}
      {kind !== 'Node' && kind !== 'Namespace' && (obj.replicas !== undefined || obj.desired !== undefined || obj.completions !== undefined || obj.status) && section('Status', <>
        {obj.status && (() => { const sc = statusColor(obj.status); return row('Status', badge(obj.status, sc.bg, sc.color)); })()}
        {obj.replicas !== undefined && row('Ready / Desired',
          <span style={{ ...mono, fontSize: 12, color: (obj.ready_replicas ?? 0) === obj.replicas ? '#22c55e' : '#eab308' }}>{obj.ready_replicas ?? 0}/{obj.replicas}</span>
        )}
        {obj.desired !== undefined && row('Ready / Desired',
          <span style={{ ...mono, fontSize: 12, color: (obj.ready ?? 0) === obj.desired ? '#22c55e' : '#eab308' }}>{obj.ready ?? 0}/{obj.desired}</span>
        )}
        {obj.completions !== undefined && row('Completions', <span style={{ ...mono, fontSize: 12 }}>{obj.succeeded ?? 0}/{obj.completions}</span>)}
        {obj.schedule && row('Schedule', <span style={{ ...mono, fontSize: 12, color: t.info }}>{obj.schedule}</span>)}
        {obj.duration && row('Duration', obj.duration)}
        {obj.restarts !== undefined && row('Restarts', <span style={{ ...mono, fontSize: 12, color: (obj.restarts ?? 0) > 10 ? '#ef4444' : t.text }}>{obj.restarts ?? 0}</span>)}
        {obj.ip && row('Pod IP', <span style={{ ...mono, fontSize: 12 }}>{obj.ip}</span>)}
        {(obj.node_name || obj.node) && row('Node', obj.node_name || obj.node)}
      </>)}

      {/* Service / Ingress network */}
      {(obj.type && (kind === 'Service' || obj.cluster_ip)) && section('Network', <>
        {obj.type && row('Type', badge(obj.type, t.infoBg, t.info))}
        {obj.cluster_ip && row('Cluster IP', <span style={{ ...mono, fontSize: 12 }}>{obj.cluster_ip}</span>)}
        {obj.ports && row('Ports', <span style={{ ...mono, fontSize: 12 }}>{Array.isArray(obj.ports) ? obj.ports.map((p: any) => `${p.port || p}${p.protocol ? '/' + p.protocol : ''}`).join(', ') : String(obj.ports)}</span>)}
        {(obj.host || obj.hosts) && row('Host', Array.isArray(obj.hosts) ? obj.hosts.join(', ') : obj.host || obj.hosts)}
      </>)}

      {/* Storage */}
      {(obj.storage || obj.capacity || obj.storage_class) && section('Storage', <>
        {(obj.storage || obj.capacity) && row('Capacity', <span style={{ ...mono, fontSize: 12, color: '#3b82f6' }}>{obj.storage || obj.capacity}</span>)}
        {obj.storage_class && row('Storage Class', <span style={{ ...mono, fontSize: 12 }}>{obj.storage_class}</span>)}
        {obj.access_modes && row('Access Modes', Array.isArray(obj.access_modes) ? obj.access_modes.join(', ') : obj.access_modes)}
      </>)}

      {/* Pod containers */}
      {kind === 'Pod' && obj.containers?.length > 0 && section(`Containers (${obj.containers.length})`,
        obj.containers.map((c: string, i: number) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: i < obj.containers.length - 1 ? `1px solid ${t.cardBorder}` : 'none' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ ...mono, fontSize: 12, color: t.text }}>{c}</span>
          </div>
        ))
      )}

      {/* Container image (non-pod) */}
      {kind !== 'Pod' && obj.image && section('Container Image',
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {(() => {
            const parts = obj.image.split('/');
            const nameTag = parts[parts.length - 1];
            const [imgName, tag] = nameTag.split(':');
            return (<>
              <span style={{ ...mono, fontSize: 12, color: t.text }}>{imgName}</span>
              {tag && <span style={{ ...mono, fontSize: 10, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '1px 6px', borderRadius: 4 }}>{tag}</span>}
              {parts.length > 1 && <span style={{ fontSize: 10, color: t.textMuted }}>{parts.slice(0, -1).join('/')}</span>}
            </>);
          })()}
        </div>
      )}

      {/* Secret type */}
      {kind === 'Secret' && obj.type && section('Type',
        <div style={{ padding: '7px 12px' }}>
          <span style={{ ...mono, fontSize: 12, color: '#d97706' }}>{obj.type}</span>
        </div>
      )}

      {/* Labels */}
      {obj.labels && Object.keys(obj.labels).length > 0 && section('Labels',
        <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Object.entries(obj.labels).map(([k, v]) => (
            <span key={k} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: t.textSub, ...mono }}>{k}={String(v)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Events list ───────────────────────────────────────────────────────────────
function EventsPane({ events, loading, t, isDark }: { events: K8sEvent[]; loading: boolean; t: any; isDark: boolean }) {
  if (loading) return <div style={{ padding: 20, fontSize: 12, color: t.textMuted }}>Loading events…</div>;
  if (events.length === 0) return <div style={{ padding: '48px 20px', textAlign: 'center', fontSize: 12, color: t.textMuted }}>No events found</div>;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '70px minmax(0,1fr) minmax(0,2.2fr) 45px 100px', gap: 10, padding: '8px 16px', borderBottom: `1px solid ${t.cardBorder}` }}>
        {['Type', 'Reason', 'Message', 'Cnt', 'Last Seen'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
        ))}
      </div>
      {events.map((ev, i) => {
        const warn = ev.type === 'Warning';
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '70px minmax(0,1fr) minmax(0,2.2fr) 45px 100px', gap: 10,
            padding: '9px 16px', borderBottom: i < events.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
            background: warn ? (isDark ? 'rgba(234,179,8,0.04)' : 'rgba(254,243,199,0.4)') : 'transparent',
            alignItems: 'start',
          }}>
            <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, display: 'inline-block', color: warn ? '#d97706' : '#16a34a', background: warn ? (isDark ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.1)') : (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)') }}>{ev.type}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{ev.reason}</span>
            <span style={{ fontSize: 11, color: t.textSub, lineHeight: 1.5 }}>{ev.message}</span>
            <span style={{ ...mono, fontSize: 11, color: t.textMuted }}>{ev.count}</span>
            <span style={{ fontSize: 10, color: t.textMuted }}>{ev.last_timestamp ? new Date(ev.last_timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          </div>
        );
      })}
    </>
  );
}

// ── Pods mini-table (for Deployment/SS/DS) ────────────────────────────────────
function PodsPane({ ownerName, namespace, t, onOpenPod }: { ownerName: string; namespace: string; t: any; isDark?: boolean; onOpenPod?: (pod: any) => void }) {
  const [pods, setPods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kubernetesApi.getPods(namespace || undefined);
      const all: any[] = res.data || [];
      const filtered = all.filter(p => p.name.startsWith(ownerName + '-') || p.name === ownerName);
      setPods(filtered);
    } catch { setPods([]); }
    finally { setLoading(false); }
  }, [ownerName, namespace]);

  useEffect(() => { fetchPods(); }, [fetchPods]);

  const statusColor = (s: string) => {
    const sl = (s || '').toLowerCase();
    if (sl === 'running') return '#22c55e';
    if (sl === 'failed' || sl === 'error') return '#ef4444';
    if (sl === 'pending') return '#eab308';
    return t.textMuted;
  };

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: t.textMuted }}>{loading ? 'Loading pods…' : `${pods.length} pod${pods.length !== 1 ? 's' : ''}`}</span>
        <button onClick={fetchPods} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, padding: '2px 4px' }}>
          <ArrowPathIcon style={{ width: 10, height: 10 }} /> Refresh
        </button>
      </div>
      {loading ? (
        <div style={{ padding: 20, fontSize: 12, color: t.textMuted }}>Fetching pods…</div>
      ) : pods.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', fontSize: 12, color: t.textMuted }}>No pods found</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 80px 50px minmax(0,1.2fr) 60px', gap: 10, padding: '6px 16px', borderBottom: `1px solid ${t.cardBorder}` }}>
            {['Name', 'Status', 'Restarts', 'Node', 'Age'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
            ))}
          </div>
          {pods.map((pod, i) => {
            const status = pod.status === 'Running' && pod.ready ? 'Running' : pod.status || 'Unknown';
            const restartHigh = (pod.restarts || 0) > 10;
            return (
              <div key={pod.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 80px 50px minmax(0,1.2fr) 60px', gap: 10, padding: '9px 16px', borderBottom: i < pods.length - 1 ? `1px solid ${t.cardBorder}` : 'none', alignItems: 'center' }}>
                {onOpenPod
                  ? <button onClick={() => onOpenPod(pod)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...mono, fontSize: 11.5, color: t.info, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{pod.name}</button>
                  : <span style={{ ...mono, fontSize: 11.5, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pod.name}</span>
                }
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(status), flexShrink: 0 }} />
                  <span style={{ color: statusColor(status), fontWeight: 500 }}>{status}</span>
                </span>
                <span style={{ ...mono, fontSize: 11, color: restartHigh ? '#ef4444' : t.textMuted, fontWeight: restartHigh ? 600 : 400 }}>{pod.restarts ?? 0}</span>
                <span style={{ fontSize: 11, color: t.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pod.node_name || pod.node || '—'}</span>
                <span style={{ ...mono, fontSize: 11, color: t.textMuted }}>{pod.age || '—'}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Kind badge colors ─────────────────────────────────────────────────────────
const KIND_COLORS: Record<string, string> = {
  Pod: '#22c55e', Deployment: '#3b82f6', StatefulSet: '#8b5cf6', DaemonSet: '#f59e0b',
  Job: '#06b6d4', CronJob: '#0ea5e9', Service: '#ec4899', Ingress: '#a855f7',
  Node: '#6366f1', Namespace: '#14b8a6', ConfigMap: '#f97316', Secret: '#ef4444',
  PersistentVolumeClaim: '#22d3ee', PersistentVolume: '#2dd4bf',
};
const kindColor = (kind: string) => KIND_COLORS[kind] || '#6b7280';

// ── Main component ────────────────────────────────────────────────────────────
export default function ResourceDetailWindow({
  resources, activeId, onActiveChange, onCloseTab, onClose, forceRestore, onOpenPod,
}: ResourceDetailWindowProps) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [winState, setWinState] = useState<WinState>('normal');

  // Per-resource content tab
  const [contentTabs, setContentTabs] = useState<Record<string, RDWTab>>({});
  // Per-resource yaml state
  const [yamls, setYamls] = useState<Record<string, YamlState>>({});
  // Per-resource events state
  const [eventSets, setEventSets] = useState<Record<string, EventState>>({});
  // Per-resource pod logs/terminal state
  const [podLogs, setPodLogs] = useState<Record<string, PodLogsState>>({});
  const [podTerms, setPodTerms] = useState<Record<string, PodTermState>>({});
  // Ephemeral terminal UI state (not per-resource — resets on resource switch)
  const [termInput, setTermInput] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const [termRunning, setTermRunning] = useState(false);
  const termBodyRef = useRef<HTMLDivElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);

  const activeRes = resources.find(r => r.id === activeId);
  const activeContentTab: RDWTab = contentTabs[activeId] ?? activeRes?.initialTab ?? 'info';

  const isPod     = activeRes?.kind === 'Pod';
  const hasPods   = ['Deployment', 'StatefulSet', 'DaemonSet'].includes(activeRes?.kind || '');
  const isSecret  = activeRes?.kind === 'Secret';
  const contentTabList: RDWTab[] = isPod
    ? ['info', 'logs', 'events', 'terminal', 'manifest']
    : ['info', ...(hasPods ? ['pods' as RDWTab] : []), 'manifest', 'events', ...(isSecret ? ['decode' as RDWTab] : [])];

  const yamlState    = yamls[activeId]     ?? defaultYaml();
  const evtState     = eventSets[activeId] ?? defaultEvent();
  const podLogsState = podLogs[activeId]   ?? defaultPodLogs();
  const podTermState = podTerms[activeId]  ?? defaultPodTerm();

  const setContentTab = (tab: RDWTab) =>
    setContentTabs(prev => ({ ...prev, [activeId]: tab }));

  const updateYaml = useCallback((id: string, u: Partial<YamlState>) =>
    setYamls(prev => ({ ...prev, [id]: { ...(prev[id] ?? defaultYaml()), ...u } })), []);

  const updateEvt = useCallback((id: string, u: Partial<EventState>) =>
    setEventSets(prev => ({ ...prev, [id]: { ...(prev[id] ?? defaultEvent()), ...u } })), []);

  const updatePodLogs = useCallback((id: string, u: Partial<PodLogsState>) =>
    setPodLogs(prev => ({ ...prev, [id]: { ...(prev[id] ?? defaultPodLogs()), ...u } })), []);

  const updatePodTerm = useCallback((id: string, u: Partial<PodTermState>) =>
    setPodTerms(prev => ({ ...prev, [id]: { ...(prev[id] ?? defaultPodTerm()), ...u } })), []);

  // Restore from minimized when forceRestore increments
  useEffect(() => {
    if (forceRestore !== undefined && winState === 'minimized') setWinState('normal');
  }, [forceRestore]);

  // Window position/size
  const initH = Math.round(window.innerHeight * 0.72);
  const [pos, setPos]   = useState({ x: Math.max(0, Math.round((window.innerWidth - DEFAULT_W) / 2)), y: Math.max(0, Math.round((window.innerHeight - initH) / 2)) });
  const [size, setSize] = useState({ w: DEFAULT_W, h: initH });
  const prevNormal = useRef({ pos, size });
  const dragging  = useRef(false);
  const dragOff   = useRef({ x: 0, y: 0 });
  const resizing  = useRef(false);
  const resizeOff = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current)  setPos({ x: Math.max(0, Math.min(e.clientX - dragOff.current.x, window.innerWidth - size.w)), y: Math.max(0, Math.min(e.clientY - dragOff.current.y, window.innerHeight - 48)) });
      if (resizing.current)  setSize({ w: Math.max(520, resizeOff.current.w + e.clientX - resizeOff.current.mx), h: Math.max(360, resizeOff.current.h + e.clientY - resizeOff.current.my) });
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [size.w]);

  // Fetch YAML for a resource
  const fetchYaml = useCallback(async (id: string, res: RDWResource) => {
    updateYaml(id, { loading: true });
    try {
      const r = await kubernetesApi.getResourceYAML({ kind: res.kind, name: res.name, namespace: res.namespace });
      updateYaml(id, { content: r.data.yaml_content || '', loaded: true, loading: false });
    } catch {
      updateYaml(id, { content: '# Failed to load YAML', loading: false });
    }
  }, [updateYaml]);

  // Fetch pod logs
  const fetchPodLogs = useCallback(async (id: string, res: RDWResource, container: string, tailLines: number) => {
    updatePodLogs(id, { loading: true, content: '' });
    try {
      const r = await kubernetesApi.getPodLogs(res.namespace, res.name, { container: container || undefined, tailLines, timestamps: true });
      updatePodLogs(id, { content: r.data.logs || '(no output)', loaded: true, loading: false });
    } catch {
      updatePodLogs(id, { content: 'Error fetching logs.', loading: false });
    }
  }, [updatePodLogs]);

  // Fetch events for a resource
  const fetchEvents = useCallback(async (id: string, res: RDWResource) => {
    updateEvt(id, { loading: true });
    try {
      const r = res.kind === 'Pod'
        ? await kubernetesApi.getPodEvents(res.namespace, res.name)
        : await kubernetesApi.getWorkloadEvents(res.kind, res.namespace, res.name);
      updateEvt(id, { list: r.data || [], loaded: true, loading: false });
    } catch {
      updateEvt(id, { list: [], loading: false });
    }
  }, [updateEvt]);

  // Lazy-load when content tab or active resource changes
  useEffect(() => {
    if (!activeRes) return;
    const ys = yamls[activeId]     ?? defaultYaml();
    const es = eventSets[activeId] ?? defaultEvent();
    const ls = podLogs[activeId]   ?? defaultPodLogs();
    if ((activeContentTab === 'manifest' || activeContentTab === 'decode') && !ys.loaded && !ys.loading) {
      fetchYaml(activeId, activeRes);
    }
    if (activeContentTab === 'events' && !es.loaded && !es.loading) {
      fetchEvents(activeId, activeRes);
    }
    if (activeContentTab === 'logs' && activeRes.kind === 'Pod' && !ls.loaded && !ls.loading) {
      const container = ls.container || activeRes.resourceObj?.containers?.[0] || '';
      if (!ls.container && container) updatePodLogs(activeId, { container });
      fetchPodLogs(activeId, activeRes, container, ls.tailLines);
    }
  }, [activeContentTab, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll terminal to bottom when new output arrives
  useEffect(() => {
    termBodyRef.current?.scrollTo({ top: termBodyRef.current.scrollHeight, behavior: 'instant' as ScrollBehavior });
  }, [podTermState.history]);

  async function saveYaml() {
    if (!activeRes) return;
    const id = activeId;
    updateYaml(id, { saving: true });
    try {
      await kubernetesApi.updateResourceYAML(yamlState.content, activeRes.namespace);
      updateYaml(id, { saving: false, editing: false });
    } catch (e) {
      console.error(e);
      updateYaml(id, { saving: false });
    }
  }

  async function runCommand(e: React.FormEvent) {
    e.preventDefault();
    const cmd = termInput.trim();
    if (!cmd || termRunning || !activeRes) return;
    updatePodTerm(activeId, { cmdHistory: [cmd, ...podTermState.cmdHistory.slice(0, 49)] });
    setHistIdx(-1);
    setTermInput('');
    setTermRunning(true);
    const container = podLogsState.container || activeRes.resourceObj?.containers?.[0] || '';
    try {
      const res = await kubernetesApi.execPodCommand(activeRes.namespace, activeRes.name, [podTermState.shell, '-c', cmd], container || undefined);
      setPodTerms(prev => {
        const cur = prev[activeId] ?? defaultPodTerm();
        return { ...prev, [activeId]: { ...cur, history: [...cur.history, { cmd, out: res.data.stdout || '', err: res.data.stderr || '' }] } };
      });
    } catch (err: any) {
      setPodTerms(prev => {
        const cur = prev[activeId] ?? defaultPodTerm();
        return { ...prev, [activeId]: { ...cur, history: [...cur.history, { cmd, out: '', err: err?.message || 'exec failed' }] } };
      });
    } finally {
      setTermRunning(false);
      setTimeout(() => termInputRef.current?.focus(), 50);
    }
  }

  function handleTermKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, podTermState.cmdHistory.length - 1);
      setHistIdx(next);
      setTermInput(podTermState.cmdHistory[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setTermInput(next < 0 ? '' : podTermState.cmdHistory[next] ?? '');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      updatePodTerm(activeId, { history: [] });
    }
  }

  const toggleMaximize = () => {
    if (winState === 'maximized') { setPos(prevNormal.current.pos); setSize(prevNormal.current.size); setWinState('normal'); }
    else { prevNormal.current = { pos, size }; setWinState('maximized'); }
  };

  // ── Minimized dock ────────────────────────────────────────────────────────
  if (winState === 'minimized') {
    return (
      <div
        onClick={() => setWinState('normal')}
        style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: '10px 10px 0 0', padding: '6px 14px 8px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', zIndex: 60, cursor: 'pointer' }}
      >
        {activeRes && <>
          <span style={{ fontSize: 12, fontWeight: 500, color: t.text, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeRes.name}</span>
          <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 4, background: kindColor(activeRes.kind) + '22', color: kindColor(activeRes.kind), fontWeight: 700 }}>{activeRes.kind}</span>
        </>}
        {resources.length > 1 && (
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: t.cardBorder, color: t.textMuted, fontWeight: 500 }}>+{resources.length - 1}</span>
        )}
        <button onClick={e => { e.stopPropagation(); onClose(); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 2 }}>
          <XMarkIcon style={{ width: 12, height: 12 }} />
        </button>
      </div>
    );
  }

  const winStyle: React.CSSProperties = winState === 'maximized'
    ? { position: 'fixed', inset: 0, borderRadius: 0 }
    : { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h, borderRadius: 12 };

  return (
    <div style={{ ...winStyle, background: t.cardBg, border: `1px solid ${t.cardBorder}`, boxShadow: '0 24px 80px rgba(0,0,0,0.3)', zIndex: 60, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Title bar (traffic lights + resource tabs) ── */}
      <div
        onMouseDown={e => {
          if ((e.target as HTMLElement).closest('button')) return;
          if (winState === 'maximized') { toggleMaximize(); return; }
          dragging.current = true;
          dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        }}
        onDoubleClick={toggleMaximize}
        style={{ display: 'flex', alignItems: 'center', padding: '0 8px', height: 38, background: isDark ? '#0f0f0f' : '#f0f0f0', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, cursor: winState === 'maximized' ? 'default' : 'grab', userSelect: 'none', gap: 8 }}
      >
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button title="Close" onClick={onClose} style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button title="Minimize" onClick={() => setWinState('minimized')} style={{ width: 11, height: 11, borderRadius: '50%', background: '#eab308', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button title={winState === 'maximized' ? 'Restore' : 'Maximize'} onClick={toggleMaximize} style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: 'none', cursor: 'pointer', padding: 0 }} />
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: t.cardBorder, flexShrink: 0 }} />

        {/* Resource tab chips (scrollable) — no data-nodrag here so the gaps are draggable */}
        <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' } as React.CSSProperties}>
          {resources.map(res => {
            const isActive = res.id === activeId;
            const kc = kindColor(res.kind);
            return (
              <div
                key={res.id}
                onMouseDown={e => e.stopPropagation()} // prevent drag when clicking a tab chip
                onClick={() => onActiveChange(res.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 8px', borderRadius: 6, background: isActive ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent', cursor: 'pointer', flexShrink: 0, maxWidth: 180, transition: 'background 0.1s', border: isActive ? `1px solid ${t.cardBorder}` : '1px solid transparent' }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: kc + '20', color: kc, fontWeight: 700, flexShrink: 0 }}>{res.kind.slice(0, 3).toUpperCase()}</span>
                <span style={{ fontSize: 11, color: isActive ? t.text : t.textSub, fontWeight: isActive ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{res.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); onCloseTab(res.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', alignItems: 'center', padding: 1, flexShrink: 0, borderRadius: 3 }}
                  onMouseEnter={e => (e.currentTarget.style.color = t.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}
                >
                  <XMarkIcon style={{ width: 10, height: 10 }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content tabs bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 34, background: isDark ? '#0a0a0a' : '#f9fafb', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, gap: 2 }}>
        {contentTabList.map(id => (
          <button key={id} onClick={() => setContentTab(id)} style={{ padding: '3px 10px', borderRadius: 5, background: activeContentTab === id ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent', border: 'none', cursor: 'pointer', color: activeContentTab === id ? t.text : t.textSub, fontSize: 11, fontWeight: activeContentTab === id ? 500 : 400, textTransform: 'capitalize', transition: 'all 0.1s' }}>
            {id}
          </button>
        ))}
        {/* Namespace/name indicator */}
        {activeRes && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {activeRes.namespace && <span style={{ fontSize: 10, color: t.textMuted, ...mono }}>{activeRes.namespace}</span>}
          </div>
        )}
      </div>

      {/* ── Manifest toolbar ── */}
      {activeContentTab === 'manifest' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, background: isDark ? '#060608' : '#f4f5f7' }}>
          {!yamlState.editing ? (
            <>
              <button onClick={() => { navigator.clipboard.writeText(yamlState.content); updateYaml(activeId, { copyDone: true }); setTimeout(() => updateYaml(activeId, { copyDone: false }), 1500); }}
                style={{ background: t.navHoverBg, border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 10px', fontSize: 10.5, color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {yamlState.copyDone ? <><CheckIcon style={{ width: 10, height: 10, color: '#22c55e' }} /> Copied</> : <><ClipboardDocumentIcon style={{ width: 10, height: 10 }} /> Copy</>}
              </button>
              <button onClick={() => updateYaml(activeId, { editing: true })}
                style={{ background: t.navHoverBg, border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 10px', fontSize: 10.5, color: t.text, cursor: 'pointer' }}>
                Edit
              </button>
            </>
          ) : (
            <>
              <button onClick={() => updateYaml(activeId, { editing: false })}
                style={{ background: 'transparent', border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 9px', fontSize: 10.5, color: t.textSub, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveYaml} disabled={yamlState.saving}
                style={{ background: '#3b82f6', border: 'none', borderRadius: 5, padding: '2px 10px', fontSize: 10.5, color: '#fff', cursor: yamlState.saving ? 'wait' : 'pointer', fontWeight: 500 }}>
                {yamlState.saving ? 'Applying…' : 'Apply'}
              </button>
            </>
          )}
          <button onClick={() => activeRes && fetchYaml(activeId, activeRes)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, marginLeft: 2 }}>
            <ArrowPathIcon style={{ width: 10, height: 10 }} /> Refresh
          </button>
          {yamlState.content && !yamlState.loading && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: t.textMuted }}>{yamlState.content.split('\n').length} lines</span>
          )}
        </div>
      )}

      {/* ── Decode warning ── */}
      {activeContentTab === 'decode' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, background: 'rgba(234,179,8,0.06)', fontSize: 11, color: '#d97706' }}>
          <EyeIcon style={{ width: 12, height: 12 }} />
          Decoded secret values — handle with care
        </div>
      )}

      {/* ── Logs toolbar ── */}
      {activeContentTab === 'logs' && isPod && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, background: isDark ? '#060608' : '#f4f5f7' }}>
          {(activeRes?.resourceObj?.containers?.length ?? 0) > 1 && (
            <select value={podLogsState.container} onChange={e => { const c = e.target.value; updatePodLogs(activeId, { container: c, loaded: false, content: '' }); fetchPodLogs(activeId, activeRes!, c, podLogsState.tailLines); }}
              style={{ background: t.navHoverBg, border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 6px', fontSize: 10, color: t.textSub }}>
              {activeRes!.resourceObj.containers.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={podLogsState.tailLines} onChange={e => { const tl = Number(e.target.value); updatePodLogs(activeId, { tailLines: tl, loaded: false, content: '' }); fetchPodLogs(activeId, activeRes!, podLogsState.container, tl); }}
            style={{ background: t.navHoverBg, border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 6px', fontSize: 10, color: t.textSub }}>
            {[100, 200, 300, 500, 1000].map(n => <option key={n} value={n}>{n} lines</option>)}
          </select>
          <button onClick={() => fetchPodLogs(activeId, activeRes!, podLogsState.container, podLogsState.tailLines)}
            style={{ background: t.navHoverBg, border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 9px', fontSize: 10, color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <ArrowPathIcon style={{ width: 9, height: 9 }} /> Refresh
          </button>
        </div>
      )}

      {/* ── Terminal toolbar ── */}
      {activeContentTab === 'terminal' && isPod && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, background: isDark ? '#060608' : '#f4f5f7' }}>
          {(activeRes?.resourceObj?.containers?.length ?? 0) > 1 && (
            <select value={podLogsState.container} onChange={e => updatePodLogs(activeId, { container: e.target.value })}
              style={{ background: t.navHoverBg, border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 6px', fontSize: 10, color: t.textSub }}>
              {activeRes!.resourceObj.containers.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={podTermState.shell} onChange={e => updatePodTerm(activeId, { shell: e.target.value as 'sh' | 'bash' })}
            style={{ background: t.navHoverBg, border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 6px', fontSize: 10, color: t.textSub }}>
            <option value="sh">sh</option>
            <option value="bash">bash</option>
          </select>
          {podTermState.history.length > 0 && (
            <button onClick={() => updatePodTerm(activeId, { history: [] })}
              style={{ background: t.navHoverBg, border: `1px solid ${t.cardBorder}`, borderRadius: 5, padding: '2px 9px', fontSize: 10, color: t.textSub, cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {activeContentTab === 'info' && (
          activeRes?.resourceObj
            ? <div style={{ flex: 1, overflow: 'auto' }}><InfoTab kind={activeRes.kind} resourceObj={activeRes.resourceObj} t={t} isDark={isDark} /></div>
            : <div style={{ padding: 20, fontSize: 12, color: t.textMuted }}>No info available — select a resource to view details</div>
        )}

        {activeContentTab === 'logs' && isPod && (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', background: isDark ? '#0a0a0a' : '#f3f4f6' }}>
            {podLogsState.loading
              ? <span style={{ fontSize: 12, color: t.textMuted }}>Fetching logs…</span>
              : <pre style={{ margin: 0, ...mono, fontSize: 11.5, lineHeight: 1.7, color: isDark ? '#86efac' : '#14532d', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{podLogsState.content}</pre>
            }
          </div>
        )}

        {activeContentTab === 'terminal' && isPod && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0c0c0c', overflow: 'hidden', fontFamily: "'SF Mono','Fira Code','Cascadia Code',Consolas,monospace" }}>
            <style>{`
              @keyframes termCaret { 0%,49%{opacity:1} 50%,100%{opacity:0} }
              .rdw-term-input::placeholder { color: #374151; }
              .rdw-qcmd:hover { background: rgba(255,255,255,0.1) !important; color: #f1f5f9 !important; }
            `}</style>
            {/* Quick commands bar */}
            <div style={{ display: 'flex', gap: 4, padding: '6px 12px', borderBottom: '1px solid #1c1c1c', background: '#080808', flexShrink: 0, overflowX: 'auto' }}>
              {['ls -la', 'ps aux', 'env', 'df -h', 'free -m', 'cat /etc/hosts', 'whoami', 'uname -a', 'top -bn1 | head -20'].map(cmd => (
                <button key={cmd} className="rdw-qcmd" onClick={() => { setTermInput(cmd); setTimeout(() => termInputRef.current?.focus(), 0); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#9ca3af', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.1s', flexShrink: 0, fontFamily: 'inherit' }}>
                  {cmd}
                </button>
              ))}
            </div>
            {/* Scrollable output */}
            <div ref={termBodyRef} style={{ flex: 1, overflow: 'auto', padding: '16px 20px', fontSize: 12.5, lineHeight: 1.6 }} onClick={() => termInputRef.current?.focus()}>
              <div style={{ color: '#4b5563', marginBottom: 16, fontSize: 11.5, borderBottom: '1px solid #1c1c1c', paddingBottom: 10 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#22c55e' }}>●</span>
                  {' '}
                  <span style={{ color: '#60a5fa' }}>{activeRes?.name}</span>
                  {podLogsState.container && <span style={{ color: '#6b7280' }}> [{podLogsState.container}]</span>}
                  <span style={{ color: '#374151' }}> · </span>
                  <span style={{ color: '#6b7280' }}>{activeRes?.namespace}</span>
                  <span style={{ color: '#374151' }}> · </span>
                  <span style={{ color: '#6b7280' }}>{podTermState.shell}</span>
                </div>
                <div style={{ fontSize: 10, color: '#374151' }}>↑↓ history · Ctrl+L clear · select a quick command above</div>
              </div>
              {podTermState.history.map((entry, i) => {
                const n = activeRes?.name || '';
                const sn = n.length > 20 ? n.slice(0, 20) + '…' : n;
                return (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ color: '#22c55e', userSelect: 'none' }}>{sn}</span>
                      <span style={{ color: '#4b5563', userSelect: 'none' }}> ~ </span>
                      <span style={{ color: '#60a5fa', userSelect: 'none' }}>{podTermState.shell === 'bash' ? '$' : '%'}&nbsp;</span>
                      <span style={{ color: '#f1f5f9' }}>{entry.cmd}</span>
                    </div>
                    {entry.out && <pre style={{ margin: '2px 0', color: '#d1d5db', fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{entry.out.trimEnd()}</pre>}
                    {entry.err && <pre style={{ margin: '2px 0', color: '#f87171', fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{entry.err.trimEnd()}</pre>}
                  </div>
                );
              })}
              {termRunning && activeRes && (() => { const n = activeRes.name; const sn = n.length > 20 ? n.slice(0, 20) + '…' : n; return (
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ color: '#22c55e', userSelect: 'none' }}>{sn}</span>
                  <span style={{ color: '#4b5563', userSelect: 'none' }}> ~ </span>
                  <span style={{ color: '#60a5fa', userSelect: 'none' }}>{podTermState.shell === 'bash' ? '$' : '%'}&nbsp;</span>
                  <span style={{ color: '#fbbf24', animation: 'termCaret 1s step-end infinite' }}>▋</span>
                </div>
              ); })()}
            </div>
            {/* Input row */}
            <form onSubmit={runCommand} style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', borderTop: '1px solid #1c1c1c', background: '#080808', flexShrink: 0 }}>
              {activeRes && (() => { const n = activeRes.name; const sn = n.length > 20 ? n.slice(0, 20) + '…' : n; return (<>
                <span style={{ color: '#22c55e', fontSize: 12.5, userSelect: 'none', flexShrink: 0 }}>{sn}</span>
                <span style={{ color: '#4b5563', fontSize: 12.5, userSelect: 'none', flexShrink: 0 }}> ~ </span>
                <span style={{ color: '#60a5fa', fontSize: 12.5, userSelect: 'none', flexShrink: 0 }}>{podTermState.shell === 'bash' ? '$' : '%'}&nbsp;</span>
              </>); })()}
              <input
                ref={termInputRef}
                className="rdw-term-input"
                value={termInput}
                onChange={e => { setTermInput(e.target.value); setHistIdx(-1); }}
                onKeyDown={handleTermKey}
                disabled={termRunning}
                placeholder={termRunning ? '' : 'type a command…'}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.6, opacity: termRunning ? 0.3 : 1, caretColor: '#22c55e' }}
              />
            </form>
          </div>
        )}

        {activeContentTab === 'pods' && activeRes && (
          <PodsPane ownerName={activeRes.name} namespace={activeRes.namespace} t={t} isDark={isDark} onOpenPod={onOpenPod} />
        )}

        {activeContentTab === 'manifest' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', background: isDark ? '#080a0e' : '#f8f9fb' }}>
            {yamlState.loading
              ? <span style={{ fontSize: 12, color: t.textMuted }}>Loading manifest…</span>
              : <YamlView content={yamlState.content} editing={yamlState.editing} onChange={v => updateYaml(activeId, { content: v })} isDark={isDark} t={t} />
            }
          </div>
        )}

        {activeContentTab === 'events' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <EventsPane events={evtState.list} loading={evtState.loading} t={t} isDark={isDark} />
          </div>
        )}

        {activeContentTab === 'decode' && isSecret && (
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {yamlState.loading
              ? <span style={{ fontSize: 12, color: t.textMuted }}>Loading…</span>
              : decodeSecretData(yamlState.content).length === 0
                ? <div style={{ fontSize: 12, color: t.textMuted }}>No data entries found</div>
                : decodeSecretData(yamlState.content).map(({ key, value }) => (
                  <SecretValueRow key={key} secretKey={key} value={value} t={t} isDark={isDark} />
                ))
            }
          </div>
        )}
      </div>

      {/* ── Resize handle ── */}
      {winState === 'normal' && (
        <div
          onMouseDown={e => { e.stopPropagation(); resizing.current = true; resizeOff.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h }; }}
          style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, cursor: 'se-resize', zIndex: 2, background: 'linear-gradient(135deg, transparent 50%, rgba(128,128,128,0.2) 50%)', borderRadius: '0 0 12px 0' }}
        />
      )}
    </div>
  );
}
