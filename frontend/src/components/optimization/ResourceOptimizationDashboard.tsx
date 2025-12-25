import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  CheckCircleIcon,
  FunnelIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CpuChipIcon,
  CircleStackIcon,
  CurrencyDollarIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import type { OptimizationDashboardResponse, PodOptimization, OptimizationRecommendation } from '../../types';
import { formatBytes } from '../../utils/constants';

// Severity colors for left border
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg overflow-hidden ${severityColors[optimization.severity]} ${severityBgColors[optimization.severity]} ${
        isReviewed ? 'opacity-60' : ''
      }`}
    >
      {/* Compact Header - Always Visible */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Severity Badge */}
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${severityBadgeColors[optimization.severity]} ${
            isReviewed ? 'line-through' : ''
          }`}>
            {optimization.severity}
          </span>

          {/* Workload Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                {optimization.workload_name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                {optimizationTypeLabels[optimization.optimization_type]}
              </span>
              {optimization.estimated_savings > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                  💰 {formatCurrency(optimization.estimated_savings)}/mo
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-600 dark:text-gray-400">
              {optimization.namespace} • {optimization.workload_type}
              {optimization.efficiency_score !== undefined && ` • ${optimization.efficiency_score.toFixed(0)}% efficiency`}
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Quick Preview - Always Visible */}
      <div className="px-3 pb-3 text-xs text-gray-700 dark:text-gray-300">
        ⚠️ {optimization.issue}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 dark:border-slate-700"
          >
            <div className="p-4 space-y-3 bg-white/50 dark:bg-slate-900/50">
              {/* Current State */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Current State:</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{optimization.current_state}</p>
              </div>

              {/* Recommendation */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Recommendation:</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{optimization.recommendation}</p>
              </div>

              {/* Kubectl Command */}
              <div>
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
                <pre className="text-[10px] bg-gray-900 dark:bg-black text-green-400 p-2 rounded overflow-x-auto">
                  {optimization.kubectl_command}
                </pre>
              </div>

              {/* Safety & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {optimization.safe_to_apply ? (
                    <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircleIcon className="h-3 w-3" />
                      Safe to apply
                    </span>
                  ) : (
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      Review carefully before applying
                    </span>
                  )}
                </div>

                {!isReviewed && (
                  <button
                    onClick={onMarkReviewed}
                    className="px-3 py-1 text-[10px] font-medium rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Mark Reviewed
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ResourceOptimizationDashboard({
  dashboardData
}: {
  dashboardData: OptimizationDashboardResponse
}) {
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
  const optimizationTypes = Array.from(new Set(optimizations.map(o => o.optimization_type)));

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

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="flex-shrink-0 space-y-4 mb-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Resource Efficiency Analysis</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">Right-size workloads and reduce waste</p>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-xs text-green-700 dark:text-green-300">
            <CurrencyDollarIcon className="h-3 w-3" />
            {formatCurrency(totalSavings)}/mo potential savings
          </div>
        </div>

        {/* Compact Summary */}
        <div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Issues</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{filteredOptimizations.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Reviewed</div>
            <div className="text-xl font-bold text-blue-600">{reviewedCount}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Critical/High</div>
            <div className="text-xl font-bold text-red-600">
              {filteredOptimizations.filter(o => o.severity === 'critical' || o.severity === 'high').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Potential Savings</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(totalSavings)}/mo</div>
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
            <option value="low">Low</option>
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
          >
            <option value="all">All Types</option>
            <option value="over_provisioned">Over-provisioned</option>
            <option value="idle_resource">Idle Resources</option>
            <option value="no_limits">Missing Limits</option>
            <option value="no_requests">Missing Requests</option>
          </select>
          <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {filteredOptimizations.length - reviewedCount} pending
          </div>
        </div>
      </div>

      {/* Scrollable Cards Section */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {filteredOptimizations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No optimization opportunities found with current filters</p>
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

      {/* Fixed Footer Disclaimer */}
      <div className="flex-shrink-0 mt-4 p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
        <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center">
          Resource efficiency recommendations based on current usage patterns • Validate in staging before production
        </p>
      </div>
    </div>
  );
}
