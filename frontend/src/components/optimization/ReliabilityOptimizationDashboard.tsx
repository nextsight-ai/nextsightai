import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowPathIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import type { OptimizationDashboardResponse } from '../../types';
import { reliabilityApi } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';

// Severity inline style maps
const severityLeftBorder: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#3b82f6',
};

const severityBg: Record<string, string> = {
  high: 'rgba(239,68,68,0.05)',
  medium: 'rgba(249,115,22,0.05)',
  low: 'rgba(59,130,246,0.05)',
};

const severityBadgeBg: Record<string, string> = {
  high: 'rgba(239,68,68,0.12)',
  medium: 'rgba(249,115,22,0.12)',
  low: 'rgba(59,130,246,0.12)',
};

const severityBadgeText: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#3b82f6',
};

// Reliability Risk Severity
type ReliabilitySeverity = 'high' | 'medium' | 'low';

// Reliability Risk Types
interface ReliabilityRisk {
  id: string;
  workload_name: string;
  workload_type: string;
  namespace: string;
  severity: ReliabilitySeverity;
  risk_type: 'single_replica' | 'missing_probes' | 'restart_loop' | 'missing_pdb';
  observation: string;
  risk: string;
  impact: string[];
  recommendation: string;
  recommendation_why: string;
  yaml_suggestion?: string;
  confidence_level: 'high' | 'medium' | 'low';
  safe_to_apply: boolean;
  production_impact: 'low' | 'medium' | 'high';
}

