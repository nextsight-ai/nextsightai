import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import type { OptimizationDashboardResponse } from '../../types';
import { formatBytes } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';

// Severity inline style maps
const severityLeftBorder: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const severityBg: Record<string, string> = {
  critical: 'rgba(239,68,68,0.05)',
  high: 'rgba(249,115,22,0.05)',
  medium: 'rgba(234,179,8,0.05)',
  low: 'rgba(59,130,246,0.05)',
};

const severityBadgeBg: Record<string, string> = {
  critical: 'rgba(239,68,68,0.12)',
  high: 'rgba(249,115,22,0.12)',
  medium: 'rgba(234,179,8,0.12)',
  low: 'rgba(59,130,246,0.12)',
};

const severityBadgeText: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

type Severity = 'critical' | 'high' | 'medium' | 'low';
type OptimizationType = 'over_provisioned' | 'idle_resource' | 'missing_limits' | 'missing_requests' | 'underprovisioned' | 'no_limits' | 'no_requests';

interface ResourceOptimization {
  id: string;
  workload_name: string;
  workload_type: string;
  namespace: string;
  severity: Severity;
  optimization_type: OptimizationType;
  issue: string;
  current_state: string;
  recommendation: string;
  estimated_savings: number;
  efficiency_score?: number;
  kubectl_command: string;
  safe_to_apply: boolean;
}

