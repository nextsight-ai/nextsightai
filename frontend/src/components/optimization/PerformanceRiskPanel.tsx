import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  BoltIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  CheckCircleIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CpuChipIcon,
  CircleStackIcon,
  FireIcon,
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

interface PerformanceRiskPanelProps {
  dashboardData: OptimizationDashboardResponse;
}

type Severity = 'critical' | 'high' | 'medium' | 'low';
type PerformanceRiskType = 'cpu_throttling' | 'memory_pressure' | 'high_cpu_usage' | 'high_memory_usage';

interface PerformanceRisk {
  id: string;
  workload_name: string;
  workload_type: string;
  namespace: string;
  severity: Severity;
  risk_type: PerformanceRiskType;
  observation: string;
  current_usage: string;
  impact: string[];
  recommendation: string;
  recommendation_why: string;
  kubectl_command?: string;
  confidence_level: 'high' | 'medium' | 'low';
}

function formatMillicores(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} cores`;
  return `${m}m`;
}

// Generate performance risks from dashboard data
function generatePerformanceRisks(dashboardData: OptimizationDashboardResponse): PerformanceRisk[] {
  const risks: PerformanceRisk[] = [];

  // CPU Throttling - pods using >80% of their CPU limits
  dashboardData.top_underprovisioned_pods.forEach((pod, idx) => {
    const cpuUsagePercent = pod.cpu_efficiency?.score || 0;

    // High CPU usage indicates potential throttling
    if (cpuUsagePercent > 80) {
      const currentCPU = formatMillicores(pod.total_cpu_request_millicores || 0);
      const recommendedCPU = formatMillicores((pod.total_cpu_request_millicores || 0) * 1.5);

      risks.push({
        id: `cpu-throttle-${idx}`,
        workload_name: pod.owner_name || pod.name,
        workload_type: pod.owner_kind || 'Pod',
        namespace: pod.namespace,
        severity: cpuUsagePercent > 95 ? 'critical' : 'high',
        risk_type: 'cpu_throttling',
        observation: `Running at ${cpuUsagePercent.toFixed(0)}% of CPU limit`,
        current_usage: `CPU: ${currentCPU} (${cpuUsagePercent.toFixed(0)}% utilized)`,
        impact: [
          'Request latency increases',
          'Degraded user experience',
          'Potential timeouts and failures',
          'CPU throttling under load'
        ],
        recommendation: `Increase CPU limit from ${currentCPU} → ${recommendedCPU}`,
        recommendation_why: 'Prevents CPU throttling and maintains performance under load',
        kubectl_command: `kubectl set resources ${(pod.owner_kind || 'deployment').toLowerCase()}/${pod.owner_name || pod.name} -n ${pod.namespace} --limits=cpu=${recommendedCPU}`,
        confidence_level: 'high',
      });
    }
  });

  // Memory Pressure - pods using >85% of their memory limits
  dashboardData.top_underprovisioned_pods.forEach((pod, idx) => {
    const memUsagePercent = pod.memory_efficiency?.score || 0;

    if (memUsagePercent > 85) {
      const currentMem = formatBytes(pod.total_memory_request_bytes || 0);
      const recommendedMemBytes = (pod.total_memory_request_bytes || 0) * 1.3;
      const recommendedMem = formatBytes(recommendedMemBytes);

      risks.push({
        id: `mem-pressure-${idx}`,
        workload_name: pod.owner_name || pod.name,
        workload_type: pod.owner_kind || 'Pod',
        namespace: pod.namespace,
        severity: memUsagePercent > 95 ? 'critical' : 'high',
        risk_type: 'memory_pressure',
        observation: `Running at ${memUsagePercent.toFixed(0)}% of memory limit`,
        current_usage: `Memory: ${currentMem} (${memUsagePercent.toFixed(0)}% utilized)`,
        impact: [
          'High risk of OOMKill',
          'Pod restarts and data loss',
          'Service interruptions',
          'Performance degradation'
        ],
        recommendation: `Increase memory limit from ${currentMem} → ${recommendedMem}`,
        recommendation_why: 'Prevents OOMKills and ensures stable memory availability',
        kubectl_command: `kubectl set resources ${(pod.owner_kind || 'deployment').toLowerCase()}/${pod.owner_name || pod.name} -n ${pod.namespace} --limits=memory=${recommendedMem}`,
        confidence_level: 'high',
      });
    }
  });

  // High CPU usage (60-80%) - warning level
  dashboardData.top_underprovisioned_pods.forEach((pod, idx) => {
    const cpuUsagePercent = pod.cpu_efficiency?.score || 0;

    if (cpuUsagePercent >= 60 && cpuUsagePercent <= 80) {
      const currentCPU = formatMillicores(pod.total_cpu_request_millicores || 0);
      const recommendedCPU = formatMillicores((pod.total_cpu_request_millicores || 0) * 1.3);

      risks.push({
        id: `high-cpu-${idx}`,
        workload_name: pod.owner_name || pod.name,
        workload_type: pod.owner_kind || 'Pod',
        namespace: pod.namespace,
        severity: 'medium',
        risk_type: 'high_cpu_usage',
        observation: `CPU usage at ${cpuUsagePercent.toFixed(0)}% - approaching limit`,
        current_usage: `CPU: ${currentCPU} (${cpuUsagePercent.toFixed(0)}% utilized)`,
        impact: [
          'Limited headroom for traffic spikes',
          'Slower response times during peak',
          'May throttle under increased load'
        ],
        recommendation: `Consider increasing CPU: ${currentCPU} → ${recommendedCPU}`,
        recommendation_why: 'Provides headroom for traffic spikes and maintains responsiveness',
        kubectl_command: `kubectl set resources ${(pod.owner_kind || 'deployment').toLowerCase()}/${pod.owner_name || pod.name} -n ${pod.namespace} --limits=cpu=${recommendedCPU}`,
        confidence_level: 'medium',
      });
    }
  });

  return risks;
}

// Performance Risk Card Component
function PerformanceRiskCard({ risk, onMarkReviewed, isReviewed }: {
  risk: PerformanceRisk;
  onMarkReviewed: () => void;
  isReviewed: boolean;
}) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (risk.kubectl_command) {
      navigator.clipboard.writeText(risk.kubectl_command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const riskTypeLabels: Record<PerformanceRiskType, string> = {
    cpu_throttling: '🔥 CPU Throttling',
    memory_pressure: '💥 Memory Pressure',
    high_cpu_usage: '⚡ High CPU Usage',
    high_memory_usage: '📊 High Memory Usage',
  };

  const riskTypeIcons: Record<PerformanceRiskType, typeof FireIcon> = {
    cpu_throttling: FireIcon,
    memory_pressure: ExclamationTriangleIcon,
    high_cpu_usage: CpuChipIcon,
    high_memory_usage: CircleStackIcon,
  };

  const Icon = riskTypeIcons[risk.risk_type];
  const sev = risk.severity;

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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                background: t.mainBg,
                color: t.textSub,
              }}>
                <Icon style={{ width: 10, height: 10 }} />
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
        ⚠️ {risk.observation}
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
          {/* Current Usage */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <ChartBarIcon style={{ width: 12, height: 12, color: t.textMuted }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Usage</span>
            </div>
            <div style={{ fontSize: 11, color: t.textSub }}>{risk.current_usage}</div>
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

          {/* Recommendation + Why */}
          <div style={{
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#a78bfa', marginBottom: 6 }}>💡 Recommendation</div>
            <div style={{ fontSize: 11, color: t.text, fontWeight: 500, marginBottom: 4 }}>{risk.recommendation}</div>
            <div style={{ fontSize: 10, color: '#a78bfa' }}>
              <strong>Why:</strong> {risk.recommendation_why}
            </div>
          </div>

          {/* Kubectl Command */}
          {risk.kubectl_command && (
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
                {risk.kubectl_command}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
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

export default function PerformanceRiskPanel({ dashboardData }: PerformanceRiskPanelProps) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [filterNamespace, setFilterNamespace] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterRiskType, setFilterRiskType] = useState<string>('all');
  const [markedReviewed, setMarkedReviewed] = useState<Set<string>>(new Set());

  const performanceRisks = generatePerformanceRisks(dashboardData);

  // Get unique values for filters
  const namespaces = Array.from(new Set(performanceRisks.map(r => r.namespace))).sort();

  // Apply filters
  const filteredRisks = performanceRisks.filter(risk => {
    if (filterNamespace !== 'all' && risk.namespace !== filterNamespace) return false;
    if (filterSeverity !== 'all' && risk.severity !== filterSeverity) return false;
    if (filterRiskType !== 'all' && risk.risk_type !== filterRiskType) return false;
    return true;
  });

  const handleMarkReviewed = (id: string) => {
    setMarkedReviewed(prev => new Set([...prev, id]));
  };

  const criticalCount = filteredRisks.filter(r => r.severity === 'critical').length;
  const highCount = filteredRisks.filter(r => r.severity === 'high').length;
  const throttlingCount = filteredRisks.filter(r => r.risk_type === 'cpu_throttling').length;
  const memPressureCount = filteredRisks.filter(r => r.risk_type === 'memory_pressure').length;

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
          {/* Total Risks */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Risks</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.text, marginTop: 4, ...mono }}>{filteredRisks.length}</div>
          </div>
          {/* Critical/High */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Critical / High</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4, ...mono }}>{criticalCount + highCount}</div>
          </div>
          {/* CPU Throttling */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>CPU Throttling</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f97316', marginTop: 4, ...mono }}>{throttlingCount}</div>
          </div>
          {/* Memory Pressure */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Memory Pressure</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#a78bfa', marginTop: 4, ...mono }}>{memPressureCount}</div>
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
          </select>
          <select value={filterNamespace} onChange={(e) => setFilterNamespace(e.target.value)} style={selectStyle}>
            <option value="all">All Namespaces</option>
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <select value={filterRiskType} onChange={(e) => setFilterRiskType(e.target.value)} style={selectStyle}>
            <option value="all">All Risk Types</option>
            <option value="cpu_throttling">CPU Throttling</option>
            <option value="memory_pressure">Memory Pressure</option>
            <option value="high_cpu_usage">High CPU Usage</option>
          </select>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <BoltIcon style={{ width: 12, height: 12 }} />
            {filteredRisks.length - markedReviewed.size} pending
          </div>
        </div>
      </div>

      {/* Scrollable Risk Cards */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {filteredRisks.length > 0 ? (
          filteredRisks.map((risk) => (
            <PerformanceRiskCard
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
            <p style={{ fontSize: 12, color: t.textSub, margin: '0 0 4px' }}>No performance risks detected with current filters</p>
            <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>All workloads are performing within acceptable limits</p>
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
          Performance recommendations based on current resource usage • Monitor after changes
        </p>
      </div>
    </div>
  );
}
