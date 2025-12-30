import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  BoltIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  CheckCircleIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  CpuChipIcon,
  CircleStackIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import type { OptimizationDashboardResponse } from '../../types';
import { formatBytes } from '../../utils/constants';

interface PerformanceRiskPanelProps {
  dashboardData: OptimizationDashboardResponse;
}

const severityColors = {
  critical: 'border-l-4 border-l-red-500 dark:border-l-red-400 border border-red-100 dark:border-red-900/30',
  high: 'border-l-4 border-l-orange-500 dark:border-l-orange-400 border border-orange-100 dark:border-orange-900/30',
  medium: 'border-l-4 border-l-amber-500 dark:border-l-amber-400 border border-amber-100 dark:border-amber-900/30',
  low: 'border-l-4 border-l-blue-500 dark:border-l-blue-400 border border-blue-100 dark:border-blue-900/30',
};

const severityBgColors = {
  critical: 'bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-slate-800',
  high: 'bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-slate-800',
  medium: 'bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-800',
  low: 'bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-800',
};

const severityBadgeColors = {
  critical: 'bg-red-600 text-white shadow-lg shadow-red-600/30',
  high: 'bg-orange-600 text-white shadow-lg shadow-orange-600/30',
  medium: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30',
  low: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
};

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg overflow-hidden ${
        isReviewed
          ? 'border-l-4 border-l-green-500 dark:border-l-green-400 border border-green-100 dark:border-green-900/30 bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-slate-800'
          : `${severityColors[risk.severity]} ${severityBgColors[risk.severity]}`
      }`}
    >
      {/* Compact Header - Always Visible */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            isReviewed
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
              : severityBadgeColors[risk.severity]
          }`}>
            {isReviewed ? '✓ REVIEWED' : risk.severity.toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-gray-900 dark:text-white truncate">
                {risk.workload_name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {riskTypeLabels[risk.risk_type]}
              </span>
            </div>
            <div className="text-[10px] text-gray-600 dark:text-gray-400">
              {risk.namespace} • {risk.workload_type}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Quick Preview - Always Visible */}
      <div className="px-3 pb-3">
        <div className="text-xs text-gray-700 dark:text-gray-300">
          <span className="font-medium">⚠️ {risk.observation}</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-3 pb-3 pt-0 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3"
        >
          {/* Current Usage */}
          <div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <ChartBarIcon className="h-3.5 w-3.5" />
              Current Usage
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{risk.current_usage}</div>
          </div>

          {/* Impact */}
          <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
            <div className="text-xs font-bold text-red-700 dark:text-red-300 mb-1">📉 Impact</div>
            <ul className="text-[10px] text-red-700 dark:text-red-300 space-y-0.5">
              {risk.impact.map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>

          {/* AI Recommendation */}
          <div className="p-2 rounded bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200/50 dark:border-purple-700/50">
            <div className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">💡 Recommendation</div>
            <div className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">
              {risk.recommendation}
            </div>
            <div className="text-[10px] text-purple-700 dark:text-purple-400">
              <strong>Why:</strong> {risk.recommendation_why}
            </div>
          </div>

          {/* Confidence */}
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">🧠 Confidence</span>
              <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                {risk.confidence_level.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-blue-700 dark:text-blue-300">
              Based on current resource usage patterns
            </div>
          </div>

          {/* Kubectl Command */}
          {risk.kubectl_command && (
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kubectl Command:</h4>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <ClipboardDocumentIcon className="h-3 w-3" />
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-2 rounded-lg bg-gray-900 dark:bg-gray-950 text-gray-100 text-[10px] font-mono overflow-x-auto">
                {risk.kubectl_command}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {!isReviewed && (
              <button
                onClick={onMarkReviewed}
                className="flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-[10px] font-medium"
              >
                <CheckCircleIcon className="h-3 w-3" />
                Mark Reviewed
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function PerformanceRiskPanel({ dashboardData }: PerformanceRiskPanelProps) {
  const [filterNamespace, setFilterNamespace] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterRiskType, setFilterRiskType] = useState<string>('all');
  const [markedReviewed, setMarkedReviewed] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const performanceRisks = generatePerformanceRisks(dashboardData);

  // Get unique values for filters
  const namespaces = Array.from(new Set(performanceRisks.map(r => r.namespace))).sort();
  const riskTypes = Array.from(new Set(performanceRisks.map(r => r.risk_type)));

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 space-y-4 mb-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Risk Analysis</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">Detect latency and responsiveness issues</p>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-700 dark:text-orange-300">
            <BoltIcon className="h-3 w-3" />
            {criticalCount + highCount} high-risk workloads
          </div>
        </div>

        {/* Compact Summary */}
        <div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Risks</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{filteredRisks.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Critical/High</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{criticalCount + highCount}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">CPU Throttling</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{throttlingCount}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Memory Pressure</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{memPressureCount}</div>
          </div>
        </div>

        {/* Compact Filters */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
          <select
            value={filterNamespace}
            onChange={(e) => setFilterNamespace(e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
          >
            <option value="all">All Namespaces</option>
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <select
            value={filterRiskType}
            onChange={(e) => setFilterRiskType(e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
          >
            <option value="all">All Risk Types</option>
            <option value="cpu_throttling">CPU Throttling</option>
            <option value="memory_pressure">Memory Pressure</option>
            <option value="high_cpu_usage">High CPU Usage</option>
          </select>
          <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {filteredRisks.length - markedReviewed.size} pending
          </div>
        </div>
      </div>

      {/* Scrollable Risk Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
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
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-gray-600 dark:text-gray-400">No performance risks detected with current filters</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">All workloads are performing within acceptable limits</p>
          </div>
        )}
      </div>

      {/* Fixed Footer Disclaimer */}
      <div className="flex-shrink-0 mt-4 p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
        <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center">
          Performance recommendations based on current resource usage • Monitor after changes
        </p>
      </div>
    </div>
  );
}