function formatMillicores(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} cores`;
  return `${m}m`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Convert API data to ResourceOptimization cards
function convertToOptimizations(dashboardData: OptimizationDashboardResponse): ResourceOptimization[] {
  const optimizations: ResourceOptimization[] = [];

  // Over-provisioned pods (wasteful)
  dashboardData.top_wasteful_pods.forEach((pod, idx) => {
    const cpuEff = pod.cpu_efficiency?.score || 0;
    const memEff = pod.memory_efficiency?.score || 0;
    const avgEff = (cpuEff + memEff) / 2;

    const severity: Severity = avgEff < 10 ? 'critical' : avgEff < 20 ? 'high' : avgEff < 30 ? 'medium' : 'low';

    const currentCPU = formatMillicores(pod.total_cpu_request_millicores || 0);
    const currentMem = formatBytes(pod.total_memory_request_bytes || 0);
    const recCPU = formatMillicores(pod.containers[0]?.cpu_recommendation_millicores || 0);
    const recMem = formatBytes(pod.containers[0]?.memory_recommendation_bytes || 0);

    optimizations.push({
      id: `wasteful-${idx}`,
      workload_name: pod.owner_name || pod.name,
      workload_type: pod.owner_kind || 'Pod',
      namespace: pod.namespace,
      severity,
      optimization_type: 'over_provisioned',
      issue: `Running at ${avgEff.toFixed(0)}% capacity - over-provisioned`,
      current_state: `CPU: ${currentCPU}, Memory: ${currentMem}`,
      recommendation: `Right-size to CPU: ${recCPU}, Memory: ${recMem}`,
      estimated_savings: pod.potential_savings * 720 || 0,
      efficiency_score: avgEff,
      kubectl_command: `kubectl set resources ${(pod.owner_kind || 'deployment').toLowerCase()}/${pod.owner_name || pod.name} -n ${pod.namespace} --limits=cpu=${recCPU},memory=${recMem} --requests=cpu=${recCPU},memory=${recMem}`,
      safe_to_apply: true,
    });
  });

  // Idle/underutilized pods
  dashboardData.top_underprovisioned_pods.forEach((pod, idx) => {
    if ((pod.cpu_efficiency?.score || 100) < 5 || (pod.memory_efficiency?.score || 100) < 5) {
      optimizations.push({
        id: `idle-${idx}`,
        workload_name: pod.owner_name || pod.name,
        workload_type: pod.owner_kind || 'Pod',
        namespace: pod.namespace,
        severity: 'high',
        optimization_type: 'idle_resource',
        issue: 'Using less than 5% of allocated resources',
        current_state: `CPU: ${formatMillicores(pod.total_cpu_request_millicores || 0)}, Memory: ${formatBytes(pod.total_memory_request_bytes || 0)}`,
        recommendation: 'Consider scaling down or removing if not needed',
        estimated_savings: pod.potential_savings * 720 || 0,
        efficiency_score: (pod.cpu_efficiency?.score || 0),
        kubectl_command: `kubectl scale ${(pod.owner_kind || 'deployment').toLowerCase()}/${pod.owner_name || pod.name} --replicas=0 -n ${pod.namespace}`,
        safe_to_apply: false,
      });
    }
  });

  // Missing limits - waste issue (can't bin-pack efficiently)
  dashboardData.recommendations
    .filter(rec => rec.type.toLowerCase() === 'no_limits')
    .forEach((rec, idx) => {
      optimizations.push({
        id: `no-limits-${idx}`,
        workload_name: rec.resource_name,
        workload_type: rec.resource_kind,
        namespace: rec.namespace,
        severity: rec.severity as Severity || 'medium',
        optimization_type: 'no_limits',
        issue: 'No resource limits - inefficient bin-packing',
        current_state: 'No limits set',
        recommendation: `Set limits: CPU ${rec.recommended_cpu_limit || '500m'}, Memory ${rec.recommended_memory_limit || '512Mi'}`,
        estimated_savings: 0,
        kubectl_command: `kubectl set resources ${rec.resource_kind.toLowerCase()}/${rec.resource_name} -n ${rec.namespace} --limits=cpu=${rec.recommended_cpu_limit || '500m'},memory=${rec.recommended_memory_limit || '512Mi'}`,
        safe_to_apply: true,
      });
    });

  // Missing requests - waste issue (scheduler can't place efficiently)
  dashboardData.recommendations
    .filter(rec => rec.type.toLowerCase() === 'no_requests')
    .forEach((rec, idx) => {
      optimizations.push({
        id: `no-requests-${idx}`,
        workload_name: rec.resource_name,
        workload_type: rec.resource_kind,
        namespace: rec.namespace,
        severity: rec.severity as Severity || 'medium',
        optimization_type: 'no_requests',
        issue: 'No resource requests - inefficient scheduling',
        current_state: 'No requests set',
        recommendation: `Set requests: CPU ${rec.recommended_cpu_request || '250m'}, Memory ${rec.recommended_memory_request || '256Mi'}`,
        estimated_savings: 0,
        kubectl_command: `kubectl set resources ${rec.resource_kind.toLowerCase()}/${rec.resource_name} -n ${rec.namespace} --requests=cpu=${rec.recommended_cpu_request || '250m'},memory=${rec.recommended_memory_request || '256Mi'}`,
        safe_to_apply: true,
      });
    });

  return optimizations;
}

// Compact optimization card
function OptimizationCard({ optimization, isExpanded, onToggle, isReviewed, onMarkReviewed }: {
  optimization: ResourceOptimization;
  isExpanded: boolean;
  onToggle: () => void;
  isReviewed: boolean;
  onMarkReviewed: () => void;
}) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(optimization.kubectl_command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const optimizationTypeLabels: Record<OptimizationType, string> = {
    over_provisioned: '📉 Over-provisioned',
    idle_resource: '💤 Idle Resource',
    missing_limits: '⚠️ No Limits',
    missing_requests: '🔴 No Requests',
    underprovisioned: '📈 Underprovisioned',
    no_limits: '⚠️ No Limits',
    no_requests: '🔴 No Requests',
  };

  const sev = optimization.severity;
  const borderColor = severityLeftBorder[sev];
  const bg = isReviewed ? t.cardBg : severityBg[sev];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${t.cardBorder}`,
        borderLeft: `3px solid ${borderColor}`,
        background: bg,
        marginBottom: 8,
        opacity: isReviewed ? 0.65 : 1,
      }}
    >
      {/* Compact Header - Always Visible */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Severity Badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 9999,
            fontSize: 10,
            fontWeight: 600,
            background: severityBadgeBg[sev],
            color: severityBadgeText[sev],
            textDecoration: isReviewed ? 'line-through' : 'none',
            textTransform: 'uppercase',
          }}>
            {sev}
          </span>

          {/* Workload Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: t.text }}>
                {optimization.workload_name}
              </span>
              <span style={{
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                background: t.mainBg,
                color: t.textSub,
              }}>
                {optimizationTypeLabels[optimization.optimization_type]}
              </span>
              {optimization.estimated_savings > 0 && (
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 500,
                  background: 'rgba(34,197,94,0.12)',
                  color: '#4ade80',
                }}>
                  💰 {formatCurrency(optimization.estimated_savings)}/mo
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
              {optimization.namespace} • {optimization.workload_type}
              {optimization.efficiency_score !== undefined && ` • ${optimization.efficiency_score.toFixed(0)}% efficiency`}
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={onToggle}
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
        ⚠️ {optimization.issue}
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
          {/* Current State */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Current State
            </div>
            <div style={{ fontSize: 11, color: t.textSub }}>{optimization.current_state}</div>
          </div>

          {/* Recommendation */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Recommendation
            </div>
            <div style={{ fontSize: 11, color: t.textSub }}>{optimization.recommendation}</div>
          </div>

          {/* Kubectl Command */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Kubectl Command
              </div>
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  fontSize: 10,
                  borderRadius: 4,
                  background: t.mainBg,
                  border: `1px solid ${t.cardBorder}`,
                  color: t.textSub,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = t.mainBg)}
              >
                <ClipboardDocumentIcon style={{ width: 10, height: 10 }} />
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{
              background: '#0d0d0d',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#4ade80',
              fontSize: 10,
              fontFamily: mono.fontFamily,
              overflowX: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {optimization.kubectl_command}
            </pre>
          </div>

          {/* Footer: safety + mark reviewed */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${t.cardBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {optimization.safe_to_apply ? (
                <>
                  <CheckCircleIcon style={{ width: 12, height: 12, color: '#4ade80' }} />
                  <span style={{ fontSize: 10, color: '#4ade80' }}>Safe to apply</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon style={{ width: 12, height: 12, color: '#f97316' }} />
                  <span style={{ fontSize: 10, color: '#f97316' }}>Review carefully before applying</span>
                </>
              )}
            </div>
            {!isReviewed && (
              <button
                onClick={onMarkReviewed}
                style={{
                  padding: '4px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 4,
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  color: '#60a5fa',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
              >
                Mark Reviewed
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function ResourceOptimizationDashboard({
  dashboardData
}: {
  dashboardData: OptimizationDashboardResponse
}) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  // Filters
  const [filterNamespace, setFilterNamespace] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // UI state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [markedReviewed, setMarkedReviewed] = useState<Set<string>>(new Set());

  const optimizations = convertToOptimizations(dashboardData);

  // Get unique values for filters
  const namespaces = Array.from(new Set(optimizations.map(o => o.namespace))).sort();

  // Apply filters
  const filteredOptimizations = optimizations.filter(opt => {
    if (filterNamespace !== 'all' && opt.namespace !== filterNamespace) return false;
    if (filterSeverity !== 'all' && opt.severity !== filterSeverity) return false;
    if (filterType !== 'all' && opt.optimization_type !== filterType) return false;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMarkReviewed = (id: string) => {
    setMarkedReviewed(prev => new Set([...prev, id]));
  };

  const totalSavings = filteredOptimizations.reduce((sum, opt) => sum + opt.estimated_savings, 0);
  const reviewedCount = filteredOptimizations.filter(opt => markedReviewed.has(opt.id)).length;
  const criticalHighCount = filteredOptimizations.filter(o => o.severity === 'critical' || o.severity === 'high').length;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Fixed Header */}
      <div style={{ flexShrink: 0, marginBottom: 16 }}>

        {/* Summary Strip — 4 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          {/* Total Issues */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Issues</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.text, marginTop: 4, ...mono }}>{filteredOptimizations.length}</div>
          </div>
          {/* Reviewed */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Reviewed</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.info, marginTop: 4, ...mono }}>{reviewedCount}</div>
          </div>
          {/* Critical/High */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Critical / High</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4, ...mono }}>{criticalHighCount}</div>
          </div>
          {/* Potential Savings */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Potential Savings</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#4ade80', marginTop: 4, ...mono }}>
              {formatCurrency(totalSavings)}<span style={{ fontSize: 11, fontWeight: 400 }}>/mo</span>
            </div>
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
        }}>
          <FunnelIcon style={{ width: 14, height: 14, color: t.textMuted, flexShrink: 0 }} />
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={selectStyle}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterNamespace} onChange={(e) => setFilterNamespace(e.target.value)} style={selectStyle}>
            <option value="all">All Namespaces</option>
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
            <option value="all">All Types</option>
            <option value="over_provisioned">Over-provisioned</option>
            <option value="idle_resource">Idle Resources</option>
            <option value="no_limits">Missing Limits</option>
            <option value="no_requests">Missing Requests</option>
          </select>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CurrencyDollarIcon style={{ width: 12, height: 12 }} />
            {filteredOptimizations.length - reviewedCount} pending
          </div>
        </div>
      </div>

      {/* Scrollable Cards Section */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {filteredOptimizations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: t.textMuted }}>
            <CheckCircleIcon style={{ width: 40, height: 40, margin: '0 auto 8px', color: '#4ade80' }} />
            <p style={{ fontSize: 12 }}>No optimization opportunities found with current filters</p>
          </div>
        ) : (
          filteredOptimizations.map(optimization => (
            <OptimizationCard
              key={optimization.id}
              optimization={optimization}
              isExpanded={expandedCards.has(optimization.id)}
              onToggle={() => toggleExpand(optimization.id)}
              isReviewed={markedReviewed.has(optimization.id)}
              onMarkReviewed={() => handleMarkReviewed(optimization.id)}
            />
          ))
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
          Resource efficiency recommendations based on current usage patterns • Validate in staging before production
        </p>
      </div>
    </div>
  );
}