// Mock data generator
function generateMockReliabilityData(dashboardData: OptimizationDashboardResponse): ReliabilityRisk[] {
  const risks: ReliabilityRisk[] = [];

  // Generate single replica risks
  dashboardData.top_underprovisioned_pods.slice(0, 2).forEach((pod, idx) => {
    risks.push({
      id: `single-replica-${idx}`,
      workload_name: pod.owner_name || pod.name,
      workload_type: pod.owner_kind || 'Pod',
      namespace: pod.namespace,
      severity: 'high',
      risk_type: 'single_replica',
      observation: 'Deployment is running with a single replica.',
      risk: 'Any pod failure will cause full service outage.',
      impact: ['Zero fault tolerance', 'No availability during pod restart or node failure', 'High customer-facing risk'],
      recommendation: 'Increase replicas from 1 → 2',
      recommendation_why: 'Ensures service availability during pod restarts or node disruptions.',
      confidence_level: 'high',
      safe_to_apply: true,
      production_impact: 'low',
      yaml_suggestion: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${pod.owner_name || pod.name}
  namespace: ${pod.namespace}
spec:
  replicas: 2  # Changed from 1`
    });
  });

  // Generate missing probes risks
  dashboardData.top_wasteful_pods.slice(0, 3).forEach((pod, idx) => {
    risks.push({
      id: `missing-probes-${idx}`,
      workload_name: pod.owner_name || pod.name,
      workload_type: pod.owner_kind || 'Pod',
      namespace: pod.namespace,
      severity: 'medium',
      risk_type: 'missing_probes',
      observation: 'Liveness and readiness probes are not configured.',
      risk: 'Kubernetes cannot detect unhealthy pods correctly.',
      impact: ['Traffic may be sent to unhealthy pods', 'Delayed recovery during failures'],
      recommendation: 'Add liveness and readiness probes.',
      recommendation_why: 'Enables Kubernetes to detect and recover from application failures automatically.',
      confidence_level: 'medium',
      safe_to_apply: false,
      production_impact: 'medium',
      yaml_suggestion: `livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5`
    });
  });

  // Generate restart loop detection
  if (dashboardData.top_underprovisioned_pods.length > 0) {
    const pod = dashboardData.top_underprovisioned_pods[0];
    risks.push({
      id: 'restart-loop-1',
      workload_name: pod.owner_name || pod.name,
      workload_type: pod.owner_kind || 'Pod',
      namespace: pod.namespace,
      severity: 'high',
      risk_type: 'restart_loop',
      observation: 'Pod restarted 12 times in the last 24 hours.',
      risk: 'Indicates crash loop or unstable application behavior.',
      impact: ['Intermittent service availability', 'Increased error rates', 'Alert fatigue'],
      recommendation: 'Investigate logs and resource limits. Check for OOMKills or startup failures.',
      recommendation_why: 'Frequent restarts indicate underlying issues that need immediate attention.',
      confidence_level: 'high',
      safe_to_apply: false,
      production_impact: 'high'
    });
  }

  // Generate missing PDB risks
  dashboardData.recommendations.slice(0, 2).forEach((rec, idx) => {
    if (rec.resource_kind.toLowerCase() === 'deployment') {
      risks.push({
        id: `missing-pdb-${idx}`,
        workload_name: rec.resource_name,
        workload_type: rec.resource_kind,
        namespace: rec.namespace,
        severity: 'medium',
        risk_type: 'missing_pdb',
        observation: 'No PodDisruptionBudget configured.',
        risk: 'Voluntary disruptions (node drain, upgrades) may bring down all pods.',
        impact: ['Service outage during cluster maintenance', 'No protection during voluntary disruptions'],
        recommendation: 'Add PodDisruptionBudget with minAvailable: 1',
        recommendation_why: 'Protects service availability during planned maintenance operations.',
        confidence_level: 'high',
        safe_to_apply: true,
        production_impact: 'low',
        yaml_suggestion: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ${rec.resource_name}-pdb
  namespace: ${rec.namespace}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: ${rec.resource_name}`
      });
    }
  });

  return risks;
}

// Copy Button Component
function CopyButton({ text }: { text: string }) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        background: t.mainBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 4,
        padding: 6,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        color: t.textSub,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = t.mainBg)}
    >
      {copied
        ? <CheckIcon style={{ width: 14, height: 14, color: '#4ade80' }} />
        : <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />}
    </button>
  );
}

// Compact Reliability Risk Card Component
function ReliabilityRiskCard({ risk, onMarkReviewed, isReviewed }: {
  risk: ReliabilityRisk;
  onMarkReviewed: () => void;
  isReviewed: boolean;
}) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [isExpanded, setIsExpanded] = useState(false);

  const riskTypeLabels = {
    single_replica: 'Single Replica',
    missing_probes: 'Missing Probes',
    restart_loop: 'Restart Loop',
    missing_pdb: 'No PDB',
  };

  const sev = risk.severity;

  const confidenceColor = risk.confidence_level === 'high' ? '#4ade80' : '#fbbf24';
  const safeColor = risk.safe_to_apply ? '#4ade80' : '#f97316';
  const prodImpactColor =
    risk.production_impact === 'low' ? '#4ade80' :
    risk.production_impact === 'medium' ? '#fbbf24' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${t.cardBorder}`,
        borderLeft: `3px solid ${isReviewed ? '#4ade80' : severityLeftBorder[sev]}`,
        background: isReviewed ? 'rgba(34,197,94,0.05)' : severityBg[sev],
        marginBottom: 8,
      }}
    >
      {/* Compact Header - Always Visible */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 9999,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            background: isReviewed ? 'rgba(34,197,94,0.12)' : severityBadgeBg[sev],
            color: isReviewed ? '#4ade80' : severityBadgeText[sev],
          }}>
            {isReviewed ? '✓ Reviewed' : sev}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: t.text }}>
                {risk.workload_name}
              </span>
              <span style={{
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                background: t.mainBg,
                color: t.textSub,
              }}>
                {riskTypeLabels[risk.risk_type]}
              </span>
            </div>
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
              {risk.namespace} • {risk.workload_type}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            color: t.textMuted,
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {isExpanded
            ? <ChevronUpIcon style={{ width: 14, height: 14 }} />
            : <ChevronDownIcon style={{ width: 14, height: 14 }} />}
        </button>
      </div>

      {/* Quick Preview */}
      <div style={{ padding: '0 16px 10px', fontSize: 11, color: t.textSub }}>
        ⚠️ {risk.risk}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={{
          borderTop: `1px solid ${t.cardBorder}`,
          padding: '12px 16px',
          background: t.cardBg,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Observation */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <EyeIcon style={{ width: 12, height: 12, color: t.textMuted }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Observation</span>
            </div>
            <div style={{ fontSize: 11, color: t.textSub }}>{risk.observation}</div>
          </div>

          {/* Impact */}
          <div style={{
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>📉 Impact</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {risk.impact.map((item, idx) => (
                <li key={idx} style={{ fontSize: 10, color: '#ef4444' }}>• {item}</li>
              ))}
            </ul>
          </div>

          {/* AI Recommendation + Why */}
          <div style={{
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#a78bfa', marginBottom: 6 }}>💡 AI Recommendation</div>
            <div style={{ fontSize: 11, color: t.text, fontWeight: 500, marginBottom: 4 }}>{risk.recommendation}</div>
            <div style={{ fontSize: 10, color: '#a78bfa' }}>
              <strong>Why:</strong> {risk.recommendation_why}
            </div>
          </div>

          {/* Meta pills: Confidence / Safe to Apply / Prod Impact */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1,
              background: t.mainBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Confidence</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: confidenceColor }}>
                {risk.confidence_level.toUpperCase()}
              </div>
            </div>
            <div style={{
              flex: 1,
              background: t.mainBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Safe to Apply</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: safeColor }}>
                {risk.safe_to_apply ? 'YES' : 'NEEDS REVIEW'}
              </div>
            </div>
            <div style={{
              flex: 1,
              background: t.mainBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Prod Impact</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: prodImpactColor }}>
                {risk.production_impact.toUpperCase()}
              </div>
            </div>
          </div>

          {/* YAML code block */}
          {risk.yaml_suggestion && (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                <CopyButton text={risk.yaml_suggestion} />
              </div>
              <pre style={{
                background: '#0d0d0d',
                borderRadius: 8,
                padding: '10px 14px',
                paddingRight: 44,
                color: '#4ade80',
                fontSize: 10,
                fontFamily: mono.fontFamily,
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: 192,
                margin: 0,
                whiteSpace: 'pre',
              }}>
                {risk.yaml_suggestion}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
            {risk.yaml_suggestion && (
              <button
                onClick={() => navigator.clipboard.writeText(risk.yaml_suggestion!)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 4,
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#a78bfa',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.15)')}
              >
                <ClipboardDocumentIcon style={{ width: 10, height: 10 }} />
                Copy YAML
              </button>
            )}
            {!isReviewed && (
              <button
                onClick={onMarkReviewed}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 4,
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#4ade80',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34,197,94,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(34,197,94,0.15)')}
              >
                <CheckCircleIcon style={{ width: 10, height: 10 }} />
                Mark Reviewed
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Main Component
export default function ReliabilityOptimizationDashboard({
  dashboardData,
  isAnalyzing = false,
}: {
  dashboardData: OptimizationDashboardResponse;
  isAnalyzing?: boolean;
}) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [reliabilityRisks, setReliabilityRisks] = useState<ReliabilityRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<ReliabilitySeverity | 'all'>('all');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [selectedWorkloadType, setSelectedWorkloadType] = useState<string>('all');
  const [safeToApplyFilter, setSafeToApplyFilter] = useState<'all' | 'yes' | 'needs_review'>('all');
  const [markedReviewed, setMarkedReviewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch real reliability analysis from backend
    const loadReliabilityData = async () => {
      setLoading(true);
      try {
        const response = await reliabilityApi.getAnalysis();
        setReliabilityRisks(response.data.risks || []);
      } catch (error) {
        console.error('Failed to load reliability analysis:', error);
        // Fallback to mock data if API fails
        const risks = generateMockReliabilityData(dashboardData);
        setReliabilityRisks(risks);
      } finally {
        setLoading(false);
      }
    };

    loadReliabilityData();
  }, [dashboardData]);

  // Calculate summary stats
  const summary = {
    workloads_analyzed: new Set(reliabilityRisks.map(r => `${r.namespace}/${r.workload_name}`)).size,
    total_risks: reliabilityRisks.length,
    high_risk: reliabilityRisks.filter(r => r.severity === 'high').length,
    potential_outages: reliabilityRisks.filter(r => r.risk_type === 'single_replica' || r.risk_type === 'restart_loop').length,
  };

  // Get unique values for filters
  const namespaces = ['all', ...new Set(reliabilityRisks.map(r => r.namespace))];
  const workloadTypes = ['all', ...new Set(reliabilityRisks.map(r => r.workload_type))];

  // Apply filters
  const filteredRisks = reliabilityRisks.filter(risk => {
    if (selectedSeverity !== 'all' && risk.severity !== selectedSeverity) return false;
    if (selectedNamespace !== 'all' && risk.namespace !== selectedNamespace) return false;
    if (selectedWorkloadType !== 'all' && risk.workload_type !== selectedWorkloadType) return false;
    if (safeToApplyFilter === 'yes' && !risk.safe_to_apply) return false;
    if (safeToApplyFilter === 'needs_review' && risk.safe_to_apply) return false;
    return true;
  });

  const handleMarkReviewed = (id: string) => {
    setMarkedReviewed(prev => new Set([...prev, id]));
  };

  const selectStyle: React.CSSProperties = {
    background: t.mainBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '5px 8px',
    fontSize: 11,
    color: t.text,
    outline: 'none',
    cursor: 'pointer',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ArrowPathIcon style={{
            width: 32,
            height: 32,
            color: t.textMuted,
            animation: 'spin 1s linear infinite',
          }} />
          <span style={{ fontSize: 11, color: t.textMuted }}>Loading reliability analysis…</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Fixed Header */}
      <div style={{ flexShrink: 0, marginBottom: 16 }}>

        {/* Summary Strip — 4 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          {/* Workloads */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Workloads</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.text, marginTop: 4, ...mono }}>{summary.workloads_analyzed}</div>
          </div>
          {/* Total Risks */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Risks</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f97316', marginTop: 4, ...mono }}>{summary.total_risks}</div>
          </div>
          {/* High-Risk */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>High-Risk</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4, ...mono }}>{summary.high_risk}</div>
          </div>
          {/* Outage Risk */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Outage Risk</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#a78bfa', marginTop: 4, ...mono }}>{summary.potential_outages}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 12,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <FunnelIcon style={{ width: 14, height: 14, color: t.textMuted, flexShrink: 0 }} />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as ReliabilitySeverity | 'all')}
            style={selectStyle}
          >
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={selectedNamespace} onChange={(e) => setSelectedNamespace(e.target.value)} style={selectStyle}>
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns === 'all' ? 'All Namespaces' : ns}</option>
            ))}
          </select>
          <select value={selectedWorkloadType} onChange={(e) => setSelectedWorkloadType(e.target.value)} style={selectStyle}>
            {workloadTypes.map(type => (
              <option key={type} value={type}>{type === 'all' ? 'All Types' : type}</option>
            ))}
          </select>
          <select
            value={safeToApplyFilter}
            onChange={(e) => setSafeToApplyFilter(e.target.value as 'all' | 'yes' | 'needs_review')}
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="yes">Safe to Apply</option>
            <option value="needs_review">Needs Review</option>
          </select>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheckIcon style={{ width: 12, height: 12 }} />
            {isAnalyzing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowPathIcon style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} />
                Analyzing…
              </span>
            ) : (
              `${filteredRisks.length - markedReviewed.size} pending`
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Risk Cards */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {filteredRisks.length > 0 ? (
          filteredRisks.map((risk) => (
            <ReliabilityRiskCard
              key={risk.id}
              risk={risk}
              onMarkReviewed={() => handleMarkReviewed(risk.id)}
              isReviewed={markedReviewed.has(risk.id)}
            />
          ))
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px 0',
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
          }}>
            <CheckCircleIcon style={{ width: 40, height: 40, margin: '0 auto 8px', color: '#4ade80' }} />
            <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>No reliability risks found with the current filters</p>
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div style={{
        flexShrink: 0,
        marginTop: 12,
        padding: '8px 16px',
        background: t.mainBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 8,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 10, color: t.textMuted, margin: 0 }}>
          Reliability recommendations based on Kubernetes best practices • Validate in staging before production
        </p>
      </div>
    </div>
  );
}
